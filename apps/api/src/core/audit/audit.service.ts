import { Types } from 'mongoose';
import { AuditLog } from '@edusphere/database';
import { logger } from '../logger/logger.js';

export interface RecordAuditInput {
  tenantId: string;
  schoolId?: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export async function recordAuditLog(input: RecordAuditInput): Promise<void> {
  try {
    await AuditLog.create({
      tenantId: new Types.ObjectId(input.tenantId),
      schoolId: input.schoolId ? new Types.ObjectId(input.schoolId) : undefined,
      userId: new Types.ObjectId(input.userId),
      action: input.action.toUpperCase(),
      entity: input.entity,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, entity: input.entity, action: input.action },
      'Failed to record audit log record'
    );
  }
}
