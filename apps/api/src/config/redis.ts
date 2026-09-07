import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../core/logger/logger.js';

export type RedisStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'UNAVAILABLE';

let redisClient: Redis | null = null;
let redisStatus: RedisStatus = 'DISCONNECTED';

/**
 * Initialize Redis Client with fallback tolerance
 * Redis failure will NOT halt the server; fallback in-memory behaviors are preserved.
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) {
          redisStatus = 'UNAVAILABLE';
          logger.warn(
            { attempt: times },
            '⚠️ Redis connection could not be established after 5 attempts. Continuing in degraded/in-memory mode.'
          );
          return null; // Stop reconnecting automatically
        }
        return Math.min(times * 1000, 3000);
      },
      enableOfflineQueue: false,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      redisStatus = 'CONNECTING';
      logger.debug('Redis client attempting connection...');
    });

    redisClient.on('ready', () => {
      redisStatus = 'CONNECTED';
      logger.info('⚡ Redis connection successfully established and ready for cache/queues.');
    });

    redisClient.on('error', (err) => {
      redisStatus = 'UNAVAILABLE';
      logger.warn(
        { err: (err as Error).message },
        '⚠️ Redis error encountered. Operations will fallback gracefully.'
      );
    });

    redisClient.on('close', () => {
      redisStatus = 'DISCONNECTED';
      logger.warn('⚠️ Redis connection closed.');
    });

    return redisClient;
  } catch (err) {
    redisStatus = 'UNAVAILABLE';
    logger.warn({ err }, 'Redis initialization failed. Running without external Redis.');
    return null;
  }
}

/**
 * Attempt to connect to Redis
 */
export async function connectRedis(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.connect();
    redisStatus = 'CONNECTED';
    return true;
  } catch (err) {
    redisStatus = 'UNAVAILABLE';
    logger.warn(
      { error: (err as Error).message },
      'Redis connection failed on boot. Application will operate with local fallback.'
    );
    return false;
  }
}

/**
 * Gracefully close Redis connection
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisClient.status !== 'end') {
    logger.info('Closing Redis client connection...');
    try {
      await redisClient.quit();
      redisStatus = 'DISCONNECTED';
      logger.info('Redis client disconnected cleanly.');
    } catch {
      redisClient.disconnect();
    }
  }
}

/**
 * Return active Redis health status
 */
export function getRedisStatus(): {
  status: RedisStatus;
  host?: string;
  isReady: boolean;
} {
  return {
    status: redisStatus,
    isReady: redisStatus === 'CONNECTED',
  };
}
