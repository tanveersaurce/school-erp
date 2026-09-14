import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  Assignment,
  AssignmentSubmission,
} from '../src/models/homework.model.js';
import {
  AssignmentType,
  AssignmentStatus,
  SubmissionType,
  AssignmentTargetType,
  AssignmentSubmissionStatus,
} from '@edusphere/common';

describe('Phase 11: Assignment & Submission Database Invariants', () => {
  let mongod: MongoMemoryServer;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();
  const academicYearId = new Types.ObjectId();
  const academicClassId = new Types.ObjectId();
  const subjectId = new Types.ObjectId();
  const teacherId = new Types.ObjectId();
  const createdBy = new Types.ObjectId();
  const student1Id = new Types.ObjectId();
  const student2Id = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Assignment.init();
    await AssignmentSubmission.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('should enforce unique compound index preventing duplicate active submissions for the same student and assignment', async () => {
    const assignment = await Assignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      subjectId,
      teacherId,
      title: 'Math Calculus Homework',
      description: 'Solve exercises 1-10 on page 42.',
      assignmentType: AssignmentType.HOMEWORK,
      assignedDate: new Date('2026-09-15T09:00:00.000Z'),
      dueDate: new Date('2026-09-20T23:59:59.000Z'),
      dueTime: '23:59',
      dueAt: new Date('2026-09-20T23:59:59.000Z'),
      maxScore: 100,
      status: AssignmentStatus.PUBLISHED,
      submissionType: SubmissionType.BOTH,
      allowLateSubmission: true,
      targetType: AssignmentTargetType.ALL,
      createdBy,
    });

    // First submission succeeds
    const sub1 = await AssignmentSubmission.create({
      tenantId,
      schoolId,
      campusId,
      assignmentId: assignment._id,
      studentId: student1Id,
      status: AssignmentSubmissionStatus.SUBMITTED,
      submittedAt: new Date('2026-09-16T14:30:00.000Z'),
      textResponse: 'Here is my solution.',
      attemptNumber: 1,
      attempts: [
        {
          attemptNumber: 1,
          submittedAt: new Date('2026-09-16T14:30:00.000Z'),
          textResponse: 'Here is my solution.',
          attachments: [],
          lateSubmission: false,
          status: AssignmentSubmissionStatus.SUBMITTED,
        },
      ],
    });

    expect(sub1._id).toBeDefined();

    // Duplicate submission for same student & assignment must trigger duplicate key error (code 11000)
    await expect(
      AssignmentSubmission.create({
        tenantId,
        schoolId,
        campusId,
        assignmentId: assignment._id,
        studentId: student1Id,
        status: AssignmentSubmissionStatus.SUBMITTED,
        submittedAt: new Date('2026-09-17T10:00:00.000Z'),
        textResponse: 'Duplicate attempt doc',
        attemptNumber: 2,
      })
    ).rejects.toThrow(/E11000.*duplicate key error/);

    // Another student can submit for the same assignment without collision
    const sub2 = await AssignmentSubmission.create({
      tenantId,
      schoolId,
      campusId,
      assignmentId: assignment._id,
      studentId: student2Id,
      status: AssignmentSubmissionStatus.SUBMITTED,
      submittedAt: new Date('2026-09-16T15:00:00.000Z'),
      textResponse: 'Student 2 solution.',
      attemptNumber: 1,
    });

    expect(sub2._id).toBeDefined();
  });

  it('should enforce idempotency key uniqueness per tenant to prevent duplicate network retries', async () => {
    const assignment = await Assignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      subjectId,
      teacherId,
      title: 'Physics Lab Report',
      description: 'Submit report on pendulum experiments.',
      assignmentType: AssignmentType.PROJECT,
      dueDate: new Date('2026-09-22T23:59:59.000Z'),
      dueTime: '23:59',
      dueAt: new Date('2026-09-22T23:59:59.000Z'),
      maxScore: 50,
      createdBy,
    });

    const idempotencyKey = `sub_tx_${Date.now()}_abc123`;
    const student3Id = new Types.ObjectId();

    await AssignmentSubmission.create({
      tenantId,
      schoolId,
      campusId,
      assignmentId: assignment._id,
      studentId: student3Id,
      status: AssignmentSubmissionStatus.SUBMITTED,
      idempotencyKey,
    });

    const student4Id = new Types.ObjectId();
    await expect(
      AssignmentSubmission.create({
        tenantId,
        schoolId,
        campusId,
        assignmentId: assignment._id,
        studentId: student4Id,
        status: AssignmentSubmissionStatus.SUBMITTED,
        idempotencyKey, // Reusing same idempotencyKey in same tenant
      })
    ).rejects.toThrow(/E11000.*duplicate key error/);
  });

  it('should support soft-deletion filtering on Assignment and AssignmentSubmission', async () => {
    const assignment = await Assignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      subjectId,
      teacherId,
      title: 'Chemistry Homework Draft',
      description: 'Periodic table worksheet.',
      assignmentType: AssignmentType.HOMEWORK,
      dueDate: new Date('2026-09-25T23:59:59.000Z'),
      dueTime: '23:59',
      dueAt: new Date('2026-09-25T23:59:59.000Z'),
      createdBy,
    });

    const foundBefore = await Assignment.findById(assignment._id);
    expect(foundBefore).not.toBeNull();

    // Soft delete
    await (assignment as any).softDelete();

    const foundAfter = await Assignment.findById(assignment._id);
    expect(foundAfter).toBeNull();

    const foundWithDeleted = await Assignment.findOne({ _id: assignment._id, isDeleted: true });
    expect(foundWithDeleted).not.toBeNull();
  });

  it('should support multiple attempt history tracking within the same submission document', async () => {
    const assignment = await Assignment.create({
      tenantId,
      schoolId,
      campusId,
      academicYearId,
      academicClassId,
      subjectId,
      teacherId,
      title: 'English Essay: Shakespeare',
      description: 'Write 500 words on Hamlet.',
      assignmentType: AssignmentType.ASSIGNMENT,
      dueDate: new Date('2026-09-30T23:59:59.000Z'),
      dueTime: '23:59',
      dueAt: new Date('2026-09-30T23:59:59.000Z'),
      createdBy,
    });

    const student5Id = new Types.ObjectId();

    // Initial draft
    const sub = await AssignmentSubmission.create({
      tenantId,
      schoolId,
      campusId,
      assignmentId: assignment._id,
      studentId: student5Id,
      status: AssignmentSubmissionStatus.DRAFT,
      textResponse: 'Draft version of essay.',
      attemptNumber: 1,
    });

    // First final submission
    sub.status = AssignmentSubmissionStatus.SUBMITTED;
    sub.submittedAt = new Date('2026-09-28T10:00:00.000Z');
    sub.textResponse = 'Final Version 1.';
    sub.attempts.push({
      attemptNumber: 1,
      submittedAt: new Date('2026-09-28T10:00:00.000Z'),
      textResponse: 'Final Version 1.',
      attachments: [],
      lateSubmission: false,
      status: AssignmentSubmissionStatus.SUBMITTED,
    });
    await sub.save();

    // Returned by teacher and resubmitted (attempt 2)
    sub.status = AssignmentSubmissionStatus.RETURNED;
    sub.feedback = 'Good start, but please expand paragraph 3.';
    await sub.save();

    sub.status = AssignmentSubmissionStatus.SUBMITTED;
    sub.attemptNumber = 2;
    sub.submittedAt = new Date('2026-09-29T11:00:00.000Z');
    sub.textResponse = 'Final Version 2 with expanded paragraph 3.';
    sub.attempts.push({
      attemptNumber: 2,
      submittedAt: new Date('2026-09-29T11:00:00.000Z'),
      textResponse: 'Final Version 2 with expanded paragraph 3.',
      attachments: [],
      lateSubmission: false,
      status: AssignmentSubmissionStatus.SUBMITTED,
    });
    await sub.save();

    const verified = await AssignmentSubmission.findById(sub._id);
    expect(verified?.attemptNumber).toBe(2);
    expect(verified?.attempts).toHaveLength(2);
    expect(verified?.attempts[0].attemptNumber).toBe(1);
    expect(verified?.attempts[1].attemptNumber).toBe(2);
  });
});
