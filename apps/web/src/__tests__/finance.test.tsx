import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import {
  FinanceDashboardPage,
  FeeStructuresPage,
  FeeInvoicesPage,
  FeePaymentsPage,
  StudentLedgerPage,
  RefundsManagementPage,
  IncomeExpensePage,
  FinanceReportsPage,
} from '../pages/finance/index.js';
import {
  UserType,
  UserStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  RefundStatus,
  FeeFrequency,
  FeeCategoryType,
  LateFeeType,
} from '@edusphere/common';

const mockFinanceKPIs = {
  totalInvoiced: 5000000,
  totalCollected: 4000000,
  totalOutstanding: 1000000,
  totalOverdue: 250000,
  totalDiscounts: 100000,
  totalRefunds: 50000,
  collectionRatePercentage: 80.0,
};

const mockDefaulters = [
  {
    studentId: 'stu_alice',
    studentName: 'Alice Walker',
    admissionNumber: 'ADM-2026-001',
    classId: 'class_10a',
    className: 'Grade 10 - Section A',
    invoiceId: 'inv_001',
    invoiceNumber: 'INV-2026-00001',
    dueDate: new Date().toISOString(),
    daysOverdue: 45,
    totalAmount: 150000,
    paidAmount: 50000,
    outstandingAmount: 100000,
  },
];

