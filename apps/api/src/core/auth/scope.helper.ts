import { Request } from 'express';
import { UserType, AuthorizationError } from '@edusphere/common';

/**
 * Resolves the authorized schoolId for a request with strict anti-IDOR enforcement.
 * - For non-SUPER_ADMIN users with an assigned schoolId, the user's assigned schoolId is mandatory.
 *   If the client explicitly supplied a conflicting schoolId in query, body, or header,
 *   it is rejected with an AuthorizationError.
 * - For SUPER_ADMIN users, client-supplied schoolId (query, body, header) is honored.
 */
export function resolveAuthorizedSchoolId(req: Request): string {
  const auth = req.auth;
  if (!auth) {
    return '';
  }

  const clientSchoolId =
    (req.query?.schoolId as string)?.trim() ||
    (req.body?.schoolId as string)?.trim() ||
    (req.headers['x-school-id'] as string)?.trim() ||
    '';

  const isSuperAdmin =
    auth.userType === UserType.SUPER_ADMIN || auth.roles?.includes('SUPER_ADMIN');

  // Super Admin platform override
  if (isSuperAdmin) {
    return clientSchoolId || auth.schoolId || '';
  }

  // Assigned school constraint for non-super admins
  if (auth.schoolId) {
    if (clientSchoolId && clientSchoolId !== auth.schoolId) {
      throw new AuthorizationError(
        'Cross-school access prohibited: You are not authorized to access resources belonging to a different school.'
      );
    }
    return auth.schoolId;
  }

  return clientSchoolId;
}
