import { Types } from 'mongoose';
import {
  HostelAllocation,
  Bed,
  Room,
  Hostel,
  Student,
  IHostelAllocationDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  HostelAllocationStatus,
  BedStatus,
} from '@edusphere/common';
import { HostelStructureService } from './hostel-structure.service.js';

export class HostelAllocationService {
  /**
   * Allocates a bed to a student.
   * Atomic bed occupancy check prevents double allocation.
   */
  public static async allocateBed(
    tenantId: Types.ObjectId,
    data: any,
    userId?: Types.ObjectId
  ): Promise<IHostelAllocationDoc> {
    const studentId = new Types.ObjectId(data.studentId.toString());
    const academicYearId = new Types.ObjectId(data.academicYearId.toString());
    const hostelId = new Types.ObjectId(data.hostelId.toString());
    const roomId = new Types.ObjectId(data.roomId.toString());
    const bedId = new Types.ObjectId(data.bedId.toString());

    // 1. Verify Student exists
    const student = await Student.findOne({
      _id: studentId,
      tenantId,
      isDeleted: false,
    });
    if (!student) {
      throw new NotFoundError('Student not found.');
    }

    // 2. Verify student has no active allocation for this academic year
    const existingStudentAlloc = await HostelAllocation.findOne({
      tenantId,
      studentId,
      academicYearId,
      status: { $in: [HostelAllocationStatus.ALLOCATED, HostelAllocationStatus.CHECKED_IN] },
      isDeleted: false,
    });
    if (existingStudentAlloc) {
      throw new ConflictError('Student already has an active hostel allocation for this academic year.');
    }

    // 3. Atomically check and reserve the bed
    const bed = await Bed.findOneAndUpdate(
      {
        _id: bedId,
        tenantId,
        roomId,
        status: BedStatus.AVAILABLE,
        isOccupied: false,
        isDeleted: false,
        active: true,
      },
      {
        status: BedStatus.OCCUPIED,
        isOccupied: true,
        currentStudentId: studentId,
      },
      { new: true }
    );

    if (!bed) {
      throw new ConflictError('The selected bed is no longer available or does not exist.');
    }

    // 4. Create the allocation record
    try {
      const allocation = new HostelAllocation({
        tenantId,
        schoolId: data.schoolId || bed.schoolId,
        campusId: data.campusId || bed.campusId,
        studentId,
        academicYearId,
        hostelId,
        buildingId: bed.buildingId,
        floorId: bed.floorId,
        roomId,
        bedId,
        allocationDate: data.allocationDate || new Date(),
        expectedCheckInDate: data.expectedCheckInDate,
        expectedCheckOutDate: data.expectedCheckOutDate,
        reason: data.reason,
        status: HostelAllocationStatus.ALLOCATED,
        allocatedBy: userId,
      });
      await allocation.save();

      // Synchronize room counts
      await HostelStructureService.syncRoomCapacity(tenantId, roomId);

      return allocation;
    } catch (err: any) {
      // Rollback bed state if allocation save failed (e.g. partial unique index collision)
      await Bed.updateOne(
        { _id: bedId },
        { status: BedStatus.AVAILABLE, isOccupied: false, $unset: { currentStudentId: 1 } }
      );
      await HostelStructureService.syncRoomCapacity(tenantId, roomId);

      if (err.code === 11000) {
        throw new ConflictError('Bed is already allocated or student is already allocated.');
      }
      throw err;
    }
  }

