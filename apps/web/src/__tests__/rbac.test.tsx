import { describe, it, expect } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import { routes } from '../routes/index.js';
import { usePermission } from '../hooks/usePermission.js';
import { Can } from '../components/auth/Can.js';
import { UserType, UserStatus } from '@edusphere/common';

const testRootReducer = combineReducers({
  ui: uiReducer,
  auth: authReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: testRootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault().concat(baseApi.middleware) as any,
  });
}

function renderWithStore(ui: React.ReactElement, preloadedState?: any) {
  const store = createTestStore(preloadedState);
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

function renderRoutedApp(initialRoute = '/', preloadedState?: any) {
  const store = createTestStore(preloadedState);
  const router = createMemoryRouter(routes, {
    initialEntries: [initialRoute],
  });

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

describe('Frontend RBAC & Authorization Suite (Phase 4)', () => {
  describe('1. usePermission Hook', () => {
    it('evaluates exact permission matching', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          user: {
            id: 'user_1',
            email: 'teacher@school.edu',
            userType: UserType.TEACHER,
            tenantId: 'tenant_1',
            status: UserStatus.ACTIVE,
            roles: ['TEACHER'],
            permissions: ['student:read', 'attendance:mark'],
          },
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => usePermission(), { wrapper });

      expect(result.current.hasPermission('student:read')).toBe(true);
      expect(result.current.hasPermission('attendance:mark')).toBe(true);
      expect(result.current.hasPermission('fees:collect')).toBe(false);
      expect(result.current.hasRole('TEACHER')).toBe(true);
      expect(result.current.hasRole('ACCOUNTANT')).toBe(false);
    });

    it('evaluates wildcard permission matching (e.g. student:*)', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          user: {
            id: 'user_2',
            email: 'admin@school.edu',
            userType: UserType.STAFF,
            tenantId: 'tenant_1',
            status: UserStatus.ACTIVE,
            roles: ['STAFF'],
            permissions: ['student:*'],
          },
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => usePermission(), { wrapper });

      expect(result.current.hasPermission('student:read')).toBe(true);
      expect(result.current.hasPermission('student:create')).toBe(true);
      expect(result.current.hasPermission('student:delete')).toBe(true);
      expect(result.current.hasPermission('fee:collect')).toBe(false);
    });

    it('grants Super Admin all permissions regardless of permissions array', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          user: {
            id: 'super_1',
            email: 'superadmin@edusphere.io',
            userType: UserType.SUPER_ADMIN,
            tenantId: 'tenant_1',
            status: UserStatus.ACTIVE,
            roles: ['SUPER_ADMIN'],
            permissions: [],
          },
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => usePermission(), { wrapper });

      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.hasPermission('anything:read')).toBe(true);
      expect(result.current.hasPermission('critical:destroy')).toBe(true);
      expect(result.current.hasRole('ANY_ROLE')).toBe(true);
    });
  });

  describe('2. <Can> Declarative Component', () => {
    it('renders children when authorized by permission', () => {
      const state = {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'u1',
            email: 't@school.edu',
            userType: UserType.TEACHER,
            tenantId: 't1',
            status: UserStatus.ACTIVE,
            roles: ['TEACHER'],
            permissions: ['student:read'],
          },
        },
      };

      renderWithStore(
        <Can permission="student:read" fallback={<span>Denied</span>}>
          <button>View Student Details</button>
        </Can>,
        state
      );

      expect(screen.getByRole('button', { name: /View Student Details/i })).toBeInTheDocument();
      expect(screen.queryByText(/Denied/i)).not.toBeInTheDocument();
    });

    it('renders fallback when unauthorized', () => {
      const state = {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'u1',
            email: 't@school.edu',
            userType: UserType.TEACHER,
            tenantId: 't1',
            status: UserStatus.ACTIVE,
            roles: ['TEACHER'],
            permissions: ['student:read'],
          },
        },
      };

      renderWithStore(
        <Can permission="student:delete" fallback={<span>Delete Unauthorized</span>}>
          <button>Delete Student</button>
        </Can>,
        state
      );

      expect(screen.queryByRole('button', { name: /Delete Student/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Delete Unauthorized/i)).toBeInTheDocument();
    });
  });

  describe('3. <PermissionRoute> Guard', () => {
    it('redirects to /login when user is not authenticated', () => {
      renderRoutedApp('/roles', {
        auth: { isAuthenticated: false, user: null },
      });

      expect(screen.getByText(/Sign In to Your Account/i)).toBeInTheDocument();
    });

    it('redirects to /403 when user lacks required permission', () => {
      renderRoutedApp('/roles', {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'u_student',
            email: 'student@school.edu',
            userType: UserType.STUDENT,
            tenantId: 't1',
            status: UserStatus.ACTIVE,
            roles: ['STUDENT'],
            permissions: ['student:read'],
          },
        },
      });

      expect(screen.getByText(/Access Forbidden/i)).toBeInTheDocument();
      expect(screen.getByText(/403/i)).toBeInTheDocument();
    });

    it('renders RolesPage when user has rbac:manage / role:read permission', () => {
      renderRoutedApp('/roles', {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'u_admin',
            email: 'admin@school.edu',
            userType: UserType.SCHOOL_ADMIN,
            tenantId: 't1',
            status: UserStatus.ACTIVE,
            roles: ['SCHOOL_ADMIN'],
            permissions: ['rbac:manage', 'role:read', 'role:create'],
          },
        },
      });

      expect(screen.getByText(/Role-Based Access Control \(RBAC\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Custom Role/i })).toBeInTheDocument();
    });
  });
});
