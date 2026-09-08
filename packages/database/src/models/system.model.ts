import { Schema, model, Types } from 'mongoose';
import { IFileRecord, IAuditLog } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IFileRecordDoc extends Omit<
  IFileRecord,
  'id' | 'tenantId' | 'schoolId' | 'uploadedBy'
> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  uploadedBy: Types.ObjectId;
}

export interface IAuditLogDoc extends Omit<IAuditLog, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  userId: Types.ObjectId;
}

// 1. FileRecord Schema
const FileRecordSchema = new Schema<IFileRecordDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School' },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true, unique: true },
    bucket: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
FileRecordSchema.plugin(tenantPlugin);
FileRecordSchema.plugin(softDeletePlugin);
FileRecordSchema.index({ tenantId: 1, storageKey: 1 }, { unique: true });

// 2. AuditLog Schema (Tamper-evident operational compliance ledger)
const AuditLogSchema = new Schema<IAuditLogDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, uppercase: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, index: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    requestId: { type: String },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 63072000 }, // 730 days TTL (2 years retention)
    },
  },
  { timestamps: false, versionKey: false }
);
AuditLogSchema.plugin(tenantPlugin);
AuditLogSchema.index({ tenantId: 1, entity: 1, entityId: 1 });
AuditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });

export const FileRecord = model<IFileRecordDoc>('FileRecord', FileRecordSchema);
export const AuditLog = model<IAuditLogDoc>('AuditLog', AuditLogSchema);
