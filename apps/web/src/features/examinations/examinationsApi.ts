import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  IExam,
  IExamSchedule,
  IMarkCorrection,
  IResult,
  IGradingScheme,
  IScheduleConflictCheck,
  IScheduleConflictCheckResult,
  IBulkMarksEntryDto,
} from '@edusphere/types';
import type { ExamStatus, ExamType, MarkStatus } from '@edusphere/common';

export interface ExamDashboardKPIs {
  totalExams: number;
  scheduledExams: number;
  ongoingExams: number;
  resultsPending: number;
  publishedExams: number;
}

export interface ExamQueryFilters {
  academicYearId?: string;
  campusId?: string;
  status?: ExamStatus | string;
  examType?: ExamType | string;
  academicClassId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateExamDto {
  academicYearId: string;
  campusId?: string;
  title: string;
  code?: string;
  description?: string;
  examType: ExamType | string;
  startDate: string;
  endDate: string;
  academicClassIds?: string[];
  gradingSchemeId?: string;
  passingPercentage?: number;
  weightagePercentage?: number;
}

export interface CreateExamScheduleDto {
  examId: string;
  academicClassId: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room?: string;
  roomId?: string;
  invigilatorId?: string;
  maxMarks: number;
  passMarks: number;
}

export interface RosterStudentEntry {
  studentId: string;
  rollNumber?: number;
  admissionNumber?: string;
  name: string;
  markId?: string;
  marksObtained: number | null;
  status: MarkStatus;
  grade?: string;
  percentage?: number;
  remarks?: string;
  isLocked?: boolean;
  isVerified?: boolean;
}

export interface MarksRosterResponse {
  exam: { id: string; title: string; status: ExamStatus };
  academicClassId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
  isSubjectLocked: boolean;
  isSubjectVerified: boolean;
  students: RosterStudentEntry[];
}

export const examinationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =========================================================================
    // 1. Dashboard & Statistics
    // =========================================================================
    getExamDashboardKPIs: builder.query<ApiResponse<ExamDashboardKPIs>, void>({
      query: () => ({
        url: '/examinations/dashboard',
        method: 'GET',
      }),
      providesTags: ['Exam'],
    }),

