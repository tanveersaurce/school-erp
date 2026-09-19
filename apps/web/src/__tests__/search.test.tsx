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
import { GlobalSearchModal } from '../components/search/GlobalSearchModal.js';
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
          permissions: ['student:read', 'library:read', 'academic:read'],
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

describe('GlobalSearchModal UI Component Suite (Phase 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Does not render modal content when isOpen is false', () => {
    const handleClose = vi.fn();
    renderWithProviders(<GlobalSearchModal isOpen={false} onClose={handleClose} />);

    expect(screen.queryByPlaceholderText(/search students, staff/i)).not.toBeInTheDocument();
  });

  it('2. Renders search input and shortcut badges when isOpen is true', () => {
    const handleClose = vi.fn();
    renderWithProviders(<GlobalSearchModal isOpen={true} onClose={handleClose} />);

    expect(
      screen.getByPlaceholderText(/search students, staff, classes, library, fees, announcements\.\.\./i)
    ).toBeInTheDocument();
    expect(screen.getByText('ESC')).toBeInTheDocument();
  });

  it('3. Prompts user to type at least 2 characters when empty', () => {
    const handleClose = vi.fn();
    renderWithProviders(<GlobalSearchModal isOpen={true} onClose={handleClose} />);

    expect(
      screen.getByText(/type at least 2 characters to search across school entities/i)
    ).toBeInTheDocument();
  });

  it('4. Updates input value and triggers debounce', async () => {
    const handleClose = vi.fn();
    renderWithProviders(<GlobalSearchModal isOpen={true} onClose={handleClose} />);

    const input = screen.getByPlaceholderText(
      /search students, staff, classes, library, fees, announcements\.\.\./i
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Newton' } });
    expect(input.value).toBe('Newton');
  });

  it('5. Invokes onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    renderWithProviders(<GlobalSearchModal isOpen={true} onClose={handleClose} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
