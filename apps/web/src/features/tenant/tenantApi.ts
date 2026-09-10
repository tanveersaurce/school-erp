import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  TenantDto,
  SchoolDto,
  CampusDto,
  AcademicYearDto,
  ISchoolSettings,
  ISchoolBranding,
  UpdateSchoolProfileInput,
  UpdateSchoolSettingsInput,
  UpdateSchoolBrandingInput,
  CreateCampusInput,
  UpdateCampusInput,
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from '@edusphere/types';

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentTenant: builder.query<ApiResponse<TenantDto>, void>({
      query: () => ({
        url: '/tenants/me',
        method: 'GET',
      }),
      providesTags: ['Tenant'],
    }),

    getSchoolProfile: builder.query<ApiResponse<SchoolDto>, void>({
      query: () => ({
        url: '/schools/profile',
        method: 'GET',
      }),
      providesTags: ['School'],
    }),

    updateSchoolProfile: builder.mutation<ApiResponse<SchoolDto>, UpdateSchoolProfileInput>({
      query: (body) => ({
        url: '/schools/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['School'],
    }),

    getSchoolSettings: builder.query<ApiResponse<ISchoolSettings>, void>({
      query: () => ({
        url: '/schools/settings',
        method: 'GET',
      }),
      providesTags: ['Settings'],
    }),

    updateSchoolSettings: builder.mutation<ApiResponse<ISchoolSettings>, UpdateSchoolSettingsInput>(
      {
        query: (body) => ({
          url: '/schools/settings',
          method: 'PATCH',
          body,
        }),
        invalidatesTags: ['Settings', 'School'],
      }
    ),

    getSchoolBranding: builder.query<ApiResponse<ISchoolBranding>, void>({
      query: () => ({
        url: '/schools/branding',
        method: 'GET',
      }),
      providesTags: ['Branding'],
    }),

    updateSchoolBranding: builder.mutation<ApiResponse<ISchoolBranding>, UpdateSchoolBrandingInput>(
      {
        query: (body) => ({
          url: '/schools/branding',
          method: 'PATCH',
          body,
        }),
        invalidatesTags: ['Branding', 'School'],
      }
    ),

    getCampuses: builder.query<ApiResponse<CampusDto[]>, void>({
      query: () => ({
        url: '/campuses',
        method: 'GET',
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Campus' as const, id })),
              { type: 'Campus', id: 'LIST' },
            ]
          : [{ type: 'Campus', id: 'LIST' }],
    }),

    createCampus: builder.mutation<ApiResponse<CampusDto>, CreateCampusInput>({
      query: (body) => ({
        url: '/campuses',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Campus', id: 'LIST' }],
    }),

    updateCampus: builder.mutation<ApiResponse<CampusDto>, { id: string; data: UpdateCampusInput }>(
      {
        query: ({ id, data }) => ({
          url: `/campuses/${id}`,
          method: 'PATCH',
          body: data,
        }),
        invalidatesTags: (_res, _err, { id }) => [
          { type: 'Campus', id },
          { type: 'Campus', id: 'LIST' },
        ],
      }
    ),

    archiveCampus: builder.mutation<ApiResponse<CampusDto>, string>({
      query: (id) => ({
        url: `/campuses/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: 'Campus', id },
        { type: 'Campus', id: 'LIST' },
      ],
    }),

    getAcademicYears: builder.query<ApiResponse<AcademicYearDto[]>, { campusId?: string } | void>({
      query: (params) => ({
        url: '/academic-years',
        method: 'GET',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'AcademicYear' as const, id })),
              { type: 'AcademicYear', id: 'LIST' },
            ]
          : [{ type: 'AcademicYear', id: 'LIST' }],
    }),

    getCurrentAcademicYear: builder.query<ApiResponse<AcademicYearDto>, string | void>({
      query: (campusId) => ({
        url: '/academic-years/current',
        method: 'GET',
        params: campusId ? { campusId } : {},
      }),
      providesTags: ['AcademicYear'],
    }),

    createAcademicYear: builder.mutation<ApiResponse<AcademicYearDto>, CreateAcademicYearInput>({
      query: (body) => ({
        url: '/academic-years',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AcademicYear', id: 'LIST' }],
    }),

    updateAcademicYear: builder.mutation<
      ApiResponse<AcademicYearDto>,
      { id: string; data: UpdateAcademicYearInput }
    >({
      query: ({ id, data }) => ({
        url: `/academic-years/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'AcademicYear', id },
        { type: 'AcademicYear', id: 'LIST' },
      ],
    }),

    activateAcademicYear: builder.mutation<ApiResponse<AcademicYearDto>, string>({
      query: (id) => ({
        url: `/academic-years/${id}/activate`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'AcademicYear', id: 'LIST' }],
    }),

    closeAcademicYear: builder.mutation<ApiResponse<AcademicYearDto>, string>({
      query: (id) => ({
        url: `/academic-years/${id}/close`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'AcademicYear', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCurrentTenantQuery,
  useGetSchoolProfileQuery,
  useUpdateSchoolProfileMutation,
  useGetSchoolSettingsQuery,
  useUpdateSchoolSettingsMutation,
  useGetSchoolBrandingQuery,
  useUpdateSchoolBrandingMutation,
  useGetCampusesQuery,
  useCreateCampusMutation,
  useUpdateCampusMutation,
  useArchiveCampusMutation,
  useGetAcademicYearsQuery,
  useGetCurrentAcademicYearQuery,
  useCreateAcademicYearMutation,
  useUpdateAcademicYearMutation,
  useActivateAcademicYearMutation,
  useCloseAcademicYearMutation,
} = tenantApi;
