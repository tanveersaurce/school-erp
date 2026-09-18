import { Schema, model, Types, Document } from 'mongoose';
import {
  IReportExportJob,
  IScheduledReport,
} from '@edusphere/types';
import {
  ReportFormat,
  ExportJobStatus,
  ReportScheduleFrequency,
} from '@edusphere/common';
import { tenantPlugin } from '../plugins/tenantPlugin.js';

// ============================================================================
// Document Type Definitions
// ============================================================================
export interface IReportExportJobDoc
  extends Document,
    Omit<IReportExportJob, 'id' | '_id' | 'tenantId' | 'schoolId' | 'requestedBy'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  requestedBy: Types.ObjectId;
}

export interface IScheduledReportDoc
  extends Document,
    Omit<IScheduledReport, 'id' | '_id' | 'tenantId' | 'schoolId' | 'createdBy' | 'updatedBy'> {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

// ============================================================================
// 1. ReportExportJob Schema (Async batch export generation tracking)
// ============================================================================
const ReportExportJobSchema = new Schema<IReportExportJobDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportKey: { type: String, required: true, trim: true, index: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    format: {
      type: String,
      enum: Object.values(ReportFormat),
      default: ReportFormat.CSV,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ExportJobStatus),
      default: ExportJobStatus.QUEUED,
      required: true,
      index: true,
    },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    fileReference: { type: String, trim: true },
    downloadUrl: { type: String, trim: true },
    fileName: { type: String, trim: true },
    fileSizeBytes: { type: Number, default: 0 },
    rowCount: { type: Number, default: 0 },
    failureReason: { type: String, trim: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true, versionKey: '__v' }
);

ReportExportJobSchema.plugin(tenantPlugin);
ReportExportJobSchema.index({ tenantId: 1, requestedBy: 1, createdAt: -1 });
ReportExportJobSchema.index({ tenantId: 1, status: 1 });

// ============================================================================
// 2. ScheduledReport Schema (Automated recurring reports configuration)
// ============================================================================
const ScheduledReportSchema = new Schema<IScheduledReportDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    reportKey: { type: String, required: true, trim: true, index: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    format: {
      type: String,
      enum: Object.values(ReportFormat),
      default: ReportFormat.CSV,
      required: true,
    },
    frequency: {
      type: String,
      enum: Object.values(ReportScheduleFrequency),
      required: true,
    },
    timeOfDay: { type: String, default: '08:00' },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    recipients: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true, index: true },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date, index: true },
    lastRunStatus: { type: String, enum: ['SUCCESS', 'FAILED'] },
    lastRunError: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: '__v' }
);

ScheduledReportSchema.plugin(tenantPlugin);
ScheduledReportSchema.index({ tenantId: 1, isActive: 1, nextRunAt: 1 });
ScheduledReportSchema.index({ tenantId: 1, reportKey: 1 });

// ============================================================================
// Model Registrations & Exports
// ============================================================================
export const ReportExportJob = model<IReportExportJobDoc>('ReportExportJob', ReportExportJobSchema);
export const ScheduledReport = model<IScheduledReportDoc>('ScheduledReport', ScheduledReportSchema);
