import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  IStudentAttendance,
  IAttendanceCorrection,
  IHoliday,
  MarkDailyAttendanceInput,
  MarkPeriodAttendanceInput,
  ReviewCorrectionInput,
  CreateHolidayInput,
  AttendanceQueryFilters,
  StudentAttendanceSummaryDto,
  ClassAttendanceSummaryDto,
  MonthlyAttendanceMatrixDto,
  LowAttendanceReportDto,
  DailyCampusAttendanceSummaryDto,
} from '@edusphere/types';

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =======================================================================
    // 1. Attendance Marking & Lifecycle
    // =======================================================================
    markDailyAttendance: builder.mutation<ApiResponse<IStudentAttendance>, MarkDailyAttendanceInput>({
      query: (body) => ({
        url: '/attendance/daily',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance'],
    }),

    markPeriodAttendance: builder.mutation<ApiResponse<IStudentAttendance>, MarkPeriodAttendanceInput>({
      query: (body) => ({
        url: '/attendance/period',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance'],
    }),

    getAttendanceRegister: builder.query<
      ApiResponse<{ data: IStudentAttendance[]; total: number; page: number; limit: number }>,
      AttendanceQueryFilters | void
    >({
      query: (params) => ({
        url: '/attendance/register',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Attendance'],
    }),

    getAttendanceSheet: builder.query<
      ApiResponse<{
        session?: IStudentAttendance;
        academicClass: any;
        enrolledStudents: { id: string; name: string; rollNumber?: number; admissionNumber?: string }[];
        isNonWorkingDay: boolean;
        nonWorkingReason?: string;
      }>,
      { academicClassId: string; date: string; periodId?: string }
    >({
      query: (params) => ({
        url: '/attendance/sheet',
        method: 'GET',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    getAttendanceById: builder.query<ApiResponse<IStudentAttendance>, string>({
      query: (id) => ({
        url: `/attendance/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Attendance', id }],
    }),

    submitAttendance: builder.mutation<ApiResponse<IStudentAttendance>, string>({
      query: (id) => ({
        url: `/attendance/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => ['Attendance', { type: 'Attendance', id }],
    }),

    approveAttendance: builder.mutation<ApiResponse<IStudentAttendance>, string>({
      query: (id) => ({
        url: `/attendance/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => ['Attendance', { type: 'Attendance', id }],
    }),

    lockAttendance: builder.mutation<ApiResponse<IStudentAttendance>, string>({
      query: (id) => ({
        url: `/attendance/${id}/lock`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => ['Attendance', { type: 'Attendance', id }],
    }),

    // =======================================================================
    // 2. Corrections Workflow & Audit Trail
    // =======================================================================
    requestCorrection: builder.mutation<
      ApiResponse<IAttendanceCorrection | IStudentAttendance>,
      { id: string; body: { studentId: string; newStatus: string; reason: string } }
    >({
      query: ({ id, body }) => ({
        url: `/attendance/${id}/correction`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance', 'AttendanceCorrection'],
    }),

    reviewCorrection: builder.mutation<
      ApiResponse<IAttendanceCorrection>,
      { correctionId: string; body: ReviewCorrectionInput }
    >({
      query: ({ correctionId, body }) => ({
        url: `/attendance/corrections/${correctionId}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendance', 'AttendanceCorrection'],
    }),

    getPendingCorrections: builder.query<
      ApiResponse<{ data: IAttendanceCorrection[]; total: number }>,
      { campusId?: string; academicYearId?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/attendance/corrections/pending',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['AttendanceCorrection'],
    }),

    // =======================================================================
    // 3. Summaries, Matrices & Reports
    // =======================================================================
    getStudentSummary: builder.query<
      ApiResponse<StudentAttendanceSummaryDto>,
      { studentId: string; academicYearId?: string; startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: '/attendance/summary/student',
        method: 'GET',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    getClassSummary: builder.query<
      ApiResponse<ClassAttendanceSummaryDto>,
      { academicClassId: string; date?: string }
    >({
      query: (params) => ({
        url: '/attendance/summary/class',
        method: 'GET',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    getMonthlyMatrix: builder.query<
      ApiResponse<MonthlyAttendanceMatrixDto>,
      { academicClassId: string; year: number; month: number }
    >({
      query: (params) => ({
        url: '/attendance/matrix/monthly',
        method: 'GET',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    getLowAttendanceReport: builder.query<
      ApiResponse<LowAttendanceReportDto>,
      { academicYearId?: string; campusId?: string; threshold?: number }
    >({
      query: (params) => ({
        url: '/attendance/reports/low-attendance',
        method: 'GET',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    getDailyCampusReport: builder.query<
      ApiResponse<DailyCampusAttendanceSummaryDto>,
      { date: string; campusId?: string }
    >({
      query: (params) => ({
        url: '/attendance/reports/campus-daily',
        method: 'GET',
        params,
      }),
      providesTags: ['Attendance'],
    }),

    // =======================================================================
    // 4. Holidays & Calendar
    // =======================================================================
    getHolidays: builder.query<
      ApiResponse<IHoliday[]>,
      { academicYearId?: string; campusId?: string; startDate?: string; endDate?: string } | void
    >({
      query: (params) => ({
        url: '/attendance/holidays',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Holiday'],
    }),

    createHoliday: builder.mutation<ApiResponse<IHoliday>, CreateHolidayInput>({
      query: (body) => ({
        url: '/attendance/holidays',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Holiday'],
    }),

    deleteHoliday: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/attendance/holidays/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Holiday'],
    }),
  }),
});

export const {
  useMarkDailyAttendanceMutation,
  useMarkPeriodAttendanceMutation,
  useGetAttendanceRegisterQuery,
  useGetAttendanceSheetQuery,
  useGetAttendanceByIdQuery,
  useSubmitAttendanceMutation,
  useApproveAttendanceMutation,
  useLockAttendanceMutation,
  useRequestCorrectionMutation,
  useReviewCorrectionMutation,
  useGetPendingCorrectionsQuery,
  useGetStudentSummaryQuery,
  useGetClassSummaryQuery,
  useGetMonthlyMatrixQuery,
  useGetLowAttendanceReportQuery,
  useGetDailyCampusReportQuery,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
} = attendanceApi;
