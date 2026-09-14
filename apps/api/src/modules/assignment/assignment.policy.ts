import { Types } from 'mongoose';
import { BadRequestError, AuthorizationError, UserType, AssignmentStatus, AssignmentTargetType } from '@edusphere/common';
import {
  AcademicClass,
  Subject,
  Teacher,
  Student,
  Parent,
  StudentParentRelation,
  StudentEnrollment,
  TeacherSubjectAssignment,
  Assignment,
  AssignmentSubmission,
  IAssignmentDoc,
} from '@edusphere/database';
import { AuthUserContext } from '../attendance/attendance.policy.js';
export type { AuthUserContext };

export class AssignmentPolicy {
  /**
   * Enforces whether the user is authorized to create/manage assignments for an academic class and subject.
   * Returns the resolved Teacher document ID.
   */
  async authorizeTeacherAssignment(
    user: AuthUserContext,
    academicClassId: string | Types.ObjectId,
    subjectId: string | Types.ObjectId
  ): Promise<Types.ObjectId> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    const aClassId = typeof academicClassId === 'string' ? new Types.ObjectId(academicClassId) : academicClassId;
    const sId = typeof subjectId === 'string' ? new Types.ObjectId(subjectId) : subjectId;

    const academicClass = await AcademicClass.findOne({
      _id: aClassId,
      tenantId: new Types.ObjectId(user.tenantId),
      isDeleted: false,
    });

    if (!academicClass) {
      throw new AuthorizationError('Academic class not found or unauthorized.');
    }

    const subject = await Subject.findOne({
      _id: sId,
      tenantId: new Types.ObjectId(user.tenantId),
      isDeleted: false,
    });

    if (!subject) {
      throw new AuthorizationError('Subject not found or unauthorized.');
    }

