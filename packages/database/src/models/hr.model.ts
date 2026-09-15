import { Schema, model, Types } from 'mongoose';
import {
  LeaveStatus,
  LeaveDurationType,
  HalfDayPeriod,
  LeaveAccrualMode,
  SalaryComponentType,
  ComponentCalculationType,
  PayrollPeriodStatus,
  PayrollPaymentStatus,
  PayrollAdjustmentType,
  OvertimeStatus,
  StatutoryType,
  PaymentMethod,
} from '@edusphere/common';
import {
  ILeaveType,
  ILeavePolicy,
  ILeaveBalance,
  ILeaveApplication,
  ISalaryComponent,
  ISalaryStructure,
  IEmployeeSalaryAssignment,
  IPayrollPeriod,
  IPayrollItem,
  IPayrollAdjustment,
  IOvertimeRecord,
  IStatutoryRule,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// =========================================================================
// 1. Leave Type Schema
// =========================================================================
export interface ILeaveTypeDoc extends Omit<ILeaveType, 'id' | 'tenantId' | 'schoolId' | 'campusId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
}

const LeaveTypeSchema = new Schema<ILeaveTypeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    isPaid: { type: Boolean, default: true, required: true },
    requiresApproval: { type: Boolean, default: true, required: true },
    requiresDocument: { type: Boolean, default: false, required: true },
    maximumDays: { type: Number, required: true, min: 0 },
    minimumNoticeDays: { type: Number, default: 0, min: 0 },
    carryForward: { type: Boolean, default: false, required: true },
    maxCarryForwardDays: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LeaveTypeSchema.plugin(tenantPlugin);
LeaveTypeSchema.plugin(softDeletePlugin);
LeaveTypeSchema.index(
  { tenantId: 1, schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// 2. Leave Policy Schema
// =========================================================================
export interface ILeavePolicyDoc
  extends Omit<ILeavePolicy, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'leaveTypeId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
}

const LeavePolicySchema = new Schema<ILeavePolicyDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    annualAllocation: { type: Number, required: true, min: 0 },
    accrualMode: {
      type: String,
      enum: Object.values(LeaveAccrualMode),
      default: LeaveAccrualMode.ANNUAL,
      required: true,
    },
    carryForward: { type: Boolean, default: false, required: true },
    maxCarryForwardDays: { type: Number, default: 0, min: 0 },
    allowHalfDay: { type: Boolean, default: true, required: true },
    probationAllowed: { type: Boolean, default: false, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LeavePolicySchema.plugin(tenantPlugin);
LeavePolicySchema.plugin(softDeletePlugin);
LeavePolicySchema.index(
  { tenantId: 1, schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// 3. Leave Balance Schema
// =========================================================================
export interface ILeaveBalanceDoc
  extends Omit<ILeaveBalance, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'employeeId' | 'leaveTypeId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
}

const LeaveBalanceSchema = new Schema<ILeaveBalanceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    year: { type: Number, required: true, index: true },
    allocatedDays: { type: Number, required: true, default: 0, min: 0 },
    usedDays: { type: Number, required: true, default: 0, min: 0 },
    pendingDays: { type: Number, required: true, default: 0, min: 0 },
    availableDays: { type: Number, required: true, default: 0 },
    carriedForwardDays: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: '__v' }
);
LeaveBalanceSchema.plugin(tenantPlugin);
LeaveBalanceSchema.index(
  { tenantId: 1, employeeId: 1, leaveTypeId: 1, year: 1 },
  { unique: true }
);

// =========================================================================
// 4. Leave Application Schema
// =========================================================================
export interface ILeaveApplicationDoc
  extends Omit<
    ILeaveApplication,
    | 'id'
    | 'tenantId'
    | 'schoolId'
    | 'campusId'
    | 'employeeId'
    | 'leaveTypeId'
    | 'attachmentFileRecordId'
    | 'reviewedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
  attachmentFileRecordId?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
}

