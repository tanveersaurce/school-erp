import {
  HostelType,
  HostelStatus,
  RoomTypeCategory,
  RoomStatus,
  BedStatus,
  HostelAllocationStatus,
  HostelTransferReason,
  HostelAttendanceStatus,
  HostelOutingStatus,
  HostelIncidentType,
  HostelIncidentSeverity,
  HostelIncidentStatus,
  HostelInspectionStatus,
  HostelMaintenancePriority,
  HostelMaintenanceStatus,
  HostelMaintenanceCategory,
  HostelStaffRole,
  HostelBillingFrequency,
  HostelGenderPolicy,
} from '@edusphere/common';

// ============================================================================
// 1. Hostel & Configuration
// ============================================================================

export interface IHostelSetting {
  genderPolicy: HostelGenderPolicy;
  curfewTime?: string; // e.g. "21:30"
  visitorPolicy?: string;
  attendancePolicy?: string;
  roomAllocationPolicy?: string;
  feeConfiguration?: {
    defaultFeeModel: HostelBillingFrequency;
    messFeeIncluded: boolean;
    cautionDepositRequired: boolean;
  };
  incidentEscalationPolicy?: string;
  guardianNotificationPolicy?: {
    notifyOnCheckIn: boolean;
    notifyOnCheckOut: boolean;
    notifyOnOutingRequest: boolean;
    notifyOnOverdue: boolean;
    notifyOnIncident: boolean;
  };
}

