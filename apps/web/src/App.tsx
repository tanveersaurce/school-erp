import React from 'react';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from './store/index.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { ToastProvider } from './components/common/Toast.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { router } from './routes/index.js';

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
