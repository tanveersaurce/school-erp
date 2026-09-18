import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import {
  NotificationCenterPage,
  AnnouncementsPage,
  NotificationPreferencesPage,
  CommunicationReportsPage,
  NotificationTemplatesPage,
  CommunicationJobsPage,
  NotificationDeliveriesPage,
} from '../pages/communication/index.js';
import { NotificationBell } from '../components/common/NotificationBell.js';
import {
  UserType,
  UserStatus,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  DeliveryStatus,
  TemplateStatus,
  AnnouncementStatus,
  AnnouncementCategory,
  CommunicationJobType,
  CommunicationJobStatus,
} from '@edusphere/common';

// =============================================================================
// Mock Domain Data
// =============================================================================

const mockNotifications = [
  {
    id: 'notif_001',
    _id: 'notif_001',
    tenantId: 'tenant_test_123',
    recipientId: 'comm_user_01',
    category: NotificationCategory.ACADEMIC,
    title: 'Midterm Grade Published',
    body: 'Your mathematics midterm exam score is 94/100.',
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.DELIVERED,
    isRead: false,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif_002',
    _id: 'notif_002',
    tenantId: 'tenant_test_123',
    recipientId: 'comm_user_01',
    category: NotificationCategory.SECURITY,
    title: 'Security Alert: Password Changed',
    body: 'Your portal account password was successfully updated.',
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.DELIVERED,
    isRead: true,
    channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
    createdAt: new Date().toISOString(),
  },
];

const mockAnnouncements = [
  {
    id: 'ann_001',
    _id: 'ann_001',
    tenantId: 'tenant_test_123',
    schoolId: 'school_test_123',
    title: 'Annual Sports Meet 2026',
    content: 'Registration for track and field events is now open to all grades.',
    category: AnnouncementCategory.EVENT,
    priority: NotificationPriority.NORMAL,
    status: AnnouncementStatus.PUBLISHED,
    publishedAt: new Date().toISOString(),
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    createdAt: new Date().toISOString(),
  },
];

const mockPreferences = {
  id: 'pref_001',
  tenantId: 'tenant_test_123',
  userId: 'comm_user_01',
  globalChannels: {
    inApp: true,
    email: true,
    sms: false,
    push: true,
    whatsapp: false,
  },
  categoryPreferences: [
    {
      category: NotificationCategory.ACADEMIC,
      inApp: true,
      email: true,
      sms: false,
      push: true,
      whatsapp: false,
    },
  ],
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
    timezone: 'UTC',
  },
};

const mockStats = {
  totalNotificationsSent: 1250,
  unreadNotificationsCount: 14,
  deliveryRatePercentage: 99.4,
  channelBreakdown: {
    IN_APP: 600,
    EMAIL: 450,
    SMS: 100,
    PUSH: 80,
    WHATSAPP: 20,
  },
  failedDeliveriesCount: 3,
  activeAnnouncementsCount: 5,
  pendingQueueDepth: 0,
};

const mockTemplates = [
  {
    id: 'tpl_001',
    _id: 'tpl_001',
    templateKey: 'STUDENT_GRADE_ALERT',
    eventType: 'grade.posted',
    category: NotificationCategory.ACADEMIC,
    channel: NotificationChannel.EMAIL,
    titleTemplate: 'Grade Posted: {{subject}}',
    bodyTemplate: 'Dear {{studentName}}, your grade for {{subject}} is {{grade}}.',
    status: TemplateStatus.ACTIVE,
  },
];

const mockJobs = [
  {
    id: 'job_001',
    _id: 'job_001',
    title: 'Parent Broadcast: Severe Weather Alert',
    communicationType: CommunicationJobType.ANNOUNCEMENT_BROADCAST,
    status: CommunicationJobStatus.COMPLETED,
    totalRecipients: 450,
    processedRecipients: 450,
    successCount: 448,
    failureCount: 2,
    createdAt: new Date().toISOString(),
  },
];

