import { Request } from 'express';
import { Types } from 'mongoose';
import {
  AcademicClass,
  TeacherSubjectAssignment,
  Student,
  Parent,
  StudentParentRelation,
  Teacher,
} from '@edusphere/database';
import { AuthorizationError, BadRequestError } from '@edusphere/common';

export class ExamPolicy {
  /**
   * Asserts whether an authenticated user has permission to enter or modify marks for a given class and subject.
   */
  public static async assertTeacherMarksEntryScope(
    req: Request,
    academicClassId: string | Types.ObjectId,
    subjectId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const classOid = new Types.ObjectId(academicClassId.toString());
    const subjectOid = new Types.ObjectId(subjectId.toString());

    // Administrators and Principals have institution-wide authority
    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'];
    if (auth.roles?.some((r: any) => elevatedRoles.includes(typeof r === 'string' ? r : r.name))) {
      return;
    }

    // Resolve teacher profile
    const teacherProfile = await Teacher.findOne({
      tenantId,
      userId: new Types.ObjectId(auth.userId),
      isDeleted: false,
    });

    if (!teacherProfile) {
      throw new AuthorizationError('No active teacher profile found for this user.');
    }

    // 1. Check if teacher is assigned to this academic class offering as Class Teacher
    const academicClass = await AcademicClass.findOne({
      _id: classOid,
      tenantId,
      isDeleted: false,
    });

    if (academicClass && academicClass.classTeacherId?.toString() === teacherProfile._id.toString()) {
      return;
    }

    // 2. Check if teacher is assigned to teach this specific subject for this class
    const assignment = await TeacherSubjectAssignment.findOne({
      tenantId,
      teacherId: teacherProfile._id,
      academicClassId: classOid,
      subjectId: subjectOid,
    });

    if (assignment) {
      return;
    }

    throw new AuthorizationError(
      'You are not authorized to enter marks for this class and subject. Only assigned teachers or administrators may record marks.'
    );
  }

  /**
   * Asserts whether a student is accessing strictly their own result record.
   */
  public static async assertStudentResultAccess(
    req: Request,
    targetStudentId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'TEACHER'];
    if (auth.roles?.some((r: any) => elevatedRoles.includes(typeof r === 'string' ? r : r.name))) {
      return;
    }

    const student = await Student.findOne({
      tenantId: new Types.ObjectId(auth.tenantId),
      userId: new Types.ObjectId(auth.userId),
      isDeleted: false,
    });

    if (!student || student._id.toString() !== targetStudentId.toString()) {
      throw new AuthorizationError('You can only view your own examination results.');
    }
  }

  /**
   * Asserts that a parent can only view results of their registered children.
   */
  public static async assertParentChildAccess(
    req: Request,
    targetStudentId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL'];
    if (auth.roles?.some((r: any) => elevatedRoles.includes(typeof r === 'string' ? r : r.name))) {
      return;
    }

    const parent = await Parent.findOne({
      tenantId: new Types.ObjectId(auth.tenantId),
      userId: new Types.ObjectId(auth.userId),
      isDeleted: false,
    });

    if (!parent) {
      throw new AuthorizationError('No active parent profile found for this user.');
    }

    const relation = await StudentParentRelation.findOne({
      tenantId: new Types.ObjectId(auth.tenantId),
      parentId: parent._id,
      studentId: new Types.ObjectId(targetStudentId.toString()),
    });

    if (!relation) {
      throw new AuthorizationError('You are not authorized to view results for this student.');
    }
  }

  /**
   * Asserts exam is in an appropriate state for marks entry.
   */
  public static assertExamStateForMarks(exam: any): void {
    if (exam.status === 'DRAFT') {
      throw new BadRequestError('Cannot enter marks for an examination still in DRAFT status.');
    }
    if (exam.status === 'ARCHIVED') {
      throw new BadRequestError('Cannot enter marks for an ARCHIVED examination.');
    }
  }
}
