import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env from project root if running from monorepo
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config(); // fallback to local

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('EduSphere-ERP'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().default('mongodb://localhost:27017/edusphere_dev?replicaSet=rs0'),
  DATABASE_MAX_POOL_SIZE: z.coerce.number().default(50),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_KEY_PREFIX: z.string().default('edusphere:'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default('local_dev_jwt_access_secret_key_32_characters_minimum_len'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default('local_dev_jwt_refresh_secret_key_32_characters_minimum_len'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
})
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        if (
          data.JWT_ACCESS_SECRET === 'local_dev_jwt_access_secret_key_32_characters_minimum_len' ||
          data.JWT_REFRESH_SECRET === 'local_dev_jwt_refresh_secret_key_32_characters_minimum_len'
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'In production mode, JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be explicitly configured with unique cryptographic secrets, not default development placeholders.',
      path: ['JWT_ACCESS_SECRET'],
    }
  )
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production' && !data.COOKIE_SECURE) {
        return false;
      }
      return true;
    },
    {
      message: 'In production mode, COOKIE_SECURE must be enabled (true) for transport security.',
      path: ['COOKIE_SECURE'],
    }
  );

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
