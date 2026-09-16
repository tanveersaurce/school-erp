import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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
  Employee,
  Department,
  Designation,
  Vehicle,
  VehicleType,
  TransportStop,
  TransportRoute,
  DriverProfile,
  AttendantProfile,
  StudentTransportAssignment,
  TransportTrip,
  TransportIncident,
  VehicleMaintenance,
  VehicleInspection,
  TransportFeeAssignment,
} from '@edusphere/database';
import {
  UserType,
  UserStatus,
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  StudentStatus,
  Gender,
  VehicleStatus,
  TripStatus,
  StudentTripStatus,
  TransportDocumentStatus,
  DriverStatus,
  DriverVerificationStatus,
  MaintenanceStatus,
  InspectionResult,
} from '@edusphere/common';
import { passwordService } from '../src/modules/auth/password.service.js';
import { SYSTEM_PERMISSIONS } from '../../../packages/database/src/seed/permissions.data.js';
import { SYSTEM_ROLES } from '../../../packages/database/src/seed/roles.data.js';

describe('Phase 16: Transport Management Lifecycle Integration Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const hostHeader = 'stxavier.edusphere.io';

  let adminToken: string;
  let driverToken: string;
  let vehicleTypeId: string;
  let vehicleId: string;
  let driverEmployeeId: string;
  let attendantEmployeeId: string;
  let driverProfileId: string;
  let attendantProfileId: string;
  let stop1Id: string;
  let stop2Id: string;
  let routeId: string;
  let studentId: string;
  let assignmentId: string;
  let tripId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Vehicle.init();
    await VehicleType.init();
    await TransportStop.init();
    await TransportRoute.init();
    await DriverProfile.init();
    await AttendantProfile.init();
    await StudentTransportAssignment.init();
    await TransportTrip.init();
    await TransportIncident.init();
    await VehicleMaintenance.init();
    await VehicleInspection.init();
    await TransportFeeAssignment.init();

    // 1. Seed Tenant, School, Campus, AcademicYear
    await Tenant.create({
      _id: tenantId,
      name: 'St. Xavier Transport Academy',
      slug: 'stxavier',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'St. Xavier High School',
      code: 'STX_HIGH',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'CBSE',
    });

    await Campus.create({
      _id: campusId,
      tenantId,
      schoolId,
      name: 'Main Campus',
      code: 'STX_MAIN',
      address: {
        street: '50 Transport Blvd',
        city: 'Metropolis',
        state: 'New York',
        postalCode: '10001',
        country: 'USA',
      },
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

    // 2. Seed Permissions & Roles
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

    // 3. Create Admin User
    const adminRoleId = roleMap.get('SCHOOL_ADMIN')!;
    const adminHash = await passwordService.hashPassword('Admin@123456');

    const adminUser = await User.create({
      tenantId,
      schoolId,
      campusId,
      email: 'transport.admin@stxavier.edu',
      passwordHash: adminHash,
      userType: UserType.STAFF,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await UserRole.create({
      tenantId,
      userId: adminUser._id,
      roleId: adminRoleId,
    });

    // 4. Create Driver Employee & User
    const driverRoleId = roleMap.get('STAFF')!;
    const driverUser = await User.create({
      tenantId,
      schoolId,
      campusId,
      email: 'driver.john@stxavier.edu',
      passwordHash: adminHash,
      userType: UserType.STAFF,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await UserRole.create({
      tenantId,
      userId: driverUser._id,
      roleId: driverRoleId,
    });

    // Department & Designation
    const dept = await Department.create({
      tenantId,
      schoolId,
      name: 'Transport Department',
      code: 'TRANS',
    });

    const desigDriver = await Designation.create({
      tenantId,
      schoolId,
      departmentId: dept._id,
      name: 'Senior Bus Driver',
      code: 'SR_BUS_DRV',
    });

    const desigAttendant = await Designation.create({
      tenantId,
      schoolId,
      departmentId: dept._id,
      name: 'Bus Attendant',
      code: 'BUS_ATT',
    });

    const driverEmp = await Employee.create({
      tenantId,
      schoolId,
      campusId,
      userId: driverUser._id,
      employeeId: 'EMP-DRV-001',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      gender: Gender.MALE,
      dateOfBirth: new Date('1985-01-01'),
      departmentId: dept._id,
      designationId: desigDriver._id,
      designation: 'Senior Bus Driver',
      department: 'Transport',
      joiningDate: new Date('2024-01-15'),
      phone: '+15550001111',
    });
    driverEmployeeId = driverEmp._id.toString();

    // Attendant Employee
    const attendantEmp = await Employee.create({
      tenantId,
      schoolId,
      campusId,
      employeeId: 'EMP-ATT-001',
      firstName: 'Sarah',
      lastName: 'Connor',
      displayName: 'Sarah Connor',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1990-06-15'),
      departmentId: dept._id,
      designationId: desigAttendant._id,
      designation: 'Bus Attendant',
      department: 'Transport',
      joiningDate: new Date('2024-02-01'),
      phone: '+15550002222',
    });
    attendantEmployeeId = attendantEmp._id.toString();

    // 5. Create Student
    const studentDoc = await Student.create({
      tenantId,
      schoolId,
      campusId,
      currentAcademicYearId: academicYearId,
      admissionNumber: 'ADM-TRN-001',
      admissionDate: new Date('2026-06-01'),
      currentStatus: StudentStatus.ACTIVE,
      personalDetails: {
        firstName: 'Timmy',
        lastName: 'Turner',
        gender: Gender.MALE,
        dateOfBirth: new Date('2012-05-10'),
      },
      contactDetails: {
        currentAddress: {
          addressLine1: '50 Transport Blvd',
          city: 'Metropolis',
          state: 'New York',
          postalCode: '10001',
          country: 'USA',
        },
      },
    });
    studentId = studentDoc._id.toString();

    // Logins to acquire JWT tokens
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'transport.admin@stxavier.edu', password: 'Admin@123456' });
    adminToken = adminLoginRes.body.data.accessToken;

    const driverLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Host', hostHeader)
      .send({ email: 'driver.john@stxavier.edu', password: 'Admin@123456' });
    driverToken = driverLoginRes.body.data.accessToken;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  }, 60000);

  it('1. GET /settings & PUT /settings: Configures transport policies', async () => {
    const getRes = await request(app)
      .get('/api/v1/transport/settings')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toHaveProperty('speedThresholdKmh');

    const putRes = await request(app)
      .put('/api/v1/transport/settings')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        speedThresholdKmh: 50,
        enableLiveTracking: true,
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.speedThresholdKmh).toBe(50);
  });

  it('2. POST /vehicle-types & GET /vehicle-types: Manages vehicle types', async () => {
    const createRes = await request(app)
      .post('/api/v1/transport/vehicle-types')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Standard 40-Seater Bus',
        code: 'BUS_40',
        defaultSeatingCapacity: 40,
        description: 'Standard air-conditioned school bus',
      });

    expect(createRes.status).toBe(201);
    vehicleTypeId = createRes.body.data._id;

    const listRes = await request(app)
      .get('/api/v1/transport/vehicle-types')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('3. POST /stops & GET /stops: Manages stops with geofence and fares', async () => {
    const stop1Res = await request(app)
      .post('/api/v1/transport/stops')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        name: 'Green Park Metro Station',
        code: 'STOP_GPRK',
        landmark: 'Exit Gate 2',
        location: { type: 'Point', coordinates: [77.208, 28.558] },
        zone: 'South Zone',
        fareStage: 1,
        standardFareMinorUnits: 1500, // $15.00
      });

    expect(stop1Res.status).toBe(201);
    stop1Id = stop1Res.body.data._id;

    const stop2Res = await request(app)
      .post('/api/v1/transport/stops')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        name: 'Hauz Khas Market',
        code: 'STOP_HKHS',
        landmark: 'Near Central Bank',
        location: { type: 'Point', coordinates: [77.204, 28.549] },
        zone: 'South Zone',
        fareStage: 2,
        standardFareMinorUnits: 2000, // $20.00
      });

    expect(stop2Res.status).toBe(201);
    stop2Id = stop2Res.body.data._id;

    const listRes = await request(app)
      .get('/api/v1/transport/stops')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);
  });

  it('4. POST /vehicles & GET /vehicles: Fleet management and compliance documents', async () => {
    const createRes = await request(app)
      .post('/api/v1/transport/vehicles')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        vehicleTypeId,
        registrationNumber: 'DL-01-AB-1234',
        vin: '1HGCR2F83HA123456',
        make: 'Tata Motors',
        model: 'Starbus Ultra',
        yearOfManufacture: 2023,
        seatingCapacity: 40,
        fuelType: 'DIESEL',
        currentMileageKm: 12500,
        status: VehicleStatus.ACTIVE,
      });

    expect(createRes.status).toBe(201);
    vehicleId = createRes.body.data._id;

    // Add Vehicle Document
    const docRes = await request(app)
      .post(`/api/v1/transport/vehicles/${vehicleId}/documents`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        documentType: 'FITNESS',
        documentNumber: 'FIT-2026-9999',
        issuedDate: new Date('2026-01-01').toISOString(),
        expiryDate: new Date('2027-01-01').toISOString(),
        remarks: 'Annual fitness passed without defects',
      });

    expect(docRes.status).toBe(201);
    const docId = docRes.body.data._id;

    // Verify Document
    const verifyRes = await request(app)
      .put(`/api/v1/transport/vehicles/documents/${docId}/verify`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: TransportDocumentStatus.VALID,
        remarks: 'Verified by safety inspector',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verificationStatus).toBe(TransportDocumentStatus.VALID);
  });

  it('5. POST /drivers & POST /attendants: Links drivers and attendants to staff', async () => {
    // Create Driver
    const driverRes = await request(app)
      .post('/api/v1/transport/drivers')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        employeeId: driverEmployeeId,
        licenseNumber: 'DL-TRANS-98765',
        licenseType: 'COMMERCIAL_HEAVY',
        licenseExpiryDate: new Date('2028-12-31').toISOString(),
        defaultVehicleId: vehicleId,
      });

    expect(driverRes.status).toBe(201);
    driverProfileId = driverRes.body.data._id;

    // Verify Driver
    const verifyRes = await request(app)
      .put(`/api/v1/transport/drivers/${driverProfileId}/verify`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: DriverVerificationStatus.VERIFIED,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verificationStatus).toBe(DriverVerificationStatus.VERIFIED);

    // Create Attendant
    const attendantRes = await request(app)
      .post('/api/v1/transport/attendants')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        employeeId: attendantEmployeeId,
        firstAidCertified: true,
        firstAidExpiryDate: new Date('2027-06-30').toISOString(),
        defaultVehicleId: vehicleId,
      });

    expect(attendantRes.status).toBe(201);
    attendantProfileId = attendantRes.body.data._id;
  });

  it('6. POST /routes: Configures route with sequenced stops and capacity', async () => {
    const routeRes = await request(app)
      .post('/api/v1/transport/routes')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        name: 'South Delhi Route 1',
        code: 'R-SD-01',
        description: 'Morning pickup and afternoon drop for South Delhi',
        direction: 'BOTH',
        startLocationName: 'Green Park',
        endLocationName: 'St. Xavier School',
        totalDistanceKm: 18.5,
        estimatedDurationMinutes: 45,
        vehicleId,
        driverId: driverProfileId,
        attendantId: attendantProfileId,
        maxCapacity: 40,
        stops: [
          {
            stopId: stop1Id,
            sequence: 1,
            expectedArrivalTime: '07:15',
            expectedDepartureTime: '07:20',
            distanceFromOriginKm: 0,
            pickupFareMinorUnits: 1500,
            dropFareMinorUnits: 1500,
          },
          {
            stopId: stop2Id,
            sequence: 2,
            expectedArrivalTime: '07:30',
            expectedDepartureTime: '07:35',
            distanceFromOriginKm: 5.2,
            pickupFareMinorUnits: 2000,
            dropFareMinorUnits: 2000,
          },
        ],
      });

    expect(routeRes.status).toBe(201);
    routeId = routeRes.body.data._id;

    // Check capacity endpoint
    const capacityRes = await request(app)
      .get(`/api/v1/transport/routes/${routeId}/capacity`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(capacityRes.status).toBe(200);
    expect(capacityRes.body.data.maxCapacity).toBe(40);
    expect(capacityRes.body.data.assignedCount).toBe(0);
  });

  it('7. POST /assignments: Assigns student to route with automatic zero-float fare', async () => {
    const assignRes = await request(app)
      .post('/api/v1/transport/assignments')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        studentId,
        routeId,
        pickupStopId: stop1Id,
        dropStopId: stop2Id,
        direction: 'BOTH',
        seatNumber: '12A',
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.status).toBe('ACTIVE');
    // Stop 1 pickup (1500) + Stop 2 drop (2000) = 3500 cents
    expect(assignRes.body.data.fareMinorUnits).toBe(3500);
    assignmentId = assignRes.body.data._id;

    // Verify route assignedCount incremented
    const capRes = await request(app)
      .get(`/api/v1/transport/routes/${routeId}/capacity`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(capRes.body.data.assignedCount).toBe(1);
  });

  it('8. Trips Lifecycle: Schedule -> Start -> Telemetry -> Boarding -> Complete', async () => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Schedule Trip
    const tripRes = await request(app)
      .post('/api/v1/transport/trips')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        routeId,
        tripDate: today,
        tripType: 'MORNING_PICKUP',
        scheduledStartTime: new Date().toISOString(),
      });

    expect(tripRes.status).toBe(201);
    tripId = tripRes.body.data._id;
    expect(tripRes.body.data.status).toBe(TripStatus.SCHEDULED);

    // 2. Start Trip
    const startRes = await request(app)
      .post(`/api/v1/transport/trips/${tripId}/start`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        startingOdometerKm: 12500,
        notes: 'Pre-trip checklist completed, departure on time.',
      });

    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe(TripStatus.IN_PROGRESS);

    // 3. Telemetry Update
    const telemetryRes = await request(app)
      .post(`/api/v1/transport/trips/${tripId}/telemetry`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        latitude: 28.5582,
        longitude: 77.2085,
        speedKmh: 42,
        heading: 180,
      });

    expect(telemetryRes.status).toBe(200);

    // 4. Mark Student Boarding
    const boardRes = await request(app)
      .post(`/api/v1/transport/trips/${tripId}/students/${studentId}/boarding`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        status: StudentTripStatus.BOARDED,
        stopId: stop1Id,
        remarks: 'Boarded with student bus card scan',
      });

    expect(boardRes.status).toBe(200);

    // 5. Complete Trip
    const completeRes = await request(app)
      .post(`/api/v1/transport/trips/${tripId}/complete`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        endingOdometerKm: 12519,
        notes: 'Trip completed safely, all students dropped.',
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe(TripStatus.COMPLETED);
  });

  it('9. POST /incidents & PUT /incidents/:id: Incident reporting and resolution', async () => {
    const incRes = await request(app)
      .post('/api/v1/transport/incidents')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        vehicleId,
        routeId,
        tripId,
        title: 'Minor Traffic Delay',
        description: 'Road construction near Hauz Khas caused 15 minute delay.',
        incidentType: 'DELAY',
        severity: 'LOW',
        immediateActionTaken: 'Parents notified via automated SMS push.',
      });

    expect(incRes.status).toBe(201);
    const incidentId = incRes.body.data._id;

    const resolveRes = await request(app)
      .put(`/api/v1/transport/incidents/${incidentId}`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'Alternative diversion mapped for future trips during construction.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
  });

  it('10. POST /maintenance & POST /inspections: Maintenance scheduling and inspections', async () => {
    // Schedule Maintenance
    const maintRes = await request(app)
      .post('/api/v1/transport/maintenance')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        campusId: campusId.toString(),
        vehicleId,
        serviceType: 'ROUTINE_SERVICE',
        scheduledDate: new Date('2026-10-15').toISOString(),
        description: '10,000 km routine brake and engine oil service',
        estimatedCostMinorUnits: 25000, // $250.00
      });

    expect(maintRes.status).toBe(201);
    const maintId = maintRes.body.data._id;

    // Complete Maintenance
    const completeRes = await request(app)
      .put(`/api/v1/transport/maintenance/${maintId}/complete`)
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        actualCostMinorUnits: 24500, // $245.00
        invoiceNumber: 'INV-TATA-7890',
        partsReplaced: ['Engine Oil Filter', 'Brake Fluid'],
        notes: 'Service completed within estimated budget',
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe(MaintenanceStatus.COMPLETED);

    // Record Pre-Trip Inspection
    const inspectRes = await request(app)
      .post('/api/v1/transport/inspections')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        campusId: campusId.toString(),
        vehicleId,
        inspectionType: 'DAILY_PRE_TRIP',
        result: InspectionResult.PASSED,
        checklist: {
          brakes: true,
          tires: true,
          lights: true,
          wipers: true,
          gpsOperational: true,
        },
      });

    expect(inspectRes.status).toBe(201);
    expect(inspectRes.body.data.result).toBe(InspectionResult.PASSED);
  });

  it('11. GET /reports/dashboard & GET /reports/capacity: Reports and analytics', async () => {
    const dashRes = await request(app)
      .get('/api/v1/transport/reports/dashboard')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.vehicles.total).toBe(1);
    expect(dashRes.body.data.routes.total).toBe(1);
    expect(dashRes.body.data.assignments.totalAssigned).toBe(1);

    const capRes = await request(app)
      .get('/api/v1/transport/reports/capacity')
      .set('Host', hostHeader)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(capRes.status).toBe(200);
    expect(capRes.body.data.length).toBe(1);
    expect(capRes.body.data[0].assignedCount).toBe(1);
  });
});
