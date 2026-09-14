import { Types } from 'mongoose';
import {
  Period,
  Classroom,
  Timetable,
  TimetableEntry,
  AcademicClass,
  Subject,
  Teacher,
  School,
  ClassSubject,
  TeacherSubjectAssignment,
} from '@edusphere/database';
import {
  PeriodType,
  TimetableEntryStatus,
  WeekDay,
} from '@edusphere/common';
import type {
  TimetableConflict,
  TimetableValidationReport,
} from '@edusphere/types';

export const DAY_NUMBER_TO_NAME: { [day: number]: string } = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export const DAY_NUMBER_TO_WEEKDAY: { [day: number]: WeekDay } = {
  1: WeekDay.MONDAY,
  2: WeekDay.TUESDAY,
  3: WeekDay.WEDNESDAY,
  4: WeekDay.THURSDAY,
  5: WeekDay.FRIDAY,
  6: WeekDay.SATURDAY,
  7: WeekDay.SUNDAY,
};

export interface CandidateSlotInput {
  entryId?: string; // If updating, ignore current entry
  academicClassId: string;
  dayOfWeek: number;
  periodId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
}

export class SchedulingEngine {
  /**
   * Validates a candidate timetable entry against all scheduling constraints.
   * Returns an array of detected conflicts.
   */
  async validateCandidateEntry(
    tenantId: string,
    timetableId: string,
    candidate: CandidateSlotInput
  ): Promise<TimetableConflict[]> {
    const conflicts: TimetableConflict[] = [];

    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);
    const acId = new Types.ObjectId(candidate.academicClassId);
    const pId = new Types.ObjectId(candidate.periodId);
    const sId = new Types.ObjectId(candidate.subjectId);
    const tchId = new Types.ObjectId(candidate.teacherId);
    const rId = candidate.roomId && Types.ObjectId.isValid(candidate.roomId)
      ? new Types.ObjectId(candidate.roomId)
      : undefined;
    const currentEntryId = candidate.entryId && Types.ObjectId.isValid(candidate.entryId)
      ? new Types.ObjectId(candidate.entryId)
      : undefined;

    const dayName = DAY_NUMBER_TO_NAME[candidate.dayOfWeek] || `Day ${candidate.dayOfWeek}`;

    // 1. Fetch reference records
    const [timetable, period, academicClass, subject, teacher, classroom] = await Promise.all([
      Timetable.findOne({ _id: ttId, tenantId: tId, isDeleted: false }).lean(),
      Period.findOne({ _id: pId, tenantId: tId, isDeleted: false }).lean(),
      AcademicClass.findOne({ _id: acId, tenantId: tId, isDeleted: false })
        .populate('classId', 'name code')
        .populate('sectionId', 'name code')
        .lean(),
      Subject.findOne({ _id: sId, tenantId: tId, isDeleted: false }).lean(),
      Teacher.findOne({ _id: tchId, tenantId: tId, isDeleted: false })
        .populate('userId', 'firstName lastName')
        .lean(),
      rId ? Classroom.findOne({ _id: rId, tenantId: tId, isDeleted: false }).lean() : null,
    ]);

    if (!timetable) {
      conflicts.push({
        type: 'CLASS_CONFLICT',
        severity: 'ERROR',
        message: 'Target Timetable does not exist or has been deleted.',
        dayOfWeek: candidate.dayOfWeek,
        dayName,
        periodId: candidate.periodId,
        periodName: period?.name || 'Unknown Period',
      });
      return conflicts;
    }

    const periodName = period?.name || `Period (ID: ${candidate.periodId})`;
    const className = academicClass
      ? `${(academicClass.classId as any)?.name || 'Class'} - ${(academicClass.sectionId as any)?.name || 'Section'}`
      : 'Class Offering';
    const teacherName = teacher
      ? `${(teacher.userId as any)?.firstName || ''} ${(teacher.userId as any)?.lastName || ''}`.trim() ||
        (teacher as any).employeeId ||
        'Faculty'
      : 'Teacher';
    const subjectName = subject ? `${subject.name} (${subject.code})` : 'Subject';
    const roomName = classroom ? `${classroom.name} (${classroom.code})` : undefined;

    // 2. Validate Period Type (Teaching vs Break/Lunch/Assembly)
    if (period && period.type !== PeriodType.TEACHING) {
      conflicts.push({
        type: 'PERIOD_TYPE_INVALID',
        severity: 'ERROR',
        message: `Cannot schedule subject '${subjectName}' during non-teaching period '${periodName}' (${period.type}).`,
        dayOfWeek: candidate.dayOfWeek,
        dayName,
        periodId: candidate.periodId,
        periodName,
        academicClassId: candidate.academicClassId,
        className,
      });
    }

