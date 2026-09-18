import { z } from 'zod';
import {
  ReportFormat,
  ReportScheduleFrequency,
} from '@edusphere/common';

// ============================================================================
// 1. Report Execution & Query Schemas
// ============================================================================
export const runReportQuerySchema = z.object({
  reportKey: z.string().min(1, 'Report key is required').trim(),
  filters: z.record(z.any()).optional().default({}),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(5000).default(50),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['ASC', 'DESC']).optional().default('ASC'),
  bypassCache: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
});

export const exportReportSchema = z.object({
  reportKey: z.string().min(1, 'Report key is required').trim(),
  filters: z.record(z.any()).optional().default({}),
  format: z.nativeEnum(ReportFormat).optional().default(ReportFormat.CSV),
  async: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
});

// ============================================================================
// 2. Scheduled Reports Schemas
// ============================================================================
export const createScheduledReportSchema = z.object({
  name: z.string().min(1, 'Schedule name is required').max(255).trim(),
  description: z.string().max(1000).optional(),
  reportKey: z.string().min(1, 'Report key is required').trim(),
  filters: z.record(z.any()).optional().default({}),
  format: z.nativeEnum(ReportFormat).optional().default(ReportFormat.CSV),
  frequency: z.nativeEnum(ReportScheduleFrequency),
  timeOfDay: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .optional()
    .default('08:00'),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient email is required'),
  isActive: z.boolean().optional().default(true),
});

export const updateScheduledReportSchema = createScheduledReportSchema.partial();
