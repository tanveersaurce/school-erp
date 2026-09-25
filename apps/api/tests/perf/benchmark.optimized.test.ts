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
  TeacherSubjectAssignment,
  StudentAttendance,
  Assignment,
  Exam,
  ExamSchedule,
  Result,
  FeeCategory,
  FeeStructure,
  FeeInvoice,
  Book,
  BookCopy,
  Library,
  LibraryMember,
  TransportRoute,
  Vehicle,
  Hostel,
  HostelRoom,
  HostelBed,
  HostelStudentAllocation,
  InventoryStore,
  InventoryItem,
  InventoryStock,
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
  createAssignment,
  createFeeCategory,
  createFeeStructure,
  createFeeInvoice,
  createBook,
  createBookCopy,
  createTransportRoute,
  createVehicle,
  createHostel,
  createInventoryStore,
  createInventoryItem,
  createNotification,
  createAuditLog,
} from '../factories/entity.factories.js';
import { persona } from '../factories/persona.factories.js';

interface MetricResult {
  operation: string;
  category: 'Interactive' | 'Standard' | 'Heavy' | 'Background';
  samples: number;
  avgMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  throughputReqSec: number;
  errorRatePercent: number;
  payloadSizeBytes: number;
  heapUsedMB: number;
}

describe('Phase 24 — Performance Post-Optimization Benchmarking Suite', () => {
  let replSet: MongoMemoryReplSet;
  const app = createApp();

  let tenant: any;
  let school: any;
  let campus: any;
  let academicYear: any;
  let admin: any;
  let teacher: any;
  let studentPersona: any;

  let seededClass: any;
  let seededStudents: any[] = [];
  let seededInvoice: any;
  let refreshToken: string = '';

  const results: MetricResult[] = [];

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    // 1. Organization & Core Hierarchy
    tenant = await createTenant({ name: 'Benchmark Academy Trust', slug: 'bench-trust' });
    school = await createSchool(tenant._id, { name: 'Benchmark High', code: 'BH-01' });
    campus = await createCampus(tenant._id, school._id, { name: 'Benchmark Main', code: 'BM-01', isMainCampus: true });
    academicYear = await createAcademicYear(tenant._id, school._id, campus._id, { isCurrent: true });

    // 2. Personas
    admin = await persona.schoolAdmin(tenant._id, { schoolId: school._id });
    teacher = await persona.teacher(tenant._id, { schoolId: school._id });
    studentPersona = await persona.student(tenant._id, { schoolId: school._id });

    // 3. Seed 50 Students & Guardians
    for (let i = 0; i < 50; i++) {
      const s = await createStudent(tenant._id, school._id, {
        firstName: `BenchStudent${i}`,
        lastName: `Sample${i}`,
        admissionNumber: `ADM-BENCH-${String(i).padStart(4, '0')}`,
      });
      seededStudents.push(s);
    }

    // 4. Seed Classes, Subjects & Allocations
    seededClass = await createAcademicClass(tenant._id, school._id, campus._id, academicYear._id, {
      name: 'Grade 10 - Section A',
      code: 'G10-A',
    });

    const subject = await createSubject(tenant._id, school._id, { name: 'Physics Benchmark', code: 'PHY-BENCH' });
    await createClassSubject(tenant._id, seededClass._id, subject._id, {
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: seededClass.classId,
    });

    await TeacherSubjectAssignment.create({
      tenantId: tenant._id,
      schoolId: school._id,
      academicYearId: academicYear._id,
      teacherId: teacher.user._id,
      subjectId: subject._id,
      classId: seededClass.classId,
      sectionId: seededClass.sectionId,
      academicClassId: seededClass._id,
      status: 'ACTIVE',
    });

    // 5. Seed Attendance
    await StudentAttendance.create({
      tenantId: tenant._id,
      schoolId: school._id,
      campusId: campus._id,
      academicYearId: academicYear._id,
      academicClassId: seededClass._id,
      classId: seededClass.classId,
      sectionId: seededClass.sectionId,
      date: new Date('2026-09-01'),
      takenBy: teacher.user._id,
      status: 'SUBMITTED',
      records: seededStudents.map((s) => ({
        studentId: s._id,
        status: 'PRESENT',
      })),
    });

    // 6. Seed Homework
    await createAssignment(tenant._id, school._id, seededClass._id, subject._id, teacher.user._id, {
      campusId: campus._id,
      academicYearId: academicYear._id,
      title: 'Benchmark Homework Assignment 1',
      description: 'Physics numerical problem set',
      maxScore: 100,
    });

    // 7. Seed Finance & Invoices
    const feeCategory = await createFeeCategory(tenant._id, school._id, { name: 'Tuition Fee Benchmark' });
    const feeStructure = await createFeeStructure(tenant._id, school._id, academicYear._id, feeCategory._id, {
      classId: seededClass.classId,
      totalAmount: 150000,
    });

    seededInvoice = await createFeeInvoice(
      tenant._id,
      school._id,
      seededStudents[0]._id,
      academicYear._id,
      feeStructure._id,
      {
        totalAmount: 150000,
        balanceAmount: 150000,
        paidAmount: 0,
      }
    );

    // 8. Seed Library
    const book = await createBook(tenant._id, school._id, {
      title: 'Quantum Mechanics: Concepts & Applications',
      isbn: '978-0123456789',
      category: 'Science',
    });
    await createBookCopy(tenant._id, school._id, book._id, { barcode: 'BC-BENCH-001' });

    // 9. Seed Transport
    const route = await createTransportRoute(tenant._id, school._id, { routeName: 'Route 101 Benchmark Express' });
    await createVehicle(tenant._id, school._id, { registrationNumber: 'KA-01-EXP-2026' });

    // 10. Seed Hostel
    const hostel = await createHostel(tenant._id, school._id, campus._id, { name: 'Main Campus Boys Hostel' });
    const room = await HostelRoom.create({
      tenantId: tenant._id,
      schoolId: school._id,
      hostelId: hostel._id,
      roomNumber: 'R-101',
      floor: 1,
      capacity: 2,
    });
    const bed = await HostelBed.create({
      tenantId: tenant._id,
      schoolId: school._id,
      hostelId: hostel._id,
      roomId: room._id,
      bedNumber: 'B-101-A',
      status: 'AVAILABLE',
    });
    await HostelStudentAllocation.create({
      tenantId: tenant._id,
      schoolId: school._id,
      hostelId: hostel._id,
      roomId: room._id,
      bedId: bed._id,
      studentId: seededStudents[0]._id,
      academicYearId: academicYear._id,
      checkInDate: new Date(),
      status: 'ALLOCATED',
    });

    // 11. Seed Inventory
    const store = await createInventoryStore(tenant._id, school._id);
    const item = await createInventoryItem(tenant._id, store._id, { schoolId: school._id });
    await InventoryStock.create({
      tenantId: tenant._id,
      schoolId: school._id,
      storeId: store._id,
      itemId: item._id,
      quantityOnHand: 500,
      quantityReserved: 0,
      quantityAvailable: 500,
    });

    // 12. Seed Notifications
    for (let i = 0; i < 20; i++) {
      await createNotification(tenant._id, admin.user._id, {
        title: `System Alert ${i}`,
        body: `Benchmark notification payload ${i}`,
      });
    }

    // 13. Seed Audit Logs
    for (let i = 0; i < 25; i++) {
      await createAuditLog(tenant._id, school._id, admin.user._id, {
        action: `BENCHMARK_OPERATION_${i}`,
        entity: 'Student',
        entityId: seededStudents[0]._id.toString(),
      });
    }
  }, 120000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  async function measureOperation(
    name: string,
    category: 'Interactive' | 'Standard' | 'Heavy' | 'Background',
    fn: () => Promise<request.Response>,
    iterations = 10
  ): Promise<MetricResult> {
    const times: number[] = [];
    let payloadSize = 0;
    let errors = 0;

    // Warmup request
    try {
      await fn();
    } catch {
      // Warmup catch
    }

    const startTotal = performance.now();
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        const res = await fn();
        const duration = performance.now() - start;
        times.push(duration);
        if (res.status >= 400 && res.status !== 404) {
          errors++;
        }
        if (i === 0 && res.text) {
          payloadSize = Buffer.byteLength(res.text, 'utf8');
        }
      } catch {
        errors++;
      }
    }
    const totalDuration = performance.now() - startTotal;

    times.sort((a, b) => a - b);
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const median = times[Math.floor(times.length * 0.5)] || 0;
    const p95 = times[Math.floor(times.length * 0.95)] || times[times.length - 1] || 0;
    const p99 = times[Math.floor(times.length * 0.99)] || times[times.length - 1] || 0;
    const throughput = (iterations / totalDuration) * 1000;
    const errorRate = (errors / iterations) * 100;
    const mem = process.memoryUsage().heapUsed / (1024 * 1024);

    const metric: MetricResult = {
      operation: name,
      category,
      samples: iterations,
      avgMs: parseFloat(avg.toFixed(2)),
      medianMs: parseFloat(median.toFixed(2)),
      p95Ms: parseFloat(p95.toFixed(2)),
      p99Ms: parseFloat(p99.toFixed(2)),
      throughputReqSec: parseFloat(throughput.toFixed(2)),
      errorRatePercent: parseFloat(errorRate.toFixed(2)),
      payloadSizeBytes: payloadSize,
      heapUsedMB: parseFloat(mem.toFixed(2)),
    };
    results.push(metric);
    return metric;
  }

  it('measures all 22 representative operations and outputs post-optimization report', async () => {
    // 1. Login
    await measureOperation('1. login (POST /auth/login)', 'Interactive', () =>
      request(app).post('/api/v1/auth/login').send({ email: admin.user.email, password: 'Password123!' })
    );

    // 2. Refresh Token
    await measureOperation('2. refresh token (POST /auth/refresh)', 'Interactive', () =>
      request(app).post('/api/v1/auth/refresh').set('Cookie', [`refreshToken=${refreshToken}`])
    );

    // 3. Current User
    await measureOperation('3. current user (GET /auth/me)', 'Interactive', () =>
      request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${admin.token}`)
    );

    // 4. Student List
    await measureOperation('4. student list (GET /students)', 'Standard', () =>
      request(app).get('/api/v1/students').set('Authorization', `Bearer ${admin.token}`)
    );

    // 5. Student Search
    await measureOperation('5. student search (GET /students?search=BenchStudent1)', 'Interactive', () =>
      request(app).get('/api/v1/students?search=BenchStudent1').set('Authorization', `Bearer ${admin.token}`)
    );

    // 6. Staff List
    await measureOperation('6. staff list (GET /employees)', 'Standard', () =>
      request(app).get('/api/v1/employees').set('Authorization', `Bearer ${admin.token}`)
    );

    // 7. Academic Class List
    await measureOperation('7. academic class list (GET /academic/classes)', 'Standard', () =>
      request(app).get('/api/v1/academic/classes').set('Authorization', `Bearer ${admin.token}`)
    );

    // 8. Attendance Marking
    let dayCount = 2;
    await measureOperation('8. attendance marking (POST /attendance/daily)', 'Standard', () =>
      request(app)
        .post('/api/v1/attendance/daily')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({
          academicClassId: seededClass._id.toString(),
          date: `2026-09-${String(dayCount++).padStart(2, '0')}`,
          records: [{ studentId: seededStudents[0]._id.toString(), status: 'PRESENT' }],
          overrideNonWorkingDay: true,
        })
    );

    // 9. Attendance Report Sheet
    await measureOperation('9. attendance report (GET /attendance/sheet)', 'Heavy', () =>
      request(app)
        .get(`/api/v1/attendance/sheet?academicClassId=${seededClass._id}&date=2026-09-01`)
        .set('Authorization', `Bearer ${teacher.token}`)
    );

    // 10. Homework List
    await measureOperation('10. homework list (GET /assignments)', 'Standard', () =>
      request(app).get('/api/v1/assignments').set('Authorization', `Bearer ${teacher.token}`)
    );

    // 11. Exam List
    await measureOperation('11. exam list (GET /examinations/exams)', 'Standard', () =>
      request(app).get('/api/v1/examinations/exams').set('Authorization', `Bearer ${admin.token}`)
    );

    // 12. Result Retrieval
    await measureOperation('12. result retrieval (GET /examinations/results)', 'Standard', () =>
      request(app).get('/api/v1/examinations/results').set('Authorization', `Bearer ${admin.token}`)
    );

    // 13. Invoice List
    await measureOperation('13. invoice list (GET /finance/invoices)', 'Standard', () =>
      request(app).get('/api/v1/finance/invoices').set('Authorization', `Bearer ${admin.token}`)
    );

    // 14. Payment Creation
    let receiptNum = 1000;
    await measureOperation('14. payment creation (POST /finance/payments/collect)', 'Standard', () =>
      request(app)
        .post('/api/v1/finance/payments/collect')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          invoiceId: seededInvoice._id.toString(),
          studentId: seededStudents[0]._id.toString(),
          amount: 500, // $5.00
          paymentMethod: 'CASH',
          referenceNumber: `REF-${receiptNum++}`,
        })
    );

    // 15. Library Search
    await measureOperation('15. library search (GET /library/books)', 'Interactive', () =>
      request(app).get('/api/v1/library/books?search=Quantum').set('Authorization', `Bearer ${admin.token}`)
    );

    // 16. Transport List
    await measureOperation('16. transport list (GET /transport/routes)', 'Standard', () =>
      request(app).get('/api/v1/transport/routes').set('Authorization', `Bearer ${admin.token}`)
    );

    // 17. Hostel Allocation List
    await measureOperation('17. hostel allocation list (GET /hostel/allocations)', 'Standard', () =>
      request(app).get('/api/v1/hostel/allocations').set('Authorization', `Bearer ${admin.token}`)
    );

    // 18. Inventory Stock List
    await measureOperation('18. inventory stock list (GET /inventory/stocks)', 'Standard', () =>
      request(app).get('/api/v1/inventory/stocks').set('Authorization', `Bearer ${admin.token}`)
    );

    // 19. Notifications List
    await measureOperation('19. notifications list (GET /notifications)', 'Interactive', () =>
      request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${admin.token}`)
    );

    // 20. Audit Log Search
    await measureOperation('20. audit log search (GET /audit-logs)', 'Heavy', () =>
      request(app).get('/api/v1/audit-logs?entity=Student').set('Authorization', `Bearer ${admin.token}`)
    );

    // 21. Global Search
    await measureOperation('21. global search (GET /search?q=BenchStudent)', 'Heavy', () =>
      request(app).get('/api/v1/search?q=BenchStudent').set('Authorization', `Bearer ${admin.token}`)
    );

    // 22. Report Generation
    await measureOperation('22. report generation (GET /reports/run/students.enrollment-roster)', 'Heavy', () =>
      request(app)
        .get('/api/v1/reports/run/students.enrollment-roster')
        .set('Authorization', `Bearer ${admin.token}`)
    );

    expect(results.length).toBe(22);

    // Save JSON benchmark for post-optimization documentation
    const jsonPath = path.resolve(process.cwd(), 'tests/perf/optimized_metrics.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf-8');
  }, 180000);
});
