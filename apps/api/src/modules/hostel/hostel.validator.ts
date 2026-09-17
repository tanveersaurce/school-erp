import { z } from 'zod';
import {
  HostelType,
  HostelStatus,
  HostelGenderPolicy,
  RoomTypeCategory,
  RoomStatus,
  BedStatus,
  HostelStaffRole,
  HostelAllocationStatus,
  HostelTransferReason,
  HostelAttendanceStatus,
  HostelOutingStatus,
  HostelIncidentType,
  HostelIncidentSeverity,
  HostelIncidentStatus,
  HostelInspectionStatus,
  HostelMaintenanceCategory,
  HostelMaintenancePriority,
  HostelMaintenanceStatus,
  HostelBillingFrequency,
} from '@edusphere/common';

// ============================================================================
// 1. Hostel Structure Validators
// ============================================================================

export const createHostelSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  campusId: z.string().optional(),
  name: z.string().min(1, 'Name is required').trim(),
  code: z.string().optional(),
  type: z.nativeEnum(HostelType).default(HostelType.BOYS),
  description: z.string().optional(),
  address: z.string().optional(),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  wardenId: z.string().optional(),
  wardenName: z.string().optional(),
  wardenPhone: z.string().optional(),
  status: z.nativeEnum(HostelStatus).default(HostelStatus.ACTIVE),
  settings: z
    .object({
      genderPolicy: z.nativeEnum(HostelGenderPolicy).default(HostelGenderPolicy.MALE_ONLY),
      curfewTime: z.string().default('21:00'),
      allowParentRequests: z.boolean().default(true),
      requireParentOutingApproval: z.boolean().default(false),
      visitorHours: z
        .object({
          start: z.string().default('16:00'),
          end: z.string().default('19:00'),
          allowedDays: z.array(z.string()).default(['SATURDAY', 'SUNDAY']),
        })
        .optional(),
      notifications: z
        .object({
          notifyOnCheckIn: z.boolean().default(true),
          notifyOnCheckOut: z.boolean().default(true),
          notifyOnOutingRequest: z.boolean().default(true),
          notifyOnOverdue: z.boolean().default(true),
          notifyOnIncident: z.boolean().default(true),
        })
        .optional(),
    })
    .optional(),
});

export const updateHostelSchema = createHostelSchema.partial();

export const createBuildingSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  name: z.string().min(1, 'Building name is required').trim(),
  code: z.string().min(1, 'Building code is required').trim(),
  numberOfFloors: z.number().int().min(1).default(1),
  active: z.boolean().default(true),
  description: z.string().optional(),
});

export const updateBuildingSchema = createBuildingSchema.partial();

export const createFloorSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  buildingId: z.string().min(1, 'Building ID is required'),
  name: z.string().min(1, 'Floor name is required').trim(),
  floorNumber: z.number().int(),
  code: z.string().min(1, 'Floor code is required').trim(),
  active: z.boolean().default(true),
});

export const updateFloorSchema = createFloorSchema.partial();

export const createRoomTypeSchema = z.object({
  schoolId: z.string().optional(),
  name: z.string().min(1, 'Room type name is required').trim(),
  code: z.string().min(1, 'Room type code is required').trim(),
  type: z.nativeEnum(RoomTypeCategory).default(RoomTypeCategory.DOUBLE),
  expectedCapacity: z.number().int().min(1, 'Expected capacity must be at least 1'),
  genderEligibility: z.enum(['MALE', 'FEMALE', 'ANY']).default('ANY'),
  baseRateMinorUnits: z.number().int().min(0).default(0),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial();

export const createRoomSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  roomNumber: z.string().min(1, 'Room number is required').trim(),
  floor: z.number().int().default(1),
  roomTypeId: z.string().optional(),
  roomType: z.string().default('STANDARD'),
  capacity: z.number().int().min(1).default(1),
  status: z.nativeEnum(RoomStatus).default(RoomStatus.AVAILABLE),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

export const updateRoomSchema = createRoomSchema.partial();

export const createBedSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().optional(),
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  roomId: z.string().min(1, 'Room ID is required'),
  bedNumber: z.string().min(1, 'Bed number is required').trim(),
  code: z.string().optional(),
  status: z.nativeEnum(BedStatus).default(BedStatus.AVAILABLE),
  active: z.boolean().default(true),
});

