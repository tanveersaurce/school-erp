import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import { routes } from '../routes/index.js';
import { OrganizationPage } from '../pages/organization/OrganizationPage.js';
import { OrganizationHeaderBadge } from '../components/tenant/OrganizationHeaderBadge.js';
import { UserType, UserStatus } from '@edusphere/common';

const mockSchool = {
  id: 'school_123',
  tenantId: 'tenant_123',
  name: 'Apex Academy International',
  legalName: 'Apex Educational Trust',
  code: 'APEX-01',
  affiliationBoard: 'CBSE',
  status: 'ACTIVE',
  establishedYear: 2010,
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  contact: {
    email: 'admin@apexacademy.edu',
    phone: '+91 9876543210',
    website: 'https://apexacademy.edu',
  },
  address: {
    street: '100 Knowledge Boulevard',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
  },
};

const mockCurrentAcademicYear = {
  id: 'ay_1',
  tenantId: 'tenant_123',
  schoolId: 'school_123',
  name: '2026-2027',
  code: 'AY2627',
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '2027-03-31T23:59:59.000Z',
  status: 'ACTIVE',
  isCurrent: true,
};

const mockCampuses = [
  {
    id: 'camp_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Main Campus',
    code: 'MAIN',
    status: 'ACTIVE',
    isMain: true,
    address: { city: 'Bangalore', state: 'Karnataka' },
  },
  {
    id: 'camp_2',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'North Campus',
    code: 'NORTH',
    status: 'ACTIVE',
    isMain: false,
    address: { city: 'Bangalore', state: 'Karnataka' },
  },
];

const mockAcademicYears = [
  mockCurrentAcademicYear,
  {
    id: 'ay_2',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: '2025-2026',
    code: 'AY2526',
    startDate: '2025-04-01T00:00:00.000Z',
    endDate: '2026-03-31T23:59:59.000Z',
    status: 'CLOSED',
    isCurrent: false,
  },
];

const mockSettings = {
  general: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12H',
    weekStartDay: 'MONDAY',
    defaultLanguage: 'en',
  },
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  numbering: {
    admissionNumberPrefix: 'APX-ADM',
    invoicePrefix: 'APX-INV',
    receiptPrefix: 'APX-REC',
    employeeIdPrefix: 'APX-EMP',
  },
};

const mockBranding = {
  displayName: 'Apex Academy',
  primaryColor: '#4f46e5',
  secondaryColor: '#06b6d4',
  logoUrl: 'https://apexacademy.edu/logo.png',
  reportCardHeader: 'Apex Academy Excellence in Education',
  emailSignature: 'Regards, Apex Administration',
};

const testRootReducer = combineReducers({
  ui: uiReducer,
  auth: authReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: testRootReducer,
    preloadedState,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware) as any,
  });
}

function renderWithProviders(ui: React.ReactElement, preloadedState?: any) {
  const store = createTestStore(preloadedState);
  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>{ui}</ToastProvider>
        </ThemeProvider>
      </Provider>
    ),
  };
}

function renderRoutedApp(initialRoute = '/organization', preloadedState?: any) {
  const store = createTestStore(preloadedState);
  const router = createMemoryRouter(routes, {
    initialEntries: [initialRoute],
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    ),
  };
}

