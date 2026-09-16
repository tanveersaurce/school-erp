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
  TransportSetting,
  VehicleType,
  Vehicle,
  TransportStop,
  TransportRoute,
  StudentTransportAssignment,
  TransportTrip,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  StudentStatus,
  Gender,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 16: Transport Concurrency & Atomic Invariants Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const hostHeader = 'concurrency.edusphere.io';

  let adminToken: string;
  let vehicleId: Types.ObjectId;
  let stop1Id: Types.ObjectId;
  let stop2Id: Types.ObjectId;
  let routeId: Types.ObjectId;
  const studentIds: Types.ObjectId[] = [];

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Vehicle.init();
    await VehicleType.init();
    await TransportStop.init();
    await TransportRoute.init();
    await StudentTransportAssignment.init();
    await TransportTrip.init();

    // 1. Seed Tenant, School, Campus, AcademicYear
    await Tenant.create({
      _id: tenantId,
      name: 'Concurrency Transport Academy',
      slug: 'concurrency',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Concurrency High School',
      code: 'CONC_HIGH',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Central Campus',
      code: 'CONC_CENTRAL',
      address: { street: '100 Speed St', city: 'Metro', state: 'NY', postalCode: '10001', country: 'USA' },
    });

    await AcademicYear.create({
      _id: academicYearId,
      tenantId,
      schoolId,
      campusId,
      name: '2026-2027',
      code: 'AY26-27',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
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

    // 3. Admin User
    const adminHash = await passwordService.hashPassword('Admin@123456');
    const adminUser = await User.create({
      tenantId,
      schoolId,
      campusId,
      email: 'admin.transport@concurrency.edu',
      passwordHash: adminHash,
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: roleMap.get('SCHOOL_ADMIN')!,
    });

    // 4. Transport Setting (allowOversubscription: false)
    await TransportSetting.create({
      tenantId,
      schoolId,
      campusId,
      allowOversubscription: false,
      maxOversubscriptionPercentage: 0,
      enableLiveTracking: true,
      speedThresholdKmh: 60,
    });

    // 5. Vehicle Type & Vehicle with Capacity 2
    const vType = await VehicleType.create({
      tenantId,
      schoolId,
      name: 'Micro Shuttle',
      code: 'SHUTTLE_2',
      defaultCapacity: 2,
    });

    const vehicle = await Vehicle.create({
      tenantId,
      schoolId,
      campusId,
      vehicleTypeId: vType._id,
      vehicleNumber: 'CONC-BUS-02',
      registrationNumber: 'CONC-BUS-02',
      capacity: 2,
      seatingCapacity: 2,
      make: 'Force Motors',
      model: 'Traveller Mini',
    });
    vehicleId = vehicle._id as Types.ObjectId;

    // 6. Stops
    const stop1 = await TransportStop.create({
      tenantId,
      schoolId,
      campusId,
      name: 'North Gate Point',
      code: 'STOP_N_GATE',
      standardFareMinorUnits: 1000,
    });
    stop1Id = stop1._id as Types.ObjectId;

    const stop2 = await TransportStop.create({
      tenantId,
      schoolId,
      campusId,
      name: 'South Terminal',
      code: 'STOP_S_TERM',
      standardFareMinorUnits: 1500,
    });
    stop2Id = stop2._id as Types.ObjectId;

    // 7. Route with maxCapacity 2
    const route = await TransportRoute.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Mini Express Route',
      code: 'RT_MINI_01',
      defaultVehicleId: vehicleId,
      maxCapacity: 2,
      assignedCount: 0,
      isActive: true,
      stops: [
        { stopId: stop1Id, sequence: 1, pickupFareMinorUnits: 1000, dropFareMinorUnits: 1000 },
        { stopId: stop2Id, sequence: 2, pickupFareMinorUnits: 1500, dropFareMinorUnits: 1500 },
      ],
    });
    routeId = route._id as Types.ObjectId;

    // 8. Create 5 distinct students
    for (let i = 1; i <= 5; i++) {
      const student = await Student.create({
        tenantId,
        schoolId,
        campusId,
        currentAcademicYearId: academicYearId,
        admissionNumber: `ADM-CONC-00${i}`,
        admissionDate: new Date('2026-06-01'),
        currentStatus: StudentStatus.ACTIVE,
        personalDetails: {
          firstName: `Student${i}`,
          lastName: `Test`,
          gender: Gender.FEMALE,
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
      studentIds.push(student._id as Types.ObjectId);
    }

    // Acquire Token
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'admin.transport@concurrency.edu', password: 'Admin@123456' });
    adminToken = adminLoginRes.body.data.accessToken;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  }, 60000);

  it('1. Atomic Capacity Limit: 5 concurrent seat requests for a 2-seater route guarantee exactly 2 successes and 3 rejections', async () => {
    const promises = studentIds.map((sId) =>
      request(app)
        .post('/api/v1/transport/assignments')
        .set('Host', hostHeader)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          campusId: campusId.toString(),
          studentId: sId.toString(),
          routeId: routeId.toString(),
          pickupStopId: stop1Id.toString(),
          dropStopId: stop2Id.toString(),
        })
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.status === 201);
    const failures = results.filter((r) => r.status === 400);

    expect(successes.length).toBe(2);
    expect(failures.length).toBe(3);

    // Verify DB state
    const updatedRoute = await TransportRoute.findById(routeId);
    expect(updatedRoute?.assignedCount).toBe(2);

    const activeAssignments = await StudentTransportAssignment.countDocuments({
      tenantId,
      routeId,
      status: 'ACTIVE',
    });
    expect(activeAssignments).toBe(2);
  });

  it('2. Conflict Prevention: Concurrent duplicate assignments for the same student return 409 Conflict', async () => {
    const activeAssignment = await StudentTransportAssignment.findOne({
      tenantId,
      routeId,
      status: 'ACTIVE',
    });
    expect(activeAssignment).not.toBeNull();

    const duplicateRes = await request(app)
      .post('/api/v1/transport/assignments')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        studentId: activeAssignment!.studentId.toString(),
        routeId: routeId.toString(),
        pickupStopId: stop1Id.toString(),
        dropStopId: stop2Id.toString(),
      });

    expect(duplicateRes.status).toBe(409);
    const msg = duplicateRes.body.error?.message || duplicateRes.body.message;
    expect(msg).toMatch(/already has an active transport assignment/i);
  });

  it('3. Atomic De-allocation: Cancelling an assignment decrements route assignedCount and frees seat', async () => {
    const activeAssignment = await StudentTransportAssignment.findOne({
      tenantId,
      routeId,
      status: 'ACTIVE',
    });
    expect(activeAssignment).not.toBeNull();

    const cancelRes = await request(app)
      .put(`/api/v1/transport/assignments/${activeAssignment!._id}/cancel`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Relocation' });

    expect(cancelRes.status).toBe(200);

    const updatedRoute = await TransportRoute.findById(routeId);
    expect(updatedRoute?.assignedCount).toBe(1);

    // Now an unassigned student should successfully claim the freed seat
    const unassignedStudentId = studentIds[4]; // Student 5
    const claimRes = await request(app)
      .post('/api/v1/transport/assignments')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        studentId: unassignedStudentId.toString(),
        routeId: routeId.toString(),
        pickupStopId: stop1Id.toString(),
        dropStopId: stop2Id.toString(),
      });

    expect(claimRes.status).toBe(201);

    const reUpdatedRoute = await TransportRoute.findById(routeId);
    expect(reUpdatedRoute?.assignedCount).toBe(2);
  });
});
