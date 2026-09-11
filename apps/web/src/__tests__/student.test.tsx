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
import { StudentListPage } from '../pages/students/StudentListPage.js';
import { GuardianListPage } from '../pages/guardians/GuardianListPage.js';
import { MyChildrenPage } from '../pages/parent/MyChildrenPage.js';
import { UserType, UserStatus, StudentStatus, Gender } from '@edusphere/common';

const mockStudents = [
  {
    id: 'student_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    studentId: 'STD-2026-0001',
    admissionNumber: 'ADM-2026-0001',
    personalDetails: {
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: Gender.MALE,
      dateOfBirth: '2010-05-15T00:00:00.000Z',
    },
    contactDetails: {
      email: 'aarav.sharma@student.edusphere.io',
      phone: '+919876543210',
      currentAddress: '123 School Road, Mumbai',
    },
    academicDetails: {
      admissionDate: '2026-04-01T00:00:00.000Z',
      admissionType: 'REGULAR',
    },
    currentStatus: StudentStatus.ACTIVE,
    guardians: [
      {
        id: 'rel_1',
        relationshipType: 'FATHER',
        guardian: {
          name: 'Rajesh Sharma',
          phone: '+919876543211',
          email: 'rajesh.sharma@example.com',
        },
      },
    ],
    documents: [
      {
        id: 'doc_1',
        title: 'Birth Certificate',
        documentType: 'BIRTH_CERTIFICATE',
        fileUrl: 'https://example.com/doc1.pdf',
        verificationStatus: 'VERIFIED',
      },
    ],
  },
];

const mockGuardians = [
  {
    id: 'guardian_1',
    tenantId: 'tenant_123',
    guardianId: 'GRD-2026-0001',
    personalDetails: {
      firstName: 'Rajesh',
      lastName: 'Sharma',
      occupation: 'Software Engineer',
    },
    contactDetails: {
      email: 'rajesh.sharma@example.com',
      phone: '+919876543211',
      address: '123 School Road, Mumbai',
    },
    hasAccount: true,
  },
];

function createTestStore(
  userPermissions: string[] = [
    'student:read',
    'student:create',
    'student:update',
    'student:delete',
    'guardian:read',
    'guardian:create',
    'guardian:update',
    'guardian:delete',
    'relationship:read',
    'relationship:create',
    'student_document:read',
    'student_document:create',
    'student_document:verify',
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

function renderWithProviders(ui: React.ReactElement, store = createTestStore()) {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

describe('Student & Parent Management Frontend Suite (Phase 7)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(global, 'fetch').mockImplementation((input: any, _init?: any) => {
      const url = typeof input === 'string' ? input : input.url;

      if (
        url.includes('/api/v1/students') &&
        !url.includes('/guardians') &&
        !url.includes('/identifiers')
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockStudents,
              meta: { pagination: { page: 1, limit: 15, total: 1, totalPages: 1 } },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/guardians') && !url.includes('/identifiers')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockGuardians,
              meta: { pagination: { page: 1, limit: 15, total: 1, totalPages: 1 } },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/me/students')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockStudents,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/campuses') || url.includes('/academic-years')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
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

  it('renders Student Directory with student records and register button for authorized admin', async () => {
    const router = createMemoryRouter([{ path: '/students', element: <StudentListPage /> }], {
      initialEntries: ['/students'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    expect(screen.getByText('Student Directory')).toBeInTheDocument();
    expect(screen.getByText('+ Register Student')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ADM-2026-0001')).toBeInTheDocument();
      expect(screen.getByText(/Aarav/)).toBeInTheDocument();
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    });
  });

  it('hides + Register Student button when student:create permission is absent', async () => {
    const store = createTestStore(['student:read']); // Missing student:create
    const router = createMemoryRouter([{ path: '/students', element: <StudentListPage /> }], {
      initialEntries: ['/students'],
    });

    renderWithProviders(<RouterProvider router={router} />, store);

    expect(screen.getByText('Student Directory')).toBeInTheDocument();
    expect(screen.queryByText('+ Register Student')).not.toBeInTheDocument();
  });

  it('renders Guardian Directory with guardian details and portal status', async () => {
    const router = createMemoryRouter([{ path: '/guardians', element: <GuardianListPage /> }], {
      initialEntries: ['/guardians'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    expect(screen.getByText('Guardian & Parent Directory')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('GRD-2026-0001')).toBeInTheDocument();
      expect(screen.getByText(/Rajesh/)).toBeInTheDocument();
      expect(screen.getByText('Account Active')).toBeInTheDocument();
    });
  });

  it('renders My Children Parent Portal view with anti-IDOR authorized student profiles', async () => {
    const router = createMemoryRouter([{ path: '/my-children', element: <MyChildrenPage /> }], {
      initialEntries: ['/my-children'],
    });

    renderWithProviders(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/Parent Portal/)).toBeInTheDocument();
      expect(screen.getByText(/Aarav/)).toBeInTheDocument();
      expect(screen.getByText('ADM-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Birth Certificate')).toBeInTheDocument();
    });
  });
});
