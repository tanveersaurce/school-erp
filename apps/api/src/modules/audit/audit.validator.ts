import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoId = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  dateTo: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  actorUserId: mongoId.optional(),
  actorType: z.enum(['USER', 'SYSTEM', 'WORKER', 'API', 'ADMIN']).optional(),
  action: z.string().trim().min(1).optional(),
  entity: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional(),
  schoolId: mongoId.optional(),
  campusId: mongoId.optional(),
  status: z.enum(['SUCCESS', 'FAILURE']).optional(),
  requestId: z.string().trim().min(1).optional(),
  correlationId: z.string().trim().min(1).optional(),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