export const batchCreateBedsSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  bedNumbers: z.array(z.string().min(1)).min(1, 'At least one bed number required'),
});

export const updateBedSchema = createBedSchema.partial();

// ============================================================================
// 2. Staff / Warden Assignment Validators
// ============================================================================

export const createStaffAssignmentSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  employeeId: z.string().min(1, 'Employee ID is required'),
  role: z.nativeEnum(HostelStaffRole).default(HostelStaffRole.CARETAKER),
  shift: z.string().optional(),
  startDate: z.string().or(z.date()).default(() => new Date()),
  endDate: z.string().or(z.date()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateStaffAssignmentSchema = createStaffAssignmentSchema.partial();

// ============================================================================
// 3. Allocation & Check-in / Checkout / Transfer Validators
// ============================================================================

export const allocateBedSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  studentId: z.string().min(1, 'Student ID is required'),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  roomId: z.string().min(1, 'Room ID is required'),
  bedId: z.string().min(1, 'Bed ID is required'),
  allocationDate: z.string().or(z.date()).default(() => new Date()),
  expectedCheckInDate: z.string().or(z.date()).optional(),
  expectedCheckOutDate: z.string().or(z.date()).optional(),
  reason: z.string().optional(),
});

export const checkInSchema = z.object({
  checkInDate: z.string().or(z.date()).default(() => new Date()),
  remarks: z.string().optional(),
});

export const checkOutSchema = z.object({
  checkOutDate: z.string().or(z.date()).default(() => new Date()),
  checkoutReason: z.string().optional(),
  clearanceStatus: z.enum(['PENDING', 'CLEARED', 'WITHHELD']).default('CLEARED'),
  remarks: z.string().optional(),
});

export const transferBedSchema = z.object({
  newHostelId: z.string().min(1, 'New hostel ID is required'),
  newRoomId: z.string().min(1, 'New room ID is required'),
  newBedId: z.string().min(1, 'New bed ID is required'),
  transferReason: z.nativeEnum(HostelTransferReason).default(HostelTransferReason.ROOM_CHANGE),
  transferRemarks: z.string().optional(),
  effectiveDate: z.string().or(z.date()).default(() => new Date()),
});

// ============================================================================
// 4. Attendance Validators
// ============================================================================

export const markAttendanceSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  date: z.string().or(z.date()),
  status: z.nativeEnum(HostelAttendanceStatus).default(HostelAttendanceStatus.PRESENT),
  remarks: z.string().optional(),
});

export const batchMarkAttendanceSchema = z.object({
  hostelId: z.string().min(1, 'Hostel ID is required'),
  date: z.string().or(z.date()),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1, 'Student ID is required'),
        status: z.nativeEnum(HostelAttendanceStatus).default(HostelAttendanceStatus.PRESENT),
        remarks: z.string().optional(),
      })
    )
    .min(1, 'At least one student attendance record is required'),
});

// ============================================================================
// 5. Student Outing Validators
// ============================================================================

export const requestOutingSchema = z.object({
  hostelId: z.string().min(1, 'Hostel ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  startDateTime: z.string().or(z.date()),
  expectedReturnDateTime: z.string().or(z.date()),
  reason: z.string().min(1, 'Reason is required').trim(),
  destination: z.string().min(1, 'Destination is required').trim(),
  guardianApprovalRequired: z.boolean().default(false),
});

export const approveOutingSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const recordOutingDepartureSchema = z.object({
  departureDateTime: z.string().or(z.date()).default(() => new Date()),
  remarks: z.string().optional(),
});

export const recordOutingReturnSchema = z.object({
  actualReturnDateTime: z.string().or(z.date()).default(() => new Date()),
  remarks: z.string().optional(),
});

// ============================================================================
// 6. Incident Validators
// ============================================================================

export const reportIncidentSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  buildingId: z.string().optional(),
  roomId: z.string().optional(),
  studentId: z.string().optional(),
  affectedStudents: z.array(z.string()).optional(),
  type: z.nativeEnum(HostelIncidentType).default(HostelIncidentType.DISCIPLINARY),
  severity: z.nativeEnum(HostelIncidentSeverity).default(HostelIncidentSeverity.MEDIUM),
  occurredAt: z.string().or(z.date()).default(() => new Date()),
  description: z.string().min(1, 'Description is required').trim(),
  immediateActionTaken: z.string().optional(),
});

