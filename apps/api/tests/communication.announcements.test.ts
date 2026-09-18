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
  Announcement,
  CommunicationJob,
  Notification,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  NotificationPriority,
  AnnouncementStatus,
  AnnouncementCategory,
  NotificationChannel,
  CommunicationJobType,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { AnnouncementService } from '../src/modules/communication/services/announcement.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 19: Announcements, Audience & Communication Jobs Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const hostHeader = 'ann-test.edusphere.io';

  let adminToken: string;
  let studentToken: string;
  let studentId: Types.ObjectId;

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
    await Announcement.init();
    await CommunicationJob.init();
    await Notification.init();

    await Tenant.create({
      _id: tenantId,
      name: 'Announcement Tenant',
      slug: 'ann-test',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@ann.edu', phone: '+1234567890' },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Announcement School',
      code: 'ANN-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'STATE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Campus One',
      code: 'CAMPUS-1',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '1 Main', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    // Seed permissions & roles
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

    const passwordHash = await passwordService.hashPassword('AnnouncementPass123!');

    // Admin
    const admin = await User.create({
      tenantId,
      schoolId,
      campusId,
      email: 'admin@ann.edu',
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

    // Student
    studentId = new Types.ObjectId();
    const student = await User.create({
      _id: studentId,
      tenantId,
      schoolId,
      campusId,
      email: 'student@ann.edu',
      phone: '+15559876543',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId,
      userId: student._id,
      roleId: roleMap.get('STUDENT')!,
    });

    const loginAdmin = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'admin@ann.edu', password: 'AnnouncementPass123!' });
    adminToken = loginAdmin.body.data.accessToken || loginAdmin.body.data.tokens?.accessToken;

    const loginStudent = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'student@ann.edu', password: 'AnnouncementPass123!' });
    studentToken = loginStudent.body.data.accessToken || loginStudent.body.data.tokens?.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Draft vs Scheduled Announcement Creation', () => {
    it('Creates announcement in DRAFT status when no future publish date is given', async () => {
      const res = await request(app)
        .post('/api/v1/communication/announcements')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: schoolId.toString(),
          title: 'Draft Announcement',
          content: 'This is a draft announcement.',
          category: AnnouncementCategory.GENERAL,
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.IN_APP],
          targetAudience: { isAll: true },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(AnnouncementStatus.DRAFT);
      expect(res.body.data.title).toBe('Draft Announcement');
    });

    it('Creates announcement in SCHEDULED status when future publish date is provided', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const res = await request(app)
        .post('/api/v1/communication/announcements')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: schoolId.toString(),
          title: 'Scheduled Announcement',
          content: 'This announcement is scheduled for tomorrow.',
          category: AnnouncementCategory.ACADEMIC,
          priority: NotificationPriority.HIGH,
          publishAt: futureDate,
          channels: [NotificationChannel.IN_APP],
          targetAudience: { isAll: true },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(AnnouncementStatus.SCHEDULED);
    });
  });

  describe('2. Publishing Announcement & CommunicationJob Generation', () => {
    it('Publishes announcement, creates communication job, and notifies target audience', async () => {
      // Create draft first
      const draft = await Announcement.create({
        tenantId,
        schoolId,
        authorId: studentId,
        title: 'Sports Day 2026',
        content: 'Join us on Friday for sports day!',
        category: AnnouncementCategory.EVENT,
        priority: NotificationPriority.NORMAL,
        status: AnnouncementStatus.DRAFT,
        channels: [NotificationChannel.IN_APP],
        targetAudience: { specificUserIds: [studentId.toString()] },
        acknowledgementRequired: true,
        isDeleted: false,
      });

      // Publish via API
      const pubRes = await request(app)
        .post(`/api/v1/communication/announcements/${draft._id}/publish`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe(AnnouncementStatus.PUBLISHED);

      // Verify CommunicationJob was created
      const job = await CommunicationJob.findOne({
        tenantId,
        'sourceEntity.entityId': draft._id,
        communicationType: CommunicationJobType.ANNOUNCEMENT_BROADCAST,
      });

      expect(job).toBeDefined();
      expect(job?.totalRecipients).toBe(1);

      // Verify Notification was generated for recipient
      const notif = await Notification.findOne({
        tenantId,
        recipientId: studentId,
        sourceEntityId: draft._id.toString(),
      });

      expect(notif).toBeDefined();
      expect(notif?.title).toBe('Sports Day 2026');
    });
  });

  describe('3. Announcement Acknowledgement Tracking', () => {
    it('Allows recipient to acknowledge announcement idempotently', async () => {
      const ann = await Announcement.create({
        tenantId,
        schoolId,
        authorId: studentId,
        title: 'Mandatory Policy Acknowledgment',
        content: 'Please acknowledge that you read the code of conduct.',
        category: AnnouncementCategory.GENERAL,
        priority: NotificationPriority.HIGH,
        status: AnnouncementStatus.PUBLISHED,
        channels: [NotificationChannel.IN_APP],
        targetAudience: { isAll: true },
        acknowledgementRequired: true,
        acknowledgements: [],
        isDeleted: false,
      });

      // First acknowledgment
      const ack1 = await request(app)
        .post(`/api/v1/communication/announcements/${ann._id}/acknowledge`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(ack1.status).toBe(200);
      expect(ack1.body.data.acknowledgements.length).toBe(1);
      expect(ack1.body.data.acknowledgements[0].userId.toString()).toBe(studentId.toString());

      // Second acknowledgment (should be idempotent)
      const ack2 = await request(app)
        .post(`/api/v1/communication/announcements/${ann._id}/acknowledge`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(ack2.status).toBe(200);
      expect(ack2.body.data.acknowledgements.length).toBe(1);
    });
  });

  describe('4. Scheduled Announcement Scan & Auto-Publishing', () => {
    it('Automatically publishes due scheduled announcements during scan', async () => {
      // Create announcement scheduled for 5 minutes ago
      const pastScheduled = await Announcement.create({
        tenantId,
        schoolId,
        authorId: studentId,
        title: 'Due Scheduled Announcement',
        content: 'This should be auto-published.',
        category: AnnouncementCategory.GENERAL,
        priority: NotificationPriority.NORMAL,
        status: AnnouncementStatus.SCHEDULED,
        publishAt: new Date(Date.now() - 300000), // 5 minutes ago
        channels: [NotificationChannel.IN_APP],
        targetAudience: { specificUserIds: [studentId.toString()] },
        isDeleted: false,
      });

      const publishedCount = await AnnouncementService.publishDueScheduledAnnouncements();
      expect(publishedCount).toBeGreaterThanOrEqual(1);

      const updated = await Announcement.findById(pastScheduled._id);
      expect(updated?.status).toBe(AnnouncementStatus.PUBLISHED);
    });
  });

  describe('5. Cancellation and Archival Life-Cycle', () => {
    it('Cancels and archives announcements properly', async () => {
      const ann = await Announcement.create({
        tenantId,
        schoolId,
        authorId: studentId,
        title: 'Event to Cancel',
        content: 'Cancelled event details.',
        category: AnnouncementCategory.EVENT,
        priority: NotificationPriority.LOW,
        status: AnnouncementStatus.DRAFT,
        channels: [NotificationChannel.IN_APP],
        targetAudience: { isAll: true },
        isDeleted: false,
      });

      // 1. Cancel
      const cancelRes = await request(app)
        .post(`/api/v1/communication/announcements/${ann._id}/cancel`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Inclement weather' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(AnnouncementStatus.CANCELLED);

      // 2. Archive
      const archiveRes = await request(app)
        .post(`/api/v1/communication/announcements/${ann._id}/archive`)
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe(AnnouncementStatus.ARCHIVED);
    });
  });
});
