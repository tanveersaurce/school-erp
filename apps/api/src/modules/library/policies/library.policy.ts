import { Request } from 'express';
import { Types } from 'mongoose';
import {
  LibraryMember,
  Student,
  Parent,
  StudentParentRelation,
  Employee,
} from '@edusphere/database';
import { AuthorizationError } from '@edusphere/common';

export class LibraryPolicy {
  private static getRoles(auth: any): string[] {
    const list: string[] = [];
    if (auth.userType) {
      list.push(auth.userType);
    }
    if (auth.roles && Array.isArray(auth.roles)) {
      for (const r of auth.roles) {
        list.push(typeof r === 'string' ? r : r.name);
      }
    }
    return list;
  }

  /**
   * Asserts whether an authenticated user has Library Management authority.
   */
  public static assertCanManageLibrary(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage library operations.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to perform circulation (issue/return/renew).
   */
  public static assertCanCirculate(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to perform circulation actions.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to waive library fines.
   */
  public static assertCanWaiveFine(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to waive library fines.');
    }
  }

  /**
   * Asserts whether an authenticated user has permission to access a specific member's records.
   * Enforces self-access for students and staff, and administrative access for librarians.
   */
  public static async assertMemberAccess(
    req: Request,
    targetMemberId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const targetOid = new Types.ObjectId(targetMemberId.toString());

    // 1. Staff and Administrators with elevated roles
    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (roles.some((r) => elevatedRoles.includes(r))) {
      return;
    }

    // 2. Self-access check
    const member = await LibraryMember.findOne({
      _id: targetOid,
      tenantId,
      userId: new Types.ObjectId(auth.userId),
      isDeleted: false,
    });

    if (member) {
      return;
    }

    // 3. Check if parent viewing student member
    const isParent = roles.includes('PARENT');
    if (isParent) {
      const parentProfile = await Parent.findOne({
        tenantId,
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      });

      if (parentProfile) {
        const studentMember = await LibraryMember.findOne({
          _id: targetOid,
          tenantId,
          isDeleted: false,
        });

        if (studentMember?.studentId) {
          const relation = await StudentParentRelation.findOne({
            tenantId,
            parentId: parentProfile._id,
            studentId: studentMember.studentId,
            status: { $ne: 'INACTIVE' },
          });

          if (relation) {
            return;
          }
        }
      }
    }

    throw new AuthorizationError('Access denied: You can only access your own library records.');
  }

  /**
   * Asserts whether an authenticated parent or student has access to a specific student's library records.
   */
  public static async assertStudentLibraryAccess(
    req: Request,
    studentId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const targetStudentOid = new Types.ObjectId(studentId.toString());

    // 1. Elevated roles
    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'LIBRARIAN', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (roles.some((r) => elevatedRoles.includes(r))) {
      return;
    }

    // 2. Student self-access
    const isStudent = roles.includes('STUDENT');
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

    // 3. Parent access for linked child
    const isParent = roles.includes('PARENT');
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
          status: { $ne: 'INACTIVE' },
        });

        if (relation) {
          return;
        }
      }
    }

    throw new AuthorizationError('Access denied: You do not have permission to access library records for this student.');
  }
}