const mockCategories = [
  {
    id: 'cat_tuition',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Tuition Fee',
    code: 'TUITION',
    type: FeeCategoryType.TUITION,
    isTaxable: false,
    isActive: true,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockStructures = [
  {
    id: 'str_grade10',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    academicYearId: 'ay_current',
    classId: 'class_10a',
    title: 'Grade 10 Annual Fee Structure',
    code: 'STR-G10-2026',
    heads: [
      {
        id: 'head_tui',
        name: 'Tuition Component',
        amount: 150000,
        isOptional: false,
        frequency: FeeFrequency.ANNUAL,
      },
    ],
    lateFeePolicy: {
      enabled: true,
      lateFeeType: LateFeeType.DAILY_RATE,
      amount: 1000,
      gracePeriodDays: 7,
    },
    totalAmount: 150000,
    isActive: true,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockInvoices = [
  {
    id: 'inv_001',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    invoiceNumber: 'INV-2026-00001',
    studentId: 'stu_alice',
    academicYearId: 'ay_current',
    classId: 'class_10a',
    dueDate: new Date().toISOString(),
    issueDate: new Date().toISOString(),
    lineItems: [
      {
        description: 'Tuition Component',
        amount: 150000,
        discountAmount: 0,
        netAmount: 150000,
      },
    ],
    subTotal: 150000,
    totalDiscount: 0,
    taxAmount: 0,
    lateFeeAmount: 0,
    totalAmount: 150000,
    paidAmount: 50000,
    balanceAmount: 100000,
    status: InvoiceStatus.PARTIALLY_PAID,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockPayments = [
  {
    id: 'pay_001',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    receiptNumber: 'REC-2026-00001',
    invoiceId: 'inv_001',
    studentId: 'stu_alice',
    amount: 50000,
    paymentMethod: PaymentMethod.CASH,
    status: PaymentStatus.SUCCESS,
    gatewayTransactionId: 'TXN-98124',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockLedgerStatement = {
  studentId: 'stu_alice',
  studentName: 'Alice Walker',
  admissionNumber: 'ADM-2026-001',
  className: 'Grade 10 - Section A',
  academicYearName: '2026-2027',
  totalInvoiced: 150000,
  totalPaid: 50000,
  totalRefunded: 0,
  outstandingBalance: 100000,
  entries: [
    {
      id: 'ent_1',
      date: new Date().toISOString(),
      type: 'INVOICE',
      referenceNumber: 'INV-2026-00001',
      description: 'Term 1 Tuition Billing',
      debit: 150000,
      credit: 0,
      runningBalance: 150000,
    },
    {
      id: 'ent_2',
      date: new Date().toISOString(),
      type: 'PAYMENT',
      referenceNumber: 'REC-2026-00001',
      description: 'Cashier Payment Collection',
      debit: 0,
      credit: 50000,
      runningBalance: 100000,
    },
  ],
};

const mockRefunds = [
  {
    id: 'ref_001',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    refundNumber: 'REF-2026-00001',
    paymentId: 'pay_001',
    invoiceId: 'inv_001',
    studentId: 'stu_alice',
    amount: 10000,
    reason: 'Duplicate payment adjustment',
    status: RefundStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockIncome = [
  {
    id: 'inc_001',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    title: 'Alumni Foundation Grant',
    category: 'GRANT',
    amount: 100000,
    date: new Date().toISOString(),
    referenceNumber: 'REF-GRANT-01',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockExpenses = [
  {
    id: 'exp_001',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    title: 'Lab Physics Equipment',
    category: 'EQUIPMENT',
    amount: 45000,
    date: new Date().toISOString(),
    payee: 'Scientific Tools Corp',
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function createTestStore(
  userType: UserType = UserType.ACCOUNTANT,
  userPermissions: string[] = [
    'fee_category:read',
    'fee_category:create',
    'fee_structure:read',
    'fee_structure:create',
    'fee_structure:manage',
    'fee_invoice:read',
    'fee_invoice:generate',
    'fee_invoice:void',
    'payment:read',
    'payment:collect',
    'payment:refund_request',
    'payment:refund_review',
    'payment:refund_process',
    'finance_report:read',
    'income_expense:manage',
  ]
) {
  const rootReducer = combineReducers({
    auth: authReducer,
    ui: uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware) as any,
    preloadedState: {
      auth: {
        isAuthenticated: true,
        isInitialized: true,
        currentSession: null,
        user: {
          id: userType === UserType.STUDENT ? 'stu_alice' : 'accountant_user',
          tenantId: 'tenant_123',
          schoolId: 'school_123',
          email: 'finance@test.edu',
          userType,
          status: UserStatus.ACTIVE,
          roles: [userType],
          permissions: userPermissions,
        },
        accessToken: 'mock_jwt_token',
      },
    },
  });
}

function renderWithProviders(
  ui: React.ReactElement,
  initialRoute = '/',
  store = createTestStore()
) {
  const router = createMemoryRouter(
    [
      { path: '/', element: ui },
      { path: '/finance', element: <FinanceDashboardPage /> },
      { path: '/finance/structures', element: <FeeStructuresPage /> },
      { path: '/finance/invoices', element: <FeeInvoicesPage /> },
      { path: '/finance/payments', element: <FeePaymentsPage /> },
      { path: '/finance/ledger', element: <StudentLedgerPage /> },
      { path: '/finance/refunds', element: <RefundsManagementPage /> },
      { path: '/finance/income-expense', element: <IncomeExpensePage /> },
      { path: '/finance/reports', element: <FinanceReportsPage /> },
    ],
    { initialEntries: [initialRoute] }
  );

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

describe('Phase 13: Fees & Finance Management Web UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    globalThis.fetch = vi.fn().mockImplementation((reqInfo: any, _init?: any) => {
      const url = typeof reqInfo === 'string' ? reqInfo : reqInfo.url || reqInfo.toString();

      if (url.includes('/finance/reports/kpis')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockFinanceKPIs }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/finance/reports/defaulters')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockDefaulters }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/finance/reports/student-ledger')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockLedgerStatement }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/finance/fee-categories')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockCategories }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/finance/fee-structures')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockStructures }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/finance/invoices')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { invoices: mockInvoices, total: 1, page: 1, limit: 10 },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/finance/payments')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { payments: mockPayments, total: 1, page: 1, limit: 10 },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/finance/refunds')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { refunds: mockRefunds, total: 1, page: 1, limit: 10 },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/finance/income')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { incomeRecords: mockIncome, total: 1, page: 1, limit: 10 },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/finance/expenses')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: { expenses: mockExpenses, total: 1, page: 1, limit: 10 },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/finance/reports/collection-summary')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                breakdown: [{ _id: 'CASH', totalAmount: 4000000, count: 1 }],
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('1. Renders FinanceDashboardPage with KPIs and recent transactions', async () => {
    renderWithProviders(<FinanceDashboardPage />);

    expect(screen.getByText('Fees & Finance Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/50,000/)).toBeInTheDocument(); // totalInvoiced
      expect(screen.getByText(/40,000/)).toBeInTheDocument(); // totalCollected
      expect(screen.getByText(/80\.0%/)).toBeInTheDocument(); // collectionRatePercentage
      expect(screen.getByText(/INV-2026-00001/)).toBeInTheDocument();
      expect(screen.getByText(/REC-2026-00001/)).toBeInTheDocument();
    });
  });

  it('2. Renders FeeStructuresPage with categories and structures tabs', async () => {
    renderWithProviders(<FeeStructuresPage />, '/finance/structures');

    expect(screen.getByText('Fee Configuration & Structures')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Grade 10 Annual Fee Structure')).toBeInTheDocument();
      expect(screen.getAllByText(/1,500/).length).toBeGreaterThan(0);
      expect(screen.getByText('Tuition Component')).toBeInTheDocument();
      expect(screen.getByText('Clone to Next Year')).toBeInTheDocument();
    });
  });

  it('3. Renders FeeInvoicesPage with invoice directory and status badges', async () => {
    renderWithProviders(<FeeInvoicesPage />, '/finance/invoices');

    expect(screen.getByText('Fee Invoices & Billing')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('INV-2026-00001')).toBeInTheDocument();
      expect(screen.getByText('PARTIALLY_PAID')).toBeInTheDocument();
      expect(screen.getByText(/1,500/)).toBeInTheDocument();
      expect(screen.getByText(/1,000/)).toBeInTheDocument(); // balance
    });
  });

  it('4. Renders FeePaymentsPage with payment receipts and collection action', async () => {
    renderWithProviders(<FeePaymentsPage />, '/finance/payments');

    expect(screen.getByText('Fee Payments & Receipts')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REC-2026-00001')).toBeInTheDocument();
      expect(screen.getAllByText('CASH').length).toBeGreaterThan(0);
      expect(screen.getByText('TXN-98124')).toBeInTheDocument();
      expect(screen.getByText('Receipt')).toBeInTheDocument();
      expect(screen.getByText('Refund')).toBeInTheDocument();
    });
  });

  it('5. Renders StudentLedgerPage with running balance statement', async () => {
    renderWithProviders(<StudentLedgerPage />, '/finance/ledger');

    expect(screen.getByText('Student Financial Ledger')).toBeInTheDocument();

    // Trigger lookup
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter Student ID/i)).toBeInTheDocument();
    });
  });

  it('6. Renders RefundsManagementPage with review workflow', async () => {
    renderWithProviders(<RefundsManagementPage />, '/finance/refunds');

    expect(screen.getByText('Refunds Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REF-2026-00001')).toBeInTheDocument();
      expect(screen.getByText('Duplicate payment adjustment')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  it('7. Renders IncomeExpensePage with dual operating ledgers', async () => {
    renderWithProviders(<IncomeExpensePage />, '/finance/income-expense');

    expect(screen.getByText('Operating Income & Expenses')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Lab Physics Equipment')).toBeInTheDocument();
      expect(screen.getByText('Scientific Tools Corp')).toBeInTheDocument();
      expect(screen.getByText('Record Expense')).toBeInTheDocument();
      expect(screen.getByText('Record Income')).toBeInTheDocument();
    });
  });

  it('8. Renders FinanceReportsPage with defaulters ageing report', async () => {
    renderWithProviders(<FinanceReportsPage />, '/finance/reports');

    expect(screen.getByText('Finance & Defaulters Reports')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      expect(screen.getByText('ADM-2026-001')).toBeInTheDocument();
      expect(screen.getByText('45 days')).toBeInTheDocument();
      expect(screen.getByText('31-60 Days')).toBeInTheDocument();
    });
  });
});
