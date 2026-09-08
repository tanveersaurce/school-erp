import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import { routes } from '../routes/index.js';
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

function renderAuthApp(initialRoute = '/login', preloadedState?: any) {
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

describe('Frontend Authentication UI & Session Management Suite (Phase 3)', () => {
  it('1. LoginPage renders form controls: email, password, remember me, and links', () => {
    renderAuthApp('/login');

    expect(screen.getByText(/Sign In to Your Account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Remember this device/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Forgot password\?/i })).toBeInTheDocument();
  });

  it('2. ForgotPasswordPage renders email input and submit action', () => {
    renderAuthApp('/forgot-password');

    expect(screen.getByText(/Reset Your Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Reset Instructions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Sign In/i })).toBeInTheDocument();
  });

  it('3. ResetPasswordPage renders password complexity requirements and inputs', () => {
    renderAuthApp('/reset-password?token=mock_sample_token_123456');

    expect(screen.getByText(/Create New Credentials/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Minimum 8 characters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Password/i })).toBeInTheDocument();
  });

  it('4. VerifyEmailPage notifies user when no token is present in URL', () => {
    renderAuthApp('/verify-email');

    expect(screen.getByText(/Identity Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/No verification token was detected/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Proceed to Sign In/i })).toBeInTheDocument();
  });

  it('5. ProtectedRoute redirects unauthenticated visitors from /sessions to /login', async () => {
    renderAuthApp('/sessions', {
      auth: {
        accessToken: null,
        user: null,
        currentSession: null,
        isAuthenticated: false,
        isInitialized: true,
      },
    });

    // Should redirect and show LoginPage
    expect(await screen.findByText(/Sign In to Your Account/i)).toBeInTheDocument();
    expect(screen.queryByText(/Connected Devices & Sessions/i)).not.toBeInTheDocument();
  });

  it('6. ProtectedRoute allows authenticated users to access /sessions', () => {
    renderAuthApp('/sessions', {
      auth: {
        accessToken: 'mock_jwt_token_xyz',
        user: {
          id: 'user_123',
          email: 'admin@greenwood.edu',
          userType: UserType.SCHOOL_ADMIN,
          tenantId: 'tenant_123',
          status: UserStatus.ACTIVE,
        },
        currentSession: {
          id: 'sess_123',
          deviceName: 'Windows Browser',
          ipAddress: '127.0.0.1',
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true,
        },
        isAuthenticated: true,
        isInitialized: true,
      },
    });

    expect(screen.getByRole('heading', { level: 1, name: /Active Sessions/i })).toBeInTheDocument();
    expect(screen.getByText(/admin@greenwood.edu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
  });
});
