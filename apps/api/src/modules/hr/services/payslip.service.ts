import { Types } from 'mongoose';
import { PayrollItem, PayrollPeriod, Employee, Tenant, School } from '@edusphere/database';
import { NotFoundError } from '@edusphere/common';
import { IPayslip } from '@edusphere/types';

export class PayslipService {
  /**
   * Retrieves an individual itemized payslip.
   */
  public async getPayslipByPayrollItemId(
    tenantId: string | Types.ObjectId,
    payrollItemId: string | Types.ObjectId
  ): Promise<IPayslip> {
    const tId = new Types.ObjectId(tenantId.toString());
    const item = await PayrollItem.findOne({
      _id: new Types.ObjectId(payrollItemId.toString()),
      tenantId: tId,
    }).populate('payrollPeriodId');

    if (!item) {
      throw new NotFoundError('Payroll record not found.');
    }

    const period = item.payrollPeriodId as any;
    const employee = await Employee.findById(item.employeeId);

    return {
      id: item._id.toString(),
      tenantId: item.tenantId.toString(),
      schoolId: item.schoolId.toString(),
      campusId: item.campusId?.toString(),
      payrollItemId: item._id.toString(),
      payrollPeriodId: period._id.toString(),
      employeeId: item.employeeId.toString(),
      employeeCode: item.employeeCode,
      employeeName: item.employeeName,
      designation: item.designationName,
      department: item.departmentName,
      joiningDate: employee?.joiningDate ? employee.joiningDate.toISOString() : undefined,
      periodName: period?.name || `${item.workingDays} days`,
      month: period?.month || 1,
      year: period?.year || 2026,
      workingDays: item.workingDays,
      paidDays: item.paidDays,
      unpaidDays: item.unpaidDays,
      currency: item.currency,
      earnings: item.earnings,
      deductions: item.deductions,
      grossEarnings: item.grossEarnings,
      totalDeductions: item.totalDeductions,
      netPay: item.netPay,
      paymentStatus: item.paymentStatus,
      paymentMethod: item.paymentMethod,
      paymentDate: item.paymentDate,
      generatedAt: item.updatedAt || new Date(),
    };
  }

  /**
   * Self-service retrieval of an employee's own payslips.
   */
  public async getMyPayslips(
    tenantId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    pagination: any = {}
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const uId = new Types.ObjectId(userId.toString());

    const employee = await Employee.findOne({ tenantId: tId, userId: uId, isDeleted: false });
    if (!employee) {
      return { items: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(pagination.limit) || 12));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PayrollItem.find({ tenantId: tId, employeeId: employee._id })
        .populate('payrollPeriodId', 'name month year status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PayrollItem.countDocuments({ tenantId: tId, employeeId: employee._id }),
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
}

export const payslipService = new PayslipService();
