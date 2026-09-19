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

export interface IAuditLogDoc extends Omit<
  IAuditLog,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'userId'
> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  userId?: Types.ObjectId;
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
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorType: {
      type: String,
      enum: ['USER', 'SYSTEM', 'WORKER', 'API', 'ADMIN'],
      default: 'USER',
      required: true,
      index: true,
    },
    action: { type: String, required: true, uppercase: true, trim: true, index: true },
    entity: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
      required: true,
    },
    metadata: { type: Schema.Types.Mixed },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    changes: [
      {
        field: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
      },
    ],
    ipAddress: { type: String },
    userAgent: { type: String },
    requestId: { type: String, index: true },
    correlationId: { type: String, index: true },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 63072000 }, // 730 days TTL (2 years retention)
    },
  },
  { timestamps: false, versionKey: false }
);

AuditLogSchema.plugin(tenantPlugin);

// Immutability hooks - strictly reject mutations or deletions
const immutableError = () => new Error('AuditLog records are append-only and immutable.');

AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(immutableError());
  }
  next();
});

AuditLogSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  next(immutableError());
});

const queryMutationHooks = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
  'findOneAndReplace',
] as const;

queryMutationHooks.forEach((hook) => {
  AuditLogSchema.pre(hook as any, function (next) {
    next(immutableError());
  });
});

// Compound indexes for high performance compliance queries
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, entity: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, schoolId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, campusId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, requestId: 1 });
AuditLogSchema.index({ tenantId: 1, correlationId: 1 });

export const FileRecord = model<IFileRecordDoc>('FileRecord', FileRecordSchema);
export const AuditLog = model<IAuditLogDoc>('AuditLog', AuditLogSchema);
