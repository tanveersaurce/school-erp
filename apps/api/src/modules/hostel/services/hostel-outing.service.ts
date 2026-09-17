import { Types } from 'mongoose';
import {
  HostelOuting,
  HostelAllocation,
  IHostelOutingDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  ValidationError,
  HostelOutingStatus,
} from '@edusphere/common';

export class HostelOutingService {
  public static async requestOuting(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelOutingDoc> {
    const studentId = new Types.ObjectId(data.studentId.toString());
    const hostelId = new Types.ObjectId(data.hostelId.toString());

    // Verify student is allocated to this hostel
    const activeAlloc = await HostelAllocation.findOne({
      tenantId,
      studentId,
      hostelId,
      status: { $in: ['ALLOCATED', 'CHECKED_IN'] },
      isDeleted: false,
    });
    if (!activeAlloc) {
      throw new ValidationError('Student is not actively accommodated in this hostel.');
    }

    const startDateTime = new Date(data.startDateTime);
    const expectedReturnDateTime = new Date(data.expectedReturnDateTime);

    if (expectedReturnDateTime <= startDateTime) {
      throw new ValidationError('Expected return date/time must be after the outing start date/time.');
    }

    const outing = new HostelOuting({
      tenantId,
      schoolId: activeAlloc.schoolId,
      campusId: activeAlloc.campusId,
      studentId,
      hostelId,
      startDateTime,
      expectedReturnDateTime,
      reason: data.reason,
      destination: data.destination,
      status: HostelOutingStatus.REQUESTED,
      guardianApproval: {
        required: data.guardianApprovalRequired || false,
        approved: false,
      },
    });
    await outing.save();
    return outing;
  }

  public static async approveOuting(
    tenantId: Types.ObjectId,
    outingId: string | Types.ObjectId,
    approved: boolean,
    userId: Types.ObjectId,
    rejectionReason?: string,
    remarks?: string
  ): Promise<IHostelOutingDoc> {
    const outing = await HostelOuting.findOne({
      _id: new Types.ObjectId(outingId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!outing) {
      throw new NotFoundError('Outing request not found.');
    }

    if (outing.status !== HostelOutingStatus.REQUESTED) {
      throw new ValidationError(`Cannot approve/reject outing with status "${outing.status}".`);
    }

    if (approved) {
      outing.status = HostelOutingStatus.APPROVED;
      outing.approvedBy = userId;
      outing.approvalDate = new Date();
    } else {
      outing.status = HostelOutingStatus.REJECTED;
      outing.rejectionReason = rejectionReason || 'Rejected by administration';
      outing.approvedBy = userId;
      outing.approvalDate = new Date();
    }

    await outing.save();
    return outing;
  }

  public static async recordDeparture(
    tenantId: Types.ObjectId,
    outingId: string | Types.ObjectId,
    departureTime?: Date | string
  ): Promise<IHostelOutingDoc> {
    const outing = await HostelOuting.findOne({
      _id: new Types.ObjectId(outingId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!outing) {
      throw new NotFoundError('Outing record not found.');
    }

    if (outing.status !== HostelOutingStatus.APPROVED) {
      throw new ValidationError(`Cannot record departure for outing with status "${outing.status}". It must be APPROVED.`);
    }

    outing.status = HostelOutingStatus.OUT;
    outing.startDateTime = departureTime ? new Date(departureTime) : new Date();
    await outing.save();
    return outing;
  }

  public static async recordReturn(
    tenantId: Types.ObjectId,
    outingId: string | Types.ObjectId,
    returnTime?: Date | string
  ): Promise<IHostelOutingDoc> {
    const outing = await HostelOuting.findOne({
      _id: new Types.ObjectId(outingId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!outing) {
      throw new NotFoundError('Outing record not found.');
    }

    if (outing.status !== HostelOutingStatus.OUT && outing.status !== HostelOutingStatus.OVERDUE) {
      throw new ValidationError(`Cannot record return for outing with status "${outing.status}".`);
    }

    outing.status = HostelOutingStatus.RETURNED;
    outing.actualReturnDateTime = returnTime ? new Date(returnTime) : new Date();
    await outing.save();
    return outing;
  }

  public static async cancelOuting(
    tenantId: Types.ObjectId,
    outingId: string | Types.ObjectId
  ): Promise<IHostelOutingDoc> {
    const outing = await HostelOuting.findOne({
      _id: new Types.ObjectId(outingId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!outing) {
      throw new NotFoundError('Outing record not found.');
    }

    if (outing.status !== HostelOutingStatus.REQUESTED && outing.status !== HostelOutingStatus.APPROVED) {
      throw new ValidationError(`Cannot cancel outing with status "${outing.status}".`);
    }

    outing.status = HostelOutingStatus.CANCELLED;
    await outing.save();
    return outing;
  }

  public static async checkOverdueOutings(tenantId: Types.ObjectId): Promise<number> {
    const now = new Date();
    const result = await HostelOuting.updateMany(
      {
        tenantId,
        status: HostelOutingStatus.OUT,
        expectedReturnDateTime: { $lt: now },
        isDeleted: false,
      },
      {
        status: HostelOutingStatus.OVERDUE,
      }
    );
    return result.modifiedCount;
  }

  public static async getOutings(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelOutingDoc[]; total: number }> {
    // Automatically flag overdue
    await this.checkOverdueOutings(tenantId);

    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId.toString());
    if (filter.status) query.status = filter.status;

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      HostelOuting.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber phone')
        .populate('hostelId', 'name code')
        .populate('approvedBy', 'name email')
        .sort({ startDateTime: -1 })
        .skip(skip)
        .limit(limit),
      HostelOuting.countDocuments(query),
    ]);

    return { data, total };
  }

  public static async getOutingById(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<IHostelOutingDoc> {
    const outing = await HostelOuting.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    })
      .populate('studentId')
      .populate('hostelId')
      .populate('approvedBy');

    if (!outing) {
      throw new NotFoundError('Outing record not found.');
    }
    return outing;
  }
}
