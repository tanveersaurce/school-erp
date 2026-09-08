import { baseApi } from './api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  LoginResponse,
  RefreshResponse,
  AuthUserProfile,
  SessionSummary,
} from '@edusphere/types';

export interface LoginParams {
  email: string;
  password: string;
  tenantId?: string;
  rememberMe?: boolean;
}

export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordParams {
  token: string;
  newPassword: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<LoginResponse>, LoginParams>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'Session'],
    }),

    refresh: builder.mutation<ApiResponse<RefreshResponse>, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),

    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'Session'],
    }),

    logoutAll: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: '/auth/logout-all',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'Session'],
    }),

    getMe: builder.query<ApiResponse<{ user: AuthUserProfile; session: SessionSummary }>, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),

    getSessions: builder.query<ApiResponse<SessionSummary[]>, void>({
      query: () => '/auth/sessions',
      providesTags: ['Session'],
    }),

    revokeSession: builder.mutation<ApiResponse<null>, string>({
      query: (sessionId) => ({
        url: `/auth/sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),

    changePassword: builder.mutation<ApiResponse<null>, ChangePasswordParams>({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Session'],
    }),

    forgotPassword: builder.mutation<ApiResponse<null>, { email: string }>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),

    resetPassword: builder.mutation<ApiResponse<null>, ResetPasswordParams>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),

    verifyEmail: builder.mutation<ApiResponse<null>, { token: string }>({
      query: (body) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body,
      }),
    }),

    resendVerification: builder.mutation<ApiResponse<null>, { email: string }>({
      query: (body) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useLogoutAllMutation,
  useGetMeQuery,
  useGetSessionsQuery,
  useRevokeSessionMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
} = authApi;
