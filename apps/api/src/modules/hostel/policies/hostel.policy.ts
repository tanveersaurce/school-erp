import { Request } from 'express';
import { Types } from 'mongoose';
import {
  Student,
  Parent,
  StudentParentRelation,
  HostelStaffAssignment,
} from '@edusphere/database';
import { AuthorizationError, AuthenticationError } from '@edusphere/common';

export class HostelPolicy {
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
   * Asserts whether an authenticated user has administrative Hostel Management authority.
   */
  public static assertCanManageHostel(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage hostel operations.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to manage allocations, check-ins, transfers.
   */
  public static assertCanManageAllocations(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_MANAGER', 'PRINCIPAL', 'WARDEN'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage student hostel allocations.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to record hostel attendance.
   */
  public static assertCanMarkAttendance(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_MANAGER', 'PRINCIPAL', 'WARDEN', 'CARETAKER', 'STAFF'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to record hostel attendance.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to approve student outings.
   */
  public static assertCanManageOutings(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_MANAGER', 'PRINCIPAL', 'WARDEN'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage student outings.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to conduct room inspections.
   */
  public static assertCanInspectRooms(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_MANAGER', 'PRINCIPAL', 'WARDEN', 'CARETAKER', 'STAFF'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to conduct room inspections.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to manage maintenance tickets.
   */
  public static assertCanManageMaintenance(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_MANAGER', 'PRINCIPAL', 'WARDEN', 'CARETAKER', 'STAFF'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage maintenance operations.');
    }
  }

  /**
   * Anti-IDOR: Asserts whether an authenticated student or parent has legitimate access
   * to a specific student's hostel details.
   */
  public static async assertStudentHostelAccess(
    req: Request,
    studentId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const targetStudentOid = new Types.ObjectId(studentId.toString());

    // 1. Elevated roles & hostel staff have administrative access
    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HOSTEL_MANAGER', 'PRINCIPAL', 'WARDEN', 'CARETAKER', 'STAFF'];
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

    throw new AuthorizationError('Access to student hostel records denied (IDOR violation).');
  }

  /**
   * Resolves student ID from current user context (for student self-service portal).
   */
  public static async resolveCurrentStudent(req: Request): Promise<Types.ObjectId | null> {
    const auth = req.auth;
    if (!auth) return null;
    const tenantId = new Types.ObjectId(auth.tenantId);
    const student = await Student.findOne({
      tenantId,
      userId: new Types.ObjectId(auth.userId),
      isDeleted: false,
    });
    return student ? (student._id as Types.ObjectId) : null;
  }
}
