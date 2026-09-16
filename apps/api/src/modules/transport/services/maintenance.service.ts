import { Types } from 'mongoose';
import {
  VehicleMaintenance,
  VehicleInspection,
  Vehicle,
} from '@edusphere/database';
import {
  BadRequestError,
  NotFoundError,
  MaintenanceStatus,
  InspectionResult,
  VehicleStatus,
  Money,
} from '@edusphere/common';

export class MaintenanceService {
  // =========================================================================
  // 1. Vehicle Maintenance
  // =========================================================================
  public static async scheduleMaintenance(tenantId: string, schoolId: string, data: any) {
    const vehicle = await Vehicle.findOne({
      _id: new Types.ObjectId(data.vehicleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    const estimatedCost = data.estimatedCostMinorUnits !== undefined ? Math.round(data.estimatedCostMinorUnits) : 0;
    const actualCost = data.actualCostMinorUnits !== undefined ? Math.round(data.actualCostMinorUnits) : 0;

    const maintenance = await VehicleMaintenance.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId || vehicle.campusId),
      vehicleId: vehicle._id,
      serviceType: data.serviceType || 'ROUTINE_SERVICE',
      scheduledDate: new Date(data.scheduledDate),
      serviceDate: new Date(data.serviceDate || data.scheduledDate),
      completionDate: data.completionDate ? new Date(data.completionDate) : undefined,
      odometer: data.odometerReadingKm || vehicle.currentMileageKm || 0,
      odometerReadingKm: data.odometerReadingKm || vehicle.currentMileageKm || 0,
      description: data.description.trim(),
      serviceProvider: data.serviceProvider?.trim(),
      vendor: data.vendor?.trim() || data.serviceProvider?.trim(),
      cost: estimatedCost,
      costMinorUnits: estimatedCost,
      estimatedCostMinorUnits: estimatedCost,
      actualCostMinorUnits: actualCost,
      invoiceNumber: data.invoiceNumber?.trim(),
      partsReplaced: data.partsReplaced || [],
      status: data.status || MaintenanceStatus.SCHEDULED,
      notes: data.notes,
    });

    if (data.setVehicleUnderMaintenance) {
      vehicle.status = VehicleStatus.MAINTENANCE;
      await vehicle.save();
    }

    return maintenance;
  }

  public static async getMaintenanceRecords(
    tenantId: string,
    schoolId: string,
    filters: {
      vehicleId?: string;
      status?: MaintenanceStatus;
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

    if (filters.vehicleId) query.vehicleId = new Types.ObjectId(filters.vehicleId);
    if (filters.status) query.status = filters.status;

    const [items, total] = await Promise.all([
      VehicleMaintenance.find(query)
        .populate('vehicleId', 'registrationNumber make model')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limit),
      VehicleMaintenance.countDocuments(query),
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

  public static async getMaintenanceById(tenantId: string, maintenanceId: string) {
    const maintenance = await VehicleMaintenance.findOne({
      _id: new Types.ObjectId(maintenanceId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).populate('vehicleId', 'registrationNumber make model');

    if (!maintenance) {
      throw new NotFoundError('Maintenance record not found.');
    }

    return maintenance;
  }

  public static async completeMaintenance(
    tenantId: string,
    maintenanceId: string,
    data: {
      actualCostMinorUnits?: number;
      completionDate?: string;
      invoiceNumber?: string;
      partsReplaced?: string[];
      notes?: string;
      restoreVehicleActive?: boolean;
    }
  ) {
    const maintenance = await VehicleMaintenance.findOne({
      _id: new Types.ObjectId(maintenanceId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!maintenance) {
      throw new NotFoundError('Maintenance record not found.');
    }

    maintenance.status = MaintenanceStatus.COMPLETED;
    maintenance.completionDate = data.completionDate ? new Date(data.completionDate) : new Date();

    if (data.actualCostMinorUnits !== undefined) {
      maintenance.actualCostMinorUnits = Math.round(data.actualCostMinorUnits);
    }
    if (data.invoiceNumber) maintenance.invoiceNumber = data.invoiceNumber.trim();
    if (data.partsReplaced) maintenance.partsReplaced = data.partsReplaced;
    if (data.notes) maintenance.notes = data.notes;

    await maintenance.save();

    if (data.restoreVehicleActive !== false) {
      await Vehicle.findByIdAndUpdate(maintenance.vehicleId, {
        status: VehicleStatus.ACTIVE,
      });
    }

    return maintenance;
  }

  // =========================================================================
  // 2. Vehicle Inspections
  // =========================================================================
  public static async recordInspection(
    tenantId: string,
    schoolId: string,
    data: any,
    inspectorUserId?: string
  ) {
    const vehicle = await Vehicle.findOne({
      _id: new Types.ObjectId(data.vehicleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    const inspection = await VehicleInspection.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId || vehicle.campusId),
      vehicleId: vehicle._id,
      inspectionType: data.inspectionType || 'DAILY_PRE_TRIP',
      inspectionDate: new Date(data.inspectionDate || new Date()),
      odometerReadingKm: data.odometerReadingKm || vehicle.currentMileageKm || 0,
      checklist: data.checklist || {
        brakes: true,
        tires: true,
        lights: true,
        wipers: true,
        mirrors: true,
        seatBelts: true,
        emergencyExit: true,
        firstAidKit: true,
        fireExtinguisher: true,
        gpsOperational: true,
        cctvOperational: true,
      },
      result: data.result || InspectionResult.PASSED,
      defectsIdentified: data.defectsIdentified || [],
      actionRequired: data.actionRequired,
      inspectorEmployeeId: data.inspectorEmployeeId ? new Types.ObjectId(data.inspectorEmployeeId) : undefined,
    });

    return inspection;
  }

  public static async getInspections(
    tenantId: string,
    schoolId: string,
    filters: {
      vehicleId?: string;
      result?: InspectionResult;
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

    if (filters.vehicleId) query.vehicleId = new Types.ObjectId(filters.vehicleId);
    if (filters.result) query.result = filters.result;

    const [items, total] = await Promise.all([
      VehicleInspection.find(query)
        .populate('vehicleId', 'registrationNumber make model')
        .populate('inspectorEmployeeId', 'firstName lastName employeeId')
        .sort({ inspectionDate: -1 })
        .skip(skip)
        .limit(limit),
      VehicleInspection.countDocuments(query),
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
}
