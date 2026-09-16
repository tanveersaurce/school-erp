import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  ILibrary,
  ILibrarySetting,
  ILibraryAuthor,
  ILibraryPublisher,
  ILibraryCategory,
  ILibraryShelf,
  IBook,
  IBookCopy,
  ILibraryMember,
  ILibraryCirculation,
  ILibraryReservation,
  ILibraryFine,
  ILibraryDashboardKPIs,
} from '@edusphere/types';

export interface BookQueryFilters {
  search?: string;
  categoryId?: string;
  authorId?: string;
  isbn?: string;
  page?: number;
  limit?: number;
}

export interface CirculationQueryFilters {
  memberId?: string;
  bookId?: string;
  libraryId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface MemberQueryFilters {
  search?: string;
  memberType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface FineQueryFilters {
  memberId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const libraryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =========================================================================
    // 1. Dashboard & Reports
    // =========================================================================
    getLibraryDashboardKPIs: builder.query<ApiResponse<ILibraryDashboardKPIs>, void>({
      query: () => ({
        url: '/library/reports/kpis',
        method: 'GET',
      }),
      providesTags: ['LibraryReport'],
    }),

    getOverdueReport: builder.query<ApiResponse<any>, void>({
      query: () => ({
        url: '/library/reports/overdue',
        method: 'GET',
      }),
      providesTags: ['LibraryReport', 'LibraryCirculation'],
    }),

    getPopularBooks: builder.query<ApiResponse<any>, { limit?: number } | void>({
      query: (params) => ({
        url: '/library/reports/popular-books',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibraryReport', 'Book'],
    }),

    getInventoryReport: builder.query<ApiResponse<any>, void>({
      query: () => ({
        url: '/library/reports/inventory',
        method: 'GET',
      }),
      providesTags: ['LibraryReport', 'BookCopy'],
    }),

    // =========================================================================
    // 2. Locations & Settings
    // =========================================================================
    getLibraries: builder.query<ApiResponse<ILibrary[]>, void>({
      query: () => ({
        url: '/library/locations',
        method: 'GET',
      }),
      providesTags: ['Library'],
    }),

    createLibrary: builder.mutation<ApiResponse<ILibrary>, any>({
      query: (data) => ({
        url: '/library/locations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Library'],
    }),

    getLibrarySettings: builder.query<ApiResponse<ILibrarySetting>, { libraryId?: string } | void>({
      query: (params) => ({
        url: '/library/settings',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibrarySettings'],
    }),

    updateLibrarySettings: builder.mutation<ApiResponse<ILibrarySetting>, any>({
      query: (data) => ({
        url: '/library/settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['LibrarySettings'],
    }),

    // =========================================================================
    // 3. Authors, Publishers, Categories, Shelves
    // =========================================================================
    getAuthors: builder.query<ApiResponse<ILibraryAuthor[]>, { search?: string } | void>({
      query: (params) => ({
        url: '/library/authors',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Book'],
    }),

    createAuthor: builder.mutation<ApiResponse<ILibraryAuthor>, any>({
      query: (data) => ({
        url: '/library/authors',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Book'],
    }),

    getPublishers: builder.query<ApiResponse<ILibraryPublisher[]>, { search?: string } | void>({
      query: (params) => ({
        url: '/library/publishers',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Book'],
    }),

    createPublisher: builder.mutation<ApiResponse<ILibraryPublisher>, any>({
      query: (data) => ({
        url: '/library/publishers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Book'],
    }),

    getCategories: builder.query<ApiResponse<ILibraryCategory[]>, void>({
      query: () => ({
        url: '/library/categories',
        method: 'GET',
      }),
      providesTags: ['Book'],
    }),

    createCategory: builder.mutation<ApiResponse<ILibraryCategory>, any>({
      query: (data) => ({
        url: '/library/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Book'],
    }),

    getShelves: builder.query<ApiResponse<ILibraryShelf[]>, { libraryId?: string } | void>({
      query: (params) => ({
        url: '/library/shelves',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Library'],
    }),

    createShelf: builder.mutation<ApiResponse<ILibraryShelf>, any>({
      query: (data) => ({
        url: '/library/shelves',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Library'],
    }),

    // =========================================================================
    // 4. Books & Physical Copies
    // =========================================================================
    getBooks: builder.query<ApiResponse<{ items: IBook[]; pagination: any }>, BookQueryFilters | void>({
      query: (params) => ({
        url: '/library/books',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Book'],
    }),

    getBookById: builder.query<ApiResponse<IBook>, string>({
      query: (id) => ({
        url: `/library/books/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Book' as const, id }],
    }),

    createBook: builder.mutation<ApiResponse<IBook>, any>({
      query: (data) => ({
        url: '/library/books',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Book', 'LibraryReport'],
    }),

    updateBook: builder.mutation<ApiResponse<IBook>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/library/books/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Book', id }, 'Book'],
    }),

    archiveBook: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({
        url: `/library/books/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Book', 'LibraryReport'],
    }),

    getCopies: builder.query<ApiResponse<IBookCopy[]>, { bookId?: string; libraryId?: string } | void>({
      query: (params) => ({
        url: '/library/copies',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['BookCopy'],
    }),

    addBookCopies: builder.mutation<ApiResponse<any>, { bookId: string; data: any }>({
      query: ({ bookId, data }) => ({
        url: `/library/books/${bookId}/copies`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Book', 'BookCopy', 'LibraryReport'],
    }),

    updateCopyCondition: builder.mutation<ApiResponse<IBookCopy>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/library/copies/${id}/condition`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['BookCopy'],
    }),

    withdrawCopy: builder.mutation<ApiResponse<any>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/library/copies/${id}/withdraw`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Book', 'BookCopy', 'LibraryReport'],
    }),

    lookupCopy: builder.query<ApiResponse<IBookCopy>, string>({
      query: (identifier) => ({
        url: `/library/copies/lookup/${identifier}`,
        method: 'GET',
      }),
      providesTags: ['BookCopy'],
    }),

    // =========================================================================
    // 5. Members
    // =========================================================================
    getMembers: builder.query<ApiResponse<{ items: ILibraryMember[]; pagination: any }>, MemberQueryFilters | void>({
      query: (params) => ({
        url: '/library/members',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibraryMember'],
    }),

    getMemberById: builder.query<ApiResponse<ILibraryMember>, string>({
      query: (id) => ({
        url: `/library/members/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'LibraryMember' as const, id }],
    }),

    registerMember: builder.mutation<ApiResponse<ILibraryMember>, any>({
      query: (data) => ({
        url: '/library/members',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryMember', 'LibraryReport'],
    }),

    updateMember: builder.mutation<ApiResponse<ILibraryMember>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/library/members/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'LibraryMember', id }, 'LibraryMember'],
    }),

    suspendMember: builder.mutation<ApiResponse<ILibraryMember>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/library/members/${id}/suspend`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['LibraryMember'],
    }),

    // =========================================================================
    // 6. Circulation Desk
    // =========================================================================
    getCirculations: builder.query<ApiResponse<{ items: ILibraryCirculation[]; pagination: any }>, CirculationQueryFilters | void>({
      query: (params) => ({
        url: '/library/circulation',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibraryCirculation'],
    }),

    checkoutBook: builder.mutation<ApiResponse<ILibraryCirculation>, any>({
      query: (data) => ({
        url: '/library/circulation/issue',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryCirculation', 'Book', 'BookCopy', 'LibraryMember', 'LibraryReport'],
    }),

    returnBook: builder.mutation<ApiResponse<any>, any>({
      query: (data) => ({
        url: '/library/circulation/return',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryCirculation', 'Book', 'BookCopy', 'LibraryMember', 'LibraryFine', 'LibraryReport'],
    }),

    renewBook: builder.mutation<ApiResponse<ILibraryCirculation>, any>({
      query: (data) => ({
        url: '/library/circulation/renew',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryCirculation'],
    }),

    markBookLost: builder.mutation<ApiResponse<any>, any>({
      query: (data) => ({
        url: '/library/circulation/lost',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryCirculation', 'Book', 'BookCopy', 'LibraryMember', 'LibraryFine', 'LibraryReport'],
    }),

    // =========================================================================
    // 7. Reservations
    // =========================================================================
    getReservations: builder.query<ApiResponse<{ items: ILibraryReservation[]; pagination: any }>, any | void>({
      query: (params) => ({
        url: '/library/reservations',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibraryReservation'],
    }),

    reserveBook: builder.mutation<ApiResponse<ILibraryReservation>, any>({
      query: (data) => ({
        url: '/library/reservations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryReservation', 'LibraryReport'],
    }),

    cancelReservation: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({
        url: `/library/reservations/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['LibraryReservation'],
    }),

    // =========================================================================
    // 8. Fines & Waivers
    // =========================================================================
    getFines: builder.query<ApiResponse<{ items: ILibraryFine[]; pagination: any }>, FineQueryFilters | void>({
      query: (params) => ({
        url: '/library/fines',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibraryFine'],
    }),

    waiveFine: builder.mutation<ApiResponse<ILibraryFine>, { id: string; data: { reason: string; waivedAmount?: number } }>({
      query: ({ id, data }) => ({
        url: `/library/fines/${id}/waive`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryFine', 'LibraryMember', 'LibraryReport'],
    }),

    settleFine: builder.mutation<ApiResponse<ILibraryFine>, { id: string; data: { amount: number; paymentReference?: string } }>({
      query: ({ id, data }) => ({
        url: `/library/fines/${id}/settle`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['LibraryFine', 'LibraryMember', 'LibraryCirculation', 'LibraryReport'],
    }),

    // =========================================================================
    // 9. Self-Service & Student Scoped Views
    // =========================================================================
    getMyLibraryProfile: builder.query<ApiResponse<ILibraryMember>, void>({
      query: () => ({
        url: '/library/me/profile',
        method: 'GET',
      }),
      providesTags: ['LibraryMember'],
    }),

    getMyCirculations: builder.query<ApiResponse<{ items: ILibraryCirculation[]; pagination: any }>, { page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/library/me/circulations',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibraryCirculation'],
    }),

    getMyReservations: builder.query<ApiResponse<{ items: ILibraryReservation[]; pagination: any }>, { page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/library/me/reservations',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LibraryReservation'],
    }),

    getMyFines: builder.query<ApiResponse<{ items: ILibraryFine[]; pagination: any }>, { page?: number; limit?: number } | void>({
      query: () => ({
        url: '/library/me/fines',
        method: 'GET',
      }),
      providesTags: ['LibraryFine'],
    }),

    getStudentLibraryInfo: builder.query<ApiResponse<any>, string>({
      query: (studentId) => ({
        url: `/library/students/${studentId}`,
        method: 'GET',
      }),
      providesTags: ['LibraryCirculation', 'LibraryReservation', 'LibraryFine'],
    }),
  }),
});

export const {
  useGetLibraryDashboardKPIsQuery,
  useGetOverdueReportQuery,
  useGetPopularBooksQuery,
  useGetInventoryReportQuery,
  useGetLibrariesQuery,
  useCreateLibraryMutation,
  useGetLibrarySettingsQuery,
  useUpdateLibrarySettingsMutation,
  useGetAuthorsQuery,
  useCreateAuthorMutation,
  useGetPublishersQuery,
  useCreatePublisherMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetShelvesQuery,
  useCreateShelfMutation,
  useGetBooksQuery,
  useGetBookByIdQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useArchiveBookMutation,
  useGetCopiesQuery,
  useAddBookCopiesMutation,
  useUpdateCopyConditionMutation,
  useWithdrawCopyMutation,
  useLookupCopyQuery,
  useGetMembersQuery,
  useGetMemberByIdQuery,
  useRegisterMemberMutation,
  useUpdateMemberMutation,
  useSuspendMemberMutation,
  useGetCirculationsQuery,
  useCheckoutBookMutation,
  useReturnBookMutation,
  useRenewBookMutation,
  useMarkBookLostMutation,
  useGetReservationsQuery,
  useReserveBookMutation,
  useCancelReservationMutation,
  useGetFinesQuery,
  useWaiveFineMutation,
  useSettleFineMutation,
  useGetMyLibraryProfileQuery,
  useGetMyCirculationsQuery,
  useGetMyReservationsQuery,
  useGetMyFinesQuery,
  useGetStudentLibraryInfoQuery,
} = libraryApi;