export interface IHostel {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  name: string;
  code: string;
  type: HostelType;
  description?: string;
  address?: string;
  contact?: {
    phone?: string;
    email?: string;
  };
  wardenId?: any; // ref Employee
  wardenName?: string;
  wardenPhone?: string;
  capacity: number; // total active beds
  totalRooms: number;
  status: HostelStatus;
  settings?: IHostelSetting;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 2. Physical Hierarchy: Buildings, Floors, Room Types, Rooms, Beds
// ============================================================================

export interface IHostelBuilding {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  name: string;
  code: string;
  numberOfFloors: number;
  active: boolean;
  description?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IHostelFloor {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  buildingId: string | any;
  name: string;
  floorNumber: number;
  code: string;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IHostelRoomType {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  name: string;
  code: string;
  type: RoomTypeCategory;
  expectedCapacity: number;
  genderEligibility: 'MALE' | 'FEMALE' | 'ANY';
  baseRateMinorUnits?: number; // Optional reference standard rate in minor units
  description?: string;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IHostelRoom {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  buildingId: string | any;
  floorId: string | any;
  roomNumber: string;
  floor: number; // numeric floor index for convenience
  roomTypeId?: string | any; // ref HostelRoomType
  roomType?: string; // legacy string fallback e.g. STANDARD, DELUXE, DORMITORY
  capacity: number; // derived from physical active beds
  occupiedBedsCount?: number;
  status: RoomStatus;
  description?: string;
  active: boolean;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Backward compatibility alias
export type IRoom = IHostelRoom;

export interface IHostelBed {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  buildingId: string | any;
  floorId?: string | any;
  roomId: string | any;
  bedNumber: string;
  code: string;
  status: BedStatus;
  isOccupied?: boolean; // legacy compatibility boolean
  active: boolean;
  currentStudentId?: string | any; // Current allocated student if occupied
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Backward compatibility alias
export type IBed = IHostelBed;

// ============================================================================
// 3. Staff & Warden Management
// ============================================================================

export interface IHostelStaffAssignment {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  buildingId?: string | any;
  floorId?: string | any;
  employeeId: string | any; // ref Employee (1:1 reuse of Phase 6)
  role: HostelStaffRole;
  shift?: string;
  startDate: Date | string;
  endDate?: Date | string;
  status: 'ACTIVE' | 'INACTIVE';
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 4. Student Hostel Allocations & Transfers
// ============================================================================

export interface IHostelStudentAllocation {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  studentId: string | any; // ref Student (Phase 7)
  academicYearId: string | any; // ref AcademicYear (Phase 5)
  hostelId: string | any;
  buildingId: string | any;
  floorId?: string | any;
  roomId: string | any;
  bedId: string | any;
  allocationDate: Date | string;
  expectedCheckInDate?: Date | string;
  expectedCheckOutDate?: Date | string;
  actualCheckInDate?: Date | string;
  actualCheckOutDate?: Date | string;
  vacatingDate?: Date | string; // legacy compatibility
  status: HostelAllocationStatus;
  reason?: string;
  transferReason?: HostelTransferReason;
  transferRemarks?: string;
  previousAllocationId?: string | any;
  checkoutReason?: string;
  clearanceStatus?: 'PENDING' | 'CLEARED' | 'WITHHELD';
  allocatedBy?: string | any; // ref User
  checkedInBy?: string | any;
  checkedOutBy?: string | any;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Backward compatibility alias
export type IHostelAllocation = IHostelStudentAllocation;

// ============================================================================
// 5. Residential Attendance
// ============================================================================

export interface IHostelAttendance {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  studentId: string | any;
  date: Date | string; // Normalized YYYY-MM-DD
  status: HostelAttendanceStatus;
  markedAt: Date | string;
  markedBy: string | any;
  remarks?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 6. Student Outings / Leave
// ============================================================================

export interface IHostelOuting {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  studentId: string | any;
  hostelId: string | any;
  startDateTime: Date | string;
  expectedReturnDateTime: Date | string;
  actualReturnDateTime?: Date | string;
  reason: string;
  destination: string;
  guardianApproval?: {
    required: boolean;
    approved: boolean;
    approvedAt?: Date | string;
    approvedByGuardianId?: string | any;
    remarks?: string;
  };
  status: HostelOutingStatus;
  approvedBy?: string | any; // ref User / Warden
  approvalDate?: Date | string;
  rejectionReason?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 7. Incidents & Emergencies
// ============================================================================

export interface IHostelIncident {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  buildingId?: string | any;
  roomId?: string | any;
  studentId?: string | any;
  affectedStudents?: (string | any)[];
  type: HostelIncidentType;
  severity: HostelIncidentSeverity;
  occurredAt: Date | string;
  reportedAt: Date | string;
  description: string;
  immediateActionTaken?: string;
  resolution?: string;
  reportedBy: string | any;
  resolvedBy?: string | any;
  resolvedAt?: Date | string;
  status: HostelIncidentStatus;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 8. Room Inspections & Maintenance
// ============================================================================

export interface IHostelRoomInspection {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  buildingId?: string | any;
  roomId: string | any;
  inspectionDate: Date | string;
  inspector: string | any; // ref Employee / User
  cleanliness: number; // 1-5 rating
  safety: number; // 1-5 rating
  electrical: number; // 1-5 rating
  furniture: number; // 1-5 rating
  plumbing: number; // 1-5 rating
  remarks?: string;
  issuesFound?: string[];
  status: HostelInspectionStatus;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IHostelMaintenance {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  buildingId?: string | any;
  roomId?: string | any;
  bedId?: string | any;
  category: HostelMaintenanceCategory;
  description: string;
  reportedAt: Date | string;
  reportedBy: string | any;
  assignedTo?: string | any; // ref Employee
  priority: HostelMaintenancePriority;
  status: HostelMaintenanceStatus;
  resolvedAt?: Date | string;
  resolution?: string;
  costMinorUnits?: number; // Integer minor units (e.g. ₹500.00 = 50000)
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 9. Hostel Documents
// ============================================================================

export interface IHostelDocument {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  hostelId: string | any;
  title: string;
  documentType: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: Date | string;
  status: 'VALID' | 'EXPIRED' | 'PENDING';
  remarks?: string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 10. Hostel Fees & Invoicing (Phase 13 Integration)
// ============================================================================

export interface IHostelFeeAssignment {
  id: string;
  _id?: string;
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  studentId: string | any;
  academicYearId: string | any;
  hostelId: string | any;
  roomId?: string | any;
  billingFrequency: HostelBillingFrequency;
  baseAmountMinorUnits: number; // Integer minor units
  messFeeMinorUnits: number;
  cautionDepositMinorUnits: number;
  totalAmountMinorUnits: number;
  invoiceId?: string | any; // ref FeeInvoice (Phase 13)
  billingStatus: 'PENDING' | 'INVOICED' | 'PAID' | 'WAIVED';
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================================================
// 11. Dashboard KPIs & Reports
// ============================================================================

export interface IHostelDashboardKPIs {
  totalHostels: number;
  activeHostels: number;
  totalBuildings: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  reservedBeds: number;
  maintenanceBeds: number;
  overallOccupancyRate: number;
  totalCheckedInStudents: number;
  studentsCurrentlyOut: number;
  overdueOutingsCount: number;
  todayAttendanceRate: number;
  openIncidentsCount: number;
  pendingMaintenanceCount: number;
}

export interface IHostelOccupancyReport {
  hostelId: string;
  hostelName: string;
  hostelCode: string;
  hostelType: HostelType;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyPercentage: number;
  buildings: {
    buildingId: string;
    buildingName: string;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    occupancyPercentage: number;
  }[];
}

// ============================================================================
// 12. Query Filters
// ============================================================================

export interface HostelQueryFilters {
  campusId?: string;
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BuildingQueryFilters {
  campusId?: string;
  hostelId?: string;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RoomQueryFilters {
  campusId?: string;
  hostelId?: string;
  buildingId?: string;
  floorId?: string;
  roomTypeId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BedQueryFilters {
  campusId?: string;
  hostelId?: string;
  buildingId?: string;
  roomId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AllocationQueryFilters {
  campusId?: string;
  hostelId?: string;
  roomId?: string;
  studentId?: string;
  academicYearId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface OutingQueryFilters {
  campusId?: string;
  hostelId?: string;
  studentId?: string;
  status?: string;
  date?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
}

export interface HostelIncidentQueryFilters {
  campusId?: string;
  hostelId?: string;
  studentId?: string;
  type?: string;
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface HostelMaintenanceQueryFilters {
  campusId?: string;
  hostelId?: string;
  roomId?: string;
  category?: string;
  priority?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface HostelInspectionQueryFilters {
  campusId?: string;
  hostelId?: string;
  roomId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface HostelFeeQueryFilters {
  campusId?: string;
  academicYearId?: string;
  studentId?: string;
  hostelId?: string;
  billingStatus?: string;
  page?: number;
  limit?: number;
}
