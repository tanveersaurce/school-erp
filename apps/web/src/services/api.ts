import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ApiResponse } from '@edusphere/common';

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

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers) => {
      // Inject Client Request ID for tracing
      headers.set(
        'X-Request-ID',
        `req_client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      );

      // Future authentication token preparation
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ['Health', 'Auth', 'User', 'Tenant'],
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
