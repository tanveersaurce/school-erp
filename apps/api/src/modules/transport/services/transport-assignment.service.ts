import { Types } from 'mongoose';
import {
  StudentTransportAssignment,
  TransportRoute,
  TransportStop,
  Student,
  TransportSetting,
  TransportFeeAssignment,
} from '@edusphere/database';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  TransportAssignmentStatus,
  Money,
} from '@edusphere/common';

export class TransportAssignmentService {
  // =========================================================================
  // 1. Student Transport Assignment
  // =========================================================================
  public static async assignStudentToRoute(
    tenantId: string,
    schoolId: string,
    data: any
  ) {
    const studentOid = new Types.ObjectId(data.studentId);
    const routeOid = new Types.ObjectId(data.routeId);
    const campusOid = new Types.ObjectId(data.campusId);

    // Verify student exists and belongs to tenant
    const student = await Student.findOne({
      _id: studentOid,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError('Student not found.');
    }

    // Verify route exists and is active
    const route = await TransportRoute.findOne({
      _id: routeOid,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!route || !route.isActive) {
      throw new BadRequestError('Selected transport route is inactive or does not exist.');
    }

    // Check for existing active assignment for this student
    const existingAssignment = await StudentTransportAssignment.findOne({
      tenantId: new Types.ObjectId(tenantId),
      studentId: studentOid,
      status: TransportAssignmentStatus.ACTIVE,
      isDeleted: false,
    });

    if (existingAssignment) {
      throw new ConflictError(
        'Student already has an active transport assignment. Cancel or reassign the existing one first.'
      );
    }

    // Verify stops
    let pickupStopOid = new Types.ObjectId(data.pickupStopId);
    let dropStopOid = data.dropStopId ? new Types.ObjectId(data.dropStopId) : pickupStopOid;

    const [pickupStop, dropStop] = await Promise.all([
      TransportStop.findOne({ _id: pickupStopOid, tenantId: new Types.ObjectId(tenantId), isDeleted: false }),
      TransportStop.findOne({ _id: dropStopOid, tenantId: new Types.ObjectId(tenantId), isDeleted: false }),
    ]);

    if (!pickupStop) {
      throw new BadRequestError('Pickup stop not found.');
    }
    if (!dropStop) {
      throw new BadRequestError('Drop-off stop not found.');
    }

    // Atomic Capacity Check
    const setting = await TransportSetting.findOne({
      tenantId: new Types.ObjectId(tenantId),
      campusId: campusOid,
      isDeleted: false,
    });

    const maxOversubPercentage = setting?.allowOversubscription ? (setting.maxOversubscriptionPercentage || 0) : 0;
    const baseCapacity = route.maxCapacity || 40;
    const effectiveMaxCapacity = Math.floor(baseCapacity * (1 + maxOversubPercentage / 100));

    // Atomically increment assignedCount if below effectiveMaxCapacity
    const updatedRoute = await TransportRoute.findOneAndUpdate(
      {
        _id: routeOid,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
        assignedCount: { $lt: effectiveMaxCapacity },
      },
      {
        $inc: { assignedCount: 1 },
      },
      { new: true }
    );

    if (!updatedRoute) {
      throw new BadRequestError(
        `Route capacity exceeded. Route '${route.name}' has reached its maximum capacity of ${effectiveMaxCapacity} seats.`
      );
    }

    // Zero-float Fare Calculation
    let calculatedFareMinorUnits = 0;
    if (data.fareMinorUnits !== undefined) {
      calculatedFareMinorUnits = Math.round(data.fareMinorUnits);
    } else {
      const pickupStopInRoute = (route.stops || []).find((s: any) => s.stopId.toString() === pickupStopOid.toString());
      const dropStopInRoute = (route.stops || []).find((s: any) => s.stopId.toString() === dropStopOid.toString());

      const pickupFare = pickupStopInRoute?.pickupFareMinorUnits ?? pickupStop.standardFareMinorUnits ?? 0;
      const dropFare = dropStopInRoute?.dropFareMinorUnits ?? dropStop.standardFareMinorUnits ?? 0;
      calculatedFareMinorUnits = Money.add(pickupFare, dropFare);
    }

    const assignment = await StudentTransportAssignment.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: campusOid,
      studentId: studentOid,
      routeId: routeOid,
      pickupStopId: pickupStopOid,
      dropStopId: dropStopOid,
      direction: data.direction || 'BOTH',
      startDate: new Date(data.startDate || new Date()),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      seatNumber: data.seatNumber,
      fareMinorUnits: calculatedFareMinorUnits,
      status: TransportAssignmentStatus.ACTIVE,
      notes: data.notes,
    });

    return assignment;
  }

