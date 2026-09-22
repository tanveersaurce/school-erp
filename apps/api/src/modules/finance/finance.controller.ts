import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, AuthenticationError } from '@edusphere/common';
import { resolveAuthorizedSchoolId } from '../../core/auth/scope.helper.js';
import { FeeCategoryService } from './services/fee-category.service.js';
import { FeeStructureService } from './services/fee-structure.service.js';
import { FeeAssignmentService } from './services/fee-assignment.service.js';
import { InvoiceService } from './services/invoice.service.js';
import { PaymentService } from './services/payment.service.js';
import { RefundService } from './services/refund.service.js';
import { IncomeExpenseService } from './services/income-expense.service.js';
import { FinanceReportService } from './services/finance-report.service.js';
import { FinancePolicy } from './policies/finance.policy.js';
import {
  createFeeCategorySchema,
  updateFeeCategorySchema,
  createFeeStructureSchema,
  updateFeeStructureSchema,
  createStudentFeeAssignmentSchema,
  batchAssignFeeStructureSchema,
  generateInvoicesSchema,
  voidInvoiceSchema,
  collectPaymentSchema,
  initiateOnlinePaymentSchema,
  verifyOnlinePaymentSchema,
  requestRefundSchema,
  reviewRefundSchema,
  createIncomeSchema,
  createExpenseSchema,
} from './finance.validator.js';

