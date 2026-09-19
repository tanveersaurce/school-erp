import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB } from './setup.js';
import { runSeed } from '../src/seed/index.js';
import {
  Tenant,
  School,
  AcademicYear,
  Permission,
  Role,
  User,
  Class,
  Section,
  Subject,
  Teacher,
  Student,
  Parent,
  StudentEnrollment,
  FeeStructure,
} from '../src/models/index.js';

import { SYSTEM_PERMISSIONS } from '../src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../src/seed/roles.data.js';

describe('Seed Engine & Idempotency Suite', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should seed the initial database state deterministically', async () => {
    const result1 = await runSeed();

    expect(result1.tenantId).toBeDefined();
    expect(result1.permissionsCount).toBe(SYSTEM_PERMISSIONS.length);
    expect(result1.rolesCount).toBe(SYSTEM_ROLES.length);
    expect(result1.usersCreated).toHaveLength(6);

    // Verify entity existence
    const tenantCount = await Tenant.countDocuments({ slug: 'greenwood-trust' });
    expect(tenantCount).toBe(1);

    const schoolCount = await School.countDocuments({ code: 'GHS' });
    expect(schoolCount).toBe(1);

    const ayCount = await AcademicYear.countDocuments({ name: '2026-2027' });
    expect(ayCount).toBe(1);

    const permCount = await Permission.countDocuments();
    expect(permCount).toBe(SYSTEM_PERMISSIONS.length);

    const roleCount = await Role.countDocuments();
    expect(roleCount).toBe(SYSTEM_ROLES.length);

    const userCount = await User.countDocuments();
    expect(userCount).toBe(6);

    const classCount = await Class.countDocuments();
    expect(classCount).toBe(2); // Grade 9 and Grade 10

    const sectionCount = await Section.countDocuments();
    expect(sectionCount).toBe(2); // Section A and Section B

    const subjectCount = await Subject.countDocuments();
    expect(subjectCount).toBe(2);

    const teacherCount = await Teacher.countDocuments();
    expect(teacherCount).toBe(1);

    const studentCount = await Student.countDocuments();
    expect(studentCount).toBe(1);

    const parentCount = await Parent.countDocuments();
    expect(parentCount).toBe(1);

    const enrollmentCount = await StudentEnrollment.countDocuments();
    expect(enrollmentCount).toBe(1);

    const feeStructureCount = await FeeStructure.countDocuments();
    expect(feeStructureCount).toBe(1);
  });

  it('should be strictly idempotent on subsequent runs without creating duplicate documents', async () => {
    // Run seed again
    const result2 = await runSeed();
    expect(result2.permissionsCount).toBe(SYSTEM_PERMISSIONS.length);
    expect(result2.rolesCount).toBe(SYSTEM_ROLES.length);

    // Verify counts have NOT doubled
    expect(await Tenant.countDocuments({ slug: 'greenwood-trust' })).toBe(1);
    expect(await School.countDocuments({ code: 'GHS' })).toBe(1);
    expect(await AcademicYear.countDocuments({ name: '2026-2027' })).toBe(1);
    expect(await Permission.countDocuments()).toBe(SYSTEM_PERMISSIONS.length);
    expect(await Role.countDocuments()).toBe(SYSTEM_ROLES.length);
    expect(await User.countDocuments()).toBe(6);
    expect(await Class.countDocuments()).toBe(2);
    expect(await Section.countDocuments()).toBe(2);
    expect(await Subject.countDocuments()).toBe(2);
    expect(await Student.countDocuments()).toBe(1);
    expect(await Parent.countDocuments()).toBe(1);
    expect(await StudentEnrollment.countDocuments()).toBe(1);
    expect(await FeeStructure.countDocuments()).toBe(1);
  });
});
