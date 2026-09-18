import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import {
  Tenant,
  School,
  User,
  Notification,
  NotificationDelivery,
  NotificationPreference,
} from '@edusphere/database';
import {
  TenantStatus,
  TenantPlan,
  TenantBillingStatus,
  UserType,
  UserStatus,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from '@edusphere/common';
import { eventBus } from '../src/modules/communication/events/event-bus.js';
import { NotificationResolverService } from '../src/modules/communication/services/notification-resolver.service.js';
import { NotificationPreferenceService } from '../src/modules/communication/services/notification-preference.service.js';

describe('Phase 19: Communication Events, Deduplication & Preferences Suite', () => {
  let replSet: MongoMemoryReplSet;

  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  let userId: Types.ObjectId;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    await Tenant.init();
    await School.init();
    await User.init();
    await Notification.init();
    await NotificationDelivery.init();
    await NotificationPreference.init();

    await Tenant.create({
      _id: tenantId,
      name: 'Events Test Tenant',
      slug: 'events-tenant',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.ENTERPRISE,
      billingStatus: TenantBillingStatus.ACTIVE,
      contact: { email: 'events@test.edu', phone: '+1234567890' },
    });

    await School.create({
      _id: schoolId,
      tenantId,
      name: 'Events School',
      code: 'EVT-01',
      status: 'ACTIVE',
      currency: 'USD',
      timezone: 'UTC',
      affiliationBoard: 'STATE',
    });

    userId = new Types.ObjectId();
    await User.create({
      _id: userId,
      tenantId,
      schoolId,
      email: 'events.user@test.edu',
      phone: '+15550001111',
      passwordHash: 'dummyHash123',
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  describe('1. EventBus Pub/Sub and Pattern Matching', () => {
    it('Emits and receives events via exact match subscription', async () => {
      let received = false;
      const testEvent = {
        eventId: 'evt_test_1',
        eventType: 'student.registered',
        tenantId: tenantId.toString(),
        sourceEntityType: 'Student',
        sourceEntityId: userId.toString(),
        occurredAt: new Date(),
        version: 1,
        payload: { studentName: 'Alex' },
      };

      eventBus.subscribe('student.registered', async (evt) => {
        if (evt.eventId === 'evt_test_1') {
          received = true;
        }
      });

      await eventBus.emit(testEvent);
      expect(received).toBe(true);
    });

    it('Matches wildcard event patterns (e.g. academic.*)', async () => {
      let matchedCount = 0;

      eventBus.subscribe('academic.*', async () => {
        matchedCount++;
      });

      await eventBus.emit({
        eventId: 'evt_acad_1',
        eventType: 'academic.grade_posted',
        tenantId: tenantId.toString(),
        sourceEntityType: 'Grade',
        sourceEntityId: 'grade_123',
        occurredAt: new Date(),
        version: 1,
        payload: {},
      });

      await eventBus.emit({
        eventId: 'evt_acad_2',
        eventType: 'academic.syllabus_updated',
        tenantId: tenantId.toString(),
        sourceEntityType: 'Syllabus',
        sourceEntityId: 'syl_456',
        occurredAt: new Date(),
        version: 1,
        payload: {},
      });

      expect(matchedCount).toBe(2);
    });
  });

  describe('2. Deterministic Deduplication Enforcement', () => {
    it('Suppresses duplicate notification within deduplication window', async () => {
      const sourceId = 'assignment_unique_999';

      // First dispatch
      const firstResult = await NotificationResolverService.resolveAndSend({
        tenantId: tenantId.toString(),
        schoolId: schoolId.toString(),
        recipientId: userId.toString(),
        category: NotificationCategory.HOMEWORK,
        eventType: 'homework.assigned',
        title: 'Science Homework',
        body: 'Chapter 5 Exercises',
        priority: NotificationPriority.NORMAL,
        sourceEntityType: 'Homework',
        sourceEntityId: sourceId,
        targetChannels: [NotificationChannel.IN_APP],
      });

      expect(firstResult).toBeDefined();
      expect(firstResult._id).toBeDefined();

      // Second identical dispatch with same sourceEntityId + recipientId + eventType
      const secondResult = await NotificationResolverService.resolveAndSend({
        tenantId: tenantId.toString(),
        schoolId: schoolId.toString(),
        recipientId: userId.toString(),
        category: NotificationCategory.HOMEWORK,
        eventType: 'homework.assigned',
        title: 'Science Homework Duplicate',
        body: 'Chapter 5 Exercises',
        priority: NotificationPriority.NORMAL,
        sourceEntityType: 'Homework',
        sourceEntityId: sourceId,
        targetChannels: [NotificationChannel.IN_APP],
      });

      // Verify that the second call returns the existing notification and does not create a new one
      expect(secondResult._id.toString()).toBe(firstResult._id.toString());

      const count = await Notification.countDocuments({
        tenantId,
        recipientId: userId,
        sourceEntityId: sourceId,
      });
      expect(count).toBe(1);
    });
  });

  describe('3. User Notification Preferences & Channel Overrides', () => {
    it('Suppresses disabled channels based on user category preferences', async () => {
      // User disables EMAIL and enables IN_APP for FEES category
      await NotificationPreferenceService.updatePreferences(
        tenantId.toString(),
        userId.toString(),
        {
          categoryPreferences: [
            {
              category: NotificationCategory.FEES,
              inApp: true,
              email: false,
              sms: false,
              push: false,
              whatsapp: false,
            },
          ],
        }
      );

      const res = await NotificationResolverService.resolveAndSend({
        tenantId: tenantId.toString(),
        schoolId: schoolId.toString(),
        recipientId: userId.toString(),
        category: NotificationCategory.FEES,
        eventType: 'fees.invoice_generated',
        title: 'Tuition Fee Due',
        body: 'Please pay before month end',
        priority: NotificationPriority.NORMAL,
        sourceEntityType: 'Invoice',
        sourceEntityId: 'inv_101',
        targetChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });

      expect(res).toBeDefined();
      expect(res._id).toBeDefined();
      // Should have created IN_APP delivery, but skipped EMAIL
      const deliveries = await NotificationDelivery.find({
        notificationId: res._id,
      });

      const hasEmail = deliveries.some((d) => d.channel === NotificationChannel.EMAIL);
      expect(hasEmail).toBe(false);
    });
  });

  describe('4. Quiet Hours Evaluation & Critical Security Override', () => {
    it('Urgent security alert bypasses quiet hours and sends immediately', async () => {
      // Enable quiet hours: 00:00 to 23:59 (active all day)
      await NotificationPreferenceService.updatePreferences(
        tenantId.toString(),
        userId.toString(),
        {
          quietHours: {
            enabled: true,
            start: '00:00',
            end: '23:59',
            timezone: 'UTC',
          },
        }
      );

      // 1. Send an URGENT security notification
      const secResult = await NotificationResolverService.resolveAndSend({
        tenantId: tenantId.toString(),
        schoolId: schoolId.toString(),
        recipientId: userId.toString(),
        category: NotificationCategory.SECURITY,
        eventType: 'security.suspicious_login',
        title: 'Security Alert: New Device',
        body: 'Suspicious login detected from IP 1.2.3.4',
        priority: NotificationPriority.URGENT,
        sourceEntityType: 'SecurityAudit',
        sourceEntityId: 'sec_alert_001',
        targetChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });

      expect(secResult).toBeDefined();
      expect(secResult._id).toBeDefined();
      const secDeliveries = await NotificationDelivery.find({
        notificationId: secResult._id,
      });
      // Email delivery should be dispatched because URGENT / SECURITY bypasses quiet hours
      expect(secDeliveries.length).toBeGreaterThan(0);
    });
  });
});
