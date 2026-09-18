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
  Announcement,
  NotificationTemplate,
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
  AnnouncementStatus,
  AnnouncementCategory,
  NotificationChannel,
  TemplateStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 19: Communication Security & Multi-Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant 1 (Alpha Academy)
  const tenant1Id = new Types.ObjectId();
  const school1Id = new Types.ObjectId();
  const campus1Id = new Types.ObjectId();
  const hostHeader1 = 'alpha-comm.edusphere.io';

  // Tenant 2 (Beta College)
  const tenant2Id = new Types.ObjectId();
  const school2Id = new Types.ObjectId();
  const campus2Id = new Types.ObjectId();
  const hostHeader2 = 'beta-comm.edusphere.io';

  let admin1Token: string;
  let user1Token: string;
  let user2Token: string; // Tenant 1 second user for IDOR testing
  let admin2Token: string;

  let user1Id: Types.ObjectId;
  let user2Id: Types.ObjectId;
  let notifUser1Id: Types.ObjectId;
  let announcement1Id: Types.ObjectId;
  let template1Id: Types.ObjectId;

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
    await Announcement.init();
    await NotificationTemplate.init();

    // 1. Create Tenants & Schools
    await Tenant.create({
      _id: tenant1Id,
      name: 'Alpha Academy',
      slug: 'alpha-comm',
      customDomain: hostHeader1,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@alpha.edu', phone: '+1234567891' },
    });

    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Alpha School',
      code: 'ALPHA-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campus1Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Alpha Main',
      code: 'ALPHA-MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '1 Alpha Way', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    await Tenant.create({
      _id: tenant2Id,
      name: 'Beta College',
      slug: 'beta-comm',
      customDomain: hostHeader2,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@beta.edu', phone: '+1234567892' },
    });

    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'Beta School',
      code: 'BETA-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'ICSE',
    });

    await Campus.create({
      _id: campus2Id,
      tenantId: tenant2Id,
      schoolId: school2Id,
      name: 'Beta Main',
      code: 'BETA-MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '2 Beta Blvd', city: 'Metro', state: 'NY', postalCode: '10002', country: 'USA' },
    });

    // 2. Seed Permissions and Roles
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    const roleDocs1 = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenant1Id,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap1 = new Map<string, Types.ObjectId>();
    for (const r of roleDocs1) {
      roleMap1.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms1: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap1.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms1.push({ tenantId: tenant1Id, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms1.push({ tenantId: tenant1Id, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms1);

    const roleDocs2 = await Role.insertMany(
      SYSTEM_ROLES.map((r) => ({
        tenantId: tenant2Id,
        name: r.name,
        description: r.description,
        isSystemRole: true,
      }))
    );
    const roleMap2 = new Map<string, Types.ObjectId>();
    for (const r of roleDocs2) {
      roleMap2.set(r.name, r._id as Types.ObjectId);
    }

    const rolePerms2: any[] = [];
    for (const r of SYSTEM_ROLES) {
      const rId = roleMap2.get(r.name);
      if (!rId) continue;
      if (r.permissions.includes('*')) {
        for (const pId of permMap.values()) {
          rolePerms2.push({ tenantId: tenant2Id, roleId: rId, permissionId: pId });
        }
      } else {
        for (const pStr of r.permissions) {
          const pId = permMap.get(pStr.toLowerCase().trim());
          if (pId) {
            rolePerms2.push({ tenantId: tenant2Id, roleId: rId, permissionId: pId });
          }
        }
      }
    }
    await RolePermission.insertMany(rolePerms2);

    const passwordHash = await passwordService.hashPassword('SecurityPassword123!');

    // Tenant 1 Admin
    const admin1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      email: 'admin1@alpha.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: admin1._id,
      roleId: roleMap1.get('SUPER_ADMIN')!,
    });

    // Tenant 1 User 1 (Student)
    user1Id = new Types.ObjectId();
    const user1 = await User.create({
      _id: user1Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      email: 'student1@alpha.edu',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: user1._id,
      roleId: roleMap1.get('STUDENT')!,
    });

    // Tenant 1 User 2 (Student)
    user2Id = new Types.ObjectId();
    const user2 = await User.create({
      _id: user2Id,
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      email: 'student2@alpha.edu',
      passwordHash,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant1Id,
      userId: user2._id,
      roleId: roleMap1.get('STUDENT')!,
    });

    // Tenant 2 Admin
    const admin2 = await User.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      campusId: campus2Id,
      email: 'admin2@beta.edu',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({
      tenantId: tenant2Id,
      userId: admin2._id,
      roleId: roleMap2.get('SUPER_ADMIN')!,
    });

    // Login tokens
    const login1 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'admin1@alpha.edu', password: 'SecurityPassword123!' });
    admin1Token = login1.body.data.accessToken || login1.body.data.tokens?.accessToken;

    const loginU1 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'student1@alpha.edu', password: 'SecurityPassword123!' });
    user1Token = loginU1.body.data.accessToken || loginU1.body.data.tokens?.accessToken;

    const loginU2 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader1)
      .send({ email: 'student2@alpha.edu', password: 'SecurityPassword123!' });
    user2Token = loginU2.body.data.accessToken || loginU2.body.data.tokens?.accessToken;

    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader2)
      .send({ email: 'admin2@beta.edu', password: 'SecurityPassword123!' });
    admin2Token = login2.body.data.accessToken || login2.body.data.tokens?.accessToken;

    // Seed test resources in Tenant 1
    const notif = await Notification.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      recipientId: user1Id,
      category: NotificationCategory.ACADEMIC,
      eventType: 'assignment.created',
      title: 'Math Assignment #1',
      body: 'Due on Monday',
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.DELIVERED,
      isRead: false,
    });
    notifUser1Id = notif._id as Types.ObjectId;

    const ann = await Announcement.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      authorId: admin1._id,
      title: 'Tenant 1 Sports Day',
      content: 'Annual sports meet',
      category: AnnouncementCategory.EVENT,
      priority: NotificationPriority.NORMAL,
      status: AnnouncementStatus.PUBLISHED,
      channels: [NotificationChannel.IN_APP],
      targetAudience: { isAll: true },
      attachments: [],
      acknowledgementRequired: false,
      isDeleted: false,
    });
    announcement1Id = ann._id as Types.ObjectId;

    const tpl = await NotificationTemplate.create({
      tenantId: tenant1Id,
      templateKey: 'SECURITY_ALERT',
      category: NotificationCategory.SECURITY,
      eventType: 'auth.failed_login',
      channel: NotificationChannel.IN_APP,
      locale: 'en-IN',
      version: 1,
      titleTemplate: 'Security Alert: Failed Login',
      bodyTemplate: 'A failed login was detected from {{ipAddress}}.',
      variables: ['ipAddress'],
      status: TemplateStatus.PUBLISHED,
    });
    template1Id = tpl._id as Types.ObjectId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. Anti-IDOR (Insecure Direct Object Reference) Protection', () => {
    it('User 2 cannot mark User 1 notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/communication/notifications/${notifUser1Id}/read`)
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
    });

    it('User 2 cannot delete or dismiss User 1 notification', async () => {
      const res = await request(app)
        .delete(`/api/v1/communication/notifications/${notifUser1Id}`)
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
    });

    it('User 1 can mark their own notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/communication/notifications/${notifUser1Id}/read`)
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });
  });

  describe('2. Cross-Tenant Isolation Protection', () => {
    it('Tenant 2 admin cannot access Tenant 1 announcement by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/communication/announcements/${announcement1Id}`)
        .set('Host', hostHeader2)
        .set('Authorization', `Bearer ${admin2Token}`);

      expect(res.status).toBe(404);
    });

    it('Tenant 2 admin cannot access Tenant 1 template by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/communication/templates/${template1Id}`)
        .set('Host', hostHeader2)
        .set('Authorization', `Bearer ${admin2Token}`);

      expect(res.status).toBe(404);
    });

    it('Tenant 2 admin announcement list returns only Tenant 2 announcements', async () => {
      const res = await request(app)
        .get('/api/v1/communication/announcements/manage')
        .set('Host', hostHeader2)
        .set('Authorization', `Bearer ${admin2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.total).toBe(0);
    });
  });

  describe('3. RBAC & Unauthorized Access Enforcement', () => {
    it('Rejects unauthenticated requests to notifications with 401', async () => {
      const res = await request(app)
        .get('/api/v1/communication/notifications')
        .set('Host', hostHeader1);

      expect(res.status).toBe(401);
    });

    it('Rejects student attempting to create an announcement template with 403', async () => {
      const res = await request(app)
        .post('/api/v1/communication/templates')
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          templateKey: 'STUDENT_ANNOUNCEMENT',
          category: NotificationCategory.GENERAL,
          eventType: 'student.test',
          titleTemplate: 'Student Title',
          bodyTemplate: 'Student Body',
        });

      expect(res.status).toBe(403);
    });

    it('Rejects student attempting to create a bulk communication job with 403', async () => {
      const res = await request(app)
        .post('/api/v1/communication/jobs')
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Unauthorized Job',
          communicationType: 'ANNOUNCEMENT_BROADCAST',
          requestedChannels: ['IN_APP'],
        });

      expect(res.status).toBe(403);
    });

    it('Allows admin to create notification template', async () => {
      const res = await request(app)
        .post('/api/v1/communication/templates')
        .set('Host', hostHeader1)
        .set('Authorization', `Bearer ${admin1Token}`)
        .send({
          templateKey: 'ADMIN_NOTIF_TEST',
          category: NotificationCategory.SYSTEM,
          eventType: 'admin.broadcast',
          titleTemplate: 'Admin Notice: {{subject}}',
          bodyTemplate: 'Please take note: {{details}}',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.templateKey).toBe('ADMIN_NOTIF_TEST');
    });
  });
});
