import { Schema, model, Types } from 'mongoose';
import {
  IHostel,
  IHostelBuilding,
  IHostelFloor,
  IHostelRoomType,
  IHostelRoom,
  IHostelBed,
  IHostelStaffAssignment,
  IHostelStudentAllocation,
  IHostelAttendance,
  IHostelOuting,
  IHostelIncident,
  IHostelRoomInspection,
  IHostelMaintenance,
  IHostelDocument,
  IHostelFeeAssignment,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// ============================================================================
// 1. Document Interfaces
// ============================================================================

export interface IHostelDoc extends Omit<IHostel, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'wardenId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
  wardenId?: Types.ObjectId;
}

export interface IHostelBuildingDoc extends Omit<IHostelBuilding, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
}

export interface IHostelFloorDoc extends Omit<IHostelFloor, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'buildingId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
  buildingId: Types.ObjectId;
}

export interface IHostelRoomTypeDoc extends Omit<IHostelRoomType, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
}

export interface IHostelRoomDoc extends Omit<IHostelRoom, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'buildingId' | 'floorId' | 'roomTypeId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
  buildingId?: Types.ObjectId;
  floorId?: Types.ObjectId;
  roomTypeId?: Types.ObjectId;
}

export interface IHostelBedDoc extends Omit<IHostelBed, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'buildingId' | 'floorId' | 'roomId' | 'currentStudentId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId?: Types.ObjectId;
  buildingId?: Types.ObjectId;
  floorId?: Types.ObjectId;
  roomId: Types.ObjectId;
  currentStudentId?: Types.ObjectId;
}

export interface IHostelStaffAssignmentDoc extends Omit<IHostelStaffAssignment, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'buildingId' | 'floorId' | 'employeeId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
  buildingId?: Types.ObjectId;
  floorId?: Types.ObjectId;
  employeeId: Types.ObjectId;
}

export interface IHostelAllocationDoc extends Omit<
  IHostelStudentAllocation,
  'id' | 'tenantId' | 'schoolId' | 'campusId' | 'studentId' | 'academicYearId' | 'hostelId' | 'buildingId' | 'floorId' | 'roomId' | 'bedId' | 'previousAllocationId' | 'allocatedBy' | 'checkedInBy' | 'checkedOutBy'
> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  hostelId: Types.ObjectId;
  buildingId?: Types.ObjectId;
  floorId?: Types.ObjectId;
  roomId: Types.ObjectId;
  bedId: Types.ObjectId;
  previousAllocationId?: Types.ObjectId;
  allocatedBy?: Types.ObjectId;
  checkedInBy?: Types.ObjectId;
  checkedOutBy?: Types.ObjectId;
}

export interface IHostelAttendanceDoc extends Omit<IHostelAttendance, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'studentId' | 'markedBy'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
  studentId: Types.ObjectId;
  markedBy: Types.ObjectId;
}

export interface IHostelOutingDoc extends Omit<IHostelOuting, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'studentId' | 'hostelId' | 'approvedBy'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  hostelId: Types.ObjectId;
  approvedBy?: Types.ObjectId;
}

export interface IHostelIncidentDoc extends Omit<IHostelIncident, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'buildingId' | 'roomId' | 'studentId' | 'reportedBy' | 'resolvedBy'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
  buildingId?: Types.ObjectId;
  roomId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  reportedBy: Types.ObjectId;
  resolvedBy?: Types.ObjectId;
}

export interface IHostelRoomInspectionDoc extends Omit<IHostelRoomInspection, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'buildingId' | 'roomId' | 'inspector'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
  buildingId?: Types.ObjectId;
  roomId: Types.ObjectId;
  inspector: Types.ObjectId;
}

export interface IHostelMaintenanceDoc extends Omit<IHostelMaintenance, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId' | 'buildingId' | 'roomId' | 'bedId' | 'reportedBy' | 'assignedTo'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
  buildingId?: Types.ObjectId;
  roomId?: Types.ObjectId;
  bedId?: Types.ObjectId;
  reportedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId;
}

