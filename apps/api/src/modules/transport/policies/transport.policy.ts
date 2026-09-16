import { Request } from 'express';
import { Types } from 'mongoose';
import {
  Student,
  Parent,
  StudentParentRelation,
  DriverProfile,
} from '@edusphere/database';
import { AuthorizationError } from '@edusphere/common';

export class TransportPolicy {
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
   * Asserts whether an authenticated user has administrative Transport Management authority.
   */
  public static assertCanManageTransport(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => elevatedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to manage transport operations.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to operate trips (start, complete, send telemetry).
   * Elevated managers or drivers/staff can operate trips.
   */
  public static assertCanOperateTrips(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER', 'STAFF'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to operate vehicle trips.');
    }
  }

  /**
   * Asserts whether an authenticated user has authority to mark student boarding / deboarding.
   */
  public static assertCanMarkBoarding(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'DRIVER', 'STAFF'];
    const roles = this.getRoles(auth);
    if (!roles.some((r) => allowedRoles.includes(r))) {
      throw new AuthorizationError('Insufficient permissions to record student boarding/attendance.');
    }
  }

  /**
   * Asserts whether an authenticated user has access to view transport records.
   */
  public static assertCanViewTransport(req: Request): void {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }
  }

  /**
   * Anti-IDOR: Asserts whether an authenticated student or parent has legitimate access to a specific student's transport details.
   */
  public static async assertStudentTransportAccess(
    req: Request,
    studentId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const tenantId = new Types.ObjectId(auth.tenantId);
    const targetStudentOid = new Types.ObjectId(studentId.toString());

    // 1. Elevated roles have administrative access
    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'PRINCIPAL', 'DRIVER', 'STAFF'];
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

    throw new AuthorizationError('Access denied: You do not have permission to view transport records for this student.');
  }

  /**
   * Asserts driver self-access or administrative access for driver profile.
   */
  public static async assertDriverAccess(
    req: Request,
    driverProfileId: string | Types.ObjectId
  ): Promise<void> {
    const auth = req.auth;
    if (!auth) {
      throw new AuthorizationError('Authentication required.');
    }

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'PRINCIPAL'];
    const roles = this.getRoles(auth);
    if (roles.some((r) => elevatedRoles.includes(r))) {
      return;
    }

    // Check if the current user is the driver
    const driver = await DriverProfile.findOne({
      _id: new Types.ObjectId(driverProfileId.toString()),
      tenantId: new Types.ObjectId(auth.tenantId),
      isDeleted: false,
    }).populate('employeeId');

    if (driver && (driver.employeeId as any)?.userId?.toString() === auth.userId) {
      return;
    }

    throw new AuthorizationError('Access denied: You can only view your own driver profile.');
  }

  /**
   * Privacy masking: Sanitizes live GPS telemetry for non-administrative roles when trip is completed or cancelled.
   */
  public static maskTelemetryIfRequired(req: Request, trip: any): any {
    if (!trip) return trip;
    const auth = req.auth;
    if (!auth) return trip;

    const elevatedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'PRINCIPAL', 'DRIVER', 'STAFF'];
    const roles = this.getRoles(auth);
    if (roles.some((r) => elevatedRoles.includes(r))) {
      return trip;
    }

    // For students or parents, if trip is not IN_PROGRESS, mask real-time location to prevent tracking when vehicle is off-duty
    const rawTrip = typeof trip.toObject === 'function' ? trip.toObject() : { ...trip };
    if (rawTrip.status !== 'IN_PROGRESS') {
      delete rawTrip.currentLocation;
      delete rawTrip.currentSpeedKmh;
      delete rawTrip.telemetry;
    }
    return rawTrip;
  }
}
