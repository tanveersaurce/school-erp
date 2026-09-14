import { Types } from 'mongoose';
import { AuthorizationError, UserType } from '@edusphere/common';
import {
  AcademicClass,
  StudentEnrollment,
  StudentParentRelation,
  Parent,
  Student,
  Teacher,
  TimetableEntry,
} from '@edusphere/database';

export interface AuthUserContext {
  userId: string;
  tenantId: string;
  role?: string;
  userType?: string;
  permissions?: string[];
  campusId?: string;
}

export class AttendancePolicy {
  /**
   * Enforces whether the user is authorized to mark daily attendance for the academic class.
   */
  async authorizeDailyMarking(
    user: AuthUserContext,
    academicClassId: string | Types.ObjectId
  ): Promise<Types.ObjectId> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    const aClassId = typeof academicClassId === 'string' ? new Types.ObjectId(academicClassId) : academicClassId;
    const academicClass = await AcademicClass.findOne({
      _id: aClassId,
      tenantId: new Types.ObjectId(user.tenantId),
      isDeleted: false,
    });

    if (!academicClass) {
      throw new AuthorizationError('Academic class not found or unauthorized.');
    }

    // School leaders can mark attendance on behalf of any teacher
    if (isLeadership) {
      // Return class teacher ID or resolved teacher ID
      if (academicClass.classTeacherId) {
        return academicClass.classTeacherId;
      }
      // Look up any teacher record for the user or leadership fallback
      const teacher = await Teacher.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });
      return teacher?._id || new Types.ObjectId(user.userId);
    }

    // For TEACHER role: check if user is the assigned class teacher or assigned teacher for that class
    const teacher = await Teacher.findOne({
      tenantId: new Types.ObjectId(user.tenantId),
      userId: new Types.ObjectId(user.userId),
      isDeleted: false,
    });

    if (!teacher) {
      throw new AuthorizationError('Teacher profile not associated with authenticated user.');
    }

    const isClassTeacher =
      academicClass.classTeacherId &&
      academicClass.classTeacherId.toString() === teacher._id.toString();

    if (!isClassTeacher) {
      // Check if teacher has any active subject assignment for this academic class
      const { TeacherSubjectAssignment } = await import('@edusphere/database');
      const hasAssignment = await TeacherSubjectAssignment.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        teacherId: teacher._id,
        $or: [
          { academicClassId: aClassId },
          { classId: academicClass.classId, sectionId: academicClass.sectionId },
        ],
        status: 'ACTIVE',
      });

      if (!hasAssignment) {
        throw new AuthorizationError('You are not authorized to mark attendance for this class.');
      }
    }

    return teacher._id;
  }

  /**
   * Enforces whether the user is authorized to mark period attendance for a timetable entry.
   */
  async authorizePeriodMarking(
    user: AuthUserContext,
    timetableEntry: any
  ): Promise<Types.ObjectId> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    if (isLeadership) {
      return timetableEntry.teacherId;
    }

    const teacher = await Teacher.findOne({
      tenantId: new Types.ObjectId(user.tenantId),
      userId: new Types.ObjectId(user.userId),
      isDeleted: false,
    });

    if (!teacher) {
      throw new AuthorizationError('Teacher profile not associated with authenticated user.');
    }

    const isAssignedTeacher =
      timetableEntry.teacherId.toString() === teacher._id.toString();
    const isSubstituteTeacher =
      timetableEntry.substituteTeacherId &&
      timetableEntry.substituteTeacherId.toString() === teacher._id.toString();

    if (!isAssignedTeacher && !isSubstituteTeacher) {
      throw new AuthorizationError(
        'You are not authorized to mark attendance for this timetable period.'
      );
    }

    return teacher._id;
  }

  /**
   * Enforces that student can only view own attendance, or parent can only view enrolled child's attendance.
   */
  async authorizeStudentAccess(
    user: AuthUserContext,
    targetStudentId: string | Types.ObjectId
  ): Promise<void> {
    const isStaffOrAdmin = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
      UserType.TEACHER,
    ].includes(user.userType as UserType);

    if (isStaffOrAdmin) {
      return;
    }

    const sId = typeof targetStudentId === 'string' ? new Types.ObjectId(targetStudentId) : targetStudentId;

    if (user.userType === UserType.STUDENT) {
      const student = await Student.findOne({
        _id: sId,
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });
      if (!student) {
        throw new AuthorizationError('You can only view your own attendance records.');
      }
      return;
    }

    if (user.userType === UserType.PARENT) {
      // Look up student-parent links
      const parent = await Parent.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });

      if (!parent) {
        throw new AuthorizationError('Parent profile not found.');
      }

      const relation = await StudentParentRelation.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        parentId: parent._id,
        studentId: sId,
      });

      if (!relation) {
        throw new AuthorizationError('You are only authorized to view your registered children.');
      }
      return;
    }

    throw new AuthorizationError('Unauthorized to access attendance.');
  }
}

export const attendancePolicy = new AttendancePolicy();
