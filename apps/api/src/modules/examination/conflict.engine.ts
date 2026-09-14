import { Types } from 'mongoose';
import { Exam, ExamSchedule } from '@edusphere/database';
import { IScheduleConflictCheck, IScheduleConflictCheckResult } from '@edusphere/types';

export class ExamConflictEngine {
  /**
   * Helper to convert "HH:MM" string to minutes from midnight for interval arithmetic.
   */
  public static timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  /**
   * Helper to check if two time ranges [start1, end1] and [start2, end2] overlap.
   */
  public static isTimeOverlapping(
    start1Str: string,
    end1Str: string,
    start2Str: string,
    end2Str: string
  ): boolean {
    const s1 = this.timeToMinutes(start1Str);
    const e1 = this.timeToMinutes(end1Str);
    const s2 = this.timeToMinutes(start2Str);
    const e2 = this.timeToMinutes(end2Str);

    return Math.max(s1, s2) < Math.min(e1, e2);
  }

  /**
   * Evaluates all potential scheduling conflicts across class, room, invigilator, and window.
   */
  public static async checkConflicts(
    tenantId: Types.ObjectId | string,
    params: IScheduleConflictCheck
  ): Promise<IScheduleConflictCheckResult> {
    const conflicts: IScheduleConflictCheckResult['conflicts'] = [];
    const tId = new Types.ObjectId(tenantId.toString());
    const examId = new Types.ObjectId(params.examId);
    const academicClassId = new Types.ObjectId(params.academicClassId);
    const subjectId = new Types.ObjectId(params.subjectId);
    const examDate = new Date(params.examDate);
    const startTime = params.startTime;
    const endTime = params.endTime;

    // Start of day and End of day for date matching
    const dayStart = new Date(examDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(examDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // 1. Verify date falls within the Exam window
    const examDoc = await Exam.findOne({ _id: examId, tenantId: tId });
    if (examDoc) {
      const examStart = new Date(examDoc.startDate);
      examStart.setUTCHours(0, 0, 0, 0);
      const examEnd = new Date(examDoc.endDate);
      examEnd.setUTCHours(23, 59, 59, 999);

      if (examDate < examStart || examDate > examEnd) {
        conflicts.push({
          type: 'DATE_OUTSIDE_RANGE',
          message: `Schedule Conflict: Exam date (${examDate.toISOString().split('T')[0]}) falls outside the master exam window (${examStart.toISOString().split('T')[0]} to ${examEnd.toISOString().split('T')[0]}) (outside exam window).`,
        });
      }
    }

    // 2. Check Subject Conflict: Has this subject already been scheduled for this class in this exam?
    const existingSubjectQuery: any = {
      tenantId: tId,
      examId,
      academicClassId,
      subjectId,
      status: { $ne: 'CANCELLED' },
      isDeleted: false,
    };
    if (params.excludeScheduleId) {
      existingSubjectQuery._id = { $ne: new Types.ObjectId(params.excludeScheduleId) };
    }
    const duplicateSubject = await ExamSchedule.findOne(existingSubjectQuery);
    if (duplicateSubject) {
      conflicts.push({
        type: 'DUPLICATE_SUBJECT',
        message: 'This subject is already scheduled for this academic class in this examination.',
        conflictingScheduleId: duplicateSubject._id.toString(),
      });
    }

    // 3. Find all active schedules on the target date within the same tenant
    const sameDayQuery: any = {
      tenantId: tId,
      examDate: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'CANCELLED' },
      isDeleted: false,
    };
    if (params.excludeScheduleId) {
      sameDayQuery._id = { $ne: new Types.ObjectId(params.excludeScheduleId) };
    }

    const sameDaySchedules = await ExamSchedule.find(sameDayQuery);

    for (const sched of sameDaySchedules) {
      const overlaps = this.isTimeOverlapping(startTime, endTime, sched.startTime, sched.endTime);
      if (!overlaps) continue;

      // 4. Class Conflict: Same class section taking another paper at the same time
      if (sched.academicClassId.toString() === academicClassId.toString()) {
        conflicts.push({
          type: 'CLASS_OVERLAP',
          message: `Class conflict: Academic class already has an exam scheduled from ${sched.startTime} to ${sched.endTime}.`,
          conflictingScheduleId: sched._id.toString(),
        });
      }

      // 5. Room Conflict: Same physical room booked at the same time
      if (
        params.roomId &&
        ((sched.roomId && sched.roomId.toString() === params.roomId.toString()) ||
          (sched.room && sched.room.toString() === params.roomId.toString()))
      ) {
        conflicts.push({
          type: 'ROOM_OCCUPIED',
          message: `Room conflict: The selected room is already booked for an exam from ${sched.startTime} to ${sched.endTime}.`,
          conflictingScheduleId: sched._id.toString(),
        });
      }

      // 6. Invigilator Conflict: Same invigilator assigned to another exam at the same time
      if (
        params.invigilatorId &&
        sched.invigilatorId &&
        sched.invigilatorId.toString() === params.invigilatorId.toString()
      ) {
        conflicts.push({
          type: 'INVIGILATOR_ASSIGNED',
          message: `Invigilator conflict: The assigned invigilator is already supervising an exam from ${sched.startTime} to ${sched.endTime}.`,
          conflictingScheduleId: sched._id.toString(),
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }
}
