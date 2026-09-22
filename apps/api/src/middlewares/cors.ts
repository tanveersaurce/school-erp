import cors from 'cors';
import { env } from '../config/env.js';

const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (Postman, mobile apps, curl) with no origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    try {
      const parsed = new URL(origin);
      const hostname = parsed.hostname.toLowerCase();
      // Strictly allow edusphere.io or genuine subdomains of edusphere.io (e.g. school.edusphere.io)
      if (hostname === 'edusphere.io' || hostname.endsWith('.edusphere.io')) {
        return callback(null, true);
      }
    } catch {
      // Malformed origin URL
    }

    // Reject CORS cleanly without unhandled server exception
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Tenant-Domain',
    'X-Tenant-ID',
    'X-School-ID',
    'X-Campus-ID',
    'X-Academic-Year-ID',
  ],
  exposedHeaders: ['X-Request-ID'],
});
