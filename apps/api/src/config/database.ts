import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../core/logger/logger.js';

export type DatabaseStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

let isConnected = false;

// Connection Event Handlers
mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('📦 MongoDB connection successfully established.');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  logger.error({ err }, '❌ MongoDB connection error.');
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('⚠️ MongoDB connection lost. Disconnected.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('🔄 MongoDB connection restored (reconnected).');
});

/**
 * Connect to MongoDB with automated retry and exponential backoff
 */
export async function connectDatabase(maxRetries = 5, retryDelayMs = 2000): Promise<boolean> {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      attempts++;
      logger.info(
        { attempt: attempts, maxRetries },
        'Connecting to MongoDB replica set / cluster...'
      );

      await mongoose.connect(env.DATABASE_URL, {
        maxPoolSize: env.DATABASE_MAX_POOL_SIZE,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });

      isConnected = true;
      return true;
    } catch (error) {
      logger.warn(
        { attempt: attempts, maxRetries, error: (error as Error).message },
        `Failed MongoDB connection attempt ${attempts}/${maxRetries}.`
      );

      if (attempts >= maxRetries) {
        logger.error(
          '❌ Exceeded maximum MongoDB connection retries. Operating in disconnected state.'
        );
        return false;
      }

      // Exponential backoff with jitter
      const delay = retryDelayMs * Math.pow(1.5, attempts - 1) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
}

/**
 * Gracefully terminate MongoDB connection
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connections...');
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB connections closed.');
  }
}

/**
 * Get current database connection health state
 */
export function getDatabaseStatus(): {
  status: DatabaseStatus;
  readyState: number;
  host?: string;
  name?: string;
} {
  const readyState = mongoose.connection.readyState;
  let status: DatabaseStatus = 'DISCONNECTED';

  switch (readyState) {
    case 1:
      status = 'CONNECTED';
      break;
    case 2:
      status = 'CONNECTING';
      break;
    case 3:
      status = 'DISCONNECTED';
      break;
    default:
      status = 'DISCONNECTED';
  }

  return {
    status,
    readyState,
    host: isConnected ? mongoose.connection.host : undefined,
    name: isConnected ? mongoose.connection.name : undefined,
  };
}
