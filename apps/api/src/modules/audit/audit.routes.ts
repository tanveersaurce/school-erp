import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { auditController } from './audit.controller.js';

export const auditRouter = Router();

// 1. Query audit trail logs
auditRouter.get(
  '/',
  authenticate,
  requirePermission('audit:read'),
  auditController.getAuditLogs.bind(auditController)
);

// 2. Query resource audit trail history
auditRouter.get(
  '/resource/:entity/:entityId',
  authenticate,
  requirePermission('audit:read'),
  auditController.getResourceAuditHistory.bind(auditController)
);

// 3. Query single audit trail log detail
auditRouter.get(
  '/:id',
  authenticate,
  requirePermission('audit:read'),
  auditController.getAuditLogById.bind(auditController)
);
