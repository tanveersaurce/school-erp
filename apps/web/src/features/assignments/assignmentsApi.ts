import { baseApi } from '../../services/api.js';
import type { ApiResponse, StudentAssignmentStatus } from '@edusphere/common';
import type {
  AssignmentResponseDto,
  SubmissionResponseDto,
  StudentAssignmentSummaryDto,
  TeacherAssignmentDashboardDto,
  StudentAssignmentDashboardDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  DraftSubmissionDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  AssignmentQueryFilters,
  SubmissionQueryFilters,
} from '@edusphere/types';

export const assignmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =========================================================================
    // 1. Assignment Management
    // =========================================================================
    getAssignments: builder.query<ApiResponse<AssignmentResponseDto[]>, AssignmentQueryFilters | void>({
      query: (params) => ({
        url: '/assignments',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: (result) =>
        result && result.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Assignment' as const, id })),
              { type: 'Assignment', id: 'LIST' },
            ]
          : [{ type: 'Assignment', id: 'LIST' }],
    }),

    getAssignmentById: builder.query<ApiResponse<AssignmentResponseDto>, string>({
      query: (id) => ({
        url: `/assignments/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Assignment', id }],
    }),

    createAssignment: builder.mutation<ApiResponse<AssignmentResponseDto>, CreateAssignmentDto>({
      query: (body) => ({
        url: '/assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Assignment', id: 'LIST' }],
    }),

    updateAssignment: builder.mutation<
      ApiResponse<AssignmentResponseDto>,
      { id: string; data: UpdateAssignmentDto }
    >({
      query: ({ id, data }) => ({
        url: `/assignments/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),

    deleteAssignment: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/assignments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Assignment', id: 'LIST' }],
    }),

    publishAssignment: builder.mutation<ApiResponse<AssignmentResponseDto>, string>({
      query: (id) => ({
        url: `/assignments/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),

    closeAssignment: builder.mutation<ApiResponse<AssignmentResponseDto>, string>({
      query: (id) => ({
        url: `/assignments/${id}/close`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),

    archiveAssignment: builder.mutation<ApiResponse<AssignmentResponseDto>, string>({
      query: (id) => ({
        url: `/assignments/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),

    // =========================================================================
    // 2. Student & Parent Queries & Submissions
    // =========================================================================
    getMyAssignments: builder.query<
      ApiResponse<StudentAssignmentSummaryDto[]>,
      { status?: StudentAssignmentStatus; subjectId?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/assignments/student/my-assignments',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Assignment', 'AssignmentSubmission'],
    }),

    getChildAssignments: builder.query<
      ApiResponse<StudentAssignmentSummaryDto[]>,
      { studentId: string; status?: StudentAssignmentStatus }
    >({
      query: ({ studentId, status }) => ({
        url: `/assignments/student/${studentId}`,
        method: 'GET',
        params: status ? { status } : undefined,
      }),
      providesTags: ['Assignment', 'AssignmentSubmission'],
    }),

    saveDraftSubmission: builder.mutation<
      ApiResponse<SubmissionResponseDto>,
      { assignmentId: string; data: DraftSubmissionDto }
    >({
      query: ({ assignmentId, data }) => ({
        url: `/assignments/${assignmentId}/submissions/draft`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AssignmentSubmission'],
    }),

    submitAssignment: builder.mutation<
      ApiResponse<SubmissionResponseDto>,
      { assignmentId: string; data: SubmitAssignmentDto }
    >({
      query: ({ assignmentId, data }) => ({
        url: `/assignments/${assignmentId}/submissions/submit`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AssignmentSubmission', { type: 'Assignment', id: 'LIST' }],
    }),

    // =========================================================================
    // 3. Submissions & Grading Management
    // =========================================================================
    getSubmissions: builder.query<
      ApiResponse<SubmissionResponseDto[]>,
      { assignmentId: string; filters?: SubmissionQueryFilters }
    >({
      query: ({ assignmentId, filters }) => ({
        url: `/assignments/${assignmentId}/submissions`,
        method: 'GET',
        params: filters,
      }),
      providesTags: (result) =>
        result && result.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'AssignmentSubmission' as const, id })),
              { type: 'AssignmentSubmission', id: 'LIST' },
            ]
          : [{ type: 'AssignmentSubmission', id: 'LIST' }],
    }),

    getSubmissionById: builder.query<
      ApiResponse<SubmissionResponseDto>,
      { assignmentId: string; submissionId: string }
    >({
      query: ({ assignmentId, submissionId }) => ({
        url: `/assignments/${assignmentId}/submissions/${submissionId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, { submissionId }) => [
        { type: 'AssignmentSubmission', id: submissionId },
      ],
    }),

    gradeSubmission: builder.mutation<
      ApiResponse<SubmissionResponseDto>,
      { assignmentId: string; submissionId: string; data: GradeSubmissionDto }
    >({
      query: ({ assignmentId, submissionId, data }) => ({
        url: `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { submissionId }) => [
        { type: 'AssignmentSubmission', id: submissionId },
        { type: 'AssignmentSubmission', id: 'LIST' },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),

    returnSubmission: builder.mutation<
      ApiResponse<SubmissionResponseDto>,
      { assignmentId: string; submissionId: string; data: ReturnSubmissionDto }
    >({
      query: ({ assignmentId, submissionId, data }) => ({
        url: `/assignments/${assignmentId}/submissions/${submissionId}/return`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { submissionId }) => [
        { type: 'AssignmentSubmission', id: submissionId },
        { type: 'AssignmentSubmission', id: 'LIST' },
      ],
    }),

    // =========================================================================
    // 4. Dashboards
    // =========================================================================
    getTeacherDashboard: builder.query<ApiResponse<TeacherAssignmentDashboardDto>, void>({
      query: () => ({
        url: '/assignments/dashboard/teacher',
        method: 'GET',
      }),
      providesTags: ['Assignment', 'AssignmentSubmission'],
    }),

    getStudentDashboard: builder.query<ApiResponse<StudentAssignmentDashboardDto>, void>({
      query: () => ({
        url: '/assignments/dashboard/student',
        method: 'GET',
      }),
      providesTags: ['Assignment', 'AssignmentSubmission'],
    }),
  }),
});

export const {
  useGetAssignmentsQuery,
  useGetAssignmentByIdQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  usePublishAssignmentMutation,
  useCloseAssignmentMutation,
  useArchiveAssignmentMutation,
  useGetMyAssignmentsQuery,
  useGetChildAssignmentsQuery,
  useSaveDraftSubmissionMutation,
  useSubmitAssignmentMutation,
  useGetSubmissionsQuery,
  useGetSubmissionByIdQuery,
  useGradeSubmissionMutation,
  useReturnSubmissionMutation,
  useGetTeacherDashboardQuery,
  useGetStudentDashboardQuery,
} = assignmentsApi;
