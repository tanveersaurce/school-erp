import { Types } from 'mongoose';
import {
  StudentAttendance,
  AttendanceCorrection,
  AcademicClass,
  Class,
  Section,
  StudentEnrollment,
  Student,
  Period,
  Timetable,
  TimetableEntry,
  School,
  Teacher,
} from '@edusphere/database';
import {
  MarkDailyAttendanceInput,
  MarkPeriodAttendanceInput,
  RequestCorrectionInput,
  ReviewCorrectionInput,
  AttendanceQueryFilters,
  IStudentAttendance,
  IAttendanceCorrection,
  StudentAttendanceSummaryDto,
  ClassAttendanceSummaryDto,
  MonthlyAttendanceMatrixDto,
  LowAttendanceReportDto,
  DailyCampusAttendanceSummaryDto,
  IAttendanceRecord,
} from '@edusphere/types';
import {
  AttendanceStatus,
  AttendanceMode,
  AttendanceLifecycleStatus,
  CorrectionStatus,
  PeriodType,
  NotFoundError,
  BadRequestError,
  ConflictError,
  AuthorizationError,
  UserType,
} from '@edusphere/common';
import { TenantContext } from '@edusphere/types';
import { holidayService } from './holiday.service.js';
import { attendancePolicy, AuthUserContext } from './attendance.policy.js';

export class AttendanceService {
  /**
   * Normalize any date string or Date to normalized midnight UTC Date
   */
  normalizeDate(input: string | Date): Date {
    const d = new Date(input);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  /**
   * Recalculates summary counts on an attendance record set
   */
  private computeCounts(records: { status: AttendanceStatus }[]) {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let excusedCount = 0;

    for (const r of records) {
      switch (r.status) {
        case AttendanceStatus.PRESENT:
          presentCount++;
          break;
        case AttendanceStatus.ABSENT:
          absentCount++;
          break;
        case AttendanceStatus.LATE:
          lateCount++;
          break;
        case AttendanceStatus.HALF_DAY:
          halfDayCount++;
          break;
        case AttendanceStatus.EXCUSED:
          excusedCount++;
          break;
      }
    }

    return {
      totalStudents: records.length,
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      excusedCount,
    };
  }

  /**
   * Mark or Save Draft Daily Attendance for a class
   */
  async markDailyAttendance(
    context: TenantContext,
    user: AuthUserContext,
    input: MarkDailyAttendanceInput
  ): Promise<IStudentAttendance> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const academicClassId = new Types.ObjectId(input.academicClassId);
    const date = this.normalizeDate(input.date);

    // 1. Validate AcademicClass
    const academicClass = await AcademicClass.findOne({
      _id: academicClassId,
      tenantId,
      isDeleted: false,
    });
    if (!academicClass) {
      throw new NotFoundError('Academic class not found');
    }

    // 2. Check Calendar & Non-Working Day
    const nonWorkingCheck = await holidayService.checkNonWorkingDay(
      tenantId,
      date,
      academicClass.campusId,
      academicClass.academicYearId
    );
    if (nonWorkingCheck.isNonWorking && !input.overrideNonWorkingDay) {
      throw new BadRequestError(
        `Cannot mark attendance: ${date.toISOString().split('T')[0]} is a ${nonWorkingCheck.reason}. Use override flag if explicitly authorized.`
      );
    }

    // 3. Authorize Teacher or Leadership
    const teacherId = await attendancePolicy.authorizeDailyMarking(user, academicClassId);

    // 4. Validate Student Eligibility (Only actively enrolled students in this academic class)
    const activeEnrollments = await StudentEnrollment.find({
      tenantId,
      academicYearId: academicClass.academicYearId,
      $or: [
        { academicClassId },
        { classId: academicClass.classId, sectionId: academicClass.sectionId },
      ],
      status: 'ENROLLED',
    });

    const eligibleStudentIds = new Set(activeEnrollments.map((e) => e.studentId.toString()));

    for (const rec of input.records) {
      if (!eligibleStudentIds.has(rec.studentId)) {
        throw new BadRequestError(
          `Student with ID ${rec.studentId} is not actively enrolled in this class.`
        );
      }
    }

    // 5. Prepare Records & Summary Counts
    const formattedRecords: any[] = input.records.map((r) => ({
      studentId: new Types.ObjectId(r.studentId),
      status: r.status,
      remarks: r.remarks,
      arrivalTimestamp: r.arrivalTimestamp ? new Date(r.arrivalTimestamp) : undefined,
    }));

    const counts = this.computeCounts(formattedRecords);

    // 6. Check for existing session
    const existing = await StudentAttendance.findOne({
      tenantId,
      academicYearId: academicClass.academicYearId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      date,
      attendanceMode: AttendanceMode.DAILY,
    });

    const targetStatus = input.status || AttendanceLifecycleStatus.SUBMITTED;

    if (existing) {
      if (existing.status === AttendanceLifecycleStatus.LOCKED) {
        throw new BadRequestError('Attendance register is locked against modifications.');
      }
      if (
        existing.status === AttendanceLifecycleStatus.APPROVED &&
        ![UserType.SUPER_ADMIN, UserType.SCHOOL_ADMIN, UserType.PRINCIPAL].includes(
          user.userType as UserType
        )
      ) {
        throw new BadRequestError('Approved attendance cannot be modified without a correction request.');
      }

      existing.records = formattedRecords;
      existing.status = targetStatus;
      existing.takenBy = teacherId;
      existing.isFinalized = targetStatus === AttendanceLifecycleStatus.SUBMITTED || targetStatus === AttendanceLifecycleStatus.APPROVED;
      await existing.save();
      return this.mapToDto(existing, counts);
    }

    // 7. Atomic Insert
    const newDoc = await StudentAttendance.create({
      tenantId,
      schoolId: academicClass.schoolId,
      campusId: academicClass.campusId,
      academicYearId: academicClass.academicYearId,
      academicClassId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      date,
      attendanceMode: AttendanceMode.DAILY,
      takenBy: teacherId,
      status: targetStatus,
      isFinalized: targetStatus === AttendanceLifecycleStatus.SUBMITTED || targetStatus === AttendanceLifecycleStatus.APPROVED,
      records: formattedRecords,
    });

    return this.mapToDto(newDoc, counts);
  }

