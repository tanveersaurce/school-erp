import { Types } from 'mongoose';
import {
  HostelStaffAssignment,
  Hostel,
  Employee,
  IHostelStaffAssignmentDoc,
} from '@edusphere/database';
import {
  NotFoundError,
  ConflictError,
  HostelStaffRole,
} from '@edusphere/common';

export class WardenService {
  public static async assignStaff(
    tenantId: Types.ObjectId,
    data: any
  ): Promise<IHostelStaffAssignmentDoc> {
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(data.employeeId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!employee) {
      throw new NotFoundError('Employee not found in this school.');
    }

    const hostel = await Hostel.findOne({
      _id: new Types.ObjectId(data.hostelId.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!hostel) {
      throw new NotFoundError('Hostel not found.');
    }

    // Check if active assignment exists for this employee in this hostel
    const existing = await HostelStaffAssignment.findOne({
      tenantId,
      hostelId: hostel._id,
      employeeId: employee._id,
      status: 'ACTIVE',
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError('Employee is already actively assigned to this hostel.');
    }

    const assignment = new HostelStaffAssignment({
      ...data,
      tenantId,
      hostelId: hostel._id,
      employeeId: employee._id,
      schoolId: data.schoolId || hostel.schoolId,
      status: 'ACTIVE',
    });
    await assignment.save();

    // If role is WARDEN, update hostel primary warden info
    if (data.role === HostelStaffRole.WARDEN) {
      const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      await Hostel.updateOne(
        { _id: hostel._id, tenantId },
        {
          wardenId: employee._id,
          wardenName: empName || undefined,
          wardenPhone: employee.workPhone || employee.personalPhone || undefined,
        }
      );
    }

    return assignment;
  }

  public static async getStaffAssignments(
    tenantId: Types.ObjectId,
    filter: any = {}
  ): Promise<IHostelStaffAssignmentDoc[]> {
    const query: any = { tenantId, isDeleted: false };
    if (filter.hostelId) query.hostelId = new Types.ObjectId(filter.hostelId.toString());
    if (filter.employeeId) query.employeeId = new Types.ObjectId(filter.employeeId.toString());
    if (filter.role) query.role = filter.role;
    if (filter.status) query.status = filter.status;

    return HostelStaffAssignment.find(query)
      .populate('employeeId', 'firstName lastName email phone designation employeeCode')
      .populate('hostelId', 'name code')
      .sort({ createdAt: -1 });
  }

  public static async updateStaffAssignment(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId,
    data: any
  ): Promise<IHostelStaffAssignmentDoc> {
    const assignment = await HostelStaffAssignment.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!assignment) {
      throw new NotFoundError('Staff assignment not found.');
    }

    Object.assign(assignment, data);
    await assignment.save();
    return assignment;
  }

  public static async removeStaffAssignment(
    tenantId: Types.ObjectId,
    id: string | Types.ObjectId
  ): Promise<void> {
    const assignment = await HostelStaffAssignment.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId,
      isDeleted: false,
    });
    if (!assignment) {
      throw new NotFoundError('Staff assignment not found.');
    }

    assignment.status = 'INACTIVE';
    assignment.endDate = new Date();
    assignment.isDeleted = true;
    await assignment.save();
  }
}
