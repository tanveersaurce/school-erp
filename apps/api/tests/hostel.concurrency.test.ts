import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Student,
  Hostel,
  HostelBuilding,
  Room,
  Bed,
  HostelAllocation,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  StudentStatus,
  Gender,
  BedStatus,
  HostelAllocationStatus,
  RoomStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 17: Hostel Concurrency & Atomic Invariants Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const hostHeader = 'concurrency-hostel.edusphere.io';

  let adminToken: string;
  let hostelId: Types.ObjectId;
  let buildingId: Types.ObjectId;
  let room1Id: Types.ObjectId;
  let bed1Id: Types.ObjectId;
  let bed2Id: Types.ObjectId;
  const studentIds: Types.ObjectId[] = [];

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Hostel.init();
    await HostelBuilding.init();
    await Room.init();
    await Bed.init();
    await HostelAllocation.init();

    // 1. Seed Tenant, School, Campus, AcademicYear
    await Tenant.create({
      _id: tenantId,
      name: 'Hostel Concurrency Academy',
      slug: 'concurrency-hostel',
      customDomain: hostHeader,
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'admin@hostelconcurrency.edu', phone: '+1234567890' },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Hostel High',
      code: 'HH-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'MAIN',
      isPrimary: true,
      status: 'ACTIVE',
      address: { street: '100 Speed St', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26-27',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    });

    // 2. Permissions & Roles
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

    const passwordHash = await passwordService.hashPassword('AdminPassword123!');
    const adminUser = await User.create({
      _id: new Types.ObjectId(),
      tenantId,
      schoolId,
      campusId,
      email: 'hosteladmin@test.com',
      passwordHash,
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: roleMap.get('SUPER_ADMIN')!,
    });

    // Login admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'hosteladmin@test.com', password: 'AdminPassword123!' });

    adminToken = loginRes.body.data.accessToken || loginRes.body.data.tokens?.accessToken;

    // 3. Create Students
    for (let i = 1; i <= 5; i++) {
      const s = await Student.create({
        tenantId,
        schoolId,
        campusId,
        currentAcademicYearId: academicYearId,
        admissionNumber: `ADM-CONC-00${i}`,
        admissionDate: new Date('2026-06-01'),
        currentStatus: StudentStatus.ACTIVE,
        personalDetails: {
          firstName: `Boarder${i}`,
          lastName: 'Test',
          gender: Gender.MALE,
          dateOfBirth: new Date('2012-01-01'),
        },
        contactDetails: {
          currentAddress: {
            addressLine1: '100 Speed St',
            city: 'Metro',
            state: 'NY',
            postalCode: '10001',
            country: 'USA',
          },
        },
      });
      studentIds.push(s._id as Types.ObjectId);
    }

    // 4. Create Hostel, Building, Room, Beds
    const hostel = await Hostel.create({
      tenantId,
      schoolId,
      name: 'Everest Hostel',
      code: 'EVR-01',
      type: 'BOYS',
      capacity: 2,
      totalRooms: 1,
    });
    hostelId = hostel._id as Types.ObjectId;

    const building = await HostelBuilding.create({
      tenantId,
      schoolId,
      hostelId,
      name: 'Block A',
      code: 'BLK-A',
      numberOfFloors: 1,
    });
    buildingId = building._id as Types.ObjectId;

    const room = await Room.create({
      tenantId,
      schoolId,
      hostelId,
      buildingId,
      roomNumber: '101',
      floor: 1,
      capacity: 2,
      occupiedBedsCount: 0,
      status: RoomStatus.AVAILABLE,
    });
    room1Id = room._id as Types.ObjectId;

    const b1 = await Bed.create({
      tenantId,
      schoolId,
      hostelId,
      roomId: room1Id,
      bedNumber: 'A',
      code: '101-A',
      status: BedStatus.AVAILABLE,
      isOccupied: false,
    });
    bed1Id = b1._id as Types.ObjectId;

    const b2 = await Bed.create({
      tenantId,
      schoolId,
      hostelId,
      roomId: room1Id,
      bedNumber: 'B',
      code: '101-B',
      status: BedStatus.AVAILABLE,
      isOccupied: false,
    });
    bed2Id = b2._id as Types.ObjectId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  it('1. Handles concurrent allocation attempts on the exact same bed atomically', async () => {
    // Both students attempt to book bed1Id at the exact same moment
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/hostel/allocations')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: studentIds[0].toString(),
          academicYearId: academicYearId.toString(),
          hostelId: hostelId.toString(),
          roomId: room1Id.toString(),
          bedId: bed1Id.toString(),
        }),
      request(app)
        .post('/api/v1/hostel/allocations')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: studentIds[1].toString(),
          academicYearId: academicYearId.toString(),
          hostelId: hostelId.toString(),
          roomId: room1Id.toString(),
          bedId: bed1Id.toString(),
        }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    // Verify bed state in DB
    const bed = await Bed.findById(bed1Id);
    expect(bed?.status).toBe(BedStatus.OCCUPIED);
    expect(bed?.isOccupied).toBe(true);

    // Verify exactly one active allocation exists for bed1Id
    const allocations = await HostelAllocation.find({
      bedId: bed1Id,
      status: { $in: [HostelAllocationStatus.ALLOCATED, HostelAllocationStatus.CHECKED_IN] },
    });
    expect(allocations.length).toBe(1);

    // Verify room occupancy
    const room = await Room.findById(room1Id);
    expect(room?.occupiedBedsCount).toBe(1);
    expect(room?.status).toBe(RoomStatus.PARTIALLY_OCCUPIED);
  });

  it('2. Prevents a student from being allocated multiple beds in the same academic year', async () => {
    // Find the student who won bed1Id in Test 1
    const winningAlloc = await HostelAllocation.findOne({
      bedId: bed1Id,
      status: { $in: [HostelAllocationStatus.ALLOCATED, HostelAllocationStatus.CHECKED_IN] },
    });
    expect(winningAlloc).toBeTruthy();
    const winningStudentId = winningAlloc!.studentId;

    // Attempt to allocate bed2Id to the same student who already has bed1Id
    const res = await request(app)
      .post('/api/v1/hostel/allocations')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: winningStudentId.toString(),
        academicYearId: academicYearId.toString(),
        hostelId: hostelId.toString(),
        roomId: room1Id.toString(),
        bedId: bed2Id.toString(),
      });

    expect(res.status).toBe(409);
    const errMsg = res.body.error?.message || res.body.message;
    expect(errMsg).toMatch(/already has an active hostel allocation/i);

    // bed2Id should still be AVAILABLE
    const bed2 = await Bed.findById(bed2Id);
    expect(bed2?.status).toBe(BedStatus.AVAILABLE);
    expect(bed2?.isOccupied).toBe(false);
  });

  it('3. Atomically fills room to capacity and transitions room status to FULL', async () => {
    // Allocate bed2Id to studentIds[3] (unallocated student)
    const res = await request(app)
      .post('/api/v1/hostel/allocations')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentIds[3].toString(),
        academicYearId: academicYearId.toString(),
        hostelId: hostelId.toString(),
        roomId: room1Id.toString(),
        bedId: bed2Id.toString(),
      });

    expect(res.status).toBe(201);

    const room = await Room.findById(room1Id);
    expect(room?.occupiedBedsCount).toBe(2);
    expect(room?.capacity).toBe(2);
    expect(room?.status).toBe(RoomStatus.FULL);
  });

  it('4. Releasing a bed via checkout updates room count and status back to PARTIALLY_OCCUPIED', async () => {
    // Find allocation for bed2Id
    const alloc = await HostelAllocation.findOne({
      bedId: bed2Id,
      status: HostelAllocationStatus.ALLOCATED,
    });
    expect(alloc).toBeTruthy();

    const checkoutRes = await request(app)
      .post(`/api/v1/hostel/allocations/${alloc!._id}/check-out`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        checkoutReason: 'Vacating semester break',
      });

    expect(checkoutRes.status).toBe(200);

    const bed2 = await Bed.findById(bed2Id);
    expect(bed2?.status).toBe(BedStatus.AVAILABLE);
    expect(bed2?.isOccupied).toBe(false);

    const room = await Room.findById(room1Id);
    expect(room?.occupiedBedsCount).toBe(1);
    expect(room?.status).toBe(RoomStatus.PARTIALLY_OCCUPIED);
  });
});
