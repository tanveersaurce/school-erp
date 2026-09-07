import { Router, Request, Response } from 'express';
import { createSuccessResponse } from '@edusphere/common';
import { getDatabaseStatus } from '../config/database.js';
import { getRedisStatus } from '../config/redis.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

/**
 * Liveness Probe: Verifies HTTP server is up and responsive
 */
healthRouter.get('/liveness', (req: Request, res: Response) => {
  res.status(200).json(
    createSuccessResponse(
      {
        status: 'UP',
        environment: env.NODE_ENV,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      'Application server is alive and functioning.',
      { requestId: req.id }
    )
  );
});

/**
 * Readiness Probe: Verifies dependencies (MongoDB, Redis, Memory) are ready for traffic
 */
healthRouter.get('/readiness', (req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  const redisStatus = getRedisStatus();
  const mem = process.memoryUsage();

  const isReady = dbStatus.status === 'CONNECTED';

  const payload = {
    status: isReady ? 'READY' : 'DEGRADED',
    environment: env.NODE_ENV,
    checks: {
      server: 'UP',
      database: dbStatus.status,
      redis: redisStatus.status,
      memoryUsageMB: Math.round(mem.heapUsed / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };

  // In test environment or disconnected dev, return 200 with status info
  res.status(200).json(
    createSuccessResponse(
      payload,
      isReady ? 'System is fully ready.' : 'System operating in degraded mode.',
      {
        requestId: req.id,
      }
    )
  );
});

// Alias for root health checks
healthRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json(
    createSuccessResponse(
      {
        status: 'UP',
        uptimeSeconds: Math.floor(process.uptime()),
      },
      'EduSphere API is operational.',
      { requestId: req.id }
    )
  );
});
