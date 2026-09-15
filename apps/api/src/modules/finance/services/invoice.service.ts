import { Types } from 'mongoose';
import {
  FeeInvoice,
  FeeStructure,
  StudentFeeAssignment,
  Student,
  School,
  Counter,
  StudentEnrollment,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  Money,
  InvoiceStatus,
  DiscountType,
} from '@edusphere/common';
import type { IInvoiceLineItem } from '@edusphere/types';

export class InvoiceService {
  /**
   * Generates a collision-safe sequential invoice number (e.g. INV-2026-00001).
   */
  public static async generateInvoiceNumber(
    tenantId: string,
    schoolId: string,
    year = new Date().getFullYear()
  ): Promise<string> {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const school = await School.findOne({
      _id: schoolOid,
      tenantId: tenantOid,
      isDeleted: false,
    }).lean();

    const prefix = school?.settings?.numbering?.invoicePrefix || 'INV';

    const counter = await Counter.findOneAndUpdate(
      {
        tenantId: tenantOid,
        schoolId: schoolOid,
        sequenceType: `INVOICE_NUMBER_${year}`,
      },
      { $inc: { currentValue: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const val = counter?.currentValue ?? 1;
    return `${prefix}-${year}-${String(val).padStart(5, '0')}`;
  }

  /**
   * Builds invoice line items and calculates deterministic integer amounts.
   */
  public static buildLineItems(
    structure: any,
    assignment?: any
  ): {
    lineItems: IInvoiceLineItem[];
    subTotal: number;
    totalDiscount: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const lineItems: IInvoiceLineItem[] = [];
    let subTotal = 0;
    let totalDiscount = 0;
    let taxAmount = 0;

    const discounts = assignment?.customDiscounts || [];

    for (const head of structure.heads) {
      const headAmount = Math.round(head.amount || 0);
      subTotal = Money.add(subTotal, headAmount);

      // Check if discount applies
      let discountForHead = 0;
      for (const d of discounts) {
        if (!d.category || d.category === head.name) {
          if (d.discountType === DiscountType.FLAT) {
            discountForHead = Money.add(discountForHead, Math.round(d.value));
          } else if (d.discountType === DiscountType.PERCENTAGE) {
            discountForHead = Money.add(discountForHead, Money.calculatePercentage(headAmount, d.value));
          }
        }
      }

      if (discountForHead > headAmount) {
        discountForHead = headAmount;
      }

      totalDiscount = Money.add(totalDiscount, discountForHead);
      const netAmount = Money.subtract(headAmount, discountForHead);

      lineItems.push({
        feeHeadId: head._id?.toString(),
        feeCategoryId: head.feeCategoryId?._id?.toString() || head.feeCategoryId?.toString(),
        description: head.name,
        amount: headAmount,
        discountAmount: discountForHead,
        taxAmount: 0,
        netAmount,
      });
    }

    const totalAmount = Money.subtract(subTotal, totalDiscount);

    return {
      lineItems,
      subTotal,
      totalDiscount,
      taxAmount,
      totalAmount: totalAmount < 0 ? 0 : totalAmount,
    };
  }

  public static async generateInvoiceForStudent(
    tenantId: string,
    schoolId: string,
    input: {
      studentId: string;
      academicYearId: string;
      classId?: string;
      feeStructureId: string;
      dueDate: Date;
      issueDate?: Date;
      notes?: string;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const studentOid = new Types.ObjectId(input.studentId);
    const structureOid = new Types.ObjectId(input.feeStructureId);

    const [student, structure, assignment] = await Promise.all([
      Student.findOne({ _id: studentOid, tenantId: tenantOid, isDeleted: false }),
      FeeStructure.findOne({ _id: structureOid, tenantId: tenantOid, isDeleted: false }),
      StudentFeeAssignment.findOne({
        tenantId: tenantOid,
        studentId: studentOid,
        feeStructureId: structureOid,
        isDeleted: false,
      }),
    ]);

    if (!student) throw new NotFoundError('Student not found.');
    if (!structure) throw new NotFoundError('Fee structure not found.');

    const classOid = input.classId
      ? new Types.ObjectId(input.classId)
      : (structure.classId as Types.ObjectId);

    const issueDate = input.issueDate || new Date();
    const invoiceNumber = await this.generateInvoiceNumber(tenantId, schoolId, issueDate.getFullYear());

    const { lineItems, subTotal, totalDiscount, taxAmount, totalAmount } = this.buildLineItems(
      structure,
      assignment
    );

    const invoice = await FeeInvoice.create({
      tenantId: tenantOid,
      schoolId: schoolOid,
      campusId: structure.campusId,
      invoiceNumber,
      studentId: studentOid,
      academicYearId: new Types.ObjectId(input.academicYearId),
      classId: classOid,
      feeStructureId: structureOid,
      dueDate: input.dueDate,
      issueDate,
      lineItems,
      subTotal,
      totalDiscount,
      taxAmount,
      lateFeeAmount: 0,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: totalAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
      notes: input.notes,
    });

    return invoice;
  }

  public static async generateBulkClassInvoices(
    tenantId: string,
    schoolId: string,
    input: {
      academicYearId: string;
      classId: string;
      feeStructureId: string;
      dueDate: Date;
      issueDate?: Date;
      notes?: string;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const ayOid = new Types.ObjectId(input.academicYearId);
    const classOid = new Types.ObjectId(input.classId);
    const structureOid = new Types.ObjectId(input.feeStructureId);

    const structure = await FeeStructure.findOne({
      _id: structureOid,
      tenantId: tenantOid,
      isDeleted: false,
    });

    if (!structure) throw new NotFoundError('Fee structure not found.');

    // Fetch enrolled students
    const enrollments = await StudentEnrollment.find({
      tenantId: tenantOid,
      academicYearId: ayOid,
      classId: classOid,
      status: { $in: ['ENROLLED', 'PROMOTED', 'ACTIVE'] },
      isDeleted: false,
    }).lean();

    if (enrollments.length === 0) {
      throw new BadRequestError('No active student enrollments found in this class.');
    }

    const createdInvoices: any[] = [];
    const issueDate = input.issueDate || new Date();

    for (const enrollment of enrollments) {
      const studentOid = enrollment.studentId as unknown as Types.ObjectId;

      // Check if active invoice already exists for this structure and academic year
      const existing = await FeeInvoice.findOne({
        tenantId: tenantOid,
        studentId: studentOid,
        feeStructureId: structureOid,
        academicYearId: ayOid,
        status: { $nin: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED] },
        isDeleted: false,
      });

      if (existing) {
        continue; // Skip already invoiced
      }

      const assignment = await StudentFeeAssignment.findOne({
        tenantId: tenantOid,
        studentId: studentOid,
        feeStructureId: structureOid,
        isDeleted: false,
      });

      const invoiceNumber = await this.generateInvoiceNumber(tenantId, schoolId, issueDate.getFullYear());
      const { lineItems, subTotal, totalDiscount, taxAmount, totalAmount } = this.buildLineItems(
        structure,
        assignment
      );

      const inv = await FeeInvoice.create({
        tenantId: tenantOid,
        schoolId: schoolOid,
        campusId: structure.campusId,
        invoiceNumber,
        studentId: studentOid,
        academicYearId: ayOid,
        classId: classOid,
        feeStructureId: structureOid,
        dueDate: input.dueDate,
        issueDate,
        lineItems,
        subTotal,
        totalDiscount,
        taxAmount,
        lateFeeAmount: 0,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        status: totalAmount === 0 ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
        notes: input.notes,
      });

      createdInvoices.push(inv);
    }

    return {
      success: true,
      message: `Generated ${createdInvoices.length} invoices successfully.`,
      count: createdInvoices.length,
      invoices: createdInvoices,
    };
  }

  public static async getInvoices(
    tenantId: string,
    schoolId: string,
    query: {
      studentId?: string;
      classId?: string;
      academicYearId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      isDeleted: false,
    };

    if (query.studentId) filter.studentId = new Types.ObjectId(query.studentId);
    if (query.classId) filter.classId = new Types.ObjectId(query.classId);
    if (query.academicYearId) filter.academicYearId = new Types.ObjectId(query.academicYearId);
    if (query.status) filter.status = query.status;

    if (query.search) {
      filter.invoiceNumber = { $regex: query.search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      FeeInvoice.find(filter)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('classId', 'name code')
        .populate('feeStructureId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeeInvoice.countDocuments(filter),
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

  public static async getInvoiceById(
    tenantId: string,
    schoolId: string,
    id: string
  ) {
    const invoice = await FeeInvoice.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber email phone')
      .populate('classId', 'name code')
      .populate('academicYearId', 'name startDate endDate')
      .populate('feeStructureId', 'title heads lateFeePolicy')
      .populate('lineItems.feeCategoryId', 'name code type');

    if (!invoice) throw new NotFoundError('Fee invoice not found.');
    return invoice;
  }

  public static async voidInvoice(
    tenantId: string,
    schoolId: string,
    id: string,
    reason: string
  ) {
    const invoice = await this.getInvoiceById(tenantId, schoolId, id);

    if (invoice.paidAmount > 0) {
      throw new BadRequestError('Cannot void an invoice with recorded payments. Process refunds first.');
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestError('Invoice is already voided.');
    }

    invoice.status = InvoiceStatus.VOID;
    invoice.notes = invoice.notes
      ? `${invoice.notes}\n[VOIDED]: ${reason}`
      : `[VOIDED]: ${reason}`;

    await invoice.save();
    return invoice;
  }

  /**
   * Applies overdue status and calculates late fee according to policy.
   */
  public static async applyOverdueLateFees(tenantId: string, schoolId: string) {
    const today = new Date();
    const overdueInvoices = await FeeInvoice.find({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      dueDate: { $lt: today },
      status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      isDeleted: false,
    }).populate('feeStructureId');

    let updatedCount = 0;

    for (const inv of overdueInvoices) {
      const structure = inv.feeStructureId as any;
      const policy = structure?.lateFeePolicy;

      const diffTime = Math.abs(today.getTime() - new Date(inv.dueDate).getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let lateFee = 0;
      if (policy && policy.enabled && daysOverdue > (policy.gracePeriodDays || 0)) {
        lateFee = Money.calculateLateFee(
          inv.subTotal,
          policy.lateFeeType,
          policy.amount,
          daysOverdue - (policy.gracePeriodDays || 0),
          policy.maxLateFee
        );
      }

      inv.lateFeeAmount = lateFee;
      inv.totalAmount = Money.add(Money.subtract(inv.subTotal, inv.totalDiscount), inv.taxAmount, lateFee);
      inv.balanceAmount = Money.subtract(inv.totalAmount, inv.paidAmount);
      inv.status = InvoiceStatus.OVERDUE;

      await inv.save();
      updatedCount++;
    }

    return { updatedCount };
  }
}
