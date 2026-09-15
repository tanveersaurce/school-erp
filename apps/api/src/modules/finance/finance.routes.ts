import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';

const router = Router();

// Enforce JWT authentication for all finance endpoints
router.use(authenticate);

// =========================================================================
// 1. Fee Categories
// =========================================================================
router.post(
  '/categories',
  requirePermission('fee_category:create'),
  FinanceController.createCategory
);

router.get(
  '/categories',
  requirePermission('fee_category:read'),
  FinanceController.getCategories
);

router.get(
  '/categories/:id',
  requirePermission('fee_category:read'),
  FinanceController.getCategoryById
);

router.put(
  '/categories/:id',
  requirePermission('fee_category:update'),
  FinanceController.updateCategory
);

router.delete(
  '/categories/:id',
  requirePermission('fee_category:delete'),
  FinanceController.deleteCategory
);

// =========================================================================
// 2. Fee Structures
// =========================================================================
router.post(
  '/structures',
  requirePermission('fee_structure:create'),
  FinanceController.createStructure
);

router.get(
  '/structures',
  requirePermission('fee_structure:read'),
  FinanceController.getStructures
);

router.get(
  '/structures/:id',
  requirePermission('fee_structure:read'),
  FinanceController.getStructureById
);

router.put(
  '/structures/:id',
  requirePermission('fee_structure:update'),
  FinanceController.updateStructure
);

router.post(
  '/structures/:id/clone',
  requirePermission('fee_structure:create'),
  FinanceController.cloneStructure
);

router.delete(
  '/structures/:id',
  requirePermission('fee_structure:delete'),
  FinanceController.deleteStructure
);

// =========================================================================
// 3. Student Fee Assignments
// =========================================================================
router.post(
  '/assignments',
  requirePermission('fee_assignment:create'),
  FinanceController.assignFeeStructure
);

router.post(
  '/assignments/batch',
  requirePermission('fee_assignment:create'),
  FinanceController.batchAssignClass
);

router.get(
  '/assignments',
  requirePermission('fee_assignment:read'),
  FinanceController.getAssignments
);

router.get(
  '/assignments/:id',
  requirePermission('fee_assignment:read'),
  FinanceController.getAssignmentById
);

// =========================================================================
// 4. Invoices
// =========================================================================
router.post(
  '/invoices/generate',
  requirePermission('fee_invoice:create'),
  FinanceController.generateInvoices
);

router.get(
  '/invoices',
  requirePermission('fee_invoice:read'),
  FinanceController.getInvoices
);

router.get(
  '/invoices/:id',
  requirePermission('fee_invoice:read'),
  FinanceController.getInvoiceById
);

router.post(
  '/invoices/:id/void',
  requirePermission('fee_invoice:void'),
  FinanceController.voidInvoice
);

// =========================================================================
// 5. Payments
// =========================================================================
router.post(
  '/payments/collect',
  requirePermission('payment:collect'),
  FinanceController.collectPayment
);

router.post(
  '/payments/initiate-online',
  requirePermission('payment:collect'),
  FinanceController.initiateOnlinePayment
);

router.post(
  '/payments/verify-online',
  requirePermission('payment:collect'),
  FinanceController.verifyOnlinePayment
);

router.get(
  '/payments',
  requirePermission('payment:read'),
  FinanceController.getPayments
);

router.get(
  '/payments/:id',
  requirePermission('payment:read'),
  FinanceController.getPaymentById
);

// =========================================================================
// 6. Refunds
// =========================================================================
router.post(
  '/refunds',
  requirePermission('payment:refund'),
  FinanceController.requestRefund
);

router.put(
  '/refunds/:id/review',
  requirePermission('payment:refund'),
  FinanceController.reviewRefund
);

router.post(
  '/refunds/:id/process',
  requirePermission('payment:refund'),
  FinanceController.processRefund
);

router.get(
  '/refunds',
  requirePermission('payment:read'),
  FinanceController.getRefunds
);

// =========================================================================
// 7. Operating Income & Expenses
// =========================================================================
router.post(
  '/incomes',
  requirePermission('income_expense:manage'),
  FinanceController.createIncome
);

router.get(
  '/incomes',
  requirePermission('income_expense:manage'),
  FinanceController.getIncomes
);

router.post(
  '/expenses',
  requirePermission('income_expense:manage'),
  FinanceController.createExpense
);

router.get(
  '/expenses',
  requirePermission('income_expense:manage'),
  FinanceController.getExpenses
);

// =========================================================================
// 8. Reports
// =========================================================================
router.get(
  '/reports/kpis',
  requirePermission('finance_report:read'),
  FinanceController.getSummaryKPIs
);

router.get(
  '/reports/defaulters',
  requirePermission('finance_report:read'),
  FinanceController.getDefaultersReport
);

router.get(
  '/reports/collection-summary',
  requirePermission('finance_report:read'),
  FinanceController.getCollectionSummary
);

router.get(
  '/reports/income-expense',
  requirePermission('finance_report:read'),
  FinanceController.getIncomeExpenseStatement
);

router.get(
  '/students/:studentId/ledger',
  requirePermission('fee_invoice:read'),
  FinanceController.getStudentLedger
);

export { router as financeRouter };
