import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type { GlobalSearchResponse, GlobalSearchQueryParams } from '@edusphere/types';

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    globalSearch: builder.query<ApiResponse<GlobalSearchResponse>, GlobalSearchQueryParams>({
      query: (params) => ({
        url: '/search',
        method: 'GET',
        params: {
          q: params.q,
          limit: params.limit || 5,
          entities: params.entities ? params.entities.join(',') : undefined,
          schoolId: params.schoolId,
          campusId: params.campusId,
        },
      }),
      providesTags: ['Search'],
    }),
  }),
});

export const { useGlobalSearchQuery, useLazyGlobalSearchQuery } = searchApi;
