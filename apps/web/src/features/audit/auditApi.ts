import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type { IAuditLog, AuditLogListResponse, AuditLogQueryFilters } from '@edusphere/types';

export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<ApiResponse<AuditLogListResponse>, AuditLogQueryFilters | void>({
      query: (params) => ({
        url: '/audit-logs',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['AuditLogs'],
    }),

    getResourceAuditHistory: builder.query<
      ApiResponse<AuditLogListResponse>,
      { entity: string; entityId: string; page?: number; limit?: number }
    >({
      query: ({ entity, entityId, page, limit }) => ({
        url: `/audit-logs/resource/${entity}/${entityId}`,
        method: 'GET',
        params: { page, limit },
      }),
      providesTags: ['AuditLogs'],
    }),

    getAuditLogById: builder.query<ApiResponse<IAuditLog>, string>({
      query: (id) => ({
        url: `/audit-logs/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'AuditLogs', id }],
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetResourceAuditHistoryQuery,
  useGetAuditLogByIdQuery,
} = auditApi;
