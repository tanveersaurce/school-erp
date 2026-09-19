export interface IFileRecord {
  id: string;
  tenantId: string;
  schoolId?: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  bucket: string;
  uploadedBy: string;
  isPublic: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditActorType = 'USER' | 'SYSTEM' | 'WORKER' | 'API' | 'ADMIN';
export type AuditStatus = 'SUCCESS' | 'FAILURE';

export interface IAuditChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface IAuditLog {
  id: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  userId?: string;
  actorType: AuditActorType;
  action: string;
  entity: string;
  entityId: string;
  status: AuditStatus;
  metadata?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
  changes?: IAuditChange[];
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  createdAt: Date;
}

export interface AuditLogQueryFilters {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  actorUserId?: string;
  actorType?: AuditActorType;
  action?: string;
  entity?: string;
  entityId?: string;
  schoolId?: string;
  campusId?: string;
  status?: AuditStatus;
  requestId?: string;
}

export interface AuditLogListResponse {
  logs: IAuditLog[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