const LeaveApplicationSchema = new Schema<ILeaveApplicationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    totalDays: { type: Number, required: true, min: 0.5 },
    durationType: {
      type: String,
      enum: Object.values(LeaveDurationType),
      default: LeaveDurationType.FULL_DAY,
      required: true,
    },
    halfDayPeriod: {
      type: String,
      enum: Object.values(HalfDayPeriod),
    },
    reason: { type: String, required: true, trim: true },
    attachmentFileRecordId: { type: Schema.Types.ObjectId, ref: 'FileRecord' },
    attachmentUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(LeaveStatus),
      default: LeaveStatus.PENDING,
      required: true,
      index: true,
    },
    appliedAt: { type: Date, default: Date.now, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true, versionKey: '__v' }
);
LeaveApplicationSchema.plugin(tenantPlugin);
LeaveApplicationSchema.index({ tenantId: 1, employeeId: 1, startDate: -1 });
LeaveApplicationSchema.index({ tenantId: 1, schoolId: 1, status: 1 });

// =========================================================================
// 5. Salary Component Schema
// =========================================================================
export interface ISalaryComponentDoc
  extends Omit<ISalaryComponent, 'id' | 'tenantId' | 'schoolId' | 'campusId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
}

const SalaryComponentSchema = new Schema<ISalaryComponentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: Object.values(SalaryComponentType),
      required: true,
    },
    calculationType: {
      type: String,
      enum: Object.values(ComponentCalculationType),
      default: ComponentCalculationType.FIXED,
      required: true,
    },
    amountOrPercentage: { type: Number, required: true, min: 0 },
    baseComponentCode: { type: String, uppercase: true, trim: true },
    isTaxable: { type: Boolean, default: true, required: true },
    isStatutory: { type: Boolean, default: false, required: true },
    statutoryType: {
      type: String,
      enum: Object.values(StatutoryType),
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SalaryComponentSchema.plugin(tenantPlugin);
SalaryComponentSchema.plugin(softDeletePlugin);
SalaryComponentSchema.index(
  { tenantId: 1, schoolId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// =========================================================================
// 6. Salary Structure Schema
// =========================================================================
export interface ISalaryStructureDoc
  extends Omit<ISalaryStructure, 'id' | 'tenantId' | 'schoolId' | 'campusId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
}

const SalaryStructureComponentSubSchema = new Schema(
  {
    componentId: { type: Schema.Types.ObjectId, ref: 'SalaryComponent', required: true },
    componentCode: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(SalaryComponentType), required: true },
    calculationType: { type: String, enum: Object.values(ComponentCalculationType), required: true },
    amountOrPercentage: { type: Number, required: true, min: 0 },
    baseComponentCode: { type: String, uppercase: true, trim: true },
    isStatutory: { type: Boolean, default: false },
  },
  { _id: false }
);

const SalaryStructureSchema = new Schema<ISalaryStructureDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    components: [SalaryStructureComponentSubSchema],
    version: { type: Number, default: 1, required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
SalaryStructureSchema.plugin(tenantPlugin);
SalaryStructureSchema.plugin(softDeletePlugin);
SalaryStructureSchema.index({ tenantId: 1, schoolId: 1, code: 1, version: 1 }, { unique: true });

// =========================================================================
// 7. Employee Salary Assignment Schema
// =========================================================================
export interface IEmployeeSalaryAssignmentDoc
  extends Omit<
    IEmployeeSalaryAssignment,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'employeeId' | 'salaryStructureId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  employeeId: Types.ObjectId;
  salaryStructureId: Types.ObjectId;
}

const CustomSalaryComponentSubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: { type: String, enum: Object.values(SalaryComponentType), required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const EmployeeSalaryAssignmentSchema = new Schema<IEmployeeSalaryAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    salaryStructureId: {
      type: Schema.Types.ObjectId,
      ref: 'SalaryStructure',
      required: true,
      index: true,
    },
    baseSalary: { type: Number, required: true, min: 0 },
    grossSalary: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, default: 0, min: 0 },
    netSalary: { type: Number, required: true, min: 0 },
    annualCTC: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, default: 'USD' },
    customComponents: [CustomSalaryComponentSubSchema],
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    version: { type: Number, default: 1, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUPERSEDED'],
      default: 'ACTIVE',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
EmployeeSalaryAssignmentSchema.plugin(tenantPlugin);
EmployeeSalaryAssignmentSchema.plugin(softDeletePlugin);
EmployeeSalaryAssignmentSchema.index({ tenantId: 1, employeeId: 1, status: 1 });

// =========================================================================
// 8. Payroll Period Schema
// =========================================================================
export interface IPayrollPeriodDoc
  extends Omit<
    IPayrollPeriod,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'approvedBy' | 'processedBy' | 'lockedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  processedBy?: Types.ObjectId;
  lockedBy?: Types.ObjectId;
}