  /**
   * Mark Period-Wise Attendance linked to Phase 9 Timetable
   */
  async markPeriodAttendance(
    context: TenantContext,
    user: AuthUserContext,
    input: MarkPeriodAttendanceInput
  ): Promise<IStudentAttendance> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const academicClassId = new Types.ObjectId(input.academicClassId);
    const periodId = new Types.ObjectId(input.periodId);
    const date = this.normalizeDate(input.date);

    // 1. Validate Academic Class
    const academicClass = await AcademicClass.findOne({
      _id: academicClassId,
      tenantId,
      isDeleted: false,
    });
    if (!academicClass) {
      throw new NotFoundError('Academic class not found');
    }

    // 2. Validate Period & Instructional Type
    const period = await Period.findOne({
      _id: periodId,
      tenantId,
      isDeleted: false,
    });
    if (!period) {
      throw new NotFoundError('Period not found');
    }
    if (period.type === PeriodType.BREAK || period.type === PeriodType.LUNCH) {
      throw new BadRequestError('Cannot record student attendance for break or lunch periods.');
    }

    // 3. Validate Working Day
    const nonWorkingCheck = await holidayService.checkNonWorkingDay(
      tenantId,
      date,
      academicClass.campusId,
      academicClass.academicYearId
    );
    if (nonWorkingCheck.isNonWorking && !input.overrideNonWorkingDay) {
      throw new BadRequestError(
        `Cannot mark attendance: ${date.toISOString().split('T')[0]} is a ${nonWorkingCheck.reason}. Use override flag if authorized.`
      );
    }

    // 4. Timetable Integration Validation
    // Map date to dayOfWeek (1=Monday ... 7=Sunday)
    const jsDay = date.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    let timetableEntry: any;
    if (input.timetableEntryId) {
      timetableEntry = await TimetableEntry.findOne({
        _id: input.timetableEntryId,
        tenantId,
        isDeleted: false,
      });
    } else {
      // Look up entry in active master timetable for this class, period, and day
      const activeTimetable = await Timetable.findOne({
        tenantId,
        campusId: academicClass.campusId,
        academicYearId: academicClass.academicYearId,
        isCurrent: true,
        isDeleted: false,
      });

      if (activeTimetable) {
        timetableEntry = await TimetableEntry.findOne({
          tenantId,
          timetableId: activeTimetable._id,
          academicClassId,
          periodId,
          dayOfWeek,
          isDeleted: false,
        });
      }
    }

    let takenByTeacherId = new Types.ObjectId(user.userId);
    if (timetableEntry) {
      takenByTeacherId = await attendancePolicy.authorizePeriodMarking(user, timetableEntry);
    } else {
      // Leadership fallback if no formal timetable slot exists
      takenByTeacherId = await attendancePolicy.authorizeDailyMarking(user, academicClassId);
    }

    // 5. Validate Student Eligibility
    const activeEnrollments = await StudentEnrollment.find({
      tenantId,
      academicYearId: academicClass.academicYearId,
      $or: [
        { academicClassId },
        { classId: academicClass.classId, sectionId: academicClass.sectionId },
      ],
      status: 'ENROLLED',
    });

    const eligibleStudentIds = new Set(activeEnrollments.map((e) => e.studentId.toString()));

    for (const rec of input.records) {
      if (!eligibleStudentIds.has(rec.studentId)) {
        throw new BadRequestError(`Student ${rec.studentId} is not enrolled in this class.`);
      }
    }

