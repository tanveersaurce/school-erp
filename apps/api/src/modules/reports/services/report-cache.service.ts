import crypto from 'crypto';
import { getRedisClient } from '../../../config/redis.js';
import { logger } from '../../../core/logger/logger.js';

interface InMemoryCacheEntry {
  data: any;
  expiresAt: number;
}

export class ReportCacheService {
  private inMemoryCache = new Map<string, InMemoryCacheEntry>();

  /**
   * Generates a deterministic cache key based on tenant, report key, scope, and filters.
   */
  generateKey(
    tenantId: string,
    reportKey: string,
    filters: Record<string, any>,
    scope: Record<string, any>
  ): string {
    const payload = JSON.stringify({ filters, scope });
    const hash = crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
    return `report:${tenantId}:${reportKey}:${hash}`;
  }

  /**
   * Retrieve cached report data if present and unexpired.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
        return null;
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Redis get error, checking in-memory cache.');
    }

    // In-memory fallback
    const entry = this.inMemoryCache.get(key);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return entry.data as T;
      }
      this.inMemoryCache.delete(key);
    }

    return null;
  }

  /**
   * Set cached report data with TTL in seconds.
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        return;
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Redis set error, falling back to in-memory.');
    }

    // In-memory fallback
    this.inMemoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate all cached reports for a specific tenant.
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        const stream = redis.scanStream({
          match: `report:${tenantId}:*`,
          count: 100,
        });

        stream.on('data', async (keys: string[]) => {
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        });
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'Redis scan/del error during cache invalidation.');
    }

    // In-memory cleanup
    const prefix = `report:${tenantId}:`;
    for (const key of this.inMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemoryCache.delete(key);
      }
    }
  }
}

export const reportCacheService = new ReportCacheService();
