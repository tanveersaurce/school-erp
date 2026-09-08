import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Tenant, School, Student, User } from '../src/models/index.js';
import {
  TenantPlan,
  TenantBillingStatus,
  StudentStatus,
  UserType,
  UserStatus,
} from '@edusphere/common';

describe('Unique Compound Constraints Suite', () => {
  let tenant1Id: Types.ObjectId;
  let tenant2Id: Types.ObjectId;
  let school1Id: Types.ObjectId;
  let school2Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Tenant.init();
    await School.init();
    await Student.init();
    await User.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const t1 = await Tenant.create({
      name: 'Tenant 1',
      slug: 'tenant-one',
      plan: TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    tenant1Id = t1._id as Types.ObjectId;

    const s1 = await School.create({
      tenantId: tenant1Id,
      name: 'School 1',
      code: 'SCH1',
      affiliationBoard: 'STATE',
    });
    school1Id = s1._id as Types.ObjectId;

    const t2 = await Tenant.create({
      name: 'Tenant 2',
      slug: 'tenant-two',
      plan: TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.ACTIVE,
    });
    tenant2Id = t2._id as Types.ObjectId;

    const s2 = await School.create({
      tenantId: tenant2Id,
      name: 'School 2',
      code: 'SCH2',
      affiliationBoard: 'STATE',
    });
    school2Id = s2._id as Types.ObjectId;
  });

  it('should throw duplicate key error for duplicate admissionNumber within same tenant', async () => {
    await Student.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      admissionNumber: 'ADM-100',
      personalDetails: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-01-01'),
        gender: 'MALE',
      },
      contactDetails: {
        emergencyPhone: '9000000001',
        currentAddress: '1 Main St',
      },
      currentStatus: StudentStatus.ACTIVE,
    });

    // Attempting same admission number within same tenant should fail
    await expect(
      Student.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        admissionNumber: 'ADM-100',
        personalDetails: {
          firstName: 'Another',
          lastName: 'Student',
          dateOfBirth: new Date('2010-02-02'),
          gender: 'FEMALE',
        },
        contactDetails: {
          emergencyPhone: '9000000002',
          currentAddress: '2 Main St',
        },
        currentStatus: StudentStatus.ACTIVE,
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should permit identical admissionNumber across different tenants', async () => {
    const studentT1 = await Student.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      admissionNumber: 'ADM-COMMON',
      personalDetails: {
        firstName: 'Alice',
        lastName: 'Cooper',
        dateOfBirth: new Date('2010-03-03'),
        gender: 'FEMALE',
      },
      contactDetails: {
        emergencyPhone: '9000000003',
        currentAddress: '3 Main St',
      },
      currentStatus: StudentStatus.ACTIVE,
    });

    const studentT2 = await Student.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      admissionNumber: 'ADM-COMMON',
      personalDetails: {
        firstName: 'Bob',
        lastName: 'Dylan',
        dateOfBirth: new Date('2010-04-04'),
        gender: 'MALE',
      },
      contactDetails: {
        emergencyPhone: '9000000004',
        currentAddress: '4 Main St',
      },
      currentStatus: StudentStatus.ACTIVE,
    });

    expect(studentT1._id).toBeDefined();
    expect(studentT2._id).toBeDefined();
    expect(studentT1.admissionNumber).toBe(studentT2.admissionNumber);
    expect(studentT1.tenantId.toString()).not.toBe(studentT2.tenantId.toString());
  });

  it('should enforce unique email scoped to tenant for User accounts', async () => {
    await User.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      email: 'teacher@school.edu',
      passwordHash: 'hashedpassword',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    });

    // Duplicate email in Tenant 1 throws error
    await expect(
      User.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        email: 'teacher@school.edu',
        passwordHash: 'anotherhashedpassword',
        userType: UserType.TEACHER,
        status: UserStatus.ACTIVE,
      })
    ).rejects.toThrow(/E11000 duplicate key error/);

    // Same email in Tenant 2 is allowed
    const user2 = await User.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      email: 'teacher@school.edu',
      passwordHash: 'hashedpassword',
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    });

    expect(user2._id).toBeDefined();
  });
});
