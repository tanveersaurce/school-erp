import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from './setup.js';
import {
  Tenant,
  School,
  ReportExportJob,
  ScheduledReport,
} from '../src/models/index.js';
import {
  TenantPlan,
  TenantBillingStatus,
  ReportFormat,
  ExportJobStatus,
  ReportScheduleFrequency,
} from '@edusphere/common';

describe('Reports & Analytics Database Invariants Suite', () => {
  let tenant1Id: Types.ObjectId;
  let tenant2Id: Types.ObjectId;
  let school1Id: Types.ObjectId;
  let user1Id: Types.ObjectId;
  let user2Id: Types.ObjectId;

  beforeAll(async () => {
    await setupTestDB();
    await ReportExportJob.init();
    await ScheduledReport.init();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    tenant1Id = new Types.ObjectId();
    tenant2Id = new Types.ObjectId();
    school1Id = new Types.ObjectId();
    user1Id = new Types.ObjectId();
    user2Id = new Types.ObjectId();

    await Tenant.create([
      {
        _id: tenant1Id,
        name: 'Alpha International School',
        slug: 'alpha-intl',
        domain: 'alpha.edusphere.test',
        plan: TenantPlan.ENTERPRISE,
        billingStatus: TenantBillingStatus.ACTIVE,
      },
      {
        _id: tenant2Id,
        name: 'Beta Academy',
        slug: 'beta-acad',
        domain: 'beta.edusphere.test',
        plan: TenantPlan.PRO,
        billingStatus: TenantBillingStatus.ACTIVE,
      },
    ]);

    await School.create({
      _id: school1Id,
      tenantId: tenant1Id,
      name: 'Alpha Campus 1',
      code: 'ALP-01',
      affiliationBoard: 'STATE',
    });
  });

  describe('ReportExportJob Model Invariants', () => {
    it('creates an export job with default queued status and 0 progress', async () => {
      const job = await ReportExportJob.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        requestedBy: user1Id,
        reportKey: 'students.enrollment-roster',
        filters: { status: 'ACTIVE', academicYearId: 'ay_2026' },
        format: ReportFormat.CSV,
      });

      expect(job._id).toBeDefined();
      expect(job.status).toBe(ExportJobStatus.QUEUED);
      expect(job.progressPercentage).toBe(0);
      expect(job.format).toBe(ReportFormat.CSV);
      expect(job.rowCount).toBe(0);
      expect(job.fileSizeBytes).toBe(0);
    });

    it('rejects job creation without mandatory tenantId or requestedBy', async () => {
      await expect(
        ReportExportJob.create({
          reportKey: 'academic.grades',
          format: ReportFormat.CSV,
        } as any)
      ).rejects.toThrow();
    });

    it('updates progress, rowCount, fileReference, and completedAt upon completion', async () => {
      const job = await ReportExportJob.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        requestedBy: user1Id,
        reportKey: 'fees.dues-summary',
        filters: {},
        format: ReportFormat.CSV,
      });

      const completedAt = new Date();
      job.status = ExportJobStatus.COMPLETED;
      job.progressPercentage = 100;
      job.rowCount = 150;
      job.fileSizeBytes = 20480;
      job.fileReference = 'exports/tenant1/fees-dues.csv';
      job.downloadUrl = '/api/v1/reports/exports/' + job._id + '/download';
      job.completedAt = completedAt;
      await job.save();

      const found = await ReportExportJob.findById(job._id);
      expect(found?.status).toBe(ExportJobStatus.COMPLETED);
      expect(found?.progressPercentage).toBe(100);
      expect(found?.rowCount).toBe(150);
      expect(found?.fileSizeBytes).toBe(20480);
      expect(found?.downloadUrl).toBeDefined();
    });

    it('enforces multi-tenant data isolation on export jobs', async () => {
      await ReportExportJob.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        requestedBy: user1Id,
        reportKey: 'attendance.daily-summary',
        filters: {},
        format: ReportFormat.CSV,
      });

      await ReportExportJob.create({
        tenantId: tenant2Id,
        requestedBy: user2Id,
        reportKey: 'finance.trial-balance',
        filters: {},
        format: ReportFormat.CSV,
      });

      const tenant1Jobs = await ReportExportJob.find({ tenantId: tenant1Id });
      expect(tenant1Jobs).toHaveLength(1);
      expect(tenant1Jobs[0].reportKey).toBe('attendance.daily-summary');

      const tenant2Jobs = await ReportExportJob.find({ tenantId: tenant2Id });
      expect(tenant2Jobs).toHaveLength(1);
      expect(tenant2Jobs[0].reportKey).toBe('finance.trial-balance');
    });
  });

  describe('ScheduledReport Model Invariants', () => {
    it('creates a recurring report schedule with valid frequencies', async () => {
      const schedule = await ScheduledReport.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        name: 'Weekly Fee Collection Report',
        description: 'Auto-generates fee reports every Monday',
        reportKey: 'fees.collection-summary',
        filters: { period: 'last_7_days' },
        format: ReportFormat.CSV,
        frequency: ReportScheduleFrequency.WEEKLY,
        timeOfDay: '07:30',
        dayOfWeek: 1,
        recipients: ['principal@alpha.edu', 'accountant@alpha.edu'],
        isActive: true,
        createdBy: user1Id,
      });

      expect(schedule._id).toBeDefined();
      expect(schedule.frequency).toBe(ReportScheduleFrequency.WEEKLY);
      expect(schedule.recipients).toHaveLength(2);
      expect(schedule.isActive).toBe(true);
      expect(schedule.dayOfWeek).toBe(1);
    });

    it('handles toggle active state and tracking lastRunAt / nextRunAt', async () => {
      const schedule = await ScheduledReport.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        name: 'Daily Attendance Report',
        reportKey: 'attendance.daily-summary',
        filters: {},
        format: ReportFormat.CSV,
        frequency: ReportScheduleFrequency.DAILY,
        recipients: ['admin@alpha.edu'],
        createdBy: user1Id,
      });

      const now = new Date();
      const nextRun = new Date(Date.now() + 86400000);
      schedule.lastRunAt = now;
      schedule.nextRunAt = nextRun;
      schedule.lastRunStatus = 'SUCCESS';
      await schedule.save();

      const updated = await ScheduledReport.findById(schedule._id);
      expect(updated?.lastRunStatus).toBe('SUCCESS');
      expect(updated?.lastRunAt).toEqual(now);
      expect(updated?.nextRunAt).toEqual(nextRun);
    });

    it('enforces multi-tenant data isolation on scheduled reports', async () => {
      await ScheduledReport.create({
        tenantId: tenant1Id,
        schoolId: school1Id,
        name: 'T1 Schedule',
        reportKey: 'hr.attendance-summary',
        frequency: ReportScheduleFrequency.MONTHLY,
        recipients: ['hr@alpha.edu'],
        createdBy: user1Id,
      });

      await ScheduledReport.create({
        tenantId: tenant2Id,
        name: 'T2 Schedule',
        reportKey: 'inventory.stock-level',
        frequency: ReportScheduleFrequency.WEEKLY,
        recipients: ['ops@beta.edu'],
        createdBy: user2Id,
      });

      const t1Schedules = await ScheduledReport.find({ tenantId: tenant1Id });
      expect(t1Schedules).toHaveLength(1);
      expect(t1Schedules[0].name).toBe('T1 Schedule');

      const t2Schedules = await ScheduledReport.find({ tenantId: tenant2Id });
      expect(t2Schedules).toHaveLength(1);
      expect(t2Schedules[0].name).toBe('T2 Schedule');
    });
  });
});
