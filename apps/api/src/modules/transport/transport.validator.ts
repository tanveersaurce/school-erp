import { z } from 'zod';
import {
  VehicleStatus,
  TransportDocumentStatus,
  DriverStatus,
  DriverVerificationStatus,
  RouteDirection,
  TransportAssignmentStatus,
  TripType,
  TripStatus,
  StudentTripStatus,
  IncidentSeverity,
  IncidentStatus,
  VehicleServiceType,
  MaintenanceStatus,
  InspectionResult,
  TransportFeeFrequency,
  BoardingVerificationPolicy,
  TransportFeeModel,
} from '@edusphere/common';

// =========================================================================
// 1. Settings & Vehicle Types & Stops
// =========================================================================
export const updateTransportSettingSchema = z.object({
  allowOversubscription: z.boolean().optional(),
  maxOversubscriptionPercentage: z.number().min(0).max(100).optional(),
  enableLiveTracking: z.boolean().optional(),
  enableParentSmsAlerts: z.boolean().optional(),
  enableParentPushAlerts: z.boolean().optional(),
  etaAlertThresholdMinutes: z.number().int().min(1).optional(),
  speedThresholdKmh: z.number().int().min(10).optional(),
  harshBrakingThresholdG: z.number().min(0.1).optional(),
  dailyTripCheckRequired: z.boolean().optional(),
  incidentAutoEscalateMinutes: z.number().int().min(5).optional(),
  defaultFeeModel: z.nativeEnum(TransportFeeModel).optional(),
  boardingVerificationPolicy: z.nativeEnum(BoardingVerificationPolicy).optional(),
});

