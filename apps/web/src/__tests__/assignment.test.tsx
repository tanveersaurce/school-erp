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
import { AssignmentDashboardPage } from '../pages/assignments/AssignmentDashboardPage.js';
import { TeacherAssignmentListPage } from '../pages/assignments/TeacherAssignmentListPage.js';
import { AssignmentDetailsPage } from '../pages/assignments/AssignmentDetailsPage.js';
import { StudentAssignmentListPage } from '../pages/assignments/StudentAssignmentListPage.js';
import { StudentAssignmentSubmitPage } from '../pages/assignments/StudentAssignmentSubmitPage.js';
import { ParentChildAssignmentsPage } from '../pages/assignments/ParentChildAssignmentsPage.js';
import {
  UserType,
  UserStatus,
  AssignmentStatus,
  AssignmentType,
  SubmissionType,
  AssignmentTargetType,
  AssignmentSubmissionStatus,
  StudentAssignmentStatus,
} from '@edusphere/common';

const mockTeacherDashboard = {
  totalDrafts: 2,
  totalPublished: 5,
  totalClosed: 3,
  pendingGradingCount: 4,
  upcomingDeadlines: [
    {
      id: 'assign_1',
      title: 'Physics Optics Lab Report',
      academicClassName: 'Grade 10 - Section A',
      subjectName: 'Physics',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      totalSubmissions: 25,
      enrolledCount: 30,
    },
  ],
  recentSubmissions: [
    {
      id: 'sub_1',
      assignmentId: 'assign_1',
      studentId: 'stu_alice',
      studentName: 'Alice Walker',
      studentAdmissionNumber: 'ADM-101',
      assignmentTitle: 'Physics Optics Lab Report',
      status: AssignmentSubmissionStatus.SUBMITTED,
      submittedAt: new Date().toISOString(),
      lateSubmission: false,
    },
  ],
};

