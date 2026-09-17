import { Types } from 'mongoose';
import {
  HostelFeeAssignment,
  FeeInvoice,
  Student,
  Hostel,
  IHostelFeeAssignmentDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  Money,
  FeeCategoryType,
  InvoiceStatus,
} from '@edusphere/common';

export class HostelFeeService {
  /**
   * Assigns hostel fees to a student using exact zero-floating point arithmetic via Money.
   */
  public static async createFeeAssignment(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelFeeAssignmentDoc> {
    const studentId = new Types.ObjectId(data.studentId.toString());
    const academicYearId = new Types.ObjectId(data.academicYearId.toString());
    const hostelId = new Types.ObjectId(data.hostelId.toString());

    // 1. Verify student exists
    const student = await Student.findOne({ _id: studentId, tenantId, isDeleted: false });
    if (!student) {
      throw new NotFoundError('Student not found.');
    }

    // 2. Exact Money calculations
    const baseAmount = data.baseAmountMinorUnits || 0;
    const messFee = data.messFeeMinorUnits || 0;
    const cautionDeposit = data.cautionDepositMinorUnits || 0;
    const totalAmount = Money.add(baseAmount, messFee, cautionDeposit);

    const schoolId = data.schoolId || student.schoolId;
    const campusId = data.campusId || student.campusId;

    const feeAssignment = new HostelFeeAssignment({
      ...data,
      tenantId,
      schoolId,
      campusId,
      studentId,
      academicYearId,
      hostelId,
      roomId: data.roomId ? new Types.ObjectId(data.roomId.toString()) : undefined,
      baseAmountMinorUnits: baseAmount,
      messFeeMinorUnits: messFee,
      cautionDepositMinorUnits: cautionDeposit,
      totalAmountMinorUnits: totalAmount,
      billingStatus: 'PENDING',
      effectiveFrom: data.effectiveFrom || new Date(),
    });
    await feeAssignment.save();
    return feeAssignment;
  }

  /**
   * Generates a Phase 13 FeeInvoice for the hostel fee assignment.
   */
  public static async generateInvoice(
    tenantId: Types.ObjectId,
    feeAssignmentId: string | Types.ObjectId
  ): Promise<IHostelFeeAssignmentDoc> {
    const feeAssignment = await HostelFeeAssignment.findOne({
      _id: new Types.ObjectId(feeAssignmentId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!feeAssignment) {
      throw new NotFoundError('Hostel fee assignment not found.');
    }

    if (feeAssignment.billingStatus === 'INVOICED' && feeAssignment.invoiceId) {
      throw new ConflictError('Invoice has already been generated for this assignment.');
    }

    const hostel = await Hostel.findById(feeAssignment.hostelId);
    const hostelName = hostel ? hostel.name : 'Hostel';

    const invoiceNumber = `INV-HSTL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days due date

    const student = await Student.findById(feeAssignment.studentId);
    const classId = (student as any)?.classId || (student as any)?.currentClassId || new Types.ObjectId();

    // Create line items with exact integer minor units
    const items = [
      {
        description: `Hostel Accommodation Fee - ${hostelName} (${feeAssignment.billingFrequency})`,
        amount: feeAssignment.baseAmountMinorUnits,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: feeAssignment.baseAmountMinorUnits,
      },
    ];

    if (feeAssignment.messFeeMinorUnits > 0) {
      items.push({
        description: `Hostel Mess / Dining Fee - ${hostelName}`,
        amount: feeAssignment.messFeeMinorUnits,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: feeAssignment.messFeeMinorUnits,
      });
    }

    if (feeAssignment.cautionDepositMinorUnits > 0) {
      items.push({
        description: `Hostel Caution Deposit (Refundable) - ${hostelName}`,
        amount: feeAssignment.cautionDepositMinorUnits,
        discountAmount: 0,
        taxAmount: 0,
        netAmount: feeAssignment.cautionDepositMinorUnits,
      });
    }

    const feeInvoice = new FeeInvoice({
      tenantId,
      schoolId: feeAssignment.schoolId,
      campusId: feeAssignment.campusId,
      studentId: feeAssignment.studentId,
      academicYearId: feeAssignment.academicYearId,
      classId,
      invoiceNumber,
      issueDate: new Date(),
      dueDate,
      status: InvoiceStatus.ISSUED,
      lineItems: items,
      subTotal: feeAssignment.totalAmountMinorUnits,
      totalDiscount: 0,
      taxAmount: 0,
      lateFeeAmount: 0,
      totalAmount: feeAssignment.totalAmountMinorUnits,
      paidAmount: 0,
      balanceAmount: feeAssignment.totalAmountMinorUnits,
    });
    await feeInvoice.save();

    feeAssignment.invoiceId = feeInvoice._id as Types.ObjectId;
    feeAssignment.billingStatus = 'INVOICED';
    await feeAssignment.save();

    return feeAssignment;
  }

  public static async getFeeAssignments(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelFeeAssignmentDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId.toString());
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.billingStatus) query.billingStatus = filter.billingStatus;

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      HostelFeeAssignment.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('hostelId', 'name code')
        .populate('invoiceId')
        .sort({ effectiveFrom: -1 })
        .skip(skip)
        .limit(limit),
      HostelFeeAssignment.countDocuments(query),
    ]);

    return { data, total };
  }
}
