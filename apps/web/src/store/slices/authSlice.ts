import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthUserProfile, SessionSummary } from '@edusphere/types';

export interface AuthState {
  accessToken: string | null;
  user: AuthUserProfile | null;
  currentSession: SessionSummary | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  currentSession: null,
  isAuthenticated: false,
  isInitialized: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        user: AuthUserProfile;
        session?: SessionSummary;
      }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      if (action.payload.session) {
        state.currentSession = action.payload.session;
      }
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.isAuthenticated = true;
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.user = null;
      state.currentSession = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
  },
});

export const { setCredentials, setAccessToken, clearCredentials, setInitialized } =
  authSlice.actions;

export const authReducer = authSlice.reducer;
