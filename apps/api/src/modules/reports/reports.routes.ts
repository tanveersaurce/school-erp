import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission, requireAnyPermission } from '../../middlewares/authorize.js';
import { ReportsController } from './reports.controller.js';

export const reportsRouter = Router();

// All reporting endpoints require authentication
reportsRouter.use(authenticate);

// ============================================================================
// 1. Executive Dashboard Overview
// ============================================================================
reportsRouter.get(
  '/dashboard',
  requireAnyPermission(['analytics:read', 'report:read']),
  ReportsController.getDashboardOverview
);

// ============================================================================
// 2. Report Definitions Catalog
// ============================================================================
reportsRouter.get(
  '/definitions',
  requirePermission('report:read'),
  ReportsController.getDefinitions
);

reportsRouter.get(
  '/definitions/:key',
  requirePermission('report:read'),
  ReportsController.getDefinitionByKey
);

// ============================================================================
// 3. Export Management (Sync & Async Jobs)
// ============================================================================
reportsRouter.get(
  '/exports',
  requirePermission('report:export'),
  ReportsController.listUserExportJobs
);

reportsRouter.post(
  '/exports',
  requirePermission('report:export'),
  ReportsController.createExportJob
);

reportsRouter.get(
  '/exports/:id',
  requirePermission('report:export'),
  ReportsController.getExportJobStatus
);

reportsRouter.get(
  '/exports/:id/download',
  requirePermission('report:export'),
  ReportsController.downloadExportFile
);

// ============================================================================
// 4. Scheduled Reports Configuration
// ============================================================================
reportsRouter.get(
  '/scheduled',
  requirePermission('report:schedule'),
  ReportsController.listScheduledReports
);

reportsRouter.post(
  '/scheduled',
  requirePermission('report:schedule'),
  ReportsController.createScheduledReport
);

reportsRouter.get(
  '/scheduled/:id',
  requirePermission('report:schedule'),
  ReportsController.getScheduledReport
);

reportsRouter.put(
  '/scheduled/:id',
  requirePermission('report:schedule'),
  ReportsController.updateScheduledReport
);

reportsRouter.delete(
  '/scheduled/:id',
  requirePermission('report:schedule'),
  ReportsController.deleteScheduledReport
);

reportsRouter.post(
  '/scheduled/:id/run',
  requirePermission('report:schedule'),
  ReportsController.triggerScheduledReportNow
);

// ============================================================================
// 5. Report Execution & Export (Parameterized Endpoints)
// ============================================================================
reportsRouter.get(
  '/run/:key',
  requirePermission('report:read'),
  ReportsController.runReport
);

reportsRouter.post(
  '/run/:key',
  requirePermission('report:read'),
  ReportsController.runReport
);

reportsRouter.get(
  '/export/:key',
  requirePermission('report:export'),
  ReportsController.exportReport
);

reportsRouter.post(
  '/export/:key',
  requirePermission('report:export'),
  ReportsController.exportReport
);
