import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import {
  Tenant,
  School,
  Hostel,
  HostelBuilding,
  HostelFloor,
  Room,
  Bed,
  HostelAllocation,
  Student,
} from '../src/models/index.js';
import { TenantPlan, TenantBillingStatus, StudentStatus } from '@edusphere/common';

describe('Hostel Bed Allocation Invariants Suite', () => {
  let tenantId: Types.ObjectId;
  let schoolId: Types.ObjectId;
  let hostelId: Types.ObjectId;
  let roomId: Types.ObjectId;
  let bedId: Types.ObjectId;
  let student1Id: Types.ObjectId;
  let student2Id: Types.ObjectId;
  let academicYearId: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Hostel.init();
    await HostelBuilding.init();
    await HostelFloor.init();
    await Room.init();
    await Bed.init();
    await HostelAllocation.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    tenantId = new Types.ObjectId();
    schoolId = new Types.ObjectId();
    academicYearId = new Types.ObjectId();

    await Tenant.create({
      _id: tenantId,
      name: 'Hostel Trust',
      slug: 'hostel-trust',
      plan: TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Boarding High',
      code: 'BH',
      affiliationBoard: 'CBSE',
    });

    const hostel = await Hostel.create({
      tenantId,
      schoolId,
      name: 'Nilgiri Boys Hostel',
      type: 'BOYS',
      totalRooms: 10,
    });
    hostelId = hostel._id as Types.ObjectId;

    const room = await Room.create({
      tenantId,
      hostelId,
      roomNumber: '101',
      floor: 1,
      capacity: 2,
    });
    roomId = room._id as Types.ObjectId;

    const bed = await Bed.create({
      tenantId,
      hostelId,
      roomId,
      bedNumber: 'B-101-A',
    });
    bedId = bed._id as Types.ObjectId;

    const st1 = await Student.create({
      tenantId,
      schoolId,
      admissionNumber: 'ST-001',
      personalDetails: {
        firstName: 'Tom',
        lastName: 'Riddle',
        dateOfBirth: new Date('2010-01-01'),
        gender: 'MALE',
      },
      contactDetails: { emergencyPhone: '9876543210', currentAddress: 'London' },
      currentStatus: StudentStatus.ACTIVE,
    });
    student1Id = st1._id as Types.ObjectId;

    const st2 = await Student.create({
      tenantId,
      schoolId,
      admissionNumber: 'ST-002',
      personalDetails: {
        firstName: 'Draco',
        lastName: 'Malfoy',
        dateOfBirth: new Date('2010-06-05'),
        gender: 'MALE',
      },
      contactDetails: { emergencyPhone: '9876543211', currentAddress: 'Wiltshire' },
      currentStatus: StudentStatus.ACTIVE,
    });
    student2Id = st2._id as Types.ObjectId;
  });

  it('should prevent concurrent active allocations for the same bed', async () => {
    // Allocate Bed A to Tom
    await HostelAllocation.create({
      tenantId,
      studentId: student1Id,
      hostelId,
      roomId,
      bedId,
      academicYearId,
      status: 'ALLOCATED',
    });

    // Attempt to concurrently allocate same Bed A to Draco
    await expect(
      HostelAllocation.create({
        tenantId,
        studentId: student2Id,
        hostelId,
        roomId,
        bedId,
        academicYearId,
        status: 'ALLOCATED',
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should allow reallocation of a bed after previous occupant vacates', async () => {
    // Tom occupies Bed A
    const allocation1 = await HostelAllocation.create({
      tenantId,
      studentId: student1Id,
      hostelId,
      roomId,
      bedId,
      academicYearId,
      status: 'ALLOCATED',
    });

    // Tom vacates Bed A
    allocation1.status = 'VACATED';
    allocation1.vacatingDate = new Date();
    await allocation1.save();

    // Now Draco should be able to allocate Bed A without collision
    const allocation2 = await HostelAllocation.create({
      tenantId,
      studentId: student2Id,
      hostelId,
      roomId,
      bedId,
      academicYearId,
      status: 'ALLOCATED',
    });

    expect(allocation2._id).toBeDefined();
    expect(allocation2.status).toBe('ALLOCATED');
  });

  it('should prevent a student from having multiple active bed allocations', async () => {
    // Create second bed
    const bed2 = await Bed.create({
      tenantId,
      hostelId,
      roomId,
      bedNumber: 'B-101-B',
    });

    // Tom allocates Bed 1
    await HostelAllocation.create({
      tenantId,
      studentId: student1Id,
      hostelId,
      roomId,
      bedId,
      academicYearId,
      status: 'ALLOCATED',
    });

    // Tom attempts to allocate Bed 2 at the same time
    await expect(
      HostelAllocation.create({
        tenantId,
        studentId: student1Id,
        hostelId,
        roomId,
        bedId: bed2._id,
        academicYearId,
        status: 'ALLOCATED',
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should prevent concurrent allocations when student is CHECKED_IN', async () => {
    // Tom occupies Bed A and checks in
    await HostelAllocation.create({
      tenantId,
      studentId: student1Id,
      hostelId,
      roomId,
      bedId,
      academicYearId,
      status: 'CHECKED_IN',
      actualCheckInDate: new Date(),
    });

    // Attempt to concurrently allocate same Bed A to Draco
    await expect(
      HostelAllocation.create({
        tenantId,
        studentId: student2Id,
        hostelId,
        roomId,
        bedId,
        academicYearId,
        status: 'ALLOCATED',
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should prevent duplicate building codes within the same hostel', async () => {
    await HostelBuilding.create({
      tenantId,
      schoolId,
      hostelId,
      name: 'Block Alpha',
      code: 'BLK-A',
      numberOfFloors: 3,
    });

    await expect(
      HostelBuilding.create({
        tenantId,
        schoolId,
        hostelId,
        name: 'Block Annex',
        code: 'BLK-A',
        numberOfFloors: 2,
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });

  it('should prevent duplicate floor numbers within the same building', async () => {
    const building = await HostelBuilding.create({
      tenantId,
      schoolId,
      hostelId,
      name: 'Block Bravo',
      code: 'BLK-B',
      numberOfFloors: 4,
    });

    await HostelFloor.create({
      tenantId,
      schoolId,
      hostelId,
      buildingId: building._id,
      name: 'First Floor',
      floorNumber: 1,
      code: 'FLR-1',
    });

    await expect(
      HostelFloor.create({
        tenantId,
        schoolId,
        hostelId,
        buildingId: building._id,
        name: 'First Floor Duplicate',
        floorNumber: 1,
        code: 'FLR-1-DUP',
      })
    ).rejects.toThrow(/E11000 duplicate key error/);
  });
});
