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
  HRDocumentType,
  PaymentMethod,
  EmploymentStatus,
  EmploymentType,
} from '@edusphere/common';

// =========================================================================
// 1. Employee HR Extensions & Documents
// =========================================================================
export interface IEmployeeHrProfile {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  employeeId: string;
  employeeCode: string;
  probationStartDate?: Date;
  probationEndDate?: Date;
  confirmationDate?: Date;
  workLocation?: string;
  resignationDate?: Date;
  lastWorkingDate?: Date;
  terminationDate?: Date;
  terminationReason?: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  documents: IEmployeeHrDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmployeeHrDocument {
  id?: string;
  name: string;
  documentType: HRDocumentType;
  fileRecordId?: string;
  fileUrl?: string;
  expiryDate?: Date;
  uploadedBy?: string;
  uploadedAt: Date;
}

// =========================================================================
// 2. Leave Management
// =========================================================================
export interface ILeaveType {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  name: string;
  code: string;
  description?: string;
  isPaid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  maximumDays: number;
  minimumNoticeDays: number;
  carryForward: boolean;
  maxCarryForwardDays: number;
  status: 'ACTIVE' | 'INACTIVE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeavePolicy {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  name: string;
  code: string;
  description?: string;
  leaveTypeId: string;
  annualAllocation: number;
  accrualMode: LeaveAccrualMode;
  carryForward: boolean;
  maxCarryForwardDays: number;
  allowHalfDay: boolean;
  probationAllowed: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveBalance {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  carriedForwardDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveApplication {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  durationType: LeaveDurationType;
  halfDayPeriod?: HalfDayPeriod;
  reason: string;
  attachmentFileRecordId?: string;
  attachmentUrl?: string;
  status: LeaveStatus;
  appliedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Backward-compatibility alias
export type ILeaveRequest = ILeaveApplication;

// =========================================================================
// 3. Salary Components & Structures
// =========================================================================
export interface ISalaryComponent {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  name: string;
  code: string;
  type: SalaryComponentType;
  calculationType: ComponentCalculationType;
  amountOrPercentage: number; // Integer minor units (if FIXED) or percentage number e.g. 50 (if PERCENTAGE)
  baseComponentCode?: string; // e.g. 'BASIC'
  isTaxable: boolean;
  isStatutory: boolean;
  statutoryType?: StatutoryType;
  status: 'ACTIVE' | 'INACTIVE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalaryStructureComponent {
  componentId: string;
  componentCode: string;
  name: string;
  type: SalaryComponentType;
  calculationType: ComponentCalculationType;
  amountOrPercentage: number;
  baseComponentCode?: string;
  isStatutory?: boolean;
}

export interface ISalaryStructure {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  name: string;
  code: string;
  description?: string;
  components: ISalaryStructureComponent[];
  version: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'ACTIVE' | 'INACTIVE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomSalaryComponent {
  name: string;
  code: string;
  type: SalaryComponentType;
  amount: number; // Integer minor units
}

export interface IEmployeeSalaryAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  employeeId: string;
  salaryStructureId: string;
  baseSalary: number; // Integer minor units
  grossSalary: number; // Integer minor units
  totalDeductions: number; // Integer minor units
  netSalary: number; // Integer minor units
  annualCTC: number; // Integer minor units
  currency: string;
  customComponents: ICustomSalaryComponent[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  version: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUPERSEDED';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 4. Overtime, Adjustments & Statutory Rules
// =========================================================================
export interface IOvertimeRecord {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  payrollPeriodId?: string;
  employeeId: string;
  date: Date;
  hours: number;
  hourlyRate: number; // Integer minor units
  totalAmount: number; // Integer minor units
  status: OvertimeStatus;
  reason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayrollAdjustment {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  payrollPeriodId: string;
  employeeId: string;
  type: PayrollAdjustmentType;
  amount: number; // Integer minor units
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStatutoryRule {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  statutoryType: StatutoryType;
  employeePercentage: number;
  employerPercentage: number;
  wageCap?: number; // Integer minor units
  minWageThreshold?: number; // Integer minor units
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 5. Payroll Periods, Runs & Items
// =========================================================================
export interface IPayrollPeriod {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  name: string; // e.g. "September 2026"
  month: number; // 1-12
  year: number;
  periodStart: Date;
  periodEnd: Date;
  workingDays: number;
  status: PayrollPeriodStatus;
  totalEmployees: number;
  totalGrossPay: number; // Integer minor units
  totalDeductions: number; // Integer minor units
  totalNetPay: number; // Integer minor units
  currency: string;
  approvedBy?: string;
  approvedAt?: Date;
  processedBy?: string;
  processedAt?: Date;
  lockedBy?: string;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayrollLineItem {
  code: string;
  name: string;
  amount: number; // Integer minor units
  isStatutory?: boolean;
}

export interface IPayrollItem {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  designationName?: string;
  salaryAssignmentId: string;
  workingDays: number;
  paidDays: number;
  unpaidDays: number;
  leaveDays: number;
  overtimeHours: number;
  overtimeAmount: number; // Integer minor units
  bonusAmount: number; // Integer minor units
  earnings: IPayrollLineItem[];
  deductions: IPayrollLineItem[];
  grossEarnings: number; // Integer minor units
  totalDeductions: number; // Integer minor units
  netPay: number; // Integer minor units
  currency: string;
  paymentStatus: PayrollPaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paymentDate?: Date;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Backward-compatibility alias
export type IPayroll = IPayrollItem;

// =========================================================================
// 6. Payslips
// =========================================================================
export interface IPayslip {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  payrollItemId: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  periodName: string;
  month: number;
  year: number;
  workingDays: number;
  paidDays: number;
  unpaidDays: number;
  currency: string;
  earnings: IPayrollLineItem[];
  deductions: IPayrollLineItem[];
  grossEarnings: number; // minor units
  totalDeductions: number; // minor units
  netPay: number; // minor units
  paymentStatus: PayrollPaymentStatus;
  paymentMethod: PaymentMethod;
  paymentDate?: Date;
  generatedAt: Date;
}

// =========================================================================
// 7. HR & Payroll Analytics / Reports
// =========================================================================
export interface IHrDashboardKPIs {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  onLeaveEmployees: number;
  recentJoinersCount: number;
  recentExitsCount: number;
  pendingLeaveRequestsCount: number;
}

export interface IPayrollDashboardKPIs {
  currentPeriodName?: string;
  currentPeriodStatus?: PayrollPeriodStatus;
  totalEmployeesCount: number;
  totalGrossPayroll: number; // minor units
  totalDeductions: number; // minor units
  totalNetPayroll: number; // minor units
  paidEmployeesCount: number;
  unpaidEmployeesCount: number;
  currency: string;
}

export interface IDepartmentPayrollSummary {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalGross: number; // minor units
  totalDeductions: number; // minor units
  totalNet: number; // minor units
}

export interface ILeaveUtilizationRecord {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  leaveTypeName: string;
  allocated: number;
  used: number;
  pending: number;
  available: number;
}
