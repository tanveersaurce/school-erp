import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
} from '@edusphere/database';
import { UserType, UserStatus, TenantStatus, TenantPlan, TenantBillingStatus } from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { recordAuditLog } from '../src/core/audit/audit.service.js';

describe('Phase 21: Audit Trail API Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenant1Id = new Types.ObjectId();
  const school1Id = new Types.ObjectId();
  const tenant2Id = new Types.ObjectId();
  const school2Id = new Types.ObjectId();

  let adminToken1: string;
  let teacherToken1: string;
  let adminToken2: string;

  let testAuditLogId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    // 1. Tenants
    await Tenant.create({
      _id: tenant1Id,
      name: 'Audit Trail Trust 1',
      slug: 'audit-trail-1',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });
    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'School Alpha',
      code: 'SCH-A',
      affiliationBoard: 'CBSE',
    });

    await Tenant.create({
      _id: tenant2Id,
      name: 'Audit Trail Trust 2',
      slug: 'audit-trail-2',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
    });
    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'School Beta',
      code: 'SCH-B',
      affiliationBoard: 'ICSE',
    });

    // 2. Permissions
    const auditPerm = await Permission.create({
      resource: 'audit',
      action: 'read',
      permissionString: 'audit:read',
      description: 'View audit logs',
      category: 'System',
    });

    const studentPerm = await Permission.create({
      resource: 'student',
      action: 'read',
      permissionString: 'student:read',
      description: 'View students',
      category: 'Academics',
    });

    // 3. Roles
    const auditAdminRole1 = await Role.create({
      tenantId: tenant1Id,
      name: 'AUDIT_ADMIN',
      description: 'Audit Administrator',
      isSystemRole: false,
    });
    await RolePermission.create({
      tenantId: tenant1Id,
      roleId: auditAdminRole1._id,
      permissionId: auditPerm._id,
    });

    const teacherRole1 = await Role.create({
      tenantId: tenant1Id,
      name: 'TEACHER',
      description: 'Teacher without audit permission',
      isSystemRole: false,
    });
    await RolePermission.create({
      tenantId: tenant1Id,
      roleId: teacherRole1._id,
      permissionId: studentPerm._id,
    });

    const auditAdminRole2 = await Role.create({
      tenantId: tenant2Id,
      name: 'AUDIT_ADMIN_2',
      description: 'Audit Administrator Tenant 2',
      isSystemRole: false,
    });
    await RolePermission.create({
      tenantId: tenant2Id,
      roleId: auditAdminRole2._id,
      permissionId: auditPerm._id,
    });

    const passwordHash = await passwordService.hashPassword('Pass@123456');

    // 4. Users
    const uAdmin1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'admin1@audit.edu',
      firstName: 'Admin',
      lastName: 'One',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId: tenant1Id, userId: uAdmin1._id, roleId: auditAdminRole1._id });

    const uTeacher1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'teacher1@audit.edu',
      firstName: 'Teacher',
      lastName: 'One',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId: tenant1Id, userId: uTeacher1._id, roleId: teacherRole1._id });

    const uAdmin2 = await User.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      email: 'admin2@audit.edu',
      firstName: 'Admin',
      lastName: 'Two',
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      emailVerified: true,
    });
    await UserRole.create({ tenantId: tenant2Id, userId: uAdmin2._id, roleId: auditAdminRole2._id });

    // 5. Authenticate
    const res1 = await request(app).post('/api/v1/auth/login').send({
      email: 'admin1@audit.edu',
      password: 'Pass@123456',
    });
    adminToken1 = res1.body.data.accessToken;

    const res2 = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher1@audit.edu',
      password: 'Pass@123456',
    });
    teacherToken1 = res2.body.data.accessToken;

    const res3 = await request(app).post('/api/v1/auth/login').send({
      email: 'admin2@audit.edu',
      password: 'Pass@123456',
    });
    adminToken2 = res3.body.data.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await AuditLog.collection.deleteMany({});

    // Seed test audit logs for tenant 1
    await recordAuditLog({
      tenantId: tenant1Id.toString(),
      schoolId: school1Id.toString(),
      action: 'UPDATE_STUDENT',
      entity: 'STUDENT',
      entityId: 'STU-1001',
      actorType: 'USER',
      status: 'SUCCESS',
      before: { name: 'John Doe', passwordHash: 'secret_hash', email: 'john@example.com' },
      after: { name: 'John Doe Smith', passwordHash: 'secret_hash2', email: 'john.smith@example.com' },
      metadata: { initiatedBy: 'Admissions Desk', token: 'bearer-sensitive' },
      ipAddress: '10.0.0.1',
      userAgent: 'JestTestRunner',
      requestId: 'req-001',
      correlationId: 'corr-001',
    });

    const doc = await AuditLog.findOne({ tenantId: tenant1Id, entityId: 'STU-1001' });
    testAuditLogId = doc!._id.toString();

    await recordAuditLog({
      tenantId: tenant1Id.toString(),
      schoolId: school1Id.toString(),
      action: 'PROCESS_FEE',
      entity: 'FEE_PAYMENT',
      entityId: 'PAY-2001',
      actorType: 'USER',
      status: 'SUCCESS',
      requestId: 'req-002',
      correlationId: 'corr-002',
    });

    // Seed test audit log for tenant 2
    await recordAuditLog({
      tenantId: tenant2Id.toString(),
      schoolId: school2Id.toString(),
      action: 'TENANT2_EVENT',
      entity: 'CAMPUS',
      entityId: 'CAMPUS-2',
      actorType: 'USER',
      status: 'SUCCESS',
    });
  });

  it('1. GET /api/v1/audit-logs returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/audit-logs');
    expect(res.status).toBe(401);
  });

  it('2. GET /api/v1/audit-logs returns 403 when user lacks audit:read permission', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${teacherToken1}`);
    expect(res.status).toBe(403);
  });

  it('3. GET /api/v1/audit-logs returns paginated list of audit logs for authorized user', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.pagination.totalRecords).toBe(2);
    expect(res.body.data.pagination.page).toBe(1);
  });

  it('4. Enforces tenant isolation: Tenant 1 cannot see Tenant 2 audit logs', async () => {
    const res1 = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken1}`);
    expect(res1.status).toBe(200);
    const actions1 = res1.body.data.logs.map((l: any) => l.action);
    expect(actions1).toContain('UPDATE_STUDENT');
    expect(actions1).toContain('PROCESS_FEE');
    expect(actions1).not.toContain('TENANT2_EVENT');

    const res2 = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken2}`);
    expect(res2.status).toBe(200);
    const actions2 = res2.body.data.logs.map((l: any) => l.action);
    expect(actions2).toContain('TENANT2_EVENT');
    expect(actions2).not.toContain('UPDATE_STUDENT');
  });

  it('5. Filters audit logs by entity and action', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs?entity=STUDENT&action=UPDATE')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].entity).toBe('STUDENT');
    expect(res.body.data.logs[0].entityId).toBe('STU-1001');
  });

  it('6. Redacts sensitive credentials (passwords, tokens, secrets) in audit logs', async () => {
    const res = await request(app)
      .get(`/api/v1/audit-logs/${testAuditLogId}`)
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.status).toBe(200);
    const log = res.body.data;
    expect(log.id).toBe(testAuditLogId);
    expect(log.before.passwordHash).toBe('[REDACTED]');
    expect(log.after.passwordHash).toBe('[REDACTED]');
    expect(log.metadata.token).toBe('[REDACTED]');
  });

  it('7. GET /api/v1/audit-logs/resource/:entity/:entityId returns history for specific resource', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs/resource/STUDENT/STU-1001')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
    expect(res.body.data.logs[0].entityId).toBe('STU-1001');
  });

  it('8. Cross-tenant retrieval by ID returns 404', async () => {
    const res = await request(app)
      .get(`/api/v1/audit-logs/${testAuditLogId}`)
      .set('Authorization', `Bearer ${adminToken2}`);

    expect(res.status).toBe(404);
  });

  it('9. Rejects mutation requests (POST/PUT/DELETE) on /api/v1/audit-logs (404/405)', async () => {
    const postRes = await request(app)
      .post('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken1}`)
      .send({ action: 'FORGED_EVENT' });
    expect(postRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/v1/audit-logs/${testAuditLogId}`)
      .set('Authorization', `Bearer ${adminToken1}`);
    expect(deleteRes.status).toBe(404);
  });
});