    // Leadership can create/manage assignments on behalf of any teacher
    if (isLeadership) {
      if (academicClass.classTeacherId) {
        return academicClass.classTeacherId;
      }
      const teacher = await Teacher.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });
      return teacher?._id || new Types.ObjectId(user.userId);
    }

    // For TEACHER role: check teacher profile and assignment to this class and subject
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

    // Check if assigned to this specific subject in this class
    const hasSubjectAssignment = await TeacherSubjectAssignment.findOne({
      tenantId: new Types.ObjectId(user.tenantId),
      teacherId: teacher._id,
      subjectId: sId,
      $or: [
        { academicClassId: aClassId },
        { classId: academicClass.classId, sectionId: academicClass.sectionId },
      ],
      status: 'ACTIVE',
    });

    if (!isClassTeacher && !hasSubjectAssignment) {
      throw new AuthorizationError(
        'You are not authorized to create or manage assignments for this class and subject.'
      );
    }

    return teacher._id;
  }

  /**
   * Enforces whether the user is authorized to view a specific assignment.
   */
  async authorizeAssignmentAccess(
    user: AuthUserContext,
    assignment: IAssignmentDoc
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

    // Students can only view PUBLISHED assignments
    if (user.userType === UserType.STUDENT) {
      if (assignment.status === AssignmentStatus.DRAFT) {
        throw new AuthorizationError('Students cannot access unpublished draft assignments.');
      }

      const student = await Student.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });

      if (!student) {
        throw new AuthorizationError('Student profile not found.');
      }

      // Check active enrollment in the target academic class
      const enrollment = await StudentEnrollment.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        studentId: student._id,
        academicClassId: assignment.academicClassId,
        academicYearId: assignment.academicYearId,
        status: 'ENROLLED',
      });

      if (!enrollment) {
        throw new AuthorizationError('You are not enrolled in the class for this assignment.');
      }

      // If targeted to specific students, verify inclusion
      if (
        assignment.targetType === AssignmentTargetType.SPECIFIC_STUDENTS &&
        assignment.targetStudentIds &&
        assignment.targetStudentIds.length > 0
      ) {
        const isTargeted = assignment.targetStudentIds.some(
          (id) => id.toString() === student._id.toString()
        );
        if (!isTargeted) {
          throw new AuthorizationError('This assignment is not assigned to you.');
        }
      }

      return;
    }

    // Parents can only view published assignments for their enrolled children
    if (user.userType === UserType.PARENT) {
      if (assignment.status === AssignmentStatus.DRAFT) {
        throw new AuthorizationError('Parents cannot access draft assignments.');
      }

      const parent = await Parent.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });

      if (!parent) {
        throw new AuthorizationError('Parent profile not found.');
      }

      // Find children linked to parent
      const relations = await StudentParentRelation.find({
        tenantId: new Types.ObjectId(user.tenantId),
        parentId: parent._id,
      });

      const childStudentIds = relations.map((r) => r.studentId);
      if (childStudentIds.length === 0) {
        throw new AuthorizationError('No registered children found for this parent.');
      }

      // Check if any child is enrolled in this assignment's class
      const childEnrollment = await StudentEnrollment.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        studentId: { $in: childStudentIds },
        academicClassId: assignment.academicClassId,
        academicYearId: assignment.academicYearId,
        status: 'ENROLLED',
      });

      if (!childEnrollment) {
        throw new AuthorizationError('None of your children are enrolled in this class.');
      }

      return;
    }

    throw new AuthorizationError('Unauthorized to access this assignment.');
  }

  /**
   * Enforces whether the student is authorized to submit work for an assignment.
   */
  async authorizeStudentSubmission(
    user: AuthUserContext,
    assignment: IAssignmentDoc
  ): Promise<Types.ObjectId> {
    if (user.userType !== UserType.STUDENT) {
      throw new AuthorizationError('Only enrolled students can submit assignments.');
    }

    if (assignment.status !== AssignmentStatus.PUBLISHED) {
      throw new AuthorizationError('Submissions are only accepted for PUBLISHED assignments.');
    }

    const student = await Student.findOne({
      tenantId: new Types.ObjectId(user.tenantId),
      userId: new Types.ObjectId(user.userId),
      isDeleted: false,
    });

    if (!student) {
      throw new AuthorizationError('Student profile not found.');
    }

    // Check enrollment
    const enrollment = await StudentEnrollment.findOne({
      tenantId: new Types.ObjectId(user.tenantId),
      studentId: student._id,
      academicClassId: assignment.academicClassId,
      academicYearId: assignment.academicYearId,
      status: 'ENROLLED',
    });

    if (!enrollment) {
      throw new AuthorizationError('You are not actively enrolled in this class.');
    }

    // Check specific targeting
    if (
      assignment.targetType === AssignmentTargetType.SPECIFIC_STUDENTS &&
      assignment.targetStudentIds &&
      assignment.targetStudentIds.length > 0
    ) {
      const isTargeted = assignment.targetStudentIds.some(
        (id) => id.toString() === student._id.toString()
      );
      if (!isTargeted) {
        throw new AuthorizationError('This assignment is not assigned to you.');
      }
    }

    // Deadline check
    const now = new Date();
    if (now > new Date(assignment.dueAt) && !assignment.allowLateSubmission) {
      throw new BadRequestError('Submissions are closed. The deadline has passed.');
    }

    return student._id;
  }

  /**
   * Enforces whether the user is authorized to view a specific submission.
   */
  async authorizeSubmissionAccess(
    user: AuthUserContext,
    submissionStudentId: Types.ObjectId | string,
    assignmentId: Types.ObjectId | string
  ): Promise<void> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    if (isLeadership) {
      return;
    }

    const sStudentId = typeof submissionStudentId === 'string' ? new Types.ObjectId(submissionStudentId) : submissionStudentId;
    const aId = typeof assignmentId === 'string' ? new Types.ObjectId(assignmentId) : assignmentId;

    if (user.userType === UserType.TEACHER) {
      const teacher = await Teacher.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });

      if (!teacher) {
        throw new AuthorizationError('Teacher profile not found.');
      }

      const assignment = await Assignment.findOne({
        _id: aId,
        tenantId: new Types.ObjectId(user.tenantId),
        isDeleted: false,
      });

      if (!assignment) {
        throw new AuthorizationError('Assignment not found.');
      }

      // Check teacher assignment to class or subject
      const academicClass = await AcademicClass.findById(assignment.academicClassId);
      const isClassTeacher =
        academicClass?.classTeacherId &&
        academicClass.classTeacherId.toString() === teacher._id.toString();

      const hasSubjectAssignment = await TeacherSubjectAssignment.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        teacherId: teacher._id,
        subjectId: assignment.subjectId,
        $or: [
          { academicClassId: assignment.academicClassId },
          { classId: assignment.classId, sectionId: assignment.sectionId },
        ],
        status: 'ACTIVE',
      });

      if (
        assignment.teacherId.toString() !== teacher._id.toString() &&
        !isClassTeacher &&
        !hasSubjectAssignment
      ) {
        throw new AuthorizationError('You are not authorized to view submissions for this assignment.');
      }

      return;
    }

    // Student can only access their own submission
    if (user.userType === UserType.STUDENT) {
      const student = await Student.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });

      if (!student || student._id.toString() !== sStudentId.toString()) {
        throw new AuthorizationError('You can only access your own submissions.');
      }

      return;
    }

    // Parent can only access their registered children's submissions
    if (user.userType === UserType.PARENT) {
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
        studentId: sStudentId,
      });

      if (!relation) {
        throw new AuthorizationError('You are only authorized to view your registered children.');
      }

      return;
    }

    throw new AuthorizationError('Unauthorized to access this submission.');
  }

  /**
   * Enforces whether the user is authorized to grade/return a submission.
   */
  async authorizeGrading(
    user: AuthUserContext,
    assignment: IAssignmentDoc
  ): Promise<Types.ObjectId> {
    const isLeadership = [
      UserType.SUPER_ADMIN,
      UserType.SCHOOL_ADMIN,
      UserType.PRINCIPAL,
      UserType.VICE_PRINCIPAL,
    ].includes(user.userType as UserType);

    if (isLeadership) {
      const teacher = await Teacher.findOne({
        tenantId: new Types.ObjectId(user.tenantId),
        userId: new Types.ObjectId(user.userId),
        isDeleted: false,
      });
      return teacher?._id || new Types.ObjectId(user.userId);
    }

    if (user.userType !== UserType.TEACHER) {
      throw new AuthorizationError('Only authorized teachers can grade submissions.');
    }

    const teacher = await Teacher.findOne({
      tenantId: new Types.ObjectId(user.tenantId),
      userId: new Types.ObjectId(user.userId),
      isDeleted: false,
    });

    if (!teacher) {
      throw new AuthorizationError('Teacher profile not associated with authenticated user.');
    }

    const academicClass = await AcademicClass.findById(assignment.academicClassId);
    const isClassTeacher =
      academicClass?.classTeacherId &&
      academicClass.classTeacherId.toString() === teacher._id.toString();

    const hasSubjectAssignment = await TeacherSubjectAssignment.findOne({
      tenantId: new Types.ObjectId(user.tenantId),
      teacherId: teacher._id,
      subjectId: assignment.subjectId,
      $or: [
        { academicClassId: assignment.academicClassId },
        { classId: assignment.classId, sectionId: assignment.sectionId },
      ],
      status: 'ACTIVE',
    });

    if (
      assignment.teacherId.toString() !== teacher._id.toString() &&
      !isClassTeacher &&
      !hasSubjectAssignment
    ) {
      throw new AuthorizationError('You are not authorized to grade submissions for this assignment.');
    }

    return teacher._id;
  }
}

export const assignmentPolicy = new AssignmentPolicy();
