import { Types } from 'mongoose';
import {
  FeeInvoice,
  Payment,
  Refund,
  Student,
  Income,
  Expense,
  Class,
  AcademicYear,
} from '@edusphere/database';
import {
  Money,
  InvoiceStatus,
  PaymentStatus,
  RefundStatus,
  NotFoundError,
} from '@edusphere/common';
import type {
  IFinanceSummaryKPIs,
  IDefaulterRecord,
  IStudentLedgerEntry,
  IStudentLedgerStatement,
} from '@edusphere/types';

export class FinanceReportService {
  /**
   * Computes top-level financial KPIs for the tenant school.
   */
  public static async getSummaryKPIs(
    tenantId: string,
    schoolId: string,
    query: { academicYearId?: string; startDate?: Date; endDate?: Date }
  ): Promise<IFinanceSummaryKPIs> {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const invoiceFilter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      status: { $nin: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED] },
      isDeleted: false,
    };

    const paymentFilter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      status: { $in: [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
    };

    const refundFilter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      status: RefundStatus.PROCESSED,
    };

    if (query.academicYearId) {
      invoiceFilter.academicYearId = new Types.ObjectId(query.academicYearId);
    }

    if (query.startDate || query.endDate) {
      paymentFilter.createdAt = {};
      if (query.startDate) (paymentFilter.createdAt as any).$gte = new Date(query.startDate);
      if (query.endDate) (paymentFilter.createdAt as any).$lte = new Date(query.endDate);
    }

    const [invoices, payments, refunds] = await Promise.all([
      FeeInvoice.find(invoiceFilter).select('totalAmount paidAmount balanceAmount totalDiscount dueDate status').lean(),
      Payment.find(paymentFilter).select('amount').lean(),
      Refund.find(refundFilter).select('amount').lean(),
    ]);

    let totalInvoiced = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalDiscounts = 0;
    const now = new Date();

    for (const inv of invoices) {
      totalInvoiced = Money.add(totalInvoiced, inv.totalAmount);
      totalOutstanding = Money.add(totalOutstanding, inv.balanceAmount);
      totalDiscounts = Money.add(totalDiscounts, inv.totalDiscount);

      if (inv.balanceAmount > 0 && (inv.status === InvoiceStatus.OVERDUE || new Date(inv.dueDate) < now)) {
        totalOverdue = Money.add(totalOverdue, inv.balanceAmount);
      }
    }

    const totalCollected = payments.reduce((sum, p) => Money.add(sum, p.amount), 0);
    const totalRefunds = refunds.reduce((sum, r) => Money.add(sum, r.amount), 0);

    const collectionRatePercentage = totalInvoiced > 0
      ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100))
      : 0;

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalOverdue,
      totalDiscounts,
      totalRefunds,
      collectionRatePercentage,
    };
  }

  /**
   * Generates defaulters report with ageing breakdowns.
   */
  public static async getDefaultersReport(
    tenantId: string,
    schoolId: string,
    query: { classId?: string; academicYearId?: string; minDaysOverdue?: number }
  ): Promise<IDefaulterRecord[]> {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const now = new Date();

    const filter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      dueDate: { $lt: now },
      balanceAmount: { $gt: 0 },
      status: { $nin: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED, InvoiceStatus.PAID] },
      isDeleted: false,
    };

    if (query.classId) filter.classId = new Types.ObjectId(query.classId);
    if (query.academicYearId) filter.academicYearId = new Types.ObjectId(query.academicYearId);

    const overdueInvoices = await FeeInvoice.find(filter)
      .populate('studentId', 'firstName lastName admissionNumber rollNumber')
      .populate('classId', 'name code')
      .sort({ dueDate: 1 })
      .lean();

    const minDays = query.minDaysOverdue || 0;
    const records: IDefaulterRecord[] = [];

    for (const inv of overdueInvoices) {
      const student = inv.studentId as any;
      const classDoc = inv.classId as any;

      const diffTime = Math.abs(now.getTime() - new Date(inv.dueDate).getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysOverdue >= minDays) {
        records.push({
          studentId: student?._id?.toString() || inv.studentId.toString(),
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
          admissionNumber: student?.admissionNumber || '',
          classId: classDoc?._id?.toString() || inv.classId.toString(),
          className: classDoc ? classDoc.name : 'Unknown Class',
          invoiceId: inv._id.toString(),
          invoiceNumber: inv.invoiceNumber,
          dueDate: inv.dueDate,
          daysOverdue,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          outstandingAmount: inv.balanceAmount,
        });
      }
    }

    return records;
  }

  /**
   * Compiles the comprehensive student financial ledger statement.
   */
  public static async getStudentLedgerStatement(
    tenantId: string,
    schoolId: string,
    studentId: string
  ): Promise<IStudentLedgerStatement> {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const studentOid = new Types.ObjectId(studentId);

    const student = await Student.findOne({
      _id: studentOid,
      tenantId: tenantOid,
      isDeleted: false,
    }).lean();

    if (!student) throw new NotFoundError('Student not found.');

    const [invoices, payments, refunds] = await Promise.all([
      FeeInvoice.find({
        tenantId: tenantOid,
        studentId: studentOid,
        status: { $ne: InvoiceStatus.VOID },
        isDeleted: false,
      })
        .populate('classId', 'name')
        .populate('academicYearId', 'name')
        .lean(),
      Payment.find({
        tenantId: tenantOid,
        studentId: studentOid,
        status: { $in: [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
      }).lean(),
      Refund.find({
        tenantId: tenantOid,
        studentId: studentOid,
        status: RefundStatus.PROCESSED,
      }).lean(),
    ]);

    const rawEntries: Array<{
      date: Date;
      type: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
      referenceNumber: string;
      description: string;
      debit: number;
      credit: number;
    }> = [];

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalRefunded = 0;

    for (const inv of invoices) {
      totalInvoiced = Money.add(totalInvoiced, inv.totalAmount);
      rawEntries.push({
        date: inv.issueDate,
        type: 'INVOICE',
        referenceNumber: inv.invoiceNumber,
        description: `Fee Invoice (${inv.lineItems?.map((l: any) => l.description).join(', ') || 'School Fees'})`,
        debit: inv.totalAmount,
        credit: 0,
      });
    }

    for (const pay of payments) {
      totalPaid = Money.add(totalPaid, pay.amount);
      rawEntries.push({
        date: pay.createdAt,
        type: 'PAYMENT',
        referenceNumber: pay.receiptNumber,
        description: `Payment received (${pay.paymentMethod})`,
        debit: 0,
        credit: pay.amount,
      });
    }

    for (const ref of refunds) {
      totalRefunded = Money.add(totalRefunded, ref.amount);
      rawEntries.push({
        date: ref.processedAt || ref.createdAt,
        type: 'REFUND',
        referenceNumber: ref.refundNumber,
        description: `Refund processed (${ref.reason})`,
        debit: ref.amount,
        credit: 0,
      });
    }

    // Sort chronologically ascending
    rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const entries: IStudentLedgerEntry[] = rawEntries.map((e, idx) => {
      runningBalance = Money.subtract(Money.add(runningBalance, e.debit), e.credit);
      return {
        id: `ledger_${idx + 1}`,
        date: e.date,
        type: e.type,
        referenceNumber: e.referenceNumber,
        description: e.description,
        debit: e.debit,
        credit: e.credit,
        runningBalance,
      };
    });

    const outstandingBalance = Money.subtract(Money.add(totalInvoiced, totalRefunded), totalPaid);

    const latestInvoice = invoices[0];
    const className = (latestInvoice?.classId as any)?.name || 'N/A';
    const academicYearName = (latestInvoice?.academicYearId as any)?.name || 'N/A';

    const pDetails = (student as any).personalDetails;
    const studentName = pDetails
      ? `${pDetails.firstName} ${pDetails.lastName}`
      : `${(student as any).firstName || ''} ${(student as any).lastName || ''}`.trim() || 'Student';

    return {
      studentId: student._id.toString(),
      studentName,
      admissionNumber: student.admissionNumber,
      className,
      academicYearName,
      totalInvoiced,
      totalPaid,
      totalRefunded,
      outstandingBalance: outstandingBalance < 0 ? 0 : outstandingBalance,
      entries,
    };
  }

  /**
   * Generates collection summary grouped by payment methods.
   */
  public static async getCollectionSummary(
    tenantId: string,
    schoolId: string,
    query: { startDate?: Date; endDate?: Date }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const filter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      status: { $in: [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
    };

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) (filter.createdAt as any).$gte = new Date(query.startDate);
      if (query.endDate) (filter.createdAt as any).$lte = new Date(query.endDate);
    }

    const payments = await Payment.find(filter).lean();

    const summaryByMethod: Record<string, { count: number; totalAmount: number }> = {};
    let totalCollected = 0;

    for (const p of payments) {
      const method = p.paymentMethod;
      if (!summaryByMethod[method]) {
        summaryByMethod[method] = { count: 0, totalAmount: 0 };
      }
      summaryByMethod[method].count += 1;
      summaryByMethod[method].totalAmount = Money.add(summaryByMethod[method].totalAmount, p.amount);
      totalCollected = Money.add(totalCollected, p.amount);
    }

    return {
      totalCollected,
      paymentCount: payments.length,
      breakdown: summaryByMethod,
    };
  }

  /**
   * Compiles income vs expense summary.
   */
  public static async getIncomeExpenseStatement(
    tenantId: string,
    schoolId: string,
    query: { startDate?: Date; endDate?: Date }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const dateFilter: Record<string, unknown> = {};
    if (query.startDate || query.endDate) {
      dateFilter.date = {};
      if (query.startDate) (dateFilter.date as any).$gte = new Date(query.startDate);
      if (query.endDate) (dateFilter.date as any).$lte = new Date(query.endDate);
    }

    const [incomes, expenses] = await Promise.all([
      Income.find({ tenantId: tenantOid, schoolId: schoolOid, isDeleted: false, ...dateFilter }).lean(),
      Expense.find({ tenantId: tenantOid, schoolId: schoolOid, isDeleted: false, ...dateFilter }).lean(),
    ]);

    const totalIncome = incomes.reduce((sum, i) => Money.add(sum, i.amount), 0);
    const totalExpense = expenses.reduce((sum, e) => Money.add(sum, e.amount), 0);
    const netOperatingBalance = Money.subtract(totalIncome, totalExpense);

    return {
      totalIncome,
      totalExpense,
      netOperatingBalance,
      incomeCount: incomes.length,
      expenseCount: expenses.length,
    };
  }
}
