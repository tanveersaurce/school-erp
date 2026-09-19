import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, ValidationError } from '@edusphere/common';
import { auditService } from './audit.service.js';
import { auditQuerySchema } from './audit.validator.js';

export class AuditController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = auditQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new ValidationError('Audit log query validation failed.', [
          { field: parsed.error.issues[0]?.path.join('.'), issue: parsed.error.issues[0]?.message },
        ]);
      }

      const tenantId = req.auth?.tenantId || (req.tenantContext?.tenantId as string);
      const result = await auditService.queryAuditLogs(tenantId, parsed.data);

      res.status(200).json(
        createSuccessResponse(result, 'Audit logs retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth?.tenantId || (req.tenantContext?.tenantId as string);
      const { id } = req.params;
      const result = await auditService.getAuditLogById(tenantId, id);

      res.status(200).json(
        createSuccessResponse(result, 'Audit log detail retrieved successfully.', {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  async getResourceAuditHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth?.tenantId || (req.tenantContext?.tenantId as string);
      const { entity, entityId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await auditService.getResourceAuditHistory(tenantId, entity, entityId, page, limit);

      res.status(200).json(
        createSuccessResponse(result, `Audit history for ${entity}:${entityId} retrieved successfully.`, {
          requestId: req.id,
        })
      );
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