  public static async getAssignments(
    tenantId: string,
    schoolId: string,
    filters: {
      campusId?: string;
      routeId?: string;
      studentId?: string;
      status?: TransportAssignmentStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (filters.campusId) query.campusId = new Types.ObjectId(filters.campusId);
    if (filters.routeId) query.routeId = new Types.ObjectId(filters.routeId);
    if (filters.studentId) query.studentId = new Types.ObjectId(filters.studentId);
    if (filters.status) query.status = filters.status;

    const [items, total] = await Promise.all([
      StudentTransportAssignment.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber classId sectionId')
        .populate('routeId', 'name code defaultVehicleId defaultDriverId')
        .populate('pickupStopId', 'name code landmark')
        .populate('dropStopId', 'name code landmark')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StudentTransportAssignment.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getAssignmentById(tenantId: string, assignmentId: string) {
    const assignment = await StudentTransportAssignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber classId sectionId')
      .populate({
        path: 'routeId',
        populate: [
          { path: 'defaultVehicleId', select: 'registrationNumber make model seatingCapacity' },
          { path: 'defaultDriverId', populate: { path: 'employeeId', select: 'firstName lastName phone' } },
        ],
      })
      .populate('pickupStopId', 'name code landmark standardFareMinorUnits')
      .populate('dropStopId', 'name code landmark standardFareMinorUnits');

    if (!assignment) {
      throw new NotFoundError('Transport assignment not found.');
    }

    return assignment;
  }

  public static async updateAssignment(
    tenantId: string,
    assignmentId: string,
    data: any
  ) {
    const assignment = await StudentTransportAssignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Transport assignment not found.');
    }

    if (data.pickupStopId) assignment.pickupStopId = new Types.ObjectId(data.pickupStopId);
    if (data.dropStopId) assignment.dropStopId = new Types.ObjectId(data.dropStopId);
    if (data.direction) assignment.direction = data.direction;
    if (data.seatNumber !== undefined) assignment.seatNumber = data.seatNumber;
    if (data.fareMinorUnits !== undefined) assignment.fareMinorUnits = Math.round(data.fareMinorUnits);
    if (data.notes !== undefined) assignment.notes = data.notes;
    if (data.endDate) assignment.endDate = new Date(data.endDate);

    await assignment.save();
    return assignment;
  }

  public static async cancelAssignment(
    tenantId: string,
    assignmentId: string,
    data: { reason?: string }
  ) {
    const assignment = await StudentTransportAssignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!assignment) {
      throw new NotFoundError('Transport assignment not found.');
    }

    if (assignment.status !== TransportAssignmentStatus.ACTIVE) {
      throw new BadRequestError(`Cannot cancel assignment: status is already ${assignment.status.toLowerCase()}.`);
    }

    assignment.status = TransportAssignmentStatus.CANCELLED;
    assignment.endDate = new Date();
    if (data.reason) {
      assignment.notes = assignment.notes ? `${assignment.notes} | Cancellation Reason: ${data.reason}` : data.reason;
    }

    await assignment.save();

    // Decrement route assignedCount atomically
    await TransportRoute.findByIdAndUpdate(assignment.routeId, {
      $inc: { assignedCount: -1 },
    });

    return assignment;
  }

  public static async getAssignmentsForStudent(
    tenantId: string,
    studentId: string
  ) {
    return StudentTransportAssignment.find({
      tenantId: new Types.ObjectId(tenantId),
      studentId: new Types.ObjectId(studentId),
      isDeleted: false,
    })
      .populate({
        path: 'routeId',
        populate: [
          { path: 'defaultVehicleId', select: 'registrationNumber make model seatingCapacity' },
          { path: 'defaultDriverId', populate: { path: 'employeeId', select: 'firstName lastName phone' } },
        ],
      })
      .populate('pickupStopId', 'name code landmark')
      .populate('dropStopId', 'name code landmark')
      .sort({ createdAt: -1 });
  }
}
