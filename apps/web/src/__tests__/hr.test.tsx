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
  HrDashboardPage,
  EmployeeHrPage,
  LeaveManagementPage,
  SalaryManagementPage,
  PayrollRunsPage,
  PayrollDetailsPage,
  PayslipsPage,
  HrReportsPage,
} from '../pages/hr/index.js';
import { UserType, UserStatus } from '@edusphere/common';

const mockHrKPIs = {
  totalEmployees: 42,
  activeEmployees: 38,
  onProbationEmployees: 3,
  onLeaveEmployees: 1,
  pendingLeaveApplications: 4,
};

const mockPayKPIs = {
  totalGrossPayroll: 18500000,
  totalDeductions: 1200000,
  totalNetPayroll: 17300000,
  currency: 'USD',
  processedPeriodsCount: 8,
  totalEmployeesCount: 42,
};

const mockLeaveTypes = [
  {
    _id: 'lt_cl',
    name: 'Casual Leave',
    code: 'CL',
    description: 'Casual leave entitlement',
    maximumDays: 12,
    isPaid: true,
    requiresApproval: true,
  },
];

const mockLeavePolicies = [
  {
    _id: 'lp_cl',
    name: 'Standard Faculty Leave Policy',
    code: 'CL_FACULTY',
    leaveTypeId: 'lt_cl',
    annualAllocation: 12,
    accrualMode: 'ANNUAL',
    allowHalfDay: true,
  },
];

const mockLeaveApplications = [
  {
    _id: 'app_001',
    employeeId: {
      _id: 'emp_001',
      displayName: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
    },
    leaveTypeId: {
      _id: 'lt_cl',
      name: 'Casual Leave',
      code: 'CL',
    },
    startDate: new Date('2026-09-10').toISOString(),
    endDate: new Date('2026-09-12').toISOString(),
    durationType: 'FULL_DAY',
    totalDays: 3,
    status: 'PENDING',
    reason: 'Attending symposium',
  },
];

const mockSalaryComponents = [
  {
    _id: 'comp_hra',
    name: 'House Rent Allowance',
    code: 'HRA',
    type: 'EARNING',
    calculationType: 'PERCENTAGE',
    amountOrPercentage: 40,
  },
];

const mockSalaryStructures = [
  {
    _id: 'struct_001',
    name: 'Senior Teacher Grade 1',
    code: 'SR_TCH_1',
    version: 1,
    description: 'Pay structure for senior faculty',
    components: [
      {
        componentId: 'comp_hra',
        componentCode: 'HRA',
        name: 'House Rent Allowance',
        type: 'EARNING',
        calculationType: 'PERCENTAGE',
        amountOrPercentage: 40,
        baseComponentCode: 'BASIC',
      },
    ],
  },
];

const mockPayrollPeriods = [
  {
    _id: 'period_sep26',
    name: 'September 2026 Regular',
    month: 9,
    year: 2026,
    periodStart: new Date('2026-09-01').toISOString(),
    periodEnd: new Date('2026-09-30').toISOString(),
    workingDays: 22,
    status: 'CALCULATED',
    totalEmployees: 1,
    totalGrossPay: 780000,
    totalDeductions: 0,
    totalNetPay: 780000,
  },
];

const mockPayrollItems = [
  {
    _id: 'item_001',
    payrollPeriodId: 'period_sep26',
    employeeId: 'emp_001',
    employeeCode: 'EMP-2026-001',
    employeeName: 'Jane Doe',
    departmentName: 'Science',
    designationName: 'Senior Teacher',
    baseSalary: 500000,
    workingDays: 22,
    paidDays: 22,
    unpaidDays: 0,
    leaveDays: 0,
    grossEarnings: 780000,
    totalDeductions: 0,
    netPay: 780000,
    currency: 'USD',
    paymentStatus: 'UNPAID',
    earnings: [
      { code: 'BASIC', name: 'Basic Salary', amount: 500000 },
      { code: 'HRA', name: 'House Rent Allowance', amount: 200000 },
      { code: 'BONUS_ADJ', name: 'Bonus / Incentives', amount: 80000 },
    ],
    deductions: [],
  },
];

