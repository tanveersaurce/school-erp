import { Types } from 'mongoose';
import { UserType } from '@edusphere/common';
import { AuthContext } from '@edusphere/types';
import {
  Student,
  Parent,
  StudentParentRelation,
  Teacher,
  StudentEnrollment,
  TeacherSubjectAssignment,
  Section,
  AcademicClass,
  Subject,
  FeeInvoice,
} from '@edusphere/database';

export class ResourcePolicy {
  /**
   * Evaluates if the authenticated context is authorized to access a specific student's record.
   *
   * Scopes:
   * 1. SUPER_ADMIN / SCHOOL_ADMIN / PRINCIPAL: Authorized for any student within their tenant.
   * 2. STUDENT: Authorized ONLY if student.userId === auth.userId.
   * 3. PARENT: Authorized ONLY if parent has an active StudentParentRelation to student.
   * 4. TEACHER: Authorized ONLY if teacher is assigned to student's class/section or is class teacher.
   * 5. Cross-tenant: Strictly DENIED (fails immediately).
   */
  async canAccessStudent(auth: AuthContext, targetStudentId: string): Promise<boolean> {
    if (!auth || !auth.tenantId || !auth.userId || !targetStudentId) {
      return false;
    }

    if (!Types.ObjectId.isValid(targetStudentId)) {
      return false;
    }

    // 1. Fetch student in current tenant boundary (Anti-IDOR / Cross-Tenant check)
    const student = await Student.findOne({
      _id: new Types.ObjectId(targetStudentId),
      tenantId: new Types.ObjectId(auth.tenantId),
      isDeleted: false,
    }).lean();

    if (!student) {
      return false; // Not found or cross-tenant attempt
    }

    // 2. Super Admin & School Admin platform/tenant override
    if (
      auth.userType === UserType.SUPER_ADMIN ||
      auth.userType === UserType.SCHOOL_ADMIN ||
      auth.roles?.includes('SUPER_ADMIN') ||
      auth.roles?.includes('SCHOOL_ADMIN') ||
      auth.roles?.includes('PRINCIPAL')
    ) {
      return true;
    }

    // 3. Student Self-Record Scope
    if (auth.userType === UserType.STUDENT) {
      return student.userId ? student.userId.toString() === auth.userId : false;
    }

    // 4. Parent Linked Child Scope
    if (auth.userType === UserType.PARENT) {
      const parentProfile = await Parent.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();

      if (!parentProfile) {
        return false;
      }

      const relation = await StudentParentRelation.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        studentId: student._id,
        parentId: parentProfile._id,
      }).lean();

