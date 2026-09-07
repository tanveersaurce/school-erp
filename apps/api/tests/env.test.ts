import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Environment Configuration Schema Suite', () => {
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
    PORT: z.coerce.number(),
    DATABASE_URL: z.string().min(10),
    JWT_ACCESS_SECRET: z.string().min(32),
  });

  it('validates a complete, valid environment object', () => {
    const validConfig = {
      NODE_ENV: 'test',
      PORT: '5000',
      DATABASE_URL: 'mongodb://localhost:27017/edusphere_test',
      JWT_ACCESS_SECRET: 'super_secure_32_character_long_secret_key_123',
    };

    const parsed = schema.safeParse(validConfig);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.PORT).toBe(5000); // coerced number
    }
  });

  it('rejects an environment missing critical secrets', () => {
    const invalidConfig = {
      NODE_ENV: 'production',
      PORT: '5000',
      DATABASE_URL: 'mongodb://localhost:27017/edusphere',
      JWT_ACCESS_SECRET: 'too_short', // Must be >= 32 chars
    };

    const parsed = schema.safeParse(invalidConfig);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toContain('JWT_ACCESS_SECRET');
    }
  });
});
