import {
  AcademicStatus,
  PeriodType,
  TimetableStatus,
  RoomType,
  TimetableEntryStatus,
  WeekDay,
} from '@edusphere/common';

// =========================================================================
// 1. Period Interfaces & DTOs
// =========================================================================
export interface IPeriod {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  name: string;
  code: string;
  sequence: number;
  startTime: string; // "08:30"
  endTime: string; // "09:15"
  duration: number; // In minutes
  type: PeriodType;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PeriodDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  name: string;
  code: string;
  sequence: number;
  startTime: string;
  endTime: string;
  duration: number;
  type: PeriodType;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePeriodInput {
  campusId?: string;
  name: string;
  code: string;
  sequence: number;
  startTime: string;
  endTime: string;
  duration?: number;
  type?: PeriodType;
  status?: AcademicStatus;
}

export interface UpdatePeriodInput {
  name?: string;
  code?: string;
  sequence?: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  type?: PeriodType;
  status?: AcademicStatus;
}

export interface PeriodFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  campusId?: string;
  type?: PeriodType | string;
  status?: AcademicStatus | string;
}

// =========================================================================
// 2. Classroom / Physical Room Interfaces & DTOs
// =========================================================================
export interface IClassroom {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  name: string;
  code: string;
  roomNumber?: string;
  capacity: number;
  roomType: RoomType;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassroomDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  campusName?: string;
  name: string;
  code: string;
  roomNumber?: string;
  capacity: number;
  roomType: RoomType;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClassroomInput {
  campusId: string;
  name: string;
  code: string;
  roomNumber?: string;
  capacity?: number;
  roomType?: RoomType;
  status?: AcademicStatus;
}

export interface UpdateClassroomInput {
  name?: string;
  code?: string;
  roomNumber?: string;
  capacity?: number;
  roomType?: RoomType;
  status?: AcademicStatus;
}

export interface ClassroomFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  campusId?: string;
  roomType?: RoomType | string;
  status?: AcademicStatus | string;
}

