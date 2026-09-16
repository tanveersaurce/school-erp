import { Schema, model, Types } from 'mongoose';
import {
  ITransportSetting,
  IVehicleType,
  IVehicle,
  IVehicleDocument,
  IDriverProfile,
  IDriverDocument,
  IAttendantProfile,
  ITransportRoute,
  ITransportRouteVersion,
  ITransportStop,
  IStudentTransportAssignment,
  ITransportTrip,
  ITripStudent,
  ITransportIncident,
  IVehicleMaintenance,
  IVehicleInspection,
  ITransportFeeAssignment,
} from '@edusphere/types';
import {
  VehicleStatus,
  VehicleTypeCode,
  VehicleDocumentType,
  TransportDocumentStatus,
  DriverStatus,
  DriverVerificationStatus,
  DriverDocumentType,
  RouteDirection,
  TransportAssignmentStatus,
  TripType,
  TripStatus,
  StudentTripStatus,
  TransportIncidentType,
  IncidentSeverity,
  IncidentStatus,
  VehicleServiceType,
  MaintenanceStatus,
  InspectionResult,
  TransportFeeFrequency,
  TransportFeeBillingStatus,
  BoardingVerificationPolicy,
  TransportFeeModel,
} from '@edusphere/common';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// ============================================================================
// Document Interfaces (Mongoose Document Types)
// ============================================================================

export interface ITransportSettingDoc
  extends Omit<ITransportSetting, 'id' | 'tenantId' | 'schoolId' | 'campusId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
}

export interface IVehicleTypeDoc
  extends Omit<IVehicleType, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IVehicleDoc
  extends Omit<
    IVehicle,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'vehicleTypeId' | 'currentRouteId' | 'primaryDriverId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  vehicleTypeId?: Types.ObjectId;
  currentRouteId?: Types.ObjectId;
  primaryDriverId?: Types.ObjectId;
}

export interface IVehicleDocumentDoc
  extends Omit<IVehicleDocument, 'id' | 'tenantId' | 'schoolId' | 'vehicleId' | 'uploadedBy'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  uploadedBy?: Types.ObjectId;
}

export interface IDriverProfileDoc
  extends Omit<IDriverProfile, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'employeeId' | 'userId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  employeeId: Types.ObjectId;
  userId?: Types.ObjectId;
}

export interface IDriverDocumentDoc
  extends Omit<IDriverDocument, 'id' | 'tenantId' | 'schoolId' | 'driverId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  driverId: Types.ObjectId;
}

export interface IAttendantProfileDoc
  extends Omit<IAttendantProfile, 'id' | 'tenantId' | 'schoolId' | 'campusId' | 'employeeId' | 'userId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  employeeId: Types.ObjectId;
  userId?: Types.ObjectId;
}

export interface ITransportRouteDoc
  extends Omit<
    ITransportRoute,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'defaultVehicleId' | 'defaultDriverId' | 'defaultAttendantId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  defaultVehicleId?: Types.ObjectId;
  defaultDriverId?: Types.ObjectId;
  defaultAttendantId?: Types.ObjectId;
}

export interface ITransportRouteVersionDoc
  extends Omit<ITransportRouteVersion, 'id' | 'tenantId' | 'schoolId' | 'routeId' | 'changedBy'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  routeId: Types.ObjectId;
  changedBy?: Types.ObjectId;
}

export interface ITransportStopDoc
  extends Omit<ITransportStop, 'id' | 'tenantId' | 'schoolId' | 'routeId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  routeId: Types.ObjectId;
}

export interface IStudentTransportAssignmentDoc
  extends Omit<
    IStudentTransportAssignment,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'studentId' | 'academicYearId' | 'routeId' | 'pickupStopId' | 'dropStopId' | 'vehicleId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  routeId: Types.ObjectId;
  pickupStopId: Types.ObjectId;
  dropStopId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
}

export interface ITransportTripDoc
  extends Omit<
    ITransportTrip,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'routeId' | 'vehicleId' | 'driverId' | 'attendantId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  routeId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  driverId: Types.ObjectId;
  attendantId?: Types.ObjectId;
}

export interface ITripStudentDoc
  extends Omit<
    ITripStudent,
    'id' | 'tenantId' | 'schoolId' | 'tripId' | 'studentId' | 'pickupStopId' | 'dropStopId' | 'markedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  tripId: Types.ObjectId;
  studentId: Types.ObjectId;
  pickupStopId: Types.ObjectId;
  dropStopId: Types.ObjectId;
  markedBy?: Types.ObjectId;
}

