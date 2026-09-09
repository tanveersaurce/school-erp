import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  RbacRoleDto,
  RoleDetailDto,
  PermissionDto,
  UserRoleAssignmentDto,
  RoleCreateInput,
  RoleUpdateInput,
  AssignRoleInput,
  EffectivePermissionsResponse,
} from '@edusphere/types';

export const rbacApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<ApiResponse<RbacRoleDto[]>, void>({
      query: () => ({
        url: '/roles',
        method: 'GET',
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Role' as const, id })),
              { type: 'Role', id: 'LIST' },
            ]
          : [{ type: 'Role', id: 'LIST' }],
    }),

    getRoleById: builder.query<ApiResponse<RoleDetailDto>, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _err, id) => [{ type: 'Role', id }],
    }),

    createRole: builder.mutation<ApiResponse<RbacRoleDto>, RoleCreateInput>({
      query: (body) => ({
        url: '/roles',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    updateRole: builder.mutation<ApiResponse<RoleDetailDto>, { id: string; data: RoleUpdateInput }>(
      {
        query: ({ id, data }) => ({
          url: `/roles/${id}`,
          method: 'PUT',
          body: data,
        }),
        invalidatesTags: (_result, _err, { id }) => [
          { type: 'Role', id },
          { type: 'Role', id: 'LIST' },
        ],
      }
    ),

    deleteRole: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    assignPermissions: builder.mutation<
      ApiResponse<RoleDetailDto>,
      { id: string; permissionIds: string[] }
    >({
      query: ({ id, permissionIds }) => ({
        url: `/roles/${id}/permissions`,
        method: 'PUT',
        body: { permissionIds },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    getPermissions: builder.query<ApiResponse<PermissionDto[]>, void>({
      query: () => ({
        url: '/permissions',
        method: 'GET',
      }),
      providesTags: ['Permission'],
    }),

    getMyPermissions: builder.query<ApiResponse<EffectivePermissionsResponse>, void>({
      query: () => ({
        url: '/rbac/me/permissions',
        method: 'GET',
      }),
    }),

    getUserRoles: builder.query<ApiResponse<UserRoleAssignmentDto[]>, string>({
      query: (userId) => ({
        url: `/users/${userId}/roles`,
        method: 'GET',
      }),
      providesTags: (_result, _err, userId) => [{ type: 'User' as const, id: userId }],
    }),

    assignRoleToUser: builder.mutation<
      ApiResponse<UserRoleAssignmentDto>,
      { userId: string; data: AssignRoleInput }
    >({
      query: ({ userId, data }) => ({
        url: `/users/${userId}/roles`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _err, { userId }) => [
        { type: 'User', id: userId },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    removeRoleFromUser: builder.mutation<ApiResponse<null>, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({
        url: `/users/${userId}/roles/${roleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _err, { userId }) => [
        { type: 'User', id: userId },
        { type: 'Role', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignPermissionsMutation,
  useGetPermissionsQuery,
  useGetMyPermissionsQuery,
  useGetUserRolesQuery,
  useAssignRoleToUserMutation,
  useRemoveRoleFromUserMutation,
} = rbacApi;
