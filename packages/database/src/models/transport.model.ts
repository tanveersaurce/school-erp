import { Schema, model, Types } from 'mongoose';
import {
  IVehicle,
  IDriver,
  IRoute,
  IRouteStop,
  IStudentTransportAssignment,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IVehicleDoc extends Omit<IVehicle, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IDriverDoc extends Omit<IDriver, 'id' | 'tenantId' | 'schoolId' | 'userId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  userId?: Types.ObjectId;
}

export interface IRouteDoc extends Omit<
  IRoute,
  'id' | 'tenantId' | 'schoolId' | 'vehicleId' | 'driverId'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  driverId?: Types.ObjectId;
}

export interface IRouteStopDoc extends Omit<IRouteStop, 'id' | 'tenantId' | 'routeId'> {
  tenantId: Types.ObjectId;
  routeId: Types.ObjectId;
}

export interface IStudentTransportAssignmentDoc extends Omit<
  IStudentTransportAssignment,
  'id' | 'tenantId' | 'studentId' | 'routeId' | 'stopId' | 'academicYearId'
> {
  tenantId: Types.ObjectId;
  studentId: Types.ObjectId;
  routeId: Types.ObjectId;
  stopId: Types.ObjectId;
  academicYearId: Types.ObjectId;
}

// 1. Vehicle Schema
const VehicleSchema = new Schema<IVehicleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    model: { type: String, trim: true },
    type: { type: String, enum: ['BUS', 'VAN', 'MINIBUS'], default: 'BUS', required: true },
    insuranceExpiry: { type: Date },
    fitnessExpiry: { type: Date },
    status: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'],
      default: 'ACTIVE',
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
VehicleSchema.plugin(tenantPlugin);
VehicleSchema.plugin(softDeletePlugin);
VehicleSchema.index({ tenantId: 1, schoolId: 1, vehicleNumber: 1 }, { unique: true });

// 2. Driver Schema
const DriverSchema = new Schema<IDriverDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, uppercase: true, trim: true },
    licenseExpiry: { type: Date, required: true },
    phone: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
DriverSchema.plugin(tenantPlugin);
DriverSchema.plugin(softDeletePlugin);
DriverSchema.index({ tenantId: 1, schoolId: 1, licenseNumber: 1 }, { unique: true });

// 3. Route Schema
const RouteSchema = new Schema<IRouteDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
RouteSchema.plugin(tenantPlugin);
RouteSchema.plugin(softDeletePlugin);
RouteSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 4. RouteStop Schema
const RouteStopSchema = new Schema<IRouteStopDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    stopName: { type: String, required: true, trim: true },
    sequenceOrder: { type: Number, required: true },
    pickupTime: { type: String },
    dropTime: { type: String },
    fare: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: '__v' }
);
RouteStopSchema.plugin(tenantPlugin);
RouteStopSchema.index({ tenantId: 1, routeId: 1, sequenceOrder: 1 }, { unique: true });

// 5. StudentTransportAssignment Schema
const StudentTransportAssignmentSchema = new Schema<IStudentTransportAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    stopId: { type: Schema.Types.ObjectId, ref: 'RouteStop', required: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE', required: true },
  },
  { timestamps: true, versionKey: '__v' }
);
StudentTransportAssignmentSchema.plugin(tenantPlugin);
StudentTransportAssignmentSchema.index(
  { tenantId: 1, academicYearId: 1, studentId: 1 },
  { unique: true }
);

export const Vehicle = model<IVehicleDoc>('Vehicle', VehicleSchema);
export const Driver = model<IDriverDoc>('Driver', DriverSchema);
export const Route = model<IRouteDoc>('Route', RouteSchema);
export const RouteStop = model<IRouteStopDoc>('RouteStop', RouteStopSchema);
export const StudentTransportAssignment = model<IStudentTransportAssignmentDoc>(
  'StudentTransportAssignment',
  StudentTransportAssignmentSchema
);
