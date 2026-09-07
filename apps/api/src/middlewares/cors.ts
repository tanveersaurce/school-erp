import cors from 'cors';
import { env } from '../config/env.js';

const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (Postman, mobile apps, curl) with no origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || origin.endsWith('.edusphere.io')) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Tenant-Domain',
    'X-Tenant-ID',
  ],
  exposedHeaders: ['X-Request-ID'],
});