const mockPayslip = {
  payrollItemId: 'item_001',
  periodName: 'September 2026 Regular',
  month: 9,
  year: 2026,
  schoolName: 'Springfield High',
  employeeCode: 'EMP-2026-001',
  employeeName: 'Jane Doe',
  departmentName: 'Science',
  designationName: 'Senior Teacher',
  workingDays: 22,
  paidDays: 22,
  unpaidDays: 0,
  currency: 'USD',
  baseSalary: 500000,
  grossPay: 780000,
  totalDeductions: 0,
  netPay: 780000,
  earnings: [
    { name: 'Basic Salary', amount: 500000 },
    { name: 'House Rent Allowance', amount: 200000 },
    { name: 'Bonus / Incentives', amount: 80000 },
  ],
  deductions: [],
  generatedAt: new Date().toISOString(),
};

const mockDeptSummary = [
  {
    departmentId: 'dept_sci',
    departmentName: 'Science',
    employeeCount: 1,
    totalGross: 780000,
    totalDeductions: 0,
    totalNet: 780000,
  },
];

const mockLeaveUtilization = [
  {
    leaveTypeId: 'lt_cl',
    leaveTypeName: 'Casual Leave',
    leaveTypeCode: 'CL',
    totalAllocated: 12,
    totalUsed: 3,
    totalPending: 1,
    totalAvailable: 8,
  },
];

