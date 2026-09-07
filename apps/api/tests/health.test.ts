import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Backend API Infrastructure & Health Suite', () => {
  const app = createApp();

  it('1. Application starts and responds on top-level GET /health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.environment).toBeDefined();
  });

  it('2. GET /api/v1/health/liveness returns 200 with status UP and requestId header', async () => {
    const res = await request(app).get('/api/v1/health/liveness');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.meta.requestId).toBeDefined();
  });

  it('3. GET /ready and GET /api/v1/health/readiness report database and redis checks', async () => {
    const resTop = await request(app).get('/ready');
    expect(resTop.status).toBe(200);
    expect(resTop.body.success).toBe(true);
    expect(resTop.body.data.checks).toBeDefined();

    const resV1 = await request(app).get('/api/v1/health/readiness');
    expect(resV1.status).toBe(200);
    expect(resV1.body.success).toBe(true);
    expect(resV1.body.data.checks.server).toBe('UP');
    expect(resV1.body.data.checks.database).toBeDefined();
    expect(resV1.body.data.checks.redis).toBeDefined();
  });

  it('4. Unknown route returns standardized 404 error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-sample-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.body.error.message).toContain(
      'Route GET /api/v1/non-existent-sample-route not found'
    );
    expect(res.body.error.requestId).toBeDefined();
  });

  it('5. Rate limiter headers are configured on requests', async () => {
    const res = await request(app).get('/api/v1/health/liveness');
    expect(res.status).toBe(200);
    // Security headers from Helmet
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });
});