    // =========================================================================
    // 2. Exam Master Management
    // =========================================================================
    getExams: builder.query<ApiResponse<IExam[]>, ExamQueryFilters | void>({
      query: (params) => ({
        url: '/examinations',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Exam' as const, id })),
              { type: 'Exam', id: 'LIST' },
            ]
          : [{ type: 'Exam', id: 'LIST' }],
    }),

    getExamById: builder.query<ApiResponse<IExam>, string>({
      query: (id) => ({
        url: `/examinations/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Exam', id }],
    }),

    createExam: builder.mutation<ApiResponse<IExam>, CreateExamDto>({
      query: (body) => ({
        url: '/examinations',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Exam', id: 'LIST' }],
    }),

    updateExam: builder.mutation<ApiResponse<IExam>, { id: string; data: Partial<CreateExamDto> }>({
      query: ({ id, data }) => ({
        url: `/examinations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Exam', id },
        { type: 'Exam', id: 'LIST' },
      ],
    }),

    transitionExamStatus: builder.mutation<
      ApiResponse<IExam>,
      { id: string; status: ExamStatus | string }
    >({
      query: ({ id, status }) => ({
        url: `/examinations/${id}/status`,
        method: 'POST',
        body: { status },
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Exam', id },
        { type: 'Exam', id: 'LIST' },
      ],
    }),

    deleteExam: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/examinations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Exam', id: 'LIST' }],
    }),

    // =========================================================================
    // 3. Grading Schemes
    // =========================================================================
    getGradingSchemes: builder.query<ApiResponse<IGradingScheme[]>, void>({
      query: () => ({
        url: '/examinations/grading-schemes',
        method: 'GET',
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'GradingScheme' as const, id })),
              { type: 'GradingScheme', id: 'LIST' },
            ]
          : [{ type: 'GradingScheme', id: 'LIST' }],
    }),

    getGradingSchemeById: builder.query<ApiResponse<IGradingScheme>, string>({
      query: (id) => ({
        url: `/examinations/grading-schemes/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'GradingScheme', id }],
    }),

    createGradingScheme: builder.mutation<ApiResponse<IGradingScheme>, Partial<IGradingScheme>>({
      query: (body) => ({
        url: '/examinations/grading-schemes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'GradingScheme', id: 'LIST' }],
    }),

    // =========================================================================
    // 4. Exam Schedules & Conflict Detection
    // =========================================================================
    getExamSchedules: builder.query<ApiResponse<IExamSchedule[]>, string>({
      query: (examId) => ({
        url: `/examinations/${examId}/schedules`,
        method: 'GET',
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'ExamSchedule' as const, id })),
              { type: 'ExamSchedule', id: 'LIST' },
            ]
          : [{ type: 'ExamSchedule', id: 'LIST' }],
    }),

    createExamSchedule: builder.mutation<ApiResponse<IExamSchedule>, CreateExamScheduleDto>({
      query: (body) => ({
        url: '/examinations/schedules',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ExamSchedule', id: 'LIST' }],
    }),

    deleteExamSchedule: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (scheduleId) => ({
        url: `/examinations/schedules/${scheduleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ExamSchedule', id: 'LIST' }],
    }),

    checkScheduleConflicts: builder.mutation<
      ApiResponse<IScheduleConflictCheckResult>,
      IScheduleConflictCheck
    >({
      query: (body) => ({
        url: '/examinations/schedules/check-conflict',
        method: 'POST',
        body,
      }),
    }),

    // =========================================================================
    // 5. Marks Entry, Verification, Locking & Corrections
    // =========================================================================
    getMarksRoster: builder.query<
      ApiResponse<MarksRosterResponse>,
      { examId: string; academicClassId: string; subjectId: string }
    >({
      query: (params) => ({
        url: '/examinations/marks/roster',
        method: 'GET',
        params,
      }),
      providesTags: ['ExamMark'],
    }),

    enterBulkMarks: builder.mutation<ApiResponse<{ inserted: number; updated: number }>, IBulkMarksEntryDto>({
      query: (body) => ({
        url: '/examinations/marks/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ExamMark', 'Result'],
    }),

    verifyMarks: builder.mutation<
      ApiResponse<{ verifiedCount: number }>,
      { examId: string; academicClassId: string; subjectId: string }
    >({
      query: (body) => ({
        url: '/examinations/marks/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ExamMark'],
    }),

    lockMarks: builder.mutation<
      ApiResponse<{ lockedCount: number }>,
      { examId: string; academicClassId: string; subjectId: string }
    >({
      query: (body) => ({
        url: '/examinations/marks/lock',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ExamMark'],
    }),

    requestMarkCorrection: builder.mutation<
      ApiResponse<IMarkCorrection>,
      { markId: string; data: { newMarks?: number | null; newStatus: MarkStatus; reason: string } }
    >({
      query: ({ markId, data }) => ({
        url: `/examinations/marks/${markId}/correction`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ExamMark'],
    }),

    reviewMarkCorrection: builder.mutation<
      ApiResponse<IMarkCorrection>,
      { correctionId: string; data: { status: 'APPROVED' | 'REJECTED' } }
    >({
      query: ({ correctionId, data }) => ({
        url: `/examinations/marks/corrections/${correctionId}/review`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ExamMark', 'Result'],
    }),

    // =========================================================================
    // 6. Results Calculation, Approval & Publishing
    // =========================================================================
    calculateResults: builder.mutation<
      ApiResponse<{ calculatedCount: number }>,
      { examId: string; academicClassId?: string }
    >({
      query: ({ examId, academicClassId }) => ({
        url: `/examinations/${examId}/results/calculate`,
        method: 'POST',
        body: { academicClassId },
      }),
      invalidatesTags: ['Result', 'Exam'],
    }),

    approveResults: builder.mutation<
      ApiResponse<{ approvedCount: number }>,
      { examId: string; academicClassId?: string }
    >({
      query: ({ examId, academicClassId }) => ({
        url: `/examinations/${examId}/results/approve`,
        method: 'POST',
        body: { academicClassId },
      }),
      invalidatesTags: ['Result', 'Exam'],
    }),

    publishResults: builder.mutation<
      ApiResponse<{ publishedCount: number }>,
      { examId: string; academicClassId?: string }
    >({
      query: ({ examId, academicClassId }) => ({
        url: `/examinations/${examId}/results/publish`,
        method: 'POST',
        body: { academicClassId },
      }),
      invalidatesTags: ['Result', 'Exam'],
    }),

    getResults: builder.query<ApiResponse<IResult[]>, { examId: string; academicClassId?: string }>({
      query: ({ examId, academicClassId }) => ({
        url: `/examinations/${examId}/results`,
        method: 'GET',
        params: academicClassId ? { academicClassId } : undefined,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Result' as const, id })),
              { type: 'Result', id: 'LIST' },
            ]
          : [{ type: 'Result', id: 'LIST' }],
    }),

    // =========================================================================
    // 7. Student & Parent Results Access
    // =========================================================================
    getMyResults: builder.query<ApiResponse<IResult[]>, { examId?: string } | void>({
      query: (params) => ({
        url: '/examinations/my-results',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Result'],
    }),

    getParentChildResults: builder.query<
      ApiResponse<IResult[]>,
      { studentId: string; examId?: string }
    >({
      query: ({ studentId, examId }) => ({
        url: `/examinations/parent/child/${studentId}/results`,
        method: 'GET',
        params: examId ? { examId } : undefined,
      }),
      providesTags: ['Result'],
    }),

    getStudentResults: builder.query<
      ApiResponse<IResult[]>,
      { studentId: string; examId?: string }
    >({
      query: ({ studentId, examId }) => ({
        url: `/examinations/results/student/${studentId}`,
        method: 'GET',
        params: examId ? { examId } : undefined,
      }),
      providesTags: ['Result'],
    }),
  }),
});

export const {
  useGetExamDashboardKPIsQuery,
  useGetExamsQuery,
  useGetExamByIdQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useTransitionExamStatusMutation,
  useDeleteExamMutation,
  useGetGradingSchemesQuery,
  useGetGradingSchemeByIdQuery,
  useCreateGradingSchemeMutation,
  useGetExamSchedulesQuery,
  useCreateExamScheduleMutation,
  useDeleteExamScheduleMutation,
  useCheckScheduleConflictsMutation,
  useGetMarksRosterQuery,
  useEnterBulkMarksMutation,
  useVerifyMarksMutation,
  useLockMarksMutation,
  useRequestMarkCorrectionMutation,
  useReviewMarkCorrectionMutation,
  useCalculateResultsMutation,
  useApproveResultsMutation,
  usePublishResultsMutation,
  useGetResultsQuery,
  useGetMyResultsQuery,
  useGetParentChildResultsQuery,
  useGetStudentResultsQuery,
} = examinationsApi;
