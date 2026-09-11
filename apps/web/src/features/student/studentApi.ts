import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  StudentDto,
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilterQuery,
  StudentStatusTransitionInput,
  CreateStudentDocumentInput,
  VerifyStudentDocumentInput,
  GuardianDto,
  CreateGuardianInput,
  UpdateGuardianInput,
  GuardianFilterQuery,
  StudentGuardianRelationDto,
  CreateStudentGuardianRelationInput,
  UpdateStudentGuardianRelationInput,
  EnrollmentDto,
  CreateEnrollmentInput,
  UpdateEnrollmentInput,
  EnrollmentFilterQuery,
} from '@edusphere/types';

export const studentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =======================================================================
    // 1. Identifiers
    // =======================================================================
    getNextAdmissionNumber: builder.query<
      ApiResponse<{ admissionNumber: string }>,
      { campusId?: string } | void
    >({
      query: (params) => ({
        url: '/students/identifiers/next-admission-number',
        method: 'GET',
        params: params || undefined,
      }),
    }),

    getNextStudentId: builder.query<
      ApiResponse<{ studentId: string }>,
      { campusId?: string } | void
    >({
      query: (params) => ({
        url: '/students/identifiers/next-student-id',
        method: 'GET',
        params: params || undefined,
      }),
    }),

    getNextGuardianId: builder.query<ApiResponse<{ guardianId: string }>, void>({
      query: () => ({
        url: '/guardians/identifiers/next-guardian-id',
        method: 'GET',
      }),
    }),

    // =======================================================================
    // 2. Student CRUD
    // =======================================================================
    getStudents: builder.query<ApiResponse<StudentDto[]>, StudentFilterQuery | void>({
      query: (params) => ({
        url: '/students',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Student'],
    }),

    getStudentById: builder.query<ApiResponse<StudentDto>, string>({
      query: (id) => ({
        url: `/students/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Student', id }],
    }),

    createStudent: builder.mutation<ApiResponse<StudentDto>, CreateStudentInput>({
      query: (body) => ({
        url: '/students',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Student', 'Enrollment'],
    }),

    updateStudent: builder.mutation<
      ApiResponse<StudentDto>,
      { id: string; data: UpdateStudentInput }
    >({
      query: ({ id, data }) => ({
        url: `/students/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    deleteStudent: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/students/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Student'],
    }),

    // =======================================================================
    // 3. Student Lifecycle Status Transitions
    // =======================================================================
    transitionStudentStatus: builder.mutation<
      ApiResponse<StudentDto>,
      { id: string; data: StudentStatusTransitionInput }
    >({
      query: ({ id, data }) => ({
        url: `/students/${id}/status`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    admitStudent: builder.mutation<ApiResponse<StudentDto>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/students/${id}/admit`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    activateStudent: builder.mutation<ApiResponse<StudentDto>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/students/${id}/activate`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    suspendStudent: builder.mutation<ApiResponse<StudentDto>, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/students/${id}/suspend`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    transferStudent: builder.mutation<ApiResponse<StudentDto>, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/students/${id}/transfer`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    withdrawStudent: builder.mutation<ApiResponse<StudentDto>, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/students/${id}/withdraw`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    graduateStudent: builder.mutation<ApiResponse<StudentDto>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/students/${id}/graduate`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    archiveStudent: builder.mutation<ApiResponse<StudentDto>, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/students/${id}/archive`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_res, _err, { id }) => ['Student', { type: 'Student', id }],
    }),

    // =======================================================================
    // 4. Student Documents Vault
    // =======================================================================
    addStudentDocument: builder.mutation<
      ApiResponse<StudentDto>,
      { studentId: string; data: CreateStudentDocumentInput }
    >({
      query: ({ studentId, data }) => ({
        url: `/students/${studentId}/documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_res, _err, { studentId }) => [{ type: 'Student', id: studentId }],
    }),

    verifyStudentDocument: builder.mutation<
      ApiResponse<StudentDto>,
      { studentId: string; docId: string; data: VerifyStudentDocumentInput }
    >({
      query: ({ studentId, docId, data }) => ({
        url: `/students/${studentId}/documents/${docId}/verify`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { studentId }) => [{ type: 'Student', id: studentId }],
    }),

    deleteStudentDocument: builder.mutation<
      ApiResponse<StudentDto>,
      { studentId: string; docId: string }
    >({
      query: ({ studentId, docId }) => ({
        url: `/students/${studentId}/documents/${docId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { studentId }) => [{ type: 'Student', id: studentId }],
    }),

    // =======================================================================
    // 5. Guardian Directory & Profiles
    // =======================================================================
    getGuardians: builder.query<ApiResponse<GuardianDto[]>, GuardianFilterQuery | void>({
      query: (params) => ({
        url: '/guardians',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Guardian'],
    }),

    getGuardianById: builder.query<ApiResponse<GuardianDto>, string>({
      query: (id) => ({
        url: `/guardians/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Guardian', id }],
    }),

    createGuardian: builder.mutation<ApiResponse<GuardianDto>, CreateGuardianInput>({
      query: (body) => ({
        url: '/guardians',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Guardian'],
    }),

    updateGuardian: builder.mutation<
      ApiResponse<GuardianDto>,
      { id: string; data: UpdateGuardianInput }
    >({
      query: ({ id, data }) => ({
        url: `/guardians/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Guardian', { type: 'Guardian', id }],
    }),

    deleteGuardian: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/guardians/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Guardian', 'Student'],
    }),

    inviteGuardian: builder.mutation<
      ApiResponse<{ message: string; invitationToken?: string }>,
      string
    >({
      query: (id) => ({
        url: `/guardians/${id}/invite`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => [{ type: 'Guardian', id }],
    }),

    // =======================================================================
    // 6. Student-Guardian Relationships
    // =======================================================================
    getStudentGuardians: builder.query<ApiResponse<StudentGuardianRelationDto[]>, string>({
      query: (studentId) => ({
        url: `/students/${studentId}/guardians`,
        method: 'GET',
      }),
      providesTags: (_res, _err, studentId) => [{ type: 'Student', id: studentId }],
    }),

    linkStudentGuardian: builder.mutation<
      ApiResponse<StudentGuardianRelationDto>,
      { studentId: string; data: CreateStudentGuardianRelationInput }
    >({
      query: ({ studentId, data }) => ({
        url: `/students/${studentId}/guardians`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_res, _err, { studentId }) => [
        'Guardian',
        { type: 'Student', id: studentId },
      ],
    }),

    updateStudentGuardianRelationship: builder.mutation<
      ApiResponse<StudentGuardianRelationDto>,
      { studentId: string; id: string; data: UpdateStudentGuardianRelationInput }
    >({
      query: ({ studentId, id, data }) => ({
        url: `/students/${studentId}/guardians/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { studentId }) => [
        'Guardian',
        { type: 'Student', id: studentId },
      ],
    }),

    unlinkStudentGuardian: builder.mutation<
      ApiResponse<{ message: string }>,
      { studentId: string; id: string }
    >({
      query: ({ studentId, id }) => ({
        url: `/students/${studentId}/guardians/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { studentId }) => [
        'Guardian',
        { type: 'Student', id: studentId },
      ],
    }),

    // =======================================================================
    // 7. Enrollments
    // =======================================================================
    getEnrollments: builder.query<ApiResponse<EnrollmentDto[]>, EnrollmentFilterQuery | void>({
      query: (params) => ({
        url: '/enrollments',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Enrollment'],
    }),

    getEnrollmentById: builder.query<ApiResponse<EnrollmentDto>, string>({
      query: (id) => ({
        url: `/enrollments/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Enrollment', id }],
    }),

    createEnrollment: builder.mutation<ApiResponse<EnrollmentDto>, CreateEnrollmentInput>({
      query: (body) => ({
        url: '/enrollments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Enrollment', 'Student'],
    }),

    updateEnrollment: builder.mutation<
      ApiResponse<EnrollmentDto>,
      { id: string; data: UpdateEnrollmentInput }
    >({
      query: ({ id, data }) => ({
        url: `/enrollments/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        'Enrollment',
        { type: 'Enrollment', id },
        'Student',
      ],
    }),

    // =======================================================================
    // 8. Parent Perspective (Anti-IDOR)
    // =======================================================================
    getMyChildren: builder.query<ApiResponse<StudentDto[]>, void>({
      query: () => ({
        url: '/me/students',
        method: 'GET',
      }),
      providesTags: ['Student'],
    }),

    getMyChildById: builder.query<ApiResponse<StudentDto>, string>({
      query: (id) => ({
        url: `/me/students/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Student', id }],
    }),
  }),
});

export const {
  useGetNextAdmissionNumberQuery,
  useGetNextStudentIdQuery,
  useGetNextGuardianIdQuery,
  useGetStudentsQuery,
  useGetStudentByIdQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useTransitionStudentStatusMutation,
  useAdmitStudentMutation,
  useActivateStudentMutation,
  useSuspendStudentMutation,
  useTransferStudentMutation,
  useWithdrawStudentMutation,
  useGraduateStudentMutation,
  useArchiveStudentMutation,
  useAddStudentDocumentMutation,
  useVerifyStudentDocumentMutation,
  useDeleteStudentDocumentMutation,
  useGetGuardiansQuery,
  useGetGuardianByIdQuery,
  useCreateGuardianMutation,
  useUpdateGuardianMutation,
  useDeleteGuardianMutation,
  useInviteGuardianMutation,
  useGetStudentGuardiansQuery,
  useLinkStudentGuardianMutation,
  useUpdateStudentGuardianRelationshipMutation,
  useUnlinkStudentGuardianMutation,
  useGetEnrollmentsQuery,
  useGetEnrollmentByIdQuery,
  useCreateEnrollmentMutation,
  useUpdateEnrollmentMutation,
  useGetMyChildrenQuery,
  useGetMyChildByIdQuery,
} = studentApi;