export class FinanceController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = req.tenantContext?.tenantId || auth.tenantId;
    const schoolId = resolveAuthorizedSchoolId(req);
    return { auth, tenantId, schoolId, userId: auth.userId };
  }

  // =========================================================================
  // Fee Categories
  // =========================================================================
  public static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = createFeeCategorySchema.parse(req.body);
      const category = await FeeCategoryService.createFeeCategory(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(category, 'Fee category created successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await FeeCategoryService.getFeeCategories(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Fee categories fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  public static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const category = await FeeCategoryService.getFeeCategoryById(tenantId, schoolId, req.params.id);
      res.status(200).json(createSuccessResponse(category, 'Fee category fetched successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = updateFeeCategorySchema.parse(req.body);
      const category = await FeeCategoryService.updateFeeCategory(tenantId, schoolId, req.params.id, validated);
      res.status(200).json(createSuccessResponse(category, 'Fee category updated successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await FeeCategoryService.deleteFeeCategory(tenantId, schoolId, req.params.id);
      res.status(200).json(createSuccessResponse(result, 'Fee category deleted successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Fee Structures
  // =========================================================================
  public static async createStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = createFeeStructureSchema.parse(req.body);
      const structure = await FeeStructureService.createFeeStructure(tenantId, schoolId, validated as any);
      res.status(201).json(createSuccessResponse(structure, 'Fee structure created successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getStructures(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await FeeStructureService.getFeeStructures(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Fee structures fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  public static async getStructureById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const structure = await FeeStructureService.getFeeStructureById(tenantId, schoolId, req.params.id);
      res.status(200).json(createSuccessResponse(structure, 'Fee structure fetched successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async updateStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = updateFeeStructureSchema.parse(req.body);
      const structure = await FeeStructureService.updateFeeStructure(tenantId, schoolId, req.params.id, validated as any);
      res.status(200).json(createSuccessResponse(structure, 'Fee structure updated successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async cloneStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const cloned = await FeeStructureService.cloneFeeStructure(
        tenantId,
        schoolId,
        req.params.id,
        req.body.targetAcademicYearId
      );
      res.status(201).json(createSuccessResponse(cloned, 'Fee structure cloned successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async deleteStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await FeeStructureService.deleteFeeStructure(tenantId, schoolId, req.params.id);
      res.status(200).json(createSuccessResponse(result, 'Fee structure deleted successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Fee Assignments
  // =========================================================================
  public static async assignFeeStructure(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = createStudentFeeAssignmentSchema.parse(req.body);
      const assignment = await FeeAssignmentService.assignFeeStructure(tenantId, schoolId, validated as any);
      res.status(201).json(createSuccessResponse(assignment, 'Fee structure assigned successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async batchAssignClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = batchAssignFeeStructureSchema.parse(req.body);
      const result = await FeeAssignmentService.batchAssignClass(tenantId, schoolId, validated);
      res.status(200).json(createSuccessResponse(result, result.message, { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await FeeAssignmentService.getStudentFeeAssignments(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Fee assignments fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  public static async getAssignmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const assignment = await FeeAssignmentService.getStudentFeeAssignmentById(tenantId, schoolId, req.params.id);
      res.status(200).json(createSuccessResponse(assignment, 'Fee assignment fetched successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Invoices
  // =========================================================================
  public static async generateInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = generateInvoicesSchema.parse(req.body);

      if (validated.mode === 'SINGLE') {
        const invoice = await InvoiceService.generateInvoiceForStudent(tenantId, schoolId, {
          studentId: validated.studentId!,
          academicYearId: validated.academicYearId,
          classId: validated.classId,
          feeStructureId: validated.feeStructureId,
          dueDate: validated.dueDate,
          issueDate: validated.issueDate,
          notes: validated.notes,
        });
        res.status(201).json(createSuccessResponse(invoice, 'Invoice generated successfully.', { requestId: (req as any).id }));
      } else {
        const result = await InvoiceService.generateBulkClassInvoices(tenantId, schoolId, {
          academicYearId: validated.academicYearId,
          classId: validated.classId!,
          feeStructureId: validated.feeStructureId,
          dueDate: validated.dueDate,
          issueDate: validated.issueDate,
          notes: validated.notes,
        });
        res.status(201).json(createSuccessResponse(result, result.message, { requestId: (req as any).id }));
      }
    } catch (err) {
      next(err);
    }
  }

  public static async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await InvoiceService.getInvoices(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Invoices fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  public static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const invoice = await InvoiceService.getInvoiceById(tenantId, schoolId, req.params.id);

      // Verify self-access if student or parent
      await FinancePolicy.assertStudentFinanceAccess(req, (invoice.studentId as any)._id || invoice.studentId);

      res.status(200).json(createSuccessResponse(invoice, 'Invoice fetched successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async voidInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = voidInvoiceSchema.parse(req.body);
      const invoice = await InvoiceService.voidInvoice(tenantId, schoolId, req.params.id, validated.reason);
      res.status(200).json(createSuccessResponse(invoice, 'Invoice voided successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Payments
  // =========================================================================
  public static async collectPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = FinanceController.getAuth(req);
      const validated = collectPaymentSchema.parse(req.body);
      const payment = await PaymentService.collectPayment(tenantId, schoolId, validated as any, userId);
      res.status(201).json(createSuccessResponse(payment, 'Payment collected successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async initiateOnlinePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = initiateOnlinePaymentSchema.parse(req.body);
      const result = await PaymentService.initiateOnlinePayment(tenantId, schoolId, validated as any);
      res.status(200).json(createSuccessResponse(result, 'Online payment initiated.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async verifyOnlinePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = verifyOnlinePaymentSchema.parse(req.body);
      const result = await PaymentService.verifyOnlinePayment(tenantId, schoolId, validated);
      res.status(200).json(createSuccessResponse(result.payment, result.message, { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await PaymentService.getPayments(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Payments fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  public static async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const payment = await PaymentService.getPaymentById(tenantId, schoolId, req.params.id);

      await FinancePolicy.assertStudentFinanceAccess(req, (payment.studentId as any)._id || payment.studentId);

      res.status(200).json(createSuccessResponse(payment, 'Payment receipt fetched successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Refunds
  // =========================================================================
  public static async requestRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const validated = requestRefundSchema.parse(req.body);
      const refund = await RefundService.requestRefund(tenantId, schoolId, validated);
      res.status(201).json(createSuccessResponse(refund, 'Refund requested successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async reviewRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = FinanceController.getAuth(req);
      const validated = reviewRefundSchema.parse(req.body);
      const refund = await RefundService.reviewRefund(tenantId, schoolId, req.params.id, validated, userId);
      res.status(200).json(createSuccessResponse(refund, 'Refund reviewed successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async processRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = FinanceController.getAuth(req);
      const refund = await RefundService.processRefund(tenantId, schoolId, req.params.id, userId);
      res.status(200).json(createSuccessResponse(refund, 'Refund processed successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getRefunds(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await RefundService.getRefunds(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Refunds fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Operating Income & Expenses
  // =========================================================================
  public static async createIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = FinanceController.getAuth(req);
      const validated = createIncomeSchema.parse(req.body);
      const income = await IncomeExpenseService.createIncome(tenantId, schoolId, validated as any, userId);
      res.status(201).json(createSuccessResponse(income, 'Income recorded successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getIncomes(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await IncomeExpenseService.getIncomes(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Incomes fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  public static async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = FinanceController.getAuth(req);
      const validated = createExpenseSchema.parse(req.body);
      const expense = await IncomeExpenseService.createExpense(tenantId, schoolId, validated as any, userId);
      res.status(201).json(createSuccessResponse(expense, 'Expense recorded successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const result = await IncomeExpenseService.getExpenses(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(result.items, 'Expenses fetched successfully.', { requestId: (req as any).id, ...result.meta }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // Reports
  // =========================================================================
  public static async getSummaryKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const kpis = await FinanceReportService.getSummaryKPIs(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(kpis, 'Financial KPIs computed successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getDefaultersReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const records = await FinanceReportService.getDefaultersReport(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(records, 'Defaulters report fetched successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getStudentLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const { studentId } = req.params;

      await FinancePolicy.assertStudentFinanceAccess(req, studentId);

      const statement = await FinanceReportService.getStudentLedgerStatement(tenantId, schoolId, studentId);
      res.status(200).json(createSuccessResponse(statement, 'Student ledger statement fetched successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getCollectionSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const summary = await FinanceReportService.getCollectionSummary(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(summary, 'Collection summary computed successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }

  public static async getIncomeExpenseStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = FinanceController.getAuth(req);
      const statement = await FinanceReportService.getIncomeExpenseStatement(tenantId, schoolId, req.query as any);
      res.status(200).json(createSuccessResponse(statement, 'Income vs expense statement computed successfully.', { requestId: (req as any).id }));
    } catch (err) {
      next(err);
    }
  }
}
