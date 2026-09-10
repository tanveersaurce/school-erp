import { Request, Response, NextFunction } from 'express';
import { TenantStatus, NotFoundError, AuthorizationError } from '@edusphere/common';
import { Tenant, runWithTenantContext } from '@edusphere/database';
import { TenantContext } from '@edusphere/types';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../core/logger/logger.js';

interface CachedTenantMetadata {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  status: TenantStatus;
  isDeleted: boolean;
}

// In-memory fallback cache for tenant resolution (TTL 10m)
const tenantMemoryCache = new Map<string, { data: CachedTenantMetadata; expiresAt: number }>();
const TENANT_CACHE_TTL_SECONDS = 600;

export function invalidateTenantResolverCache(
  tenantId?: string,
  slug?: string,
  customDomain?: string
): void {
  const keys: string[] = [];
  if (tenantId) keys.push(`tenant:id:${tenantId}`);
  if (slug) keys.push(`tenant:slug:${slug.toLowerCase()}`);
  if (customDomain) keys.push(`tenant:domain:${customDomain.toLowerCase()}`);

  for (const k of keys) {
    tenantMemoryCache.delete(k);
  }

  try {
    const redis = getRedisClient();
    if (redis && redis.status === 'ready' && keys.length > 0) {
      redis.del(...keys).catch((err) => {
        logger.debug({ err: (err as Error).message }, 'Redis error invalidating tenant cache');
      });
    }
  } catch (err) {
    logger.debug({ err }, 'Failed to delete Redis tenant keys');
  }
}

async function getCachedTenant(cacheKey: string): Promise<CachedTenantMetadata | null> {
  // 1. Try Redis
  try {
    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      const val = await redis.get(cacheKey);
      if (val) {
        return JSON.parse(val) as CachedTenantMetadata;
      }
    }
  } catch (err) {
    logger.debug({ err, cacheKey }, 'Redis tenant cache read failed, checking memory');
  }

  // 2. Try In-memory fallback
  const mem = tenantMemoryCache.get(cacheKey);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.data;
  }
  if (mem) {
    tenantMemoryCache.delete(cacheKey);
  }

  return null;
}

async function setCachedTenant(cacheKey: string, data: CachedTenantMetadata): Promise<void> {
  // In-memory fallback
  tenantMemoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + TENANT_CACHE_TTL_SECONDS * 1000,
  });

  // Redis
  try {
    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      await redis.set(cacheKey, JSON.stringify(data), 'EX', TENANT_CACHE_TTL_SECONDS);
    }
  } catch (err) {
    logger.debug({ err, cacheKey }, 'Failed to set tenant in Redis cache');
  }
}

/**
 * Extract candidate tenant identifier from request host or headers
 */
function extractTenantCandidate(req: Request): {
  id?: string;
  slug?: string;
  domain?: string;
} {
  // 1. Check explicit headers (useful in development, mobile, test suites)
  const headerId = (req.headers['x-tenant-id'] as string)?.trim();
  if (headerId) {
    return { id: headerId };
  }

  const headerSlug = (req.headers['x-tenant-slug'] as string)?.trim();
  if (headerSlug) {
    return { slug: headerSlug.toLowerCase() };
  }

  // 2. Extract from Host or X-Forwarded-Host
  const rawHost =
    (req.headers['x-forwarded-host'] as string) ||
    (req.headers['x-tenant-domain'] as string) ||
    req.hostname ||
    req.headers.host ||
    '';

  const hostWithoutPort = rawHost.split(':')[0].toLowerCase().trim();

  // Check for multi-tenant subdomain (e.g. greenwood.edusphere.io or greenwood.localhost)
  if (hostWithoutPort.endsWith('.edusphere.io') || hostWithoutPort.endsWith('.localhost')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 2) {
      const subdomain = parts[0];
      if (subdomain !== 'api' && subdomain !== 'app' && subdomain !== 'www') {
        return { slug: subdomain };
      }
    }
  }

  // Check for custom domain (e.g. portal.greenwoodhigh.edu)
  if (
    hostWithoutPort &&
    hostWithoutPort !== 'localhost' &&
    hostWithoutPort !== '127.0.0.1' &&
    !hostWithoutPort.endsWith('edusphere.io')
  ) {
    return { domain: hostWithoutPort };
  }

  return {};
}

/**
 * Global Tenant Context Middleware.
 * Resolves tenant, verifies operational lifecycle, initializes AsyncLocalStorage TenantContext.
 */
export async function tenantContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const candidate = extractTenantCandidate(req);

    if (!candidate.id && !candidate.slug && !candidate.domain) {
      // No tenant identifier on request; proceed (auth or route guard will enforce if required)
      return next();
    }

    let cacheKey = '';
    if (candidate.id) cacheKey = `tenant:id:${candidate.id}`;
    else if (candidate.slug) cacheKey = `tenant:slug:${candidate.slug}`;
    else if (candidate.domain) cacheKey = `tenant:domain:${candidate.domain}`;

    let tenantMeta = await getCachedTenant(cacheKey);

    if (!tenantMeta) {
      let query: any = { isDeleted: false };
      if (candidate.id) {
        query = { _id: candidate.id, isDeleted: false };
      } else if (candidate.slug) {
        query = { slug: candidate.slug, isDeleted: false };
      } else if (candidate.domain) {
        query = { customDomain: candidate.domain, isDeleted: false };
      }

      const tenantDoc = await Tenant.findOne(query);

      if (!tenantDoc) {
        throw new NotFoundError(
          `Tenant organization not found for identifier: ${candidate.id || candidate.slug || candidate.domain}`
        );
      }

      tenantMeta = {
        id: tenantDoc._id.toString(),
        name: tenantDoc.name,
        slug: tenantDoc.slug,
        customDomain: tenantDoc.customDomain,
        status: tenantDoc.status,
        isDeleted: tenantDoc.isDeleted,
      };

      await setCachedTenant(cacheKey, tenantMeta);
      if (tenantMeta.slug) await setCachedTenant(`tenant:slug:${tenantMeta.slug}`, tenantMeta);
      if (tenantMeta.id) await setCachedTenant(`tenant:id:${tenantMeta.id}`, tenantMeta);
    }

    // Check lifecycle status constraints
    if (tenantMeta.isDeleted) {
      throw new NotFoundError('Tenant organization not found or deactivated.');
    }

    if (tenantMeta.status === TenantStatus.SUSPENDED) {
      throw new AuthorizationError(
        'Tenant organization is suspended. Please contact platform administration.'
      );
    }

    if (tenantMeta.status === TenantStatus.ARCHIVED) {
      throw new AuthorizationError('Tenant organization is archived. Access is restricted.');
    }

    // Construct request TenantContext
    const context: TenantContext = {
      tenantId: tenantMeta.id,
      schoolId: (req.headers['x-school-id'] as string)?.trim() || undefined,
      campusId: (req.headers['x-campus-id'] as string)?.trim() || undefined,
      academicYearId: (req.headers['x-academic-year-id'] as string)?.trim() || undefined,
      isPlatformAdmin: false,
    };

    req.tenantContext = context;

    // Run downstream execution inside AsyncLocalStorage
    runWithTenantContext(context, () => {
      next();
    });
  } catch (err) {
    next(err);
  }
}
