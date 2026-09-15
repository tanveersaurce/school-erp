import { Request } from 'express';
import { Types } from 'mongoose';
import { Employee } from '@edusphere/database';
import { AuthorizationError } from '@edusphere/common';

export class HrPolicy {
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
   * Asserts whether an authenticated user has HR management authority.
   */
  public static assertCanManageHr(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HR_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage HR operations.');
    }
  }

  /**
   * Asserts whether an authenticated user has Payroll management authority.
   */
  public static assertCanManagePayroll(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage payroll operations.');
    }
  }

  /**
   * Asserts whether a user has access to view a specific employee's HR or payroll information.
   * Enforces self-access for employees and organizational access for HR/Admins.
   */
  public static async assertEmployeeAccess(
    req: Request,
    targetEmployeeId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const targetOid = new Types.ObjectId(targetEmployeeId.toString());

    // 1. Staff and Administrators with elevated roles
    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HR_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (roles.some((r) => elevatedRoles.includes(r))) {
      return;
    }

    // 2. Employee self-access check
    const employee = await Employee.findOne({
      _id: targetOid,
      tenantId,
      userId: new Types.ObjectId(auth.userId),
      isDeleted: false,
    });

    if (!employee) {
      throw new AuthorizationError('Access denied: You can only access your own employee records.');
    }
  }

  /**
   * Asserts whether a user has access to view a specific payroll item / payslip.
   */
  public static async assertPayslipAccess(
    req: Request,
    employeeId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (roles.some((r) => elevatedRoles.includes(r))) {
      return;
    }

    // Self-access
    await this.assertEmployeeAccess(req, employeeId);
  }

  /**
   * Prevents an employee from approving their own leave application.
   */
  public static async assertNotSelfApproval(
    req: Request,
    applicantEmployeeId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    // Super Admin or School Admin override is permitted
    const adminRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN'];
    const roles = this.getRoles(auth);
    if (roles.some((r) => adminRoles.includes(r))) {
      return;
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(applicantEmployeeId.toString()),
      tenantId,
      userId: new Types.ObjectId(auth.userId),
      isDeleted: false,
    });

    if (employee) {
      throw new AuthorizationError('Access denied: You cannot approve your own leave application.');
    }
  }
}
