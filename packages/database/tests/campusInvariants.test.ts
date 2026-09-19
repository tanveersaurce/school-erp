import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import { Tenant, School, Campus, AcademicYear } from '../src/models/tenant.model.js';
import { TransportSetting } from '../src/models/transport.model.js';
import { AcademicYearStatus } from '@edusphere/common';

describe('Phase 5 Hardening: Campus & Organization Database Invariants', () => {
  let tenant1Id: Types.ObjectId;
  let school1Id: Types.ObjectId;
  let school2Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Tenant.init();
    await School.init();
    await Campus.init();
    await AcademicYear.init();
    await TransportSetting.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const t1 = await Tenant.create({
      name: 'Test Society',
      slug: 'test-society',
    });
    tenant1Id = t1._id as Types.ObjectId;

    const s1 = await School.create({
      tenantId: tenant1Id,
      name: 'North Campus Academy',
      code: 'NCA',
      affiliationBoard: 'CBSE',
    });
    school1Id = s1._id as Types.ObjectId;

    const s2 = await School.create({
      tenantId: tenant1Id,
      name: 'South Campus Academy',
      code: 'SCA',
      affiliationBoard: 'ICSE',
    });
    school2Id = s2._id as Types.ObjectId;
  });

  it('1. Enforces single main campus partial unique index per school', async () => {
    // Campus 1 as main campus
    await Campus.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Main Campus',
      code: 'MC1',
      isMain: true,
      address: {
        street: '123 Main St',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'India',
      },
    });

    // Campus 2 for the same school with isMain: false succeeds
    await Campus.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'City Branch',
      code: 'CB1',
      isMain: false,
      address: {
        street: '456 Branch St',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10002',
        country: 'India',
      },
    });

    // Attempting to create a second main campus for the same school throws duplicate key error
    await expect(
      Campus.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        name: 'Second Main Campus',
        code: 'SMC',
        isMain: true,
        address: {
          street: '789 Central Ave',
          city: 'Metropolis',
          state: 'State',
          postalCode: '10003',
          country: 'India',
        },
      })
    ).rejects.toThrow();

    // A main campus for a DIFFERENT school under the same tenant succeeds
    const s2Main = await Campus.create({
      tenantId: tenant1Id,
      schoolId: school2Id,
      name: 'School 2 Main Campus',
      code: 'S2MC',
      isMain: true,
      address: {
        street: '100 South Way',
        city: 'Southtown',
        state: 'State',
        postalCode: '20001',
        country: 'India',
      },
    });
    expect(s2Main.isMain).toBe(true);
  });

  it('2. Allows a new main campus when a previously main campus is soft-deleted', async () => {
    const campus = await Campus.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Old Main Campus',
      code: 'OMC',
      isMain: true,
      address: {
        street: '1 Old St',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'India',
      },
    });

    // Soft delete the first main campus
    campus.isDeleted = true;
    await campus.save();

    // Now a new main campus for the same school is accepted
    const newMain = await Campus.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'New Main Campus',
      code: 'NMC',
      isMain: true,
      address: {
        street: '2 New St',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'India',
      },
    });

    expect(newMain.isMain).toBe(true);
  });

  it('3. Enforces single isCurrent: true academic year partial unique index per campus', async () => {
    const campus = await Campus.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      name: 'Campus For AY',
      code: 'CFY',
      address: {
        street: '1 AY St',
        city: 'Metropolis',
        state: 'State',
        postalCode: '10001',
        country: 'India',
      },
    });

    // Academic Year 1 as Current
    await AcademicYear.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus._id,
      name: '2026-2027',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      status: AcademicYearStatus.ACTIVE,
      isCurrent: true,
    });

    // Academic Year 2 as non-current succeeds
    await AcademicYear.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      campusId: campus._id,
      name: '2027-2028',
      startDate: new Date('2027-04-01'),
      endDate: new Date('2028-03-31'),
      status: AcademicYearStatus.DRAFT,
      isCurrent: false,
    });

    // Attempting to create a second isCurrent: true academic year for the same campus throws duplicate key error
    await expect(
      AcademicYear.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        campusId: campus._id,
        name: '2026-2027 Duplicate',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-05-31'),
        status: AcademicYearStatus.ACTIVE,
        isCurrent: true,
      })
    ).rejects.toThrow();
  });

  it('4. Verifies TransportSetting compound unique index compiles and rejects duplicate school settings', async () => {
    // School-level setting (campusId omitted / null)
    await TransportSetting.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      speedThresholdKmh: 50,
    });

    // Duplicate school-level setting throws
    await expect(
      TransportSetting.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        speedThresholdKmh: 60,
      })
    ).rejects.toThrow();
  });
});
