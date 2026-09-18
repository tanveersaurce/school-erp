import { Request, Response, NextFunction } from 'express';
import {
  createSuccessResponse,
  AuthenticationError,
  NotFoundError,
  ReportCategory,
} from '@edusphere/common';
import {
  REPORT_DEFINITIONS,
  REPORT_DEFINITIONS_MAP,
} from './registry/report-definitions.js';
import { scopeResolverService } from './services/scope-resolver.service.js';
import { reportCacheService } from './services/report-cache.service.js';
import { reportQueryEngineService } from './services/report-query-engine.service.js';
import { dashboardOverviewService } from './services/dashboard-overview.service.js';
import { reportExportService } from './services/report-export.service.js';
import { scheduledReportService } from './services/scheduled-report.service.js';
import {
  runReportQuerySchema,
  exportReportSchema,
  createScheduledReportSchema,
  updateScheduledReportSchema,
} from './reports.validator.js';

export class ReportsController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = (req.tenantContext?.tenantId || auth.tenantId).toString();
    const userId = auth.userId.toString();
    const schoolId =
      (req.query.schoolId as string) ||
      (req.body?.schoolId as string) ||
      (auth.schoolId ? auth.schoolId.toString() : undefined);
    return { auth, tenantId, userId, schoolId };
  }

  private static reply(
    res: Response,
    req: Request,
    data: any,
    message = 'Operation completed successfully',
    status = 200
  ) {
    return res.status(status).json(
      createSuccessResponse(data, message, {
        requestId: (req as any).id,
      })
    );
  }

  // =========================================================================
  // 1. Report Definitions Registry
  // =========================================================================
  static getDefinitions(req: Request, res: Response, next: NextFunction): void {
    try {
      const category = req.query.category as ReportCategory | undefined;
      let defs = REPORT_DEFINITIONS;
      if (category && Object.values(ReportCategory).includes(category)) {
        defs = defs.filter((d) => d.category === category);
      }
      ReportsController.reply(res, req, defs, 'Report definitions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static getDefinitionByKey(req: Request, res: Response, next: NextFunction): void {
    try {
      const { key } = req.params;
      const def = REPORT_DEFINITIONS_MAP.get(key);
      if (!def) {
        throw new NotFoundError(`Report '${key}' not found.`);
      }
      ReportsController.reply(res, req, def, 'Report definition retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Report Execution (Query Engine)
  // =========================================================================
  static async runReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId, userId, schoolId } = ReportsController.getAuth(req);
      const parsed = runReportQuerySchema.parse({
        ...req.query,
        ...(req.body || {}),
        reportKey: req.params.key || req.query.reportKey || req.body?.reportKey,
      });

      const scope = await scopeResolverService.resolveScope(
        tenantId,
        userId,
        auth.userType,
        schoolId
      );

      const effectiveFilters = scopeResolverService.enforceFilterRestrictions(
        parsed.filters,
        scope
      );

      // Check Cache
      const cacheKey = reportCacheService.generateKey(
        tenantId,
        parsed.reportKey,
        effectiveFilters,
        scope
      );

      if (!parsed.bypassCache) {
        const cached = await reportCacheService.get(cacheKey);
        if (cached) {
          ReportsController.reply(res, req, cached, 'Report data retrieved from cache');
          return;
        }
      }

      // Execute Query Engine
      const result = await reportQueryEngineService.executeReport(
        {
          reportKey: parsed.reportKey,
          filters: effectiveFilters,
          page: parsed.page,
          limit: parsed.limit,
          sortBy: parsed.sortBy,
          sortDirection: parsed.sortDirection,
        },
        scope
      );

      // Store in Cache
      const ttl = result.definition?.cacheTtlSeconds || 300;
      await reportCacheService.set(cacheKey, result, ttl);

      ReportsController.reply(res, req, result, 'Report generated successfully');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Report Exports
  // =========================================================================
  static async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId, userId, schoolId } = ReportsController.getAuth(req);
      const parsed = exportReportSchema.parse({
        ...req.query,
        ...(req.body || {}),
        reportKey: req.params.key || req.query.reportKey || req.body?.reportKey,
      });

      const scope = await scopeResolverService.resolveScope(
        tenantId,
        userId,
        auth.userType,
        schoolId
      );

      const effectiveFilters = scopeResolverService.enforceFilterRestrictions(
        parsed.filters,
        scope
      );

      if (parsed.async) {
        const job = await reportExportService.createExportJob(
          parsed.reportKey,
          effectiveFilters,
          scope,
          parsed.format
        );
        ReportsController.reply(res, req, job, 'Export job queued successfully', 202);
        return;
      }

      const syncResult = await reportExportService.exportSync(
        parsed.reportKey,
        effectiveFilters,
        scope
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${syncResult.fileName}"`);
      res.status(200).send(syncResult.content);
    } catch (err) {
      next(err);
    }
  }

  static async createExportJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auth, tenantId, userId, schoolId } = ReportsController.getAuth(req);
      const parsed = exportReportSchema.parse(req.body);

      const scope = await scopeResolverService.resolveScope(
        tenantId,
        userId,
        auth.userType,
        schoolId
      );

      const effectiveFilters = scopeResolverService.enforceFilterRestrictions(
        parsed.filters,
        scope
      );

      const job = await reportExportService.createExportJob(
        parsed.reportKey,
        effectiveFilters,
        scope,
        parsed.format
      );

      ReportsController.reply(res, req, job, 'Export job initiated successfully', 202);
    } catch (err) {
      next(err);
    }
  }

  static async getExportJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = ReportsController.getAuth(req);
      const { id } = req.params;
      const job = await reportExportService.getJobStatus(id, tenantId);
      ReportsController.reply(res, req, job, 'Export job status retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listUserExportJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = ReportsController.getAuth(req);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await reportExportService.listUserJobs(tenantId, userId, page, limit);
      ReportsController.reply(res, req, result, 'User export jobs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async downloadExportFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = ReportsController.getAuth(req);
      const { id } = req.params;
      const file = await reportExportService.getExportFile(id, tenantId);

      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      res.status(200).send(file.content);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Executive Dashboard Overview
  // =========================================================================
  static async getDashboardOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, schoolId } = ReportsController.getAuth(req);
      const overview = await dashboardOverviewService.getOverview(tenantId, schoolId);
      ReportsController.reply(res, req, overview, 'Executive dashboard overview retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Scheduled Reports CRUD
  // =========================================================================
  static async createScheduledReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId, schoolId } = ReportsController.getAuth(req);
      const validated = createScheduledReportSchema.parse(req.body);
      const schedule = await scheduledReportService.createSchedule(
        validated,
        tenantId,
        userId,
        schoolId
      );
      ReportsController.reply(res, req, schedule, 'Scheduled report created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async listScheduledReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = ReportsController.getAuth(req);
      const schedules = await scheduledReportService.listSchedules(tenantId);
      ReportsController.reply(res, req, schedules, 'Scheduled reports listed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getScheduledReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = ReportsController.getAuth(req);
      const { id } = req.params;
      const schedule = await scheduledReportService.getScheduleById(id, tenantId);
      ReportsController.reply(res, req, schedule, 'Scheduled report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateScheduledReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = ReportsController.getAuth(req);
      const { id } = req.params;
      const validated = updateScheduledReportSchema.parse(req.body);
      const schedule = await scheduledReportService.updateSchedule(id, validated, tenantId, userId);
      ReportsController.reply(res, req, schedule, 'Scheduled report updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteScheduledReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = ReportsController.getAuth(req);
      const { id } = req.params;
      await scheduledReportService.deleteSchedule(id, tenantId);
      ReportsController.reply(res, req, { deleted: true }, 'Scheduled report deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async triggerScheduledReportNow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, userId } = ReportsController.getAuth(req);
      const { id } = req.params;
      const job = await scheduledReportService.triggerScheduleRun(id, tenantId, userId);
      ReportsController.reply(res, req, job, 'Scheduled report execution triggered', 202);
    } catch (err) {
      next(err);
    }
  }
}
