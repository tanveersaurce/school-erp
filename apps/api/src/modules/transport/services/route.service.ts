import { Types } from 'mongoose';
import {
  TransportRoute,
  TransportRouteVersion,
  TransportStop,
  Vehicle,
  DriverProfile,
  AttendantProfile,
  StudentTransportAssignment,
  TransportTrip,
} from '@edusphere/database';
import { BadRequestError, NotFoundError } from '@edusphere/common';

export class RouteService {
  // =========================================================================
  // 1. Route CRUD & Management
  // =========================================================================
  public static async createRoute(tenantId: string, schoolId: string, data: any, createdByUserId?: string) {
    const code = data.code.toUpperCase().trim();
    const existing = await TransportRoute.findOne({
      tenantId: new Types.ObjectId(tenantId),
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Transport route with code '${code}' already exists.`);
    }

    let vehicleId: Types.ObjectId | undefined;
    let maxCapacity = 0;
    if (data.vehicleId) {
      const vehicle = await Vehicle.findOne({
        _id: new Types.ObjectId(data.vehicleId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!vehicle) {
        throw new BadRequestError('Invalid vehicle specified.');
      }
      vehicleId = vehicle._id;
      maxCapacity = vehicle.seatingCapacity || vehicle.capacity || 40;
    }

    let driverId: Types.ObjectId | undefined;
    if (data.driverId) {
      const driver = await DriverProfile.findOne({
        _id: new Types.ObjectId(data.driverId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!driver) {
        throw new BadRequestError('Invalid driver specified.');
      }
      driverId = driver._id;
    }

    let attendantId: Types.ObjectId | undefined;
    if (data.attendantId) {
      const attendant = await AttendantProfile.findOne({
        _id: new Types.ObjectId(data.attendantId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!attendant) {
        throw new BadRequestError('Invalid attendant specified.');
      }
      attendantId = attendant._id;
    }

    // Process and validate stops
    const stopsList: any[] = [];
    if (data.stops && Array.isArray(data.stops)) {
      for (const s of data.stops) {
        const stopDoc = await TransportStop.findOne({
          _id: new Types.ObjectId(s.stopId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (!stopDoc) {
          throw new BadRequestError(`Stop ID '${s.stopId}' is invalid or does not exist.`);
        }
        stopsList.push({
          stopId: stopDoc._id,
          sequence: s.sequence,
          expectedArrivalTime: s.expectedArrivalTime,
          expectedDepartureTime: s.expectedDepartureTime,
          distanceFromOriginKm: s.distanceFromOriginKm || 0,
          pickupFareMinorUnits: s.pickupFareMinorUnits ?? stopDoc.standardFareMinorUnits,
          dropFareMinorUnits: s.dropFareMinorUnits ?? stopDoc.standardFareMinorUnits,
        });
      }
      // Sort by sequence
      stopsList.sort((a, b) => a.sequence - b.sequence);
    }

    const route = await TransportRoute.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId),
      name: data.name.trim(),
      code,
      description: data.description,
      direction: data.direction || 'BOTH',
      startLocationName: data.startLocationName?.trim() || '',
      endLocationName: data.endLocationName?.trim() || '',
      totalDistanceKm: data.totalDistanceKm || 0,
      estimatedDurationMinutes: data.estimatedDurationMinutes || 0,
      defaultVehicleId: vehicleId,
      defaultDriverId: driverId,
      defaultAttendantId: attendantId,
      stops: stopsList,
      maxCapacity: data.maxCapacity || maxCapacity || 40,
      assignedCount: 0,
      currentVersion: 1,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    // Create Initial Version (v1)
    await TransportRouteVersion.create({
      tenantId: new Types.ObjectId(tenantId),
      routeId: route._id,
      version: 1,
      effectiveFrom: new Date(),
      stops: stopsList,
      totalDistanceKm: route.totalDistanceKm,
      estimatedDurationMinutes: route.estimatedDurationMinutes,
      changeSummary: 'Initial route creation',
      changedBy: createdByUserId ? new Types.ObjectId(createdByUserId) : undefined,
    });

    return route;
  }

  public static async getRoutes(
    tenantId: string,
    schoolId: string,
    filters: {
      campusId?: string;
      vehicleId?: string;
      driverId?: string;
      direction?: string;
      search?: string;
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
    if (filters.vehicleId) query.defaultVehicleId = new Types.ObjectId(filters.vehicleId);
    if (filters.driverId) query.defaultDriverId = new Types.ObjectId(filters.driverId);
    if (filters.direction) query.direction = filters.direction;
    if (filters.search) {
      const regex = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ name: regex }, { code: regex }, { startLocationName: regex }, { endLocationName: regex }];
    }

    const [items, total] = await Promise.all([
      TransportRoute.find(query)
        .populate('campusId', 'name code')
        .populate('defaultVehicleId', 'registrationNumber make model seatingCapacity')
        .populate({
          path: 'defaultDriverId',
          populate: { path: 'employeeId', select: 'firstName lastName phone' },
        })
        .populate({
          path: 'defaultAttendantId',
          populate: { path: 'employeeId', select: 'firstName lastName phone' },
        })
        .populate('stops.stopId', 'name code landmark standardFareMinorUnits')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      TransportRoute.countDocuments(query),
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

  public static async getRouteById(tenantId: string, routeId: string) {
    const route = await TransportRoute.findOne({
      _id: new Types.ObjectId(routeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name code')
      .populate('defaultVehicleId', 'registrationNumber make model seatingCapacity')
      .populate({
        path: 'defaultDriverId',
        populate: { path: 'employeeId', select: 'firstName lastName phone' },
      })
      .populate({
        path: 'defaultAttendantId',
        populate: { path: 'employeeId', select: 'firstName lastName phone' },
      })
      .populate('stops.stopId', 'name code landmark standardFareMinorUnits');

    if (!route) {
      throw new NotFoundError('Transport route not found.');
    }

    return route;
  }

  public static async updateRoute(
    tenantId: string,
    routeId: string,
    data: any,
    modifiedByUserId?: string
  ) {
    const route = await TransportRoute.findOne({
      _id: new Types.ObjectId(routeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!route) {
      throw new NotFoundError('Transport route not found.');
    }

    if (data.name !== undefined) route.name = data.name.trim();
    if (data.description !== undefined) route.description = data.description;
    if (data.direction !== undefined) route.direction = data.direction;
    if (data.startLocationName !== undefined) route.startLocationName = data.startLocationName.trim();
    if (data.endLocationName !== undefined) route.endLocationName = data.endLocationName.trim();
    if (data.totalDistanceKm !== undefined) route.totalDistanceKm = data.totalDistanceKm;
    if (data.estimatedDurationMinutes !== undefined) route.estimatedDurationMinutes = data.estimatedDurationMinutes;
    if (data.maxCapacity !== undefined) route.maxCapacity = data.maxCapacity;
    if (data.isActive !== undefined) route.isActive = data.isActive;

    if (data.vehicleId !== undefined) {
      route.defaultVehicleId = data.vehicleId ? new Types.ObjectId(data.vehicleId) : undefined;
    }
    if (data.driverId !== undefined) {
      route.defaultDriverId = data.driverId ? new Types.ObjectId(data.driverId) : undefined;
    }
    if (data.attendantId !== undefined) {
      route.defaultAttendantId = data.attendantId ? new Types.ObjectId(data.attendantId) : undefined;
    }

    let stopsChanged = false;
    if (data.stops && Array.isArray(data.stops)) {
      stopsChanged = true;
      const stopsList: any[] = [];
      for (const s of data.stops) {
        const stopDoc = await TransportStop.findOne({
          _id: new Types.ObjectId(s.stopId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (!stopDoc) {
          throw new BadRequestError(`Stop ID '${s.stopId}' is invalid.`);
        }
        stopsList.push({
          stopId: stopDoc._id,
          sequence: s.sequence,
          expectedArrivalTime: s.expectedArrivalTime,
          expectedDepartureTime: s.expectedDepartureTime,
          distanceFromOriginKm: s.distanceFromOriginKm || 0,
          pickupFareMinorUnits: s.pickupFareMinorUnits ?? stopDoc.standardFareMinorUnits,
          dropFareMinorUnits: s.dropFareMinorUnits ?? stopDoc.standardFareMinorUnits,
        });
      }
      stopsList.sort((a, b) => a.sequence - b.sequence);
      route.stops = stopsList;
    }

    if (stopsChanged) {
      route.currentVersion = (route.currentVersion || 1) + 1;
      await TransportRouteVersion.create({
        tenantId: new Types.ObjectId(tenantId),
        routeId: route._id,
        version: route.currentVersion,
        effectiveFrom: new Date(),
        stops: route.stops,
        totalDistanceKm: route.totalDistanceKm,
        estimatedDurationMinutes: route.estimatedDurationMinutes,
        changeSummary: data.changeSummary || `Updated route stops (v${route.currentVersion})`,
        changedBy: modifiedByUserId ? new Types.ObjectId(modifiedByUserId) : undefined,
      });
    }

    await route.save();
    return route;
  }

  public static async deleteRoute(tenantId: string, routeId: string) {
    const route = await TransportRoute.findOne({
      _id: new Types.ObjectId(routeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!route) {
      throw new NotFoundError('Transport route not found.');
    }

    // Check if active student assignments exist
    const activeAssignments = await StudentTransportAssignment.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      routeId: route._id,
      status: 'ACTIVE',
      isDeleted: false,
    });

    if (activeAssignments > 0) {
      throw new BadRequestError(`Cannot delete route: ${activeAssignments} active student assignments exist.`);
    }

    // Check if active/in-progress trips exist
    const activeTrips = await TransportTrip.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      routeId: route._id,
      status: 'IN_PROGRESS',
      isDeleted: false,
    });

    if (activeTrips > 0) {
      throw new BadRequestError('Cannot delete route: has active in-progress trips.');
    }

    route.isDeleted = true;
    await route.save();
    return route;
  }

  public static async getRouteVersions(tenantId: string, routeId: string) {
    return TransportRouteVersion.find({
      tenantId: new Types.ObjectId(tenantId),
      routeId: new Types.ObjectId(routeId),
      isDeleted: false,
    })
      .populate('changedBy', 'email')
      .sort({ version: -1 });
  }

  public static async getRouteCapacity(tenantId: string, routeId: string) {
    const route = await TransportRoute.findOne({
      _id: new Types.ObjectId(routeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).populate('defaultVehicleId', 'seatingCapacity registrationNumber');

    if (!route) {
      throw new NotFoundError('Transport route not found.');
    }

    const assignedCount = await StudentTransportAssignment.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      routeId: route._id,
      status: 'ACTIVE',
      isDeleted: false,
    });

    const maxCapacity = (route.defaultVehicleId as any)?.seatingCapacity || route.maxCapacity || 40;
    const availableSeats = Math.max(0, maxCapacity - assignedCount);
    const utilizationPercentage = maxCapacity > 0 ? Math.round((assignedCount / maxCapacity) * 100) : 0;

    return {
      routeId: route._id,
      routeName: route.name,
      routeCode: route.code,
      maxCapacity,
      assignedCount,
      availableSeats,
      utilizationPercentage,
      isFull: assignedCount >= maxCapacity,
    };
  }
}
