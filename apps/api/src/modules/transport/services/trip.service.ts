import { Types } from 'mongoose';
import {
  TransportTrip,
  TransportRoute,
  Vehicle,
  DriverProfile,
  AttendantProfile,
  StudentTransportAssignment,
} from '@edusphere/database';
import {
  BadRequestError,
  NotFoundError,
  TripStatus,
  StudentTripStatus,
} from '@edusphere/common';

export class TripService {
  // =========================================================================
  // 1. Trip Scheduling & Dispatch
  // =========================================================================
  public static async createTrip(tenantId: string, schoolId: string, data: any) {
    const routeOid = new Types.ObjectId(data.routeId);
    const campusOid = new Types.ObjectId(data.campusId);

    const route = await TransportRoute.findOne({
      _id: routeOid,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!route) {
      throw new NotFoundError('Transport route not found.');
    }

    const vehicleOid = new Types.ObjectId(data.vehicleId || route.defaultVehicleId);
    const driverOid = new Types.ObjectId(data.driverId || route.defaultDriverId);
    const attendantOid = data.attendantId ? new Types.ObjectId(data.attendantId) : route.defaultAttendantId;

    const [vehicle, driver] = await Promise.all([
      Vehicle.findOne({ _id: vehicleOid, tenantId: new Types.ObjectId(tenantId), isDeleted: false }),
      DriverProfile.findOne({ _id: driverOid, tenantId: new Types.ObjectId(tenantId), isDeleted: false }),
    ]);

    if (!vehicle) {
      throw new BadRequestError('Assigned vehicle does not exist.');
    }
    if (!driver) {
      throw new BadRequestError('Assigned driver does not exist.');
    }

    const tripDate = new Date(data.tripDate);
    tripDate.setHours(0, 0, 0, 0);

    // Pre-populate students from active assignments on this route
    const assignments = await StudentTransportAssignment.find({
      tenantId: new Types.ObjectId(tenantId),
      routeId: routeOid,
      status: 'ACTIVE',
      isDeleted: false,
    });

    const studentsList = assignments.map((a) => ({
      studentId: a.studentId,
      pickupStopId: a.pickupStopId,
      dropStopId: a.dropStopId,
      status: StudentTripStatus.ASSIGNED,
    }));

    const trip = await TransportTrip.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: campusOid,
      routeId: routeOid,
      vehicleId: vehicleOid,
      driverId: driverOid,
      attendantId: attendantOid,
      tripDate,
      tripType: data.tripType || 'REGULAR_PICKUP',
      scheduledStartTime: new Date(data.scheduledStartTime),
      scheduledEndTime: data.scheduledEndTime ? new Date(data.scheduledEndTime) : undefined,
      status: TripStatus.SCHEDULED,
      students: studentsList,
      notes: data.notes,
    });

