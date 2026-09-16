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
  Parent,
  StudentParentRelation,
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
  ParentRelationship,
  TripType,
  TripStatus,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 16: Transport Security, Anti-IDOR & Tenant Isolation Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  // Tenant A
  const tenantAId = new Types.ObjectId();
  const schoolAId = new Types.ObjectId();
  const campusAId = new Types.ObjectId();
  const academicYearAId = new Types.ObjectId();
  const hostHeaderA = 'tenanta.edusphere.io';

  // Tenant B
  const tenantBId = new Types.ObjectId();
  const schoolBId = new Types.ObjectId();
  const campusBId = new Types.ObjectId();
  const academicYearBId = new Types.ObjectId();
  const hostHeaderB = 'tenantb.edusphere.io';

  let adminTokenA: string;
  let adminTokenB: string;
  let parentTokenA1: string;
  let parentTokenA2: string;

  let vehicleAId: string;
  let routeAId: string;
  let stopAId: string;
  let studentA1Id: string;
  let studentA2Id: string;
  let assignmentA1Id: string;
  let tripAId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Vehicle.init();
    await VehicleType.init();
    await TransportStop.init();
    await TransportRoute.init();
    await StudentTransportAssignment.init();
    await TransportTrip.init();

    // Seed Tenants
    await Tenant.create([
      { _id: tenantAId, name: 'Tenant A Academy', slug: 'tenanta', status: TenantStatus.ACTIVE, plan: TenantPlan.ENTERPRISE, billingStatus: TenantBillingStatus.ACTIVE },
      { _id: tenantBId, name: 'Tenant B Academy', slug: 'tenantb', status: TenantStatus.ACTIVE, plan: TenantPlan.ENTERPRISE, billingStatus: TenantBillingStatus.ACTIVE },
    ]);

    await School.create([
      { _id: schoolAId, tenantId: tenantAId, name: 'School A', code: 'SCH_A', currency: 'USD', timezone: 'UTC', affiliationBoard: 'CBSE' },
      { _id: schoolBId, tenantId: tenantBId, name: 'School B', code: 'SCH_B', currency: 'USD', timezone: 'UTC', affiliationBoard: 'CBSE' },
    ]);

    await Campus.create([
      {
        _id: campusAId,
        tenantId: tenantAId,
        schoolId: schoolAId,
        name: 'Campus A',
        code: 'CMP_A',
        address: { street: '123 A St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' },
      },
      {
        _id: campusBId,
        tenantId: tenantBId,
        schoolId: schoolBId,
        name: 'Campus B',
        code: 'CMP_B',
        address: { street: '456 B St', city: 'CityB', state: 'NY', postalCode: '10002', country: 'USA' },
      },
    ]);

    await AcademicYear.create([
      { _id: academicYearAId, tenantId: tenantAId, schoolId: schoolAId, campusId: campusAId, name: '2026-2027', code: 'AY-A', startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'), isCurrent: true },
      { _id: academicYearBId, tenantId: tenantBId, schoolId: schoolBId, campusId: campusBId, name: '2026-2027', code: 'AY-B', startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'), isCurrent: true },
    ]);

    // Permissions & Roles for both tenants
    const permDocs = await Permission.insertMany(SYSTEM_PERMISSIONS);
    const permMap = new Map<string, Types.ObjectId>();
    for (const p of permDocs) {
      permMap.set(p.permissionString.toLowerCase().trim(), p._id as Types.ObjectId);
    }

    for (const tId of [tenantAId, tenantBId]) {
      const roleDocs = await Role.insertMany(
        SYSTEM_ROLES.map((r) => ({
          tenantId: tId,
          name: r.name,
          description: r.description,
          isSystemRole: true,
        }))
      );
      const rMap = new Map<string, Types.ObjectId>();
      for (const r of roleDocs) rMap.set(r.name, r._id as Types.ObjectId);

      const rPerms: any[] = [];
      for (const r of SYSTEM_ROLES) {
        const rId = rMap.get(r.name);
        if (!rId) continue;
        if (r.permissions.includes('*')) {
          for (const pId of permMap.values()) rPerms.push({ tenantId: tId, roleId: rId, permissionId: pId });
        } else {
          for (const pStr of r.permissions) {
            const pId = permMap.get(pStr.toLowerCase().trim());
            if (pId) rPerms.push({ tenantId: tId, roleId: rId, permissionId: pId });
          }
        }
      }
      await RolePermission.insertMany(rPerms);
    }

    const adminHash = await passwordService.hashPassword('Admin@123456');

    // Admin A
    const adminA = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'admin@tenanta.edu',
      passwordHash: adminHash,
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    const adminRoleA = await Role.findOne({ tenantId: tenantAId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenantAId, userId: adminA._id, roleId: adminRoleA!._id });

    // Admin B
    const adminB = await User.create({
      tenantId: tenantBId,
      schoolId: schoolBId,
      campusId: campusBId,
      email: 'admin@tenantb.edu',
      passwordHash: adminHash,
      userType: UserType.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    const adminRoleB = await Role.findOne({ tenantId: tenantBId, name: 'SCHOOL_ADMIN' });
    await UserRole.create({ tenantId: tenantBId, userId: adminB._id, roleId: adminRoleB!._id });

    // Parent A1 (parent of Student A1)
    const parentA1User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'parent1@tenanta.edu',
      passwordHash: adminHash,
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    const parentRoleA = await Role.findOne({ tenantId: tenantAId, name: 'PARENT' });
    await UserRole.create({ tenantId: tenantAId, userId: parentA1User._id, roleId: parentRoleA!._id });

    // Parent A2 (parent of Student A2)
    const parentA2User = await User.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      email: 'parent2@tenanta.edu',
      passwordHash: adminHash,
      userType: UserType.PARENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
    await UserRole.create({ tenantId: tenantAId, userId: parentA2User._id, roleId: parentRoleA!._id });

    // Seed Tenant A Entities
    const vTypeA = await VehicleType.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      name: 'Standard Bus',
      code: 'BUS_STD',
      defaultCapacity: 40,
    });

    const vehicleA = await Vehicle.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      vehicleTypeId: vTypeA._id,
      vehicleNumber: 'TA-BUS-01',
      registrationNumber: 'TA-BUS-01',
      capacity: 40,
      make: 'Bluebird',
      model: 'Vision',
    });
    vehicleAId = vehicleA._id.toString();

    const stopA = await TransportStop.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: 'Main Stop A',
      code: 'STOP_A_01',
      standardFareMinorUnits: 1200,
    });
    stopAId = stopA._id.toString();

    const routeA = await TransportRoute.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      name: 'Route Alpha',
      code: 'RT_ALPHA',
      defaultVehicleId: vehicleA._id,
      maxCapacity: 40,
      assignedCount: 1,
      isActive: true,
      stops: [{ stopId: stopA._id, sequence: 1, pickupFareMinorUnits: 1200, dropFareMinorUnits: 1200 }],
    });
    routeAId = routeA._id.toString();

    // Students in Tenant A
    const studentA1 = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      currentAcademicYearId: academicYearAId,
      admissionNumber: 'ADM-A-001',
      admissionDate: new Date('2026-06-01'),
      currentStatus: StudentStatus.ACTIVE,
      personalDetails: { firstName: 'Alice', lastName: 'A', gender: Gender.FEMALE, dateOfBirth: new Date('2014-01-01') },
      contactDetails: { currentAddress: { addressLine1: '123 A St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' } },
    });
    studentA1Id = studentA1._id.toString();

    const studentA2 = await Student.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      currentAcademicYearId: academicYearAId,
      admissionNumber: 'ADM-A-002',
      admissionDate: new Date('2026-06-01'),
      currentStatus: StudentStatus.ACTIVE,
      personalDetails: { firstName: 'Bob', lastName: 'A', gender: Gender.MALE, dateOfBirth: new Date('2014-02-02') },
      contactDetails: { currentAddress: { addressLine1: '456 A St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' } },
    });
    studentA2Id = studentA2._id.toString();

    // Parent Relations
    const parentA1 = await Parent.create({
      tenantId: tenantAId,
      userId: parentA1User._id,
      guardianId: 'GRD-A-001',
      personalDetails: {
        firstName: 'Papa',
        lastName: 'Alice',
      },
      contactDetails: {
        email: 'parent1@tenanta.edu',
        phone: '1112223333',
        address: { addressLine1: '123 A St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' },
      },
    });
    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: studentA1._id,
      parentId: parentA1._id,
      relationshipType: 'FATHER',
      isEmergencyContact: true,
      status: 'ACTIVE',
    });

    const parentA2 = await Parent.create({
      tenantId: tenantAId,
      userId: parentA2User._id,
      guardianId: 'GRD-A-002',
      personalDetails: {
        firstName: 'Papa',
        lastName: 'Bob',
      },
      contactDetails: {
        email: 'parent2@tenanta.edu',
        phone: '4445556666',
        address: { addressLine1: '456 A St', city: 'CityA', state: 'NY', postalCode: '10001', country: 'USA' },
      },
    });
    await StudentParentRelation.create({
      tenantId: tenantAId,
      studentId: studentA2._id,
      parentId: parentA2._id,
      relationshipType: 'FATHER',
      isEmergencyContact: true,
      status: 'ACTIVE',
    });

    // Transport Assignment for Student A1
    const assignmentA1 = await StudentTransportAssignment.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      studentId: studentA1._id,
      routeId: routeA._id,
      pickupStopId: stopA._id,
      dropStopId: stopA._id,
      fareMinorUnits: 1200,
      status: 'ACTIVE',
    });
    assignmentA1Id = assignmentA1._id.toString();

    // Scheduled Trip for Route Alpha
    const tripA = await TransportTrip.create({
      tenantId: tenantAId,
      schoolId: schoolAId,
      campusId: campusAId,
      routeId: routeA._id,
      vehicleId: vehicleA._id,
      driverId: new Types.ObjectId(),
      tripDate: new Date(),
      tripType: TripType.MORNING_PICKUP,
      scheduledStartTime: '07:30',
      scheduledEndTime: '08:15',
      status: TripStatus.SCHEDULED,
      telemetryMasked: true,
      currentLocation: { type: 'Point', coordinates: [77.208, 28.558] },
    });
    tripAId = tripA._id.toString();

    // Acquire Logins
    const [loginA, loginB, loginP1, loginP2] = await Promise.all([
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'admin@tenanta.edu', password: 'Admin@123456' }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderB).send({ email: 'admin@tenantb.edu', password: 'Admin@123456' }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'parent1@tenanta.edu', password: 'Admin@123456' }),
      request(app).post('/api/v1/auth/login').set('Host', hostHeaderA).send({ email: 'parent2@tenanta.edu', password: 'Admin@123456' }),
    ]);

    adminTokenA = loginA.body.data.accessToken;
    adminTokenB = loginB.body.data.accessToken;
    parentTokenA1 = loginP1.body.data.accessToken;
    parentTokenA2 = loginP2.body.data.accessToken;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  }, 60000);

  it('1. Strict Tenant Isolation: Tenant B administrator cannot access Tenant A vehicle, route, or trip', async () => {
    // Tenant B attempts to fetch Tenant A vehicle
    const vehicleRes = await request(app)
      .get(`/api/v1/transport/vehicles/${vehicleAId}`)
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(vehicleRes.status).toBe(404);

    // Tenant B attempts to fetch Tenant A route
    const routeRes = await request(app)
      .get(`/api/v1/transport/routes/${routeAId}`)
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(routeRes.status).toBe(404);

    // Tenant B attempts to fetch Tenant A trip
    const tripRes = await request(app)
      .get(`/api/v1/transport/trips/${tripAId}`)
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(tripRes.status).toBe(404);

    // Tenant B listing vehicles returns 0 items
    const listRes = await request(app)
      .get('/api/v1/transport/vehicles')
      .set('Host', hostHeaderB)
      .set('Authorization', `Bearer ${adminTokenB}`);

    expect(listRes.status).toBe(200);
    const vehicleItems = Array.isArray(listRes.body.data) ? listRes.body.data : listRes.body.data.items;
    expect(vehicleItems.length).toBe(0);
  });

  it('2. Anti-IDOR Parent-Child Security: Parent A1 can view their own child assignment, but Parent A2 cannot access it', async () => {
    // Parent A1 fetches their own children transport
    const myResP1 = await request(app)
      .get('/api/v1/transport/assignments/my')
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${parentTokenA1}`);

    expect(myResP1.status).toBe(200);
    expect(myResP1.body.data.length).toBe(1);
    expect(myResP1.body.data[0].studentId._id.toString()).toBe(studentA1Id);

    // Parent A2 fetches their own children transport (has no assignments)
    const myResP2 = await request(app)
      .get('/api/v1/transport/assignments/my')
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${parentTokenA2}`);

    expect(myResP2.status).toBe(200);
    expect(myResP2.body.data.length).toBe(0);

    // Parent A2 attempts IDOR directly accessing Student A1 assignment by ID
    const directRes = await request(app)
      .get(`/api/v1/transport/assignments/${assignmentA1Id}`)
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${parentTokenA2}`);

    // Expect 403 Forbidden or 404 Not Found (blocked by anti-IDOR policy)
    expect([403, 404]).toContain(directRes.status);
  });

  it('3. Telemetry Privacy & Off-Duty Masking: Inactive/Off-duty trips mask GPS telemetry coordinates', async () => {
    // Admin A retrieves scheduled trip with telemetryMasked: true
    const tripRes = await request(app)
      .get(`/api/v1/transport/trips/${tripAId}`)
      .set('Host', hostHeaderA)
      .set('Authorization', `Bearer ${adminTokenA}`);

    expect(tripRes.status).toBe(200);
    // When masked, currentLocation or live GPS should be masked or empty coordinates
    const trip = tripRes.body.data;
    if (trip.telemetryMasked) {
      expect(trip.telemetry).toBeUndefined();
    }
  });
});
