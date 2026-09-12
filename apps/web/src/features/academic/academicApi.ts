import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  ClassDto,
  CreateClassInput,
  UpdateClassInput,
  ClassFilterQuery,
  SectionDto,
  CreateSectionInput,
  UpdateSectionInput,
  SectionFilterQuery,
  AcademicClassDto,
  CreateAcademicClassInput,
  UpdateAcademicClassInput,
  AcademicClassFilterQuery,
  SubjectDto,
  CreateSubjectInput,
  UpdateSubjectInput,
  SubjectFilterQuery,
  ClassSubjectDto,
  CreateClassSubjectInput,
  UpdateClassSubjectInput,
  TeacherSubjectAssignmentDto,
  CreateTeacherAssignmentInput,
  UpdateTeacherAssignmentInput,
  TeacherAssignmentFilterQuery,
} from '@edusphere/types';

export interface AcademicDashboardSummary {
  totalClasses: number;
  totalSections: number;
  totalAcademicClasses: number;
  totalSubjects: number;
  totalTeacherAssignments: number;
  totalCapacity: number;
  totalEnrolled: number;
  capacityUtilization: number;
}

export interface EnrolledClassStudent {
  enrollmentId: string;
  studentId: string;
  admissionNumber?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  rollNumber?: number;
  enrollmentStatus: string;
  startDate: string;
}

export interface AcademicClassFullDetails {
  academicClass: AcademicClassDto;
  students: EnrolledClassStudent[];
  subjects: ClassSubjectDto[];
  teachers: TeacherSubjectAssignmentDto[];
}

