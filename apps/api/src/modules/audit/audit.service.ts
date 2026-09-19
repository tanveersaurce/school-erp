import { Types, FilterQuery } from 'mongoose';
import { AuditLog, IAuditLogDoc } from '@edusphere/database';
import { AuditLogListResponse, IAuditLog } from '@edusphere/types';
import { NotFoundError } from '@edusphere/common';
import { AuditQueryInput } from './audit.validator.js';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatAuditLog(doc: any): IAuditLog {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj._id ? obj._id.toString() : obj.id,
    tenantId: obj.tenantId ? obj.tenantId.toString() : '',
    schoolId: obj.schoolId ? (obj.schoolId._id ? obj.schoolId._id.toString() : obj.schoolId.toString()) : undefined,
    campusId: obj.campusId ? (obj.campusId._id ? obj.campusId._id.toString() : obj.campusId.toString()) : undefined,
    userId: obj.userId ? (obj.userId._id ? obj.userId._id.toString() : obj.userId.toString()) : undefined,
    actorType: obj.actorType || 'USER',
    action: obj.action,
    entity: obj.entity,
    entityId: obj.entityId,
    status: obj.status || 'SUCCESS',
    metadata: obj.metadata,
    before: obj.before,
    after: obj.after,
    changes: obj.changes,
    ipAddress: obj.ipAddress,
    userAgent: obj.userAgent,
    requestId: obj.requestId,
    correlationId: obj.correlationId,
    createdAt: obj.createdAt || new Date(),
  };
}

export class AuditService {
  async queryAuditLogs(tenantId: string, filters: AuditQueryInput): Promise<AuditLogListResponse> {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: FilterQuery<IAuditLogDoc> = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filters.schoolId) {
      query.schoolId = new Types.ObjectId(filters.schoolId);
    }
    if (filters.campusId) {
      query.campusId = new Types.ObjectId(filters.campusId);
    }
    if (filters.actorUserId) {
      query.userId = new Types.ObjectId(filters.actorUserId);
    }
    if (filters.actorType) {
      query.actorType = filters.actorType;
    }
    if (filters.action) {
      query.action = { $regex: escapeRegex(filters.action), $options: 'i' };
    }
    if (filters.entity) {
      query.entity = filters.entity.toUpperCase().trim();
    }
    if (filters.entityId) {
      query.entityId = filters.entityId.trim();
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.requestId) {
      query.requestId = filters.requestId.trim();
    }
    if (filters.correlationId) {
      query.correlationId = filters.correlationId.trim();
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        if (filters.dateTo.length === 10) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        query.createdAt.$lte = toDate;
      }
    }

    const [totalRecords, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email userType')
        .lean(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      logs: logs.map((log: any) => formatAuditLog(log)),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getAuditLogById(tenantId: string, id: string): Promise<IAuditLog> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError(`Audit log entry not found: ${id}`);
    }

    const log = await AuditLog.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    })
      .populate('userId', 'firstName lastName email userType')
      .populate('schoolId', 'name code')
      .populate('campusId', 'name code')
      .lean();

    if (!log) {
      throw new NotFoundError(`Audit log entry not found: ${id}`);
    }

    return formatAuditLog(log);
  }

  async getResourceAuditHistory(
    tenantId: string,
    entity: string,
    entityId: string,
    page = 1,
    limit = 20
  ): Promise<AuditLogListResponse> {
    return this.queryAuditLogs(tenantId, {
      entity: entity.toUpperCase().trim(),
      entityId: entityId.trim(),
      page,
      limit,
    });
  }
}

export const auditService = new AuditService();