    // 3. Validate Working Days from School Settings
    const school = await School.findOne({ _id: timetable.schoolId, tenantId: tId }).lean();
    if (school?.settings?.workingDays && school.settings.workingDays.length > 0) {
      const weekDayEnum = DAY_NUMBER_TO_WEEKDAY[candidate.dayOfWeek];
      if (weekDayEnum && !school.settings.workingDays.includes(weekDayEnum)) {
        conflicts.push({
          type: 'NON_WORKING_DAY',
          severity: 'ERROR',
          message: `${dayName} is configured as a non-working day for ${school.name}.`,
          dayOfWeek: candidate.dayOfWeek,
          dayName,
          periodId: candidate.periodId,
          periodName,
        });
      }
    }

    // 4. Validate Teacher Double-Booking (Teacher Conflict)
    const teacherConflictQuery: any = {
      tenantId: tId,
      timetableId: ttId,
      dayOfWeek: candidate.dayOfWeek,
      periodId: pId,
      teacherId: tchId,
      status: TimetableEntryStatus.ACTIVE,
      isDeleted: false,
    };
    if (currentEntryId) {
      teacherConflictQuery._id = { $ne: currentEntryId };
    }

    const existingTeacherEntry = await TimetableEntry.findOne(teacherConflictQuery)
      .populate({
        path: 'academicClassId',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' },
        ],
      })
      .lean();

    if (existingTeacherEntry) {
      const otherClass = existingTeacherEntry.academicClassId as any;
      const otherClassName = otherClass
        ? `${otherClass.classId?.name || 'Class'} - ${otherClass.sectionId?.name || 'Section'}`
        : 'another class';
      conflicts.push({
        type: 'TEACHER_CONFLICT',
        severity: 'ERROR',
        message: `Teacher '${teacherName}' is already assigned to ${otherClassName} during ${dayName} ${periodName}.`,
        dayOfWeek: candidate.dayOfWeek,
        dayName,
        periodId: candidate.periodId,
        periodName,
        teacherId: candidate.teacherId,
        teacherName,
        conflictingEntryId: existingTeacherEntry._id.toString(),
      });
    }

    // 5. Validate Class Double-Booking (Class Conflict)
    const classConflictQuery: any = {
      tenantId: tId,
      timetableId: ttId,
      dayOfWeek: candidate.dayOfWeek,
      periodId: pId,
      academicClassId: acId,
      status: TimetableEntryStatus.ACTIVE,
      isDeleted: false,
    };
    if (currentEntryId) {
      classConflictQuery._id = { $ne: currentEntryId };
    }

    const existingClassEntry = await TimetableEntry.findOne(classConflictQuery)
      .populate('subjectId', 'name code')
      .populate({
        path: 'teacherId',
        populate: { path: 'userId', select: 'firstName lastName' },
      })
      .lean();

    if (existingClassEntry) {
      const otherSub = (existingClassEntry.subjectId as any)?.name || 'another subject';
      conflicts.push({
        type: 'CLASS_CONFLICT',
        severity: 'ERROR',
        message: `${className} already has '${otherSub}' scheduled during ${dayName} ${periodName}.`,
        dayOfWeek: candidate.dayOfWeek,
        dayName,
        periodId: candidate.periodId,
        periodName,
        academicClassId: candidate.academicClassId,
        className,
        conflictingEntryId: existingClassEntry._id.toString(),
      });
    }

    // 6. Validate Room Double-Booking (Room Conflict)
    if (rId) {
      const roomConflictQuery: any = {
        tenantId: tId,
        timetableId: ttId,
        dayOfWeek: candidate.dayOfWeek,
        periodId: pId,
        roomId: rId,
        status: TimetableEntryStatus.ACTIVE,
        isDeleted: false,
      };
      if (currentEntryId) {
        roomConflictQuery._id = { $ne: currentEntryId };
      }

      const existingRoomEntry = await TimetableEntry.findOne(roomConflictQuery)
        .populate({
          path: 'academicClassId',
          populate: [
            { path: 'classId', select: 'name' },
            { path: 'sectionId', select: 'name' },
          ],
        })
        .lean();

      if (existingRoomEntry) {
        const otherClass = existingRoomEntry.academicClassId as any;
        const otherClassName = otherClass
          ? `${otherClass.classId?.name || 'Class'} - ${otherClass.sectionId?.name || 'Section'}`
          : 'another class';
        conflicts.push({
          type: 'ROOM_CONFLICT',
          severity: 'ERROR',
          message: `Room '${roomName || 'Classroom'}' is already booked by ${otherClassName} during ${dayName} ${periodName}.`,
          dayOfWeek: candidate.dayOfWeek,
          dayName,
          periodId: candidate.periodId,
          periodName,
          roomId: candidate.roomId!,
          roomName,
          conflictingEntryId: existingRoomEntry._id.toString(),
        });
      }

      // 7. Validate Room Capacity vs Class Enrollment/Capacity
      if (classroom && academicClass) {
        const requiredCapacity = academicClass.capacity || 40;
        if (classroom.capacity < requiredCapacity) {
          conflicts.push({
            type: 'ROOM_CAPACITY_EXCEEDED',
            severity: 'WARNING',
            message: `Room '${classroom.name}' capacity (${classroom.capacity}) is smaller than ${className} capacity (${requiredCapacity}).`,
            dayOfWeek: candidate.dayOfWeek,
            dayName,
            periodId: candidate.periodId,
            periodName,
            roomId: candidate.roomId!,
            roomName,
          });
        }
      }
    }

    // 8. Validate Curriculum Mapping (Subject must be offered to this Class)
    if (academicClass) {
      const classSubject = await ClassSubject.findOne({
        tenantId: tId,
        academicYearId: timetable.academicYearId,
        classId: academicClass.classId,
        subjectId: sId,
        isDeleted: false,
      }).lean();

      if (!classSubject) {
        conflicts.push({
          type: 'SUBJECT_NOT_OFFERED',
          severity: 'WARNING',
          message: `Subject '${subjectName}' is not mapped to the curriculum of ${className} for this Academic Year.`,
          dayOfWeek: candidate.dayOfWeek,
          dayName,
          periodId: candidate.periodId,
          periodName,
          subjectId: candidate.subjectId,
          subjectName,
        });
      }

      // 9. Validate Teacher-Subject Assignment
      const teacherAssignment = await TeacherSubjectAssignment.findOne({
        tenantId: tId,
        academicYearId: timetable.academicYearId,
        subjectId: sId,
        teacherId: tchId,
        $or: [
          { academicClassId: acId },
          { classId: academicClass.classId, sectionId: academicClass.sectionId },
        ],
      }).lean();

      if (!teacherAssignment) {
        conflicts.push({
          type: 'TEACHER_NOT_ASSIGNED',
          severity: 'WARNING',
          message: `Teacher '${teacherName}' is not officially assigned to teach '${subjectName}' for ${className}.`,
          dayOfWeek: candidate.dayOfWeek,
          dayName,
          periodId: candidate.periodId,
          periodName,
          teacherId: candidate.teacherId,
          teacherName,
        });
      }
    }

    return conflicts;
  }

  /**
   * Scans all entries in a timetable and produces a comprehensive validation report.
   */
  async validateTimetable(
    tenantId: string,
    timetableId: string
  ): Promise<TimetableValidationReport> {
    const tId = new Types.ObjectId(tenantId);
    const ttId = new Types.ObjectId(timetableId);

    const entries = await TimetableEntry.find({
      tenantId: tId,
      timetableId: ttId,
      status: TimetableEntryStatus.ACTIVE,
      isDeleted: false,
    }).lean();

    const allConflicts: TimetableConflict[] = [];

    // Evaluate each entry
    for (const entry of entries) {
      const conflicts = await this.validateCandidateEntry(tenantId, timetableId, {
        entryId: entry._id.toString(),
        academicClassId: entry.academicClassId.toString(),
        dayOfWeek: entry.dayOfWeek,
        periodId: entry.periodId.toString(),
        subjectId: entry.subjectId.toString(),
        teacherId: entry.teacherId.toString(),
        roomId: entry.roomId?.toString(),
      });
      allConflicts.push(...conflicts);
    }

    // Deduplicate conflicts
    const uniqueConflicts = this.deduplicateConflicts(allConflicts);

    const summary = {
      teacherConflicts: uniqueConflicts.filter((c) => c.type === 'TEACHER_CONFLICT').length,
      classConflicts: uniqueConflicts.filter((c) => c.type === 'CLASS_CONFLICT').length,
      roomConflicts: uniqueConflicts.filter((c) => c.type === 'ROOM_CONFLICT').length,
      invalidPeriodTypes: uniqueConflicts.filter((c) => c.type === 'PERIOD_TYPE_INVALID').length,
      capacityIssues: uniqueConflicts.filter((c) => c.type === 'ROOM_CAPACITY_EXCEEDED').length,
      assignmentIssues: uniqueConflicts.filter(
        (c) => c.type === 'TEACHER_NOT_ASSIGNED' || c.type === 'SUBJECT_NOT_OFFERED'
      ).length,
    };

    // A timetable is valid if there are 0 ERROR severity conflicts
    const hasFatalErrors = uniqueConflicts.some((c) => c.severity === 'ERROR');

    return {
      isValid: !hasFatalErrors,
      totalEntries: entries.length,
      totalConflicts: uniqueConflicts.length,
      conflicts: uniqueConflicts,
      summary,
    };
  }

  private deduplicateConflicts(conflicts: TimetableConflict[]): TimetableConflict[] {
    const seen = new Set<string>();
    const result: TimetableConflict[] = [];

    for (const c of conflicts) {
      const key = `${c.type}_${c.dayOfWeek}_${c.periodId}_${c.academicClassId || ''}_${c.teacherId || ''}_${c.roomId || ''}_${c.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }

    return result;
  }
}

export const schedulingEngine = new SchedulingEngine();
