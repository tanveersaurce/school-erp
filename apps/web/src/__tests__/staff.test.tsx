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
import { routes } from '../routes/index.js';
import { StaffListPage } from '../pages/staff/StaffListPage.js';
import { DepartmentDesignationPage } from '../pages/staff/DepartmentDesignationPage.js';
import { TeacherListPage } from '../pages/teachers/TeacherListPage.js';
import { UserType, UserStatus, EmploymentStatus, EmploymentType, Gender } from '@edusphere/common';

const mockEmployees = [
  {
    id: 'emp_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    employeeId: 'EMP-0001',
    firstName: 'Isaac',
    lastName: 'Newton',
    displayName: 'Isaac Newton',
    gender: Gender.MALE,
    dateOfBirth: '1980-01-04T00:00:00.000Z',
    workEmail: 'isaac.newton@school.edu',
    workPhone: '555-001',
    departmentId: 'dept_1',
    departmentName: 'Natural Philosophy',
    designationId: 'desig_1',
    designationName: 'Senior Lecturer',
    employmentType: EmploymentType.FULL_TIME,
    employmentStatus: EmploymentStatus.ACTIVE,
    joiningDate: '2022-01-01T00:00:00.000Z',
    hasTeacherProfile: true,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
  },
  {
    id: 'emp_2',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    employeeId: 'EMP-0002',
    firstName: 'Ada',
    lastName: 'Lovelace',
    displayName: 'Ada Lovelace',
    gender: Gender.FEMALE,
    dateOfBirth: '1985-12-10T00:00:00.000Z',
    workEmail: 'ada.lovelace@school.edu',
    workPhone: '555-002',
    departmentId: 'dept_2',
    departmentName: 'Computer Science',
    designationId: 'desig_2',
    designationName: 'Associate Professor',
    employmentType: EmploymentType.FULL_TIME,
    employmentStatus: EmploymentStatus.ACTIVE,
    joiningDate: '2023-03-01T00:00:00.000Z',
    hasTeacherProfile: false,
    createdAt: '2023-03-01T00:00:00.000Z',
    updatedAt: '2023-03-01T00:00:00.000Z',
  },
];

const mockDepartments = [
  {
    id: 'dept_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Natural Philosophy',
    code: 'NAT-PHIL',
    description: 'Classical Physics and Mathematics',
    status: 'ACTIVE',
    employeeCount: 1,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
  },
  {
    id: 'dept_2',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Computer Science',
    code: 'CS',
    description: 'Algorithms and Programming',
    status: 'ACTIVE',
    employeeCount: 1,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
  },
];

const mockDesignations = [
  {
    id: 'desig_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    departmentId: 'dept_1',
    departmentName: 'Natural Philosophy',
    name: 'Senior Lecturer',
    code: 'SR-LEC',
    level: 3,
    status: 'ACTIVE',
    employeeCount: 1,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
  },
];

const mockTeachers = [
  {
    id: 'tch_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    employeeId: 'emp_1',
    employeeDetails: {
      employeeId: 'EMP-0001',
      name: 'Isaac Newton',
      email: 'isaac.newton@school.edu',
      departmentName: 'Natural Philosophy',
      designationName: 'Senior Lecturer',
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    teacherCode: 'TCH-NEWTON',
    primarySubject: 'Classical Physics',
    secondarySubjects: ['Calculus', 'Optics'],
    specialization: 'Gravitational Mechanics',
    teachingExperienceYears: 20,
    isAvailableForTimetable: true,
    maxWeeklyPeriods: 24,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2022-01-01T00:00:00.000Z',
  },
];

function createTestStore(
  userPermissions: string[] = [
    'employee:read',
    'employee:create',
    'department:read',
    'designation:read',
    'teacher:read',
  ]
) {
  const rootReducer = combineReducers({
    auth: authReducer,
    ui: uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  });

  const store = configureStore({
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

  return store;
}

function renderWithProviders(ui: React.ReactElement, store = createTestStore()) {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

describe('Staff & Teacher Management Frontend Suite (Phase 6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(globalThis, 'fetch').mockImplementation((input: any) => {
      const url = typeof input === 'string' ? input : input.url || '';

      if (url.includes('/employees') && !url.includes('/next-id')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockEmployees,
              meta: { pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 20 } },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/departments')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockDepartments,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/designations')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockDesignations,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/teachers')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockTeachers,
              meta: { pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 20 } },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/campuses')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [],
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

  it('renders StaffListPage directory with employee records and badges', async () => {
    const router = createMemoryRouter([{ path: '/staff', element: <StaffListPage /> }], {
      initialEntries: ['/staff'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    expect(screen.getByText('Staff & Faculty Directory')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Isaac Newton')).toBeInTheDocument();
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
      expect(screen.getByText('EMP-0001')).toBeInTheDocument();
      expect(screen.getByText('EMP-0002')).toBeInTheDocument();
    });
  });

  it('renders DepartmentDesignationPage with department and designation listings', async () => {
    const router = createMemoryRouter(
      [{ path: '/departments-designations', element: <DepartmentDesignationPage /> }],
      { initialEntries: ['/departments-designations'] }
    );

    renderWithProviders(<RouterProvider router={router} />);

    expect(screen.getByText('Departments & Designations')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Natural Philosophy')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
    });
  });

  it('renders TeacherListPage with faculty subjects and timetable capacity', async () => {
    const router = createMemoryRouter([{ path: '/teachers', element: <TeacherListPage /> }], {
      initialEntries: ['/teachers'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    expect(screen.getByText('Teaching Faculty')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Isaac Newton')).toBeInTheDocument();
      expect(screen.getByText('Classical Physics')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
    });
  });

  it('enforces RBAC: redirects unauthorized user to /403 when lacking employee:read', async () => {
    const storeWithoutPerm = createTestStore([]); // empty permissions

    const router = createMemoryRouter(routes, { initialEntries: ['/staff'] });

    render(
      <Provider store={storeWithoutPerm}>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Forbidden')).toBeInTheDocument();
    });
  });
});
