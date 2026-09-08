import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Tenant, School, Student } from '../src/models/index.js';
import { TenantPlan, TenantBillingStatus, StudentStatus } from '@edusphere/common';

describe('Tenant Isolation & Immutability Suite', () => {
  let tenantAId: Types.ObjectId;
  let tenantBId: Types.ObjectId;
  let schoolAId: Types.ObjectId;
  let schoolBId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Student.init();
    await School.init();
    await Tenant.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Create Tenant A & School A
    const tenantA = await Tenant.create({
      name: 'St. Xavier Group',
      slug: 'st-xavier',
      plan: TenantPlan.GROWTH,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    tenantAId = tenantA._id as Types.ObjectId;

    const schoolA = await School.create({
      tenantId: tenantAId,
      name: 'St. Xavier High School',
      code: 'SXH',
      affiliationBoard: 'ICSE',
    });
    schoolAId = schoolA._id as Types.ObjectId;

    // Create Tenant B & School B
    const tenantB = await Tenant.create({
      name: 'Delhi Public Society',
      slug: 'dps-group',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    tenantBId = tenantB._id as Types.ObjectId;

    const schoolB = await School.create({
      tenantId: tenantBId,
      name: 'Delhi Public School',
      code: 'DPS',
      affiliationBoard: 'CBSE',
    });
    schoolBId = schoolB._id as Types.ObjectId;
  });

  it('should isolate queries scoped by tenantId using tenantPlugin options', async () => {
    // Insert student for Tenant A
    await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      admissionNumber: 'SXH-001',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: new Date('2012-01-01'),
        gender: 'FEMALE',
      },
      contactDetails: {
        emergencyPhone: '9876543210',
        currentAddress: '123 Park Street',
      },
      currentStatus: StudentStatus.ACTIVE,
    });

    // Query with tenantBId in options
    const tenantBResults = await Student.find({}, null, { tenantId: tenantBId });
    expect(tenantBResults).toHaveLength(0);

    // Query with tenantAId in options
    const tenantAResults = await Student.find({}, null, { tenantId: tenantAId });
    expect(tenantAResults).toHaveLength(1);
    expect(tenantAResults[0].admissionNumber).toBe('SXH-001');
  });

  it('should prohibit cross-tenant mutations by enforcing tenantId immutability', async () => {
    const student = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      admissionNumber: 'SXH-002',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'Jones',
        dateOfBirth: new Date('2012-02-02'),
        gender: 'MALE',
      },
      contactDetails: {
        emergencyPhone: '9876543211',
        currentAddress: '456 Lake Road',
      },
      currentStatus: StudentStatus.ACTIVE,
    });

    // Attempt illegal cross-tenant transfer
    student.tenantId = tenantBId;
    await expect(student.save()).rejects.toThrow(
      'Cross-tenant mutation prohibited: tenantId is immutable.'
    );
  });

  it('should allow super admin cross-tenant aggregation with skipTenantFilter', async () => {
    // Create students in both tenants
    await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      admissionNumber: 'SXH-003',
      personalDetails: {
        firstName: 'Charlie',
        lastName: 'Brown',
        dateOfBirth: new Date('2012-03-03'),
        gender: 'MALE',
      },
      contactDetails: {
        emergencyPhone: '9876543212',
        currentAddress: '789 Hill Top',
      },
      currentStatus: StudentStatus.ACTIVE,
    });

    await Student.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      admissionNumber: 'DPS-001',
      personalDetails: {
        firstName: 'Diana',
        lastName: 'Prince',
        dateOfBirth: new Date('2012-04-04'),
        gender: 'FEMALE',
      },
      contactDetails: {
        emergencyPhone: '9876543213',
        currentAddress: '101 King Avenue',
      },
      currentStatus: StudentStatus.ACTIVE,
    });

    const allStudents = await Student.find({}, null, { skipTenantFilter: true });
    expect(allStudents.length).toBeGreaterThanOrEqual(2);
  });
});
