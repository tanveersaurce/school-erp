import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { store } from '../store/index.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import { ErrorBoundary } from '../components/common/ErrorBoundary.js';
import { routes } from '../routes/index.js';

function renderWithProviders(initialRoute = '/') {
  const testRouter = createMemoryRouter(routes, {
    initialEntries: [initialRoute],
  });

  return render(
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={testRouter} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

describe('Frontend Application Foundation Suite', () => {
  it('1. Application renders home page successfully with branded header and hero title', () => {
    renderWithProviders('/');

    const brandTitles = screen.getAllByText(/EduSphere/i);
    expect(brandTitles.length).toBeGreaterThanOrEqual(1);
    expect(brandTitles[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('2. Router navigates to /login page shell', () => {
    renderWithProviders('/login');

    expect(screen.getByText(/Authentication Foundation Shell/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero Mock Authentication Policy/i)).toBeInTheDocument();
  });

  it('3. Router displays 404 page for unmatched routes', () => {
    renderWithProviders('/non-existent-sample-route');

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });

  it('4. Global ErrorBoundary catches component crash and displays fallback recovery UI', () => {
    // Suppress expected console.error during component failure test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BrokenComponent(): React.JSX.Element {
      throw new Error('Simulated critical UI crash');
    }

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulated critical UI crash/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Application/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
