import { Types } from 'mongoose';
import {
  TransportFeeAssignment,
  StudentTransportAssignment,
  Student,
  FeeInvoice,
  FeeCategory,
} from '@edusphere/database';
import {
  BadRequestError,
  NotFoundError,
  TransportFeeFrequency,
  TransportFeeBillingStatus,
  InvoiceStatus,
  FeeCategoryType,
  Money,
} from '@edusphere/common';

export class TransportFeeService {
  // =========================================================================
  // 1. Transport Fee Assignments
  // =========================================================================
  public static async createFeeAssignment(
    tenantId: string,
    schoolId: string,
    data: any
  ) {
    const studentOid = new Types.ObjectId(data.studentId);
    const transportAssignmentOid = new Types.ObjectId(data.transportAssignmentId);

    const [student, transportAssignment] = await Promise.all([
      Student.findOne({ _id: studentOid, tenantId: new Types.ObjectId(tenantId), isDeleted: false }),
      StudentTransportAssignment.findOne({ _id: transportAssignmentOid, tenantId: new Types.ObjectId(tenantId), isDeleted: false }),
    ]);

    if (!student) {
      throw new NotFoundError('Student not found.');
    }
    if (!transportAssignment) {
      throw new NotFoundError('Student transport assignment not found.');
    }

    const baseFare = data.baseFareMinorUnits !== undefined
      ? Math.round(data.baseFareMinorUnits)
      : (transportAssignment.fareMinorUnits || 0);
    const discount = data.discountMinorUnits !== undefined ? Math.round(data.discountMinorUnits) : 0;
    const finalFare = Money.subtract(baseFare || 0, discount);

    const feeAssignment = await TransportFeeAssignment.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId || student.campusId),
      studentId: studentOid,
      transportAssignmentId: transportAssignmentOid,
      academicYearId: new Types.ObjectId(data.academicYearId || (student as any).currentAcademicYearId || (student as any).academicYearId),
      frequency: data.frequency || TransportFeeFrequency.MONTHLY,
      baseFareMinorUnits: baseFare,
      discountMinorUnits: discount,
      finalFareMinorUnits: Math.max(0, finalFare),
      billingStatus: TransportFeeBillingStatus.PENDING,
    });

    return feeAssignment;
  }

  public static async getFeeAssignments(
    tenantId: string,
    schoolId: string,
    filters: {
      studentId?: string;
      billingStatus?: TransportFeeBillingStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (filters.studentId) query.studentId = new Types.ObjectId(filters.studentId);
    if (filters.billingStatus) query.billingStatus = filters.billingStatus;

    const [items, total] = await Promise.all([
      TransportFeeAssignment.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('transportAssignmentId')
        .populate('invoiceId', 'invoiceNumber totalAmount balanceAmount status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TransportFeeAssignment.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // 2. Invoice Generation (Phase 13 Integration)
  // =========================================================================
  public static async generateInvoice(
    tenantId: string,
    schoolId: string,
    feeAssignmentId: string,
    dueDate?: string
  ) {
    const feeAssignment = await TransportFeeAssignment.findOne({
      _id: new Types.ObjectId(feeAssignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).populate('studentId');

    if (!feeAssignment) {
      throw new NotFoundError('Transport fee assignment not found.');
    }

    if (feeAssignment.billingStatus === TransportFeeBillingStatus.INVOICED) {
      throw new BadRequestError('Fee assignment has already been invoiced.');
    }

    const student: any = feeAssignment.studentId;
    if (!student) {
      throw new NotFoundError('Student associated with fee assignment not found.');
    }

    // Find or create TRANSPORT fee category
    let transportCategory = await FeeCategory.findOne({
      tenantId: new Types.ObjectId(tenantId),
      type: FeeCategoryType.TRANSPORT,
      isDeleted: false,
    });

    const now = new Date();
    const invoiceDue = dueDate ? new Date(dueDate) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days default
    const invoiceNumber = `INV-TRP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const amount = feeAssignment.baseFareMinorUnits;
    const discountAmount = feeAssignment.discountMinorUnits || 0;
    const netAmount = feeAssignment.finalFareMinorUnits;

    const lineItem = {
      feeCategoryId: transportCategory?._id,
      description: 'Transport Fee Service',
      amount,
      discountAmount,
      taxAmount: 0,
      netAmount,
    };

    const invoice = await FeeInvoice.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: feeAssignment.campusId,
      invoiceNumber,
      studentId: student._id,
      academicYearId: feeAssignment.academicYearId,
      classId: (student as any).currentClassId || (student as any).classId || new Types.ObjectId(),
      dueDate: invoiceDue,
      issueDate: now,
      lineItems: [lineItem],
      subTotal: amount,
      totalDiscount: discountAmount,
      taxAmount: 0,
      lateFeeAmount: 0,
      totalAmount: netAmount,
      paidAmount: 0,
      balanceAmount: netAmount,
      status: InvoiceStatus.ISSUED,
    });

    // Update assignment
    feeAssignment.billingStatus = TransportFeeBillingStatus.INVOICED;
    feeAssignment.invoiceId = invoice._id as any;
    await feeAssignment.save();

    return {
      feeAssignment,
      invoice,
    };
  }
}
