import express, { Application } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './middlewares/requestId.js';
import { securityHeadersMiddleware } from './middlewares/securityHeaders.js';
import { corsMiddleware } from './middlewares/cors.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { rbacRouter } from './modules/rbac/rbac.routes.js';
import { tenantRouter } from './modules/tenant/tenant.routes.js';
import { employeeRouter } from './modules/employee/employee.routes.js';
import { studentRouter } from './modules/student/student.routes.js';
import { academicRouter } from './modules/academic/academic.routes.js';
import { timetableRouter } from './modules/timetable/timetable.routes.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { assignmentRouter } from './modules/assignment/assignment.routes.js';
import { examRouter } from './modules/examination/exam.routes.js';
import { tenantContextMiddleware } from './middlewares/tenantContext.js';
import { appConfig } from './config/app.js';
import { getDatabaseStatus } from './config/database.js';
import { getRedisStatus } from './config/redis.js';
import { createSuccessResponse } from '@edusphere/common';

export function createApp(): Application {
  const app = express();

  // 1. Trust Reverse Proxy (Cloudflare / Nginx) for IP rate-limiting & SSL
  app.set('trust proxy', 1);

  // 2. Request Correlation & Observability
  app.use(requestIdMiddleware);

  // 3. Security Headers via Helmet
  app.use(securityHeadersMiddleware);

  // 4. Cross-Origin Resource Sharing (CORS)
  app.use(corsMiddleware);

  // 5. Response Compression
  app.use(compression());

  // 6. Global Rate Limiter
  app.use(globalRateLimiter);

  // 7. Request Body Parsers with Strict Size Caps
  app.use(cookieParser());
  app.use(express.json({ limit: appConfig.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: appConfig.bodyLimit }));

  // 8. Global Multi-Tenant Context Resolution & ALS Propagation
  app.use(tenantContextMiddleware);

  // 9. Top-Level Health & Readiness Probes for Ingress / Docker / K8s
  app.get('/health', (req, res) => {
    res.status(200).json(
      createSuccessResponse(
        {
          status: 'UP',
          uptimeSeconds: Math.floor(process.uptime()),
          environment: appConfig.env,
        },
        'Server is live.',
        { requestId: req.id }
      )
    );
  });

  app.get('/ready', (req, res) => {
    const db = getDatabaseStatus();
    const redis = getRedisStatus();
    const isReady = db.status === 'CONNECTED';

    res.status(200).json(
      createSuccessResponse(
        {
          status: isReady ? 'READY' : 'DEGRADED',
          checks: {
            database: db.status,
            redis: redis.status,
          },
        },
        isReady ? 'Service ready.' : 'Service degraded (database disconnected).',
        { requestId: req.id }
      )
    );
  });

  // 10. Versioned API Routes (/api/v1)
  app.use(`${appConfig.apiPrefix}/health`, healthRouter);
  app.use(`${appConfig.apiPrefix}/auth`, authRouter);
  app.use(appConfig.apiPrefix, rbacRouter);
  app.use(appConfig.apiPrefix, tenantRouter);
  app.use(appConfig.apiPrefix, employeeRouter);
  app.use(appConfig.apiPrefix, studentRouter);
  app.use(appConfig.apiPrefix, academicRouter);
  app.use(appConfig.apiPrefix, timetableRouter);
  app.use(appConfig.apiPrefix, attendanceRouter);
  app.use(appConfig.apiPrefix, assignmentRouter);
  app.use(`${appConfig.apiPrefix}/examinations`, examRouter);
  app.use(`${appConfig.apiPrefix}/exams`, examRouter);

  // 10. Centralized Error & 404 Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
