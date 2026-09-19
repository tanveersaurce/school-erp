import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoId = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

export const globalSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must not exceed 100 characters'),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  entities: z
    .string()
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
    .optional(),
  schoolId: mongoId.optional(),
  campusId: mongoId.optional(),
});

export type GlobalSearchQueryInput = z.infer<typeof globalSearchQuerySchema>;
