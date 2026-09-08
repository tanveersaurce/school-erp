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

export interface IAuditLog {
  id: string;
  tenantId: string;
  schoolId?: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt: Date;
}
