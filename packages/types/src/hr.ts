import { LeaveStatus, PaymentMethod } from '@edusphere/common';

export interface ISalaryComponent {
  name: string;
  amount: number;
}

export interface ISalaryStructure {
  id: string;
  tenantId: string;
  schoolId: string;
  employeeId: string; // Teacher or Staff ID
  employeeType: 'TEACHER' | 'STAFF';
  baseSalary: number;
  allowances: ISalaryComponent[];
  deductions: ISalaryComponent[];
  netSalary: number;
  effectiveFrom: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayroll {
  id: string;
  tenantId: string;
  schoolId: string;
  employeeId: string;
  employeeType: 'TEACHER' | 'STAFF';
  month: number;
  year: number;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  paymentMethod: PaymentMethod;
  paymentDate?: Date;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  transactionReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveType {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
  isPaid: boolean;
  carryForward: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveRequest {
  id: string;
  tenantId: string;
  schoolId: string;
  employeeId: string;
  employeeType: 'TEACHER' | 'STAFF';
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewRemarks?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