  /**
   * Records student check-in.
   */
  public static async checkIn(
    tenantId: Types.ObjectId,
    allocationId: string | Types.ObjectId,
    data: any,
    userId?: Types.ObjectId
  ): Promise<IHostelAllocationDoc> {
    const allocation = await HostelAllocation.findOne({
      _id: new Types.ObjectId(allocationId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!allocation) {
      throw new NotFoundError('Hostel allocation not found.');
    }

    if (allocation.status === HostelAllocationStatus.CHECKED_IN) {
      throw new ConflictError('Student is already checked in.');
    }

    if (allocation.status !== HostelAllocationStatus.ALLOCATED && allocation.status !== HostelAllocationStatus.PENDING) {
      throw new ValidationError(`Cannot check in allocation with status "${allocation.status}".`);
    }

    allocation.status = HostelAllocationStatus.CHECKED_IN;
    allocation.actualCheckInDate = data.checkInDate || new Date();
    allocation.checkedInBy = userId;
    await allocation.save();

    // Ensure bed is occupied by this student
    await Bed.updateOne(
      { _id: allocation.bedId, tenantId },
      { status: BedStatus.OCCUPIED, isOccupied: true, currentStudentId: allocation.studentId }
    );

    await HostelStructureService.syncRoomCapacity(tenantId, allocation.roomId);
    return allocation;
  }

  /**
   * Records student check-out.
   */
  public static async checkOut(
    tenantId: Types.ObjectId,
    allocationId: string | Types.ObjectId,
    data: any,
    userId?: Types.ObjectId
  ): Promise<IHostelAllocationDoc> {
    const allocation = await HostelAllocation.findOne({
      _id: new Types.ObjectId(allocationId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!allocation) {
      throw new NotFoundError('Hostel allocation not found.');
    }

    if (
      allocation.status !== HostelAllocationStatus.CHECKED_IN &&
      allocation.status !== HostelAllocationStatus.ALLOCATED
    ) {
      throw new ValidationError(`Cannot check out allocation with status "${allocation.status}".`);
    }

    allocation.status = HostelAllocationStatus.CHECKED_OUT;
    allocation.actualCheckOutDate = data.checkOutDate || new Date();
    allocation.vacatingDate = allocation.actualCheckOutDate;
    allocation.checkoutReason = data.checkoutReason;
    allocation.clearanceStatus = data.clearanceStatus || 'CLEARED';
    allocation.checkedOutBy = userId;
    await allocation.save();

    // Release bed back to AVAILABLE
    await Bed.updateOne(
      { _id: allocation.bedId, tenantId },
      {
        status: BedStatus.AVAILABLE,
        isOccupied: false,
        $unset: { currentStudentId: 1 },
      }
    );

    await HostelStructureService.syncRoomCapacity(tenantId, allocation.roomId);
    return allocation;
  }

  /**
   * Transfers a student to a new bed.
   * Never overwrites historical allocations:
   * 1. Closes old allocation with status TRANSFERRED.
   * 2. Atomically reserves new bed.
   * 3. Creates new allocation referencing previousAllocationId.
   */
  public static async transferBed(
    tenantId: Types.ObjectId,
    allocationId: string | Types.ObjectId,
    data: any,
    userId?: Types.ObjectId
  ): Promise<IHostelAllocationDoc> {
    const oldAllocation = await HostelAllocation.findOne({
      _id: new Types.ObjectId(allocationId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!oldAllocation) {
      throw new NotFoundError('Active hostel allocation not found.');
    }

    if (
      oldAllocation.status !== HostelAllocationStatus.ALLOCATED &&
      oldAllocation.status !== HostelAllocationStatus.CHECKED_IN
    ) {
      throw new ValidationError(`Cannot transfer allocation with status "${oldAllocation.status}".`);
    }

    const newBedId = new Types.ObjectId(data.newBedId.toString());
    const newRoomId = new Types.ObjectId(data.newRoomId.toString());
    const newHostelId = new Types.ObjectId(data.newHostelId.toString());

    if (oldAllocation.bedId.equals(newBedId)) {
      throw new ConflictError('Cannot transfer to the same bed currently occupied.');
    }

    // 1. Atomically reserve the new bed
    const newBed = await Bed.findOneAndUpdate(
      {
        _id: newBedId,
        tenantId,
        roomId: newRoomId,
        status: BedStatus.AVAILABLE,
        isOccupied: false,
        isDeleted: false,
        active: true,
      },
      {
        status: BedStatus.OCCUPIED,
        isOccupied: true,
        currentStudentId: oldAllocation.studentId,
      },
      { new: true }
    );

    if (!newBed) {
      throw new ConflictError('Target bed is not available for transfer.');
    }

    try {
      // 2. Close old allocation as TRANSFERRED
      const wasCheckedIn = oldAllocation.status === HostelAllocationStatus.CHECKED_IN;
      oldAllocation.status = HostelAllocationStatus.TRANSFERRED;
      oldAllocation.actualCheckOutDate = data.effectiveDate || new Date();
      oldAllocation.transferReason = data.transferReason;
      oldAllocation.transferRemarks = data.transferRemarks;
      await oldAllocation.save();

      // 3. Release old bed
      await Bed.updateOne(
        { _id: oldAllocation.bedId, tenantId },
        {
          status: BedStatus.AVAILABLE,
          isOccupied: false,
          $unset: { currentStudentId: 1 },
        }
      );

      // 4. Create new allocation
      const newAllocation = new HostelAllocation({
        tenantId,
        schoolId: oldAllocation.schoolId,
        campusId: oldAllocation.campusId,
        studentId: oldAllocation.studentId,
        academicYearId: oldAllocation.academicYearId,
        hostelId: newHostelId,
        buildingId: newBed.buildingId,
        floorId: newBed.floorId,
        roomId: newRoomId,
        bedId: newBedId,
        allocationDate: data.effectiveDate || new Date(),
        actualCheckInDate: wasCheckedIn ? (data.effectiveDate || new Date()) : undefined,
        status: wasCheckedIn ? HostelAllocationStatus.CHECKED_IN : HostelAllocationStatus.ALLOCATED,
        previousAllocationId: oldAllocation._id,
        reason: `Transferred from room bed. Reason: ${data.transferReason || 'Room Change'}`,
        allocatedBy: userId,
      });
      await newAllocation.save();

      // 5. Recalculate room capacities for both old and new rooms
      await HostelStructureService.syncRoomCapacity(tenantId, oldAllocation.roomId);
      await HostelStructureService.syncRoomCapacity(tenantId, newRoomId);

      return newAllocation;
    } catch (err) {
      // Rollback new bed if transfer failed
      await Bed.updateOne(
        { _id: newBedId },
        { status: BedStatus.AVAILABLE, isOccupied: false, $unset: { currentStudentId: 1 } }
      );
      throw err;
    }
  }

  /**
   * Cancels an allocation before check-in.
   */
  public static async cancelAllocation(
    tenantId: Types.ObjectId,
    allocationId: string | Types.ObjectId,
    reason?: string
  ): Promise<IHostelAllocationDoc> {
    const allocation = await HostelAllocation.findOne({
      _id: new Types.ObjectId(allocationId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!allocation) {
      throw new NotFoundError('Hostel allocation not found.');
    }

    if (allocation.status !== HostelAllocationStatus.ALLOCATED && allocation.status !== HostelAllocationStatus.PENDING) {
      throw new ValidationError(`Cannot cancel allocation with status "${allocation.status}".`);
    }

    allocation.status = HostelAllocationStatus.CANCELLED;
    allocation.checkoutReason = reason || 'Allocation cancelled';
    await allocation.save();

    await Bed.updateOne(
      { _id: allocation.bedId, tenantId },
      {
        status: BedStatus.AVAILABLE,
        isOccupied: false,
        $unset: { currentStudentId: 1 },
      }
    );

    await HostelStructureService.syncRoomCapacity(tenantId, allocation.roomId);
    return allocation;
  }

  /**
   * Retrieves allocations with pagination and filtering.
   */
  public static async getAllocations(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<{ data: IHostelAllocationDoc[]; total: number }> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId.toString());
    if (filter.roomId) query.roomId = new Types.ObjectId(filter.roomId.toString());
    if (filter.academicYearId) query.academicYearId = new Types.ObjectId(filter.academicYearId.toString());
    if (filter.status) query.status = filter.status;

    const limit = Math.min(filter.limit || 50, 100);
    const skip = filter.skip || 0;

    const [data, total] = await Promise.all([
      HostelAllocation.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber grade section')
        .populate('hostelId', 'name code type')
        .populate('roomId', 'roomNumber floor')
        .populate('bedId', 'bedNumber code')
        .sort({ allocationDate: -1 })
        .skip(skip)
        .limit(limit),
      HostelAllocation.countDocuments(query),
    ]);
    return { data, total };
  }

  public static async getAllocationById(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<IHostelAllocationDoc> {
    const allocation = await HostelAllocation.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber grade section gender emergencyContact')
      .populate('hostelId')
      .populate('buildingId')
      .populate('roomId')
      .populate('bedId')
      .populate('previousAllocationId');

    if (!allocation) {
      throw new NotFoundError('Hostel allocation not found.');
    }
    return allocation;
  }

  /**
   * Gets current active allocation for a student.
   */
  public static async getStudentActiveAllocation(
    tenantId: Types.ObjectId,
    studentId: string | Types.ObjectId
  ): Promise<IHostelAllocationDoc | null> {
    return HostelAllocation.findOne({
      tenantId,
      studentId: new Types.ObjectId(studentId.toString()),
      status: { $in: [HostelAllocationStatus.ALLOCATED, HostelAllocationStatus.CHECKED_IN] },
      isDeleted: false,
    })
      .populate('hostelId')
      .populate('buildingId')
      .populate('roomId')
      .populate('bedId');
  }
}