      return !!relation;
    }

    // 5. Teacher Assigned Class/Section Scope
    if (auth.userType === UserType.TEACHER) {
      const teacherProfile = await Teacher.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();

      if (!teacherProfile) {
        return false;
      }

      // Check student's active enrollment
      const enrollment = await StudentEnrollment.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        studentId: student._id,
        status: 'ENROLLED',
      }).lean();

      if (!enrollment) {
        return false;
      }

      // Check if teacher is assigned to teach any subject in this section
      const subjectAssignment = await TeacherSubjectAssignment.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        teacherId: teacherProfile._id,
        classId: enrollment.classId,
        sectionId: enrollment.sectionId,
      }).lean();

      if (subjectAssignment) {
        return true;
      }

      // Check if teacher is the designated class teacher
      const section = await Section.findOne({
        _id: enrollment.sectionId,
        tenantId: new Types.ObjectId(auth.tenantId),
        classTeacherId: teacherProfile._id,
        isDeleted: false,
      }).lean();

      return !!section;
    }

    // Default Fail-Safe Deny
    return false;
  }

  /**
   * Evaluates if the authenticated context is authorized to access attendance for a given class & section.
   */
  async canAccessAttendance(
    auth: AuthContext,
    classId: string,
    sectionId: string
  ): Promise<boolean> {
    if (!auth || !auth.tenantId || !auth.userId || !classId || !sectionId) {
      return false;
    }

    if (!Types.ObjectId.isValid(classId) || !Types.ObjectId.isValid(sectionId)) {
      return false;
    }

    // Admins and Principals
    if (
      auth.userType === UserType.SUPER_ADMIN ||
      auth.userType === UserType.SCHOOL_ADMIN ||
      auth.roles?.includes('SUPER_ADMIN') ||
      auth.roles?.includes('SCHOOL_ADMIN') ||
      auth.roles?.includes('PRINCIPAL')
    ) {
      return true;
    }

    // Teachers must be assigned to the class & section
    if (auth.userType === UserType.TEACHER) {
      const teacherProfile = await Teacher.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();

      if (!teacherProfile) return false;

      const [assignment, section] = await Promise.all([
        TeacherSubjectAssignment.findOne({
          tenantId: new Types.ObjectId(auth.tenantId),
          teacherId: teacherProfile._id,
          classId: new Types.ObjectId(classId),
          sectionId: new Types.ObjectId(sectionId),
        }).lean(),
        Section.findOne({
          _id: new Types.ObjectId(sectionId),
          tenantId: new Types.ObjectId(auth.tenantId),
          classTeacherId: teacherProfile._id,
          isDeleted: false,
        }).lean(),
      ]);

      return !!(assignment || section);
    }

    return false;
  }

  /**
   * Evaluates if the authenticated context is authorized to access a fee invoice.
   */
  async canAccessFee(auth: AuthContext, invoiceId: string): Promise<boolean> {
    if (!auth || !auth.tenantId || !auth.userId || !invoiceId) {
      return false;
    }

    if (!Types.ObjectId.isValid(invoiceId)) {
      return false;
    }

    const invoice = await FeeInvoice.findOne({
      _id: new Types.ObjectId(invoiceId),
      tenantId: new Types.ObjectId(auth.tenantId),
      isDeleted: false,
    }).lean();

    if (!invoice) {
      return false; // Cross-tenant or not found
    }

    // Admins & Accountants
    if (
      auth.userType === UserType.SUPER_ADMIN ||
      auth.userType === UserType.SCHOOL_ADMIN ||
      auth.roles?.includes('SUPER_ADMIN') ||
      auth.roles?.includes('SCHOOL_ADMIN') ||
      auth.roles?.includes('ACCOUNTANT') ||
      auth.roles?.includes('PRINCIPAL')
    ) {
      return true;
    }

    // Students / Parents can only access invoices for their own / child record
    return this.canAccessStudent(auth, invoice.studentId.toString());
  }

  /**
   * Evaluates if the authenticated context is authorized to access an academic class (offering).
   */
  async canAccessAcademicClass(auth: AuthContext, academicClassId: string): Promise<boolean> {
    if (!auth || !auth.tenantId || !auth.userId || !academicClassId) {
      return false;
    }

    if (!Types.ObjectId.isValid(academicClassId)) {
      return false;
    }

    const academicClass = await AcademicClass.findOne({
      _id: new Types.ObjectId(academicClassId),
      tenantId: new Types.ObjectId(auth.tenantId),
      isDeleted: false,
    }).lean();

    if (!academicClass) {
      return false; // Cross-tenant or not found
    }

    // Admins and Principals
    if (
      auth.userType === UserType.SUPER_ADMIN ||
      auth.userType === UserType.SCHOOL_ADMIN ||
      auth.roles?.includes('SUPER_ADMIN') ||
      auth.roles?.includes('SCHOOL_ADMIN') ||
      auth.roles?.includes('PRINCIPAL') ||
      auth.roles?.includes('VICE_PRINCIPAL')
    ) {
      return true;
    }

    // Teachers: Must be class teacher or assigned to teach in this academic class / section
    if (auth.userType === UserType.TEACHER) {
      const teacherProfile = await Teacher.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();

      if (!teacherProfile) return false;

      // Designated class teacher
      if (
        academicClass.classTeacherId &&
        academicClass.classTeacherId.toString() === teacherProfile._id.toString()
      ) {
        return true;
      }

      // Teacher assigned to any subject in this section/class
      const assignment = await TeacherSubjectAssignment.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        teacherId: teacherProfile._id,
        $or: [
          { academicClassId: academicClass._id },
          { sectionId: academicClass.sectionId, academicYearId: academicClass.academicYearId },
        ],
      }).lean();

      return !!assignment;
    }

    // Students: Must be enrolled in this academic class
    if (auth.userType === UserType.STUDENT) {
      const student = await Student.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();

      if (!student) return false;

      const enrollment = await StudentEnrollment.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        studentId: student._id,
        academicYearId: academicClass.academicYearId,
        $or: [
          { academicClassId: academicClass._id },
          { classId: academicClass.classId, sectionId: academicClass.sectionId },
        ],
        status: 'ENROLLED',
      }).lean();

      return !!enrollment;
    }

    // Parents: Child must be enrolled in this academic class
    if (auth.userType === UserType.PARENT) {
      const parentProfile = await Parent.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();

      if (!parentProfile) return false;

      const relations = await StudentParentRelation.find({
        tenantId: new Types.ObjectId(auth.tenantId),
        parentId: parentProfile._id,
      }).lean();

      const studentIds = relations.map((r) => r.studentId);
      if (studentIds.length === 0) return false;

      const enrollment = await StudentEnrollment.findOne({
        tenantId: new Types.ObjectId(auth.tenantId),
        studentId: { $in: studentIds },
        academicYearId: academicClass.academicYearId,
        $or: [
          { academicClassId: academicClass._id },
          { classId: academicClass.classId, sectionId: academicClass.sectionId },
        ],
        status: 'ENROLLED',
      }).lean();

      return !!enrollment;
    }

    return false;
  }

  /**
   * Evaluates if the authenticated context is authorized to access a subject.
   */
  async canAccessSubject(auth: AuthContext, subjectId: string): Promise<boolean> {
    if (!auth || !auth.tenantId || !auth.userId || !subjectId) {
      return false;
    }

    if (!Types.ObjectId.isValid(subjectId)) {
      return false;
    }

    const subject = await Subject.findOne({
      _id: new Types.ObjectId(subjectId),
      tenantId: new Types.ObjectId(auth.tenantId),
      isDeleted: false,
    }).lean();

    return !!subject;
  }
}

export const resourcePolicy = new ResourcePolicy();
