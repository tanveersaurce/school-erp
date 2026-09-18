import { Types } from 'mongoose';
import { AuthorizationError, UserType } from '@edusphere/common';
import { IReportScope } from '@edusphere/types';
import {
  Student,
  Parent,
  StudentParentRelation,
  Teacher,
  TeacherSubjectAssignment,
  AcademicClass,
} from '@edusphere/database';
import { rbacService } from '../../rbac/rbac.service.js';

export class ScopeResolverService {
  /**
   * Resolves the caller's authorized scope across tenant, campus, classes, and student entities.
   */
  async resolveScope(
    tenantId: string,
    userId: string,
    userType: UserType,
    schoolId?: string
  ): Promise<IReportScope> {
    const effective = await rbacService.getEffectivePermissions(tenantId, userId, userType);
    const roles = effective.roles || [];

    const isSuperAdmin = userType === UserType.SUPER_ADMIN || roles.includes('SUPER_ADMIN');
    const isSchoolAdmin =
      userType === UserType.SCHOOL_ADMIN ||
      roles.includes('SCHOOL_ADMIN') ||
      roles.includes('PRINCIPAL') ||
      roles.includes('VICE_PRINCIPAL');
    const isTeacher = userType === UserType.TEACHER || roles.includes('TEACHER');
    const isParent = userType === UserType.PARENT || roles.includes('PARENT');
    const isStudent = userType === UserType.STUDENT || roles.includes('STUDENT');

    const scope: IReportScope = {
      tenantId,
      schoolId,
      userId,
      isSuperAdmin,
      isSchoolAdmin,
      isTeacher,
      isParent,
      isStudent,
    };

    // Unrestricted administrators
    if (isSuperAdmin || isSchoolAdmin) {
      return scope;
    }

    // Teacher Scoping: find assigned classes/sections
    if (isTeacher && Types.ObjectId.isValid(userId)) {
      const teacherDoc = await Teacher.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
      });

      if (teacherDoc) {
        const [assignments, classTeacherRoles] = await Promise.all([
          TeacherSubjectAssignment.find({
            tenantId: new Types.ObjectId(tenantId),
            teacherId: teacherDoc._id,
            status: 'ACTIVE',
          }),
          AcademicClass.find({
            tenantId: new Types.ObjectId(tenantId),
            classTeacherId: teacherDoc._id,
          }),
        ]);

        const classIdsSet = new Set<string>();
        const sectionIdsSet = new Set<string>();

        assignments.forEach((a) => {
          if (a.classId) classIdsSet.add(a.classId.toString());
          if (a.sectionId) sectionIdsSet.add(a.sectionId.toString());
        });

        classTeacherRoles.forEach((c) => {
          if (c.classId) classIdsSet.add(c.classId.toString());
          if (c.sectionId) sectionIdsSet.add(c.sectionId.toString());
        });

        scope.classIds = Array.from(classIdsSet);
        scope.sectionIds = Array.from(sectionIdsSet);
      }
      return scope;
    }

    // Student Scoping: strictly self-only
    if (isStudent && Types.ObjectId.isValid(userId)) {
      const studentDoc = await Student.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
      });

      if (studentDoc) {
        scope.permittedStudentIds = [studentDoc._id.toString()];
      } else {
        scope.permittedStudentIds = [];
      }
      return scope;
    }

    // Parent Scoping: strictly linked wards/children
    if (isParent && Types.ObjectId.isValid(userId)) {
      const parentDoc = await Parent.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(userId),
      });

      if (parentDoc) {
        const relations = await StudentParentRelation.find({
          tenantId: new Types.ObjectId(tenantId),
          parentId: parentDoc._id,
          status: 'ACTIVE',
        });
        scope.permittedStudentIds = relations.map((r) => r.studentId.toString());
      } else {
        scope.permittedStudentIds = [];
      }
      return scope;
    }

    return scope;
  }

  /**
   * Enforces server-side restrictions on requested client filters.
   * Client parameters can only narrow, never expand or escape authorized scope.
   */
  enforceFilterRestrictions(
    filters: Record<string, any>,
    scope: IReportScope
  ): Record<string, any> {
    const sanitizedFilters = { ...filters };

    // Strict student boundary enforcement
    if (scope.permittedStudentIds) {
      if (sanitizedFilters.studentId) {
        if (!scope.permittedStudentIds.includes(String(sanitizedFilters.studentId))) {
          throw new AuthorizationError(
            'Access denied: You are not authorized to view reports for the requested student.'
          );
        }
      } else {
        // If not specified, restrict to all permitted student IDs
        sanitizedFilters.studentId = { $in: scope.permittedStudentIds };
      }
    }

    // Strict teacher class boundary enforcement
    if (scope.isTeacher && !scope.isSchoolAdmin && !scope.isSuperAdmin && scope.classIds) {
      if (sanitizedFilters.classId) {
        if (!scope.classIds.includes(String(sanitizedFilters.classId))) {
          throw new AuthorizationError(
            'Access denied: You are not authorized to view reports for this class.'
          );
        }
      } else if (scope.classIds.length > 0) {
        sanitizedFilters.classId = { $in: scope.classIds };
      }
    }

    return sanitizedFilters;
  }
}

export const scopeResolverService = new ScopeResolverService();
