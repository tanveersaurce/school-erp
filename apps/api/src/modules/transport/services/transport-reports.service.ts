import { Types } from 'mongoose';
import {
  Vehicle,
  TransportRoute,
  DriverProfile,
  StudentTransportAssignment,
  TransportTrip,
  TransportIncident,
  VehicleDocument,
  DriverDocument,
} from '@edusphere/database';
import {
  VehicleStatus,
  TripStatus,
  IncidentStatus,
  StudentTripStatus,
} from '@edusphere/common';

export class TransportReportsService {
  public static async getDashboardKPIs(
    tenantId: string,
    schoolId: string,
    campusId?: string
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const campusFilter: any = campusId ? { campusId: new Types.ObjectId(campusId) } : {};

    const [
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      totalRoutes,
      activeRoutes,
      totalDrivers,
      activeDrivers,
      totalAssignedStudents,
      activeTripsCount,
      openIncidentsCount,
    ] = await Promise.all([
      Vehicle.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, isDeleted: false }),
      Vehicle.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, status: VehicleStatus.ACTIVE, isDeleted: false }),
      Vehicle.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, status: VehicleStatus.MAINTENANCE, isDeleted: false }),
      TransportRoute.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, isDeleted: false }),
      TransportRoute.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, isActive: true, isDeleted: false }),
      DriverProfile.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, isDeleted: false }),
      DriverProfile.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, status: 'ACTIVE', isDeleted: false }),
      StudentTransportAssignment.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, status: 'ACTIVE', isDeleted: false }),
      TransportTrip.countDocuments({ tenantId: tenantOid, schoolId: schoolOid, ...campusFilter, status: TripStatus.IN_PROGRESS, isDeleted: false }),
      TransportIncident.countDocuments({
        tenantId: tenantOid,
        schoolId: schoolOid,
        ...campusFilter,
        status: { $in: [IncidentStatus.OPEN, IncidentStatus.INVESTIGATING] },
        isDeleted: false,
      }),
    ]);

    return {
      vehicles: {
        total: totalVehicles,
        active: activeVehicles,
        maintenance: maintenanceVehicles,
      },
      routes: {
        total: totalRoutes,
        active: activeRoutes,
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
      },
      assignments: {
        totalAssigned: totalAssignedStudents,
      },
      operations: {
        activeTrips: activeTripsCount,
        openIncidents: openIncidentsCount,
      },
    };
  }

  public static async getRouteCapacitySummary(
    tenantId: string,
    schoolId: string,
    campusId?: string
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const campusFilter: any = campusId ? { campusId: new Types.ObjectId(campusId) } : {};

    const routes = await TransportRoute.find({
      tenantId: tenantOid,
      schoolId: schoolOid,
      ...campusFilter,
      isDeleted: false,
    })
      .populate('defaultVehicleId', 'seatingCapacity registrationNumber')
      .sort({ name: 1 });

    return routes.map((r) => {
      const maxCapacity = (r.defaultVehicleId as any)?.seatingCapacity || r.maxCapacity || 40;
      const assignedCount = r.assignedCount || 0;
      const availableSeats = Math.max(0, maxCapacity - assignedCount);
      const utilization = maxCapacity > 0 ? Math.round((assignedCount / maxCapacity) * 100) : 0;

      return {
        routeId: r._id,
        name: r.name,
        code: r.code,
        direction: r.direction,
        maxCapacity,
        assignedCount,
        availableSeats,
        utilizationPercentage: utilization,
        isFull: assignedCount >= maxCapacity,
      };
    });
  }

  public static async getTripAttendanceSummary(
    tenantId: string,
    schoolId: string,
    tripDate?: string
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const d = tripDate ? new Date(tripDate) : new Date();
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const trips = await TransportTrip.find({
      tenantId: tenantOid,
      schoolId: schoolOid,
      tripDate: { $gte: d, $lt: nextD },
      isDeleted: false,
    });

    let scheduled = 0;
    let boarded = 0;
    let deboarded = 0;
    let absent = 0;

    for (const trip of trips) {
      for (const s of (trip.students || [])) {
        if (s.status === StudentTripStatus.ASSIGNED) scheduled++;
        else if (s.status === StudentTripStatus.BOARDED) boarded++;
        else if (s.status === StudentTripStatus.DROPPED) deboarded++;
        else if (s.status === StudentTripStatus.ABSENT) absent++;
      }
    }

    return {
      date: d.toISOString().split('T')[0],
      totalTrips: trips.length,
      attendance: {
        scheduled,
        boarded,
        deboarded,
        absent,
        totalStudentTrips: scheduled + boarded + deboarded + absent,
      },
    };
  }

  public static async getOverdueDocumentsReport(
    tenantId: string,
    schoolId: string,
    daysAhead = 30
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    const [vehicleDocs, driverDocs, driversWithExpiringLicense] = await Promise.all([
      VehicleDocument.find({
        tenantId: tenantOid,
        expiryDate: { $lte: thresholdDate },
        isDeleted: false,
      }).populate('vehicleId', 'registrationNumber make model'),
      DriverDocument.find({
        tenantId: tenantOid,
        expiryDate: { $lte: thresholdDate },
        isDeleted: false,
      }).populate({
        path: 'driverProfileId',
        populate: { path: 'employeeId', select: 'firstName lastName phone' },
      }),
      DriverProfile.find({
        tenantId: tenantOid,
        $or: [
          { licenseExpiryDate: { $lte: thresholdDate } },
          { medicalFitnessExpiryDate: { $lte: thresholdDate } },
        ],
        isDeleted: false,
      }).populate('employeeId', 'firstName lastName phone'),
    ]);

    return {
      thresholdDays: daysAhead,
      vehicleDocumentsExpiring: vehicleDocs,
      driverDocumentsExpiring: driverDocs,
      driversExpiringCompliance: driversWithExpiringLicense,
    };
  }
}
