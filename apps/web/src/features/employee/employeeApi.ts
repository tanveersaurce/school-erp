import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  EmployeeDto,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeStatusTransitionInput,
  EmployeeFilterQuery,
  DepartmentDto,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DesignationDto,
  CreateDesignationInput,
  UpdateDesignationInput,
  TeacherDto,
  CreateTeacherProfileInput,
  UpdateTeacherProfileInput,
  TeacherFilterQuery,
} from '@edusphere/types';

export const employeeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =======================================================================
    // 1. Department Endpoints
    // =======================================================================
    getDepartments: builder.query<ApiResponse<DepartmentDto[]>, void>({
      query: () => ({
        url: '/departments',
        method: 'GET',
      }),
      providesTags: ['Department'],
    }),

    getDepartmentById: builder.query<ApiResponse<DepartmentDto>, string>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Department', id }],
    }),

    createDepartment: builder.mutation<ApiResponse<DepartmentDto>, CreateDepartmentInput>({
      query: (body) => ({
        url: '/departments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Department'],
    }),

    updateDepartment: builder.mutation<
      ApiResponse<DepartmentDto>,
      { id: string; data: UpdateDepartmentInput }
    >({
      query: ({ id, data }) => ({
        url: `/departments/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Department', { type: 'Department', id }],
    }),

    deleteDepartment: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Department'],
    }),

    // =======================================================================
    // 2. Designation Endpoints
    // =======================================================================
    getDesignations: builder.query<ApiResponse<DesignationDto[]>, string | void>({
      query: (departmentId) => ({
        url: '/designations',
        method: 'GET',
        params: departmentId ? { departmentId } : undefined,
      }),
      providesTags: ['Designation'],
    }),

    getDesignationById: builder.query<ApiResponse<DesignationDto>, string>({
      query: (id) => ({
        url: `/designations/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Designation', id }],
    }),

    createDesignation: builder.mutation<ApiResponse<DesignationDto>, CreateDesignationInput>({
      query: (body) => ({
        url: '/designations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Designation'],
    }),

    updateDesignation: builder.mutation<
      ApiResponse<DesignationDto>,
      { id: string; data: UpdateDesignationInput }
    >({
      query: ({ id, data }) => ({
        url: `/designations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Designation', { type: 'Designation', id }],
    }),

    deleteDesignation: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/designations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Designation'],
    }),

    // =======================================================================
    // 3. Employee Endpoints
    // =======================================================================
    getEmployees: builder.query<ApiResponse<EmployeeDto[]>, EmployeeFilterQuery | void>({
      query: (params) => ({
        url: '/employees',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Employee'],
    }),

    getEmployeeById: builder.query<ApiResponse<EmployeeDto>, string>({
      query: (id) => ({
        url: `/employees/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Employee', id }],
    }),

    getNextEmployeeId: builder.query<ApiResponse<{ nextEmployeeId: string }>, string | void>({
      query: (prefix) => ({
        url: '/employees/next-id',
        method: 'GET',
        params: prefix ? { prefix } : undefined,
      }),
    }),

    createEmployee: builder.mutation<
      ApiResponse<EmployeeDto> & { meta?: { invitationToken?: string } },
      CreateEmployeeInput
    >({
      query: (body) => ({
        url: '/employees',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Employee', 'Department', 'Designation'],
    }),

    updateEmployee: builder.mutation<
      ApiResponse<EmployeeDto>,
      { id: string; data: UpdateEmployeeInput }
    >({
      query: ({ id, data }) => ({
        url: `/employees/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Employee', { type: 'Employee', id }],
    }),

    transitionEmployeeStatus: builder.mutation<
      ApiResponse<EmployeeDto>,
      { id: string; data: EmployeeStatusTransitionInput }
    >({
      query: ({ id, data }) => ({
        url: `/employees/${id}/status`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => ['Employee', { type: 'Employee', id }],
    }),

    // =======================================================================
    // 4. Teacher Profile Endpoints
    // =======================================================================
    getTeachers: builder.query<ApiResponse<TeacherDto[]>, TeacherFilterQuery | void>({
      query: (params) => ({
        url: '/teachers',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Teacher'],
    }),

    getTeacherProfile: builder.query<ApiResponse<TeacherDto>, string>({
      query: (employeeId) => ({
        url: `/teachers/${employeeId}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, employeeId) => [{ type: 'Teacher', id: employeeId }],
    }),

    createTeacherProfile: builder.mutation<ApiResponse<TeacherDto>, CreateTeacherProfileInput>({
      query: (body) => ({
        url: '/teachers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Teacher', 'Employee'],
    }),

    updateTeacherProfile: builder.mutation<
      ApiResponse<TeacherDto>,
      { employeeId: string; data: UpdateTeacherProfileInput }
    >({
      query: ({ employeeId, data }) => ({
        url: `/teachers/${employeeId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { employeeId }) => [
        'Teacher',
        { type: 'Teacher', id: employeeId },
      ],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetDesignationsQuery,
  useGetDesignationByIdQuery,
  useCreateDesignationMutation,
  useUpdateDesignationMutation,
  useDeleteDesignationMutation,
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useGetNextEmployeeIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useTransitionEmployeeStatusMutation,
  useGetTeachersQuery,
  useGetTeacherProfileQuery,
  useCreateTeacherProfileMutation,
  useUpdateTeacherProfileMutation,
} = employeeApi;
