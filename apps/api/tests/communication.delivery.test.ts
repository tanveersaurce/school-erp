import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  Campus,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Notification,
  NotificationDelivery,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  DeliveryStatus,
  NotificationChannel,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { DeliveryQueueService } from '../src/modules/communication/services/delivery-queue.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 19: Communication Delivery Queue & Retries Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const hostHeader = 'delivery-test.edusphere.io';

  let adminToken: string;
  let userWithEmailId: Types.ObjectId;
  let userWithoutContactId: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Tenant.init();
    await School.init();
    await Campus.init();
    await User.init();
    await Role.init();
    await Permission.init();
    await RolePermission.init();
    await UserRole.init();
    await Notification.init();
    await NotificationDelivery.init();

    await Tenant.create({
      _id: tenantId,
      name: 'Delivery Tenant',
      slug: 'delivery-test',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@delivery.edu', phone: '+1234567890' },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Delivery School',
      code: 'DEL-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'STATE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '1 Main', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    // Permissions & Roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    const roleDocs = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap = new Map<string, Types.ObjectId>();
    for (const r of roleDocs) {
      roleMap.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms.push({ tenantId, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms);

    const passwordHash = await passwordService.hashPassword('DeliveryPass123!');

    // Admin user
    const admin = await User.create({
      tenantId,
      schoolId,
      campusId,
      email: 'admin@delivery.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId,
      userId: admin._id,
      roleId: roleMap.get('SUPER_ADMIN')!,
    });

    // User with email
    userWithEmailId = new Types.ObjectId();
    await User.create({
      _id: userWithEmailId,
      tenantId,
      schoolId,
      campusId,
      email: 'valid.recipient@delivery.edu',
      phone: '+15551234567',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    // User without phone (unresolvable SMS contact)
    userWithoutContactId = new Types.ObjectId();
    await User.create({
      _id: userWithoutContactId,
      tenantId,
      schoolId,
      campusId,
      email: 'no.phone@delivery.edu',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'admin@delivery.edu', password: 'DeliveryPass123!' });
    adminToken = loginRes.body.data.accessToken || loginRes.body.data.tokens?.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Direct Channel Dispatch & Success Tracking', () => {
    it('Successfully dispatches an email delivery and updates delivery + notification status', async () => {
      const notif = await Notification.create({
        tenantId,
        schoolId,
        recipientId: userWithEmailId,
        category: NotificationCategory.ACADEMIC,
        eventType: 'exam.published',
        title: 'Midterm Exam Schedule',
        body: 'Exams begin next week',
        priority: NotificationPriority.HIGH,
        status: NotificationStatus.PROCESSING,
        isRead: false,
      });

      const delivery = await NotificationDelivery.create({
        tenantId,
        notificationId: notif._id,
        recipientId: userWithEmailId,
        channel: NotificationChannel.EMAIL,
        provider: 'DevEmailProvider',
        status: DeliveryStatus.PENDING,
        attemptCount: 0,
        queuedAt: new Date(),
      });

      const result = await DeliveryQueueService.dispatchDelivery(delivery._id.toString());

      expect(result.status).toBe(DeliveryStatus.DELIVERED);
      expect(result.attemptCount).toBe(1);
      expect(result.deliveredAt).toBeDefined();
      expect(result.providerMessageId).toBeDefined();

      // Parent notification should be rolled up to DELIVERED
      const updatedNotif = await Notification.findById(notif._id);
      expect(updatedNotif?.status).toBe(NotificationStatus.DELIVERED);
    });
  });

  describe('2. Permanent Delivery Failure on Unresolvable Contact', () => {
    it('Marks delivery as permanently FAILED when recipient contact is missing', async () => {
      const notif = await Notification.create({
        tenantId,
        schoolId,
        recipientId: userWithoutContactId,
        category: NotificationCategory.FEES,
        eventType: 'fee.reminder',
        title: 'Fee Reminder',
        body: 'Overdue fee payment',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.PROCESSING,
        isRead: false,
      });

      const delivery = await NotificationDelivery.create({
        tenantId,
        notificationId: notif._id,
        recipientId: userWithoutContactId,
        channel: NotificationChannel.SMS,
        provider: 'DevSMSProvider',
        status: DeliveryStatus.PENDING,
        attemptCount: 0,
        queuedAt: new Date(),
      });

      const result = await DeliveryQueueService.dispatchDelivery(delivery._id.toString());

      expect(result.status).toBe(DeliveryStatus.FAILED);
      expect(result.failureCode).toBe('RECIPIENT_CONTACT_UNRESOLVABLE');
      expect(result.nextRetryAt).toBeUndefined();

      // Parent notification rollup should be FAILED
      const updatedNotif = await Notification.findById(notif._id);
      expect(updatedNotif?.status).toBe(NotificationStatus.FAILED);
    });
  });

  describe('3. Manual Delivery Retry API Endpoint', () => {
    it('Allows admin to query deliveries and retry a failed delivery', async () => {
      const notif = await Notification.create({
        tenantId,
        schoolId,
        recipientId: userWithEmailId,
        category: NotificationCategory.SYSTEM,
        eventType: 'system.maintenance',
        title: 'Maintenance Notice',
        body: 'Downtime scheduled',
        priority: NotificationPriority.LOW,
        status: NotificationStatus.PROCESSING,
        isRead: false,
      });

      // Initially failed delivery
      const delivery = await NotificationDelivery.create({
        tenantId,
        notificationId: notif._id,
        recipientId: userWithEmailId,
        channel: NotificationChannel.EMAIL,
        provider: 'DevEmailProvider',
        status: DeliveryStatus.FAILED,
        attemptCount: 1,
        queuedAt: new Date(),
        failureCode: 'PROVIDER_TIMEOUT',
        failureReason: 'Transient timeout',
        nextRetryAt: new Date(Date.now() + 60000),
      });

      // 1. List deliveries via API
      const listRes = await request(app)
        .get('/api/v1/communication/deliveries')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.total).toBeGreaterThan(0);

      // 2. Retry via API
      const retryRes = await request(app)
        .post(`/api/v1/communication/deliveries/${delivery._id}/retry`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.status).toBe(DeliveryStatus.DELIVERED);
    });
  });
});