export interface IHostelDocumentDoc extends Omit<IHostelDocument, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'hostelId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  hostelId: Types.ObjectId;
}

export interface IHostelFeeAssignmentDoc extends Omit<IHostelFeeAssignment, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'studentId' | 'academicYearId' | 'hostelId' | 'roomId' | 'invoiceId'> {
  tenantId: Types.ObjectId;
  schoolId?: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  hostelId: Types.ObjectId;
  roomId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
}

// ============================================================================
// 2. Schemas
// ============================================================================

// 1. Hostel Schema
const HostelSchema = new Schema<IHostelDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      default: function (this: any) {
        return this.name
          ? this.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase()
          : 'HOSTEL';
      },
    },
    type: {
      type: String,
      enum: ['BOYS', 'GIRLS', 'MIXED', 'STAFF', 'COED', 'OTHER'],
      default: 'BOYS',
      required: true,
      index: true,
    },
    description: { type: String },
    address: { type: String },
    contact: {
      phone: { type: String },
      email: { type: String },
    },
    wardenId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    wardenName: { type: String, trim: true },
    wardenPhone: { type: String, trim: true },
    capacity: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED'],
      default: 'ACTIVE',
      index: true,
    },
    settings: {
      genderPolicy: {
        type: String,
        enum: ['MALE_ONLY', 'FEMALE_ONLY', 'COED', 'RESTRICTED'],
        default: 'MALE_ONLY',
      },
      curfewTime: { type: String, default: '21:00' },
      visitorPolicy: { type: String },
      attendancePolicy: { type: String },
      roomAllocationPolicy: { type: String },
      feeConfiguration: {
        defaultFeeModel: {
          type: String,
          enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'CUSTOM'],
          default: 'QUARTERLY',
        },
        messFeeIncluded: { type: Boolean, default: true },
        cautionDepositRequired: { type: Boolean, default: true },
      },
      incidentEscalationPolicy: { type: String },
      guardianNotificationPolicy: {
        notifyOnCheckIn: { type: Boolean, default: true },
        notifyOnCheckOut: { type: Boolean, default: true },
        notifyOnOutingRequest: { type: Boolean, default: true },
        notifyOnOverdue: { type: Boolean, default: true },
        notifyOnIncident: { type: Boolean, default: true },
      },
    },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelSchema.plugin(tenantPlugin);
