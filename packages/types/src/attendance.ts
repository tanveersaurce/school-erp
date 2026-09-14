import {
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  CorrectionStatus,
  HolidayType,
} from '@edusphere/common';

// =========================================================================
// 1. Core Record and Session Interfaces
// =========================================================================

export interface IAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
  arrivalTimestamp?: Date;
  isExcused?: boolean;
  originalStatus?: AttendanceStatus;
  isCorrected?: boolean;
}

export interface IStudentAttendance {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  academicClassId?: string;
  classId: string;
  sectionId: string;
  date: Date;
  attendanceMode: AttendanceMode;
  periodId?: string;
  timetableEntryId?: string;
  subjectId?: string;
  takenBy: string;
  status: AttendanceLifecycleStatus;
  isFinalized: boolean; // Preserved for backward compatibility
  approvedBy?: string;
  approvedAt?: Date;
  lockedBy?: string;
  lockedAt?: Date;
  records: IAttendanceRecord[];
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  halfDayCount?: number;
  excusedCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffAttendance {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  staffId: string;
  date: Date;
  status: AttendanceStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 2. Correction and Audit Interfaces
// =========================================================================

export interface IAttendanceCorrection {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  attendanceId: string;
  studentId: string;
  oldStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  requestedBy: string;
  reviewedBy?: string;
  status: CorrectionStatus;
  reviewedAt?: Date;
  reviewRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 3. Holiday / Calendar Interface
// =========================================================================

export interface IHoliday {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  type: HolidayType;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// 4. API Input DTOs
// =========================================================================

export interface MarkAttendanceRecordInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
  arrivalTimestamp?: string | Date;
}

export interface MarkDailyAttendanceInput {
  academicClassId: string;
  date: string; // YYYY-MM-DD
  status?: AttendanceLifecycleStatus;
  records: MarkAttendanceRecordInput[];
  overrideNonWorkingDay?: boolean;
}

export interface MarkPeriodAttendanceInput {
  academicClassId: string;
  date: string; // YYYY-MM-DD
  periodId: string;
  timetableEntryId?: string;
  subjectId?: string;
  status?: AttendanceLifecycleStatus;
  records: MarkAttendanceRecordInput[];
  overrideNonWorkingDay?: boolean;
}

export interface RequestCorrectionInput {
  attendanceId: string;
  studentId: string;
  newStatus: AttendanceStatus;
  reason: string;
}

export interface ReviewCorrectionInput {
  status: CorrectionStatus;
  reviewRemarks?: string;
}

export interface CreateHolidayInput {
  campusId?: string;
  academicYearId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: HolidayType;
  description?: string;
}

export interface UpdateHolidayInput extends Partial<CreateHolidayInput> {}

// =========================================================================
// 5. Query Filters & Reporting DTOs
// =========================================================================

export interface AttendanceQueryFilters {
  campusId?: string;
  academicYearId?: string;
  academicClassId?: string;
  classId?: string;
  sectionId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  attendanceMode?: AttendanceMode;
  periodId?: string;
  teacherId?: string;
  subjectId?: string;
  status?: AttendanceLifecycleStatus;
  page?: number;
  limit?: number;
}

export interface StudentAttendanceSummaryDto {
  studentId: string;
  studentName?: string;
  studentCode?: string;
  rollNumber?: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  excusedDays: number;
  presentEquivalentDays: number;
  attendancePercentage: number;
}

export interface ClassAttendanceSummaryDto {
  academicClassId: string;
  className: string;
  sectionName: string;
  date?: string;
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface MonthlyAttendanceDayEntry {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  status?: AttendanceStatus | 'NOT_MARKED';
}

export interface MonthlyAttendanceStudentRow {
  studentId: string;
  studentName: string;
  studentCode?: string;
  rollNumber?: number;
  days: Record<number, AttendanceStatus | 'HOLIDAY' | 'WEEKEND' | 'NOT_MARKED'>;
  summary: StudentAttendanceSummaryDto;
}

export interface MonthlyAttendanceMatrixDto {
  academicClassId: string;
  className: string;
  sectionName: string;
  year: number;
  month: number;
  daysInMonth: number;
  workingDaysCount: number;
  students: MonthlyAttendanceStudentRow[];
}

export interface LowAttendanceStudentDto extends StudentAttendanceSummaryDto {
  className: string;
  sectionName: string;
  academicClassId: string;
}

export interface LowAttendanceReportDto {
  thresholdPercentage: number;
  academicYearId: string;
  totalStudentsEvaluated: number;
  lowAttendanceCount: number;
  students: LowAttendanceStudentDto[];
}

export interface DailyCampusAttendanceSummaryDto {
  date: string;
  campusId?: string;
  totalClasses: number;
  markedClasses: number;
  pendingClasses: number;
  totalEnrolledStudents: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDay: number;
  overallPercentage: number;
  classes: ClassAttendanceSummaryDto[];
}
