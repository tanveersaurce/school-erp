import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Role name must be at least 2 characters.')
    .max(50, 'Role name cannot exceed 50 characters.'),
  description: z.string().trim().max(255, 'Description cannot exceed 255 characters.').optional(),
  permissionIds: z
    .array(z.string().regex(objectIdRegex, 'Invalid permission ID format.'))
    .optional(),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Role name must be at least 2 characters.')
    .max(50, 'Role name cannot exceed 50 characters.')
    .optional(),
  description: z.string().trim().max(255, 'Description cannot exceed 255 characters.').optional(),
  permissionIds: z
    .array(z.string().regex(objectIdRegex, 'Invalid permission ID format.'))
    .optional(),
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().regex(objectIdRegex, 'Invalid permission ID format.')),
});

export const assignRoleSchema = z.object({
  roleId: z.string().regex(objectIdRegex, 'Invalid role ID format.'),
  schoolId: z.string().regex(objectIdRegex, 'Invalid school ID format.').optional(),
  campusId: z.string().regex(objectIdRegex, 'Invalid campus ID format.').optional(),
});
