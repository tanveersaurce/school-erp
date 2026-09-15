import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  LeaveType,
  LeavePolicy,
  LeaveBalance,
  LeaveApplication,
  SalaryComponent,
  SalaryStructure,
  EmployeeSalaryAssignment,
  PayrollPeriod,
  PayrollItem,
} from '../src/models/hr.model.js';
import {
  SalaryComponentType,
  ComponentCalculationType,
  PayrollPeriodStatus,
  PayrollPaymentStatus,
  PaymentMethod,
  LeaveStatus,
  LeaveDurationType,
  LeaveAccrualMode,
} from '@edusphere/common';

describe('Phase 14: HR & Payroll Database Invariants & Constraints', () => {
  let mongod: MongoMemoryServer;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const employeeId1 = new Types.ObjectId();
  const employeeId2 = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await LeaveType.init();
    await LeavePolicy.init();
    await LeaveBalance.init();
    await LeaveApplication.init();
    await SalaryComponent.init();
    await SalaryStructure.init();
    await EmployeeSalaryAssignment.init();
    await PayrollPeriod.init();
    await PayrollItem.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('1. Enforces unique LeaveType code per tenant and school', async () => {
    await LeaveType.create({
      tenantId,
      schoolId,
      name: 'Casual Leave',
      code: 'CL',
      maximumDays: 12,
      isPaid: true,
      requiresApproval: true,
    });

    await expect(
      LeaveType.create({
        tenantId,
        schoolId,
        name: 'Duplicate Casual Leave',
        code: 'CL',
        maximumDays: 10,
        isPaid: true,
        requiresApproval: true,
      })
    ).rejects.toThrow();

    // Permitted in a different school
    const diffSchoolId = new Types.ObjectId();
    const otherSchoolLT = await LeaveType.create({
      tenantId,
      schoolId: diffSchoolId,
      name: 'Casual Leave Other School',
      code: 'CL',
      maximumDays: 12,
      isPaid: true,
      requiresApproval: true,
    });
    expect(otherSchoolLT).toBeDefined();
  });

  it('2. Enforces unique LeaveBalance per employee, leave type, and calendar year', async () => {
    const leaveTypeId = new Types.ObjectId();
    await LeaveBalance.create({
      tenantId,
      schoolId,
      employeeId: employeeId1,
      leaveTypeId,
      year: 2026,
      allocatedDays: 14,
      usedDays: 0,
      pendingDays: 0,
      availableDays: 14,
    });

    await expect(
      LeaveBalance.create({
        tenantId,
        schoolId,
        employeeId: employeeId1,
        leaveTypeId,
        year: 2026,
        allocatedDays: 10,
        usedDays: 0,
        pendingDays: 0,
        availableDays: 10,
      })
    ).rejects.toThrow();

    // Permitted for another employee or another year
    const nextYearBalance = await LeaveBalance.create({
      tenantId,
      schoolId,
      employeeId: employeeId1,
      leaveTypeId,
      year: 2027,
      allocatedDays: 14,
      usedDays: 0,
      pendingDays: 0,
      availableDays: 14,
    });
    expect(nextYearBalance).toBeDefined();
  });

  it('3. Enforces unique SalaryComponent code per tenant and school', async () => {
    await SalaryComponent.create({
      tenantId,
      schoolId,
      name: 'Basic Pay',
      code: 'BASIC',
      type: SalaryComponentType.EARNING,
      calculationType: ComponentCalculationType.FIXED,
      amountOrPercentage: 5000000, // 50,000 minor units
      isTaxable: true,
      isStatutory: false,
    });

    await expect(
      SalaryComponent.create({
        tenantId,
        schoolId,
        name: 'Basic Duplicate',
        code: 'BASIC',
        type: SalaryComponentType.EARNING,
        calculationType: ComponentCalculationType.FIXED,
        amountOrPercentage: 6000000,
        isTaxable: true,
        isStatutory: false,
      })
    ).rejects.toThrow();
  });

  it('4. Enforces unique versioned SalaryStructure code per tenant and school', async () => {
    const compId = new Types.ObjectId();
    await SalaryStructure.create({
      tenantId,
      schoolId,
      name: 'Teacher Pay Grade A',
      code: 'TCH_A',
      version: 1,
      effectiveFrom: new Date('2026-01-01'),
      components: [
        {
          componentId: compId,
          componentCode: 'BASIC',
          name: 'Basic Pay',
          type: SalaryComponentType.EARNING,
          calculationType: ComponentCalculationType.FIXED,
          amountOrPercentage: 4000000,
        },
      ],
    });

    // Duplicate version 1 fails
    await expect(
      SalaryStructure.create({
        tenantId,
        schoolId,
        name: 'Teacher Pay Grade A Duplicate v1',
        code: 'TCH_A',
        version: 1,
        effectiveFrom: new Date('2026-01-01'),
        components: [],
      })
    ).rejects.toThrow();

    // Version 2 succeeds
    const v2 = await SalaryStructure.create({
      tenantId,
      schoolId,
      name: 'Teacher Pay Grade A v2',
      code: 'TCH_A',
      version: 2,
      effectiveFrom: new Date('2026-07-01'),
      components: [],
    });
    expect(v2.version).toBe(2);
  });

  it('5. Enforces unique PayrollPeriod per month, year, campus, school, and tenant', async () => {
    await PayrollPeriod.create({
      tenantId,
      schoolId,
      campusId,
      name: 'September 2026',
      month: 9,
      year: 2026,
      periodStart: new Date('2026-09-01'),
      periodEnd: new Date('2026-09-30'),
      workingDays: 22,
      status: PayrollPeriodStatus.OPEN,
    });

    await expect(
      PayrollPeriod.create({
        tenantId,
        schoolId,
        campusId,
        name: 'September 2026 Duplicate',
        month: 9,
        year: 2026,
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-30'),
        workingDays: 22,
        status: PayrollPeriodStatus.DRAFT,
      })
    ).rejects.toThrow();
  });

  it('6. Enforces unique PayrollItem per employee and payroll period', async () => {
    const periodId = new Types.ObjectId();
    const assignmentId = new Types.ObjectId();

    await PayrollItem.create({
      tenantId,
      schoolId,
      payrollPeriodId: periodId,
      employeeId: employeeId1,
      employeeCode: 'EMP-001',
      employeeName: 'Jane Doe',
      salaryAssignmentId: assignmentId,
      workingDays: 22,
      paidDays: 22,
      unpaidDays: 0,
      grossEarnings: 5000000,
      totalDeductions: 500000,
      netPay: 4500000,
      paymentStatus: PayrollPaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      isLocked: false,
    });

    await expect(
      PayrollItem.create({
        tenantId,
        schoolId,
        payrollPeriodId: periodId,
        employeeId: employeeId1,
        employeeCode: 'EMP-001',
        employeeName: 'Jane Doe Duplicate',
        salaryAssignmentId: assignmentId,
        workingDays: 22,
        paidDays: 22,
        unpaidDays: 0,
        grossEarnings: 5000000,
        totalDeductions: 500000,
        netPay: 4500000,
        paymentStatus: PayrollPaymentStatus.UNPAID,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        isLocked: false,
      })
    ).rejects.toThrow();

    // Another employee in the same period is permitted
    const emp2Item = await PayrollItem.create({
      tenantId,
      schoolId,
      payrollPeriodId: periodId,
      employeeId: employeeId2,
      employeeCode: 'EMP-002',
      employeeName: 'John Smith',
      salaryAssignmentId: assignmentId,
      workingDays: 22,
      paidDays: 22,
      unpaidDays: 0,
      grossEarnings: 6000000,
      totalDeductions: 600000,
      netPay: 5400000,
      paymentStatus: PayrollPaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      isLocked: false,
    });
    expect(emp2Item).toBeDefined();
  });
});
