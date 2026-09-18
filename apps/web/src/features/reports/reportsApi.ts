import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  IReportDefinition,
  IReportResult,
  IReportExportJob,
  IScheduledReport,
  IDashboardOverview,
  ReportCategory,
} from '@edusphere/types';

export interface RunReportParams {
  key: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  schoolId?: string;
  refreshCache?: boolean;
}

export interface CreateExportJobParams {
  reportKey: string;
  format?: 'CSV' | 'JSON';
  filters?: Record<string, any>;
  schoolId?: string;
}

export interface CreateScheduledReportParams {
  name: string;
  description?: string;
  reportKey: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'TERM';
  format?: 'CSV' | 'JSON';
  filters?: Record<string, any>;
  recipients: string[];
  isActive?: boolean;
}

export interface UpdateScheduledReportParams {
  id: string;
  data: Partial<CreateScheduledReportParams>;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------------------------------------------------------------
    // 1. Executive Dashboard Overview
    // -------------------------------------------------------------------------
    getDashboardOverview: builder.query<
      ApiResponse<IDashboardOverview>,
      { schoolId?: string } | void
    >({
      query: (params) => ({
        url: '/reports/dashboard',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Reports'],
    }),

    // -------------------------------------------------------------------------
    // 2. Report Definitions Catalog
    // -------------------------------------------------------------------------
    getReportDefinitions: builder.query<
      ApiResponse<IReportDefinition[]>,
      { category?: ReportCategory } | void
    >({
      query: (params) => ({
        url: '/reports/definitions',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Reports'],
    }),

    getReportDefinitionByKey: builder.query<
      ApiResponse<IReportDefinition>,
      string
    >({
      query: (key) => ({
        url: `/reports/definitions/${key}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, key) => [{ type: 'Reports', id: key }],
    }),

    // -------------------------------------------------------------------------
    // 3. Report Query Execution
    // -------------------------------------------------------------------------
    runReport: builder.mutation<ApiResponse<IReportResult>, RunReportParams>({
      query: ({ key, ...payload }) => ({
        url: `/reports/run/${key}`,
        method: 'POST',
        body: payload,
      }),
    }),

    // -------------------------------------------------------------------------
    // 4. Background Export Jobs
    // -------------------------------------------------------------------------
    listExportJobs: builder.query<ApiResponse<IReportExportJob[]>, void>({
      query: () => ({
        url: '/reports/exports',
        method: 'GET',
      }),
      providesTags: ['ReportExports'],
    }),

    getExportJob: builder.query<ApiResponse<IReportExportJob>, string>({
      query: (id) => ({
        url: `/reports/exports/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'ReportExports', id }],
    }),

    createExportJob: builder.mutation<
      ApiResponse<IReportExportJob>,
      CreateExportJobParams
    >({
      query: (payload) => ({
        url: '/reports/exports',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['ReportExports'],
    }),

    // -------------------------------------------------------------------------
    // 5. Scheduled Reports Management
    // -------------------------------------------------------------------------
    listScheduledReports: builder.query<ApiResponse<IScheduledReport[]>, void>({
      query: () => ({
        url: '/reports/scheduled',
        method: 'GET',
      }),
      providesTags: ['ScheduledReports'],
    }),

    getScheduledReport: builder.query<ApiResponse<IScheduledReport>, string>({
      query: (id) => ({
        url: `/reports/scheduled/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'ScheduledReports', id }],
    }),

    createScheduledReport: builder.mutation<
      ApiResponse<IScheduledReport>,
      CreateScheduledReportParams
    >({
      query: (payload) => ({
        url: '/reports/scheduled',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['ScheduledReports'],
    }),

    updateScheduledReport: builder.mutation<
      ApiResponse<IScheduledReport>,
      UpdateScheduledReportParams
    >({
      query: ({ id, data }) => ({
        url: `/reports/scheduled/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['ScheduledReports'],
    }),

    deleteScheduledReport: builder.mutation<ApiResponse<{ deleted: boolean }>, string>({
      query: (id) => ({
        url: `/reports/scheduled/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ScheduledReports'],
    }),

    triggerScheduledReport: builder.mutation<
      ApiResponse<IReportExportJob>,
      string
    >({
      query: (id) => ({
        url: `/reports/scheduled/${id}/run`,
        method: 'POST',
      }),
      invalidatesTags: ['ScheduledReports', 'ReportExports'],
    }),
  }),
});

export const {
  useGetDashboardOverviewQuery,
  useGetReportDefinitionsQuery,
  useGetReportDefinitionByKeyQuery,
  useRunReportMutation,
  useListExportJobsQuery,
  useGetExportJobQuery,
  useCreateExportJobMutation,
  useListScheduledReportsQuery,
  useGetScheduledReportQuery,
  useCreateScheduledReportMutation,
  useUpdateScheduledReportMutation,
  useDeleteScheduledReportMutation,
  useTriggerScheduledReportMutation,
} = reportsApi;
