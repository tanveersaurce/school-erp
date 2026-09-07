import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './core/logger/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      prefix: env.API_PREFIX,
    },
    `🚀 ${env.APP_NAME} API Server successfully started on port ${env.PORT}`
  );
});

// Graceful Shutdown Management
function gracefulShutdown(signal: string) {
  logger.info({ signal }, `Received ${signal}, initiating graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if open connections hang
  setTimeout(() => {
    logger.error('Forcefully terminating process after shutdown timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { server, app };
