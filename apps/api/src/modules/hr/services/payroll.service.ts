import { Types } from 'mongoose';
import {
  PayrollPeriod,
  PayrollItem,
  PayrollAdjustment,
  OvertimeRecord,
  StatutoryRule,
  EmployeeSalaryAssignment,
  Employee,
  LeaveApplication,
  StaffAttendance,
  AuditLog,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  Money,
  SalaryComponentType,
  ComponentCalculationType,
  PayrollPeriodStatus,
  PayrollPaymentStatus,
  PaymentMethod,
  AttendanceStatus,
  OvertimeStatus,
} from '@edusphere/common';

export class PayrollService {
  // =========================================================================
  // Payroll Periods
  // =========================================================================
  public async createPayrollPeriod(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    campusId: string | Types.ObjectId | undefined,
    input: any
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());
    const cId = campusId ? new Types.ObjectId(campusId.toString()) : undefined;

    const existing = await PayrollPeriod.findOne({
      tenantId: tId,
      schoolId: sId,
      campusId: cId,
      year: input.year,
      month: input.month,
    });

    if (existing) {
      throw new BadRequestError(`Payroll period for ${input.month}/${input.year} already exists.`);
    }

    return await PayrollPeriod.create({
      tenantId: tId,
      schoolId: sId,
      campusId: cId,
      name: input.name,
      month: input.month,
      year: input.year,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      workingDays: input.workingDays,
      status: PayrollPeriodStatus.OPEN,
    });
  }

  public async getPayrollPeriods(tenantId: string | Types.ObjectId, filters: any = {}, pagination: any = {}) {
    const query: any = { tenantId: new Types.ObjectId(tenantId.toString()) };
    if (filters.schoolId) query.schoolId = new Types.ObjectId(filters.schoolId);
    if (filters.campusId) query.campusId = new Types.ObjectId(filters.campusId);
    if (filters.year) query.year = Number(filters.year);
    if (filters.status) query.status = filters.status;

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PayrollPeriod.find(query)
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limit),
      PayrollPeriod.countDocuments(query),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getPayrollPeriodById(tenantId: string | Types.ObjectId, id: string | Types.ObjectId) {
    const period = await PayrollPeriod.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
    });

    if (!period) {
      throw new NotFoundError('Payroll period not found.');
    }

    return period;
  }

  // =========================================================================
  // Payroll Run Calculation
  // =========================================================================
  public async calculatePayrollRun(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    campusId: string | Types.ObjectId | undefined,
    periodId: string | Types.ObjectId,
    targetEmployeeIds?: string[],
    actorUserId?: string | Types.ObjectId
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());
    const pId = new Types.ObjectId(periodId.toString());

    const period = await PayrollPeriod.findOne({ _id: pId, tenantId: tId });
    if (!period) {
      throw new NotFoundError('Payroll period not found.');
    }

    if (period.status === PayrollPeriodStatus.LOCKED) {
      throw new BadRequestError('Cannot recalculate a locked payroll period.');
    }
    if (period.status === PayrollPeriodStatus.PROCESSED) {
      throw new BadRequestError('Cannot recalculate an already processed payroll period.');
    }

    // Identify candidate employees
    const empQuery: any = {
      tenantId: tId,
      schoolId: sId,
      isDeleted: false,
      employmentStatus: { $in: ['ACTIVE', 'PROBATION', 'ON_LEAVE'] },
    };
    if (targetEmployeeIds && targetEmployeeIds.length > 0) {
      empQuery._id = { $in: targetEmployeeIds.map((id) => new Types.ObjectId(id)) };
    }

    const employees = await Employee.find(empQuery)
      .populate('departmentId', 'name')
      .populate('designationId', 'name');

    const statutoryRules = await StatutoryRule.find({ tenantId: tId, schoolId: sId, status: 'ACTIVE' });

    let runTotalEmployees = 0;
    let runTotalGross = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;

    for (const emp of employees) {
      // 1. Get active salary assignment
      const assignment = await EmployeeSalaryAssignment.findOne({
        tenantId: tId,
        employeeId: emp._id,
        status: 'ACTIVE',
        isDeleted: false,
      }).populate('salaryStructureId');

      if (!assignment) {
        continue; // Skip employees without configured salary structure
      }

      // 2. Attendance & Leave evaluation
      const workingDays = period.workingDays;
      let unpaidDays = 0;
      let leaveDays = 0;

      // Count attendance & unpaid leaves
      const attendances = await StaffAttendance.find({
        tenantId: tId,
        staffId: emp._id,
        date: { $gte: period.periodStart, $lte: period.periodEnd },
      });

      for (const att of attendances) {
        if (att.status === AttendanceStatus.ABSENT) {
          unpaidDays += 1;
        } else if (att.status === AttendanceStatus.EXCUSED) {
          leaveDays += 1;
        }
      }

      const paidDays = Math.max(0, workingDays - unpaidDays);

      // 3. Daily pay calculation for unpaid leave deductions
      const dailyPayRate = workingDays > 0 ? Math.floor(assignment.baseSalary / workingDays) : 0;
      const unpaidDeductionAmount = Money.multiply(dailyPayRate, unpaidDays);

      // 4. Overtime records
      const overtimes = await OvertimeRecord.find({
        tenantId: tId,
        employeeId: emp._id,
        date: { $gte: period.periodStart, $lte: period.periodEnd },
        status: OvertimeStatus.APPROVED,
      });

      const totalOvertimeHours = overtimes.reduce((acc, curr) => acc + curr.hours, 0);
      const totalOvertimeAmount = overtimes.reduce((acc, curr) => Money.add(acc, curr.totalAmount), 0);

      // 5. Adjustments (bonuses, arrears, one-time deductions)
      const adjustments = await PayrollAdjustment.find({
        tenantId: tId,
        payrollPeriodId: pId,
        employeeId: emp._id,
        status: 'APPROVED',
      });

      let bonusAmount = 0;
      let otherDeductionsAmount = 0;

      for (const adj of adjustments) {
        if (['BONUS', 'INCENTIVE', 'ARREARS', 'REIMBURSEMENT'].includes(adj.type)) {
          bonusAmount = Money.add(bonusAmount, adj.amount);
        } else {
          otherDeductionsAmount = Money.add(otherDeductionsAmount, adj.amount);
        }
      }

      // 6. Build itemized earnings & deductions
      const earnings = [
        { code: 'BASIC', name: 'Basic Salary', amount: assignment.baseSalary },
      ];
      const deductions = [];

      // Add components from configured salary structure
      const structure = assignment.salaryStructureId as any;
      if (structure && structure.components) {
        for (const comp of structure.components) {
          let compAmount = 0;
          if (comp.calculationType === ComponentCalculationType.PERCENTAGE) {
            compAmount = Money.calculatePercentage(assignment.baseSalary, comp.amountOrPercentage);
          } else {
            compAmount = comp.amountOrPercentage;
          }

          if (comp.type === SalaryComponentType.EARNING) {
            earnings.push({ code: comp.componentCode || 'EARN', name: comp.name, amount: compAmount });
          } else if (comp.type === SalaryComponentType.DEDUCTION) {
            deductions.push({ code: comp.componentCode || 'DED', name: comp.name, amount: compAmount });
          }
        }
      }

      if (totalOvertimeAmount > 0) {
        earnings.push({ code: 'OVERTIME', name: 'Overtime Pay', amount: totalOvertimeAmount });
      }
      if (bonusAmount > 0) {
        earnings.push({ code: 'BONUS_ADJ', name: 'Bonus / Incentives', amount: bonusAmount });
      }

      // Add custom earnings & deductions
      if (assignment.customComponents) {
        for (const c of assignment.customComponents) {
          if (c.type === 'EARNING') {
            earnings.push({ code: c.code, name: c.name, amount: c.amount });
          } else if (c.type === 'DEDUCTION') {
            deductions.push({ code: c.code, name: c.name, amount: c.amount });
          }
        }
      }

      if (unpaidDeductionAmount > 0) {
        deductions.push({ code: 'LWP_DEDUCTION', name: 'Leave Without Pay', amount: unpaidDeductionAmount });
      }
      if (otherDeductionsAmount > 0) {
        deductions.push({ code: 'ADJ_DEDUCTION', name: 'Payroll Adjustments', amount: otherDeductionsAmount });
      }

      // Statutory deductions
      for (const rule of statutoryRules) {
        const statutoryAmount = Money.calculatePercentage(assignment.baseSalary, rule.employeePercentage);
        if (statutoryAmount > 0) {
          deductions.push({
            code: rule.code,
            name: rule.name,
            amount: statutoryAmount,
            isStatutory: true,
          });
        }
      }

      // Add custom deductions
      if (assignment.customComponents) {
        for (const c of assignment.customComponents) {
          if (c.type === 'DEDUCTION') {
            deductions.push({ code: c.code, name: c.name, amount: c.amount });
          }
        }
      }

      if (otherDeductionsAmount > 0) {
        deductions.push({ code: 'OTHER_DEDUCT', name: 'Adjustments Deduction', amount: otherDeductionsAmount });
      }

      // Totals
      const grossEarnings = earnings.reduce((acc, curr) => Money.add(acc, curr.amount), 0);
      const totalDeductions = deductions.reduce((acc, curr) => Money.add(acc, curr.amount), 0);
      const netPay = Math.max(0, Money.subtract(grossEarnings, totalDeductions));

      // Upsert PayrollItem snapshot
      await PayrollItem.findOneAndUpdate(
        {
          tenantId: tId,
          payrollPeriodId: pId,
          employeeId: emp._id,
        },
        {
          $set: {
            schoolId: sId,
            campusId: emp.campusId || period.campusId,
            employeeCode: emp.employeeId,
            employeeName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
            departmentName: (emp.departmentId as any)?.name || 'General',
            designationName: (emp.designationId as any)?.name || 'Staff',
            salaryAssignmentId: assignment._id,
            workingDays,
            paidDays,
            unpaidDays,
            leaveDays,
            overtimeHours: totalOvertimeHours,
            overtimeAmount: totalOvertimeAmount,
            bonusAmount,
            earnings,
            deductions,
            grossEarnings,
            totalDeductions,
            netPay,
            currency: assignment.currency || 'USD',
            paymentStatus: PayrollPaymentStatus.UNPAID,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            isLocked: false,
          },
        },
        { upsert: true, new: true }
      );

      runTotalEmployees += 1;
      runTotalGross = Money.add(runTotalGross, grossEarnings);
      runTotalDeductions = Money.add(runTotalDeductions, totalDeductions);
      runTotalNet = Money.add(runTotalNet, netPay);
    }

    // Update Period
    period.status = PayrollPeriodStatus.CALCULATED;
    period.totalEmployees = runTotalEmployees;
    period.totalGrossPay = runTotalGross;
    period.totalDeductions = runTotalDeductions;
    period.totalNetPay = runTotalNet;
    await period.save();

    if (actorUserId) {
      await AuditLog.create({
        tenantId: tId,
        schoolId: sId,
        userId: new Types.ObjectId(actorUserId.toString()),
        action: 'PAYROLL_CALCULATE',
        entity: 'PayrollPeriod',
        entityId: pId.toString(),
        after: {
          periodName: period.name,
          totalEmployees: runTotalEmployees,
          totalNetPay: runTotalNet,
        },
      });
    }

    return period;
  }

  // =========================================================================
  // Workflow Transitions: Review, Approve, Process, Lock
  // =========================================================================
  public async submitForReview(tenantId: string | Types.ObjectId, periodId: string | Types.ObjectId) {
    const period = await this.getPayrollPeriodById(tenantId, periodId);
    if (period.status !== PayrollPeriodStatus.CALCULATED) {
      throw new BadRequestError(`Cannot submit for review from status '${period.status}'. Must be CALCULATED.`);
    }

    period.status = PayrollPeriodStatus.UNDER_REVIEW;
    await period.save();
    return period;
  }

  public async approvePayrollPeriod(
    tenantId: string | Types.ObjectId,
    periodId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ) {
    const period = await this.getPayrollPeriodById(tenantId, periodId);
    if (![PayrollPeriodStatus.CALCULATED, PayrollPeriodStatus.UNDER_REVIEW].includes(period.status)) {
      throw new BadRequestError(`Cannot approve payroll from status '${period.status}'.`);
    }

    period.status = PayrollPeriodStatus.APPROVED;
    period.approvedBy = new Types.ObjectId(userId.toString());
    period.approvedAt = new Date();
    await period.save();
    return period;
  }

  public async processPayrollPeriod(
    tenantId: string | Types.ObjectId,
    periodId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    paymentMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER,
    transactionReference?: string
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const pId = new Types.ObjectId(periodId.toString());

    const period = await this.getPayrollPeriodById(tenantId, periodId);
    if (period.status !== PayrollPeriodStatus.APPROVED) {
      throw new BadRequestError(`Cannot process payroll from status '${period.status}'. Must be APPROVED first.`);
    }

    // Disburse all items
    await PayrollItem.updateMany(
      { tenantId: tId, payrollPeriodId: pId },
      {
        $set: {
          paymentStatus: PayrollPaymentStatus.PAID,
          paymentMethod,
          paymentReference: transactionReference || `PAY-${period.year}-${period.month}`,
          paymentDate: new Date(),
        },
      }
    );

    period.status = PayrollPeriodStatus.PROCESSED;
    period.processedBy = new Types.ObjectId(userId.toString());
    period.processedAt = new Date();
    await period.save();
    return period;
  }

  public async lockPayrollPeriod(
    tenantId: string | Types.ObjectId,
    periodId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const pId = new Types.ObjectId(periodId.toString());

    const period = await this.getPayrollPeriodById(tenantId, periodId);
    if (period.status === PayrollPeriodStatus.LOCKED) {
      throw new BadRequestError('Payroll period is already locked.');
    }

    // Seal all payroll items irrevocably
    await PayrollItem.updateMany(
      { tenantId: tId, payrollPeriodId: pId },
      { $set: { isLocked: true } }
    );

    period.status = PayrollPeriodStatus.LOCKED;
    period.lockedBy = new Types.ObjectId(userId.toString());
    period.lockedAt = new Date();
    await period.save();

    await AuditLog.create({
      tenantId: tId,
      schoolId: period.schoolId,
      userId: new Types.ObjectId(userId.toString()),
      action: 'PAYROLL_LOCK',
      entity: 'PayrollPeriod',
      entityId: pId.toString(),
      after: { lockedAt: period.lockedAt },
    });

    return period;
  }

  // =========================================================================
  // Adjustments & Overtime
  // =========================================================================
  public async addAdjustment(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId, input: any) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    return await PayrollAdjustment.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      payrollPeriodId: new Types.ObjectId(input.payrollPeriodId),
      employeeId: new Types.ObjectId(input.employeeId),
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      status: 'PENDING',
    });
  }

  public async reviewAdjustment(
    tenantId: string | Types.ObjectId,
    adjustmentId: string | Types.ObjectId,
    status: 'APPROVED' | 'REJECTED',
    reviewerUserId: string | Types.ObjectId
  ) {
    const adj = await PayrollAdjustment.findOne({
      _id: new Types.ObjectId(adjustmentId.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
    });

    if (!adj) throw new NotFoundError('Payroll adjustment not found.');

    adj.status = status;
    adj.approvedBy = new Types.ObjectId(reviewerUserId.toString());
    adj.approvedAt = new Date();
    await adj.save();
    return adj;
  }

  public async recordOvertime(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId, input: any) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());
    const totalAmount = Money.multiply(input.hourlyRate, input.hours);

    return await OvertimeRecord.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      payrollPeriodId: input.payrollPeriodId ? new Types.ObjectId(input.payrollPeriodId) : undefined,
      employeeId: new Types.ObjectId(input.employeeId),
      date: new Date(input.date),
      hours: input.hours,
      hourlyRate: input.hourlyRate,
      totalAmount,
      reason: input.reason,
      status: OvertimeStatus.PENDING,
    });
  }

  public async reviewOvertime(
    tenantId: string | Types.ObjectId,
    overtimeId: string | Types.ObjectId,
    status: OvertimeStatus.APPROVED | OvertimeStatus.REJECTED,
    reviewerUserId: string | Types.ObjectId
  ) {
    const ot = await OvertimeRecord.findOne({
      _id: new Types.ObjectId(overtimeId.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
    });

    if (!ot) throw new NotFoundError('Overtime record not found.');

    ot.status = status;
    ot.approvedBy = new Types.ObjectId(reviewerUserId.toString());
    ot.approvedAt = new Date();
    await ot.save();
    return ot;
  }

  public async listPayrollItems(tenantId: string | Types.ObjectId, periodId: string | Types.ObjectId, pagination: any = {}) {
    const query = {
      tenantId: new Types.ObjectId(tenantId.toString()),
      payrollPeriodId: new Types.ObjectId(periodId.toString()),
    };

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PayrollItem.find(query).sort({ employeeName: 1 }).skip(skip).limit(limit),
      PayrollItem.countDocuments(query),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const payrollService = new PayrollService();