// =========================================================================
// 3. Timetable Master Configuration & Versioning
// =========================================================================
export interface ITimetable {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
  name: string;
  code?: string;
  description?: string;
  status: TimetableStatus;
  version: number;
  isCurrent: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  publishedAt?: Date;
  publishedBy?: string;
  archivedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimetableDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  campusName?: string;
  academicYearId: string;
  academicYearName?: string;
  name: string;
  code?: string;
  description?: string;
  status: TimetableStatus;
  version: number;
  isCurrent: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  publishedAt?: Date;
  publishedBy?: string;
  publishedByName?: string;
  archivedAt?: Date;
  isDeleted: boolean;
  totalEntries?: number;
  totalClassesScheduled?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTimetableInput {
  campusId: string;
  academicYearId: string;
  name: string;
  code?: string;
  description?: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
}

export interface UpdateTimetableInput {
  name?: string;
  code?: string;
  description?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

export interface CloneTimetableInput {
  name: string;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
}

export interface TimetableFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  campusId?: string;
  academicYearId?: string;
  status?: TimetableStatus | string;
  isCurrent?: boolean;
}

// =========================================================================
// 4. Timetable Entry Interfaces & DTOs
// =========================================================================
export interface ITimetableEntry {
  id: string;
  tenantId: string;
  schoolId: string;
  timetableId: string;
  academicClassId: string;
  classId: string;
  sectionId: string;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  periodId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  status: TimetableEntryStatus;
  substituteTeacherId?: string;
  substitutionNote?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimetableEntryDto {
  id: string;
  tenantId: string;
  schoolId: string;
  timetableId: string;
  academicClassId: string;
  className?: string;
  sectionName?: string;
  classId: string;
  sectionId: string;
  dayOfWeek: number;
  dayName?: string;
  periodId: string;
  periodName?: string;
  periodSequence?: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  periodType?: PeriodType;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  teacherId: string;
  teacherName?: string;
  teacherCode?: string;
  teacherEmail?: string;
  roomId?: string;
  roomName?: string;
  roomCode?: string;
  roomCapacity?: number;
  status: TimetableEntryStatus;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
  substitutionNote?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTimetableEntryInput {
  academicClassId: string;
  dayOfWeek: number;
  periodId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
}

export interface UpdateTimetableEntryInput {
  subjectId?: string;
  teacherId?: string;
  roomId?: string | null;
  dayOfWeek?: number;
  periodId?: string;
  status?: TimetableEntryStatus;
  substituteTeacherId?: string | null;
  substitutionNote?: string;
}

export interface TimetableEntryFilterQuery {
  page?: number;
  limit?: number;
  timetableId?: string;
  academicClassId?: string;
  teacherId?: string;
  roomId?: string;
  dayOfWeek?: number;
  periodId?: string;
  subjectId?: string;
}

// =========================================================================
// 5. Conflict Detection Types & Reports
// =========================================================================
export type ConflictType =
  | 'TEACHER_CONFLICT'
  | 'CLASS_CONFLICT'
  | 'ROOM_CONFLICT'
  | 'PERIOD_TYPE_INVALID'
  | 'ROOM_CAPACITY_EXCEEDED'
  | 'TEACHER_NOT_ASSIGNED'
  | 'SUBJECT_NOT_OFFERED'
  | 'NON_WORKING_DAY';

export interface TimetableConflict {
  type: ConflictType;
  severity: 'ERROR' | 'WARNING';
  message: string;
  dayOfWeek: number;
  dayName: string;
  periodId: string;
  periodName: string;
  academicClassId?: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  subjectId?: string;
  subjectName?: string;
  conflictingEntryId?: string;
}

export interface TimetableValidationReport {
  isValid: boolean;
  totalEntries: number;
  totalConflicts: number;
  conflicts: TimetableConflict[];
  summary: {
    teacherConflicts: number;
    classConflicts: number;
    roomConflicts: number;
    invalidPeriodTypes: number;
    capacityIssues: number;
    assignmentIssues: number;
  };
}

// =========================================================================
// 6. Teacher Workload Aggregations
// =========================================================================
export interface TeacherWorkloadItem {
  teacherId: string;
  teacherName: string;
  teacherCode?: string;
  email?: string;
  totalPeriodsPerWeek: number;
  bySubject: {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    periodCount: number;
  }[];
  byClass: {
    academicClassId: string;
    className: string;
    sectionName: string;
    periodCount: number;
  }[];
  byDay: { [day: number]: number };
}

export interface TeacherWorkloadSummary {
  timetableId: string;
  academicYearName?: string;
  totalTeachers: number;
  averagePeriodsPerTeacher: number;
  workload: TeacherWorkloadItem[];
}

// =========================================================================
// 7. Structured 2D Weekly Matrix Views
// =========================================================================
export interface TimetableGridSlot {
  entryId?: string;
  academicClassId?: string;
  className?: string;
  sectionName?: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  teacherId?: string;
  teacherName?: string;
  teacherCode?: string;
  roomId?: string;
  roomName?: string;
  roomCode?: string;
  periodId: string;
  periodName: string;
  periodSequence: number;
  periodType: PeriodType;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  dayName: string;
  isBreak: boolean;
}

export interface ClassTimetableViewDto {
  timetableId: string;
  timetableName: string;
  academicClassId: string;
  className: string;
  sectionName: string;
  campusName?: string;
  academicYearName?: string;
  classTeacherName?: string;
  workingDays: { dayOfWeek: number; dayName: string }[];
  periods: PeriodDto[];
  grid: { [periodId: string]: { [dayOfWeek: number]: TimetableGridSlot } };
}

export interface TeacherTimetableViewDto {
  timetableId: string;
  timetableName: string;
  teacherId: string;
  teacherName: string;
  teacherCode?: string;
  totalWeeklyPeriods: number;
  workingDays: { dayOfWeek: number; dayName: string }[];
  periods: PeriodDto[];
  grid: { [periodId: string]: { [dayOfWeek: number]: TimetableGridSlot } };
}

export interface RoomTimetableViewDto {
  timetableId: string;
  timetableName: string;
  roomId: string;
  roomName: string;
  roomCode: string;
  roomType: RoomType;
  capacity: number;
  workingDays: { dayOfWeek: number; dayName: string }[];
  periods: PeriodDto[];
  grid: { [periodId: string]: { [dayOfWeek: number]: TimetableGridSlot } };
}