const PayrollPeriodSchema = new Schema<IPayrollPeriodDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    name: { type: String, required: true, trim: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    workingDays: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: Object.values(PayrollPeriodStatus),
      default: PayrollPeriodStatus.DRAFT,
      required: true,
      index: true,
    },
    totalEmployees: { type: Number, default: 0, min: 0 },
    totalGrossPay: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    totalNetPay: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
PayrollPeriodSchema.plugin(tenantPlugin);
PayrollPeriodSchema.index(
  { tenantId: 1, schoolId: 1, campusId: 1, year: 1, month: 1 },
  { unique: true }
);

// =========================================================================
// 9. Payroll Item Schema
// =========================================================================
export interface IPayrollItemDoc
  extends Omit<
    IPayrollItem,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'payrollPeriodId' | 'employeeId' | 'salaryAssignmentId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  payrollPeriodId: Types.ObjectId;
  employeeId: Types.ObjectId;
  salaryAssignmentId: Types.ObjectId;
}

const PayrollLineItemSubSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    isStatutory: { type: Boolean, default: false },
  },
  { _id: false }
);

const PayrollItemSchema = new Schema<IPayrollItemDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    payrollPeriodId: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollPeriod',
      required: true,
      index: true,
    },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeCode: { type: String, required: true, uppercase: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    departmentName: { type: String, trim: true },
    designationName: { type: String, trim: true },
    salaryAssignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeSalaryAssignment',
      required: true,
    },
    workingDays: { type: Number, required: true, min: 0 },
    paidDays: { type: Number, required: true, min: 0 },
    unpaidDays: { type: Number, required: true, default: 0, min: 0 },
    leaveDays: { type: Number, required: true, default: 0, min: 0 },
    overtimeHours: { type: Number, required: true, default: 0, min: 0 },
    overtimeAmount: { type: Number, required: true, default: 0, min: 0 },
    bonusAmount: { type: Number, required: true, default: 0, min: 0 },
    earnings: [PayrollLineItemSubSchema],
    deductions: [PayrollLineItemSubSchema],
    grossEarnings: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PayrollPaymentStatus),
      default: PayrollPaymentStatus.UNPAID,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.BANK_TRANSFER,
      required: true,
    },
    paymentReference: { type: String, trim: true },
    paymentDate: { type: Date },
    isLocked: { type: Boolean, default: false, required: true },
  },
  { timestamps: true, versionKey: '__v' }
);
PayrollItemSchema.plugin(tenantPlugin);
PayrollItemSchema.index({ tenantId: 1, payrollPeriodId: 1, employeeId: 1 }, { unique: true });
PayrollItemSchema.index({ tenantId: 1, employeeId: 1, createdAt: -1 });

// =========================================================================
// 10. Payroll Adjustment Schema
// =========================================================================
export interface IPayrollAdjustmentDoc
  extends Omit<
    IPayrollAdjustment,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'payrollPeriodId' | 'employeeId' | 'approvedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  payrollPeriodId: Types.ObjectId;
  employeeId: Types.ObjectId;
  approvedBy?: Types.ObjectId;
}