export interface ITransportIncidentDoc
  extends Omit<
    ITransportIncident,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'tripId' | 'vehicleId' | 'driverId' | 'attendantId' | 'studentId' | 'routeId' | 'stopId' | 'reportedBy' | 'resolvedBy'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  tripId?: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  driverId?: Types.ObjectId;
  attendantId?: Types.ObjectId;
  studentId?: Types.ObjectId;
  routeId?: Types.ObjectId;
  stopId?: Types.ObjectId;
  reportedBy: Types.ObjectId;
  resolvedBy?: Types.ObjectId;
}

export interface IVehicleMaintenanceDoc
  extends Omit<
    IVehicleMaintenance,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'vehicleId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  vehicleId: Types.ObjectId;
}

export interface IVehicleInspectionDoc
  extends Omit<
    IVehicleInspection,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'vehicleId' | 'inspectorId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  vehicleId: Types.ObjectId;
  inspectorId: Types.ObjectId;
}

export interface ITransportFeeAssignmentDoc
  extends Omit<
    ITransportFeeAssignment,
    'id' | 'tenantId' | 'schoolId' | 'campusId' | 'studentId' | 'academicYearId' | 'routeId' | 'stopId' | 'feeInvoiceId'
  > {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId?: Types.ObjectId;
  studentId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  routeId: Types.ObjectId;
  stopId: Types.ObjectId;
  feeInvoiceId?: Types.ObjectId;
}

// Aliases for backwards compatibility
export type IDriverDoc = IDriverProfileDoc;
export type IRouteDoc = ITransportRouteDoc;
export type IRouteStopDoc = ITransportStopDoc;

// ============================================================================
// Schemas
// ============================================================================

// 1. TransportSetting Schema
const TransportSettingSchema = new Schema<ITransportSettingDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    defaultPickupBufferMinutes: { type: Number, default: 10 },
    defaultDropBufferMinutes: { type: Number, default: 10 },
    maxVehicleCapacityRule: { type: String },
    attendantRequired: { type: Boolean, default: false },
    emergencyContactPolicy: { type: String },
    vehicleDocExpiryWarningDays: { type: Number, default: 30 },
    driverLicenseExpiryWarningDays: { type: Number, default: 30 },
    blockTripOnExpiredDoc: { type: Boolean, default: true },
    blockTripOnMaintenance: { type: Boolean, default: true },
    allowOversubscription: { type: Boolean, default: false },
    maxOversubscriptionPercentage: { type: Number, default: 0 },
    enableLiveTracking: { type: Boolean, default: true },
    enableParentSmsAlerts: { type: Boolean, default: true },
    enableParentPushAlerts: { type: Boolean, default: true },
    etaAlertThresholdMinutes: { type: Number, default: 10 },
    speedThresholdKmh: { type: Number, default: 60 },
    harshBrakingThresholdG: { type: Number, default: 0.5 },
    dailyTripCheckRequired: { type: Boolean, default: true },
    incidentAutoEscalateMinutes: { type: Number, default: 30 },
    defaultFeeModel: { type: String, default: 'DISTANCE_TIER' },
    boardingVerificationPolicy: {
      type: String,
      enum: Object.values(BoardingVerificationPolicy),
      default: BoardingVerificationPolicy.MANUAL,
    },
    feeCalculationModel: {
      type: String,
      enum: Object.values(TransportFeeModel),
      default: TransportFeeModel.ROUTE_BASED,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TransportSettingSchema.plugin(tenantPlugin);
TransportSettingSchema.plugin(softDeletePlugin);
TransportSettingSchema.index(
  { tenantId: 1, schoolId: 1, campusId: 1 },
  { unique: true, partialFilterExpression: { campusId: { $type: 'objectId' } } }
);
TransportSettingSchema.index(
  { tenantId: 1, schoolId: 1 },
  { unique: true, partialFilterExpression: { campusId: { $exists: false } } }
);

// 2. VehicleType Schema
const VehicleTypeSchema = new Schema<IVehicleTypeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String },
    defaultCapacity: { type: Number, required: true, default: 40 },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
VehicleTypeSchema.plugin(tenantPlugin);
VehicleTypeSchema.plugin(softDeletePlugin);
VehicleTypeSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true });

