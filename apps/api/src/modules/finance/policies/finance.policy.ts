import { Request } from 'express';
import { Types } from 'mongoose';
import {
  Student,
  Parent,
  StudentParentRelation,
} from '@edusphere/database';
import { AuthorizationError } from '@edusphere/common';

export class FinancePolicy {
  /**
   * Asserts whether an authenticated user has staff/admin operational finance authority.
   */
  public static assertCanManageFinance(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'PRINCIPAL'];
    const hasElevatedRole = auth.roles?.some((r: any) =>
      elevatedRoles.includes(typeof r === 'string' ? r : r.name)
    );

    if (!hasElevatedRole) {
      throw new AuthorizationError('Insufficient permissions to manage financial operations.');
    }
  }

  /**
   * Asserts whether a user has access to view a specific student's invoice or statement.
   * Enforces self-access for students and guardian-relation access for parents.
   */
  public static async assertStudentFinanceAccess(
    req: Request,
    studentId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const targetStudentOid = new Types.ObjectId(studentId.toString());

    // 1. Staff and Administrators with appropriate permissions
    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'PRINCIPAL'];
    if (auth.roles?.some((r: any) => elevatedRoles.includes(typeof r === 'string' ? r : r.name))) {
      return;
    }

    // 2. Student self-access check
    const isStudent = auth.roles?.some((r: any) => (typeof r === 'string' ? r : r.name) === 'STUDENT');
    if (isStudent) {
      const student = await Student.findOne({
        _id: targetStudentOid,
        tenantId,
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      });

      if (student) {
        return;
      }
    }

    // 3. Parent / Guardian relationship check
    const isParent = auth.roles?.some((r: any) => (typeof r === 'string' ? r : r.name) === 'PARENT');
    if (isParent) {
      const parentProfile = await Parent.findOne({
        tenantId,
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      });

      if (parentProfile) {
        const relation = await StudentParentRelation.findOne({
          tenantId,
          parentId: parentProfile._id,
          studentId: targetStudentOid,
          isDeleted: false,
        });

        if (relation) {
          return;
        }
      }
    }

    throw new AuthorizationError('You do not have permission to access financial records for this student.');
  }
}
