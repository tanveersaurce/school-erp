import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  INotification,
  IAnnouncement,
  INotificationTemplate,
  INotificationPreference,
  INotificationDelivery,
  ICommunicationJob,
  ICommunicationDashboardStats,
} from '@edusphere/types';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const communicationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------------------------------------------------------------
    // 1. In-App Notifications
    // -------------------------------------------------------------------------
    getNotifications: builder.query<
      ApiResponse<PaginatedResult<INotification>>,
      { page?: number; limit?: number; category?: string; unreadOnly?: boolean; search?: string } | void
    >({
      query: (params) => ({
        url: '/communication/notifications',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Notifications'],
    }),

    getUnreadCount: builder.query<ApiResponse<{ unreadCount: number }>, void>({
      query: () => ({
        url: '/communication/notifications/unread-count',
        method: 'GET',
      }),
      providesTags: ['Notifications'],
    }),

    markAsRead: builder.mutation<ApiResponse<INotification>, string>({
      query: (id) => ({
        url: `/communication/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notifications'],
    }),

    markAllAsRead: builder.mutation<ApiResponse<{ updatedCount: number }>, void>({
      query: () => ({
        url: '/communication/notifications/mark-all-read',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),

    deleteNotification: builder.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `/communication/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notifications'],
    }),

    registerPushDevice: builder.mutation<
      ApiResponse<{ success: boolean }>,
      { token: string; platform: string; deviceName?: string }
    >({
      query: (body) => ({
        url: '/communication/notifications/push-devices',
        method: 'POST',
        body,
      }),
    }),

    // -------------------------------------------------------------------------
    // 2. Announcements
    // -------------------------------------------------------------------------
    getAnnouncements: builder.query<
      ApiResponse<PaginatedResult<IAnnouncement>>,
      { schoolId?: string; category?: string; search?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/communication/announcements',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Announcements'],
    }),

    listAllAnnouncements: builder.query<
      ApiResponse<PaginatedResult<IAnnouncement>>,
      { schoolId?: string; status?: string; category?: string; search?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/communication/announcements/manage',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Announcements'],
    }),

    getAnnouncementById: builder.query<ApiResponse<IAnnouncement>, string>({
      query: (id) => ({
        url: `/communication/announcements/${id}`,
        method: 'GET',
      }),
      providesTags: ['Announcements'],
    }),

    createAnnouncement: builder.mutation<ApiResponse<IAnnouncement>, any>({
      query: (body) => ({
        url: '/communication/announcements',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Announcements', 'CommunicationJobs', 'CommunicationStats'],
    }),

    updateAnnouncement: builder.mutation<ApiResponse<IAnnouncement>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/communication/announcements/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Announcements'],
    }),

    publishAnnouncement: builder.mutation<ApiResponse<IAnnouncement>, string>({
      query: (id) => ({
        url: `/communication/announcements/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: ['Announcements', 'CommunicationJobs', 'Notifications', 'CommunicationStats'],
    }),

    cancelAnnouncement: builder.mutation<ApiResponse<IAnnouncement>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/communication/announcements/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Announcements', 'CommunicationStats'],
    }),

    archiveAnnouncement: builder.mutation<ApiResponse<IAnnouncement>, string>({
      query: (id) => ({
        url: `/communication/announcements/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: ['Announcements', 'CommunicationStats'],
    }),

    acknowledgeAnnouncement: builder.mutation<ApiResponse<IAnnouncement>, string>({
      query: (id) => ({
        url: `/communication/announcements/${id}/acknowledge`,
        method: 'POST',
      }),
      invalidatesTags: ['Announcements'],
    }),

    // -------------------------------------------------------------------------
    // 3. Notification Templates
    // -------------------------------------------------------------------------
    getTemplates: builder.query<
      ApiResponse<PaginatedResult<INotificationTemplate>>,
      { category?: string; channel?: string; status?: string; search?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/communication/templates',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['NotificationTemplates'],
    }),

    getTemplateById: builder.query<ApiResponse<INotificationTemplate>, string>({
      query: (id) => ({
        url: `/communication/templates/${id}`,
        method: 'GET',
      }),
      providesTags: ['NotificationTemplates'],
    }),

    createTemplate: builder.mutation<ApiResponse<INotificationTemplate>, any>({
      query: (body) => ({
        url: '/communication/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['NotificationTemplates'],
    }),

    updateTemplate: builder.mutation<ApiResponse<INotificationTemplate>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/communication/templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['NotificationTemplates'],
    }),

    publishTemplate: builder.mutation<ApiResponse<INotificationTemplate>, string>({
      query: (id) => ({
        url: `/communication/templates/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: ['NotificationTemplates'],
    }),

    archiveTemplate: builder.mutation<ApiResponse<INotificationTemplate>, string>({
      query: (id) => ({
        url: `/communication/templates/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: ['NotificationTemplates'],
    }),

    // -------------------------------------------------------------------------
    // 4. Notification Preferences
    // -------------------------------------------------------------------------
    getPreferences: builder.query<ApiResponse<INotificationPreference>, void>({
      query: () => ({
        url: '/communication/preferences',
        method: 'GET',
      }),
      providesTags: ['NotificationPreferences'],
    }),

    updatePreferences: builder.mutation<ApiResponse<INotificationPreference>, any>({
      query: (body) => ({
        url: '/communication/preferences',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['NotificationPreferences'],
    }),

    // -------------------------------------------------------------------------
    // 5. Deliveries & Retries
    // -------------------------------------------------------------------------
    getDeliveries: builder.query<
      ApiResponse<PaginatedResult<INotificationDelivery>>,
      { status?: string; channel?: string; notificationId?: string; recipientId?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/communication/deliveries',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['NotificationDeliveries'],
    }),

    retryDelivery: builder.mutation<ApiResponse<INotificationDelivery>, string>({
      query: (id) => ({
        url: `/communication/deliveries/${id}/retry`,
        method: 'POST',
      }),
      invalidatesTags: ['NotificationDeliveries', 'CommunicationStats'],
    }),

    // -------------------------------------------------------------------------
    // 6. Bulk Communication Jobs
    // -------------------------------------------------------------------------
    getCommunicationJobs: builder.query<
      ApiResponse<PaginatedResult<ICommunicationJob>>,
      { status?: string; communicationType?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/communication/jobs',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['CommunicationJobs'],
    }),

    getCommunicationJobById: builder.query<ApiResponse<ICommunicationJob>, string>({
      query: (id) => ({
        url: `/communication/jobs/${id}`,
        method: 'GET',
      }),
      providesTags: ['CommunicationJobs'],
    }),

    createCommunicationJob: builder.mutation<ApiResponse<ICommunicationJob>, any>({
      query: (body) => ({
        url: '/communication/jobs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CommunicationJobs', 'CommunicationStats'],
    }),

    cancelCommunicationJob: builder.mutation<ApiResponse<ICommunicationJob>, string>({
      query: (id) => ({
        url: `/communication/jobs/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['CommunicationJobs', 'CommunicationStats'],
    }),

    // -------------------------------------------------------------------------
    // 7. Dashboard & Stats
    // -------------------------------------------------------------------------
    getCommunicationStats: builder.query<ApiResponse<ICommunicationDashboardStats>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/communication/reports/dashboard',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['CommunicationStats'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useRegisterPushDeviceMutation,
  useGetAnnouncementsQuery,
  useListAllAnnouncementsQuery,
  useGetAnnouncementByIdQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  usePublishAnnouncementMutation,
  useCancelAnnouncementMutation,
  useArchiveAnnouncementMutation,
  useAcknowledgeAnnouncementMutation,
  useGetTemplatesQuery,
  useGetTemplateByIdQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  usePublishTemplateMutation,
  useArchiveTemplateMutation,
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  useGetDeliveriesQuery,
  useRetryDeliveryMutation,
  useGetCommunicationJobsQuery,
  useGetCommunicationJobByIdQuery,
  useCreateCommunicationJobMutation,
  useCancelCommunicationJobMutation,
  useGetCommunicationStatsQuery,
} = communicationApi;
