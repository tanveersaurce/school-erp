import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import {
  ReportsDashboardPage,
  ReportExplorerPage,
  ScheduledReportsPage,
  ExportJobsPage,
} from '../pages/reports/index.js';
import {
  UserType,
  UserStatus,
  ReportCategory,
  ReportFormat,
  ExportJobStatus,
  ReportScheduleFrequency,
} from '@edusphere/common';
import type {
  IDashboardOverview,
  IReportDefinition,
  IReportResult,
  IScheduledReport,
  IReportExportJob,
} from '@edusphere/types';

// =============================================================================
// Mock Domain Data
// =============================================================================

const mockDashboardOverview: IDashboardOverview = {
  generatedAt: new Date(),
  schoolId: 'school_test_123',
  kpis: [
    {
      id: 'totalStudents',
      label: 'Total Active Students',
      value: 1250,
      trend: 'UP',
      changePercentage: 4.2,
      category: ReportCategory.STUDENTS,
    },
    {
      id: 'attendanceRate',
      label: 'Average Attendance',
      value: '94.5',
      unit: '%',
      trend: 'UP',
      changePercentage: 1.1,
      category: ReportCategory.ATTENDANCE,
    },
    {
      id: 'feeCollection',
      label: 'Term Fee Collection',
      value: '$248,500',
      trend: 'NEUTRAL',
      category: ReportCategory.FINANCE,
    },
    {
      id: 'staffCount',
      label: 'Active Faculty & Staff',
      value: 84,
      trend: 'NEUTRAL',
      category: ReportCategory.HR,
    },
  ],
  widgets: [
    {
      id: 'attendance-weekly-trend',
      title: 'Weekly Attendance Rate',
      category: ReportCategory.ATTENDANCE,
      type: 'BAR_CHART' as any,
      data: [
        { label: 'Monday', value: 96 },
        { label: 'Tuesday', value: 95 },
        { label: 'Wednesday', value: 94 },
        { label: 'Thursday', value: 93 },
        { label: 'Friday', value: 92 },
      ],
    },
    {
      id: 'student-gender-distribution',
      title: 'Student Demographic Breakdown',
      category: ReportCategory.STUDENTS,
      type: 'PIE_CHART' as any,
      data: [
        { label: 'Female', value: 640 },
        { label: 'Male', value: 610 },
      ],
    },
  ],
};

const mockDefinitions: IReportDefinition[] = [
  {
    reportKey: 'STUDENT_ENROLLMENT_SUMMARY',
    key: 'STUDENT_ENROLLMENT_SUMMARY',
    title: 'Student Enrollment Summary',
    name: 'Student Enrollment Summary',
    category: ReportCategory.STUDENTS,
    description: 'Comprehensive active student directory with demographic and enrollment metrics.',
    supportedFormats: [ReportFormat.CSV, ReportFormat.JSON],
    filters: [
      {
        key: 'classId',
        name: 'classId',
        label: 'Academic Class',
        type: 'TEXT',
        required: false,
      },
      {
        key: 'status',
        name: 'status',
        label: 'Enrollment Status',
        type: 'SELECT',
        required: false,
        options: [
          { label: 'Active', value: 'ACTIVE' },
          { label: 'Inactive', value: 'INACTIVE' },
        ],
      },
    ],
    columns: [
      { key: 'admissionNumber', header: 'Admission No', format: 'STRING' },
      { key: 'fullName', header: 'Full Name', format: 'STRING' },
      { key: 'gender', header: 'Gender', format: 'STRING' },
      { key: 'currentStatus', header: 'Status', format: 'STATUS' as any },
    ],
  },
  {
    reportKey: 'FEE_COLLECTION_SUMMARY',
    key: 'FEE_COLLECTION_SUMMARY',
    title: 'Fee Collection Summary',
    name: 'Fee Collection Summary',
    category: ReportCategory.FINANCE,
    description: 'Aggregated tuition and facility collections by payment channel and date.',
    supportedFormats: [ReportFormat.CSV],
    filters: [],
    columns: [
      { key: 'receiptNumber', header: 'Receipt #', format: 'STRING' },
      { key: 'amount', header: 'Amount', format: 'CURRENCY' as any },
      { key: 'paymentMethod', header: 'Method', format: 'STRING' },
    ],
  },
];

