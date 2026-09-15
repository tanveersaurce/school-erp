import { Types } from 'mongoose';
import {
  Employee,
  LeaveApplication,
  LeaveBalance,
  PayrollPeriod,
  PayrollItem,
} from '@edusphere/database';
import {
  IHrDashboardKPIs,
  IPayrollDashboardKPIs,
  IDepartmentPayrollSummary,
  ILeaveUtilizationRecord,
} from '@edusphere/types';
import { LeaveStatus, EmploymentStatus, PayrollPaymentStatus } from '@edusphere/common';

export class HrAnalyticsService {
  /**
   * Retrieves high-level executive KPIs for the HR Dashboard.
   */
  public async getHrDashboardKPIs(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    campusId?: string | Types.ObjectId
  ): Promise<IHrDashboardKPIs> {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    const baseQuery: any = { tenantId: tId, schoolId: sId, isDeleted: false };
    if (campusId) baseQuery.campusId = new Types.ObjectId(campusId.toString());

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalEmployees,
      activeEmployees,
      probationEmployees,
      onLeaveEmployees,
      recentJoinersCount,
      recentExitsCount,
      pendingLeaveRequestsCount,
    ] = await Promise.all([
      Employee.countDocuments(baseQuery),
      Employee.countDocuments({ ...baseQuery, employmentStatus: EmploymentStatus.ACTIVE }),
      Employee.countDocuments({ ...baseQuery, employmentStatus: EmploymentStatus.PROBATION }),
      Employee.countDocuments({ ...baseQuery, employmentStatus: EmploymentStatus.ON_LEAVE }),
      Employee.countDocuments({ ...baseQuery, joiningDate: { $gte: thirtyDaysAgo } }),
      Employee.countDocuments({
        ...baseQuery,
        $or: [
          { terminationDate: { $gte: thirtyDaysAgo } },
          { resignationDate: { $gte: thirtyDaysAgo } },
        ],
      }),
      LeaveApplication.countDocuments({ tenantId: tId, status: LeaveStatus.PENDING }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      probationEmployees,
      onLeaveEmployees,
      recentJoinersCount,
      recentExitsCount,
      pendingLeaveRequestsCount,
    };
  }

  /**
   * Retrieves high-level executive KPIs for the Payroll Dashboard.
   */
  public async getPayrollDashboardKPIs(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    campusId?: string | Types.ObjectId
  ): Promise<IPayrollDashboardKPIs> {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    const query: any = { tenantId: tId, schoolId: sId };
    if (campusId) query.campusId = new Types.ObjectId(campusId.toString());

    // Get most recent period
    const latestPeriod = await PayrollPeriod.findOne(query).sort({ year: -1, month: -1 });

    if (!latestPeriod) {
      return {
        totalEmployeesCount: 0,
        totalGrossPayroll: 0,
        totalDeductions: 0,
        totalNetPayroll: 0,
        paidEmployeesCount: 0,
        unpaidEmployeesCount: 0,
        currency: 'USD',
      };
    }

    const [paidCount, unpaidCount] = await Promise.all([
      PayrollItem.countDocuments({
        tenantId: tId,
        payrollPeriodId: latestPeriod._id,
        paymentStatus: PayrollPaymentStatus.PAID,
      }),
      PayrollItem.countDocuments({
        tenantId: tId,
        payrollPeriodId: latestPeriod._id,
        paymentStatus: PayrollPaymentStatus.UNPAID,
      }),
    ]);

    return {
      currentPeriodName: latestPeriod.name,
      currentPeriodStatus: latestPeriod.status,
      totalEmployeesCount: latestPeriod.totalEmployees,
      totalGrossPayroll: latestPeriod.totalGrossPay,
      totalDeductions: latestPeriod.totalDeductions,
      totalNetPayroll: latestPeriod.totalNetPay,
      paidEmployeesCount: paidCount,
      unpaidEmployeesCount: unpaidCount,
      currency: latestPeriod.currency || 'USD',
    };
  }

  /**
   * Generates department-wise payroll summary report for a given period.
   */
  public async getDepartmentPayrollReport(
    tenantId: string | Types.ObjectId,
    periodId: string | Types.ObjectId
  ): Promise<IDepartmentPayrollSummary[]> {
    const tId = new Types.ObjectId(tenantId.toString());
    const pId = new Types.ObjectId(periodId.toString());

    const results = await PayrollItem.aggregate([
      { $match: { tenantId: tId, payrollPeriodId: pId } },
      {
        $group: {
          _id: '$departmentName',
          employeeCount: { $sum: 1 },
          totalGross: { $sum: '$grossEarnings' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNet: { $sum: '$netPay' },
        },
      },
      {
        $project: {
          departmentId: '$_id',
          departmentName: '$_id',
          employeeCount: 1,
          totalGross: 1,
          totalDeductions: 1,
          totalNet: 1,
        },
      },
      { $sort: { totalNet: -1 } },
    ]);

    return results;
  }

  /**
   * Generates leave balance utilization report across employees for a given year.
   */
  public async getLeaveUtilizationReport(
    tenantId: string | Types.ObjectId,
    year: number
  ): Promise<ILeaveUtilizationRecord[]> {
    const tId = new Types.ObjectId(tenantId.toString());

    const balances = await LeaveBalance.find({ tenantId: tId, year })
      .populate('employeeId', 'firstName lastName employeeId displayName')
      .populate('leaveTypeId', 'name code')
      .limit(200);

    return balances.map((b: any) => ({
      employeeId: b.employeeId?._id?.toString() || '',
      employeeName: b.employeeId?.displayName || `${b.employeeId?.firstName} ${b.employeeId?.lastName}`,
      employeeCode: b.employeeId?.employeeId || '',
      leaveTypeName: b.leaveTypeId?.name || 'Leave',
      allocated: b.allocatedDays,
      used: b.usedDays,
      pending: b.pendingDays,
      available: b.availableDays,
    }));
  }
}

export const hrAnalyticsService = new HrAnalyticsService();