// 3. Vehicle Schema
const VehicleSchema = new Schema<IVehicleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    vehicleNumber: { type: String, uppercase: true, trim: true },
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
    vehicleTypeId: { type: Schema.Types.ObjectId, ref: 'VehicleType' },
    vehicleTypeCode: { type: String, default: 'BUS' },
    vin: { type: String, uppercase: true, trim: true },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    modelYear: { type: Number },
    yearOfManufacture: { type: Number },
    capacity: { type: Number, required: true, min: 1, default: 40 },
    seatingCapacity: { type: Number },
    standingCapacity: { type: Number, default: 0 },
    accessibilityFeatures: [{ type: String }],
    fuelType: {
      type: String,
      default: 'DIESEL',
    },
    currentMileageKm: { type: Number, default: 0 },
    ownershipType: { type: String, default: 'OWNED' },
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.ACTIVE,
      required: true,
    },
    gpsDeviceId: { type: String },
    fastagId: { type: String },
    insurancePolicyNumber: { type: String },
    insuranceExpiryDate: { type: Date },
    fitnessExpiryDate: { type: Date },
    permitExpiryDate: { type: Date },
    pollutionExpiryDate: { type: Date },
    currentRouteId: { type: Schema.Types.ObjectId, ref: 'TransportRoute' },
    primaryDriverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    purchaseDate: { type: Date },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
VehicleSchema.pre('validate', function (next) {
  if (!this.vehicleNumber && this.registrationNumber) {
    this.vehicleNumber = this.registrationNumber;
  }
  if (!this.capacity && this.seatingCapacity) {
    this.capacity = this.seatingCapacity;
  }
  if (!this.seatingCapacity && this.capacity) {
    this.seatingCapacity = this.capacity;
  }
  next();
});
VehicleSchema.plugin(tenantPlugin);
VehicleSchema.plugin(softDeletePlugin);
VehicleSchema.index({ tenantId: 1, schoolId: 1, vehicleNumber: 1 }, { unique: true, sparse: true });
VehicleSchema.index({ tenantId: 1, schoolId: 1, registrationNumber: 1 }, { unique: true });
VehicleSchema.index({ tenantId: 1, campusId: 1, status: 1 });

// 4. VehicleDocument Schema
const VehicleDocumentSchema = new Schema<IVehicleDocumentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    documentType: {
      type: String,
      enum: Object.values(VehicleDocumentType),
      required: true,
    },
    documentNumber: { type: String, required: true, trim: true },
    issueDate: { type: Date },
    issuedDate: { type: Date },
    expiryDate: { type: Date },
    fileReference: { type: String },
    fileUrl: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: Object.values(TransportDocumentStatus),
      default: TransportDocumentStatus.VALID,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(TransportDocumentStatus),
      default: TransportDocumentStatus.VALID,
    },
    remarks: { type: String },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    isSafetyCritical: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
VehicleDocumentSchema.pre('validate', function (next) {
  if (!this.issueDate && this.issuedDate) this.issueDate = this.issuedDate;
  if (!this.issuedDate && this.issueDate) this.issuedDate = this.issueDate;
  if (!this.status && this.verificationStatus) this.status = this.verificationStatus;
  if (!this.verificationStatus && this.status) this.verificationStatus = this.status;
  if (!this.fileReference && this.fileUrl) this.fileReference = this.fileUrl;
  if (!this.fileUrl && this.fileReference) this.fileUrl = this.fileReference;
  next();
});
VehicleDocumentSchema.plugin(tenantPlugin);
VehicleDocumentSchema.plugin(softDeletePlugin);
VehicleDocumentSchema.index({ tenantId: 1, vehicleId: 1, documentType: 1 });
VehicleDocumentSchema.index({ tenantId: 1, expiryDate: 1 });

// 5. DriverProfile Schema
const DriverProfileSchema = new Schema<IDriverProfileDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    licenseNumber: { type: String, required: true, uppercase: true, trim: true },
    licenseCategory: { type: String, default: 'COMMERCIAL_HEAVY' },
    licenseIssueDate: { type: Date },
    licenseExpiryDate: { type: Date, required: true },
    verificationStatus: {
      type: String,
      enum: Object.values(DriverVerificationStatus),
      default: DriverVerificationStatus.VERIFIED,
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    experienceYears: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(DriverStatus),
      default: DriverStatus.ACTIVE,
      required: true,
    },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