const PayrollAdjustmentSchema = new Schema<IPayrollAdjustmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    payrollPeriodId: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollPeriod',
      required: true,
      index: true,
    },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: {
      type: String,
      enum: Object.values(PayrollAdjustmentType),
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
PayrollAdjustmentSchema.plugin(tenantPlugin);
PayrollAdjustmentSchema.index({ tenantId: 1, payrollPeriodId: 1, employeeId: 1 });

// =========================================================================
// 11. Overtime Record Schema
// =========================================================================
export interface IOvertimeRecordDoc
  extends Omit<
    IOvertimeRecord,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'payrollPeriodId' | 'employeeId' | 'approvedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  payrollPeriodId?: Types.ObjectId;
  employeeId: Types.ObjectId;
  approvedBy?: Types.ObjectId;
}

const OvertimeRecordSchema = new Schema<IOvertimeRecordDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    payrollPeriodId: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true, index: true },
    hours: { type: Number, required: true, min: 0.5 },
    hourlyRate: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(OvertimeStatus),
      default: OvertimeStatus.PENDING,
      required: true,
      index: true,
    },
    reason: { type: String, trim: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
OvertimeRecordSchema.plugin(tenantPlugin);
OvertimeRecordSchema.index({ tenantId: 1, employeeId: 1, date: 1 });

// =========================================================================
// 12. Statutory Rule Schema
// =========================================================================
export interface IStatutoryRuleDoc
  extends Omit<IStatutoryRule, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

const StatutoryRuleSchema = new Schema<IStatutoryRuleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    statutoryType: {
      type: String,
      enum: Object.values(StatutoryType),
      required: true,
    },
    employeePercentage: { type: Number, required: true, min: 0, max: 100 },
    employerPercentage: { type: Number, required: true, default: 0, min: 0, max: 100 },
    wageCap: { type: Number, min: 0 },
    minWageThreshold: { type: Number, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
  },
  { timestamps: true, versionKey: '__v' }
);
StatutoryRuleSchema.plugin(tenantPlugin);
StatutoryRuleSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// =========================================================================
// Models Export
// =========================================================================
export const LeaveType = model<ILeaveTypeDoc>('LeaveType', LeaveTypeSchema);
export const LeavePolicy = model<ILeavePolicyDoc>('LeavePolicy', LeavePolicySchema);
export const LeaveBalance = model<ILeaveBalanceDoc>('LeaveBalance', LeaveBalanceSchema);
export const LeaveApplication = model<ILeaveApplicationDoc>('LeaveApplication', LeaveApplicationSchema);
export const LeaveRequest = LeaveApplication; // Backward compatibility alias

export const SalaryComponent = model<ISalaryComponentDoc>('SalaryComponent', SalaryComponentSchema);
export const SalaryStructure = model<ISalaryStructureDoc>('SalaryStructure', SalaryStructureSchema);
export const EmployeeSalaryAssignment = model<IEmployeeSalaryAssignmentDoc>(
  'EmployeeSalaryAssignment',
  EmployeeSalaryAssignmentSchema
);

export const PayrollPeriod = model<IPayrollPeriodDoc>('PayrollPeriod', PayrollPeriodSchema);
export const PayrollItem = model<IPayrollItemDoc>('PayrollItem', PayrollItemSchema);
export const Payroll = PayrollItem; // Backward compatibility alias

export const PayrollAdjustment = model<IPayrollAdjustmentDoc>('PayrollAdjustment', PayrollAdjustmentSchema);
export const OvertimeRecord = model<IOvertimeRecordDoc>('OvertimeRecord', OvertimeRecordSchema);
export const StatutoryRule = model<IStatutoryRuleDoc>('StatutoryRule', StatutoryRuleSchema);

