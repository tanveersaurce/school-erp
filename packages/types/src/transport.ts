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

// Re-export enums for convenience
export {
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
};

// ============================================================================
// 1. Transport Settings & Configuration
// ============================================================================

export interface ITransportSetting {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  defaultPickupBufferMinutes?: number;
  defaultDropBufferMinutes?: number;
  maxVehicleCapacityRule?: string;
  attendantRequired?: boolean;
  emergencyContactPolicy?: string;
  vehicleDocExpiryWarningDays?: number;
  driverLicenseExpiryWarningDays?: number;
  blockTripOnExpiredDoc?: boolean;
  blockTripOnMaintenance?: boolean;
  allowOversubscription?: boolean;
  maxOversubscriptionPercentage?: number;
  enableLiveTracking?: boolean;
  enableParentSmsAlerts?: boolean;
  enableParentPushAlerts?: boolean;
  etaAlertThresholdMinutes?: number;
  speedThresholdKmh?: number;
  harshBrakingThresholdG?: number;
  dailyTripCheckRequired?: boolean;
  incidentAutoEscalateMinutes?: number;
  defaultFeeModel?: TransportFeeModel | string;
  boardingVerificationPolicy?: BoardingVerificationPolicy;
  feeCalculationModel?: TransportFeeModel;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 2. Vehicle Types & Vehicles
// ============================================================================

export interface IVehicleType {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string;
  defaultCapacity: number;
  defaultSeatingCapacity?: number;
  active: boolean;
  isActive?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicle {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  vehicleNumber?: string;
  registrationNumber: string;
  vehicleTypeId?: string;
  vehicleTypeCode?: VehicleTypeCode | string;
  vin?: string;
  make?: string;
  model?: string;
  manufacturer?: string;
  modelYear?: number;
  yearOfManufacture?: number;
  capacity: number; // seating capacity
  seatingCapacity?: number;
  standingCapacity?: number;
  accessibilityFeatures?: string[];
  fuelType?: 'DIESEL' | 'PETROL' | 'CNG' | 'ELECTRIC' | 'HYBRID' | string;
  currentMileageKm?: number;
  ownershipType?: 'OWNED' | 'LEASED' | 'CONTRACTED' | string;
  status: VehicleStatus;
  gpsDeviceId?: string;
  fastagId?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  fitnessExpiryDate?: Date;
  permitExpiryDate?: Date;
  pollutionExpiryDate?: Date;
  currentRouteId?: string;
  primaryDriverId?: string;
  purchaseDate?: Date;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicleDocument {
  id: string;
  tenantId: string;
  schoolId: string;
  vehicleId: string;
  documentType: VehicleDocumentType | string;
  documentNumber: string;
  issueDate?: Date;
  issuedDate?: Date;
  expiryDate?: Date;
  fileReference?: string;
  fileUrl?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
  verificationStatus?: TransportDocumentStatus;
  verifiedBy?: string;
  verifiedAt?: Date;
  remarks?: string;
  status?: TransportDocumentStatus;
  isSafetyCritical?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 3. Drivers & Attendants (Linked to Employee & Staff)
// ============================================================================

export interface IDriverEmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IDriverProfile {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  employeeId: string;
  userId?: string;
  licenseNumber: string;
  licenseCategory?: string;
  licenseType?: string;
  licenseIssueDate?: Date;
  licenseExpiryDate: Date;
  verificationStatus: DriverVerificationStatus;
  emergencyContact?: IDriverEmergencyContact;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  badgeNumber?: string;
  badgeExpiryDate?: Date;
  yearsOfExperience?: number;
  experienceYears?: number;
  medicalFitnessExpiryDate?: Date;
  policeVerificationReference?: string;
  policeVerificationDate?: Date;
  bloodGroup?: string;
  status: DriverStatus;
  defaultVehicleId?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverDocument {
  id: string;
  tenantId: string;
  schoolId: string;
  driverId?: string;
  driverProfileId?: string;
  documentType: DriverDocumentType | string;
  documentNumber: string;
  issuedDate?: Date;
  issueDate?: Date;
  expiryDate?: Date;
  fileReference?: string;
  fileUrl?: string;
  verificationStatus?: TransportDocumentStatus;
  remarks?: string;
  status?: TransportDocumentStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendantProfile {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  employeeId: string;
  userId?: string;
  firstAidCertified?: boolean;
  firstAidExpiryDate?: Date;
  policeVerificationReference?: string;
  policeVerificationDate?: Date;
  emergencyContact?: IDriverEmergencyContact;
  status: 'ACTIVE' | 'INACTIVE' | DriverStatus;
  defaultVehicleId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 4. Routes, Versions, & Stops
// ============================================================================

export interface ITransportRoute {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  routeCode?: string;
  code?: string;
  routeName?: string;
  name?: string;
  description?: string;
  direction: RouteDirection | string;
  startLocationName?: string;
  endLocationName?: string;
  totalDistanceKm?: number;
  estimatedDurationMinutes?: number;
  defaultVehicleId?: string;
  defaultDriverId?: string;
  defaultAttendantId?: string;
  stops?: any[];
  maxCapacity?: number;
  assignedCount?: number;
  active: boolean;
  isActive?: boolean;
  currentVersion: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRouteStopSnapshot {
  stopName: string;
  stopCode?: string;
  sequenceOrder: number;
  address?: string;
  pickupTime?: string;
  dropTime?: string;
  fare?: number;
}

export interface ITransportRouteVersion {
  id: string;
  tenantId: string;
  schoolId: string;
  routeId: string;
  versionNumber?: number;
  version?: number;
  stops: any[];
  totalDistanceKm?: number;
  estimatedDurationMinutes?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  changedBy?: string;
  changeReason?: string;
  changeSummary?: string;
  createdAt: Date;
}

export interface ITransportStop {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  routeId?: string;
  stopName?: string;
  name?: string;
  stopCode?: string;
  code?: string;
  sequenceOrder?: number;
  sequence?: number;
  address?: string;
  landmark?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  zone?: string;
  fareStage?: number;
  standardFareMinorUnits?: number;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  pickupTime?: string;
  dropTime?: string;
  fare?: number; // Integer minor units
  active: boolean;
  isActive?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy alias compatibility
export type IRoute = ITransportRoute;
export type IRouteStop = ITransportStop;
export type IDriver = IDriverProfile;

// ============================================================================
// 5. Student Transport Assignment
// ============================================================================

export interface IStudentTransportAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  studentId: string;
  academicYearId?: string;
  routeId: string;
  pickupStopId: string;
  dropStopId?: string;
  vehicleId?: string;
  direction?: RouteDirection | string;
  seatNumber?: string;
  fareMinorUnits?: number;
  startDate?: Date;
  endDate?: Date;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  status: TransportAssignmentStatus;
  specialNeeds?: string[];
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 6. Transport Trips & Boarding Tracking
// ============================================================================

export interface ITransportTrip {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  tripDate: Date;
  tripType: TripType;
  routeId: string;
  routeVersion: number;
  vehicleId: string;
  driverId: string;
  attendantId?: string;
  scheduledStartTime: string | Date;
  scheduledEndTime?: string | Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  startingOdometerKm?: number;
  endingOdometerKm?: number;
  status: TripStatus;
  currentLocation?: { type: string; coordinates: [number, number] };
  currentSpeedKmh?: number;
  telemetry?: Array<{ coordinates: [number, number]; speedKmh?: number; heading?: number; timestamp?: Date }>;
  telemetryMasked?: boolean;
  lastTelemetryAt?: Date;
  students?: Array<any>;
  cancellationReason?: string;
  notes?: string;
  idempotencyKey?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITripStudent {
  id: string;
  tenantId: string;
  schoolId: string;
  tripId: string;
  studentId: string;
  pickupStopId: string;
  dropStopId: string;
  boardingStatus: StudentTripStatus;
  boardingTime?: Date;
  dropStatus?: string;
  dropTime?: Date;
  markedBy?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 7. Transport Incidents
// ============================================================================

export interface ITransportIncident {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  incidentType: TransportIncidentType | string;
  severity: IncidentSeverity;
  title?: string;
  tripId?: string;
  vehicleId?: string;
  driverId?: string;
  attendantId?: string;
  studentId?: string;
  routeId?: string;
  stopId?: string;
  occurredAt: Date;
  reportedAt?: Date;
  description: string;
  affectedStudentsCount?: number;
  locationDescription?: string;
  coordinates?: { type: string; coordinates: [number, number] };
  immediateAction?: string;
  immediateActionTaken?: string;
  parentNotified?: boolean;
  policeNotified?: boolean;
  insuranceClaimInitiated?: boolean;
  resolution?: string;
  resolutionNotes?: string;
  reportedBy?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  status: IncidentStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 8. Vehicle Maintenance & Inspections
// ============================================================================

export interface IVehicleMaintenance {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  vehicleId: string;
  serviceDate?: Date;
  scheduledDate?: Date;
  completionDate?: Date;
  serviceType: VehicleServiceType;
  description: string;
  serviceProvider?: string;
  vendor?: string;
  cost?: number; // Integer minor units via Money
  costMinorUnits?: number;
  estimatedCostMinorUnits?: number;
  actualCostMinorUnits?: number;
  odometer?: number;
  odometerReadingKm?: number;
  nextServiceDate?: Date;
  nextServiceOdometer?: number;
  partsReplaced?: string[];
  status: MaintenanceStatus;
  notes?: string;
  invoiceNumber?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInspectionChecklistItem {
  item: string;
  passed: boolean;
  remarks?: string;
}

export interface IVehicleInspection {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  vehicleId: string;
  inspectionType?: string;
  inspectionDate: Date;
  odometerReadingKm?: number;
  inspectorId?: string;
  inspectorEmployeeId?: string;
  result: InspectionResult;
  checklist: IInspectionChecklistItem[] | any;
  defectsIdentified?: string[];
  actionRequired?: string;
  notes?: string;
  correctiveAction?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 9. Transport Fee Assignment (Phase 13 Integration)
// ============================================================================

export interface ITransportFeeAssignment {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  studentId: string;
  academicYearId?: string;
  routeId?: string;
  stopId?: string;
  transportAssignmentId?: string;
  amount?: number; // Integer minor units via Money
  baseFareMinorUnits?: number;
  discountMinorUnits?: number;
  finalFareMinorUnits?: number;
  frequency: TransportFeeFrequency;
  billingStatus: TransportFeeBillingStatus;
  feeInvoiceId?: string;
  invoiceId?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 10. Dashboard & Report DTOs
// ============================================================================

export interface ITransportDashboardKPIs {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  activeRoutes: number;
  activeDrivers: number;
  activeAttendants: number;
  studentsAssigned: number;
  todayTrips: {
    scheduled: number;
    inProgress: number;
    completed: number;
    delayed: number;
    cancelled: number;
  };
  openIncidents: number;
  expiringDocumentsCount: number;
  totalMaintenanceCost: number; // Integer minor units
  totalTransportFeeDue: number; // Integer minor units
}

export interface IRouteCapacitySummary {
  routeId: string;
  routeCode: string;
  routeName: string;
  direction: RouteDirection;
  assignedVehicleNumber?: string;
  vehicleCapacity: number;
  assignedStudentsCount: number;
  availableCapacity: number;
  isOverCapacity: boolean;
  stopsCount: number;
}

export interface ITripAttendanceSummary {
  tripId: string;
  tripDate: string;
  tripType: TripType;
  status: TripStatus;
  totalStudents: number;
  boardedCount: number;
  droppedCount: number;
  absentCount: number;
  notBoardedCount: number;
}

export interface ITransportOverdueDocumentReport {
  id: string;
  entityType: 'VEHICLE' | 'DRIVER';
  entityName: string;
  entityIdentifier: string;
  documentType: string;
  documentNumber: string;
  expiryDate: Date;
  daysRemaining: number;
  status: TransportDocumentStatus;
}
