import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission, requireAnyPermission } from '../../middlewares/authorize.js';
import { HostelController } from './hostel.controller.js';

export const hostelRouter = Router();

// All routes require authentication
hostelRouter.use(authenticate);

// =========================================================================
// 1. Dashboard & Reports
// =========================================================================
hostelRouter.get(
  '/dashboard',
  requireAnyPermission(['hostel:read', 'hostel:reports', 'hostel:manage']),
  HostelController.getDashboardStats
);

// =========================================================================
// 2. Hostel Structure & Self Accommodation
// =========================================================================
hostelRouter.get(
  '/my',
  requireAnyPermission(['hostel:read', 'hostel_allocation:read', 'hostel:student:read']),
  HostelController.getMyAccommodation
);
hostelRouter.get(
  '/allocations/my',
  requireAnyPermission(['hostel:read', 'hostel_allocation:read', 'hostel:student:read']),
  HostelController.getMyAccommodation
);

hostelRouter.post(
  '/',
  requirePermission('hostel:manage'),
  HostelController.createHostel
);
hostelRouter.get(
  ['/', '/hostels'],
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getHostels
);
hostelRouter.get(
  '/:id',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getHostelById
);
hostelRouter.put(
  '/:id',
  requirePermission('hostel:manage'),
  HostelController.updateHostel
);
hostelRouter.delete(
  '/:id',
  requirePermission('hostel:manage'),
  HostelController.deleteHostel
);

// =========================================================================
// 3. Buildings & Floors & Room Types
// =========================================================================
hostelRouter.post(
  '/buildings',
  requirePermission('hostel:manage'),
  HostelController.createBuilding
);
hostelRouter.get(
  '/buildings',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getBuildings
);

hostelRouter.post(
  '/floors',
  requirePermission('hostel:manage'),
  HostelController.createFloor
);
hostelRouter.get(
  '/floors',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getFloors
);

hostelRouter.post(
  '/room-types',
  requirePermission('hostel:manage'),
  HostelController.createRoomType
);
hostelRouter.get(
  '/room-types',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getRoomTypes
);

// =========================================================================
// 4. Rooms & Beds
// =========================================================================
hostelRouter.post(
  '/rooms',
  requirePermission('hostel:manage'),
  HostelController.createRoom
);
hostelRouter.get(
  '/rooms',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getRooms
);
hostelRouter.get(
  '/rooms/:id',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getRoomById
);
hostelRouter.put(
  '/rooms/:id',
  requirePermission('hostel:manage'),
  HostelController.updateRoom
);

hostelRouter.post(
  '/beds',
  requirePermission('hostel:manage'),
  HostelController.createBed
);
hostelRouter.post(
  '/beds/batch',
  requirePermission('hostel:manage'),
  HostelController.batchCreateBeds
);
hostelRouter.get(
  '/beds',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getBeds
);
hostelRouter.get(
  '/beds/:id',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:manage']),
  HostelController.getBedById
);
hostelRouter.delete(
  '/beds/:id',
  requirePermission('hostel:manage'),
  HostelController.deleteBed
);

// =========================================================================
// 5. Staff & Warden Assignment
// =========================================================================
hostelRouter.post(
  '/staff',
  requirePermission('hostel:manage'),
  HostelController.assignStaff
);
hostelRouter.get(
  '/staff',
  requirePermission('hostel:read'),
  HostelController.getStaffAssignments
);
hostelRouter.delete(
  '/staff/:id',
  requirePermission('hostel:manage'),
  HostelController.removeStaffAssignment
);