const mockReportResult: IReportResult = {
  reportKey: 'STUDENT_ENROLLMENT_SUMMARY',
  generatedAt: new Date(),
  executionDurationMs: 14,
  executionTimeMs: 14,
  cached: false,
  page: 1,
  limit: 25,
  total: 2,
  totalCount: 2,
  totalPages: 1,
  pageCount: 1,
  data: [
    {
      admissionNumber: 'ADM-2026-001',
      fullName: 'Alice Johnson',
      gender: 'FEMALE',
      currentStatus: 'ACTIVE',
    },
    {
      admissionNumber: 'ADM-2026-002',
      fullName: 'Bob Smith',
      gender: 'MALE',
      currentStatus: 'ACTIVE',
    },
  ],
};

const mockSchedules: IScheduledReport[] = [
  {
    id: 'sched_001',
    _id: 'sched_001',
    tenantId: 'tenant_test_123',
    name: 'Weekly Student Attendance Digest',
    description: 'Weekly automated email dispatch for school administrators',
    reportKey: 'STUDENT_ENROLLMENT_SUMMARY',
    frequency: ReportScheduleFrequency.WEEKLY,
    format: ReportFormat.CSV,
    filters: {},
    recipients: ['principal@school.edu', 'admin@school.edu'],
    isActive: true,
    nextRunAt: new Date(Date.now() + 86400000),
    createdBy: 'user_001',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockExportJobs: IReportExportJob[] = [
  {
    id: 'job_exp_001',
    _id: 'job_exp_001',
    tenantId: 'tenant_test_123',
    requestedBy: 'user_001',
    reportKey: 'STUDENT_ENROLLMENT_SUMMARY',
    filters: {},
    format: ReportFormat.CSV,
    status: ExportJobStatus.COMPLETED,
    progressPercentage: 100,
    progress: 100,
    rowCount: 1250,
    fileSizeBytes: 64200,
    expiresAt: new Date(Date.now() + 86400000 * 7),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'job_exp_002',
    _id: 'job_exp_002',
    tenantId: 'tenant_test_123',
    requestedBy: 'user_001',
    reportKey: 'FEE_COLLECTION_SUMMARY',
    filters: {},
    format: ReportFormat.CSV,
    status: ExportJobStatus.PROCESSING,
    progressPercentage: 45,
    progress: 45,
    expiresAt: new Date(Date.now() + 86400000 * 7),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// =============================================================================
// Test Store & Providers Setup
// =============================================================================

function createTestStore(
  userType: UserType = UserType.SCHOOL_ADMIN,
  userPermissions: string[] = [
    'report:read',
    'report:export',
    'report:schedule',
    'report:manage',
    'analytics:read',
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
          id: 'reports_admin_01',
          tenantId: 'tenant_test_123',
          schoolId: 'school_test_123',
          email: 'admin@school.edu',
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
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>{element}</ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Phase 20: Reports & Analytics Frontend Component Suite', () => {
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

      if (url.includes('/reports/dashboard')) {
        return jsonResponse(mockDashboardOverview);
      }
      if (url.includes('/reports/definitions/STUDENT_ENROLLMENT_SUMMARY')) {
        return jsonResponse(mockDefinitions[0]);
      }
      if (url.includes('/reports/definitions')) {
        return jsonResponse(mockDefinitions);
      }
      if (url.includes('/reports/run/')) {
        return jsonResponse(mockReportResult);
      }
      if (url.includes('/reports/scheduled')) {
        return jsonResponse(mockSchedules);
      }
      if (url.includes('/reports/exports')) {
        return jsonResponse(mockExportJobs);
      }

      return jsonResponse({});
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Executive Dashboard Page
  // ---------------------------------------------------------------------------
  describe('ReportsDashboardPage', () => {
    it('renders the executive dashboard with KPI cards and trend widgets', async () => {
      renderWithProviders(<ReportsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Executive Reports & Analytics')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Active Students')).toBeInTheDocument();
      expect(screen.getByText('Average Attendance')).toBeInTheDocument();
      expect(screen.getByText('Term Fee Collection')).toBeInTheDocument();
      expect(screen.getByText('Active Faculty & Staff')).toBeInTheDocument();

      // Verify trend widgets
      expect(screen.getByText('Weekly Attendance Rate')).toBeInTheDocument();
      expect(screen.getByText('Student Demographic Breakdown')).toBeInTheDocument();
    });

    it('filters KPI metrics when category pills are toggled', async () => {
      renderWithProviders(<ReportsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Executive Reports & Analytics')).toBeInTheDocument();
      });

      // Click FINANCE category filter pill
      const financePill = screen.getByRole('button', { name: /FINANCE/i });
      fireEvent.click(financePill);

      expect(screen.getByText('Term Fee Collection')).toBeInTheDocument();
      expect(screen.queryByText('Total Active Students')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Report Explorer Page
  // ---------------------------------------------------------------------------
  describe('ReportExplorerPage', () => {
    it('renders catalog of reports and executes report queries', async () => {
      renderWithProviders(<ReportExplorerPage />);

      await waitFor(() => {
        expect(screen.getByText('Report Explorer')).toBeInTheDocument();
      });

      // Select report definition from left sidebar
      const reportButtons = await screen.findAllByText('Student Enrollment Summary');
      fireEvent.click(reportButtons[0]);

      // Verify filter parameters panel renders
      await waitFor(() => {
        expect(screen.getByText('Query Filters & Parameters')).toBeInTheDocument();
      });
      expect(screen.getByText('Academic Class')).toBeInTheDocument();
      expect(screen.getByText('Enrollment Status')).toBeInTheDocument();

      // Click "Run Report" button
      const runButton = screen.getByRole('button', { name: /Run Report/i });
      fireEvent.click(runButton);

      // Verify data preview table renders records
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
        expect(screen.getByText('ADM-2026-001')).toBeInTheDocument();
      });
    });

    it('provides instant CSV download action', async () => {
      renderWithProviders(<ReportExplorerPage />);

      await waitFor(() => {
        expect(screen.getByText('Report Explorer')).toBeInTheDocument();
      });

      // Select report definition
      const reportButtons = await screen.findAllByText('Student Enrollment Summary');
      fireEvent.click(reportButtons[0]);

      const exportButton = await screen.findByRole('button', { name: /Export CSV/i });
      expect(exportButton).toBeInTheDocument();
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/Direct CSV export initiated/i)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Scheduled Reports Page
  // ---------------------------------------------------------------------------
  describe('ScheduledReportsPage', () => {
    it('renders list of recurring schedules and opens creation modal', async () => {
      renderWithProviders(<ScheduledReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
      });

      // Verify existing schedule
      expect(screen.getByText('Weekly Student Attendance Digest')).toBeInTheDocument();
      expect(screen.getByText('WEEKLY')).toBeInTheDocument();
      expect(screen.getByText('2 recipient(s)')).toBeInTheDocument();

      // Open new schedule modal
      const newScheduleBtn = screen.getByRole('button', { name: /New Schedule/i });
      fireEvent.click(newScheduleBtn);

      await waitFor(() => {
        expect(screen.getByText('Create Automated Schedule')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Export Jobs Page
  // ---------------------------------------------------------------------------
  describe('ExportJobsPage', () => {
    it('renders asynchronous export batch jobs with progress and download actions', async () => {
      renderWithProviders(<ExportJobsPage />);

      await waitFor(() => {
        expect(screen.getByText('Background Export Downloads')).toBeInTheDocument();
      });

      expect(screen.getByText('STUDENT_ENROLLMENT_SUMMARY')).toBeInTheDocument();
      expect(screen.getByText('FEE_COLLECTION_SUMMARY')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('Generating')).toBeInTheDocument();

      // Completed job has download link
      const downloadLink = screen.getByRole('link', { name: /Download/i });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute('href', '/api/v1/reports/exports/job_exp_001/download');
    });
  });
});
