import { Types } from 'mongoose';
import {
  LeaveType,
  LeavePolicy,
  LeaveBalance,
  LeaveApplication,
  StaffAttendance,
  Employee,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  LeaveStatus,
  LeaveDurationType,
  AttendanceStatus,
} from '@edusphere/common';

export class LeaveService {
  // =========================================================================
  // Leave Types
  // =========================================================================
  public async createLeaveType(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId, input: any) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    const existing = await LeaveType.findOne({
      tenantId: tId,
      schoolId: sId,
      code: input.code.toUpperCase(),
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Leave type with code '${input.code}' already exists.`);
    }

    return await LeaveType.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      isPaid: input.isPaid ?? true,
      requiresApproval: input.requiresApproval ?? true,
      requiresDocument: input.requiresDocument ?? false,
      maximumDays: input.maximumDays,
      minimumNoticeDays: input.minimumNoticeDays ?? 0,
      carryForward: input.carryForward ?? false,
      maxCarryForwardDays: input.maxCarryForwardDays ?? 0,
      status: input.status || 'ACTIVE',
    });
  }

  public async getLeaveTypes(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId) {
    return await LeaveType.find({
      tenantId: new Types.ObjectId(tenantId.toString()),
      schoolId: new Types.ObjectId(schoolId.toString()),
      isDeleted: false,
    }).sort({ name: 1 });
  }

  public async updateLeaveType(tenantId: string | Types.ObjectId, id: string | Types.ObjectId, input: any) {
    const leaveType = await LeaveType.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!leaveType) {
      throw new NotFoundError('Leave type not found.');
    }

    Object.assign(leaveType, input);
    await leaveType.save();
    return leaveType;
  }

  public async deleteLeaveType(tenantId: string | Types.ObjectId, id: string | Types.ObjectId) {
    const leaveType = await LeaveType.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!leaveType) {
      throw new NotFoundError('Leave type not found.');
    }

    leaveType.isDeleted = true;
    await leaveType.save();
    return { success: true, message: 'Leave type archived successfully.' };
  }

  // =========================================================================
  // Leave Policies
  // =========================================================================
  public async createLeavePolicy(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId, input: any) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    return await LeavePolicy.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      leaveTypeId: new Types.ObjectId(input.leaveTypeId),
      annualAllocation: input.annualAllocation,
      accrualMode: input.accrualMode,
      carryForward: input.carryForward ?? false,
      maxCarryForwardDays: input.maxCarryForwardDays ?? 0,
      allowHalfDay: input.allowHalfDay ?? true,
      probationAllowed: input.probationAllowed ?? false,
      status: input.status || 'ACTIVE',
    });
  }

  public async getLeavePolicies(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId) {
    return await LeavePolicy.find({
      tenantId: new Types.ObjectId(tenantId.toString()),
      schoolId: new Types.ObjectId(schoolId.toString()),
      isDeleted: false,
    })
      .populate('leaveTypeId', 'name code isPaid')
      .sort({ name: 1 });
  }

  public async updateLeavePolicy(tenantId: string | Types.ObjectId, id: string | Types.ObjectId, input: any) {
    const policy = await LeavePolicy.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!policy) {
      throw new NotFoundError('Leave policy not found.');
    }

    Object.assign(policy, input);
    await policy.save();
    return policy;
  }

  // =========================================================================
  // Leave Balances
  // =========================================================================
  public async getEmployeeBalance(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    year: number
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());
    const empId = new Types.ObjectId(employeeId.toString());

    let balances = await LeaveBalance.find({
      tenantId: tId,
      employeeId: empId,
      year,
    }).populate('leaveTypeId', 'name code isPaid maximumDays');

    // Auto-seed balances if none exist for the employee in this year
    if (balances.length === 0) {
      const leaveTypes = await LeaveType.find({ tenantId: tId, schoolId: sId, isDeleted: false, status: 'ACTIVE' });
      for (const lt of leaveTypes) {
        await LeaveBalance.create({
          tenantId: tId,
          schoolId: sId,
          employeeId: empId,
          leaveTypeId: lt._id,
          year,
          allocatedDays: lt.maximumDays,
          usedDays: 0,
          pendingDays: 0,
          availableDays: lt.maximumDays,
          carriedForwardDays: 0,
        });
      }

      balances = await LeaveBalance.find({
        tenantId: tId,
        employeeId: empId,
        year,
      }).populate('leaveTypeId', 'name code isPaid maximumDays');
    }

    return balances;
  }

  // =========================================================================
  // Leave Applications & Workflow
  // =========================================================================
  public async applyLeave(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    campusId: string | Types.ObjectId | undefined,
    employeeId: string | Types.ObjectId,
    input: any
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());
    const empId = new Types.ObjectId(employeeId.toString());
    const ltId = new Types.ObjectId(input.leaveTypeId);

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (startDate > endDate) {
      throw new BadRequestError('Start date cannot be after end date.');
    }

    // Calculate duration
    let totalDays = 1;
    if (input.durationType === LeaveDurationType.HALF_DAY) {
      totalDays = 0.5;
    } else {
      const diffMs = endDate.getTime() - startDate.getTime();
      totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    }

    // Check for overlapping leaves
    const overlap = await LeaveApplication.findOne({
      tenantId: tId,
      employeeId: empId,
      status: { $in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    if (overlap) {
      throw new BadRequestError('An overlapping leave application already exists for these dates.');
    }

    const currentYear = startDate.getFullYear();
    const leaveType = await LeaveType.findOne({ _id: ltId, tenantId: tId, isDeleted: false });
    if (!leaveType) {
      throw new NotFoundError('Leave type not found.');
    }

    // Check balance if paid/capped
    if (leaveType.isPaid && leaveType.maximumDays > 0) {
      const balance = await LeaveBalance.findOne({
        tenantId: tId,
        employeeId: empId,
        leaveTypeId: ltId,
        year: currentYear,
      });

      if (balance && (balance.availableDays - balance.pendingDays) < totalDays) {
        throw new BadRequestError(
          `Insufficient leave balance. Available: ${balance.availableDays - balance.pendingDays}, Requested: ${totalDays}`
        );
      }

      if (balance) {
        balance.pendingDays += totalDays;
        await balance.save();
      }
    }

    return await LeaveApplication.create({
      tenantId: tId,
      schoolId: sId,
      campusId: campusId ? new Types.ObjectId(campusId.toString()) : undefined,
      employeeId: empId,
      leaveTypeId: ltId,
      startDate,
      endDate,
      totalDays,
      durationType: input.durationType || LeaveDurationType.FULL_DAY,
      halfDayPeriod: input.halfDayPeriod,
      reason: input.reason,
      attachmentFileRecordId: input.attachmentFileRecordId
        ? new Types.ObjectId(input.attachmentFileRecordId)
        : undefined,
      attachmentUrl: input.attachmentUrl,
      status: LeaveStatus.PENDING,
      appliedAt: new Date(),
    });
  }

  public async reviewLeave(
    tenantId: string | Types.ObjectId,
    applicationId: string | Types.ObjectId,
    status: LeaveStatus.APPROVED | LeaveStatus.REJECTED,
    reviewerUserId: string | Types.ObjectId,
    remarks?: string
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const appId = new Types.ObjectId(applicationId.toString());

    const app = await LeaveApplication.findOne({ _id: appId, tenantId: tId });
    if (!app) {
      throw new NotFoundError('Leave application not found.');
    }

    if (app.status !== LeaveStatus.PENDING) {
      throw new BadRequestError(`Cannot review leave with status '${app.status}'.`);
    }

    const currentYear = app.startDate.getFullYear();
    const balance = await LeaveBalance.findOne({
      tenantId: tId,
      employeeId: app.employeeId,
      leaveTypeId: app.leaveTypeId,
      year: currentYear,
    });

    if (status === LeaveStatus.APPROVED) {
      app.status = LeaveStatus.APPROVED;
      app.reviewedBy = new Types.ObjectId(reviewerUserId.toString());
      app.reviewedAt = new Date();
      if (remarks) app.rejectionReason = remarks;

      if (balance) {
        balance.pendingDays = Math.max(0, balance.pendingDays - app.totalDays);
        balance.usedDays += app.totalDays;
        balance.availableDays = Math.max(0, balance.allocatedDays + balance.carriedForwardDays - balance.usedDays);
        await balance.save();
      }

      // Sync with StaffAttendance
      const employee = await Employee.findById(app.employeeId);
      if (employee) {
        const curDate = new Date(app.startDate);
        while (curDate <= app.endDate) {
          const attendanceDate = new Date(curDate);
          attendanceDate.setUTCHours(0, 0, 0, 0);

          await StaffAttendance.findOneAndUpdate(
            {
              tenantId: tId,
              staffId: employee._id,
              date: attendanceDate,
            },
            {
              $setOnInsert: {
                schoolId: app.schoolId,
                campusId: app.campusId,
                status: AttendanceStatus.EXCUSED,
                remarks: `On approved leave: ${app.reason}`,
              },
            },
            { upsert: true, new: true }
          );

          curDate.setUTCDate(curDate.getUTCDate() + 1);
        }
      }
    } else if (status === LeaveStatus.REJECTED) {
      app.status = LeaveStatus.REJECTED;
      app.reviewedBy = new Types.ObjectId(reviewerUserId.toString());
      app.reviewedAt = new Date();
      if (remarks) app.rejectionReason = remarks;

      if (balance) {
        balance.pendingDays = Math.max(0, balance.pendingDays - app.totalDays);
        await balance.save();
      }
    }

    await app.save();
    return app;
  }

  public async cancelLeave(
    tenantId: string | Types.ObjectId,
    applicationId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const appId = new Types.ObjectId(applicationId.toString());
    const empId = new Types.ObjectId(employeeId.toString());

    const app = await LeaveApplication.findOne({ _id: appId, tenantId: tId, employeeId: empId });
    if (!app) {
      throw new NotFoundError('Leave application not found.');
    }

    if (app.status !== LeaveStatus.PENDING) {
      throw new BadRequestError('Only pending leave applications can be cancelled.');
    }

    app.status = LeaveStatus.CANCELLED;
    await app.save();

    const currentYear = app.startDate.getFullYear();
    const balance = await LeaveBalance.findOne({
      tenantId: tId,
      employeeId: empId,
      leaveTypeId: app.leaveTypeId,
      year: currentYear,
    });

    if (balance) {
      balance.pendingDays = Math.max(0, balance.pendingDays - app.totalDays);
      await balance.save();
    }

    return app;
  }

  public async listLeaveApplications(tenantId: string | Types.ObjectId, filters: any = {}, pagination: any = {}) {
    const query: any = { tenantId: new Types.ObjectId(tenantId.toString()) };

    if (filters.schoolId) query.schoolId = new Types.ObjectId(filters.schoolId);
    if (filters.employeeId) query.employeeId = new Types.ObjectId(filters.employeeId);
    if (filters.leaveTypeId) query.leaveTypeId = new Types.ObjectId(filters.leaveTypeId);
    if (filters.status) query.status = filters.status;
    if (filters.startDate) query.startDate = { $gte: new Date(filters.startDate) };
    if (filters.endDate) query.endDate = { $lte: new Date(filters.endDate) };

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      LeaveApplication.find(query)
        .populate('employeeId', 'firstName lastName employeeId displayName departmentId designationId')
        .populate('leaveTypeId', 'name code isPaid')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit),
      LeaveApplication.countDocuments(query),
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

export const leaveService = new LeaveService();
