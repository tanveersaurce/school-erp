import { Request } from 'express';
import { Types } from 'mongoose';
import { AuthorizationError, AuthenticationError, TenantMismatchError } from '@edusphere/common';

export class InventoryPolicy {
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
   * Asserts whether an authenticated user has administrative inventory authority.
   */
  public static assertCanManageInventory(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'INVENTORY_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage inventory operations.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to manage stock receipts.
   */
  public static assertCanReceiveStock(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'INVENTORY_MANAGER', 'STORE_KEEPER'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to receive inventory stock shipments.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to issue stock.
   */
  public static assertCanIssueStock(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'INVENTORY_MANAGER', 'STORE_KEEPER'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to issue inventory stock items.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to adjust stock or reconcile stocktakes.
   */
  public static assertCanAdjustStock(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'INVENTORY_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRolesOrAllowed(roles, allowedRoles))) {
      throw new AuthorizationError('Insufficient permissions to approve or execute stock adjustments.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to manage durable assets.
   */
  public static assertCanManageAssets(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'INVENTORY_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage durable assets.');
    }
  }

  /**
   * Asserts document belongs to tenant (Strict Multi-Tenancy Guard).
   */
  public static assertTenantAccess(
    docTenantId: Types.ObjectId | string,
    authTenantId: Types.ObjectId | string
  ): void {
    if (docTenantId.toString() !== authTenantId.toString()) {
      throw new TenantMismatchError('Cross-tenant inventory resource access is forbidden.');
    }
  }

  /**
   * Asserts campus isolation if user is campus-scoped.
   */
  public static assertCampusAccess(authCampusId?: string, docCampusId?: string): void {
    if (authCampusId && docCampusId && authCampusId.toString() !== docCampusId.toString()) {
      throw new AuthorizationError('Cross-campus inventory resource access is forbidden.');
    }
  }
}

function elevatedRolesOrAllowed(userRoles: string[], allowedRoles: string[]): boolean {
  return userRoles.some((r) => allowedRoles.includes(r));
}
