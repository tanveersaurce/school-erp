import { Types } from 'mongoose';
import { AuditLog } from '@edusphere/database';
import { AuditActorType, AuditStatus, IAuditChange } from '@edusphere/types';
import { logger } from '../logger/logger.js';

export interface RecordAuditInput {
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  userId?: string;
  actorType?: AuditActorType;
  action: string;
  entity: string;
  entityId: string;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
  changes?: IAuditChange[];
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'clientsecret',
  'authorization',
  'cookie',
  'cookies',
  'otp',
  'cvv',
  'pin',
  'ssn',
  'privatekey',
  'apikey',
]);

export function sanitizeAuditData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (data instanceof Date || data instanceof RegExp) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SENSITIVE_KEYS.has(lower) || Array.from(SENSITIVE_KEYS).some((k) => lower.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function computeChanges(before: unknown, after: unknown): IAuditChange[] {
  if (!before && !after) return [];
  if (!before && after && typeof after === 'object') {
    return Object.keys(after as Record<string, unknown>).map((field) => ({
      field,
      oldValue: null,
      newValue: sanitizeAuditData((after as Record<string, unknown>)[field]),
    }));
  }
  if (before && !after && typeof before === 'object') {
    return Object.keys(before as Record<string, unknown>).map((field) => ({
      field,
      oldValue: sanitizeAuditData((before as Record<string, unknown>)[field]),
      newValue: null,
    }));
  }
  if (typeof before === 'object' && typeof after === 'object' && before !== null && after !== null) {
    const b = before as Record<string, unknown>;
    const a = after as Record<string, unknown>;
    const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
    const changes: IAuditChange[] = [];

    for (const key of allKeys) {
      if (['__v', 'updatedAt', 'createdAt', 'passwordHash'].includes(key)) continue;
      const oldVal = b[key];
      const newVal = a[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldValue: sanitizeAuditData(oldVal),
          newValue: sanitizeAuditData(newVal),
        });
      }
    }
    return changes;
  }
  return [];
}

export async function recordAuditLog(input: RecordAuditInput): Promise<void> {
  try {
    const sanitizedBefore = input.before ? sanitizeAuditData(input.before) : undefined;
    const sanitizedAfter = input.after ? sanitizeAuditData(input.after) : undefined;
    const computedChanges =
      input.changes ??
      (sanitizedBefore || sanitizedAfter ? computeChanges(sanitizedBefore, sanitizedAfter) : undefined);

    await AuditLog.create({
      tenantId: new Types.ObjectId(input.tenantId),
      schoolId: input.schoolId ? new Types.ObjectId(input.schoolId) : undefined,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
      actorType: input.actorType ?? 'USER',
      action: input.action.toUpperCase().trim(),
      entity: input.entity.trim(),
      entityId: input.entityId,
      status: input.status ?? 'SUCCESS',
      metadata: input.metadata ? (sanitizeAuditData(input.metadata) as Record<string, unknown>) : undefined,
      before: sanitizedBefore,
      after: sanitizedAfter,
      changes: computedChanges,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      correlationId: input.correlationId,
    });
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, entity: input.entity, action: input.action },
      'Failed to record audit log record'
    );
  }
}