    const formattedRecords: any[] = input.records.map((r) => ({
      studentId: new Types.ObjectId(r.studentId),
      status: r.status,
      remarks: r.remarks,
      arrivalTimestamp: r.arrivalTimestamp ? new Date(r.arrivalTimestamp) : undefined,
    }));

    const counts = this.computeCounts(formattedRecords);

    // 6. Check existing period attendance
    const existing = await StudentAttendance.findOne({
      tenantId,
      academicYearId: academicClass.academicYearId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      date,
      attendanceMode: AttendanceMode.PERIOD,
      periodId,
    });

    const targetStatus = input.status || AttendanceLifecycleStatus.SUBMITTED;

    if (existing) {
      if (existing.status === AttendanceLifecycleStatus.LOCKED) {
        throw new BadRequestError('Attendance register is locked against modifications.');
      }
      existing.records = formattedRecords;
      existing.status = targetStatus;
      existing.takenBy = takenByTeacherId;
      existing.isFinalized = targetStatus === AttendanceLifecycleStatus.SUBMITTED || targetStatus === AttendanceLifecycleStatus.APPROVED;
      await existing.save();
      return this.mapToDto(existing, counts);
    }

    // 7. Atomic Insert
    const newDoc = await StudentAttendance.create({
      tenantId,
      schoolId: academicClass.schoolId,
      campusId: academicClass.campusId,
      academicYearId: academicClass.academicYearId,
      academicClassId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      date,
      attendanceMode: AttendanceMode.PERIOD,
      periodId,
      timetableEntryId: timetableEntry?._id,
      subjectId: input.subjectId ? new Types.ObjectId(input.subjectId) : timetableEntry?.subjectId,
      takenBy: takenByTeacherId,
      status: targetStatus,
      isFinalized: targetStatus === AttendanceLifecycleStatus.SUBMITTED || targetStatus === AttendanceLifecycleStatus.APPROVED,
      records: formattedRecords,
    });

