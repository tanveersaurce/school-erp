import { Types } from 'mongoose';
import {
  Hostel,
  HostelRoomInspection,
  HostelMaintenance,
  Employee,
  IHostelRoomInspectionDoc,
  IHostelMaintenanceDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  HostelInspectionStatus,
  HostelMaintenanceStatus,
} from '@edusphere/common';

export class HostelMaintenanceService {
  // =========================================================================
  // 1. Room Inspections
  // =========================================================================

  public static async createInspection(
    tenantId: Types.ObjectId,
    data: any,
    inspector: Types.ObjectId
  ): Promise<IHostelRoomInspectionDoc> {
    const hostel = await Hostel.findOne({ _id: new Types.ObjectId(data.hostelId.toString()), tenantId });
    const inspection = new HostelRoomInspection({
      ...data,
      tenantId,
      schoolId: data.schoolId || hostel?.schoolId,
      campusId: data.campusId || hostel?.campusId,
      hostelId: new Types.ObjectId(data.hostelId.toString()),
      roomId: new Types.ObjectId(data.roomId.toString()),
      buildingId: data.buildingId ? new Types.ObjectId(data.buildingId.toString()) : undefined,
      inspector,
      inspectionDate: data.inspectionDate || new Date(),
      status: data.status || HostelInspectionStatus.PASSED,
    });
    await inspection.save();
    return inspection;
  }

  public static async getInspections(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelRoomInspectionDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.roomId) query.roomId = new Types.ObjectId(filter.roomId.toString());
    if (filter.status) query.status = filter.status;

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      HostelRoomInspection.find(query)
        .populate('roomId', 'roomNumber floor')
        .populate('hostelId', 'name code')
        .populate('inspector', 'name email')
        .sort({ inspectionDate: -1 })
        .skip(skip)
        .limit(limit),
      HostelRoomInspection.countDocuments(query),
    ]);

    return { data, total };
  }

  // =========================================================================
  // 2. Maintenance Requests
  // =========================================================================

  public static async createMaintenance(
    tenantId: Types.ObjectId,
    data: any,
    reportedBy: Types.ObjectId
  ): Promise<IHostelMaintenanceDoc> {
    const hostel = await Hostel.findOne({ _id: new Types.ObjectId(data.hostelId.toString()), tenantId });
    const maintenance = new HostelMaintenance({
      ...data,
      tenantId,
      schoolId: data.schoolId || hostel?.schoolId,
      campusId: data.campusId || hostel?.campusId,
      hostelId: new Types.ObjectId(data.hostelId.toString()),
      buildingId: data.buildingId ? new Types.ObjectId(data.buildingId.toString()) : undefined,
      roomId: data.roomId ? new Types.ObjectId(data.roomId.toString()) : undefined,
      bedId: data.bedId ? new Types.ObjectId(data.bedId.toString()) : undefined,
      assignedTo: data.assignedTo ? new Types.ObjectId(data.assignedTo.toString()) : undefined,
      reportedBy,
      reportedAt: new Date(),
      status: HostelMaintenanceStatus.OPEN,
      costMinorUnits: data.costMinorUnits || 0,
    });
    await maintenance.save();
    return maintenance;
  }

  public static async updateMaintenance(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId,
    data: any
  ): Promise<IHostelMaintenanceDoc> {
    const maintenance = await HostelMaintenance.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!maintenance) {
      throw new NotFoundError('Maintenance request not found.');
    }

    if (data.assignedTo) {
      maintenance.assignedTo = new Types.ObjectId(data.assignedTo.toString());
      if (maintenance.status === HostelMaintenanceStatus.OPEN) {
        maintenance.status = HostelMaintenanceStatus.ASSIGNED;
      }
    }

    if (data.status) maintenance.status = data.status;
    if (data.priority) maintenance.priority = data.priority;
    if (data.resolution) maintenance.resolution = data.resolution;
    if (data.costMinorUnits !== undefined) maintenance.costMinorUnits = data.costMinorUnits;

    if (
      data.status === HostelMaintenanceStatus.RESOLVED ||
      data.status === HostelMaintenanceStatus.CLOSED
    ) {
      maintenance.resolvedAt = new Date();
    }

    await maintenance.save();
    return maintenance;
  }

  public static async getMaintenanceRequests(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelMaintenanceDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.roomId) query.roomId = new Types.ObjectId(filter.roomId.toString());
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.category) query.category = filter.category;
    if (filter.assignedTo) query.assignedTo = new Types.ObjectId(filter.assignedTo.toString());

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      HostelMaintenance.find(query)
        .populate('hostelId', 'name code')
        .populate('roomId', 'roomNumber floor')
        .populate('bedId', 'bedNumber')
        .populate('reportedBy', 'name email')
        .populate('assignedTo', 'firstName lastName employeeCode')
        .sort({ reportedAt: -1 })
        .skip(skip)
        .limit(limit),
      HostelMaintenance.countDocuments(query),
    ]);

    return { data, total };
  }
}