DriverProfileSchema.plugin(tenantPlugin);
DriverProfileSchema.plugin(softDeletePlugin);
DriverProfileSchema.index({ tenantId: 1, schoolId: 1, licenseNumber: 1 }, { unique: true });
DriverProfileSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
DriverProfileSchema.index({ tenantId: 1, campusId: 1, status: 1 });

// 6. DriverDocument Schema
const DriverDocumentSchema = new Schema<IDriverDocumentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    documentType: {
      type: String,
      enum: Object.values(DriverDocumentType),
      required: true,
    },
    documentNumber: { type: String, required: true, trim: true },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    fileReference: { type: String },
    status: {
      type: String,
      enum: Object.values(TransportDocumentStatus),
      default: TransportDocumentStatus.VALID,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
DriverDocumentSchema.plugin(tenantPlugin);
DriverDocumentSchema.plugin(softDeletePlugin);
DriverDocumentSchema.index({ tenantId: 1, driverId: 1, documentType: 1 });

// 7. AttendantProfile Schema
const AttendantProfileSchema = new Schema<IAttendantProfileDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
AttendantProfileSchema.plugin(tenantPlugin);
AttendantProfileSchema.plugin(softDeletePlugin);
AttendantProfileSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

// 8. TransportRoute Schema
const TransportRouteSchema = new Schema<ITransportRouteDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    routeCode: { type: String, uppercase: true, trim: true },
    code: { type: String, uppercase: true, trim: true },
    routeName: { type: String, trim: true },
    name: { type: String, trim: true },
    description: { type: String },
    direction: {
      type: String,
      enum: Object.values(RouteDirection),
      default: RouteDirection.BOTH,
      required: true,
    },
    startLocationName: { type: String },
    endLocationName: { type: String },
    totalDistanceKm: { type: Number, default: 0 },
    estimatedDurationMinutes: { type: Number, default: 45 },
    defaultVehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    defaultDriverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    defaultAttendantId: { type: Schema.Types.ObjectId, ref: 'Attendant' },
    stops: [{ type: Schema.Types.Mixed }],
    maxCapacity: { type: Number, default: 40 },
    assignedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    currentVersion: { type: Number, default: 1 },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TransportRouteSchema.pre('validate', function (next) {
  if (!this.routeName && this.name) this.routeName = this.name;
  if (!this.name && this.routeName) this.name = this.routeName;
  if (!this.routeCode && this.code) this.routeCode = this.code;
  if (!this.code && this.routeCode) this.code = this.routeCode;
  if (this.isActive !== undefined && this.active === undefined) this.active = this.isActive;
  if (this.active !== undefined && this.isActive === undefined) this.isActive = this.active;
  next();
});
TransportRouteSchema.plugin(tenantPlugin);
TransportRouteSchema.plugin(softDeletePlugin);
TransportRouteSchema.index({ tenantId: 1, schoolId: 1, routeCode: 1 }, { unique: true, sparse: true });
TransportRouteSchema.index({ tenantId: 1, schoolId: 1, code: 1 }, { unique: true, sparse: true });
TransportRouteSchema.index({ tenantId: 1, campusId: 1, active: 1 });

// 9. TransportRouteVersion Schema
const TransportRouteVersionSchema = new Schema<ITransportRouteVersionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', index: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: true, index: true },
    versionNumber: { type: Number },
    version: { type: Number },
    stops: [{ type: Schema.Types.Mixed }],
    totalDistanceKm: { type: Number },
    estimatedDurationMinutes: { type: Number },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changeReason: { type: String },
    changeSummary: { type: String },
  },
  { timestamps: true, versionKey: '__v' }
);
TransportRouteVersionSchema.pre('validate', function (next) {
  if (!this.versionNumber && this.version) this.versionNumber = this.version;
  if (!this.version && this.versionNumber) this.version = this.versionNumber;
  next();
});
TransportRouteVersionSchema.plugin(tenantPlugin);
TransportRouteVersionSchema.index({ tenantId: 1, routeId: 1, versionNumber: 1 }, { unique: true, sparse: true });

