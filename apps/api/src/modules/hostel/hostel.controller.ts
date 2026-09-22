import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  createSuccessResponse,
  AuthenticationError,
  HostelAllocationStatus,
} from '@edusphere/common';
import {
  Student,
  Parent,
  StudentParentRelation,
  HostelAllocation,
} from '@edusphere/database';
import { HostelPolicy } from './policies/hostel.policy.js';
import { resolveAuthorizedSchoolId } from '../../core/auth/scope.helper.js';
import { HostelStructureService } from './services/hostel-structure.service.js';
import { WardenService } from './services/warden.service.js';
import { HostelAllocationService } from './services/hostel-allocation.service.js';
import { HostelAttendanceService } from './services/hostel-attendance.service.js';
import { HostelOutingService } from './services/hostel-outing.service.js';
import { HostelIncidentService } from './services/hostel-incident.service.js';
import { HostelMaintenanceService } from './services/hostel-maintenance.service.js';
import { HostelFeeService } from './services/hostel-fee.service.js';
import { HostelReportsService } from './services/hostel-reports.service.js';

export class HostelController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = new Types.ObjectId(req.tenantContext?.tenantId || auth.tenantId);
    const userId = new Types.ObjectId(auth.userId);
    const schoolId = resolveAuthorizedSchoolId(req);
    return { auth, tenantId, userId, schoolId };
  }

  private static reply(
    res: Response,
    req: Request,
    data: any,
    message = 'Operation completed successfully',
    status = 200
  ) {
    return res.status(status).json(
      createSuccessResponse(data, message, {
        requestId: (req as any).id,
      })
    );
  }

  // =========================================================================
  // 1. Dashboard & Reports
  // =========================================================================

  public static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HostelController.getAuth(req);
      const data = await HostelReportsService.getDashboardStats(tenantId, schoolId);
      return HostelController.reply(res, req, data, 'Hostel dashboard statistics retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Hostel Structure
  // =========================================================================

  public static async createHostel(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const hostel = await HostelStructureService.createHostel(tenantId, req.body);
      return HostelController.reply(res, req, hostel, 'Hostel created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getHostels(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const result = await HostelStructureService.getHostels(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Hostels retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getHostelById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const hostel = await HostelStructureService.getHostelById(tenantId, req.params.id);
      return HostelController.reply(res, req, hostel, 'Hostel details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async updateHostel(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const hostel = await HostelStructureService.updateHostel(tenantId, req.params.id, req.body);
      return HostelController.reply(res, req, hostel, 'Hostel updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteHostel(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      await HostelStructureService.deleteHostel(tenantId, req.params.id);
      return HostelController.reply(res, req, { success: true }, 'Hostel deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Buildings & Floors & Room Types
  // =========================================================================

  public static async createBuilding(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const building = await HostelStructureService.createBuilding(tenantId, req.body);
      return HostelController.reply(res, req, building, 'Building created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getBuildings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const buildings = await HostelStructureService.getBuildings(tenantId, req.query.hostelId as string);
      return HostelController.reply(res, req, buildings, 'Buildings retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async createFloor(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const floor = await HostelStructureService.createFloor(tenantId, req.body);
      return HostelController.reply(res, req, floor, 'Floor created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getFloors(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const floors = await HostelStructureService.getFloors(tenantId, req.query.buildingId as string);
      return HostelController.reply(res, req, floors, 'Floors retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async createRoomType(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const roomType = await HostelStructureService.createRoomType(tenantId, {
        schoolId: req.body.schoolId || schoolId,
        ...req.body,
      });
      return HostelController.reply(res, req, roomType, 'Room type created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getRoomTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const roomTypes = await HostelStructureService.getRoomTypes(tenantId);
      return HostelController.reply(res, req, roomTypes, 'Room types retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Rooms & Beds
  // =========================================================================

  public static async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const room = await HostelStructureService.createRoom(tenantId, req.body);
      return HostelController.reply(res, req, room, 'Room created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const result = await HostelStructureService.getRooms(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Rooms retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getRoomById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const room = await HostelStructureService.getRoomById(tenantId, req.params.id);
      return HostelController.reply(res, req, room, 'Room details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const room = await HostelStructureService.updateRoom(tenantId, req.params.id, req.body);
      return HostelController.reply(res, req, room, 'Room updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async createBed(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const bed = await HostelStructureService.createBed(tenantId, req.body);
      return HostelController.reply(res, req, bed, 'Bed created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async batchCreateBeds(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const beds = await HostelStructureService.batchCreateBeds(
        tenantId,
        req.body.roomId,
        req.body.bedNumbers
      );
      return HostelController.reply(res, req, beds, `${beds.length} beds created successfully`, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getBeds(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const result = await HostelStructureService.getBeds(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Beds retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteBed(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      await HostelStructureService.deleteBed(tenantId, req.params.id);
      return HostelController.reply(res, req, { success: true }, 'Bed deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getBedById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const bed = await HostelStructureService.getBedById(tenantId, req.params.id);
      return HostelController.reply(res, req, bed, 'Bed details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getMyAccommodation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      let studentId: Types.ObjectId | null = null;

      if (req.query.studentId) {
        await HostelPolicy.assertStudentHostelAccess(req, req.query.studentId as string);
        studentId = new Types.ObjectId(req.query.studentId as string);
      } else {
        const student = await Student.findOne({ userId, tenantId, isDeleted: false });
        if (student) {
          studentId = student._id;
        } else {
          const parent = await Parent.findOne({ userId, tenantId, isDeleted: false });
          if (parent) {
            const relation = await StudentParentRelation.findOne({
              parentId: parent._id,
              tenantId,
              status: { $ne: 'INACTIVE' },
            });
            if (relation) {
              studentId = relation.studentId;
            }
          }
        }
      }

      if (!studentId) {
        return HostelController.reply(res, req, { allocation: null, hostel: null, room: null, bed: null }, 'No student profile found');
      }

      const allocation = await HostelAllocation.findOne({
        tenantId,
        studentId,
        status: { $in: [HostelAllocationStatus.ALLOCATED, HostelAllocationStatus.CHECKED_IN] },
        isDeleted: false,
      })
        .populate('hostelId')
        .populate('buildingId')
        .populate('floorId')
        .populate('roomId')
        .populate('bedId');

      if (!allocation) {
        return HostelController.reply(res, req, { allocation: null, hostel: null, room: null, bed: null }, 'No active hostel allocation');
      }

      return HostelController.reply(res, req, {
        allocation,
        hostel: allocation.hostelId,
        building: allocation.buildingId,
        floor: allocation.floorId,
        room: allocation.roomId,
        bed: allocation.bedId,
      }, 'Accommodation details retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Staff & Warden Assignment
  // =========================================================================

  public static async assignStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const assignment = await WardenService.assignStaff(tenantId, req.body);
      return HostelController.reply(res, req, assignment, 'Staff assigned to hostel successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getStaffAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const assignments = await WardenService.getStaffAssignments(tenantId, req.query);
      return HostelController.reply(res, req, assignments, 'Staff assignments retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async removeStaffAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      await WardenService.removeStaffAssignment(tenantId, req.params.id);
      return HostelController.reply(res, req, { success: true }, 'Staff assignment removed');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Allocations, Check-in, Check-out, Transfers
  // =========================================================================

  public static async allocateBed(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageAllocations(req);
      const allocation = await HostelAllocationService.allocateBed(tenantId, req.body, userId);
      return HostelController.reply(res, req, allocation, 'Bed allocated successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageAllocations(req);
      const allocation = await HostelAllocationService.checkIn(tenantId, req.params.id, req.body, userId);
      return HostelController.reply(res, req, allocation, 'Student checked in successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageAllocations(req);
      const allocation = await HostelAllocationService.checkOut(tenantId, req.params.id, req.body, userId);
      return HostelController.reply(res, req, allocation, 'Student checked out successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async transferBed(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageAllocations(req);
      const allocation = await HostelAllocationService.transferBed(tenantId, req.params.id, req.body, userId);
      return HostelController.reply(res, req, allocation, 'Student transferred successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async cancelAllocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageAllocations(req);
      const allocation = await HostelAllocationService.cancelAllocation(tenantId, req.params.id, req.body?.reason);
      return HostelController.reply(res, req, allocation, 'Allocation cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getAllocations(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      if (req.query.studentId) {
        await HostelPolicy.assertStudentHostelAccess(req, req.query.studentId as string);
      }
      const result = await HostelAllocationService.getAllocations(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Allocations retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getAllocationById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const allocation = await HostelAllocationService.getAllocationById(tenantId, req.params.id);
      await HostelPolicy.assertStudentHostelAccess(req, allocation.studentId.toString());
      return HostelController.reply(res, req, allocation, 'Allocation details retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getStudentActiveAllocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      let studentId = req.params.studentId;
      if (studentId === 'me') {
        const resolved = await HostelPolicy.resolveCurrentStudent(req);
        if (!resolved) {
          return HostelController.reply(res, req, null, 'No student profile linked to current user');
        }
        studentId = resolved.toString();
      } else {
        await HostelPolicy.assertStudentHostelAccess(req, studentId);
      }

      const allocation = await HostelAllocationService.getStudentActiveAllocation(tenantId, studentId);
      return HostelController.reply(res, req, allocation, 'Active allocation retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 7. Attendance
  // =========================================================================

  public static async markAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanMarkAttendance(req);
      const record = await HostelAttendanceService.markAttendance(tenantId, req.body, userId);
      return HostelController.reply(res, req, record, 'Attendance marked successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async batchMarkAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, schoolId } = HostelController.getAuth(req);
      HostelPolicy.assertCanMarkAttendance(req);
      const records = await HostelAttendanceService.batchMarkAttendance(
        tenantId,
        req.body.hostelId,
        req.body.date,
        req.body.records,
        userId,
        schoolId
      );
      return HostelController.reply(res, req, records, `${records.length} attendance records saved`);
    } catch (err) {
      next(err);
    }
  }

  public static async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      if (req.query.studentId) {
        await HostelPolicy.assertStudentHostelAccess(req, req.query.studentId as string);
      }
      const result = await HostelAttendanceService.getAttendance(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Attendance records retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async getAttendanceStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const stats = await HostelAttendanceService.getAttendanceStats(
        tenantId,
        req.query.hostelId as string,
        (req.query.date as string) || new Date()
      );
      return HostelController.reply(res, req, stats, 'Attendance statistics retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 8. Outings
  // =========================================================================

  public static async requestOuting(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      await HostelPolicy.assertStudentHostelAccess(req, req.body.studentId);
      const outing = await HostelOutingService.requestOuting(tenantId, req.body);
      return HostelController.reply(res, req, outing, 'Outing request submitted', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async approveOuting(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageOutings(req);
      const outing = await HostelOutingService.approveOuting(
        tenantId,
        req.params.id,
        req.body.approved,
        userId,
        req.body.rejectionReason,
        req.body.remarks
      );
      return HostelController.reply(res, req, outing, `Outing ${req.body.approved ? 'approved' : 'rejected'}`);
    } catch (err) {
      next(err);
    }
  }

  public static async recordOutingDeparture(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanMarkAttendance(req);
      const outing = await HostelOutingService.recordDeparture(
        tenantId,
        req.params.id,
        req.body.departureDateTime
      );
      return HostelController.reply(res, req, outing, 'Student departure recorded');
    } catch (err) {
      next(err);
    }
  }

  public static async recordOutingReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanMarkAttendance(req);
      const outing = await HostelOutingService.recordReturn(
        tenantId,
        req.params.id,
        req.body.actualReturnDateTime
      );
      return HostelController.reply(res, req, outing, 'Student return recorded');
    } catch (err) {
      next(err);
    }
  }

  public static async cancelOuting(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const outing = await HostelOutingService.cancelOuting(tenantId, req.params.id);
      return HostelController.reply(res, req, outing, 'Outing cancelled');
    } catch (err) {
      next(err);
    }
  }

  public static async getOutings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      if (req.query.studentId) {
        await HostelPolicy.assertStudentHostelAccess(req, req.query.studentId as string);
      }
      const result = await HostelOutingService.getOutings(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Outings retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 9. Incidents
  // =========================================================================

  public static async reportIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      const incident = await HostelIncidentService.reportIncident(tenantId, req.body, userId);
      return HostelController.reply(res, req, incident, 'Incident reported successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const incident = await HostelIncidentService.updateIncident(tenantId, req.params.id, req.body, userId);
      return HostelController.reply(res, req, incident, 'Incident updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getIncidents(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      if (req.query.studentId) {
        await HostelPolicy.assertStudentHostelAccess(req, req.query.studentId as string);
      }
      const result = await HostelIncidentService.getIncidents(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Incidents retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 10. Inspections & Maintenance
  // =========================================================================

  public static async createInspection(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      HostelPolicy.assertCanInspectRooms(req);
      const inspection = await HostelMaintenanceService.createInspection(tenantId, req.body, userId);
      return HostelController.reply(res, req, inspection, 'Room inspection recorded', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getInspections(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const result = await HostelMaintenanceService.getInspections(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Room inspections retrieved');
    } catch (err) {
      next(err);
    }
  }

  public static async createMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = HostelController.getAuth(req);
      const maintenance = await HostelMaintenanceService.createMaintenance(tenantId, req.body, userId);
      return HostelController.reply(res, req, maintenance, 'Maintenance request created', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageMaintenance(req);
      const maintenance = await HostelMaintenanceService.updateMaintenance(tenantId, req.params.id, req.body);
      return HostelController.reply(res, req, maintenance, 'Maintenance request updated');
    } catch (err) {
      next(err);
    }
  }

  public static async getMaintenanceRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      const result = await HostelMaintenanceService.getMaintenanceRequests(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Maintenance requests retrieved');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 11. Fees
  // =========================================================================

  public static async createFeeAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const feeAssignment = await HostelFeeService.createFeeAssignment(tenantId, req.body);
      return HostelController.reply(res, req, feeAssignment, 'Hostel fee assigned successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async generateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      HostelPolicy.assertCanManageHostel(req);
      const feeAssignment = await HostelFeeService.generateInvoice(tenantId, req.params.id);
      return HostelController.reply(res, req, feeAssignment, 'Hostel invoice generated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getFeeAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = HostelController.getAuth(req);
      if (req.query.studentId) {
        await HostelPolicy.assertStudentHostelAccess(req, req.query.studentId as string);
      }
      const result = await HostelFeeService.getFeeAssignments(tenantId, req.query);
      return HostelController.reply(res, req, result, 'Hostel fee assignments retrieved');
    } catch (err) {
      next(err);
    }
  }
}