const mockDeliveries = [
  {
    id: 'del_001',
    _id: 'del_001',
    notificationId: 'notif_001',
    recipientId: 'user_recipient_99',
    channel: NotificationChannel.EMAIL,
    provider: 'SendGridMock',
    status: DeliveryStatus.DELIVERED,
    attemptCount: 1,
    deliveredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'del_002',
    _id: 'del_002',
    notificationId: 'notif_002',
    recipientId: 'user_recipient_98',
    channel: NotificationChannel.SMS,
    provider: 'TwilioMock',
    status: DeliveryStatus.FAILED,
    attemptCount: 3,
    failureCode: 'INVALID_NUMBER',
    failureReason: 'Destination phone number unroutable',
    failedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// =============================================================================
// Test Store & Providers Setup
// =============================================================================

function createTestStore(
  userType: UserType = UserType.SCHOOL_ADMIN,
  userPermissions: string[] = [
    'notification:read',
    'notification:manage',
    'announcement:read',
    'announcement:create',
    'announcement:publish',
    'notification_template:read',
    'notification_preference:read',
    'notification_preference:update',
    'notification_delivery:read',
    'notification_delivery:retry',
    'communication:read',
    'communication:create',
    'communication_report:read',
  ]
) {
  const rootReducer = combineReducers({
    auth: authReducer,
    ui: uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware) as any,
    preloadedState: {
      auth: {
        isAuthenticated: true,
        isInitialized: true,
        currentSession: null,
        user: {
          id: 'comm_user_01',
          tenantId: 'tenant_test_123',
          schoolId: 'school_test_123',
          email: 'comm@edusphere.edu',
          userType,
          status: UserStatus.ACTIVE,
          roles: [userType],
          permissions: userPermissions,
        },
        accessToken: 'mock_jwt_token',
      },
    },
  });
}

function renderWithProviders(element: React.ReactElement, store = createTestStore()) {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>{element}</ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Phase 19: Communication & Notifications Frontend Component Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    const jsonResponse = (data: any) =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as any).url || String(input);

      if (url.includes('/communication/notifications/unread-count')) {
        return jsonResponse({ unreadCount: 1 });
      }
      if (url.includes('/communication/notifications')) {
        return jsonResponse({
          items: mockNotifications,
          total: mockNotifications.length,
          page: 1,
          limit: 20,
        });
      }
      if (url.includes('/communication/announcements')) {
        return jsonResponse({
          items: mockAnnouncements,
          total: mockAnnouncements.length,
          page: 1,
          limit: 20,
        });
      }
      if (url.includes('/communication/preferences')) {
        return jsonResponse(mockPreferences);
      }
      if (url.includes('/communication/reports/dashboard')) {
        return jsonResponse(mockStats);
      }
      if (url.includes('/communication/templates')) {
        return jsonResponse({
          items: mockTemplates,
          total: mockTemplates.length,
          page: 1,
          limit: 15,
        });
      }
      if (url.includes('/communication/jobs')) {
        return jsonResponse({
          items: mockJobs,
          total: mockJobs.length,
          page: 1,
          limit: 20,
        });
      }
      if (url.includes('/communication/deliveries')) {
        return jsonResponse({
          items: mockDeliveries,
          total: mockDeliveries.length,
          page: 1,
          limit: 20,
        });
      }

      return jsonResponse({});
    });
  });

  it('renders NotificationCenterPage with notification items and unread count', async () => {
    renderWithProviders(<NotificationCenterPage />);

    expect(screen.getByText(/Notification Center/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Midterm Grade Published')).toBeInTheDocument();
      expect(screen.getByText('Security Alert: Password Changed')).toBeInTheDocument();
    });
  });

  it('renders NotificationBell with badge and toggles popup dropdown', async () => {
    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      // Unread badge with count 1
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByText('Midterm Grade Published')).toBeInTheDocument();
    });
  });

  it('renders AnnouncementsPage with published broadcasts', async () => {
    renderWithProviders(<AnnouncementsPage />);

    expect(screen.getByText(/School Announcements/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Annual Sports Meet 2026')).toBeInTheDocument();
      expect(screen.getByText(/Registration for track and field/i)).toBeInTheDocument();
    });
  });

  it('renders NotificationPreferencesPage with channel toggles and quiet hours', async () => {
    renderWithProviders(<NotificationPreferencesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notification Preferences' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Global Delivery Channels' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Quiet Hours' })).toBeInTheDocument();
      expect(screen.getByText('Academic & Courses')).toBeInTheDocument();
      expect(screen.getByText('Security Alerts')).toBeInTheDocument();
    });
  });

  it('renders CommunicationReportsPage with executive KPIs and telemetry', async () => {
    renderWithProviders(<CommunicationReportsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Communication Intelligence & Reports/i)).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument(); // total sent
      expect(screen.getByText('99.4%')).toBeInTheDocument(); // delivery rate
      expect(screen.getByText(/Channel Volume & Telemetry/i)).toBeInTheDocument();
    });
  });

  it('renders NotificationTemplatesPage with template registry', async () => {
    renderWithProviders(<NotificationTemplatesPage />);

    expect(screen.getByText(/Notification Templates/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('STUDENT_GRADE_ALERT')).toBeInTheDocument();
      expect(screen.getByText('grade.posted')).toBeInTheDocument();
    });
  });

  it('renders CommunicationJobsPage with bulk batch job progress', async () => {
    renderWithProviders(<CommunicationJobsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Communication Jobs & Campaigns/i)).toBeInTheDocument();
      expect(screen.getByText(/Parent Broadcast: Severe Weather Alert/i)).toBeInTheDocument();
      expect(screen.getByText(/450 \/ 450/i)).toBeInTheDocument();
    });
  });

  it('renders NotificationDeliveriesPage with delivery audit trail', async () => {
    renderWithProviders(<NotificationDeliveriesPage />);

    expect(screen.getByText(/Delivery Logs & Audit Trail/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('user_recipient_99')).toBeInTheDocument();
      expect(screen.getByText('user_recipient_98')).toBeInTheDocument();
      expect(screen.getByText(/INVALID_NUMBER/i)).toBeInTheDocument();
    });
  });
});