// 10. TransportStop Schema
const TransportStopSchema = new Schema<ITransportStopDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: false, index: true },
    stopName: { type: String, trim: true },
    name: { type: String, trim: true },
    stopCode: { type: String, trim: true },
    code: { type: String, trim: true },
    sequenceOrder: { type: Number, default: 0 },
    sequence: { type: Number, default: 0 },
    address: { type: String },
    landmark: { type: String },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    zone: { type: String },
    fareStage: { type: Number },
    standardFareMinorUnits: { type: Number, default: 0 },
    pickupTime: { type: String },
    dropTime: { type: String },
    fare: { type: Number, default: 0 }, // Integer minor units
    active: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TransportStopSchema.pre('validate', function (next) {
  if (!this.stopName && this.name) this.stopName = this.name;
  if (!this.name && this.stopName) this.name = this.stopName;
  if (!this.stopCode && this.code) this.stopCode = this.code;
  if (!this.code && this.stopCode) this.code = this.stopCode;
  if (this.sequenceOrder === undefined && this.sequence !== undefined) this.sequenceOrder = this.sequence;
  if (this.sequence === undefined && this.sequenceOrder !== undefined) this.sequence = this.sequenceOrder;
  if (this.isActive !== undefined && this.active === undefined) this.active = this.isActive;
  if (this.active !== undefined && this.isActive === undefined) this.isActive = this.active;
  next();
});
TransportStopSchema.plugin(tenantPlugin);
TransportStopSchema.plugin(softDeletePlugin);
TransportStopSchema.index(
  { tenantId: 1, routeId: 1, sequenceOrder: 1 },
  { unique: true, partialFilterExpression: { routeId: { $type: 'objectId' } } }
);

// 11. StudentTransportAssignment Schema
const StudentTransportAssignmentSchema = new Schema<IStudentTransportAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: false,
      index: true,
    },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: true, index: true },
    pickupStopId: { type: Schema.Types.ObjectId, ref: 'TransportStop', required: true },
    dropStopId: { type: Schema.Types.ObjectId, ref: 'TransportStop', required: false },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    direction: { type: String, default: 'BOTH' },
    startDate: { type: Date },
    endDate: { type: Date },
    seatNumber: { type: String },
    fareMinorUnits: { type: Number, default: 0 },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    status: {
      type: String,
      enum: Object.values(TransportAssignmentStatus),
      default: TransportAssignmentStatus.ACTIVE,
      required: true,
    },
    specialNeeds: [{ type: String }],
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
StudentTransportAssignmentSchema.plugin(tenantPlugin);
StudentTransportAssignmentSchema.plugin(softDeletePlugin);
StudentTransportAssignmentSchema.index(
  { tenantId: 1, academicYearId: 1, studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE', isDeleted: false },
  }
);
StudentTransportAssignmentSchema.index({ tenantId: 1, routeId: 1, status: 1 });

// 12. TransportTrip Schema
const TransportTripSchema = new Schema<ITransportTripDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    tripDate: { type: Date, required: true, index: true },
    tripType: {
      type: String,
      enum: Object.values(TripType),
      required: true,
    },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: true, index: true },
    routeVersion: { type: Number, default: 1 },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    attendantId: { type: Schema.Types.ObjectId, ref: 'Attendant' },
    scheduledStartTime: { type: Schema.Types.Mixed, required: true },
    scheduledEndTime: { type: Schema.Types.Mixed },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    startingOdometerKm: { type: Number },
    endingOdometerKm: { type: Number },
    currentLocation: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    lastTelemetryAt: { type: Date },
    telemetryMasked: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(TripStatus),
      default: TripStatus.SCHEDULED,
      required: true,
    },
    students: [{ type: Schema.Types.Mixed }],
    cancellationReason: { type: String },
    notes: { type: String },
    idempotencyKey: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TransportTripSchema.plugin(tenantPlugin);
TransportTripSchema.plugin(softDeletePlugin);
TransportTripSchema.index(
  { tenantId: 1, campusId: 1, tripDate: 1, routeId: 1, tripType: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);
TransportTripSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  }
);
TransportTripSchema.index({ tenantId: 1, vehicleId: 1, tripDate: 1, status: 1 });
TransportTripSchema.index({ tenantId: 1, driverId: 1, tripDate: 1, status: 1 });

