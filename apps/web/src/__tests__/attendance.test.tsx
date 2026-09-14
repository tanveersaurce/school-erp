import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import { AttendanceDashboardPage } from '../pages/attendance/AttendanceDashboardPage.js';
import { MarkAttendancePage } from '../pages/attendance/MarkAttendancePage.js';
import { AttendanceHistoryPage } from '../pages/attendance/AttendanceHistoryPage.js';
import { AttendanceCorrectionsPage } from '../pages/attendance/AttendanceCorrectionsPage.js';
import { AttendanceReportsPage } from '../pages/attendance/AttendanceReportsPage.js';
import {
  UserType,
  UserStatus,
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  CorrectionStatus,
} from '@edusphere/common';

const mockCampusDailyReport = {
  date: new Date().toISOString().split('T')[0],
  totalClasses: 10,
  markedClasses: 8,
  pendingClasses: 2,
  totalEnrolledStudents: 320,
  totalPresent: 295,
  totalAbsent: 15,
  totalLate: 10,
  totalHalfDay: 0,
  overallPercentage: 92.2,
  classes: [
    {
      academicClassId: 'ac_grade9a',
      className: 'Grade 9',
      sectionName: 'A',
      totalEnrolled: 32,
      presentCount: 30,
      absentCount: 2,
      lateCount: 1,
      halfDayCount: 0,
      excusedCount: 0,
      attendancePercentage: 93.8,
    },
  ],
};