export const updateIncidentSchema = z.object({
  status: z.nativeEnum(HostelIncidentStatus).optional(),
  resolution: z.string().optional(),
  immediateActionTaken: z.string().optional(),
  severity: z.nativeEnum(HostelIncidentSeverity).optional(),
});

// ============================================================================
// 7. Room Inspection Validators
// ============================================================================

export const createInspectionSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  buildingId: z.string().optional(),
  roomId: z.string().min(1, 'Room ID is required'),
  inspectionDate: z.string().or(z.date()).default(() => new Date()),
  cleanliness: z.number().int().min(1).max(5).default(5),
  safety: z.number().int().min(1).max(5).default(5),
  electrical: z.number().int().min(1).max(5).default(5),
  furniture: z.number().int().min(1).max(5).default(5),
  plumbing: z.number().int().min(1).max(5).default(5),
  remarks: z.string().optional(),
  issuesFound: z.array(z.string()).optional(),
  status: z.nativeEnum(HostelInspectionStatus).default(HostelInspectionStatus.PASSED),
});

export const updateInspectionSchema = createInspectionSchema.partial();

// ============================================================================
// 8. Maintenance Validators
// ============================================================================

export const createMaintenanceSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  buildingId: z.string().optional(),
  roomId: z.string().optional(),
  bedId: z.string().optional(),
  category: z.nativeEnum(HostelMaintenanceCategory).default(HostelMaintenanceCategory.OTHER),
  description: z.string().min(1, 'Description is required').trim(),
  priority: z.nativeEnum(HostelMaintenancePriority).default(HostelMaintenancePriority.MEDIUM),
  assignedTo: z.string().optional(),
});

export const updateMaintenanceSchema = z.object({
  assignedTo: z.string().optional(),
  priority: z.nativeEnum(HostelMaintenancePriority).optional(),
  status: z.nativeEnum(HostelMaintenanceStatus).optional(),
  resolution: z.string().optional(),
  costMinorUnits: z.number().int().min(0).optional(),
});

// ============================================================================
// 9. Fee Assignment Validators
// ============================================================================

export const createHostelFeeAssignmentSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  studentId: z.string().min(1, 'Student ID is required'),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  roomId: z.string().optional(),
  billingFrequency: z.nativeEnum(HostelBillingFrequency).default(HostelBillingFrequency.QUARTERLY),
  baseAmountMinorUnits: z.number().int().min(0, 'Base amount must be >= 0'),
  messFeeMinorUnits: z.number().int().min(0).default(0),
  cautionDepositMinorUnits: z.number().int().min(0).default(0),
  effectiveFrom: z.string().or(z.date()).default(() => new Date()),
  effectiveTo: z.string().or(z.date()).optional(),
});

export const updateHostelFeeAssignmentSchema = createHostelFeeAssignmentSchema.partial();

// ============================================================================
// 10. Document Validators
// ============================================================================

export const createHostelDocumentSchema = z.object({
  schoolId: z.string().optional(),
  campusId: z.string().optional(),
  hostelId: z.string().min(1, 'Hostel ID is required'),
  title: z.string().min(1, 'Title is required').trim(),
  documentType: z.string().min(1, 'Document type is required'),
  fileUrl: z.string().url('Valid file URL is required'),
  fileSize: z.number().int().min(0).optional(),
  mimeType: z.string().optional(),
  expiryDate: z.string().or(z.date()).optional(),
  status: z.enum(['VALID', 'EXPIRED', 'PENDING']).default('VALID'),
  remarks: z.string().optional(),
});
