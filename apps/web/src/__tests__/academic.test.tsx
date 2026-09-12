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
import { AcademicDashboardPage } from '../pages/academic/AcademicDashboardPage.js';
import { ClassListPage } from '../pages/academic/ClassListPage.js';
import { SectionListPage } from '../pages/academic/SectionListPage.js';
import { AcademicClassListPage } from '../pages/academic/AcademicClassListPage.js';
import { AcademicClassDetailsPage } from '../pages/academic/AcademicClassDetailsPage.js';
import { SubjectListPage } from '../pages/academic/SubjectListPage.js';
import {
  UserType,
  UserStatus,
  AcademicStatus,
  EducationLevel,
  SubjectCategory,
} from '@edusphere/common';

const mockDashboardSummary = {
  totalClasses: 12,
  totalSections: 24,
  totalAcademicClasses: 20,
  totalSubjects: 15,
  totalTeacherAssignments: 30,
  totalCapacity: 800,
  totalEnrolled: 650,
  capacityUtilization: 81,
};

const mockClasses = [
  {
    id: 'class_10',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Grade 10',
    code: 'G10',
    order: 10,
    educationLevel: EducationLevel.SECONDARY,
    status: AcademicStatus.ACTIVE,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockSections = [
  {
    id: 'section_10a',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    classId: 'class_10',
    className: 'Grade 10',
    name: 'Section A',
    code: 'A',
    capacity: 40,
    room: 'Room 201',
    status: AcademicStatus.ACTIVE,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAcademicClasses = [
  {
    id: 'ac_10a',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    campusId: 'campus_1',
    campusName: 'Main Campus',
    academicYearId: 'ay_2026',
    academicYearName: '2026-2027',
    classId: 'class_10',
    className: 'Grade 10',
    classCode: 'G10',
    sectionId: 'section_10a',
    sectionName: 'Section A',
    classTeacherId: 'teacher_1',
    classTeacherName: 'Vikram Malhotra',
    capacity: 40,
    currentEnrollment: 32,
    availableCapacity: 8,
    room: 'Room 201',
    status: AcademicStatus.ACTIVE,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockSubjects = [
  {
    id: 'sub_math',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Mathematics',
    code: 'MATH10',
    type: 'CORE',
    category: SubjectCategory.CORE,
    educationLevel: EducationLevel.SECONDARY,
    creditHours: 4,
    sequence: 1,
    status: AcademicStatus.ACTIVE,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockClassDetails = {
  academicClass: mockAcademicClasses[0],
  students: [
    {
      enrollmentId: 'enr_1',
      studentId: 'student_1',
      admissionNumber: 'ADM-2026-0001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: 'MALE',
      rollNumber: 1,
      enrollmentStatus: 'ENROLLED',
      startDate: '2026-04-01T00:00:00.000Z',
    },
  ],
  subjects: [
    {
      id: 'cs_1',
      tenantId: 'tenant_123',
      schoolId: 'school_123',
      academicYearId: 'ay_2026',
      classId: 'class_10',
      subjectId: 'sub_math',
      subjectName: 'Mathematics',
      subjectCode: 'MATH10',
      subjectType: 'CORE',
      isOptional: false,
      creditHours: 4,
      sequence: 1,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  teachers: [
    {
      id: 'ta_1',
      tenantId: 'tenant_123',
      schoolId: 'school_123',
      academicYearId: 'ay_2026',
      classId: 'class_10',
      sectionId: 'section_10a',
      academicClassId: 'ac_10a',
      subjectId: 'sub_math',
      subjectName: 'Mathematics',
      subjectCode: 'MATH10',
      teacherId: 'teacher_1',
      teacherName: 'Vikram Malhotra',
      teacherCode: 'TCH-001',
      teacherEmail: 'vikram.m@school.edu',
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  ],
};

function createTestStore(
  userPermissions: string[] = [
    'class:read',
    'class:create',
    'class:update',
    'class:delete',
    'class:manage',
    'section:read',
    'section:create',
    'section:update',
    'section:delete',
    'section:manage',
    'academic_class:read',
    'academic_class:create',
    'academic_class:update',
    'academic_class:delete',
    'academic_class:manage',
    'subject:read',
    'subject:create',
    'subject:update',
    'subject:delete',
    'subject:manage',
    'class_subject:read',
    'class_subject:create',
    'class_subject:delete',
    'teacher_assignment:read',
    'teacher_assignment:create',
    'teacher_assignment:delete',
    'student:enroll',
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
          id: 'user_1',
          tenantId: 'tenant_123',
          schoolId: 'school_123',
          email: 'admin@school.edu',
          userType: UserType.SCHOOL_ADMIN,
          status: UserStatus.ACTIVE,
          roles: ['Admin'],
          permissions: userPermissions,
        },
        accessToken: 'mock.token',
      },
      ui: {
        theme: 'light',
        sidebarOpen: false,
        globalLoading: false,
      },
    } as any,
  });
}

function renderWithRouter(initialRoute: string, routes: any[], store = createTestStore()) {
  const router = createMemoryRouter(routes, { initialEntries: [initialRoute] });
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

describe('Academic Management Frontend Suite (Phase 8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(global, 'fetch').mockImplementation((input: any, _init?: any) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('/api/v1/academic/dashboard/summary')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockDashboardSummary,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic/academic-classes/') && url.includes('/details')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockClassDetails,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic/academic-classes')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockAcademicClasses,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic/classes')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockClasses,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic/sections')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockSections,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic/subjects')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockSubjects,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/campuses')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'campus_1', name: 'Main Campus' }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic-years')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'ay_2026', name: '2026-2027' }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/teachers')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'teacher_1',
                  teacherCode: 'TCH-001',
                  employeeDetails: { name: 'Vikram Malhotra', email: 'vikram.m@school.edu' },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/students')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'student_1',
                  admissionNumber: 'ADM-2026-0001',
                  personalDetails: { firstName: 'Aarav', lastName: 'Sharma' },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
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

  it('renders AcademicDashboardPage with summary metrics and utilization', async () => {
    renderWithRouter('/academic', [{ path: '/academic', element: <AcademicDashboardPage /> }]);

    expect(screen.getByText('Academic Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument(); // totalClasses
      expect(screen.getByText('24')).toBeInTheDocument(); // totalSections
      expect(screen.getByText('20')).toBeInTheDocument(); // totalAcademicClasses
      expect(screen.getByText('15')).toBeInTheDocument(); // totalSubjects
      expect(screen.getByText(/81%/)).toBeInTheDocument(); // capacityUtilization
    });
  });

  it('renders ClassListPage with Grade & Class levels table and creation button', async () => {
    renderWithRouter('/academic/classes', [
      { path: '/academic/classes', element: <ClassListPage /> },
    ]);

    expect(screen.getByText('Grade & Class Levels')).toBeInTheDocument();
    expect(screen.getByText('+ New Class')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Grade 10')).toBeInTheDocument();
      expect(screen.getByText('G10')).toBeInTheDocument();
    });
  });

  it('renders SectionListPage with sections and capacity', async () => {
    renderWithRouter('/academic/sections', [
      { path: '/academic/sections', element: <SectionListPage /> },
    ]);

    expect(screen.getByText('Class Sections & Divisions')).toBeInTheDocument();
    expect(screen.getByText('+ New Section')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Section A')).toBeInTheDocument();
      expect(screen.getByText('40 students')).toBeInTheDocument();
      expect(screen.getByText('Room 201')).toBeInTheDocument();
    });
  });

  it('renders AcademicClassListPage with offerings, capacity, and teacher badges', async () => {
    renderWithRouter('/academic/academic-classes', [
      { path: '/academic/academic-classes', element: <AcademicClassListPage /> },
    ]);

    expect(screen.getByText('Academic Classes & Offerings')).toBeInTheDocument();
    expect(screen.getByText('+ New Academic Class')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Grade 10 - Section A')).toBeInTheDocument();
      expect(screen.getByText('Vikram Malhotra')).toBeInTheDocument();
      expect(screen.getByText('32 / 40')).toBeInTheDocument();
    });
  });

  it('renders SubjectListPage with master subjects catalog', async () => {
    renderWithRouter('/academic/subjects', [
      { path: '/academic/subjects', element: <SubjectListPage /> },
    ]);

    expect(screen.getByText('Master Subject Catalog')).toBeInTheDocument();
    expect(screen.getByText('+ New Subject')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('MATH10')).toBeInTheDocument();
      expect(screen.getByText('4 hrs')).toBeInTheDocument();
    });
  });

  it('renders AcademicClassDetailsPage with tabs, faculty, and student roster', async () => {
    renderWithRouter('/academic/academic-classes/ac_10a', [
      { path: '/academic/academic-classes/:id', element: <AcademicClassDetailsPage /> },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Grade 10 — Section A')).toBeInTheDocument();
      expect(screen.getByText('Designated Class Teacher')).toBeInTheDocument();
      expect(screen.getByText('Vikram Malhotra')).toBeInTheDocument();
      expect(screen.getByText('Enrolled Students (1)')).toBeInTheDocument();
      expect(screen.getByText('Curriculum Subjects (1)')).toBeInTheDocument();
      expect(screen.getByText('Teacher Assignments (1)')).toBeInTheDocument();
    });
  });
});