export const academicApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =======================================================================
    // 1. Dashboard Summary
    // =======================================================================
    getAcademicDashboardSummary: builder.query<
      ApiResponse<AcademicDashboardSummary>,
      { campusId?: string; academicYearId?: string } | void
    >({
      query: (params) => ({
        url: '/academic/dashboard/summary',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Class', 'Section', 'AcademicClass', 'Subject', 'TeacherAssignment'],
    }),

    // =======================================================================
    // 2. Class / Grade Levels
    // =======================================================================
    getClasses: builder.query<ApiResponse<ClassDto[]>, ClassFilterQuery | void>({
      query: (params) => ({
        url: '/academic/classes',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Class'],
    }),

    getClassById: builder.query<ApiResponse<ClassDto>, string>({
      query: (id) => ({
        url: `/academic/classes/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Class', id }],
    }),

    createClass: builder.mutation<ApiResponse<ClassDto>, CreateClassInput>({
      query: (body) => ({
        url: '/academic/classes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Class'],
    }),

    updateClass: builder.mutation<ApiResponse<ClassDto>, { id: string; data: UpdateClassInput }>({
      query: ({ id, data }) => ({
        url: `/academic/classes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Class', { type: 'Class', id }],
    }),

    deleteClass: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/academic/classes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Class'],
    }),

    // =======================================================================
    // 3. Sections
    // =======================================================================
    getSections: builder.query<ApiResponse<SectionDto[]>, SectionFilterQuery | void>({
      query: (params) => ({
        url: '/academic/sections',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Section'],
    }),

    getSectionById: builder.query<ApiResponse<SectionDto>, string>({
      query: (id) => ({
        url: `/academic/sections/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Section', id }],
    }),

    createSection: builder.mutation<ApiResponse<SectionDto>, CreateSectionInput>({
      query: (body) => ({
        url: '/academic/sections',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Section'],
    }),

    updateSection: builder.mutation<
      ApiResponse<SectionDto>,
      { id: string; data: UpdateSectionInput }
    >({
      query: ({ id, data }) => ({
        url: `/academic/sections/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Section', { type: 'Section', id }],
    }),

    deleteSection: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/academic/sections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Section'],
    }),

    // =======================================================================
    // 4. Academic Classes (Offerings)
    // =======================================================================
    getAcademicClasses: builder.query<
      ApiResponse<AcademicClassDto[]>,
      AcademicClassFilterQuery | void
    >({
      query: (params) => ({
        url: '/academic/academic-classes',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['AcademicClass'],
    }),

    getAcademicClassById: builder.query<ApiResponse<AcademicClassDto>, string>({
      query: (id) => ({
        url: `/academic/academic-classes/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'AcademicClass', id }],
    }),

    getAcademicClassDetails: builder.query<ApiResponse<AcademicClassFullDetails>, string>({
      query: (id) => ({
        url: `/academic/academic-classes/${id}/details`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [
        { type: 'AcademicClass', id },
        'Enrollment',
        'TeacherAssignment',
        'ClassSubject',
      ],
    }),

    createAcademicClass: builder.mutation<ApiResponse<AcademicClassDto>, CreateAcademicClassInput>({
      query: (body) => ({
        url: '/academic/academic-classes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AcademicClass'],
    }),

    updateAcademicClass: builder.mutation<
      ApiResponse<AcademicClassDto>,
      { id: string; data: UpdateAcademicClassInput }
    >({
      query: ({ id, data }) => ({
        url: `/academic/academic-classes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['AcademicClass', { type: 'AcademicClass', id }],
    }),

    deleteAcademicClass: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/academic/academic-classes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AcademicClass'],
    }),

    assignClassTeacher: builder.mutation<
      ApiResponse<AcademicClassDto>,
      { id: string; classTeacherId: string | null }
    >({
      query: ({ id, classTeacherId }) => ({
        url: `/academic/academic-classes/${id}/class-teacher`,
        method: 'POST',
        body: { classTeacherId },
      }),
      invalidatesTags: (_res, _err, { id }) => ['AcademicClass', { type: 'AcademicClass', id }],
    }),

    getAcademicClassStudents: builder.query<ApiResponse<EnrolledClassStudent[]>, string>({
      query: (id) => ({
        url: `/academic/academic-classes/${id}/students`,
        method: 'GET',
      }),
      providesTags: ['Enrollment'],
    }),

    autoAssignRollNumbers: builder.mutation<
      ApiResponse<{
        updatedCount: number;
        assignments: { studentId: string; rollNumber: number }[];
      }>,
      string
    >({
      query: (id) => ({
        url: `/academic/academic-classes/${id}/auto-roll-numbers`,
        method: 'POST',
      }),
      invalidatesTags: ['Enrollment', 'AcademicClass'],
    }),

    // =======================================================================
    // 5. Subjects
    // =======================================================================
    getSubjects: builder.query<ApiResponse<SubjectDto[]>, SubjectFilterQuery | void>({
      query: (params) => ({
        url: '/academic/subjects',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Subject'],
    }),

    getSubjectById: builder.query<ApiResponse<SubjectDto>, string>({
      query: (id) => ({
        url: `/academic/subjects/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Subject', id }],
    }),

    createSubject: builder.mutation<ApiResponse<SubjectDto>, CreateSubjectInput>({
      query: (body) => ({
        url: '/academic/subjects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subject'],
    }),

    updateSubject: builder.mutation<
      ApiResponse<SubjectDto>,
      { id: string; data: UpdateSubjectInput }
    >({
      query: ({ id, data }) => ({
        url: `/academic/subjects/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Subject', { type: 'Subject', id }],
    }),

    deleteSubject: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/academic/subjects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subject'],
    }),

    // =======================================================================
    // 6. Class ↔ Subject Curriculum Mapping
    // =======================================================================
    getClassSubjects: builder.query<
      ApiResponse<ClassSubjectDto[]>,
      { academicYearId: string; classId: string }
    >({
      query: (params) => ({
        url: '/academic/class-subjects',
        method: 'GET',
        params,
      }),
      providesTags: ['ClassSubject'],
    }),

    createClassSubject: builder.mutation<ApiResponse<ClassSubjectDto>, CreateClassSubjectInput>({
      query: (body) => ({
        url: '/academic/class-subjects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ClassSubject'],
    }),

    updateClassSubject: builder.mutation<
      ApiResponse<ClassSubjectDto>,
      { id: string; data: UpdateClassSubjectInput }
    >({
      query: ({ id, data }) => ({
        url: `/academic/class-subjects/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ClassSubject'],
    }),

    deleteClassSubject: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/academic/class-subjects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ClassSubject'],
    }),

    // =======================================================================
    // 7. Teacher Subject Assignments
    // =======================================================================
    getTeacherAssignments: builder.query<
      ApiResponse<TeacherSubjectAssignmentDto[]>,
      TeacherAssignmentFilterQuery | void
    >({
      query: (params) => ({
        url: '/academic/teacher-assignments',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['TeacherAssignment'],
    }),

    getTeacherAssignmentById: builder.query<ApiResponse<TeacherSubjectAssignmentDto>, string>({
      query: (id) => ({
        url: `/academic/teacher-assignments/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'TeacherAssignment', id }],
    }),

    createTeacherAssignment: builder.mutation<
      ApiResponse<TeacherSubjectAssignmentDto>,
      CreateTeacherAssignmentInput
    >({
      query: (body) => ({
        url: '/academic/teacher-assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TeacherAssignment'],
    }),

    updateTeacherAssignment: builder.mutation<
      ApiResponse<TeacherSubjectAssignmentDto>,
      { id: string; data: UpdateTeacherAssignmentInput }
    >({
      query: ({ id, data }) => ({
        url: `/academic/teacher-assignments/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        'TeacherAssignment',
        { type: 'TeacherAssignment', id },
      ],
    }),

    deleteTeacherAssignment: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/academic/teacher-assignments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TeacherAssignment'],
    }),

    // =======================================================================
    // 8. Student Academic Enrollment & Roll Numbers
    // =======================================================================
    enrollStudentAcademic: builder.mutation<
      ApiResponse<any>,
      { studentId: string; academicClassId: string; rollNumber?: number; startDate?: string }
    >({
      query: (body) => ({
        url: '/academic/enrollments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Enrollment', 'AcademicClass'],
    }),

    assignRollNumber: builder.mutation<
      ApiResponse<any>,
      { enrollmentId: string; rollNumber: number }
    >({
      query: ({ enrollmentId, rollNumber }) => ({
        url: `/academic/enrollments/${enrollmentId}/roll-number`,
        method: 'POST',
        body: { rollNumber },
      }),
      invalidatesTags: ['Enrollment'],
    }),
  }),
});

export const {
  useGetAcademicDashboardSummaryQuery,
  useGetClassesQuery,
  useGetClassByIdQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useGetSectionsQuery,
  useGetSectionByIdQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useGetAcademicClassesQuery,
  useGetAcademicClassByIdQuery,
  useGetAcademicClassDetailsQuery,
  useCreateAcademicClassMutation,
  useUpdateAcademicClassMutation,
  useDeleteAcademicClassMutation,
  useAssignClassTeacherMutation,
  useGetAcademicClassStudentsQuery,
  useAutoAssignRollNumbersMutation,
  useGetSubjectsQuery,
  useGetSubjectByIdQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useGetClassSubjectsQuery,
  useCreateClassSubjectMutation,
  useUpdateClassSubjectMutation,
  useDeleteClassSubjectMutation,
  useGetTeacherAssignmentsQuery,
  useGetTeacherAssignmentByIdQuery,
  useCreateTeacherAssignmentMutation,
  useUpdateTeacherAssignmentMutation,
  useDeleteTeacherAssignmentMutation,
  useEnrollStudentAcademicMutation,
  useAssignRollNumberMutation,
} = academicApi;
