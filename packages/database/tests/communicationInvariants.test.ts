import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import {
  Tenant,
  School,
  Notification,
  NotificationDelivery,
  NotificationTemplate,
  NotificationPreference,
  Announcement,
  CommunicationJob,
  PushDevice,
} from '../src/models/index.js';
import {
  TenantPlan,
  TenantBillingStatus,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  DeliveryStatus,
  TemplateStatus,
  AnnouncementStatus,
  AnnouncementCategory,
  PushPlatform,
} from '@edusphere/common';

describe('Communication & Notification Database Invariants Suite', () => {
  let tenant1Id: Types.ObjectId;
  let tenant2Id: Types.ObjectId;
  let school1Id: Types.ObjectId;
  let school2Id: Types.ObjectId;
  let user1Id: Types.ObjectId;
  let user2Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await Notification.init();
    await NotificationDelivery.init();
    await NotificationTemplate.init();
    await NotificationPreference.init();
    await Announcement.init();
    await CommunicationJob.init();
    await PushDevice.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    tenant1Id = new Types.ObjectId();
    tenant2Id = new Types.ObjectId();
    school1Id = new Types.ObjectId();
    school2Id = new Types.ObjectId();
    user1Id = new Types.ObjectId();
    user2Id = new Types.ObjectId();

    await Tenant.create({
      _id: tenant1Id,
      name: 'Alpha International School',
      slug: 'alpha-school',
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await Tenant.create({
      _id: tenant2Id,
      name: 'Beta Global Academy',
      slug: 'beta-academy',
      plan: TenantPlan.STANDARD,
      billingStatus: TenantBillingStatus.ACTIVE,
    });

    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Alpha Primary',
      code: 'ALPHA-PRI',
      affiliationBoard: 'STATE',
    });

    await School.create({
      _id: school2Id,
      tenantId: tenant2Id,
      name: 'Beta High',
      code: 'BETA-HIGH',
      affiliationBoard: 'STATE',
    });
  });

  it('1. enforces unique compound index on NotificationPreference (tenantId + userId)', async () => {
    await NotificationPreference.create({
      tenantId: tenant1Id,
      userId: user1Id,
      globalChannels: { inApp: true, email: true, sms: false, push: true, whatsapp: false },
      quietHours: { enabled: true, start: '22:00', end: '07:00', timezone: 'Asia/Kolkata' },
    });

    // Duplicate preference for same user in same tenant MUST fail with duplicate key error
    await expect(
      NotificationPreference.create({
        tenantId: tenant1Id,
        userId: user1Id,
        globalChannels: { inApp: false, email: false, sms: false, push: false, whatsapp: false },
      })
    ).rejects.toThrow();

    // Same user in different tenant MUST succeed (cross-tenant independence)
    const crossTenantPref = await NotificationPreference.create({
      tenantId: tenant2Id,
      userId: user1Id,
      globalChannels: { inApp: true, email: false, sms: false, push: false, whatsapp: false },
    });
    expect(crossTenantPref).toBeDefined();
    expect(crossTenantPref.tenantId.toString()).toBe(tenant2Id.toString());
  });

  it('2. verifies in-app Notification recipient scoping and unread index query', async () => {
    // Create notifications for user1
    await Notification.create({
      tenantId: tenant1Id,
      recipientId: user1Id,
      category: NotificationCategory.ATTENDANCE,
      eventType: 'attendance.low',
      title: 'Low Attendance Alert',
      body: 'Your attendance has dropped below 75%.',
      priority: NotificationPriority.HIGH,
      isRead: false,
      status: NotificationStatus.DELIVERED,
    });

    await Notification.create({
      tenantId: tenant1Id,
      recipientId: user1Id,
      category: NotificationCategory.HOMEWORK,
      eventType: 'homework.published',
      title: 'New Homework Assigned',
      body: 'Physics Chapter 4 problems are due Friday.',
      priority: NotificationPriority.NORMAL,
      isRead: true,
      readAt: new Date(),
      status: NotificationStatus.DELIVERED,
    });

    // Notification for user2 (different recipient)
    await Notification.create({
      tenantId: tenant1Id,
      recipientId: user2Id,
      category: NotificationCategory.FEES,
      eventType: 'fee.invoice_created',
      title: 'Fee Invoice Generated',
      body: 'Term 2 fees invoice is now available.',
      priority: NotificationPriority.NORMAL,
      isRead: false,
      status: NotificationStatus.DELIVERED,
    });

    // Query unread for user1
    const unreadUser1 = await Notification.find({
      tenantId: tenant1Id,
      recipientId: user1Id,
      isRead: false,
    });
    expect(unreadUser1.length).toBe(1);
    expect(unreadUser1[0].title).toBe('Low Attendance Alert');

    // Total for user1
    const totalUser1 = await Notification.find({
      tenantId: tenant1Id,
      recipientId: user1Id,
    });
    expect(totalUser1.length).toBe(2);
  });

  it('3. enforces unique compound index on PushDevice (tenantId + userId + token)', async () => {
    const token = 'fcm_device_token_abc_123';

    await PushDevice.create({
      tenantId: tenant1Id,
      userId: user1Id,
      token,
      platform: PushPlatform.ANDROID,
      deviceName: 'Pixel 8 Pro',
      isActive: true,
    });

    // Duplicate registration of same token for same user in same tenant MUST fail
    await expect(
      PushDevice.create({
        tenantId: tenant1Id,
        userId: user1Id,
        token,
        platform: PushPlatform.ANDROID,
        deviceName: 'Duplicate Device',
        isActive: true,
      })
    ).rejects.toThrow();

    // Different user registering same physical device or different device for user1 succeeds
    const differentDevice = await PushDevice.create({
      tenantId: tenant1Id,
      userId: user1Id,
      token: 'fcm_web_token_xyz_789',
      platform: PushPlatform.WEB,
      deviceName: 'Chrome on macOS',
      isActive: true,
    });
    expect(differentDevice).toBeDefined();
    expect(differentDevice.token).toBe('fcm_web_token_xyz_789');
  });

  it('4. verifies multi-tenant isolation and soft-delete behavior on Announcements', async () => {
    const announcement1 = await Announcement.create({
      tenantId: tenant1Id,
      schoolId: school1Id,
      title: 'Alpha Annual Sports Day',
      content: 'Sports day will be celebrated on November 15.',
      category: AnnouncementCategory.SPORTS,
      priority: NotificationPriority.HIGH,
      status: AnnouncementStatus.PUBLISHED,
      authorId: user1Id,
      targetAudience: { isAll: true },
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    });

    await Announcement.create({
      tenantId: tenant2Id,
      schoolId: school2Id,
      title: 'Beta Science Exhibition',
      content: 'Science fair next Monday.',
      category: AnnouncementCategory.ACADEMIC,
      priority: NotificationPriority.NORMAL,
      status: AnnouncementStatus.PUBLISHED,
      authorId: user2Id,
      targetAudience: { isAll: true },
      channels: [NotificationChannel.IN_APP],
    });

    // Tenant 1 query only retrieves Tenant 1 announcement
    const tenant1Announcements = await Announcement.find({ tenantId: tenant1Id });
    expect(tenant1Announcements.length).toBe(1);
    expect(tenant1Announcements[0].title).toBe('Alpha Annual Sports Day');

    // Soft delete announcement1
    announcement1.isDeleted = true;
    await announcement1.save();

    // Query excluding soft-deleted
    const activeAnnouncements = await Announcement.find({
      tenantId: tenant1Id,
      isDeleted: { $ne: true },
    });
    expect(activeAnnouncements.length).toBe(0);
  });

  it('5. verifies NotificationDelivery lifecycle, attempt tracking and per-channel indexing', async () => {
    const notifId = new Types.ObjectId();

    const delivery = await NotificationDelivery.create({
      tenantId: tenant1Id,
      notificationId: notifId,
      recipientId: user1Id,
      channel: NotificationChannel.EMAIL,
      provider: 'DevEmailProvider',
      status: DeliveryStatus.PENDING,
      attemptCount: 1,
      queuedAt: new Date(),
    });

    expect(delivery.status).toBe(DeliveryStatus.PENDING);
    expect(delivery.attemptCount).toBe(1);

    // Simulate transient failure and retry scheduling
    delivery.status = DeliveryStatus.FAILED;
    delivery.attemptCount = 2;
    delivery.failureCode = 'SMTP_TIMEOUT';
    delivery.failureReason = 'Connection timed out after 5000ms';
    delivery.nextRetryAt = new Date(Date.now() + 60000); // 1 minute exponential backoff
    await delivery.save();

    const pendingRetries = await NotificationDelivery.find({
      tenantId: tenant1Id,
      status: DeliveryStatus.FAILED,
      nextRetryAt: { $lte: new Date(Date.now() + 120000) },
    });
    expect(pendingRetries.length).toBe(1);
    expect(pendingRetries[0].failureCode).toBe('SMTP_TIMEOUT');

    // Mark as delivered
    delivery.status = DeliveryStatus.DELIVERED;
    delivery.deliveredAt = new Date();
    await delivery.save();

    const completed = await NotificationDelivery.findById(delivery._id);
    expect(completed?.status).toBe(DeliveryStatus.DELIVERED);
    expect(completed?.deliveredAt).toBeDefined();
  });

  it('6. verifies NotificationTemplate versioning and multi-channel support', async () => {
    // Template v1
    const v1 = await NotificationTemplate.create({
      tenantId: tenant1Id,
      templateKey: 'FEE_DUE_REMINDER',
      category: NotificationCategory.FEES,
      eventType: 'fee.due_reminder',
      channel: NotificationChannel.EMAIL,
      locale: 'en-IN',
      version: 1,
      subject: 'Notice: Tuition Fee Due for {{studentName}}',
      titleTemplate: 'Tuition Fee Due Notice',
      bodyTemplate: 'Dear {{parentName}}, fee of INR {{amount}} for {{studentName}} is due on {{dueDate}}.',
      variables: ['studentName', 'parentName', 'amount', 'dueDate'],
      status: TemplateStatus.ARCHIVED,
    });

    // Template v2 (newer version of the same template key)
    const v2 = await NotificationTemplate.create({
      tenantId: tenant1Id,
      templateKey: 'FEE_DUE_REMINDER',
      category: NotificationCategory.FEES,
      eventType: 'fee.due_reminder',
      channel: NotificationChannel.EMAIL,
      locale: 'en-IN',
      version: 2,
      subject: 'Reminder: Fee Payment Due for {{studentName}}',
      titleTemplate: 'Urgent Fee Payment Reminder',
      bodyTemplate: 'Dear {{parentName}}, the fee of INR {{amount}} for {{studentName}} is due on {{dueDate}}. Pay now.',
      variables: ['studentName', 'parentName', 'amount', 'dueDate'],
      status: TemplateStatus.ACTIVE,
    });

    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);

    // Latest active template query
    const latestActive = await NotificationTemplate.findOne({
      tenantId: tenant1Id,
      templateKey: 'FEE_DUE_REMINDER',
      channel: NotificationChannel.EMAIL,
      locale: 'en-IN',
      status: TemplateStatus.ACTIVE,
    }).sort({ version: -1 });

    expect(latestActive).toBeDefined();
    expect(latestActive?.version).toBe(2);
    expect(latestActive?.titleTemplate).toBe('Urgent Fee Payment Reminder');
  });
});