const mockStudentDashboard = {
  totalAssigned: 8,
  upcomingCount: 3,
  overdueCount: 1,
  submittedCount: 2,
  gradedCount: 2,
  averageScorePercentage: 88.5,
  upcomingAssignments: [
    {
      assignment: {
        id: 'assign_1',
        title: 'Physics Optics Lab Report',
        subjectName: 'Physics',
        academicClassName: 'Grade 10 - Section A',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        dueDate: '2026-10-30',
        dueTime: '23:59',
        maxScore: 100,
        status: AssignmentStatus.PUBLISHED,
        assignmentType: AssignmentType.HOMEWORK,
        submissionType: SubmissionType.BOTH,
        allowLateSubmission: true,
        targetType: AssignmentTargetType.ALL,
        attachments: [],
        createdBy: 'teacher_1',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      studentStatus: StudentAssignmentStatus.NOT_STARTED,
      isOverdue: false,
      canSubmit: true,
    },
  ],
  recentFeedback: [
    {
      assignment: {
        id: 'assign_math',
        title: 'Quadratic Equations Homework',
        subjectName: 'Mathematics',
        dueAt: new Date().toISOString(),
        dueDate: '2026-10-20',
        dueTime: '23:59',
        maxScore: 50,
        status: AssignmentStatus.PUBLISHED,
        assignmentType: AssignmentType.HOMEWORK,
        submissionType: SubmissionType.BOTH,
        allowLateSubmission: false,
        targetType: AssignmentTargetType.ALL,
        attachments: [],
        createdBy: 'teacher_1',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      submission: {
        id: 'sub_math',
        assignmentId: 'assign_math',
        studentId: 'stu_alice',
        status: AssignmentSubmissionStatus.GRADED,
        score: 48,
        feedback: 'Fantastic neatness and accurate derivations!',
        submittedAt: new Date().toISOString(),
        lateSubmission: false,
        attemptNumber: 1,
        attempts: [],
        attachments: [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      studentStatus: StudentAssignmentStatus.GRADED,
      isOverdue: false,
      canSubmit: false,
    },
  ],
};

const mockAssignmentsList = [
  {
    id: 'assign_1',
    title: 'Physics Optics Lab Report',
    academicClassName: 'Grade 10 - Section A',
    subjectName: 'Physics',
    subjectCode: 'PHY101',
    teacherName: 'Prof. Maxwell',
    dueDate: '2026-10-30',
    dueTime: '23:59',
    dueAt: '2026-10-30T23:59:00.000Z',
    maxScore: 100,
    status: AssignmentStatus.PUBLISHED,
    assignmentType: AssignmentType.HOMEWORK,
    submissionType: SubmissionType.BOTH,
    allowLateSubmission: true,
    targetType: AssignmentTargetType.ALL,
    attachments: [],
    totalSubmissions: 25,
    gradedSubmissions: 20,
    pendingSubmissions: 5,
    createdBy: 'teacher_1',
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockSubmissionsList = [
  {
    id: 'sub_1',
    assignmentId: 'assign_1',
    studentId: 'stu_alice',
    studentName: 'Alice Walker',
    studentAdmissionNumber: 'ADM-101',
    status: AssignmentSubmissionStatus.SUBMITTED,
    submittedAt: new Date().toISOString(),
    textResponse: 'Here is my refraction angle data and Snell law calculations.',
    attemptNumber: 1,
    attempts: [],
    attachments: [
      {
        id: 'att_1',
        fileName: 'refraction_graph.pdf',
        fileUrl: 'https://storage.edusphere.io/refraction_graph.pdf',
        fileType: 'application/pdf',
        fileSize: 1024 * 300,
      },
    ],
    lateSubmission: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockChildren = [
  {
    id: 'stu_alice',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    campusId: 'campus_123',
    admissionNumber: 'ADM-101',
    studentId: 'STU-101',
    personalDetails: { firstName: 'Alice', lastName: 'Walker' },
    contactDetails: { primaryEmail: 'alice@alpha.edu' },
  },
];

function createTestStore(
  userType: UserType = UserType.TEACHER,
  userPermissions: string[] = [
    'assignment:read',
    'assignment:create',
    'assignment:update',
    'assignment:delete',
    'submission:read',
    'submission:grade',
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
          id: userType === UserType.STUDENT ? 'stu_user' : 'teacher_user',
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
      { path: '/assignments', element: <AssignmentDashboardPage /> },
      { path: '/assignments/list', element: <TeacherAssignmentListPage /> },
      { path: '/assignments/:id', element: <AssignmentDetailsPage /> },
      { path: '/assignments/student', element: <StudentAssignmentListPage /> },
      { path: '/assignments/:id/submit', element: <StudentAssignmentSubmitPage /> },
      { path: '/assignments/parent', element: <ParentChildAssignmentsPage /> },
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

describe('Phase 11: Assignment & Homework Management Web UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    globalThis.fetch = vi.fn().mockImplementation((reqInfo: any, init?: any) => {
      const url = typeof reqInfo === 'string' ? reqInfo : reqInfo.url || reqInfo.toString();
      const method = init?.method || 'GET';

      if (url.includes('/assignments/dashboard/teacher')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockTeacherDashboard }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/assignments/dashboard/student')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockStudentDashboard }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/assignments/student/my-assignments')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                ...mockStudentDashboard.upcomingAssignments,
                ...mockStudentDashboard.recentFeedback,
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/assignments/student/stu_alice')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockStudentDashboard.upcomingAssignments,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/me/students') || url.includes('/students/guardians/my-children')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockChildren }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/assignments/assign_1/submissions/sub_1/grade') && method === 'POST') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                ...mockSubmissionsList[0],
                status: AssignmentSubmissionStatus.GRADED,
                score: 95,
                feedback: 'Superb analysis of chromatic aberration!',
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (url.includes('/assignments/assign_1/submissions')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockSubmissionsList }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/assignments/assign_1')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockAssignmentsList[0] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/assignments')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockAssignmentsList,
              meta: { page: 1, totalPages: 1, total: 1 },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('should render Teacher Assignment Dashboard with KPIs and upcoming deadlines', async () => {
    const store = createTestStore(UserType.TEACHER);
    renderWithProviders(<AssignmentDashboardPage />, '/assignments', store);

    expect(screen.getByText(/Homework & Assignments/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Active Published')).toBeInTheDocument();
      expect(screen.getByText('Pending Grading')).toBeInTheDocument();
      expect(screen.getByText('Physics Optics Lab Report')).toBeInTheDocument();
      expect(screen.getByText(/Alice Walker/i)).toBeInTheDocument();
    });
  });

  it('should render Student Assignment Dashboard with to-do and average score', async () => {
    const store = createTestStore(UserType.STUDENT, ['submission:create', 'submission:read']);
    renderWithProviders(<AssignmentDashboardPage />, '/assignments', store);

    await waitFor(() => {
      expect(screen.getByText('To-Do / Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Average Score')).toBeInTheDocument();
      expect(screen.getByText('88.5%')).toBeInTheDocument();
    });
  });

  it('should render Teacher Assignment List Page with search and assignment rows', async () => {
    const store = createTestStore(UserType.TEACHER);
    renderWithProviders(<TeacherAssignmentListPage />, '/assignments/list', store);

    expect(screen.getByText('Assignment Directory')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Physics Optics Lab Report')).toBeInTheDocument();
      expect(screen.getByText('Grade 10 - Section A')).toBeInTheDocument();
      expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    });
  });

  it('should render Assignment Details Page with submissions roster', async () => {
    const store = createTestStore(UserType.TEACHER);
    renderWithProviders(<AssignmentDetailsPage />, '/assignments/assign_1', store);

    await waitFor(() => {
      expect(screen.getByText('Student Submissions Roster')).toBeInTheDocument();
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      expect(screen.getByText(/ADM-101/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Grade/i })).toBeInTheDocument();
    });
  });

  it('should open GradeSubmissionModal and submit teacher score and feedback', async () => {
    const store = createTestStore(UserType.TEACHER);
    renderWithProviders(<AssignmentDetailsPage />, '/assignments/assign_1', store);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Grade/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Grade/i }));

    await waitFor(() => {
      expect(screen.getByText(/Grade Submission: Alice Walker/i)).toBeInTheDocument();
    });

    const scoreInput = screen.getByRole('spinbutton');
    fireEvent.change(scoreInput, { target: { value: '95' } });

    const feedbackInput = screen.getByPlaceholderText(/Commend strengths/i);
    fireEvent.change(feedbackInput, { target: { value: 'Superb analysis of chromatic aberration!' } });

    const saveGradeBtn = screen.getByRole('button', { name: /Save Grade/i });
    fireEvent.click(saveGradeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Grade Submission: Alice Walker/i)).not.toBeInTheDocument();
    });
  });

  it('should render Student Assignment List with tab filters', async () => {
    const store = createTestStore(UserType.STUDENT);
    renderWithProviders(<StudentAssignmentListPage />, '/assignments/student', store);

    expect(screen.getByText('My Assignments & Homework')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('All Tasks')).toBeInTheDocument();
      expect(screen.getByText('To-Do / Not Started')).toBeInTheDocument();
      expect(screen.getByText('Physics Optics Lab Report')).toBeInTheDocument();
    });
  });

  it('should render Parent Portal Child Homework view', async () => {
    const store = createTestStore(UserType.PARENT, ['submission:read']);
    renderWithProviders(<ParentChildAssignmentsPage />, '/assignments/parent', store);

    await waitFor(() => {
      expect(screen.getByText('Parent Portal — Child Homework')).toBeInTheDocument();
      expect(screen.getByText('Alice Walker')).toBeInTheDocument();
      expect(screen.getByText('Physics Optics Lab Report')).toBeInTheDocument();
    });
  });
});