describe('Frontend Organization Management Suite (Phase 5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(globalThis, 'fetch').mockImplementation((input: any) => {
      const url = typeof input === 'string' ? input : input.url || '';

      if (url.includes('/schools/profile')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockSchool }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/academic-years/current')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockCurrentAcademicYear }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/campuses')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockCampuses }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/academic-years')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockAcademicYears }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/schools/settings')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockSettings }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/schools/branding')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: mockBranding }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
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

  describe('1. OrganizationHeaderBadge', () => {
    it('renders school name and current academic session badge when data is loaded', async () => {
      renderWithProviders(<OrganizationHeaderBadge />);

      await waitFor(() => {
        expect(screen.getByTestId('org-header-badge')).toBeInTheDocument();
      });

      expect(screen.getByText('Apex Academy International')).toBeInTheDocument();
      expect(screen.getByText('(APEX-01)')).toBeInTheDocument();
      expect(screen.getByText('2026-2027')).toBeInTheDocument();
    });
  });

  describe('2. OrganizationPage Tab Navigation', () => {
    const fullAdminState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'admin_1',
          email: 'principal@apexacademy.edu',
          userType: UserType.STAFF,
          tenantId: 'tenant_123',
          status: UserStatus.ACTIVE,
          roles: ['SUPER_ADMIN', 'ADMIN'],
          permissions: [
            'school:read',
            'school:update',
            'campus:read',
            'campus:create',
            'campus:update',
            'campus:delete',
            'academic_year:read',
            'academic_year:create',
            'academic_year:update',
            'settings:read',
            'settings:update',
            'branding:read',
            'branding:update',
          ],
        },
      },
    };

    it('renders all 5 organization navigation tabs', async () => {
      renderWithProviders(<OrganizationPage />, fullAdminState);

      expect(screen.getByTestId('tab-profile')).toBeInTheDocument();
      expect(screen.getByTestId('tab-campuses')).toBeInTheDocument();
      expect(screen.getByTestId('tab-academic-years')).toBeInTheDocument();
      expect(screen.getByTestId('tab-settings')).toBeInTheDocument();
      expect(screen.getByTestId('tab-branding')).toBeInTheDocument();
    });

    it('switches to campuses tab and displays campus list', async () => {
      renderWithProviders(<OrganizationPage />, fullAdminState);

      const campusesTab = screen.getByTestId('tab-campuses');
      fireEvent.click(campusesTab);

      await waitFor(() => {
        expect(screen.getByText('Campus Sites & Branches')).toBeInTheDocument();
        expect(screen.getByText('Main Campus')).toBeInTheDocument();
        expect(screen.getByText('North Campus')).toBeInTheDocument();
      });
    });

    it('switches to academic calendar tab and displays session records', async () => {
      renderWithProviders(<OrganizationPage />, fullAdminState);

      const ayTab = screen.getByTestId('tab-academic-years');
      fireEvent.click(ayTab);

      await waitFor(() => {
        expect(screen.getByText('Academic Calendar Sessions')).toBeInTheDocument();
        expect(screen.getByText('2026-2027')).toBeInTheDocument();
        expect(screen.getByText('2025-2026')).toBeInTheDocument();
      });
    });

    it('switches to settings tab and displays configuration fields', async () => {
      renderWithProviders(<OrganizationPage />, fullAdminState);

      const settingsTab = screen.getByTestId('tab-settings');
      fireEvent.click(settingsTab);

      await waitFor(() => {
        expect(screen.getByText(/Localization & Time Formatting/i)).toBeInTheDocument();
        expect(screen.getByText(/Document Numbering/i)).toBeInTheDocument();
      });
    });

    it('switches to branding tab and displays appearance settings', async () => {
      renderWithProviders(<OrganizationPage />, fullAdminState);

      const brandingTab = screen.getByTestId('tab-branding');
      fireEvent.click(brandingTab);

      await waitFor(() => {
        expect(screen.getByText(/Display Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Primary Brand Color/i)).toBeInTheDocument();
        expect(screen.getByTestId('save-branding-btn')).toBeInTheDocument();
      });
    });
  });

  describe('3. Permission-Based Access Control (<Can>) in OrganizationPage', () => {
    it('shows action buttons when user possesses relevant permissions', async () => {
      const authorizedState = {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'admin_1',
            email: 'admin@apexacademy.edu',
            userType: UserType.STAFF,
            tenantId: 'tenant_123',
            status: UserStatus.ACTIVE,
            roles: ['ADMIN'],
            permissions: [
              'school:read',
              'school:update',
              'campus:read',
              'campus:create',
              'academic_year:read',
              'academic_year:create',
              'settings:read',
              'settings:update',
            ],
          },
        },
      };

      renderWithProviders(<OrganizationPage />, authorizedState);

      // School Profile save button
      await waitFor(() => {
        expect(screen.getByTestId('save-profile-btn')).toBeInTheDocument();
      });

      // Switch to campuses tab -> add campus button visible
      fireEvent.click(screen.getByTestId('tab-campuses'));
      await waitFor(() => {
        expect(screen.getByTestId('add-campus-btn')).toBeInTheDocument();
      });

      // Switch to academic calendar tab -> add academic year button visible
      fireEvent.click(screen.getByTestId('tab-academic-years'));
      await waitFor(() => {
        expect(screen.getByTestId('add-ay-btn')).toBeInTheDocument();
      });
    });

    it('hides action buttons when user has only read permissions', async () => {
      const readOnlyState = {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'teacher_1',
            email: 'teacher@apexacademy.edu',
            userType: UserType.TEACHER,
            tenantId: 'tenant_123',
            status: UserStatus.ACTIVE,
            roles: ['TEACHER'],
            permissions: ['school:read', 'campus:read', 'academic_year:read', 'settings:read'],
          },
        },
      };

      renderWithProviders(<OrganizationPage />, readOnlyState);

      // Profile save button should NOT be rendered
      await waitFor(() => {
        expect(screen.queryByTestId('save-profile-btn')).not.toBeInTheDocument();
      });

      // Switch to campuses tab -> add campus button should NOT be rendered
      fireEvent.click(screen.getByTestId('tab-campuses'));
      expect(screen.queryByTestId('add-campus-btn')).not.toBeInTheDocument();

      // Switch to academic calendar tab -> add academic year button should NOT be rendered
      fireEvent.click(screen.getByTestId('tab-academic-years'));
      expect(screen.queryByTestId('add-ay-btn')).not.toBeInTheDocument();
    });
  });

  describe('4. Route Protection for /organization', () => {
    it('redirects to /login when unauthenticated user attempts to visit /organization', () => {
      const unauthState = {
        auth: {
          isAuthenticated: false,
          user: null,
        },
      };

      renderRoutedApp('/organization', unauthState);
      expect(screen.getByText(/Sign In to Your Account/i)).toBeInTheDocument();
    });

    it('renders Access Denied when authenticated user lacks school:read / campus:read permission', () => {
      const forbiddenState = {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'student_1',
            email: 'student@apexacademy.edu',
            userType: UserType.STUDENT,
            tenantId: 'tenant_123',
            status: UserStatus.ACTIVE,
            roles: ['STUDENT'],
            permissions: ['student:read'],
          },
        },
      };

      renderRoutedApp('/organization', forbiddenState);
      expect(screen.getByText(/Access Forbidden/i)).toBeInTheDocument();
    });

    it('renders OrganizationPage when authenticated user has school:read permission', async () => {
      const authorizedState = {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'admin_1',
            email: 'admin@apexacademy.edu',
            userType: UserType.STAFF,
            tenantId: 'tenant_123',
            status: UserStatus.ACTIVE,
            roles: ['ADMIN'],
            permissions: ['school:read'],
          },
        },
      };

      renderRoutedApp('/organization', authorizedState);
      await waitFor(() => {
        expect(screen.getByText(/Organization Management/i)).toBeInTheDocument();
      });
    });
  });
});
