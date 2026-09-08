import { Schema, model, Types } from 'mongoose';
import { LeaveStatus, PaymentMethod } from '@edusphere/common';
import { ISalaryStructure, IPayroll, ILeaveType, ILeaveRequest } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface ISalaryStructureDoc extends Omit<
  ISalaryStructure,
  'id' | 'tenantId' | 'schoolId' | 'employeeId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  employeeId: Types.ObjectId;
}

export interface IPayrollDoc extends Omit<IPayroll, 'id' | 'tenantId' | 'schoolId' | 'employeeId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  employeeId: Types.ObjectId;
}

export interface ILeaveTypeDoc extends Omit<ILeaveType, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface ILeaveRequestDoc extends Omit<
  ILeaveRequest,
  'id' | 'tenantId' | 'schoolId' | 'employeeId' | 'leaveTypeId' | 'reviewedBy'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
}

// 1. SalaryStructure Schema
const SalaryStructureSchema = new Schema<ISalaryStructureDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeType: { type: String, enum: ['TEACHER', 'STAFF'], required: true },
    baseSalary: { type: Number, required: true, min: 0 },
    allowances: [
      {
        name: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    deductions: [
      {
        name: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    netSalary: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SalaryStructureSchema.plugin(tenantPlugin);
SalaryStructureSchema.plugin(softDeletePlugin);
SalaryStructureSchema.index({ tenantId: 1, employeeId: 1 });

// 2. Payroll Schema
const PayrollSchema = new Schema<IPayrollDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeType: { type: String, enum: ['TEACHER', 'STAFF'], required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true, min: 0 },
    totalAllowances: { type: Number, required: true, default: 0 },
    totalDeductions: { type: Number, required: true, default: 0 },
    netSalary: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.BANK_TRANSFER,
      required: true,
    },
    paymentDate: { type: Date },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'PAID'],
      default: 'DRAFT',
      required: true,
      index: true,
    },
    transactionReference: { type: String },
  },
  { timestamps: true, versionKey: '__v' }
);
PayrollSchema.plugin(tenantPlugin);
PayrollSchema.index({ tenantId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });

// 3. LeaveType Schema
const LeaveTypeSchema = new Schema<ILeaveTypeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    maxDaysPerYear: { type: Number, required: true, min: 1 },
    isPaid: { type: Boolean, default: true },
    carryForward: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LeaveTypeSchema.plugin(tenantPlugin);
LeaveTypeSchema.plugin(softDeletePlugin);
LeaveTypeSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 4. LeaveRequest Schema
const LeaveRequestSchema = new Schema<ILeaveRequestDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeType: { type: String, enum: ['TEACHER', 'STAFF'], required: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(LeaveStatus),
      default: LeaveStatus.PENDING,
      required: true,
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewRemarks: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
LeaveRequestSchema.plugin(tenantPlugin);
LeaveRequestSchema.index({ tenantId: 1, employeeId: 1, startDate: -1 });

export const SalaryStructure = model<ISalaryStructureDoc>('SalaryStructure', SalaryStructureSchema);
export const Payroll = model<IPayrollDoc>('Payroll', PayrollSchema);
export const LeaveType = model<ILeaveTypeDoc>('LeaveType', LeaveTypeSchema);
export const LeaveRequest = model<ILeaveRequestDoc>('LeaveRequest', LeaveRequestSchema);