// 13. TripStudent Schema
const TripStudentSchema = new Schema<ITripStudentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'TransportTrip', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    pickupStopId: { type: Schema.Types.ObjectId, ref: 'TransportStop', required: true },
    dropStopId: { type: Schema.Types.ObjectId, ref: 'TransportStop', required: true },
    boardingStatus: {
      type: String,
      enum: Object.values(StudentTripStatus),
      default: StudentTripStatus.ASSIGNED,
      required: true,
    },
    boardingTime: { type: Date },
    dropStatus: { type: String },
    dropTime: { type: Date },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TripStudentSchema.plugin(tenantPlugin);
TripStudentSchema.plugin(softDeletePlugin);
TripStudentSchema.index({ tenantId: 1, tripId: 1, studentId: 1 }, { unique: true });

// 14. TransportIncident Schema
const TransportIncidentSchema = new Schema<ITransportIncidentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    title: { type: String },
    incidentType: {
      type: String,
      enum: Object.values(TransportIncidentType),
      required: true,
    },
    severity: {
      type: String,
      enum: Object.values(IncidentSeverity),
      default: IncidentSeverity.MEDIUM,
      required: true,
    },
    tripId: { type: Schema.Types.ObjectId, ref: 'TransportTrip' },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    attendantId: { type: Schema.Types.ObjectId, ref: 'Attendant' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute' },
    stopId: { type: Schema.Types.ObjectId, ref: 'TransportStop' },
    occurredAt: { type: Date, required: true },
    reportedAt: { type: Date, default: Date.now },
    locationDescription: { type: String },
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    description: { type: String, required: true },
    affectedStudentsCount: { type: Number, default: 0 },
    immediateAction: { type: String },
    immediateActionTaken: { type: String },
    parentNotified: { type: Boolean, default: false },
    policeNotified: { type: Boolean, default: false },
    insuranceClaimInitiated: { type: Boolean, default: false },
    resolution: { type: String },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    status: {
      type: String,
      enum: Object.values(IncidentStatus),
      default: IncidentStatus.OPEN,
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TransportIncidentSchema.plugin(tenantPlugin);
TransportIncidentSchema.plugin(softDeletePlugin);
TransportIncidentSchema.index({ tenantId: 1, campusId: 1, status: 1 });
TransportIncidentSchema.index({ tenantId: 1, occurredAt: 1, severity: 1 });

// 15. VehicleMaintenance Schema
const VehicleMaintenanceSchema = new Schema<IVehicleMaintenanceDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    serviceDate: { type: Date },
    scheduledDate: { type: Date },
    serviceType: {
      type: String,
      enum: Object.values(VehicleServiceType),
      required: true,
    },
    description: { type: String, required: true },
    vendor: { type: String },
    serviceProvider: { type: String },
    cost: { type: Number, default: 0 }, // Integer minor units
    costMinorUnits: { type: Number, default: 0 },
    actualCostMinorUnits: { type: Number },
    estimatedCostMinorUnits: { type: Number },
    partsReplaced: [{ type: String }],
    completionDate: { type: Date },
    odometer: { type: Number },
    odometerReadingKm: { type: Number },
    nextServiceDate: { type: Date },
    nextServiceOdometer: { type: Number },
    status: {
      type: String,
      enum: Object.values(MaintenanceStatus),
      default: MaintenanceStatus.SCHEDULED,
      required: true,
    },
    notes: { type: String },
    invoiceNumber: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
VehicleMaintenanceSchema.pre('validate', function (next) {
  if (!this.serviceDate && this.scheduledDate) this.serviceDate = this.scheduledDate;
  if (!this.scheduledDate && this.serviceDate) this.scheduledDate = this.serviceDate;
  if (!this.cost && this.estimatedCostMinorUnits) this.cost = this.estimatedCostMinorUnits;
  if (!this.costMinorUnits && this.estimatedCostMinorUnits) this.costMinorUnits = this.estimatedCostMinorUnits;
  if (!this.odometer && this.odometerReadingKm) this.odometer = this.odometerReadingKm;
  if (!this.odometerReadingKm && this.odometer) this.odometerReadingKm = this.odometer;
  if (!this.vendor && this.serviceProvider) this.vendor = this.serviceProvider;
  if (!this.serviceProvider && this.vendor) this.serviceProvider = this.vendor;
  next();
});
VehicleMaintenanceSchema.plugin(tenantPlugin);
VehicleMaintenanceSchema.plugin(softDeletePlugin);
VehicleMaintenanceSchema.index({ tenantId: 1, vehicleId: 1, serviceDate: -1 });

// 16. VehicleInspection Schema
const VehicleInspectionSchema = new Schema<IVehicleInspectionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    inspectionType: { type: String, default: 'DAILY_PRE_TRIP' },
    inspectionDate: { type: Date, required: true },
    odometerReadingKm: { type: Number, default: 0 },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    inspectorEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    result: {
      type: String,
      enum: Object.values(InspectionResult),
      required: true,
    },
    checklist: { type: Schema.Types.Mixed },
    defectsIdentified: [{ type: String }],
    actionRequired: { type: String },
    notes: { type: String },
    correctiveAction: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
VehicleInspectionSchema.plugin(tenantPlugin);
VehicleInspectionSchema.plugin(softDeletePlugin);
VehicleInspectionSchema.index({ tenantId: 1, vehicleId: 1, inspectionDate: -1 });

// 17. TransportFeeAssignment Schema
const TransportFeeAssignmentSchema = new Schema<ITransportFeeAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: false,
      index: true,
    },
    transportAssignmentId: { type: Schema.Types.ObjectId, ref: 'StudentTransportAssignment', required: false, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: false, index: true },
    stopId: { type: Schema.Types.ObjectId, ref: 'TransportStop', required: false },
    amount: { type: Number, default: 0 }, // Integer minor units
    baseFareMinorUnits: { type: Number, default: 0 },
    discountMinorUnits: { type: Number, default: 0 },
    finalFareMinorUnits: { type: Number, default: 0 },
    frequency: {
      type: String,
      enum: Object.values(TransportFeeFrequency),
      default: TransportFeeFrequency.MONTHLY,
      required: true,
    },
    billingStatus: {
      type: String,
      enum: Object.values(TransportFeeBillingStatus),
      default: TransportFeeBillingStatus.PENDING,
      required: true,
    },
    feeInvoiceId: { type: Schema.Types.ObjectId, ref: 'FeeInvoice' },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
TransportFeeAssignmentSchema.plugin(tenantPlugin);
TransportFeeAssignmentSchema.plugin(softDeletePlugin);
TransportFeeAssignmentSchema.index({ tenantId: 1, academicYearId: 1, studentId: 1 });

// ============================================================================
// Model Registrations
// ============================================================================

export const TransportSetting = model<ITransportSettingDoc>('TransportSetting', TransportSettingSchema);
export const VehicleType = model<IVehicleTypeDoc>('VehicleType', VehicleTypeSchema);
export const Vehicle = model<IVehicleDoc>('Vehicle', VehicleSchema);
export const VehicleDocument = model<IVehicleDocumentDoc>('VehicleDocument', VehicleDocumentSchema);
export const Driver = model<IDriverProfileDoc>('Driver', DriverProfileSchema);
export const DriverDocument = model<IDriverDocumentDoc>('DriverDocument', DriverDocumentSchema);
export const Attendant = model<IAttendantProfileDoc>('Attendant', AttendantProfileSchema);
export const TransportRoute = model<ITransportRouteDoc>('TransportRoute', TransportRouteSchema);
export const TransportRouteVersion = model<ITransportRouteVersionDoc>('TransportRouteVersion', TransportRouteVersionSchema);
export const TransportStop = model<ITransportStopDoc>('TransportStop', TransportStopSchema);
export const StudentTransportAssignment = model<IStudentTransportAssignmentDoc>(
  'StudentTransportAssignment',
  StudentTransportAssignmentSchema
);
export const TransportTrip = model<ITransportTripDoc>('TransportTrip', TransportTripSchema);
export const TripStudent = model<ITripStudentDoc>('TripStudent', TripStudentSchema);
export const TransportIncident = model<ITransportIncidentDoc>('TransportIncident', TransportIncidentSchema);
export const VehicleMaintenance = model<IVehicleMaintenanceDoc>('VehicleMaintenance', VehicleMaintenanceSchema);
export const VehicleInspection = model<IVehicleInspectionDoc>('VehicleInspection', VehicleInspectionSchema);
export const TransportFeeAssignment = model<ITransportFeeAssignmentDoc>(
  'TransportFeeAssignment',
  TransportFeeAssignmentSchema
);

// Backward compatibility alias exports
export const Route = TransportRoute;
export const RouteStop = TransportStop;
export const DriverProfile = Driver;
export const AttendantProfile = Attendant;
