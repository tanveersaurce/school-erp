import { Schema, model, Types } from 'mongoose';
import { IHostel, IRoom, IBed, IHostelAllocation } from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IHostelDoc extends Omit<IHostel, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IRoomDoc extends Omit<IRoom, 'id' | 'tenantId' | 'hostelId'> {
  tenantId: Types.ObjectId;
  hostelId: Types.ObjectId;
}

export interface IBedDoc extends Omit<IBed, 'id' | 'tenantId' | 'hostelId' | 'roomId'> {
  tenantId: Types.ObjectId;
  hostelId: Types.ObjectId;
  roomId: Types.ObjectId;
}

export interface IHostelAllocationDoc extends Omit<
  IHostelAllocation,
  'id' | 'tenantId' | 'studentId' | 'hostelId' | 'roomId' | 'bedId' | 'academicYearId'
> {
  tenantId: Types.ObjectId;
  studentId: Types.ObjectId;
  hostelId: Types.ObjectId;
  roomId: Types.ObjectId;
  bedId: Types.ObjectId;
  academicYearId: Types.ObjectId;
}

// 1. Hostel Schema
const HostelSchema = new Schema<IHostelDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['BOYS', 'GIRLS', 'COED'], required: true },
    wardenName: { type: String, trim: true },
    wardenPhone: { type: String, trim: true },
    address: { type: String },
    totalRooms: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
HostelSchema.plugin(tenantPlugin);
HostelSchema.plugin(softDeletePlugin);
HostelSchema.index({ tenantId: 1, schoolId: 1, name: 1 }, { unique: true });

// 2. Room Schema
const RoomSchema = new Schema<IRoomDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    roomNumber: { type: String, required: true, uppercase: true, trim: true },
    floor: { type: Number, required: true },
    capacity: { type: Number, required: true, min: 1 },
    roomType: {
      type: String,
      enum: ['STANDARD', 'DELUXE', 'DORMITORY'],
      default: 'STANDARD',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
RoomSchema.plugin(tenantPlugin);
RoomSchema.plugin(softDeletePlugin);
RoomSchema.index({ tenantId: 1, hostelId: 1, roomNumber: 1 }, { unique: true });

// 3. Bed Schema
const BedSchema = new Schema<IBedDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    bedNumber: { type: String, required: true, uppercase: true, trim: true },
    isOccupied: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
BedSchema.plugin(tenantPlugin);
BedSchema.index({ tenantId: 1, roomId: 1, bedNumber: 1 }, { unique: true });

// 4. HostelAllocation Schema
const HostelAllocationSchema = new Schema<IHostelAllocationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    allocationDate: { type: Date, required: true, default: Date.now },
    vacatingDate: { type: Date },
    status: {
      type: String,
      enum: ['ALLOCATED', 'VACATED'],
      default: 'ALLOCATED',
      required: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: '__v' }
);
HostelAllocationSchema.plugin(tenantPlugin);
HostelAllocationSchema.index(
  { tenantId: 1, bedId: 1 },
  { unique: true, partialFilterExpression: { status: 'ALLOCATED' } }
);
HostelAllocationSchema.index(
  { tenantId: 1, studentId: 1, academicYearId: 1 },
  { unique: true, partialFilterExpression: { status: 'ALLOCATED' } }
);

export const Hostel = model<IHostelDoc>('Hostel', HostelSchema);
export const Room = model<IRoomDoc>('Room', RoomSchema);
export const Bed = model<IBedDoc>('Bed', BedSchema);
export const HostelAllocation = model<IHostelAllocationDoc>(
  'HostelAllocation',
  HostelAllocationSchema
);
