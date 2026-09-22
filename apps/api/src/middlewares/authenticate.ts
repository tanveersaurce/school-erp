import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, TenantMismatchError, UserStatus, UserType } from '@edusphere/common';
import { Session, User, runWithTenantContext } from '@edusphere/database';
import { tokenService } from '../modules/auth/token.service.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authentication required. Missing Bearer token.');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AuthenticationError('Authentication required. Empty Bearer token.');
    }

    // Verify JWT cryptographic signature and expiration
    const payload = tokenService.verifyAccessToken(token);

    // Verify session existence, revocation state, and TTL in database
    const session = await Session.findById(payload.sessionId).setOptions({
      skipTenantFilter: true,
    });
    if (!session || session.isRevoked || session.expiresAt <= new Date()) {
      throw new AuthenticationError('Session has expired or been revoked. Please sign in again.');
    }

    // Verify user existence and active account status
    const user = await User.findById(payload.userId).setOptions({ skipTenantFilter: true });
    if (!user || user.isDeleted) {
      throw new AuthenticationError('User account not found or deactivated.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError(`Account status is ${user.status}. Access denied.`);
    }

    // Populate typed request authentication context
    req.auth = {
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      schoolId: user.schoolId?.toString(),
      userType: user.userType,
      sessionId: session._id.toString(),
      email: user.email,
    };

    // Cross-tenant verification and TenantContext reconciliation
    const isSuperAdmin = user.userType === UserType.SUPER_ADMIN;

    if (req.tenantContext) {
      if (isSuperAdmin) {
        // Super admin platform bypass / impersonation
        const impersonated = (req.headers['x-impersonate-tenant-id'] as string)?.trim();
        if (impersonated) {
          req.tenantContext.tenantId = impersonated;
        }
        req.tenantContext.isPlatformAdmin = !impersonated;
        req.tenantContext.userId = user._id.toString();
      } else {
        // Non-super-admin: Token tenant MUST match request tenant context
        if (req.tenantContext.tenantId !== user.tenantId.toString()) {
          throw new TenantMismatchError(
            'Cross-tenant access prohibited: Token tenant does not match request tenant context.'
          );
        }
        req.tenantContext.userId = user._id.toString();

        // Enforce user's assigned schoolId if assigned
        if (user.schoolId) {
          req.tenantContext.schoolId = user.schoolId.toString();
        }
      }

      return runWithTenantContext(req.tenantContext, () => {
        next();
      });
    }

    // Tenant context was not resolved at ingress; initialize from authenticated user
    const tenantCtx = {
      tenantId:
        isSuperAdmin && req.headers['x-impersonate-tenant-id']
          ? (req.headers['x-impersonate-tenant-id'] as string).trim()
          : user.tenantId.toString(),
      schoolId:
        user.schoolId?.toString() || (req.headers['x-school-id'] as string)?.trim() || undefined,
      campusId: (req.headers['x-campus-id'] as string)?.trim() || undefined,
      academicYearId: (req.headers['x-academic-year-id'] as string)?.trim() || undefined,
      userId: user._id.toString(),
      isPlatformAdmin: isSuperAdmin && !req.headers['x-impersonate-tenant-id'],
    };

    req.tenantContext = tenantCtx;

    runWithTenantContext(tenantCtx, () => {
      next();
    });
  } catch (err) {
    next(err);
  }
}
