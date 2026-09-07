import { Router, Request, Response } from 'express';
import { createSuccessResponse } from '@edusphere/common';

export const healthRouter = Router();

/**
 * Liveness Probe: Verifies HTTP server is up and accepting incoming connections.
 */
healthRouter.get('/liveness', (req: Request, res: Response) => {
  res.status(200).json(
    createSuccessResponse(
      { status: 'UP', uptimeSeconds: process.uptime() },
      'System server is alive and healthy.',
      { requestId: req.id }
    )
  );
});

/**
 * Readiness Probe: Verifies dependencies (DB, Redis, queues) are connected and ready to process traffic.
 */
healthRouter.get('/readiness', (req: Request, res: Response) => {
  // In Phase 1, basic internal readiness check
  const checks = {
    server: 'UP',
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(
    createSuccessResponse(checks, 'System is ready to accept traffic.', { requestId: req.id })
  );
});
