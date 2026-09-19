import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage.js';
import { UserType, UserStatus } from '@edusphere/common';

function createTestStore() {
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
        user: {
          id: 'user_001',
          email: 'admin@school.edu',
          userType: UserType.SCHOOL_ADMIN,
          status: UserStatus.ACTIVE,
          roles: ['SCHOOL_ADMIN'],
          permissions: ['audit:read'],
          tenantId: 'tenant_test',
          schoolId: 'school_test',
        },
        accessToken: 'mock_token',
        isAuthenticated: true,
        isInitialized: true,
        currentSession: null,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const store = createTestStore();
  return {
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>{ui}</BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    ),
    store,
  };
}

describe('AuditLogsPage UI Component Suite (Phase 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders Audit Trail & Compliance Ledger header with badge', async () => {
    renderWithProviders(<AuditLogsPage />);

    expect(
      screen.getByRole('heading', { name: /audit trail & compliance ledger/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/append-only/i)).toBeInTheDocument();
  });

  it('2. Renders all filter inputs (Action, Entity, Status, Actor Type, Dates)', async () => {
    renderWithProviders(<AuditLogsPage />);

    expect(screen.getByPlaceholderText(/e\.g\. update, enroll/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. student, exam/i)).toBeInTheDocument();
    expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
    expect(screen.getByText(/all actors/i)).toBeInTheDocument();
  });

  it('3. Renders table headers for compliance metadata', async () => {
    renderWithProviders(<AuditLogsPage />);

    expect(screen.getByRole('columnheader', { name: /^timestamp$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^actor$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^action$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^entity$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^entity id$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^status$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^client ip$/i })).toBeInTheDocument();
  });

  it('4. Updates filter inputs when typed into', async () => {
    renderWithProviders(<AuditLogsPage />);

    const actionInput = screen.getByPlaceholderText(/e\.g\. update, enroll/i) as HTMLInputElement;
    fireEvent.change(actionInput, { target: { value: 'STUDENT_ENROLLED' } });
    expect(actionInput.value).toBe('STUDENT_ENROLLED');

    const entityInput = screen.getByPlaceholderText(/e\.g\. student, exam/i) as HTMLInputElement;
    fireEvent.change(entityInput, { target: { value: 'STUDENT' } });
    expect(entityInput.value).toBe('STUDENT');

    // Reset button appears and clears filters
    const resetButton = screen.getByText(/reset all filters/i);
    expect(resetButton).toBeInTheDocument();
    fireEvent.click(resetButton);
    expect(actionInput.value).toBe('');
    expect(entityInput.value).toBe('');
  });
});