// =========================================================================
// 6. Allocations, Check-in, Check-out, Transfers
// =========================================================================
hostelRouter.post(
  '/allocations',
  requirePermission('hostel:allocate'),
  HostelController.allocateBed
);
hostelRouter.post(
  '/allocations/:id/check-in',
  requirePermission('hostel:allocate'),
  HostelController.checkIn
);
hostelRouter.post(
  '/allocations/:id/check-out',
  requirePermission('hostel:allocate'),
  HostelController.checkOut
);
hostelRouter.post(
  '/allocations/:id/transfer',
  requirePermission('hostel:allocate'),
  HostelController.transferBed
);
hostelRouter.post(
  '/allocations/:id/cancel',
  requirePermission('hostel:allocate'),
  HostelController.cancelAllocation
);
hostelRouter.get(
  '/allocations',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:allocate']),
  HostelController.getAllocations
);
hostelRouter.get(
  '/allocations/student/:studentId/active',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:allocate']),
  HostelController.getStudentActiveAllocation
);
hostelRouter.get(
  '/allocations/:id',
  requireAnyPermission(['hostel:read', 'hostel:student:read', 'hostel:allocate']),
  HostelController.getAllocationById
);

// =========================================================================
// 7. Attendance
// =========================================================================
hostelRouter.post(
  '/attendance',
  requirePermission('hostel:attendance'),
  HostelController.markAttendance
);
hostelRouter.post(
  '/attendance/batch',
  requirePermission('hostel:attendance'),
  HostelController.batchMarkAttendance
);
hostelRouter.get(
  '/attendance',
  requireAnyPermission(['hostel:attendance', 'hostel:student:read', 'hostel:read']),
  HostelController.getAttendance
);
hostelRouter.get(
  '/attendance/stats',
  requirePermission('hostel:attendance'),
  HostelController.getAttendanceStats
);

// =========================================================================
// 8. Outings
// =========================================================================
hostelRouter.post(
  '/outings',
  requireAnyPermission(['hostel:outing', 'hostel:student:outing:request']),
  HostelController.requestOuting
);
hostelRouter.post(
  '/outings/:id/approve',
  requirePermission('hostel:outing'),
  HostelController.approveOuting
);
hostelRouter.post(
  '/outings/:id/depart',
  requirePermission('hostel:outing'),
  HostelController.recordOutingDeparture
);
hostelRouter.post(
  '/outings/:id/return',
  requirePermission('hostel:outing'),
  HostelController.recordOutingReturn
);
hostelRouter.post(
  '/outings/:id/cancel',
  requireAnyPermission(['hostel:outing', 'hostel:student:outing:request']),
  HostelController.cancelOuting
);
hostelRouter.get(
  '/outings',
  requireAnyPermission(['hostel:outing', 'hostel:student:read', 'hostel:read']),
  HostelController.getOutings
);

// =========================================================================
// 9. Incidents
// =========================================================================
hostelRouter.post(
  '/incidents',
  requireAnyPermission(['hostel:incident', 'hostel:manage', 'hostel:student:read']),
  HostelController.reportIncident
);
hostelRouter.put(
  '/incidents/:id',
  requirePermission('hostel:incident'),
  HostelController.updateIncident
);
hostelRouter.get(
  '/incidents',
  requireAnyPermission(['hostel:incident', 'hostel:student:read', 'hostel:read']),
  HostelController.getIncidents
);

// =========================================================================
// 10. Inspections & Maintenance
// =========================================================================
hostelRouter.post(
  '/inspections',
  requirePermission('hostel:maintenance'),
  HostelController.createInspection
);
hostelRouter.get(
  '/inspections',
  requirePermission('hostel:maintenance'),
  HostelController.getInspections
);

hostelRouter.post(
  '/maintenance',
  requireAnyPermission(['hostel:maintenance', 'hostel:manage', 'hostel:student:read']),
  HostelController.createMaintenance
);
hostelRouter.put(
  '/maintenance/:id',
  requirePermission('hostel:maintenance'),
  HostelController.updateMaintenance
);
hostelRouter.get(
  '/maintenance',
  requirePermission('hostel:maintenance'),
  HostelController.getMaintenanceRequests
);

// =========================================================================
// 11. Fees
// =========================================================================
hostelRouter.post(
  '/fees',
  requirePermission('hostel:fees'),
  HostelController.createFeeAssignment
);
hostelRouter.post(
  '/fees/:id/generate-invoice',
  requirePermission('hostel:fees'),
  HostelController.generateInvoice
);
hostelRouter.get(
  '/fees',
  requireAnyPermission(['hostel:fees', 'hostel:student:read', 'hostel:read']),
  HostelController.getFeeAssignments
);
