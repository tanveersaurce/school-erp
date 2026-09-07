import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Health Checks Suite', () => {
  const app = createApp();

  it('GET /api/v1/health/liveness should return 200 with status UP and requestId header', async () => {
    const res = await request(app).get('/api/v1/health/liveness');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.meta.requestId).toBeDefined();
  });

  it('GET /api/v1/health/readiness should return 200 with readiness data', async () => {
    const res = await request(app).get('/api/v1/health/readiness');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.server).toBe('UP');
  });

  it('GET /api/v1/non-existent-route should return 404 with structured error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });
});
