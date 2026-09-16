import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  createSuccessResponse,
  AuthenticationError,
  UserType,
} from '@edusphere/common';
import { Parent, StudentParentRelation, StudentTransportAssignment } from '@edusphere/database';
import { TransportPolicy } from './policies/transport.policy.js';
import { TransportConfigService } from './services/transport-config.service.js';
import { VehicleService } from './services/vehicle.service.js';
import { DriverService } from './services/driver.service.js';
import { RouteService } from './services/route.service.js';
import { TransportAssignmentService } from './services/transport-assignment.service.js';
import { TripService } from './services/trip.service.js';
import { IncidentService } from './services/incident.service.js';
import { MaintenanceService } from './services/maintenance.service.js';
import { TransportFeeService } from './services/transport-fee.service.js';
import { TransportReportsService } from './services/transport-reports.service.js';

export class TransportController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = req.tenantContext?.tenantId || auth.tenantId;
    const schoolId = (req.query.schoolId as string) || (req.body?.schoolId as string) || auth.schoolId || '';
    const campusId = (req.query.campusId as string) || (req.body?.campusId as string) || auth.campusId;
    return { auth, tenantId, schoolId, campusId, userId: auth.userId };
  }

  private static reply(
    res: Response,
    req: Request,
    data: any,
    message = 'Operation completed successfully',
    status = 200
  ) {
    return res.status(status).json(
      createSuccessResponse(data, message, { requestId: (req as any).id || 'req_unknown' })
    );
  }

  // =========================================================================
  // 1. Settings & Vehicle Types & Stops
  // =========================================================================
  public static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId, campusId } = TransportController.getAuth(req);
      const settings = await TransportConfigService.getOrCreateSetting(
        tenantId,
        schoolId,
        campusId || (req.query.campusId as string)
      );
      return TransportController.reply(res, req, settings, 'Transport settings retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId, campusId } = TransportController.getAuth(req);
      const targetCampus = (req.query.campusId as string) || req.body.campusId || campusId;
      const settings = await TransportConfigService.updateSetting(
        tenantId,
        schoolId,
        targetCampus,
        req.body
      );
      return TransportController.reply(res, req, settings, 'Transport settings updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async createVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const type = await TransportConfigService.createVehicleType(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, type, 'Vehicle type created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getVehicleTypes(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const types = await TransportConfigService.getVehicleTypes(tenantId, schoolId);
      return TransportController.reply(res, req, types, 'Vehicle types retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const type = await TransportConfigService.updateVehicleType(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, type, 'Vehicle type updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteVehicleType(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const type = await TransportConfigService.deleteVehicleType(tenantId, req.params.id);
      return TransportController.reply(res, req, type, 'Vehicle type deleted.');
    } catch (err) {
      next(err);
    }
  }

  public static async createStop(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const stop = await TransportConfigService.createStop(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, stop, 'Transport stop created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getStops(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const stops = await TransportConfigService.getStops(tenantId, schoolId, req.query.campusId as string);
      return TransportController.reply(res, req, stops, 'Transport stops retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getStopById(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const stop = await TransportConfigService.getStopById(tenantId, req.params.id);
      return TransportController.reply(res, req, stop, 'Transport stop retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateStop(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const stop = await TransportConfigService.updateStop(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, stop, 'Transport stop updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteStop(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const stop = await TransportConfigService.deleteStop(tenantId, req.params.id);
      return TransportController.reply(res, req, stop, 'Transport stop deleted.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Vehicles & Compliance Documents
  // =========================================================================
  public static async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const vehicle = await VehicleService.createVehicle(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, vehicle, 'Vehicle created successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await VehicleService.getVehicles(tenantId, schoolId, {
        campusId: req.query.campusId as string,
        vehicleTypeId: req.query.vehicleTypeId as string,
        status: req.query.status as any,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Vehicles retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getVehicleById(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const vehicle = await VehicleService.getVehicleById(tenantId, req.params.id);
      return TransportController.reply(res, req, vehicle, 'Vehicle retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const vehicle = await VehicleService.updateVehicle(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, vehicle, 'Vehicle updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const vehicle = await VehicleService.deleteVehicle(tenantId, req.params.id);
      return TransportController.reply(res, req, vehicle, 'Vehicle deleted.');
    } catch (err) {
      next(err);
    }
  }

  public static async addVehicleDocument(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const doc = await VehicleService.addDocument(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, doc, 'Vehicle document added.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getVehicleDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const docs = await VehicleService.getDocuments(tenantId, req.params.id);
      return TransportController.reply(res, req, docs, 'Vehicle documents retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async verifyVehicleDocument(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, userId } = TransportController.getAuth(req);
      const doc = await VehicleService.verifyDocument(tenantId, req.params.documentId, userId, req.body);
      return TransportController.reply(res, req, doc, 'Vehicle document verification updated.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Drivers & Attendants
  // =========================================================================
  public static async createDriver(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const driver = await DriverService.createDriverProfile(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, driver, 'Driver profile created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await DriverService.getDrivers(tenantId, schoolId, {
        campusId: req.query.campusId as string,
        status: req.query.status as any,
        verificationStatus: req.query.verificationStatus as any,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Drivers retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getDriverById(req: Request, res: Response, next: NextFunction) {
    try {
      await TransportPolicy.assertDriverAccess(req, req.params.id);
      const { tenantId } = TransportController.getAuth(req);
      const driver = await DriverService.getDriverById(tenantId, req.params.id);
      return TransportController.reply(res, req, driver, 'Driver profile retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateDriver(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const driver = await DriverService.updateDriver(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, driver, 'Driver profile updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async verifyDriver(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, userId } = TransportController.getAuth(req);
      const driver = await DriverService.verifyDriver(tenantId, req.params.id, userId, req.body);
      return TransportController.reply(res, req, driver, 'Driver verification status updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async addDriverDocument(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const doc = await DriverService.addDriverDocument(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, doc, 'Driver document added.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getDriverDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      await TransportPolicy.assertDriverAccess(req, req.params.id);
      const { tenantId } = TransportController.getAuth(req);
      const docs = await DriverService.getDriverDocuments(tenantId, req.params.id);
      return TransportController.reply(res, req, docs, 'Driver documents retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async createAttendant(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const attendant = await DriverService.createAttendantProfile(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, attendant, 'Attendant profile created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getAttendants(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const attendants = await DriverService.getAttendants(tenantId, schoolId, {
        campusId: req.query.campusId as string,
      });
      return TransportController.reply(res, req, attendants, 'Attendants retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getAttendantById(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const attendant = await DriverService.getAttendantById(tenantId, req.params.id);
      return TransportController.reply(res, req, attendant, 'Attendant retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateAttendant(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const attendant = await DriverService.updateAttendant(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, attendant, 'Attendant profile updated.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Routes
  // =========================================================================
  public static async createRoute(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId, userId } = TransportController.getAuth(req);
      const route = await RouteService.createRoute(tenantId, schoolId, req.body, userId);
      return TransportController.reply(res, req, route, 'Transport route created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await RouteService.getRoutes(tenantId, schoolId, {
        campusId: req.query.campusId as string,
        vehicleId: req.query.vehicleId as string,
        driverId: req.query.driverId as string,
        direction: req.query.direction as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Transport routes retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getRouteById(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const route = await RouteService.getRouteById(tenantId, req.params.id);
      return TransportController.reply(res, req, route, 'Transport route retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateRoute(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, userId } = TransportController.getAuth(req);
      const route = await RouteService.updateRoute(tenantId, req.params.id, req.body, userId);
      return TransportController.reply(res, req, route, 'Transport route updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteRoute(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const route = await RouteService.deleteRoute(tenantId, req.params.id);
      return TransportController.reply(res, req, route, 'Transport route deleted.');
    } catch (err) {
      next(err);
    }
  }

  public static async getRouteVersions(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const versions = await RouteService.getRouteVersions(tenantId, req.params.id);
      return TransportController.reply(res, req, versions, 'Route version history retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getRouteCapacity(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const capacity = await RouteService.getRouteCapacity(tenantId, req.params.id);
      return TransportController.reply(res, req, capacity, 'Route capacity details retrieved.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Student Transport Assignments
  // =========================================================================
  public static async assignStudent(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const assignment = await TransportAssignmentService.assignStudentToRoute(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, assignment, 'Student assigned to route successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await TransportAssignmentService.getAssignments(tenantId, schoolId, {
        campusId: req.query.campusId as string,
        routeId: req.query.routeId as string,
        studentId: req.query.studentId as string,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Student transport assignments retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getAssignmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = TransportController.getAuth(req);
      const assignment = await TransportAssignmentService.getAssignmentById(tenantId, req.params.id);
      await TransportPolicy.assertStudentTransportAccess(req, assignment.studentId._id);
      return TransportController.reply(res, req, assignment, 'Transport assignment retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const assignment = await TransportAssignmentService.updateAssignment(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, assignment, 'Transport assignment updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async cancelAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const assignment = await TransportAssignmentService.cancelAssignment(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, assignment, 'Transport assignment cancelled.');
    } catch (err) {
      next(err);
    }
  }

  public static async getMyAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, auth } = TransportController.getAuth(req);
      const studentId = req.query.studentId as string;
      if (studentId) {
        await TransportPolicy.assertStudentTransportAccess(req, studentId);
        const assignments = await TransportAssignmentService.getAssignmentsForStudent(tenantId, studentId);
        return TransportController.reply(res, req, assignments, 'My transport assignments retrieved.');
      }

      // If studentId not specified, lookup linked students for parent
      if (auth.userType === UserType.PARENT || auth.roles?.includes('PARENT')) {
        const parentProfile = await Parent.findOne({
          tenantId: new Types.ObjectId(tenantId),
          userId: new Types.ObjectId(userId),
          isDeleted: false,
        });

        if (parentProfile) {
          const relations = await StudentParentRelation.find({
            tenantId: new Types.ObjectId(tenantId),
            parentId: parentProfile._id,
            status: { $ne: 'INACTIVE' },
          });
          const childStudentIds = relations.map((r) => r.studentId);
          const assignments = await StudentTransportAssignment.find({
            tenantId: new Types.ObjectId(tenantId),
            studentId: { $in: childStudentIds },
            status: 'ACTIVE',
            isDeleted: false,
          })
            .populate('studentId', 'admissionNumber personalDetails')
            .populate('routeId', 'name code')
            .populate('pickupStopId', 'name landmark')
            .populate('dropStopId', 'name landmark');
          return TransportController.reply(res, req, assignments, 'My transport assignments retrieved.');
        }
      }

      return TransportController.reply(res, req, [], 'No transport assignments found for user.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Trips & Telemetry
  // =========================================================================
  public static async createTrip(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const trip = await TripService.createTrip(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, trip, 'Trip scheduled successfully.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getTrips(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await TripService.getTrips(tenantId, schoolId, {
        campusId: req.query.campusId as string,
        routeId: req.query.routeId as string,
        vehicleId: req.query.vehicleId as string,
        driverId: req.query.driverId as string,
        tripDate: req.query.tripDate as string,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Trips retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getTripById(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const trip = await TripService.getTripById(tenantId, req.params.id);
      const maskedTrip = TransportPolicy.maskTelemetryIfRequired(req, trip);
      return TransportController.reply(res, req, maskedTrip, 'Trip details retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async startTrip(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanOperateTrips(req);
      const { tenantId } = TransportController.getAuth(req);
      const trip = await TripService.startTrip(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, trip, 'Trip started successfully.');
    } catch (err) {
      next(err);
    }
  }

  public static async completeTrip(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanOperateTrips(req);
      const { tenantId } = TransportController.getAuth(req);
      const trip = await TripService.completeTrip(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, trip, 'Trip completed successfully.');
    } catch (err) {
      next(err);
    }
  }

  public static async cancelTrip(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const trip = await TripService.cancelTrip(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, trip, 'Trip cancelled.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateTelemetry(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanOperateTrips(req);
      const { tenantId } = TransportController.getAuth(req);
      const trip = await TripService.updateTelemetry(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, trip, 'Trip telemetry updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async markStudentBoarding(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanMarkBoarding(req);
      const { tenantId } = TransportController.getAuth(req);
      const trip = await TripService.markStudentBoarding(tenantId, req.params.id, req.params.studentId, req.body);
      return TransportController.reply(res, req, trip, 'Student boarding recorded.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 7. Incidents
  // =========================================================================
  public static async reportIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId, userId } = TransportController.getAuth(req);
      const incident = await IncidentService.reportIncident(tenantId, schoolId, req.body, userId);
      return TransportController.reply(res, req, incident, 'Transport incident reported.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getIncidents(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await IncidentService.getIncidents(tenantId, schoolId, {
        campusId: req.query.campusId as string,
        vehicleId: req.query.vehicleId as string,
        severity: req.query.severity as any,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Incidents retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getIncidentById(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const incident = await IncidentService.getIncidentById(tenantId, req.params.id);
      return TransportController.reply(res, req, incident, 'Incident details retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async updateIncident(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, userId } = TransportController.getAuth(req);
      const incident = await IncidentService.updateIncident(tenantId, req.params.id, req.body, userId);
      return TransportController.reply(res, req, incident, 'Incident updated.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 8. Maintenance & Inspections
  // =========================================================================
  public static async scheduleMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const maintenance = await MaintenanceService.scheduleMaintenance(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, maintenance, 'Vehicle maintenance scheduled.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getMaintenanceRecords(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await MaintenanceService.getMaintenanceRecords(tenantId, schoolId, {
        vehicleId: req.query.vehicleId as string,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Maintenance records retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getMaintenanceById(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const maintenance = await MaintenanceService.getMaintenanceById(tenantId, req.params.id);
      return TransportController.reply(res, req, maintenance, 'Maintenance record retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async completeMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId } = TransportController.getAuth(req);
      const maintenance = await MaintenanceService.completeMaintenance(tenantId, req.params.id, req.body);
      return TransportController.reply(res, req, maintenance, 'Maintenance completed.');
    } catch (err) {
      next(err);
    }
  }

  public static async recordInspection(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanOperateTrips(req);
      const { tenantId, schoolId, userId } = TransportController.getAuth(req);
      const inspection = await MaintenanceService.recordInspection(tenantId, schoolId, req.body, userId);
      return TransportController.reply(res, req, inspection, 'Vehicle inspection recorded.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getInspections(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await MaintenanceService.getInspections(tenantId, schoolId, {
        vehicleId: req.query.vehicleId as string,
        result: req.query.result as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Vehicle inspections retrieved.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 9. Transport Fee Billing
  // =========================================================================
  public static async createFeeAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const feeAssignment = await TransportFeeService.createFeeAssignment(tenantId, schoolId, req.body);
      return TransportController.reply(res, req, feeAssignment, 'Transport fee assignment created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getFeeAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await TransportFeeService.getFeeAssignments(tenantId, schoolId, {
        studentId: req.query.studentId as string,
        billingStatus: req.query.billingStatus as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return TransportController.reply(res, req, result, 'Transport fee assignments retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async generateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const result = await TransportFeeService.generateInvoice(
        tenantId,
        schoolId,
        req.params.id,
        req.body?.dueDate
      );
      return TransportController.reply(res, req, result, 'Transport fee invoice generated.', 201);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 10. Reports & Analytics
  // =========================================================================
  public static async getDashboardKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId, campusId } = TransportController.getAuth(req);
      const targetCampus = (req.query.campusId as string) || campusId;
      const kpis = await TransportReportsService.getDashboardKPIs(tenantId, schoolId, targetCampus);
      return TransportController.reply(res, req, kpis, 'Transport dashboard KPIs retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getRouteCapacitySummary(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId, campusId } = TransportController.getAuth(req);
      const targetCampus = (req.query.campusId as string) || campusId;
      const summary = await TransportReportsService.getRouteCapacitySummary(tenantId, schoolId, targetCampus);
      return TransportController.reply(res, req, summary, 'Route capacity summary retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getTripAttendanceSummary(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanViewTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const summary = await TransportReportsService.getTripAttendanceSummary(
        tenantId,
        schoolId,
        req.query.tripDate as string
      );
      return TransportController.reply(res, req, summary, 'Trip attendance summary retrieved.');
    } catch (err) {
      next(err);
    }
  }

  public static async getOverdueDocumentsReport(req: Request, res: Response, next: NextFunction) {
    try {
      TransportPolicy.assertCanManageTransport(req);
      const { tenantId, schoolId } = TransportController.getAuth(req);
      const days = req.query.daysAhead ? parseInt(req.query.daysAhead as string, 10) : 30;
      const report = await TransportReportsService.getOverdueDocumentsReport(tenantId, schoolId, days);
      return TransportController.reply(res, req, report, 'Overdue compliance report retrieved.');
    } catch (err) {
      next(err);
    }
  }
}