HostelSchema.plugin(softDeletePlugin);
HostelSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
HostelSchema.index({ tenantId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// 2. Hostel Building Schema
const HostelBuildingSchema = new Schema<IHostelBuildingDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    numberOfFloors: { type: Number, default: 1, min: 1 },
    active: { type: Boolean, default: true },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelBuildingSchema.plugin(tenantPlugin);
HostelBuildingSchema.plugin(softDeletePlugin);
HostelBuildingSchema.index({ tenantId: 1, hostelId: 1, code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
HostelBuildingSchema.index({ tenantId: 1, hostelId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// 3. Hostel Floor Schema
const HostelFloorSchema = new Schema<IHostelFloorDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding', required: true, index: true },
    name: { type: String, required: true, trim: true },
    floorNumber: { type: Number, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelFloorSchema.plugin(tenantPlugin);
HostelFloorSchema.plugin(softDeletePlugin);
HostelFloorSchema.index({ tenantId: 1, buildingId: 1, floorNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
HostelFloorSchema.index({ tenantId: 1, buildingId: 1, code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// 4. Hostel Room Type Schema
const HostelRoomTypeSchema = new Schema<IHostelRoomTypeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED', 'DORMITORY', 'OTHER'],
      default: 'DOUBLE',
      required: true,
    },
    expectedCapacity: { type: Number, required: true, min: 1 },
    genderEligibility: {
      type: String,
      enum: ['MALE', 'FEMALE', 'ANY'],
      default: 'ANY',
      required: true,
    },
    baseRateMinorUnits: { type: Number, default: 0 },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelRoomTypeSchema.plugin(tenantPlugin);
HostelRoomTypeSchema.plugin(softDeletePlugin);
HostelRoomTypeSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// 5. Room Schema
const RoomSchema = new Schema<IHostelRoomDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding', required: false, index: true },
    floorId: { type: Schema.Types.ObjectId, ref: 'HostelFloor', required: false, index: true },
    roomNumber: { type: String, required: true, uppercase: true, trim: true },
    floor: { type: Number, required: true, default: 1 },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'HostelRoomType' },
    roomType: {
      type: String,
      default: 'STANDARD',
    },
    capacity: { type: Number, required: true, min: 1 },
    occupiedBedsCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['AVAILABLE', 'PARTIALLY_OCCUPIED', 'FULL', 'MAINTENANCE', 'CLOSED'],
      default: 'AVAILABLE',
      index: true,
    },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
RoomSchema.plugin(tenantPlugin);
RoomSchema.plugin(softDeletePlugin);
RoomSchema.index({ tenantId: 1, hostelId: 1, roomNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// 6. Bed Schema
const BedSchema = new Schema<IHostelBedDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: false, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding', required: false, index: true },
    floorId: { type: Schema.Types.ObjectId, ref: 'HostelFloor', required: false },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    bedNumber: { type: String, required: true, uppercase: true, trim: true },
    code: { type: String, uppercase: true, trim: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED', 'RETIRED'],
      default: 'AVAILABLE',
      index: true,
    },
    isOccupied: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    currentStudentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
BedSchema.plugin(tenantPlugin);
BedSchema.plugin(softDeletePlugin);
BedSchema.index({ tenantId: 1, roomId: 1, bedNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// 7. Staff & Warden Assignment Schema
const HostelStaffAssignmentSchema = new Schema<IHostelStaffAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding' },
    floorId: { type: Schema.Types.ObjectId, ref: 'HostelFloor' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    role: {
      type: String,
      enum: ['WARDEN', 'ASSISTANT_WARDEN', 'CARETAKER', 'SECURITY', 'STAFF'],
      default: 'CARETAKER',
      required: true,
    },
    shift: { type: String },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelStaffAssignmentSchema.plugin(tenantPlugin);
HostelStaffAssignmentSchema.plugin(softDeletePlugin);
HostelStaffAssignmentSchema.index({ tenantId: 1, hostelId: 1, employeeId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false, status: 'ACTIVE' } });

// 8. Hostel Student Allocation Schema
const HostelAllocationSchema = new Schema<IHostelAllocationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding', required: false, index: true },
    floorId: { type: Schema.Types.ObjectId, ref: 'HostelFloor' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    allocationDate: { type: Date, required: true, default: Date.now },
    expectedCheckInDate: { type: Date },
    expectedCheckOutDate: { type: Date },
    actualCheckInDate: { type: Date },
    actualCheckOutDate: { type: Date },
    vacatingDate: { type: Date },
    status: {
      type: String,
      enum: ['PENDING', 'ALLOCATED', 'CHECKED_IN', 'TRANSFERRED', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED', 'VACATED'],
      default: 'ALLOCATED',
      required: true,
      index: true,
    },
    reason: { type: String },
    transferReason: {
      type: String,
      enum: ['ROOM_CHANGE', 'DISCIPLINARY', 'MEDICAL', 'CAPACITY', 'MAINTENANCE', 'REQUESTED', 'OTHER'],
    },
    transferRemarks: { type: String },
    previousAllocationId: { type: Schema.Types.ObjectId, ref: 'HostelAllocation' },
    checkoutReason: { type: String },
    clearanceStatus: {
      type: String,
      enum: ['PENDING', 'CLEARED', 'WITHHELD'],
      default: 'CLEARED',
    },
    allocatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedInBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedOutBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelAllocationSchema.plugin(tenantPlugin);
HostelAllocationSchema.plugin(softDeletePlugin);

// Partial compound indexes preventing double booking on active allocations
HostelAllocationSchema.index(
  { tenantId: 1, bedId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['ALLOCATED', 'CHECKED_IN'] } } }
);
HostelAllocationSchema.index(
  { tenantId: 1, studentId: 1, academicYearId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['ALLOCATED', 'CHECKED_IN'] } } }
);

// 9. Residential Attendance Schema
const HostelAttendanceSchema = new Schema<IHostelAttendanceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LEAVE', 'OUT', 'EXCUSED'],
      default: 'PRESENT',
      required: true,
      index: true,
    },
    markedAt: { type: Date, default: Date.now },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: { type: String },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelAttendanceSchema.plugin(tenantPlugin);
HostelAttendanceSchema.plugin(softDeletePlugin);
HostelAttendanceSchema.index({ tenantId: 1, hostelId: 1, studentId: 1, date: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// 10. Student Outing / Leave Schema
const HostelOutingSchema = new Schema<IHostelOutingDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    startDateTime: { type: Date, required: true },
    expectedReturnDateTime: { type: Date, required: true },
    actualReturnDateTime: { type: Date },
    reason: { type: String, required: true },
    destination: { type: String, required: true },
    guardianApproval: {
      required: { type: Boolean, default: false },
      approved: { type: Boolean, default: false },
      approvedAt: { type: Date },
      approvedByGuardianId: { type: Schema.Types.ObjectId, ref: 'Guardian' },
      remarks: { type: String },
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'OUT', 'RETURNED', 'CANCELLED', 'OVERDUE'],
      default: 'REQUESTED',
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    rejectionReason: { type: String },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelOutingSchema.plugin(tenantPlugin);
HostelOutingSchema.plugin(softDeletePlugin);
HostelOutingSchema.index({ tenantId: 1, hostelId: 1, status: 1 });
HostelOutingSchema.index({ tenantId: 1, studentId: 1, startDateTime: -1 });

// 11. Incident Management Schema
const HostelIncidentSchema = new Schema<IHostelIncidentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    affectedStudents: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    type: {
      type: String,
      enum: ['MEDICAL', 'DISCIPLINARY', 'SAFETY', 'PROPERTY_DAMAGE', 'MISSING_ITEM', 'CONFLICT', 'ABSENCE', 'OTHER'],
      default: 'DISCIPLINARY',
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      required: true,
    },
    occurredAt: { type: Date, required: true, default: Date.now },
    reportedAt: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true },
    immediateActionTaken: { type: String },
    resolution: { type: String },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelIncidentSchema.plugin(tenantPlugin);
HostelIncidentSchema.plugin(softDeletePlugin);
HostelIncidentSchema.index({ tenantId: 1, hostelId: 1, status: 1 });

// 12. Room Inspection Schema
const HostelRoomInspectionSchema = new Schema<IHostelRoomInspectionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    inspectionDate: { type: Date, required: true, default: Date.now },
    inspector: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cleanliness: { type: Number, default: 5, min: 1, max: 5 },
    safety: { type: Number, default: 5, min: 1, max: 5 },
    electrical: { type: Number, default: 5, min: 1, max: 5 },
    furniture: { type: Number, default: 5, min: 1, max: 5 },
    plumbing: { type: Number, default: 5, min: 1, max: 5 },
    remarks: { type: String },
    issuesFound: [{ type: String }],
    status: {
      type: String,
      enum: ['PASSED', 'FAILED', 'NEEDS_ATTENTION'],
      default: 'PASSED',
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelRoomInspectionSchema.plugin(tenantPlugin);
HostelRoomInspectionSchema.plugin(softDeletePlugin);
HostelRoomInspectionSchema.index({ tenantId: 1, roomId: 1, inspectionDate: -1 });

// 13. Hostel Maintenance Schema
const HostelMaintenanceSchema = new Schema<IHostelMaintenanceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: 'HostelBuilding' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    category: {
      type: String,
      enum: ['PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'PAINTING', 'APPLIANCE', 'CLEANING', 'FURNITURE', 'OTHER'],
      default: 'OTHER',
      required: true,
    },
    description: { type: String, required: true },
    reportedAt: { type: Date, required: true, default: Date.now },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    resolvedAt: { type: Date },
    resolution: { type: String },
    costMinorUnits: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelMaintenanceSchema.plugin(tenantPlugin);
HostelMaintenanceSchema.plugin(softDeletePlugin);
HostelMaintenanceSchema.index({ tenantId: 1, hostelId: 1, status: 1 });

// 14. Hostel Document Schema
const HostelDocumentSchema = new Schema<IHostelDocumentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    title: { type: String, required: true, trim: true },
    documentType: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['VALID', 'EXPIRED', 'PENDING'],
      default: 'VALID',
    },
    remarks: { type: String },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelDocumentSchema.plugin(tenantPlugin);
HostelDocumentSchema.plugin(softDeletePlugin);

// 15. Hostel Fee Assignment Schema
const HostelFeeAssignmentSchema = new Schema<IHostelFeeAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: false, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: false, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    billingFrequency: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'CUSTOM'],
      default: 'QUARTERLY',
      required: true,
    },
    baseAmountMinorUnits: { type: Number, required: true, default: 0 },
    messFeeMinorUnits: { type: Number, default: 0 },
    cautionDepositMinorUnits: { type: Number, default: 0 },
    totalAmountMinorUnits: { type: Number, required: true, default: 0 },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'FeeInvoice' },
    billingStatus: {
      type: String,
      enum: ['PENDING', 'INVOICED', 'PAID', 'WAIVED'],
      default: 'PENDING',
      index: true,
    },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date },
    isDeleted: { type: Boolean, default: false },
  } as any,
  { timestamps: true, versionKey: '__v' }
);
HostelFeeAssignmentSchema.plugin(tenantPlugin);
HostelFeeAssignmentSchema.plugin(softDeletePlugin);
HostelFeeAssignmentSchema.index({ tenantId: 1, studentId: 1, academicYearId: 1, hostelId: 1 });

// ============================================================================
// 3. Exported Models
// ============================================================================

export const Hostel = model<IHostelDoc>('Hostel', HostelSchema);
export const HostelBuilding = model<IHostelBuildingDoc>('HostelBuilding', HostelBuildingSchema);
export const HostelFloor = model<IHostelFloorDoc>('HostelFloor', HostelFloorSchema);
export const HostelRoomType = model<IHostelRoomTypeDoc>('HostelRoomType', HostelRoomTypeSchema);
export const Room = model<IHostelRoomDoc>('Room', RoomSchema);
export const HostelRoom = Room; // Alias
export const Bed = model<IHostelBedDoc>('Bed', BedSchema);
export const HostelBed = Bed; // Alias
export const HostelStaffAssignment = model<IHostelStaffAssignmentDoc>('HostelStaffAssignment', HostelStaffAssignmentSchema);
export const HostelAllocation = model<IHostelAllocationDoc>('HostelAllocation', HostelAllocationSchema);
export const HostelStudentAllocation = HostelAllocation; // Alias
export const HostelAttendance = model<IHostelAttendanceDoc>('HostelAttendance', HostelAttendanceSchema);
export const HostelOuting = model<IHostelOutingDoc>('HostelOuting', HostelOutingSchema);
export const HostelIncident = model<IHostelIncidentDoc>('HostelIncident', HostelIncidentSchema);
export const HostelRoomInspection = model<IHostelRoomInspectionDoc>('HostelRoomInspection', HostelRoomInspectionSchema);
export const HostelMaintenance = model<IHostelMaintenanceDoc>('HostelMaintenance', HostelMaintenanceSchema);
export const HostelDocument = model<IHostelDocumentDoc>('HostelDocument', HostelDocumentSchema);
export const HostelFeeAssignment = model<IHostelFeeAssignmentDoc>('HostelFeeAssignment', HostelFeeAssignmentSchema);
