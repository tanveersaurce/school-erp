import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  PeriodDto,
  CreatePeriodInput,
  UpdatePeriodInput,
  PeriodFilterQuery,
  ClassroomDto,
  CreateClassroomInput,
  UpdateClassroomInput,
  ClassroomFilterQuery,
  TimetableDto,
  CreateTimetableInput,
  UpdateTimetableInput,
  CloneTimetableInput,
  TimetableFilterQuery,
  TimetableEntryDto,
  CreateTimetableEntryInput,
  UpdateTimetableEntryInput,
  TimetableEntryFilterQuery,
  TimetableValidationReport,
  TeacherWorkloadSummary,
  ClassTimetableViewDto,
  TeacherTimetableViewDto,
  RoomTimetableViewDto,
} from '@edusphere/types';

export const timetableApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =======================================================================
    // 1. Periods (Bell Schedule)
    // =======================================================================
    getPeriods: builder.query<ApiResponse<PeriodDto[]>, PeriodFilterQuery | void>({
      query: (params) => ({
        url: '/timetable/periods',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Period'],
    }),

    getPeriodById: builder.query<ApiResponse<PeriodDto>, string>({
      query: (id) => ({
        url: `/timetable/periods/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Period', id }],
    }),

    createPeriod: builder.mutation<ApiResponse<PeriodDto>, CreatePeriodInput>({
      query: (body) => ({
        url: '/timetable/periods',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Period'],
    }),

    updatePeriod: builder.mutation<
      ApiResponse<PeriodDto>,
      { id: string; body: UpdatePeriodInput }
    >({
      query: ({ id, body }) => ({
        url: `/timetable/periods/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Period', { type: 'Period', id }],
    }),

    deletePeriod: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/timetable/periods/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Period'],
    }),

    // =======================================================================
    // 2. Classrooms & Physical Facilities
    // =======================================================================
    getClassrooms: builder.query<ApiResponse<ClassroomDto[]>, ClassroomFilterQuery | void>({
      query: (params) => ({
        url: '/timetable/classrooms',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Classroom'],
    }),

    getClassroomById: builder.query<ApiResponse<ClassroomDto>, string>({
      query: (id) => ({
        url: `/timetable/classrooms/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Classroom', id }],
    }),

    createClassroom: builder.mutation<ApiResponse<ClassroomDto>, CreateClassroomInput>({
      query: (body) => ({
        url: '/timetable/classrooms',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Classroom'],
    }),

    updateClassroom: builder.mutation<
      ApiResponse<ClassroomDto>,
      { id: string; body: UpdateClassroomInput }
    >({
      query: ({ id, body }) => ({
        url: `/timetable/classrooms/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Classroom', { type: 'Classroom', id }],
    }),

    deleteClassroom: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/timetable/classrooms/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Classroom'],
    }),

    // =======================================================================
    // 3. Timetable Master & Versioning
    // =======================================================================
    getTimetables: builder.query<ApiResponse<TimetableDto[]>, TimetableFilterQuery | void>({
      query: (params) => ({
        url: '/timetable/timetables',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Timetable'],
    }),

    getTimetableById: builder.query<ApiResponse<TimetableDto>, string>({
      query: (id) => ({
        url: `/timetable/timetables/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Timetable', id }],
    }),

    createTimetable: builder.mutation<ApiResponse<TimetableDto>, CreateTimetableInput>({
      query: (body) => ({
        url: '/timetable/timetables',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Timetable'],
    }),

    updateTimetable: builder.mutation<
      ApiResponse<TimetableDto>,
      { id: string; body: UpdateTimetableInput }
    >({
      query: ({ id, body }) => ({
        url: `/timetable/timetables/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Timetable', { type: 'Timetable', id }],
    }),

    deleteTimetable: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/timetable/timetables/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Timetable'],
    }),

    publishTimetable: builder.mutation<
      ApiResponse<{ timetable: TimetableDto; validationReport: TimetableValidationReport }>,
      string
    >({
      query: (id) => ({
        url: `/timetable/timetables/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: ['Timetable'],
    }),

    archiveTimetable: builder.mutation<ApiResponse<TimetableDto>, string>({
      query: (id) => ({
        url: `/timetable/timetables/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: ['Timetable'],
    }),

    cloneTimetable: builder.mutation<
      ApiResponse<TimetableDto>,
      { id: string; body: CloneTimetableInput }
    >({
      query: ({ id, body }) => ({
        url: `/timetable/timetables/${id}/clone`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Timetable'],
    }),

    // =======================================================================
    // 4. Timetable Entries
    // =======================================================================
    getTimetableEntries: builder.query<
      ApiResponse<TimetableEntryDto[]>,
      { timetableId: string; params?: TimetableEntryFilterQuery }
    >({
      query: ({ timetableId, params }) => ({
        url: `/timetable/timetables/${timetableId}/entries`,
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['TimetableEntry'],
    }),

    createTimetableEntry: builder.mutation<
      ApiResponse<TimetableEntryDto>,
      { timetableId: string; body: CreateTimetableEntryInput }
    >({
      query: ({ timetableId, body }) => ({
        url: `/timetable/timetables/${timetableId}/entries`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TimetableEntry', 'Timetable'],
    }),

    updateTimetableEntry: builder.mutation<
      ApiResponse<TimetableEntryDto>,
      { timetableId: string; entryId: string; body: UpdateTimetableEntryInput }
    >({
      query: ({ timetableId, entryId, body }) => ({
        url: `/timetable/timetables/${timetableId}/entries/${entryId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['TimetableEntry', 'Timetable'],
    }),

    deleteTimetableEntry: builder.mutation<
      ApiResponse<null>,
      { timetableId: string; entryId: string }
    >({
      query: ({ timetableId, entryId }) => ({
        url: `/timetable/timetables/${timetableId}/entries/${entryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TimetableEntry', 'Timetable'],
    }),

    // =======================================================================
    // 5. Validation, Conflicts & Workload
    // =======================================================================
    validateTimetable: builder.mutation<ApiResponse<TimetableValidationReport>, string>({
      query: (timetableId) => ({
        url: `/timetable/timetables/${timetableId}/validate`,
        method: 'POST',
      }),
    }),

    validateCandidateSlot: builder.mutation<
      ApiResponse<{ isValid: boolean; conflicts: any[] }>,
      { timetableId: string; body: any }
    >({
      query: ({ timetableId, body }) => ({
        url: `/timetable/timetables/${timetableId}/validate-slot`,
        method: 'POST',
        body,
      }),
    }),

    getTeacherWorkload: builder.query<ApiResponse<TeacherWorkloadSummary>, string>({
      query: (timetableId) => ({
        url: `/timetable/timetables/${timetableId}/teacher-workload`,
        method: 'GET',
      }),
      providesTags: ['TimetableEntry'],
    }),

    // =======================================================================
    // 6. 2D Structured Weekly Grid Views
    // =======================================================================
    getClassTimetableView: builder.query<
      ApiResponse<ClassTimetableViewDto>,
      { timetableId: string; academicClassId: string }
    >({
      query: ({ timetableId, academicClassId }) => ({
        url: `/timetable/timetables/${timetableId}/views/class/${academicClassId}`,
        method: 'GET',
      }),
      providesTags: ['TimetableEntry'],
    }),

    getTeacherTimetableView: builder.query<
      ApiResponse<TeacherTimetableViewDto>,
      { timetableId: string; teacherId: string }
    >({
      query: ({ timetableId, teacherId }) => ({
        url: `/timetable/timetables/${timetableId}/views/teacher/${teacherId}`,
        method: 'GET',
      }),
      providesTags: ['TimetableEntry'],
    }),

    getRoomTimetableView: builder.query<
      ApiResponse<RoomTimetableViewDto>,
      { timetableId: string; roomId: string }
    >({
      query: ({ timetableId, roomId }) => ({
        url: `/timetable/timetables/${timetableId}/views/room/${roomId}`,
        method: 'GET',
      }),
      providesTags: ['TimetableEntry'],
    }),

    getMySchedule: builder.query<ApiResponse<TeacherTimetableViewDto>, void>({
      query: () => ({
        url: '/timetable/my-schedule',
        method: 'GET',
      }),
      providesTags: ['TimetableEntry'],
    }),
  }),
});

export const {
  useGetPeriodsQuery,
  useGetPeriodByIdQuery,
  useCreatePeriodMutation,
  useUpdatePeriodMutation,
  useDeletePeriodMutation,

  useGetClassroomsQuery,
  useGetClassroomByIdQuery,
  useCreateClassroomMutation,
  useUpdateClassroomMutation,
  useDeleteClassroomMutation,

  useGetTimetablesQuery,
  useGetTimetableByIdQuery,
  useCreateTimetableMutation,
  useUpdateTimetableMutation,
  useDeleteTimetableMutation,
  usePublishTimetableMutation,
  useArchiveTimetableMutation,
  useCloneTimetableMutation,

  useGetTimetableEntriesQuery,
  useCreateTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
  useDeleteTimetableEntryMutation,

  useValidateTimetableMutation,
  useValidateCandidateSlotMutation,
  useGetTeacherWorkloadQuery,

  useGetClassTimetableViewQuery,
  useGetTeacherTimetableViewQuery,
  useGetRoomTimetableViewQuery,
  useGetMyScheduleQuery,
} = timetableApi;
