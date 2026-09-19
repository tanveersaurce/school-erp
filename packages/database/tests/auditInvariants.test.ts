import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Tenant, School, Campus } from '../src/models/tenant.model.js';
import { User } from '../src/models/user.model.js';
import { AuditLog } from '../src/models/system.model.js';
import { runWithTenantContext } from '../src/context/tenantContext.js';

describe('Phase 21: Audit Trail Database Invariants & Immutability', () => {
  let tenant1Id: Types.ObjectId;
  let school1Id: Types.ObjectId;
  let campus1Id: Types.ObjectId;
  let user1Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Tenant.init();
    await School.init();
    await Campus.init();
    await User.init();
    await AuditLog.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const t1 = await Tenant.create({
      name: 'Audit Test Society',
      slug: 'audit-test-society',
    });
    tenant1Id = t1._id as Types.ObjectId;

    const s1 = await School.create({
      tenantId: tenant1Id,
      name: 'Main Public School',
      code: 'MPS',
      affiliationBoard: 'CBSE',
    });
    school1Id = s1._id as Types.ObjectId;

    const c1 = await Campus.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'City Campus',
      code: 'CC1',
      isMain: true,
      address: {
        street: '123 Academic Way',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'Country',
      },
    });
    campus1Id = c1._id as Types.ObjectId;

    const u1 = await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'admin@audit-test.com',
      passwordHash: 'hashed_pw',
      userType: 'SUPER_ADMIN',
      firstName: 'Audit',
      lastName: 'Admin',
    });
    user1Id = u1._id as Types.ObjectId;
  });

  it('1. Successfully persists comprehensive AuditLog document with all Phase 21 fields', async () => {
    const log = await AuditLog.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus1Id,
      userId: user1Id,
      actorType: 'USER',
      action: 'STUDENT_ENROLLED',
      entity: 'STUDENT',
      entityId: 'STU-9901',
      status: 'SUCCESS',
      metadata: { department: 'Admissions', feePlan: 'Standard' },
      before: null,
      after: { rollNumber: 'R-101', status: 'ACTIVE' },
      changes: [
        { field: 'status', oldValue: null, newValue: 'ACTIVE' },
        { field: 'rollNumber', oldValue: null, newValue: 'R-101' },
      ],
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 TestBrowser',
      requestId: 'req-abc-123',
      correlationId: 'corr-xyz-789',
    });

    expect(log._id).toBeDefined();
    expect(log.action).toBe('STUDENT_ENROLLED');
    expect(log.actorType).toBe('USER');
    expect(log.status).toBe('SUCCESS');
    expect(log.changes).toHaveLength(2);
    expect(log.changes?.[0].field).toBe('status');
    expect(log.correlationId).toBe('corr-xyz-789');
    expect(log.campusId?.toString()).toBe(campus1Id.toString());
  });

  it('2. Supports SYSTEM and WORKER actors where userId is not provided', async () => {
    const log = await AuditLog.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      actorType: 'SYSTEM',
      action: 'NIGHTLY_ATTENDANCE_AGGREGATION',
      entity: 'ATTENDANCE_SUMMARY',
      entityId: '2026-09-19',
      status: 'SUCCESS',
      metadata: { processedRecords: 1450, elapsedMs: 420 },
      requestId: 'cron-job-1',
    });

    expect(log._id).toBeDefined();
    expect(log.userId).toBeUndefined();
    expect(log.actorType).toBe('SYSTEM');
    expect(log.action).toBe('NIGHTLY_ATTENDANCE_AGGREGATION');
  });

  it('3. Rejects update operations (updateOne, updateMany, findOneAndUpdate) with immutable error', async () => {
    const log = await AuditLog.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      userId: user1Id,
      actorType: 'USER',
      action: 'EXAM_GRADED',
      entity: 'EXAM',
      entityId: 'EX-101',
      status: 'SUCCESS',
    });

    await expect(
      AuditLog.updateOne({ _id: log._id }, { $set: { action: 'EXAM_DELETED' } })
    ).rejects.toThrow('AuditLog records are append-only and immutable.');

    await expect(
      AuditLog.updateMany({ _id: log._id }, { $set: { status: 'FAILURE' } })
    ).rejects.toThrow('AuditLog records are append-only and immutable.');

    await expect(
      AuditLog.findOneAndUpdate({ _id: log._id }, { $set: { action: 'MODIFIED' } })
    ).rejects.toThrow('AuditLog records are append-only and immutable.');
  });

  it('4. Rejects deletion operations (deleteOne, deleteMany, findOneAndDelete) with immutable error', async () => {
    const log = await AuditLog.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      userId: user1Id,
      actorType: 'USER',
      action: 'PAYMENT_PROCESSED',
      entity: 'FEE_PAYMENT',
      entityId: 'PAY-8821',
      status: 'SUCCESS',
    });

    await expect(
      AuditLog.deleteOne({ _id: log._id })
    ).rejects.toThrow('AuditLog records are append-only and immutable.');

    await expect(
      AuditLog.deleteMany({ _id: log._id })
    ).rejects.toThrow('AuditLog records are append-only and immutable.');

    await expect(
      AuditLog.findOneAndDelete({ _id: log._id })
    ).rejects.toThrow('AuditLog records are append-only and immutable.');
  });

  it('5. Rejects document-level save and deleteOne invocations on existing audit log records', async () => {
    const log = await AuditLog.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      userId: user1Id,
      actorType: 'USER',
      action: 'STAFF_HIRED',
      entity: 'STAFF',
      entityId: 'STF-55',
      status: 'SUCCESS',
    });

    const found = await AuditLog.findById(log._id);
    expect(found).not.toBeNull();

    found!.action = 'TAMPERED_ACTION';
    await expect(found!.save()).rejects.toThrow('AuditLog records are append-only and immutable.');

    await expect(found!.deleteOne()).rejects.toThrow('AuditLog records are append-only and immutable.');
  });

  it('6. Enforces tenant isolation: queries under tenant A cannot see tenant B audit logs', async () => {
    const t2 = await Tenant.create({
      name: 'Another Society',
      slug: 'another-society',
    });
    const tenant2Id = t2._id as Types.ObjectId;

    await AuditLog.create({
      tenantId: tenant1Id,
      action: 'TENANT1_ACTION',
      entity: 'SETTINGS',
      entityId: 'SET-1',
      actorType: 'USER',
      status: 'SUCCESS',
    });

    await AuditLog.create({
      tenantId: tenant2Id,
      action: 'TENANT2_ACTION',
      entity: 'SETTINGS',
      entityId: 'SET-2',
      actorType: 'USER',
      status: 'SUCCESS',
    });

    const tenant1Logs = await runWithTenantContext(
      { tenantId: tenant1Id.toString(), isPlatformAdmin: false },
      async () => AuditLog.find()
    );

    expect(tenant1Logs).toHaveLength(1);
    expect(tenant1Logs[0].action).toBe('TENANT1_ACTION');

    const tenant2Logs = await runWithTenantContext(
      { tenantId: tenant2Id.toString(), isPlatformAdmin: false },
      async () => AuditLog.find()
    );

    expect(tenant2Logs).toHaveLength(1);
    expect(tenant2Logs[0].action).toBe('TENANT2_ACTION');
  });
});