    return trip;
  }

  public static async getTrips(
    tenantId: string,
    schoolId: string,
    filters: {
      campusId?: string;
      routeId?: string;
      vehicleId?: string;
      driverId?: string;
      tripDate?: string;
      status?: TripStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (filters.campusId) query.campusId = new Types.ObjectId(filters.campusId);
    if (filters.routeId) query.routeId = new Types.ObjectId(filters.routeId);
    if (filters.vehicleId) query.vehicleId = new Types.ObjectId(filters.vehicleId);
    if (filters.driverId) query.driverId = new Types.ObjectId(filters.driverId);
    if (filters.status) query.status = filters.status;
    if (filters.tripDate) {
      const d = new Date(filters.tripDate);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      query.tripDate = { $gte: d, $lt: nextD };
    }

    const [items, total] = await Promise.all([
      TransportTrip.find(query)
        .populate('routeId', 'name code')
        .populate('vehicleId', 'registrationNumber make model seatingCapacity')
        .populate({
          path: 'driverId',
          populate: { path: 'employeeId', select: 'firstName lastName phone' },
        })
        .populate({
          path: 'attendantId',
          populate: { path: 'employeeId', select: 'firstName lastName phone' },
        })
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(limit),
      TransportTrip.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getTripById(tenantId: string, tripId: string) {
    const trip = await TransportTrip.findOne({
      _id: new Types.ObjectId(tripId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('routeId', 'name code stops')
      .populate('vehicleId', 'registrationNumber make model seatingCapacity fuelType')
      .populate({
        path: 'driverId',
        populate: { path: 'employeeId', select: 'firstName lastName phone' },
      })
      .populate({
        path: 'attendantId',
        populate: { path: 'employeeId', select: 'firstName lastName phone' },
      })
      .populate('students.studentId', 'firstName lastName admissionNumber rollNumber')
      .populate('students.pickupStopId', 'name code landmark')
      .populate('students.dropStopId', 'name code landmark');

    if (!trip) {
      throw new NotFoundError('Transport trip not found.');
    }

    return trip;
  }

  // =========================================================================
  // 2. Lifecycle Transitions (Start, Complete, Cancel)
  // =========================================================================
  public static async startTrip(
    tenantId: string,
    tripId: string,
    data: { startingOdometerKm?: number; notes?: string }
  ) {
    const trip = await TransportTrip.findOne({
      _id: new Types.ObjectId(tripId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!trip) {
      throw new NotFoundError('Transport trip not found.');
    }

    if (trip.status === TripStatus.IN_PROGRESS) {
      throw new BadRequestError('Trip is already in progress.');
    }
    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      throw new BadRequestError(`Cannot start a trip that is already ${trip.status.toLowerCase()}.`);
    }

    trip.status = TripStatus.IN_PROGRESS;
    trip.actualStartTime = new Date();
    if (data.startingOdometerKm !== undefined) trip.startingOdometerKm = data.startingOdometerKm;
    if (data.notes) trip.notes = data.notes;

    await trip.save();
    return trip;
  }

  public static async completeTrip(
    tenantId: string,
    tripId: string,
    data: { endingOdometerKm?: number; notes?: string }
  ) {
    const trip = await TransportTrip.findOne({
      _id: new Types.ObjectId(tripId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!trip) {
      throw new NotFoundError('Transport trip not found.');
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestError(`Cannot complete trip: trip status is currently ${trip.status.toLowerCase()}.`);
    }

    trip.status = TripStatus.COMPLETED;
    trip.actualEndTime = new Date();
    if (data.endingOdometerKm !== undefined) {
      trip.endingOdometerKm = data.endingOdometerKm;
      // Update vehicle's mileage
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        currentMileageKm: data.endingOdometerKm,
      });
    }
    if (data.notes) trip.notes = data.notes;

    await trip.save();
    return trip;
  }

  public static async cancelTrip(
    tenantId: string,
    tripId: string,
    data: { reason: string }
  ) {
    if (!data.reason || !data.reason.trim()) {
      throw new BadRequestError('Cancellation reason is required.');
    }

    const trip = await TransportTrip.findOne({
      _id: new Types.ObjectId(tripId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!trip) {
      throw new NotFoundError('Transport trip not found.');
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      throw new BadRequestError(`Cannot cancel trip: status is already ${trip.status.toLowerCase()}.`);
    }

    trip.status = TripStatus.CANCELLED;
    trip.notes = trip.notes ? `${trip.notes} | Cancelled: ${data.reason.trim()}` : `Cancelled: ${data.reason.trim()}`;

    await trip.save();
    return trip;
  }

  // =========================================================================
  // 3. Telemetry & Live Tracking
  // =========================================================================
  public static async updateTelemetry(
    tenantId: string,
    tripId: string,
    data: { latitude: number; longitude: number; speedKmh?: number; heading?: number; timestamp?: string }
  ) {
    const trip = await TransportTrip.findOne({
      _id: new Types.ObjectId(tripId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!trip) {
      throw new NotFoundError('Transport trip not found.');
    }

    const recordedAt = data.timestamp ? new Date(data.timestamp) : new Date();
    const coordinates: [number, number] = [data.longitude, data.latitude];

    trip.currentLocation = {
      type: 'Point',
      coordinates,
    };
    if (data.speedKmh !== undefined) trip.currentSpeedKmh = data.speedKmh;

    if (!trip.telemetry) trip.telemetry = [];
    trip.telemetry.push({
      coordinates,
      speedKmh: data.speedKmh || 0,
      heading: data.heading,
      timestamp: recordedAt,
    });

    // Keep telemetry breadcrumbs bounded to last 500 points to prevent doc bloat
    if (trip.telemetry.length > 500) {
      trip.telemetry = trip.telemetry.slice(trip.telemetry.length - 500);
    }

    await trip.save();
    return trip;
  }

  // =========================================================================
  // 4. Student Boarding & Deboarding
  // =========================================================================
  public static async markStudentBoarding(
    tenantId: string,
    tripId: string,
    studentId: string,
    data: { status: StudentTripStatus; stopId?: string; remarks?: string }
  ) {
    const trip = await TransportTrip.findOne({
      _id: new Types.ObjectId(tripId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!trip) {
      throw new NotFoundError('Transport trip not found.');
    }

    const studentOid = new Types.ObjectId(studentId);
    let studentEntry = (trip.students || []).find((s: any) => s.studentId.toString() === studentOid.toString());

    if (!studentEntry) {
      // If student not on list, add dynamically
      const newEntry: any = {
        studentId: studentOid,
        status: data.status,
        remarks: data.remarks,
      };
      if (data.stopId) newEntry.pickupStopId = new Types.ObjectId(data.stopId);
      if (data.status === StudentTripStatus.BOARDED) newEntry.boardedAt = new Date();
      if (data.status === StudentTripStatus.DROPPED) newEntry.deboardedAt = new Date();
      if (!trip.students) trip.students = [];
      trip.students.push(newEntry);
    } else {
      studentEntry.status = data.status;
      if (data.status === StudentTripStatus.BOARDED) {
        studentEntry.boardedAt = new Date();
      } else if (data.status === StudentTripStatus.DROPPED) {
        studentEntry.deboardedAt = new Date();
      }
      if (data.remarks) studentEntry.remarks = data.remarks;
    }

    await trip.save();
    return trip;
  }
}