export const createVehicleTypeSchema = z.object({
  name: z.string().min(1, 'name is required'),
  code: z.string().min(1, 'code is required'),
  defaultSeatingCapacity: z.number().int().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateVehicleTypeSchema = z.object({
  name: z.string().min(1).optional(),
  defaultSeatingCapacity: z.number().int().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createStopSchema = z.object({
  campusId: z.string().min(1, 'campusId is required'),
  name: z.string().min(1, 'name is required'),
  code: z.string().min(1, 'code is required'),
  landmark: z.string().optional(),
  location: z
    .object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
    })
    .optional(),
  zone: z.string().optional(),
  fareStage: z.number().int().min(1).optional(),
  standardFareMinorUnits: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateStopSchema = z.object({
  name: z.string().min(1).optional(),
  landmark: z.string().optional(),
  location: z
    .object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  zone: z.string().optional(),
  fareStage: z.number().int().min(1).optional(),
  standardFareMinorUnits: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// =========================================================================
// 2. Vehicles & Compliance Documents
// =========================================================================
export const createVehicleSchema = z.object({
  campusId: z.string().min(1, 'campusId is required'),
  vehicleTypeId: z.string().min(1, 'vehicleTypeId is required'),
  registrationNumber: z.string().min(1, 'registrationNumber is required'),
  vin: z.string().optional(),
  make: z.string().min(1, 'make is required'),
  model: z.string().min(1, 'model is required'),
  yearOfManufacture: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional(),
  seatingCapacity: z.number().int().min(1).optional(),
  standingCapacity: z.number().int().min(0).optional(),
  fuelType: z.enum(['DIESEL', 'PETROL', 'CNG', 'ELECTRIC', 'HYBRID']).optional(),
  currentMileageKm: z.number().min(0).optional(),
  ownershipType: z.enum(['OWNED', 'LEASED', 'CONTRACTED']).optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
  gpsDeviceId: z.string().optional(),
  fastagId: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceExpiryDate: z.string().datetime().optional(),
  fitnessExpiryDate: z.string().datetime().optional(),
  permitExpiryDate: z.string().datetime().optional(),
  pollutionExpiryDate: z.string().datetime().optional(),
});

export const updateVehicleSchema = z.object({
  campusId: z.string().optional(),
  vehicleTypeId: z.string().optional(),
  vin: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  yearOfManufacture: z.number().int().optional(),
  seatingCapacity: z.number().int().min(1).optional(),
  standingCapacity: z.number().int().min(0).optional(),
  fuelType: z.enum(['DIESEL', 'PETROL', 'CNG', 'ELECTRIC', 'HYBRID']).optional(),
  currentMileageKm: z.number().min(0).optional(),
  ownershipType: z.enum(['OWNED', 'LEASED', 'CONTRACTED']).optional(),
  status: z.nativeEnum(VehicleStatus).optional(),
  gpsDeviceId: z.string().optional(),
  fastagId: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceExpiryDate: z.string().datetime().optional(),
  fitnessExpiryDate: z.string().datetime().optional(),
  permitExpiryDate: z.string().datetime().optional(),
  pollutionExpiryDate: z.string().datetime().optional(),
});

export const addVehicleDocumentSchema = z.object({
  documentType: z.string().min(1, 'documentType is required'),
  documentNumber: z.string().min(1, 'documentNumber is required'),
  issuedDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  fileUrl: z.string().optional(),
  verificationStatus: z.nativeEnum(TransportDocumentStatus).optional(),
  remarks: z.string().optional(),
});

export const verifyDocumentSchema = z.object({
  status: z.nativeEnum(TransportDocumentStatus),
  remarks: z.string().optional(),
});

// =========================================================================
// 3. Drivers & Attendants
// =========================================================================
export const createDriverSchema = z.object({
  campusId: z.string().optional(),
  employeeId: z.string().min(1, 'employeeId is required'),
  licenseNumber: z.string().min(1, 'licenseNumber is required'),
  licenseType: z.string().optional(),
  licenseExpiryDate: z.string().datetime(),
  badgeNumber: z.string().optional(),
  badgeExpiryDate: z.string().datetime().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  medicalFitnessExpiryDate: z.string().datetime().optional(),
  policeVerificationReference: z.string().optional(),
  policeVerificationDate: z.string().datetime().optional(),
  bloodGroup: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
  defaultVehicleId: z.string().optional(),
});

export const updateDriverSchema = z.object({
  licenseNumber: z.string().optional(),
  licenseType: z.string().optional(),
  licenseExpiryDate: z.string().datetime().optional(),
  badgeNumber: z.string().optional(),
  badgeExpiryDate: z.string().datetime().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  medicalFitnessExpiryDate: z.string().datetime().optional(),
  policeVerificationReference: z.string().optional(),
  policeVerificationDate: z.string().datetime().optional(),
  bloodGroup: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
  verificationStatus: z.nativeEnum(DriverVerificationStatus).optional(),
  defaultVehicleId: z.string().optional(),
});

export const verifyDriverSchema = z.object({
  status: z.nativeEnum(DriverVerificationStatus),
  remarks: z.string().optional(),
});

export const createAttendantSchema = z.object({
  campusId: z.string().optional(),
  employeeId: z.string().min(1, 'employeeId is required'),
  firstAidCertified: z.boolean().optional(),
  firstAidExpiryDate: z.string().datetime().optional(),
  policeVerificationReference: z.string().optional(),
  policeVerificationDate: z.string().datetime().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
  defaultVehicleId: z.string().optional(),
});

export const updateAttendantSchema = z.object({
  firstAidCertified: z.boolean().optional(),
  firstAidExpiryDate: z.string().datetime().optional(),
  policeVerificationReference: z.string().optional(),
  policeVerificationDate: z.string().datetime().optional(),
  status: z.nativeEnum(DriverStatus).optional(),
  defaultVehicleId: z.string().optional(),
});

// =========================================================================
// 4. Routes
// =========================================================================
export const routeStopItemSchema = z.object({
  stopId: z.string().min(1, 'stopId is required'),
  sequence: z.number().int().min(1),
  expectedArrivalTime: z.string().optional(),
  expectedDepartureTime: z.string().optional(),
  distanceFromOriginKm: z.number().min(0).optional(),
  pickupFareMinorUnits: z.number().int().min(0).optional(),
  dropFareMinorUnits: z.number().int().min(0).optional(),
});

export const createRouteSchema = z.object({
  campusId: z.string().min(1, 'campusId is required'),
  name: z.string().min(1, 'name is required'),
  code: z.string().min(1, 'code is required'),
  description: z.string().optional(),
  direction: z.nativeEnum(RouteDirection).optional(),
  startLocationName: z.string().optional(),
  endLocationName: z.string().optional(),
  totalDistanceKm: z.number().min(0).optional(),
  estimatedDurationMinutes: z.number().int().min(0).optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  attendantId: z.string().optional(),
  stops: z.array(routeStopItemSchema).optional(),
  maxCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateRouteSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  direction: z.nativeEnum(RouteDirection).optional(),
  startLocationName: z.string().optional(),
  endLocationName: z.string().optional(),
  totalDistanceKm: z.number().min(0).optional(),
  estimatedDurationMinutes: z.number().int().min(0).optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  attendantId: z.string().optional(),
  stops: z.array(routeStopItemSchema).optional(),
  maxCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  changeSummary: z.string().optional(),
});

// =========================================================================
// 5. Student Transport Assignments
// =========================================================================
export const assignStudentSchema = z.object({
  campusId: z.string().min(1, 'campusId is required'),
  studentId: z.string().min(1, 'studentId is required'),
  routeId: z.string().min(1, 'routeId is required'),
  pickupStopId: z.string().min(1, 'pickupStopId is required'),
  dropStopId: z.string().optional(),
  direction: z.nativeEnum(RouteDirection).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  seatNumber: z.string().optional(),
  fareMinorUnits: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const updateAssignmentSchema = z.object({
  pickupStopId: z.string().optional(),
  dropStopId: z.string().optional(),
  direction: z.nativeEnum(RouteDirection).optional(),
  seatNumber: z.string().optional(),
  fareMinorUnits: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  endDate: z.string().datetime().optional(),
});

export const cancelAssignmentSchema = z.object({
  reason: z.string().optional(),
});

// =========================================================================
// 6. Trips & Telemetry
// =========================================================================
export const createTripSchema = z.object({
  campusId: z.string().min(1, 'campusId is required'),
  routeId: z.string().min(1, 'routeId is required'),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  attendantId: z.string().optional(),
  tripDate: z.string(),
  tripType: z.nativeEnum(TripType).optional(),
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const startTripSchema = z.object({
  startingOdometerKm: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const completeTripSchema = z.object({
  endingOdometerKm: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const cancelTripSchema = z.object({
  reason: z.string().min(1, 'reason is required'),
});

export const updateTelemetrySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  timestamp: z.string().datetime().optional(),
});

export const markBoardingSchema = z.object({
  status: z.nativeEnum(StudentTripStatus),
  stopId: z.string().optional(),
  remarks: z.string().optional(),
});

// =========================================================================
// 7. Incidents
// =========================================================================
export const reportIncidentSchema = z.object({
  campusId: z.string().min(1, 'campusId is required'),
  vehicleId: z.string().optional(),
  tripId: z.string().optional(),
  routeId: z.string().optional(),
  driverId: z.string().optional(),
  incidentType: z.nativeEnum(VehicleServiceType).or(z.string()).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  title: z.string().min(1, 'title is required'),
  description: z.string().min(1, 'description is required'),
  occurredAt: z.string().datetime().optional(),
  locationDescription: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  immediateActionTaken: z.string().optional(),
  parentNotified: z.boolean().optional(),
  policeNotified: z.boolean().optional(),
  insuranceClaimInitiated: z.boolean().optional(),
});

export const updateIncidentSchema = z.object({
  severity: z.nativeEnum(IncidentSeverity).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  immediateActionTaken: z.string().optional(),
  parentNotified: z.boolean().optional(),
  policeNotified: z.boolean().optional(),
  insuranceClaimInitiated: z.boolean().optional(),
  resolutionNotes: z.string().optional(),
});

// =========================================================================
// 8. Maintenance & Inspections
// =========================================================================
export const scheduleMaintenanceSchema = z.object({
  campusId: z.string().optional(),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  serviceType: z.nativeEnum(VehicleServiceType).optional(),
  scheduledDate: z.string().datetime(),
  completionDate: z.string().datetime().optional(),
  odometerReadingKm: z.number().min(0).optional(),
  description: z.string().min(1, 'description is required'),
  serviceProvider: z.string().optional(),
  estimatedCostMinorUnits: z.number().int().min(0).optional(),
  actualCostMinorUnits: z.number().int().min(0).optional(),
  invoiceNumber: z.string().optional(),
  partsReplaced: z.array(z.string()).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  notes: z.string().optional(),
  setVehicleUnderMaintenance: z.boolean().optional(),
});

export const completeMaintenanceSchema = z.object({
  actualCostMinorUnits: z.number().int().min(0).optional(),
  completionDate: z.string().datetime().optional(),
  invoiceNumber: z.string().optional(),
  partsReplaced: z.array(z.string()).optional(),
  notes: z.string().optional(),
  restoreVehicleActive: z.boolean().optional(),
});

export const recordInspectionSchema = z.object({
  campusId: z.string().optional(),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  inspectionType: z.string().optional(),
  inspectionDate: z.string().datetime().optional(),
  odometerReadingKm: z.number().min(0).optional(),
  checklist: z.record(z.boolean()).optional(),
  result: z.nativeEnum(InspectionResult).optional(),
  defectsIdentified: z.array(z.string()).optional(),
  actionRequired: z.string().optional(),
  inspectorEmployeeId: z.string().optional(),
});

// =========================================================================
// 9. Transport Fee Billing
// =========================================================================
export const createFeeAssignmentSchema = z.object({
  campusId: z.string().optional(),
  studentId: z.string().min(1, 'studentId is required'),
  transportAssignmentId: z.string().min(1, 'transportAssignmentId is required'),
  academicYearId: z.string().optional(),
  frequency: z.nativeEnum(TransportFeeFrequency).optional(),
  baseFareMinorUnits: z.number().int().min(0).optional(),
  discountMinorUnits: z.number().int().min(0).optional(),
});

export const generateInvoiceSchema = z.object({
  dueDate: z.string().datetime().optional(),
});
