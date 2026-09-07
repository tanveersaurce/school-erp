import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  globalLoading: boolean;
}

function getStoredTheme(): ThemeMode {
  if (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    typeof window.localStorage.getItem === 'function'
  ) {
    try {
      return (window.localStorage.getItem('edusphere-theme') as ThemeMode) || 'system';
    } catch {
      return 'system';
    }
  }
  return 'system';
}

function persistTheme(theme: ThemeMode): void {
  if (
    typeof window !== 'undefined' &&
    typeof window.localStorage !== 'undefined' &&
    typeof window.localStorage.setItem === 'function'
  ) {
    try {
      window.localStorage.setItem('edusphere-theme', theme);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }
}

const initialState: UIState = {
  theme: getStoredTheme(),
  sidebarOpen: true,
  globalLoading: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      persistTheme(action.payload);
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
  },
});

export const { setTheme, toggleSidebar, setSidebarOpen, setGlobalLoading } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
