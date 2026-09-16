import { Types } from 'mongoose';
import {
  TransportSetting,
  VehicleType,
  TransportStop,
  TransportRoute,
} from '@edusphere/database';
import { BadRequestError, NotFoundError } from '@edusphere/common';

export class TransportConfigService {
  // =========================================================================
  // 1. Transport Settings
  // =========================================================================
  public static async getOrCreateSetting(tenantId: string, schoolId: string, campusId?: string) {
    const campusOid = campusId ? new Types.ObjectId(campusId) : undefined;
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (campusOid) {
      filter.campusId = campusOid;
    }

    let setting = await TransportSetting.findOne(filter);

    if (!setting) {
      setting = await TransportSetting.create({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        campusId: campusOid,
        allowOversubscription: false,
        maxOversubscriptionPercentage: 0,
        enableLiveTracking: true,
        enableParentSmsAlerts: true,
        enableParentPushAlerts: true,
        etaAlertThresholdMinutes: 10,
        speedThresholdKmh: 60,
        harshBrakingThresholdG: 0.5,
        dailyTripCheckRequired: true,
        incidentAutoEscalateMinutes: 30,
        defaultFeeModel: 'DISTANCE_TIER',
        boardingVerificationPolicy: 'MANUAL',
      });
    }

    return setting;
  }

  public static async updateSetting(tenantId: string, schoolId: string, campusId: string | undefined, data: any) {
    const campusOid = campusId ? new Types.ObjectId(campusId) : undefined;
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (campusOid) {
      filter.campusId = campusOid;
    }

    let setting = await TransportSetting.findOne(filter);

    if (!setting) {
      setting = new TransportSetting({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        campusId: campusOid,
      });
    }

    if (data.allowOversubscription !== undefined) setting.allowOversubscription = data.allowOversubscription;
    if (data.maxOversubscriptionPercentage !== undefined) setting.maxOversubscriptionPercentage = data.maxOversubscriptionPercentage;
    if (data.enableLiveTracking !== undefined) setting.enableLiveTracking = data.enableLiveTracking;
    if (data.enableParentSmsAlerts !== undefined) setting.enableParentSmsAlerts = data.enableParentSmsAlerts;
    if (data.enableParentPushAlerts !== undefined) setting.enableParentPushAlerts = data.enableParentPushAlerts;
    if (data.etaAlertThresholdMinutes !== undefined) setting.etaAlertThresholdMinutes = data.etaAlertThresholdMinutes;
    if (data.speedThresholdKmh !== undefined) setting.speedThresholdKmh = data.speedThresholdKmh;
    if (data.harshBrakingThresholdG !== undefined) setting.harshBrakingThresholdG = data.harshBrakingThresholdG;
    if (data.dailyTripCheckRequired !== undefined) setting.dailyTripCheckRequired = data.dailyTripCheckRequired;
    if (data.incidentAutoEscalateMinutes !== undefined) setting.incidentAutoEscalateMinutes = data.incidentAutoEscalateMinutes;
    if (data.defaultFeeModel !== undefined) setting.defaultFeeModel = data.defaultFeeModel;
    if (data.boardingVerificationPolicy !== undefined) setting.boardingVerificationPolicy = data.boardingVerificationPolicy;

    await setting.save();
    return setting;
  }

  // =========================================================================
  // 2. Vehicle Types
  // =========================================================================
  public static async createVehicleType(tenantId: string, schoolId: string, data: any) {
    const code = data.code.toUpperCase().trim();
    const existing = await VehicleType.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Vehicle type with code '${code}' already exists.`);
    }

    const vehicleType = await VehicleType.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      name: data.name.trim(),
      code,
      defaultSeatingCapacity: data.defaultSeatingCapacity,
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return vehicleType;
  }

  public static async getVehicleTypes(tenantId: string, schoolId: string) {
    return VehicleType.find({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    }).sort({ name: 1 });
  }

  public static async updateVehicleType(tenantId: string, vehicleTypeId: string, data: any) {
    const vt = await VehicleType.findOne({
      _id: new Types.ObjectId(vehicleTypeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vt) {
      throw new NotFoundError('Vehicle type not found.');
    }

    if (data.name !== undefined) vt.name = data.name.trim();
    if (data.defaultSeatingCapacity !== undefined) vt.defaultSeatingCapacity = data.defaultSeatingCapacity;
    if (data.description !== undefined) vt.description = data.description;
    if (data.isActive !== undefined) vt.isActive = data.isActive;

    await vt.save();
    return vt;
  }

  public static async deleteVehicleType(tenantId: string, vehicleTypeId: string) {
    const vt = await VehicleType.findOne({
      _id: new Types.ObjectId(vehicleTypeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vt) {
      throw new NotFoundError('Vehicle type not found.');
    }

    vt.isDeleted = true;
    await vt.save();
    return vt;
  }

  // =========================================================================
  // 3. Transport Stops
  // =========================================================================
  public static async createStop(tenantId: string, schoolId: string, data: any) {
    const code = data.code.toUpperCase().trim();
    const existing = await TransportStop.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Transport stop with code '${code}' already exists.`);
    }

    const stop = await TransportStop.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId),
      name: data.name.trim(),
      code,
      landmark: data.landmark,
      location: data.location || { type: 'Point', coordinates: [0, 0] },
      zone: data.zone,
      fareStage: data.fareStage,
      standardFareMinorUnits: data.standardFareMinorUnits || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return stop;
  }

  public static async getStops(tenantId: string, schoolId: string, campusId?: string) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (campusId) {
      filter.campusId = new Types.ObjectId(campusId);
    }
    return TransportStop.find(filter).sort({ name: 1 });
  }

  public static async getStopById(tenantId: string, stopId: string) {
    const stop = await TransportStop.findOne({
      _id: new Types.ObjectId(stopId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!stop) {
      throw new NotFoundError('Transport stop not found.');
    }
    return stop;
  }

  public static async updateStop(tenantId: string, stopId: string, data: any) {
    const stop = await TransportStop.findOne({
      _id: new Types.ObjectId(stopId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!stop) {
      throw new NotFoundError('Transport stop not found.');
    }

    if (data.name !== undefined) stop.name = data.name.trim();
    if (data.landmark !== undefined) stop.landmark = data.landmark;
    if (data.location !== undefined) stop.location = data.location;
    if (data.zone !== undefined) stop.zone = data.zone;
    if (data.fareStage !== undefined) stop.fareStage = data.fareStage;
    if (data.standardFareMinorUnits !== undefined) stop.standardFareMinorUnits = data.standardFareMinorUnits;
    if (data.isActive !== undefined) stop.isActive = data.isActive;

    await stop.save();
    return stop;
  }

  public static async deleteStop(tenantId: string, stopId: string) {
    const stop = await TransportStop.findOne({
      _id: new Types.ObjectId(stopId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!stop) {
      throw new NotFoundError('Transport stop not found.');
    }

    // Check if stop is in use in any active route
    const inUse = await TransportRoute.findOne({
      tenantId: new Types.ObjectId(tenantId),
      'stops.stopId': stop._id,
      isDeleted: false,
    });

    if (inUse) {
      throw new BadRequestError(`Cannot delete stop: currently configured in route '${inUse.name}'.`);
    }

    stop.isDeleted = true;
    await stop.save();
    return stop;
  }
}
