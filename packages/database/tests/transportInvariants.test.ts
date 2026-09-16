import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  TransportSetting,
  VehicleType,
  Vehicle,
  VehicleDocument,
  Driver,
  DriverDocument,
  Attendant,
  TransportRoute,
  TransportRouteVersion,
  TransportStop,
  StudentTransportAssignment,
  TransportTrip,
  TripStudent,
  TransportIncident,
  VehicleMaintenance,
  VehicleInspection,
  TransportFeeAssignment,
} from '../src/models/transport.model.js';
import {
  VehicleStatus,
  RouteDirection,
  TransportAssignmentStatus,
  TripType,
  TripStatus,
  StudentTripStatus,
  TransportIncidentType,
  IncidentSeverity,
  VehicleServiceType,
  InspectionResult,
} from '@edusphere/common';

describe('Phase 16: Transport Database Invariants & Unique Constraints', () => {
  let mongod: MongoMemoryServer;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await TransportSetting.init();
    await VehicleType.init();
    await Vehicle.init();
    await VehicleDocument.init();
    await Driver.init();
    await DriverDocument.init();
    await Attendant.init();
    await TransportRoute.init();
    await TransportRouteVersion.init();
    await TransportStop.init();
    await StudentTransportAssignment.init();
    await TransportTrip.init();
    await TripStudent.init();
    await TransportIncident.init();
    await VehicleMaintenance.init();
    await VehicleInspection.init();
    await TransportFeeAssignment.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('1. Enforces unique vehicle number and registration number per tenant and school', async () => {
    await Vehicle.create({
      tenantId,
      schoolId,
      campusId,
      vehicleNumber: 'BUS-101',
      registrationNumber: 'DL-01-AB-1234',
      capacity: 40,
      status: VehicleStatus.ACTIVE,
    });

    // Duplicate vehicleNumber should fail
    await expect(
      Vehicle.create({
        tenantId,
        schoolId,
        campusId,
        vehicleNumber: 'BUS-101',
        registrationNumber: 'DL-01-AB-5678',
        capacity: 30,
        status: VehicleStatus.ACTIVE,
      })
    ).rejects.toThrow();

    // Duplicate registrationNumber should fail
    await expect(
      Vehicle.create({
        tenantId,
        schoolId,
        campusId,
        vehicleNumber: 'BUS-102',
        registrationNumber: 'DL-01-AB-1234',
        capacity: 35,
        status: VehicleStatus.ACTIVE,
      })
    ).rejects.toThrow();
  });

  it('2. Enforces unique route code per tenant and school/campus', async () => {
    await TransportRoute.create({
      tenantId,
      schoolId,
      campusId,
      routeCode: 'ROUTE-NORTH-01',
      routeName: 'North Corridor Express',
      direction: RouteDirection.BOTH,
    });

    await expect(
      TransportRoute.create({
        tenantId,
        schoolId,
        campusId,
        routeCode: 'ROUTE-NORTH-01',
        routeName: 'Duplicate North Route',
        direction: RouteDirection.PICKUP,
      })
    ).rejects.toThrow();
  });

  it('3. Enforces unique sequence order for stops within a route', async () => {
    const route = await TransportRoute.create({
      tenantId,
      schoolId,
      campusId,
      routeCode: 'ROUTE-SOUTH-01',
      routeName: 'South Corridor Route',
      direction: RouteDirection.BOTH,
    });

    await TransportStop.create({
      tenantId,
      schoolId,
      routeId: route._id,
      stopName: 'Central Square',
      sequenceOrder: 1,
      pickupTime: '07:15',
      dropTime: '15:15',
    });

    // Duplicate sequenceOrder on same route should fail
    await expect(
      TransportStop.create({
        tenantId,
        schoolId,
        routeId: route._id,
        stopName: 'Market Junction',
        sequenceOrder: 1,
        pickupTime: '07:25',
        dropTime: '15:25',
      })
    ).rejects.toThrow();

    // Different sequenceOrder on same route should succeed
    const stop2 = await TransportStop.create({
      tenantId,
      schoolId,
      routeId: route._id,
      stopName: 'Market Junction',
      sequenceOrder: 2,
      pickupTime: '07:25',
      dropTime: '15:25',
    });
    expect(stop2.sequenceOrder).toBe(2);
  });

  it('4. Enforces unique driver license number per tenant and school', async () => {
    const employeeId1 = new Types.ObjectId();
    const employeeId2 = new Types.ObjectId();

    await Driver.create({
      tenantId,
      schoolId,
      campusId,
      employeeId: employeeId1,
      licenseNumber: 'DL-IND-998877',
      licenseExpiryDate: new Date('2030-01-01'),
    });

    // Duplicate licenseNumber should fail
    await expect(
      Driver.create({
        tenantId,
        schoolId,
        campusId,
        employeeId: employeeId2,
        licenseNumber: 'DL-IND-998877',
        licenseExpiryDate: new Date('2031-01-01'),
      })
    ).rejects.toThrow();
  });

  it('5. Enforces single active student transport assignment per academic year', async () => {
    const studentId = new Types.ObjectId();
    const routeId = new Types.ObjectId();
    const stopId = new Types.ObjectId();

    await StudentTransportAssignment.create({
      tenantId,
      schoolId,
      campusId,
      studentId,
      academicYearId,
      routeId,
      pickupStopId: stopId,
      dropStopId: stopId,
      status: TransportAssignmentStatus.ACTIVE,
    });

    // Second ACTIVE assignment for same student & academic year should fail
    await expect(
      StudentTransportAssignment.create({
        tenantId,
        schoolId,
        campusId,
        studentId,
        academicYearId,
        routeId,
        pickupStopId: stopId,
        dropStopId: stopId,
        status: TransportAssignmentStatus.ACTIVE,
      })
    ).rejects.toThrow();

    // Creating a CANCELLED historical assignment is allowed
    const cancelledAssignment = await StudentTransportAssignment.create({
      tenantId,
      schoolId,
      campusId,
      studentId: new Types.ObjectId(),
      academicYearId,
      routeId,
      pickupStopId: stopId,
      dropStopId: stopId,
      status: TransportAssignmentStatus.CANCELLED,
    });
    expect(cancelledAssignment.status).toBe(TransportAssignmentStatus.CANCELLED);
  });

  it('6. Enforces unique idempotency key for transport trips', async () => {
    const routeId = new Types.ObjectId();
    const vehicleId = new Types.ObjectId();
    const driverId = new Types.ObjectId();

    await TransportTrip.create({
      tenantId,
      schoolId,
      campusId,
      tripDate: new Date('2026-09-20'),
      tripType: TripType.MORNING_PICKUP,
      routeId,
      vehicleId,
      driverId,
      scheduledStartTime: '07:00',
      scheduledEndTime: '08:00',
      status: TripStatus.SCHEDULED,
      idempotencyKey: 'GEN-20260920-MORNING-RT1',
    });

    // Duplicate idempotencyKey should fail
    await expect(
      TransportTrip.create({
        tenantId,
        schoolId,
        campusId,
        tripDate: new Date('2026-09-20'),
        tripType: TripType.MORNING_PICKUP,
        routeId,
        vehicleId,
        driverId,
        scheduledStartTime: '07:00',
        scheduledEndTime: '08:00',
        status: TripStatus.SCHEDULED,
        idempotencyKey: 'GEN-20260920-MORNING-RT1',
      })
    ).rejects.toThrow();
  });

  it('7. Enforces soft deletion filtering on vehicles and routes', async () => {
    const route = await TransportRoute.create({
      tenantId,
      schoolId,
      campusId,
      routeCode: 'ROUTE-DEL-TEST',
      routeName: 'Delete Test Route',
      direction: RouteDirection.BOTH,
    });

    expect(route.isDeleted).toBe(false);
    // Soft delete
    route.isDeleted = true;
    await route.save();

    const found = await TransportRoute.findById(route._id);
    expect(found).toBeNull();
  });
});
