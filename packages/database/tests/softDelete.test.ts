import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Tenant, School } from '../src/models/index.js';
import { TenantPlan, TenantBillingStatus } from '@edusphere/common';

describe('Soft Delete Functionality Suite', () => {
  let tenantId: Types.ObjectId;
  let adminUserId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Tenant.init();
    await School.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    adminUserId = new Types.ObjectId();

    const t = await Tenant.create({
      name: 'Alpha Trust',
      slug: 'alpha-trust',
      plan: TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    tenantId = t._id as Types.ObjectId;
  });

  it('should filter out soft-deleted records from standard queries by default', async () => {
    // Create two schools
    const activeSchool = await School.create({
      tenantId,
      name: 'Active School',
      code: 'ACT',
      affiliationBoard: 'CBSE',
    });

    const deletedSchool = await School.create({
      tenantId,
      name: 'Closed School',
      code: 'CLS',
      affiliationBoard: 'CBSE',
    });

    // Soft delete second school using instance method
    await (deletedSchool as any).softDelete(adminUserId);

    // Standard .find() query
    const results = await School.find({ tenantId });
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('ACT');

    // countDocuments()
    const count = await School.countDocuments({ tenantId });
    expect(count).toBe(1);

    // findOne() for deleted school returns null
    const findDeleted = await School.findOne({ tenantId, code: 'CLS' });
    expect(findDeleted).toBeNull();
  });

  it('should retrieve soft-deleted records when includeDeleted option is supplied', async () => {
    const school = await School.create({
      tenantId,
      name: 'Old Academy',
      code: 'OLD',
      affiliationBoard: 'STATE',
    });

    await (school as any).softDelete(adminUserId);

    // Query with includeDeleted option
    const allSchools = await School.find({ tenantId }, null, { includeDeleted: true });
    expect(allSchools).toHaveLength(1);
    expect(allSchools[0].isDeleted).toBe(true);
    expect(allSchools[0].deletedAt).toBeInstanceOf(Date);
    expect(allSchools[0].deletedBy?.toString()).toBe(adminUserId.toString());
  });

  it('should restore a soft-deleted entity using .restore()', async () => {
    const school = await School.create({
      tenantId,
      name: 'Revived School',
      code: 'REV',
      affiliationBoard: 'ICSE',
    });

    await (school as any).softDelete(adminUserId);
    expect(await School.countDocuments({ tenantId })).toBe(0);

    // Restore
    await (school as any).restore();

    expect(await School.countDocuments({ tenantId })).toBe(1);
    const restored = await School.findOne({ tenantId, code: 'REV' });
    expect(restored).not.toBeNull();
    expect(restored?.isDeleted).toBe(false);
    expect(restored?.deletedAt).toBeNull();
    expect(restored?.deletedBy).toBeNull();
  });
});
