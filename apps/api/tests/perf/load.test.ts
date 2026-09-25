import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../src/app.js';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  User,
  Employee,
  Student,
  Guardian,
  StudentParentRelation,
  AcademicClass,
  Subject,
  ClassSubject,
  StudentAttendance,
  FeeCategory,
  FeeStructure,
  FeeInvoice,
  Notification,
  AuditLog,
} from '@edusphere/database';
import {
  createTenant,
  createSchool,
  createCampus,
  createAcademicYear,
  createStudent,
  createEmployee,
  createAcademicClass,
  createSubject,
  createClassSubject,
  createFeeCategory,
  createFeeStructure,
  createFeeInvoice,
  createNotification,
  createAuditLog,
} from '../factories/entity.factories.js';
import { persona } from '../factories/persona.factories.js';

describe('Phase 24 — Concurrency & Scalability Load Testing Suite', () => {
  let replSet: MongoMemoryReplSet;
  let app: any;

  let tenantDoc: any;
  let schoolDoc: any;
  let campusDoc: any;
  let academicYearDoc: any;
  let admin: any;
  let teacher: any;
  let accountant: any;
  let studentDoc: any;
  let academicClassDoc: any;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const uri = replSet.getUri();
    await mongoose.connect(uri);

    app = createApp();

    // 1. Seed Core Hierarchy
    tenantDoc = await createTenant({ name: 'Scale Academy Trust', slug: 'scaleacademy' });
    schoolDoc = await createSchool(tenantDoc._id, { name: 'Scale High School' });
    campusDoc = await createCampus(tenantDoc._id, schoolDoc._id, { name: 'Main Campus' });
    academicYearDoc = await createAcademicYear(tenantDoc._id, schoolDoc._id, campusDoc._id, {
      name: '2026-2027',
      isCurrent: true,
    });

    // 2. Seed Personas
    admin = await persona.schoolAdmin(tenantDoc._id, schoolDoc._id);
    teacher = await persona.teacher(tenantDoc._id, schoolDoc._id);
    accountant = await persona.accountant(tenantDoc._id, schoolDoc._id);

    // 3. Seed Bulk Entities
    const academicClass = await createAcademicClass(tenantDoc._id, schoolDoc._id, campusDoc._id, academicYearDoc._id);
    academicClassDoc = academicClass;

    for (let i = 1; i <= 25; i++) {
      await createStudent(tenantDoc._id, schoolDoc._id, {
        campusId: campusDoc._id,
        currentAcademicYearId: academicYearDoc._id,
        personalDetails: {
          firstName: `LoadStudent${i}`,
          lastName: 'PerfTest',
          dateOfBirth: new Date('2010-05-15'),
          gender: 'MALE',
        },
      });

      await createEmployee(tenantDoc._id, schoolDoc._id, new Types.ObjectId(), {
        firstName: `LoadStaff${i}`,
        lastName: 'Member',
      });
    }

    const students = await Student.find({ tenantId: tenantDoc._id });
    studentDoc = students[0];

    const feeCat = await createFeeCategory(tenantDoc._id, schoolDoc._id);
    const feeStruct = await createFeeStructure(tenantDoc._id, schoolDoc._id, academicYearDoc._id, feeCat._id, {
      classId: academicClass.classId,
    });

    for (const s of students.slice(0, 15)) {
      await createFeeInvoice(tenantDoc._id, schoolDoc._id, s._id, academicYearDoc._id, feeStruct._id);
    }

    for (let i = 0; i < 20; i++) {
      await createNotification(tenantDoc._id, admin.user._id, {
        title: `System Alert ${i}`,
        body: `Automated test notification content ${i}`,
      });
      await createAuditLog(tenantDoc._id, schoolDoc._id, admin.user._id, {
        action: 'PERF_LOAD_OPERATION',
        entity: 'Student',
        entityId: studentDoc._id.toString(),
      });
    }
  }, 90000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  });

  it('verifies X-Request-ID and high-resolution X-Response-Time headers on API responses', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-response-time']).toBeDefined();
    expect(res.headers['x-response-time']).toMatch(/^\d+(\.\d+)?ms$/);
  });

  it('executes 50 concurrent requests across critical endpoints and measures throughput and p95 latency', async () => {
    const endpoints = [
      { name: 'auth_me', run: () => request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${admin.token}`) },
      { name: 'student_list', run: () => request(app).get('/api/v1/students?page=1&limit=10').set('Authorization', `Bearer ${admin.token}`) },
      { name: 'student_search', run: () => request(app).get('/api/v1/students?search=LoadStudent1').set('Authorization', `Bearer ${admin.token}`) },
      { name: 'employee_list', run: () => request(app).get('/api/v1/employees?page=1&limit=10').set('Authorization', `Bearer ${admin.token}`) },
      { name: 'invoices', run: () => request(app).get('/api/v1/finance/invoices?page=1&limit=10').set('Authorization', `Bearer ${admin.token}`) },
      { name: 'notifications', run: () => request(app).get('/api/v1/notifications?limit=10').set('Authorization', `Bearer ${admin.token}`) },
      { name: 'audit_logs', run: () => request(app).get('/api/v1/audit-logs?entity=Student&limit=10').set('Authorization', `Bearer ${admin.token}`) },
      { name: 'global_search', run: () => request(app).get('/api/v1/search?q=LoadStudent').set('Authorization', `Bearer ${admin.token}`) },
    ];

    const totalRequests = 50;
    const tasks: Array<{ endpoint: string; promise: Promise<any>; startTime: number }> = [];

    const beforeHeap = process.memoryUsage().heapUsed / (1024 * 1024);
    const overallStart = performance.now();

    for (let i = 0; i < totalRequests; i++) {
      const ep = endpoints[i % endpoints.length];
      const startTime = performance.now();
      tasks.push({
        endpoint: ep.name,
        promise: ep.run(),
        startTime,
      });
    }

    const latencies: number[] = [];
    let successfulCount = 0;
    let failedCount = 0;

    const results = await Promise.all(
      tasks.map(async (t) => {
        try {
          const res = await t.promise;
          const duration = performance.now() - t.startTime;
          latencies.push(duration);
          if (res.status >= 200 && res.status < 400) {
            successfulCount++;
          } else {
            failedCount++;
          }
          return { status: res.status, duration, headers: res.headers };
        } catch (err) {
          failedCount++;
          return { status: 500, duration: 0 };
        }
      })
    );

    const overallElapsed = (performance.now() - overallStart) / 1000;
    const afterHeap = process.memoryUsage().heapUsed / (1024 * 1024);

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const avg = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
    const throughput = totalRequests / overallElapsed;

    const summary = {
      concurrency: totalRequests,
      successfulCount,
      failedCount,
      errorRatePercent: (failedCount / totalRequests) * 100,
      totalElapsedSec: Number(overallElapsed.toFixed(3)),
      throughputReqSec: Number(throughput.toFixed(2)),
      avgMs: Number(avg.toFixed(2)),
      p50Ms: Number(p50.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      p99Ms: Number(p99.toFixed(2)),
      heapBeforeMB: Number(beforeHeap.toFixed(2)),
      heapAfterMB: Number(afterHeap.toFixed(2)),
      heapDeltaMB: Number((afterHeap - beforeHeap).toFixed(2)),
    };

    console.log('\n--- CONCURRENT LOAD TEST RESULTS ---');
    console.table([summary]);

    // Save summary to artifacts
    const outPath = path.resolve(__dirname, 'load_test_results.json');
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf-8');

    expect(failedCount).toBe(0);
    expect(summary.errorRatePercent).toBe(0);
    expect(summary.p95Ms).toBeLessThan(1200); // 50 concurrent requests saturating single thread event loop under 1.2s
  });
});
