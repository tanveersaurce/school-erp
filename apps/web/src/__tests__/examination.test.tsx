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
  ExamDashboardPage,
  ExamListPage,
  ExamSchedulePage,
  MarksEntryPage,
  ResultsManagementPage,
  StudentResultViewPage,
} from '../pages/examinations/index.js';
import {
  UserType,
  UserStatus,
  ExamStatus,
  ExamType,
  MarkStatus,
  ResultStatus,
} from '@edusphere/common';

const mockKPIs = {
  totalExams: 12,
  scheduledExams: 4,
  ongoingExams: 2,
  resultsPending: 3,
  publishedExams: 3,
};

const mockExamsList = [
  {
    id: 'exam_mid_2026',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    academicYearId: 'ay_2026',
    title: 'Mid-Term Examination 2026',
    code: 'MID-2026',
    description: 'First semester comprehensive evaluation',
    examType: ExamType.MID_TERM,
    status: ExamStatus.SCHEDULED,
    startDate: '2026-10-15T00:00:00.000Z',
    endDate: '2026-10-25T00:00:00.000Z',
    passingPercentage: 40,
    academicClassIds: ['class_10a'],
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockSchedules = [
  {
    id: 'sched_physics',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    examId: 'exam_mid_2026',
    academicClassId: 'class_10a',
    subjectId: 'sub_physics',
    examDate: '2026-10-16T00:00:00.000Z',
    startTime: '09:00',
    endTime: '12:00',
    room: 'Hall-A',
    maxMarks: 100,
    passMarks: 40,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockRoster = {
  exam: { id: 'exam_mid_2026', title: 'Mid-Term Examination 2026', status: ExamStatus.SCHEDULED },
  academicClassId: 'class_10a',
  subjectId: 'sub_physics',
  maxMarks: 100,
  passMarks: 40,
  isSubjectLocked: false,
  isSubjectVerified: false,
  students: [
    {
      studentId: 'stu_alice',
      rollNumber: 1,
      admissionNumber: 'ADM-101',
      name: 'Alice Walker',
      marksObtained: 85,
      status: MarkStatus.ENTERED,
      grade: 'A',
      percentage: 85,
      remarks: 'Excellent practical concept',
      isLocked: false,
      isVerified: false,
    },
  ],
};

const mockResults = [
  {
    id: 'res_alice',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    academicYearId: 'ay_2026',
    examId: 'exam_mid_2026',
    academicClassId: 'class_10a',
    studentId: 'stu_alice',
    rollNumber: 1,
    version: 1,
    isCurrentVersion: true,
    status: 'PUBLISHED',
    subjectResults: [
      {
        subjectId: 'sub_physics',
        subjectName: 'Physics',
        subjectCode: 'PHY-101',
        maxMarks: 100,
        passMarks: 40,
        marksObtained: 85,
        status: MarkStatus.ENTERED,
        percentage: 85,
        grade: 'A',
        gradePoint: 9,
        isPassed: true,
      },
    ],
    totalMaxMarks: 100,
    totalMarksObtained: 85,
    percentage: 85.0,
    overallGrade: 'A',
    overallGradePoint: 9,
    resultStatus: ResultStatus.PASS,
    failedSubjectCount: 0,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function createTestStore(
  userType: UserType = UserType.TEACHER,
  userPermissions: string[] = [
    'exam:read',
    'exam:create',
    'exam:update',
    'exam:schedule',
    'marks:read',
    'marks:entry',
    'marks:verify',
    'marks:lock',
    'result:read',
    'result:calculate',
    'result:approve',
    'result:publish',
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
          id: userType === UserType.STUDENT ? 'stu_alice' : 'teacher_user',
          tenantId: 'tenant_123',
          schoolId: 'school_123',
          email: 'user@test.edu',
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
      { path: '/examinations', element: <ExamDashboardPage /> },
      { path: '/examinations/list', element: <ExamListPage /> },
      { path: '/examinations/:id/schedule', element: <ExamSchedulePage /> },
      { path: '/examinations/:id/marks', element: <MarksEntryPage /> },
      { path: '/examinations/:id/results', element: <ResultsManagementPage /> },
      { path: '/examinations/my-results', element: <StudentResultViewPage /> },
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

describe('Phase 12: Examination & Results Management Web UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    globalThis.fetch = vi.fn().mockImplementation((reqInfo: any, _init?: any) => {
      const url = typeof reqInfo === 'string' ? reqInfo : reqInfo.url || reqInfo.toString();

      if (url.includes('/examinations/dashboard')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockKPIs }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/examinations/marks/roster')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockRoster }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/examinations/my-results')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockResults }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/examinations/exam_mid_2026/schedules')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockSchedules }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/examinations/exam_mid_2026/results')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockResults }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/examinations/exam_mid_2026')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockExamsList[0] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/examinations')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockExamsList }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/academic-classes')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'class_10a', name: 'Grade 10 - Section A' }],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/subjects')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'sub_physics', name: 'Physics', code: 'PHY-101' }],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/academic-years')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'ay_2026', name: '2026-2027', status: 'ACTIVE' }],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/campuses')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'campus_main', name: 'Main Campus' }],
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

  it('1. Renders ExamDashboardPage with KPIs and recent exams', async () => {
    renderWithProviders(<ExamDashboardPage />);

    expect(screen.getByText('Examination & Results Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // totalExams
      expect(screen.getByText('4')).toBeInTheDocument(); // scheduledExams
      expect(screen.getByText('Mid-Term Examination 2026')).toBeInTheDocument();
    });
  });

  it('2. Renders ExamListPage with filtering and exam directory', async () => {
    renderWithProviders(<ExamListPage />, '/examinations/list');

    expect(screen.getByText('Examinations Directory')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Mid-Term Examination 2026')).toBeInTheDocument();
      expect(screen.getByText('MID-2026')).toBeInTheDocument();
      expect(screen.getAllByText('SCHEDULED').length).toBeGreaterThan(0);
    });
  });

  it('3. Renders ExamSchedulePage with clash detection interface', async () => {
    renderWithProviders(<ExamSchedulePage />, '/examinations/exam_mid_2026/schedule');

    await waitFor(() => {
      expect(screen.getByText('Paper Scheduling & Clash Detection')).toBeInTheDocument();
      expect(screen.getByText('Check For Clashes')).toBeInTheDocument();
      expect(screen.getByText('Add Paper Schedule')).toBeInTheDocument();
      expect(screen.getByText('Current Exam Timetable (1)')).toBeInTheDocument();
    });
  });

  it('4. Renders MarksEntryPage with student roster table', async () => {
    renderWithProviders(
      <MarksEntryPage />,
      '/examinations/exam_mid_2026/marks?classId=class_10a&subjectId=sub_physics'
    );

    expect(screen.getByText('Marks Roster & Grade Entry')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      expect(screen.getByText('Save Draft')).toBeInTheDocument();
      expect(screen.getByText('Verify Marks')).toBeInTheDocument();
      expect(screen.getByText('Lock Marks')).toBeInTheDocument();
    });
  });

  it('5. Renders ResultsManagementPage with calculation and publishing controls', async () => {
    renderWithProviders(<ResultsManagementPage />, '/examinations/exam_mid_2026/results');

    expect(screen.getByText('Results Ledger & Publishing')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Calculate Results')).toBeInTheDocument();
      expect(screen.getByText('Approve Results')).toBeInTheDocument();
      expect(screen.getByText('Publish to Students')).toBeInTheDocument();
      expect(screen.getByText('Pass Rate')).toBeInTheDocument();
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
  });

  it('6. Renders StudentResultViewPage for student certified scorecard', async () => {
    const studentStore = createTestStore(UserType.STUDENT, ['result:read']);
    renderWithProviders(<StudentResultViewPage />, '/examinations/my-results', studentStore);

    await waitFor(() => {
      expect(screen.getByText('Official Student Performance Report')).toBeInTheDocument();
      expect(screen.getByText('Examination Report Card')).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getAllByText(/85\.0%/).length).toBeGreaterThan(0);
      expect(screen.getByText('QUALIFIED')).toBeInTheDocument();
    });
  });
});