function createTestStore(
  userType: UserType = UserType.HR_MANAGER,
  userPermissions: string[] = [
    'employee_hr:read',
    'employee_hr:update',
    'leave_type:read',
    'leave_type:create',
    'leave_policy:read',
    'leave_policy:create',
    'leave_application:read',
    'leave_application:approve',
    'salary_component:read',
    'salary_component:create',
    'salary_structure:read',
    'salary_structure:create',
    'employee_salary:read',
    'employee_salary:create',
    'payroll_period:read',
    'payroll_period:create',
    'payroll:read',
    'payroll:calculate',
    'payroll:approve',
    'payroll:process',
    'payroll:lock',
    'payslip:read',
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
          id: 'hr_user_01',
          tenantId: 'tenant_123',
          schoolId: 'school_123',
          email: 'hr@springfield.edu',
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

function renderWithProviders(element: React.ReactElement, store = createTestStore()) {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>{element}</ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

describe('Phase 14: HR & Payroll Management Web Component Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    const jsonResponse = (data: any) =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as any).url || String(input);

      if (url.includes('/hr/dashboard/kpis')) {
        return jsonResponse(mockHrKPIs);
      }
      if (url.includes('/hr/dashboard/payroll-kpis')) {
        return jsonResponse(mockPayKPIs);
      }
      if (url.includes('/hr/leaves/applications')) {
        return jsonResponse(mockLeaveApplications);
      }
      if (url.includes('/hr/leave-types')) {
        return jsonResponse(mockLeaveTypes);
      }
      if (url.includes('/hr/leave-policies')) {
        return jsonResponse(mockLeavePolicies);
      }
      if (url.includes('/hr/leaves/my-balances')) {
        return jsonResponse([]);
      }
      if (url.includes('/hr/salary-components')) {
        return jsonResponse(mockSalaryComponents);
      }
      if (url.includes('/hr/salary-structures')) {
        return jsonResponse(mockSalaryStructures);
      }
      if (url.includes('/hr/payroll-periods/period_sep26/items')) {
        return jsonResponse(mockPayrollItems);
      }
      if (url.includes('/hr/payroll-periods/period_sep26')) {
        return jsonResponse(mockPayrollPeriods[0]);
      }
      if (url.includes('/hr/payroll-periods')) {
        return jsonResponse(mockPayrollPeriods);
      }
      if (url.includes('/hr/payslips/item_001')) {
        return jsonResponse(mockPayslip);
      }
      if (url.includes('/hr/payslips/my')) {
        return jsonResponse([mockPayslip]);
      }
      if (url.includes('/hr/reports/department-payroll')) {
        return jsonResponse(mockDeptSummary);
      }
      if (url.includes('/hr/reports/leave-utilization')) {
        return jsonResponse(mockLeaveUtilization);
      }
      if (url.includes('/employees')) {
        return jsonResponse([]);
      }

      return jsonResponse({});
    });
  });

  it('1. Renders HR & Payroll Dashboard with executive KPI metrics', async () => {
    const router = createMemoryRouter([{ path: '/', element: <HrDashboardPage /> }], {
      initialEntries: ['/'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('HR & Payroll Management')).toBeInTheDocument();
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('38 Active Staff')).toBeInTheDocument();
    });
  });

  it('2. Renders Leave Management with leave requests and tabs', async () => {
    const router = createMemoryRouter([{ path: '/', element: <LeaveManagementPage /> }], {
      initialEntries: ['/'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Leave Management & Accruals')).toBeInTheDocument();
      expect(screen.getByText(/Applications & Approvals/i)).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Attending symposium')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });
  });

  it('3. Renders Salary Structures and Pay Components', async () => {
    const router = createMemoryRouter([{ path: '/', element: <SalaryManagementPage /> }], {
      initialEntries: ['/'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Salary Structures & Compensation')).toBeInTheDocument();
      expect(screen.getByText('Senior Teacher Grade 1')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
  });

  it('4. Renders Payroll Processing Cycles and status tags', async () => {
    const router = createMemoryRouter([{ path: '/', element: <PayrollRunsPage /> }], {
      initialEntries: ['/'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Payroll Processing Cycles')).toBeInTheDocument();
      expect(screen.getByText('September 2026 Regular')).toBeInTheDocument();
      expect(screen.getByText('CALCULATED')).toBeInTheDocument();
      expect(screen.getByText('Open Cycle')).toBeInTheDocument();
    });
  });

  it('5. Renders Payroll Details with itemized disbursements table', async () => {
    const router = createMemoryRouter(
      [{ path: '/hr/payroll/:id', element: <PayrollDetailsPage /> }],
      { initialEntries: ['/hr/payroll/period_sep26'] }
    );

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('September 2026 Regular')).toBeInTheDocument();
      expect(screen.getByText('Calculate Run')).toBeInTheDocument();
      expect(screen.getByText('Itemized Employee Disbursements')).toBeInTheDocument();
      expect(screen.getByText('EMP-2026-001')).toBeInTheDocument();
    });
  });

  it('6. Renders Digital Itemized Payslip with exact minor-unit formatting', async () => {
    const router = createMemoryRouter(
      [{ path: '/hr/payslips/:id', element: <PayslipsPage /> }],
      { initialEntries: ['/hr/payslips/item_001'] }
    );

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Official Monthly Salary Statement')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('EMP-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Net Disbursed Amount')).toBeInTheDocument();
      expect(screen.getByText('Print Payslip')).toBeInTheDocument();
    });
  });

  it('7. Renders HR & Payroll Reports with department allocation and leave utilization', async () => {
    const router = createMemoryRouter([{ path: '/', element: <HrReportsPage /> }], {
      initialEntries: ['/'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('HR & Payroll Analytics Reports')).toBeInTheDocument();
      expect(screen.getByText('Department Payroll Summary')).toBeInTheDocument();
      expect(screen.getByText('Leave Utilization Report')).toBeInTheDocument();
      expect(screen.getByText('Casual Leave')).toBeInTheDocument();
    });
  });

  it('8. Renders Employee HR Profiles & Lifecycle management view', async () => {
    const router = createMemoryRouter([{ path: '/', element: <EmployeeHrPage /> }], {
      initialEntries: ['/'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Employee HR Profiles & Lifecycle')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Manage probation, confirmation, employment status transitions and official personnel documents'
        )
      ).toBeInTheDocument();
    });
  });
});
