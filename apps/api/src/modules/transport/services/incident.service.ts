import { Types } from 'mongoose';
import {
  TransportIncident,
  Vehicle,
  TransportTrip,
  TransportRoute,
} from '@edusphere/database';
import {
  NotFoundError,
  IncidentStatus,
  IncidentSeverity,
} from '@edusphere/common';

export class IncidentService {
  public static async reportIncident(
    tenantId: string,
    schoolId: string,
    data: any,
    reportedByUserId?: string
  ) {
    const incident = await TransportIncident.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId),
      vehicleId: data.vehicleId ? new Types.ObjectId(data.vehicleId) : undefined,
      tripId: data.tripId ? new Types.ObjectId(data.tripId) : undefined,
      routeId: data.routeId ? new Types.ObjectId(data.routeId) : undefined,
      driverId: data.driverId ? new Types.ObjectId(data.driverId) : undefined,
      incidentType: data.incidentType || 'OTHER',
      severity: data.severity || IncidentSeverity.LOW,
      title: data.title.trim(),
      description: data.description.trim(),
      occurredAt: new Date(data.occurredAt || new Date()),
      locationDescription: data.locationDescription,
      coordinates: data.latitude && data.longitude ? { type: 'Point', coordinates: [data.longitude, data.latitude] } : undefined,
      immediateActionTaken: data.immediateActionTaken,
      parentNotified: data.parentNotified ?? false,
      policeNotified: data.policeNotified ?? false,
      insuranceClaimInitiated: data.insuranceClaimInitiated ?? false,
      reportedBy: reportedByUserId ? new Types.ObjectId(reportedByUserId) : undefined,
      status: IncidentStatus.OPEN,
    });

    return incident;
  }

  public static async getIncidents(
    tenantId: string,
    schoolId: string,
    filters: {
      campusId?: string;
      vehicleId?: string;
      severity?: IncidentSeverity;
      status?: IncidentStatus;
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
    if (filters.vehicleId) query.vehicleId = new Types.ObjectId(filters.vehicleId);
    if (filters.severity) query.severity = filters.severity;
    if (filters.status) query.status = filters.status;

    const [items, total] = await Promise.all([
      TransportIncident.find(query)
        .populate('vehicleId', 'registrationNumber make model')
        .populate('routeId', 'name code')
        .populate({
          path: 'driverId',
          populate: { path: 'employeeId', select: 'firstName lastName phone' },
        })
        .populate('reportedBy', 'email')
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit),
      TransportIncident.countDocuments(query),
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

  public static async getIncidentById(tenantId: string, incidentId: string) {
    const incident = await TransportIncident.findOne({
      _id: new Types.ObjectId(incidentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('vehicleId', 'registrationNumber make model')
      .populate('routeId', 'name code')
      .populate('tripId', 'scheduledStartTime status')
      .populate({
        path: 'driverId',
        populate: { path: 'employeeId', select: 'firstName lastName phone' },
      })
      .populate('reportedBy', 'email')
      .populate('resolvedBy', 'email');

    if (!incident) {
      throw new NotFoundError('Transport incident not found.');
    }

    return incident;
  }

  public static async updateIncident(
    tenantId: string,
    incidentId: string,
    data: any,
    resolvedByUserId?: string
  ) {
    const incident = await TransportIncident.findOne({
      _id: new Types.ObjectId(incidentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!incident) {
      throw new NotFoundError('Transport incident not found.');
    }

    if (data.severity) incident.severity = data.severity;
    if (data.status) incident.status = data.status;
    if (data.immediateActionTaken !== undefined) incident.immediateActionTaken = data.immediateActionTaken;
    if (data.parentNotified !== undefined) incident.parentNotified = data.parentNotified;
    if (data.policeNotified !== undefined) incident.policeNotified = data.policeNotified;
    if (data.insuranceClaimInitiated !== undefined) incident.insuranceClaimInitiated = data.insuranceClaimInitiated;
    if (data.resolutionNotes !== undefined) incident.resolutionNotes = data.resolutionNotes;

    if (data.status === IncidentStatus.RESOLVED || data.status === IncidentStatus.CLOSED) {
      incident.resolvedAt = new Date();
      if (resolvedByUserId) incident.resolvedBy = new Types.ObjectId(resolvedByUserId);
    }

    await incident.save();
    return incident;
  }
}
