import { env } from './env.js';

export const appConfig = {
  name: env.APP_NAME,
  port: env.PORT,
  env: env.NODE_ENV,
  apiPrefix: env.API_PREFIX,
  frontendUrl: env.FRONTEND_URL,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  bodyLimit: '1mb',
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === 'production' ? 150 : 1000, // requests per windowMs
  },
} as const;