const mockPendingCorrections = [
  {
    id: 'corr_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    academicYearId: 'ay_1',
    attendanceId: 'att_1',
    studentId: 'stu_alice_id',
    oldStatus: AttendanceStatus.ABSENT,
    newStatus: AttendanceStatus.PRESENT,
    reason: 'Was present in library with hall pass',
    requestedBy: 'teacher_1',
    status: CorrectionStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockLowAttendanceReport = {
  thresholdPercentage: 75,
  academicYearId: 'ay_1',
  totalStudentsEvaluated: 100,
  lowAttendanceCount: 1,
  students: [
    {
      studentId: 'stu_bob_id',
      studentName: 'Bob Brown',
      studentCode: 'STU-10002',
      rollNumber: 2,
      totalWorkingDays: 20,
      presentDays: 12,
      absentDays: 8,
      lateDays: 0,
      halfDays: 0,
      excusedDays: 0,
      presentEquivalentDays: 12,
      attendancePercentage: 60,
      className: 'Grade 9',
      sectionName: 'A',
      academicClassId: 'ac_grade9a',
    },
  ],
};

const mockAttendanceSheet = {
  academicClass: {
    id: 'ac_grade9a',
    className: 'Grade 9',
    sectionName: 'A',
  },
  enrolledStudents: [
    {
      id: 'stu_1',
      name: 'Alice Walker',
      rollNumber: 1,
      admissionNumber: 'ADM-1001',
    },
    {
      id: 'stu_2',
      name: 'Bob Brown',
      rollNumber: 2,
      admissionNumber: 'ADM-1002',
    },
  ],
  isNonWorkingDay: false,
};

const mockRegisters = [
  {
    id: 'att_session_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    academicYearId: 'ay_1',
    classId: 'class_9',
    sectionId: 'sec_a',
    date: new Date('2026-09-14'),
    attendanceMode: AttendanceMode.DAILY,
    takenBy: 'teacher_1',
    status: AttendanceLifecycleStatus.SUBMITTED,
    totalStudents: 30,
    presentCount: 28,
    absentCount: 2,
    lateCount: 1,
    records: [
      { studentId: 'stu_1', status: AttendanceStatus.PRESENT },
      { studentId: 'stu_2', status: AttendanceStatus.ABSENT },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAcademicClasses = [
  {
    id: 'ac_grade9a',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    className: 'Grade 9',
    sectionName: 'A',
    capacity: 35,
  },
];

function createTestStore(
  userPermissions: string[] = [
    'attendance:read',
    'attendance:mark',
    'attendance:submit',
    'attendance:approve',
    'attendance:lock',
    'attendance:correct',
    'attendance:review',
    'attendance:reports',
    'academic_class:read',
    'timetable:read',
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
          id: 'user_admin',
          tenantId: 'tenant_123',
          schoolId: 'school_123',
          email: 'admin@stjude.edu',
          userType: UserType.SCHOOL_ADMIN,
          status: UserStatus.ACTIVE,
          roles: ['SCHOOL_ADMIN'],
          permissions: userPermissions,
        },
        accessToken: 'mock_test_token',
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement, initialRoute = '/', store = createTestStore()) {
  const router = createMemoryRouter(
    [
      { path: '/', element: ui },
      { path: '/attendance', element: <AttendanceDashboardPage /> },
      { path: '/attendance/mark', element: <MarkAttendancePage /> },
      { path: '/attendance/history', element: <AttendanceHistoryPage /> },
      { path: '/attendance/corrections', element: <AttendanceCorrectionsPage /> },
      { path: '/attendance/reports', element: <AttendanceReportsPage /> },
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

describe('Phase 10: Attendance Management Web UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    globalThis.fetch = vi.fn().mockImplementation((reqInfo: any) => {
      const url = typeof reqInfo === 'string' ? reqInfo : reqInfo.url || reqInfo.toString();

      if (url.includes('/attendance/reports/campus-daily')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockCampusDailyReport }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/attendance/corrections/pending') || url.includes('/attendance/corrections')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { data: mockPendingCorrections, total: 1 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/attendance/reports/low-attendance')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockLowAttendanceReport }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/attendance/sheet')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockAttendanceSheet }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/attendance/register') || url.includes('/attendance?')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { data: mockRegisters, total: 1, page: 1, limit: 20 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/academic/academic-classes')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockAcademicClasses }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/timetable/periods')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/attendance/matrix/monthly')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                academicClassId: 'ac_grade9a',
                className: 'Grade 9',
                sectionName: 'A',
                year: 2026,
                month: 9,
                daysInMonth: 30,
                workingDaysCount: 22,
                students: [],
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

  // 1. Dashboard Page Tests
  it('renders AttendanceDashboardPage with KPI metrics and quick actions', async () => {
    renderWithProviders(<AttendanceDashboardPage />);

    expect(screen.getByText('Attendance Management')).toBeInTheDocument();
    expect(screen.getByText("Today's Campus Rate")).toBeInTheDocument();
    expect(screen.getByText('Correction Requests')).toBeInTheDocument();
    expect(screen.getByText(/At-Risk Students/i)).toBeInTheDocument();
  });

  // 2. Mark Attendance Page Tests
  it('renders MarkAttendancePage with student roster and batch buttons', async () => {
    renderWithProviders(
      <MarkAttendancePage />,
      '/?academicClassId=ac_grade9a&date=2026-09-14'
    );

    expect(screen.getByText('Mark Attendance')).toBeInTheDocument();
    expect(screen.getByText(/Academic Class/i)).toBeInTheDocument();
    expect(screen.getByText(/Attendance Mode/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Mark All Present')).toBeInTheDocument();
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      expect(screen.getByText('Bob Brown')).toBeInTheDocument();
    });
  });

  // 3. Attendance History Page Tests
  it('renders AttendanceHistoryPage with filter bar and session rows', async () => {
    renderWithProviders(<AttendanceHistoryPage />);

    expect(screen.getByText('Attendance Registers & History')).toBeInTheDocument();
    expect(screen.getByText('All Academic Classes')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('DAILY')).toBeInTheDocument();
      expect(screen.getByText('View Roster')).toBeInTheDocument();
    });
  });

  // 4. Attendance Corrections Page Tests
  it('renders AttendanceCorrectionsPage with audit queue and action buttons', async () => {
    renderWithProviders(<AttendanceCorrectionsPage />);

    expect(screen.getByText('Attendance Correction Audit Queue')).toBeInTheDocument();
    expect(screen.getByText('Audit Justification')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Was present in library with hall pass/i)).toBeInTheDocument();
      expect(screen.getByText('Review & Decide')).toBeInTheDocument();
    });
  });

  // 5. Attendance Reports Page Tests
  it('renders AttendanceReportsPage and switches between report tabs', async () => {
    renderWithProviders(<AttendanceReportsPage />);

    expect(screen.getByText('Attendance Analytics & Reports')).toBeInTheDocument();
    expect(screen.getByText('Monthly Matrix')).toBeInTheDocument();
    expect(screen.getByText('Low Attendance Alerts')).toBeInTheDocument();

    // Click Low Attendance tab
    fireEvent.click(screen.getByText('Low Attendance Alerts'));
    await waitFor(() => {
      expect(screen.getByText(/Attendance Threshold:/i)).toBeInTheDocument();
    });

    // Click Student Profile tab
    fireEvent.click(screen.getByText('Student Profile'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter Student ID/i)).toBeInTheDocument();
    });
  });
});