    return this.mapToDto(newDoc, counts);
  }

  /**
   * Retrieve an attendance register sheet for a class and date, initializing defaults if unrecorded
   */
  async getAttendanceSheet(
    context: TenantContext,
    academicClassId: string,
    dateStr: string,
    periodId?: string
  ): Promise<{
    session?: IStudentAttendance;
    academicClass: any;
    enrolledStudents: any[];
    isNonWorkingDay: boolean;
    nonWorkingReason?: string;
  }> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const aClassId = new Types.ObjectId(academicClassId);
    const date = this.normalizeDate(dateStr);

    const academicClass = await AcademicClass.findOne({
      _id: aClassId,
      tenantId,
      isDeleted: false,
    })
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('classTeacherId', 'teacherCode');

    if (!academicClass) {
      throw new NotFoundError('Academic class not found');
    }

    // Check non-working day
    const nonWorkingCheck = await holidayService.checkNonWorkingDay(
      tenantId,
      date,
      academicClass.campusId,
      academicClass.academicYearId
    );

    // Find enrolled students
    const enrollments = await StudentEnrollment.find({
      tenantId,
      academicYearId: academicClass.academicYearId,
      $or: [
        { academicClassId: aClassId },
        { classId: academicClass.classId, sectionId: academicClass.sectionId },
      ],
      status: 'ENROLLED',
    })
      .populate('studentId', 'personalDetails admissionNumber studentId')
      .sort({ rollNumber: 1 });

    const enrolledStudents = enrollments
      .filter((e) => e.studentId != null)
      .map((e: any) => ({
        id: e.studentId._id.toString(),
        name: e.studentId.personalDetails
          ? `${e.studentId.personalDetails.firstName} ${e.studentId.personalDetails.lastName}`.trim()
          : 'Student',
        rollNumber: e.rollNumber || e.studentId.rollNumber,
        admissionNumber: e.studentId.admissionNumber || e.studentId.studentId,
      }));

    // Find existing attendance
    const filter: any = {
      tenantId,
      academicYearId: academicClass.academicYearId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      date,
      attendanceMode: periodId ? AttendanceMode.PERIOD : AttendanceMode.DAILY,
    };
    if (periodId) {
      filter.periodId = new Types.ObjectId(periodId);
    }

    const sessionDoc = await StudentAttendance.findOne(filter);
    const session = sessionDoc ? this.mapToDto(sessionDoc) : undefined;

    return {
      session,
      academicClass: {
        id: academicClass._id.toString(),
        className: (academicClass.classId as any)?.name || 'Class',
        sectionName: (academicClass.sectionId as any)?.name || 'Section',
        campusId: academicClass.campusId.toString(),
        academicYearId: academicClass.academicYearId.toString(),
      },
      enrolledStudents,
      isNonWorkingDay: nonWorkingCheck.isNonWorking,
      nonWorkingReason: nonWorkingCheck.reason,
    };
  }

  /**
   * Submit an attendance sheet (moves DRAFT -> SUBMITTED)
   */
  async submitAttendance(
    context: TenantContext,
    user: AuthUserContext,
    attendanceId: string
  ): Promise<IStudentAttendance> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const doc = await StudentAttendance.findOne({ _id: attendanceId, tenantId });
    if (!doc) {
      throw new NotFoundError('Attendance record not found');
    }

    if (doc.status === AttendanceLifecycleStatus.LOCKED) {
      throw new BadRequestError('Attendance register is locked.');
    }

    doc.status = AttendanceLifecycleStatus.SUBMITTED;
    doc.isFinalized = true;
    await doc.save();
    return this.mapToDto(doc);
  }

  /**
   * Approve an attendance sheet (moves SUBMITTED -> APPROVED)
   */
  async approveAttendance(
    context: TenantContext,
    user: AuthUserContext,
    attendanceId: string
  ): Promise<IStudentAttendance> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    if (!isLeadership) {
      throw new AuthorizationError('Only school leadership can approve attendance registers.');
    }

    const tenantId = new Types.ObjectId(context.tenantId);
    const doc = await StudentAttendance.findOne({ _id: attendanceId, tenantId });
    if (!doc) {
      throw new NotFoundError('Attendance record not found');
    }

    doc.status = AttendanceLifecycleStatus.APPROVED;
    doc.approvedBy = new Types.ObjectId(user.userId);
    doc.approvedAt = new Date();
    doc.isFinalized = true;
    await doc.save();
    return this.mapToDto(doc);
  }

  /**
   * Lock an attendance register from ordinary edits
   */
  async lockAttendance(
    context: TenantContext,
    user: AuthUserContext,
    attendanceId: string
  ): Promise<IStudentAttendance> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    if (!isLeadership) {
      throw new AuthorizationError('Only school leadership can lock attendance registers.');
    }

    const tenantId = new Types.ObjectId(context.tenantId);
    const doc = await StudentAttendance.findOne({ _id: attendanceId, tenantId });
    if (!doc) {
      throw new NotFoundError('Attendance record not found');
    }

    doc.status = AttendanceLifecycleStatus.LOCKED;
    doc.lockedBy = new Types.ObjectId(user.userId);
    doc.lockedAt = new Date();
    await doc.save();
    return this.mapToDto(doc);
  }

  /**
   * Request a correction on a student's attendance record
   */
  async requestCorrection(
    context: TenantContext,
    user: AuthUserContext,
    input: RequestCorrectionInput
  ): Promise<IAttendanceCorrection> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const attendanceId = new Types.ObjectId(input.attendanceId);
    const studentId = new Types.ObjectId(input.studentId);

    const attendance = await StudentAttendance.findOne({ _id: attendanceId, tenantId });
    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    const studentRecord = attendance.records.find((r) => r.studentId.toString() === studentId.toString());
    if (!studentRecord) {
      throw new NotFoundError('Student attendance entry not found in this register');
    }

    const oldStatus = studentRecord.status;
    if (oldStatus === input.newStatus) {
      throw new BadRequestError('New status must be different from current status');
    }

    // Check if school allows direct correction by authorized staff
    const school = await School.findOne({ tenantId, isDeleted: false });
    const allowDirectCorrection = school?.settings?.attendance?.allowDirectCorrection ?? true;

    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    const shouldAutoApply = allowDirectCorrection && isLeadership;

    const correction = await AttendanceCorrection.create({
      tenantId,
      schoolId: attendance.schoolId,
      campusId: attendance.campusId,
      academicYearId: attendance.academicYearId,
      attendanceId,
      studentId,
      oldStatus,
      newStatus: input.newStatus,
      reason: input.reason,
      requestedBy: new Types.ObjectId(user.userId),
      status: shouldAutoApply ? CorrectionStatus.APPROVED : CorrectionStatus.PENDING,
      reviewedBy: shouldAutoApply ? new Types.ObjectId(user.userId) : undefined,
      reviewedAt: shouldAutoApply ? new Date() : undefined,
      reviewRemarks: shouldAutoApply ? 'Direct correction applied by authorized staff.' : undefined,
    });

    if (shouldAutoApply) {
      studentRecord.originalStatus = studentRecord.originalStatus || oldStatus;
      studentRecord.status = input.newStatus;
      studentRecord.isCorrected = true;
      await attendance.save();
    }

    return this.mapCorrectionDto(correction);
  }

  /**
   * Process a correction request (Approve or Reject)
   */
  async processCorrection(
    context: TenantContext,
    user: AuthUserContext,
    correctionId: string,
    input: ReviewCorrectionInput
  ): Promise<IAttendanceCorrection> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    if (!isLeadership) {
      throw new AuthorizationError('Only school leadership can review attendance corrections.');
    }

    const tenantId = new Types.ObjectId(context.tenantId);
    const correction = await AttendanceCorrection.findOne({ _id: correctionId, tenantId });
    if (!correction) {
      throw new NotFoundError('Correction request not found');
    }

    if (correction.status !== CorrectionStatus.PENDING) {
      throw new BadRequestError(`Correction request is already ${correction.status.toLowerCase()}`);
    }

    correction.status = input.status;
    correction.reviewedBy = new Types.ObjectId(user.userId);
    correction.reviewedAt = new Date();
    correction.reviewRemarks = input.reviewRemarks;
    await correction.save();

    if (input.status === CorrectionStatus.APPROVED) {
      const attendance = await StudentAttendance.findOne({
        _id: correction.attendanceId,
        tenantId,
      });

      if (attendance) {
        const studentRecord = attendance.records.find(
          (r) => r.studentId.toString() === correction.studentId.toString()
        );
        if (studentRecord) {
          studentRecord.originalStatus = studentRecord.originalStatus || studentRecord.status;
          studentRecord.status = correction.newStatus;
          studentRecord.isCorrected = true;
          await attendance.save();
        }
      }
    }

    return this.mapCorrectionDto(correction);
  }

  /**
   * List correction requests with filters
   */
  async listCorrections(
    context: TenantContext,
    status?: CorrectionStatus
  ): Promise<IAttendanceCorrection[]> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const filter: any = { tenantId };
    if (status) {
      filter.status = status;
    }

    const docs = await AttendanceCorrection.find(filter)
      .sort({ createdAt: -1 })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber code');

    return docs.map((d) => this.mapCorrectionDto(d));
  }

  /**
   * Query Attendance Records with filtering & pagination
   */
  async queryAttendance(
    context: TenantContext,
    filters: AttendanceQueryFilters
  ): Promise<{ data: IStudentAttendance[]; total: number; page: number; limit: number }> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const query: any = { tenantId };

    if (filters.campusId) query.campusId = new Types.ObjectId(filters.campusId);
    if (filters.academicYearId) query.academicYearId = new Types.ObjectId(filters.academicYearId);
    if (filters.academicClassId) query.academicClassId = new Types.ObjectId(filters.academicClassId);
    if (filters.classId) query.classId = new Types.ObjectId(filters.classId);
    if (filters.sectionId) query.sectionId = new Types.ObjectId(filters.sectionId);
    if (filters.periodId) query.periodId = new Types.ObjectId(filters.periodId);
    if (filters.attendanceMode) query.attendanceMode = filters.attendanceMode;
    if (filters.status) query.status = filters.status;

    if (filters.date) {
      query.date = this.normalizeDate(filters.date);
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = this.normalizeDate(filters.startDate);
      if (filters.endDate) query.date.$lte = this.normalizeDate(filters.endDate);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      StudentAttendance.find(query).sort({ date: -1 }).skip(skip).limit(limit),
      StudentAttendance.countDocuments(query),
    ]);

    return {
      data: docs.map((d) => this.mapToDto(d)),
      total,
      page,
      limit,
    };
  }

  /**
   * Compute Student Attendance Summary & Percentage:
   * Attendance % = ((Present + Late + 0.5 * HalfDay) / TotalWorkingDays) * 100
   */
  async getStudentSummary(
    context: TenantContext,
    user: AuthUserContext,
    studentId: string,
    academicYearId: string,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<StudentAttendanceSummaryDto> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const sId = new Types.ObjectId(studentId);
    const aYearId = new Types.ObjectId(academicYearId);

    // Enforce student & parent scope
    await attendancePolicy.authorizeStudentAccess(user, sId);

    const query: any = {
      tenantId,
      academicYearId: aYearId,
      attendanceMode: AttendanceMode.DAILY, // Standard daily attendance calculation
      'records.studentId': sId,
    };

    if (startDateStr || endDateStr) {
      query.date = {};
      if (startDateStr) query.date.$gte = this.normalizeDate(startDateStr);
      if (endDateStr) query.date.$lte = this.normalizeDate(endDateStr);
    }

    const sessions = await StudentAttendance.find(query);

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let excusedDays = 0;

    for (const session of sessions) {
      const rec = session.records.find((r) => r.studentId.toString() === sId.toString());
      if (!rec) continue;

      switch (rec.status) {
        case AttendanceStatus.PRESENT:
          presentDays++;
          break;
        case AttendanceStatus.ABSENT:
          absentDays++;
          break;
        case AttendanceStatus.LATE:
          lateDays++;
          break;
        case AttendanceStatus.HALF_DAY:
          halfDays++;
          break;
        case AttendanceStatus.EXCUSED:
          excusedDays++;
          break;
      }
    }

    const totalWorkingDays = presentDays + absentDays + lateDays + halfDays + excusedDays;
    const presentEquivalentDays = presentDays + lateDays + halfDays * 0.5;
    const attendancePercentage =
      totalWorkingDays > 0 ? Number(((presentEquivalentDays / totalWorkingDays) * 100).toFixed(2)) : 100;

    const studentDoc = await Student.findOne({ _id: sId, tenantId });
    const studentName = studentDoc?.personalDetails
      ? `${studentDoc.personalDetails.firstName} ${studentDoc.personalDetails.lastName}`.trim()
      : undefined;
    const studentCode = studentDoc?.admissionNumber || studentDoc?.studentId;

    return {
      studentId,
      studentName,
      studentCode,
      totalWorkingDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      excusedDays,
      presentEquivalentDays,
      attendancePercentage,
    };
  }

  /**
   * Compute Class Attendance Summary for a specific date
   */
  async getClassSummary(
    context: TenantContext,
    academicClassId: string,
    dateStr: string
  ): Promise<ClassAttendanceSummaryDto> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const aClassId = new Types.ObjectId(academicClassId);
    const date = this.normalizeDate(dateStr);

    const academicClass = await AcademicClass.findOne({ _id: aClassId, tenantId, isDeleted: false })
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    if (!academicClass) {
      throw new NotFoundError('Academic class not found');
    }

    const enrollmentCount = await StudentEnrollment.countDocuments({
      tenantId,
      academicYearId: academicClass.academicYearId,
      $or: [
        { academicClassId: aClassId },
        { classId: academicClass.classId, sectionId: academicClass.sectionId },
      ],
      status: 'ENROLLED',
    });

    const session = await StudentAttendance.findOne({
      tenantId,
      academicYearId: academicClass.academicYearId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      date,
      attendanceMode: AttendanceMode.DAILY,
    });

    if (!session) {
      return {
        academicClassId,
        className: (academicClass.classId as any)?.name || '',
        sectionName: (academicClass.sectionId as any)?.name || '',
        date: dateStr,
        totalEnrolled: enrollmentCount,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        excusedCount: 0,
        attendancePercentage: 0,
      };
    }

    const counts = this.computeCounts(session.records);
    const presentEquivalent = counts.presentCount + counts.lateCount + counts.halfDayCount * 0.5;
    const percentage =
      counts.totalStudents > 0
        ? Number(((presentEquivalent / counts.totalStudents) * 100).toFixed(2))
        : 0;

    return {
      academicClassId,
      className: (academicClass.classId as any)?.name || '',
      sectionName: (academicClass.sectionId as any)?.name || '',
      date: dateStr,
      totalEnrolled: enrollmentCount,
      ...counts,
      attendancePercentage: percentage,
    };
  }

  /**
   * Monthly Attendance 2D Matrix View (Days of Month x Enrolled Students)
   */
  async getMonthlyMatrix(
    context: TenantContext,
    academicClassId: string,
    year: number,
    month: number // 1-12
  ): Promise<MonthlyAttendanceMatrixDto> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const aClassId = new Types.ObjectId(academicClassId);

    const academicClass = await AcademicClass.findOne({ _id: aClassId, tenantId, isDeleted: false })
      .populate('classId', 'name')
      .populate('sectionId', 'name');
    if (!academicClass) {
      throw new NotFoundError('Academic class not found');
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    // Fetch all attendance sheets for this class in this month
    const sessions = await StudentAttendance.find({
      tenantId,
      academicYearId: academicClass.academicYearId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      date: { $gte: startDate, $lte: endDate },
      attendanceMode: AttendanceMode.DAILY,
    });

    // Map sessions by day of month (1 to daysInMonth)
    const sessionsByDay: Record<number, any> = {};
    for (const s of sessions) {
      const dayNum = s.date.getUTCDate();
      sessionsByDay[dayNum] = s;
    }

    // Fetch all active enrolled students
    const enrollments = await StudentEnrollment.find({
      tenantId,
      academicYearId: academicClass.academicYearId,
      $or: [
        { academicClassId: aClassId },
        { classId: academicClass.classId, sectionId: academicClass.sectionId },
      ],
      status: 'ENROLLED',
    })
      .populate('studentId', 'personalDetails admissionNumber studentId')
      .sort({ rollNumber: 1 });

    let workingDaysCount = 0;
    const dayStatusMeta: Record<number, { isWorking: boolean; isHoliday: boolean; reason?: string }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const testDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const check = await holidayService.checkNonWorkingDay(
        tenantId,
        testDate,
        academicClass.campusId,
        academicClass.academicYearId
      );
      dayStatusMeta[day] = {
        isWorking: !check.isNonWorking,
        isHoliday: check.type === 'HOLIDAY',
        reason: check.reason,
      };
      if (!check.isNonWorking) {
        workingDaysCount++;
      }
    }

    const students = enrollments.map((enr: any) => {
      const sId = enr.studentId._id.toString();
      const personalDetails = enr.studentId.personalDetails;
      const sName = personalDetails
        ? `${personalDetails.firstName} ${personalDetails.lastName}`.trim()
        : 'Student';
      const sCode = enr.studentId.admissionNumber || enr.studentId.studentId;

      const days: Record<number, any> = {};
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let halfDays = 0;
      let excusedDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const session = sessionsByDay[day];
        if (session) {
          const rec = session.records.find((r: any) => r.studentId.toString() === sId);
          if (rec) {
            days[day] = rec.status;
            if (rec.status === AttendanceStatus.PRESENT) presentDays++;
            else if (rec.status === AttendanceStatus.ABSENT) absentDays++;
            else if (rec.status === AttendanceStatus.LATE) lateDays++;
            else if (rec.status === AttendanceStatus.HALF_DAY) halfDays++;
            else if (rec.status === AttendanceStatus.EXCUSED) excusedDays++;
            continue;
          }
        }

        // If no record, reflect calendar status
        if (dayStatusMeta[day].isHoliday) {
          days[day] = 'HOLIDAY';
        } else if (!dayStatusMeta[day].isWorking) {
          days[day] = 'WEEKEND';
        } else {
          days[day] = 'NOT_MARKED';
        }
      }

      const totalMarked = presentDays + absentDays + lateDays + halfDays + excusedDays;
      const presentEquiv = presentDays + lateDays + halfDays * 0.5;
      const pct =
        totalMarked > 0 ? Number(((presentEquiv / totalMarked) * 100).toFixed(2)) : 100;

      return {
        studentId: sId,
        studentName: sName,
        studentCode: enr.studentId.code,
        rollNumber: enr.rollNumber || enr.studentId.rollNumber,
        days,
        summary: {
          studentId: sId,
          studentName: sName,
          totalWorkingDays: totalMarked,
          presentDays,
          absentDays,
          lateDays,
          halfDays,
          excusedDays,
          presentEquivalentDays: presentEquiv,
          attendancePercentage: pct,
        },
      };
    });

    return {
      academicClassId,
      className: (academicClass.classId as any)?.name || '',
      sectionName: (academicClass.sectionId as any)?.name || '',
      year,
      month,
      daysInMonth,
      workingDaysCount,
      students,
    };
  }

  /**
   * Low Attendance Alert Report
   */
  async getLowAttendanceReport(
    context: TenantContext,
    academicYearId: string,
    thresholdPct: number = 75,
    campusId?: string
  ): Promise<LowAttendanceReportDto> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const aYearId = new Types.ObjectId(academicYearId);

    const classFilter: any = {
      tenantId,
      academicYearId: aYearId,
      isDeleted: false,
    };
    if (campusId) {
      classFilter.campusId = new Types.ObjectId(campusId);
    }

    const academicClasses = await AcademicClass.find(classFilter)
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    const lowAttendanceStudents: any[] = [];
    let totalEvaluated = 0;

    for (const aClass of academicClasses) {
      const enrollments = await StudentEnrollment.find({
        tenantId,
        academicYearId: aYearId,
        $or: [
          { academicClassId: aClass._id },
          { classId: aClass.classId, sectionId: aClass.sectionId },
        ],
        status: 'ENROLLED',
      }).populate('studentId', 'personalDetails admissionNumber studentId');

      for (const enr of enrollments) {
        if (!enr.studentId) continue;
        totalEvaluated++;

        const sId = (enr.studentId as any)._id;
        const sessions = await StudentAttendance.find({
          tenantId,
          academicYearId: aYearId,
          classId: aClass.classId,
          sectionId: aClass.sectionId,
          attendanceMode: AttendanceMode.DAILY,
          'records.studentId': sId,
        });

        let present = 0;
        let absent = 0;
        let late = 0;
        let halfDay = 0;
        let excused = 0;

        for (const sess of sessions) {
          const r = sess.records.find((rec) => rec.studentId.toString() === sId.toString());
          if (!r) continue;
          if (r.status === AttendanceStatus.PRESENT) present++;
          else if (r.status === AttendanceStatus.ABSENT) absent++;
          else if (r.status === AttendanceStatus.LATE) late++;
          else if (r.status === AttendanceStatus.HALF_DAY) halfDay++;
          else if (r.status === AttendanceStatus.EXCUSED) excused++;
        }

        const totalMarked = present + absent + late + halfDay + excused;
        if (totalMarked === 0) continue;

        const presentEquiv = present + late + halfDay * 0.5;
        const pct = Number(((presentEquiv / totalMarked) * 100).toFixed(2));

        if (pct < thresholdPct) {
          const personalDetails = (enr.studentId as any).personalDetails;
          const sName = personalDetails
            ? `${personalDetails.firstName} ${personalDetails.lastName}`.trim()
            : 'Student';
          const sCode = (enr.studentId as any).admissionNumber || (enr.studentId as any).studentId;

          lowAttendanceStudents.push({
            studentId: sId.toString(),
            studentName: sName,
            studentCode: sCode,
            rollNumber: enr.rollNumber,
            className: (aClass.classId as any)?.name || '',
            sectionName: (aClass.sectionId as any)?.name || '',
            academicClassId: aClass._id.toString(),
            totalWorkingDays: totalMarked,
            presentDays: present,
            absentDays: absent,
            lateDays: late,
            halfDays: halfDay,
            excusedDays: excused,
            presentEquivalentDays: presentEquiv,
            attendancePercentage: pct,
          });
        }
      }
    }

    return {
      thresholdPercentage: thresholdPct,
      academicYearId,
      totalStudentsEvaluated: totalEvaluated,
      lowAttendanceCount: lowAttendanceStudents.length,
      students: lowAttendanceStudents,
    };
  }

  /**
   * Daily Campus-Wide Attendance Status Summary
   */
  async getDailyCampusReport(
    context: TenantContext,
    dateStr: string,
    campusId?: string
  ): Promise<DailyCampusAttendanceSummaryDto> {
    const tenantId = new Types.ObjectId(context.tenantId);
    const date = this.normalizeDate(dateStr);

    const classFilter: any = { tenantId, isDeleted: false };
    if (campusId) {
      classFilter.campusId = new Types.ObjectId(campusId);
    }

    const academicClasses = await AcademicClass.find(classFilter)
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    const summaries: ClassAttendanceSummaryDto[] = [];
    let totalEnrolledStudents = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalHalfDay = 0;
    let markedClasses = 0;

    for (const aClass of academicClasses) {
      const summary = await this.getClassSummary(context, aClass._id.toString(), dateStr);
      summaries.push(summary);
      totalEnrolledStudents += summary.totalEnrolled;
      totalPresent += summary.presentCount;
      totalAbsent += summary.absentCount;
      totalLate += summary.lateCount;
      totalHalfDay += summary.halfDayCount;
      if (summary.presentCount + summary.absentCount > 0) {
        markedClasses++;
      }
    }

    const presentEquiv = totalPresent + totalLate + totalHalfDay * 0.5;
    const totalMarked = totalPresent + totalAbsent + totalLate + totalHalfDay;
    const overallPercentage =
      totalMarked > 0 ? Number(((presentEquiv / totalMarked) * 100).toFixed(2)) : 0;

    return {
      date: dateStr,
      campusId,
      totalClasses: academicClasses.length,
      markedClasses,
      pendingClasses: academicClasses.length - markedClasses,
      totalEnrolledStudents,
      totalPresent,
      totalAbsent,
      totalLate,
      totalHalfDay,
      overallPercentage,
      classes: summaries,
    };
  }

  private mapToDto(doc: any, precomputedCounts?: any): IStudentAttendance {
    const counts = precomputedCounts || this.computeCounts(doc.records || []);

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: doc.campusId?.toString(),
      academicYearId: doc.academicYearId.toString(),
      academicClassId: doc.academicClassId?.toString(),
      classId: doc.classId.toString(),
      sectionId: doc.sectionId.toString(),
      date: doc.date,
      attendanceMode: doc.attendanceMode,
      periodId: doc.periodId?.toString(),
      timetableEntryId: doc.timetableEntryId?.toString(),
      subjectId: doc.subjectId?.toString(),
      takenBy: doc.takenBy.toString(),
      status: doc.status,
      isFinalized: doc.isFinalized,
      approvedBy: doc.approvedBy?.toString(),
      approvedAt: doc.approvedAt,
      lockedBy: doc.lockedBy?.toString(),
      lockedAt: doc.lockedAt,
      records: (doc.records || []).map((r: any) => ({
        studentId: r.studentId.toString(),
        status: r.status,
        remarks: r.remarks,
        arrivalTimestamp: r.arrivalTimestamp,
        isExcused: r.isExcused,
        originalStatus: r.originalStatus,
        isCorrected: r.isCorrected,
      })),
      ...counts,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapCorrectionDto(doc: any): IAttendanceCorrection {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: doc.campusId?.toString(),
      academicYearId: doc.academicYearId?.toString(),
      attendanceId: (doc.attendanceId?._id || doc.attendanceId)?.toString(),
      studentId: (doc.studentId?._id || doc.studentId)?.toString(),
      oldStatus: doc.oldStatus,
      newStatus: doc.newStatus,
      reason: doc.reason,
      requestedBy: (doc.requestedBy?._id || doc.requestedBy)?.toString(),
      reviewedBy: doc.reviewedBy ? (doc.reviewedBy?._id || doc.reviewedBy)?.toString() : undefined,
      status: doc.status,
      reviewedAt: doc.reviewedAt,
      reviewRemarks: doc.reviewRemarks,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export const attendanceService = new AttendanceService();
