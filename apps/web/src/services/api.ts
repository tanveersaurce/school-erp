import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { ApiResponse } from '@edusphere/common';
import type { RefreshResponse } from '@edusphere/types';
import type { RootState } from '../store/index.js';
import { setAccessToken, clearCredentials } from '../store/slices/authSlice.js';

export interface HealthData {
  status: string;
  environment?: string;
  uptimeSeconds?: number;
  checks?: {
    server: string;
    database: string;
    redis: string;
  };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include', // Automatically attaches HttpOnly cookies (refreshToken)
  prepareHeaders: (headers, { getState }) => {
    // Inject Client Request ID for correlation
    headers.set(
      'X-Request-ID',
      `req_client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );

    // Retrieve active access token from Redux auth slice or fallback
    const state = getState() as RootState;
    const token = state?.auth?.accessToken || sessionStorage.getItem('accessToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const url = typeof args === 'string' ? args : args.url;
    // Do not attempt silent refresh on login or refresh endpoint failures
    if (!url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      const refreshResult = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST' },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const payload = refreshResult.data as ApiResponse<RefreshResponse>;
        if (payload.success && payload.data?.accessToken) {
          api.dispatch(setAccessToken(payload.data.accessToken));
          sessionStorage.setItem('accessToken', payload.data.accessToken);

          // Retry the original query with the refreshed access token
          result = await rawBaseQuery(args, api, extraOptions);
        } else {
          api.dispatch(clearCredentials());
          sessionStorage.removeItem('accessToken');
        }
      } else {
        api.dispatch(clearCredentials());
        sessionStorage.removeItem('accessToken');
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Health', 'Auth', 'User', 'Tenant', 'Session'],
  endpoints: (builder) => ({
    getHealth: builder.query<ApiResponse<HealthData>, void>({
      query: () => '/health/readiness',
      providesTags: ['Health'],
    }),
    getLiveness: builder.query<ApiResponse<HealthData>, void>({
      query: () => '/health/liveness',
      providesTags: ['Health'],
    }),
  }),
});

export const { useGetHealthQuery, useGetLivenessQuery } = baseApi;
