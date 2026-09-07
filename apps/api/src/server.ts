import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './core/logger/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

const app = createApp();

let isShuttingDown = false;

// Initialize Background Infrastructure Connections
async function initializeInfrastructure() {
  logger.info('Initializing EduSphere infrastructure components...');

  // 1. Connect MongoDB
  const dbConnected = await connectDatabase();
  if (!dbConnected) {
    logger.warn(
      '⚠️ Starting HTTP server without active MongoDB connection. Queries requiring DB will fail until reconnected.'
    );
  }

  // 2. Connect Redis
  const redisConnected = await connectRedis();
  if (!redisConnected) {
    logger.warn(
      '⚠️ Starting HTTP server without active Redis. Rate limiting and caching will use memory fallbacks.'
    );
  }
}

// Start HTTP Server
const server = app.listen(env.PORT, async () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      prefix: env.API_PREFIX,
    },
    `🚀 ${env.APP_NAME} REST API Server listening on port ${env.PORT}`
  );

  // Connect DB and Redis asynchronously after HTTP port opens (ensures fast container startup)
  if (env.NODE_ENV !== 'test') {
    await initializeInfrastructure();
  }
});

// Comprehensive Graceful Shutdown Routine
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress. Ignoring duplicate signal.');
    return;
  }
  isShuttingDown = true;

  logger.info({ signal }, `Received ${signal}. Beginning graceful shutdown sequence...`);

  // 1. Stop accepting new incoming HTTP connections
  server.close(async () => {
    logger.info('✅ HTTP server closed. No longer accepting incoming connections.');

    try {
      // 2. Disconnect MongoDB
      await disconnectDatabase();

      // 3. Disconnect Redis
      await disconnectRedis();

      logger.info('🏁 All connections safely terminated. Clean exit.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error occurred during graceful connection termination.');
      process.exit(1);
    }
  });

  // Failsafe timeout to prevent hanging zombie processes
  setTimeout(() => {
    logger.error('⚠️ Forcefully terminating process after 10-second shutdown timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { server, app };
