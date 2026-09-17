import { Types } from 'mongoose';
import {
  Hostel,
  HostelIncident,
  IHostelIncidentDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  HostelIncidentStatus,
} from '@edusphere/common';

export class HostelIncidentService {
  public static async reportIncident(
    tenantId: Types.ObjectId,
    data: any,
    reportedBy: Types.ObjectId
  ): Promise<IHostelIncidentDoc> {
    const hostel = await Hostel.findOne({ _id: new Types.ObjectId(data.hostelId.toString()), tenantId });
    const incident = new HostelIncident({
      ...data,
      tenantId,
      schoolId: data.schoolId || hostel?.schoolId,
      campusId: data.campusId || hostel?.campusId,
      hostelId: new Types.ObjectId(data.hostelId.toString()),
      buildingId: data.buildingId ? new Types.ObjectId(data.buildingId.toString()) : undefined,
      roomId: data.roomId ? new Types.ObjectId(data.roomId.toString()) : undefined,
      studentId: data.studentId ? new Types.ObjectId(data.studentId.toString()) : undefined,
      affectedStudents: data.affectedStudents?.map((s: string) => new Types.ObjectId(s)),
      reportedBy,
      reportedAt: new Date(),
      status: HostelIncidentStatus.OPEN,
    });
    await incident.save();
    return incident;
  }

  public static async updateIncident(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId,
    data: any,
    userId: Types.ObjectId
  ): Promise<IHostelIncidentDoc> {
    const incident = await HostelIncident.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!incident) {
      throw new NotFoundError('Incident record not found.');
    }

    Object.assign(incident, data);
    if (data.status === HostelIncidentStatus.RESOLVED || data.status === HostelIncidentStatus.CLOSED) {
      incident.resolvedBy = userId;
      incident.resolvedAt = new Date();
    }
    await incident.save();
    return incident;
  }

  public static async getIncidents(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelIncidentDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId.toString());
    if (filter.status) query.status = filter.status;
    if (filter.severity) query.severity = filter.severity;
    if (filter.type) query.type = filter.type;

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      HostelIncident.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('hostelId', 'name code')
        .populate('reportedBy', 'name email')
        .populate('resolvedBy', 'name email')
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit),
      HostelIncident.countDocuments(query),
    ]);

    return { data, total };
  }

  public static async getIncidentById(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<IHostelIncidentDoc> {
    const incident = await HostelIncident.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    })
      .populate('studentId')
      .populate('affectedStudents')
      .populate('hostelId')
      .populate('buildingId')
      .populate('roomId')
      .populate('reportedBy')
      .populate('resolvedBy');

    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }
    return incident;
  }
}
