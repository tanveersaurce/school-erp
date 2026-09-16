import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission, requireAnyPermission } from '../../middlewares/authorize.js';
import { TransportController } from './transport.controller.js';

export const transportRouter = Router();

// All routes require authentication
transportRouter.use(authenticate);

// =========================================================================
// 1. Settings, Vehicle Types, Stops
// =========================================================================
transportRouter.get(
  '/settings',
  requirePermission('transport:read'),
  TransportController.getSettings
);
transportRouter.put(
  '/settings',
  requirePermission('transport:manage'),
  TransportController.updateSettings
);

transportRouter.post(
  '/vehicle-types',
  requirePermission('transport:manage'),
  TransportController.createVehicleType
);
transportRouter.get(
  '/vehicle-types',
  requirePermission('transport:read'),
  TransportController.getVehicleTypes
);
transportRouter.put(
  '/vehicle-types/:id',
  requirePermission('transport:manage'),
  TransportController.updateVehicleType
);
transportRouter.delete(
  '/vehicle-types/:id',
  requirePermission('transport:manage'),
  TransportController.deleteVehicleType
);

transportRouter.post(
  '/stops',
  requirePermission('transport:manage'),
  TransportController.createStop
);
transportRouter.get(
  '/stops',
  requirePermission('transport:read'),
  TransportController.getStops
);
transportRouter.get(
  '/stops/:id',
  requirePermission('transport:read'),
  TransportController.getStopById
);
transportRouter.put(
  '/stops/:id',
  requirePermission('transport:manage'),
  TransportController.updateStop
);
transportRouter.delete(
  '/stops/:id',
  requirePermission('transport:manage'),
  TransportController.deleteStop
);

// =========================================================================
// 2. Vehicles & Compliance Documents
// =========================================================================
transportRouter.post(
  '/vehicles',
  requirePermission('transport:manage'),
  TransportController.createVehicle
);
transportRouter.get(
  '/vehicles',
  requirePermission('transport:read'),
  TransportController.getVehicles
);
transportRouter.get(
  '/vehicles/:id',
  requirePermission('transport:read'),
  TransportController.getVehicleById
);
transportRouter.put(
  '/vehicles/:id',
  requirePermission('transport:manage'),
  TransportController.updateVehicle
);
transportRouter.delete(
  '/vehicles/:id',
  requirePermission('transport:manage'),
  TransportController.deleteVehicle
);
transportRouter.post(
  '/vehicles/:id/documents',
  requirePermission('transport:manage'),
  TransportController.addVehicleDocument
);
transportRouter.get(
  '/vehicles/:id/documents',
  requirePermission('transport:read'),
  TransportController.getVehicleDocuments
);
transportRouter.put(
  '/vehicles/documents/:documentId/verify',
  requirePermission('transport:manage'),
  TransportController.verifyVehicleDocument
);

// =========================================================================
// 3. Drivers & Attendants
// =========================================================================
transportRouter.post(
  '/drivers',
  requirePermission('transport:manage'),
  TransportController.createDriver
);
transportRouter.get(
  '/drivers',
  requirePermission('transport:read'),
  TransportController.getDrivers
);
transportRouter.get(
  '/drivers/:id',
  requirePermission('transport:read'),
  TransportController.getDriverById
);
transportRouter.put(
  '/drivers/:id',
  requirePermission('transport:manage'),
  TransportController.updateDriver
);
transportRouter.put(
  '/drivers/:id/verify',
  requirePermission('transport:manage'),
  TransportController.verifyDriver
);
transportRouter.post(
  '/drivers/:id/documents',
  requirePermission('transport:manage'),
  TransportController.addDriverDocument
);
transportRouter.get(
  '/drivers/:id/documents',
  requirePermission('transport:read'),
  TransportController.getDriverDocuments
);

transportRouter.post(
  '/attendants',
  requirePermission('transport:manage'),
  TransportController.createAttendant
);
transportRouter.get(
  '/attendants',
  requirePermission('transport:read'),
  TransportController.getAttendants
);
transportRouter.get(
  '/attendants/:id',
  requirePermission('transport:read'),
  TransportController.getAttendantById
);
transportRouter.put(
  '/attendants/:id',
  requirePermission('transport:manage'),
  TransportController.updateAttendant
);

// =========================================================================
// 4. Routes
// =========================================================================
transportRouter.post(
  '/routes',
  requirePermission('transport:manage'),
  TransportController.createRoute
);
transportRouter.get(
  '/routes',
  requirePermission('transport:read'),
  TransportController.getRoutes
);
transportRouter.get(
  '/routes/:id',
  requirePermission('transport:read'),
  TransportController.getRouteById
);
transportRouter.put(
  '/routes/:id',
  requirePermission('transport:manage'),
  TransportController.updateRoute
);
transportRouter.delete(
  '/routes/:id',
  requirePermission('transport:manage'),
  TransportController.deleteRoute
);
transportRouter.get(
  '/routes/:id/versions',
  requirePermission('transport:read'),
  TransportController.getRouteVersions
);
transportRouter.get(
  '/routes/:id/capacity',
  requirePermission('transport:read'),
  TransportController.getRouteCapacity
);

// =========================================================================
// 5. Student Transport Assignments
// =========================================================================
transportRouter.post(
  '/assignments',
  requirePermission('transport:manage'),
  TransportController.assignStudent
);
transportRouter.get(
  '/assignments',
  requirePermission('transport:read'),
  TransportController.getAssignments
);
transportRouter.get(
  '/assignments/my',
  requirePermission('transport:read'),
  TransportController.getMyAssignments
);
transportRouter.get(
  '/assignments/:id',
  requirePermission('transport:read'),
  TransportController.getAssignmentById
);
transportRouter.put(
  '/assignments/:id',
  requirePermission('transport:manage'),
  TransportController.updateAssignment
);
transportRouter.post(
  '/assignments/:id/cancel',
  requirePermission('transport:manage'),
  TransportController.cancelAssignment
);
transportRouter.put(
  '/assignments/:id/cancel',
  requirePermission('transport:manage'),
  TransportController.cancelAssignment
);

// =========================================================================
// 6. Trips & Telemetry
// =========================================================================
transportRouter.post(
  '/trips',
  requirePermission('transport:manage'),
  TransportController.createTrip
);
transportRouter.get(
  '/trips',
  requirePermission('transport:read'),
  TransportController.getTrips
);
transportRouter.get(
  '/trips/:id',
  requirePermission('transport:read'),
  TransportController.getTripById
);
transportRouter.post(
  '/trips/:id/start',
  requireAnyPermission(['trip:start', 'trip:execute', 'transport:manage']),
  TransportController.startTrip
);
transportRouter.post(
  '/trips/:id/complete',
  requireAnyPermission(['trip:complete', 'trip:execute', 'transport:manage']),
  TransportController.completeTrip
);
transportRouter.post(
  '/trips/:id/cancel',
  requireAnyPermission(['trip:cancel', 'transport:manage']),
  TransportController.cancelTrip
);
transportRouter.post(
  '/trips/:id/telemetry',
  requireAnyPermission(['trip:update', 'trip:telemetry', 'transport:manage']),
  TransportController.updateTelemetry
);
transportRouter.post(
  '/trips/:id/students/:studentId/boarding',
  requireAnyPermission(['trip_attendance:manage', 'trip:execute', 'transport:manage']),
  TransportController.markStudentBoarding
);

// =========================================================================
// 7. Incidents
// =========================================================================
transportRouter.post(
  '/incidents',
  requireAnyPermission(['transport_incident:create', 'incident:create', 'transport:manage']),
  TransportController.reportIncident
);
transportRouter.get(
  '/incidents',
  requireAnyPermission(['transport_incident:read', 'incident:read', 'transport:read', 'transport:manage']),
  TransportController.getIncidents
);
transportRouter.get(
  '/incidents/:id',
  requireAnyPermission(['transport_incident:read', 'incident:read', 'transport:read', 'transport:manage']),
  TransportController.getIncidentById
);
transportRouter.put(
  '/incidents/:id',
  requireAnyPermission(['transport_incident:resolve', 'incident:resolve', 'transport_incident:manage', 'transport:manage']),
  TransportController.updateIncident
);

// =========================================================================
// 8. Maintenance & Inspections
// =========================================================================
transportRouter.post(
  '/maintenance',
  requireAnyPermission(['vehicle:maintenance', 'transport:manage']),
  TransportController.scheduleMaintenance
);
transportRouter.get(
  '/maintenance',
  requirePermission('transport:read'),
  TransportController.getMaintenanceRecords
);
transportRouter.get(
  '/maintenance/:id',
  requirePermission('transport:read'),
  TransportController.getMaintenanceById
);
transportRouter.put(
  '/maintenance/:id/complete',
  requireAnyPermission(['vehicle:maintenance', 'transport:manage']),
  TransportController.completeMaintenance
);

transportRouter.post(
  '/inspections',
  requireAnyPermission(['vehicle:inspect', 'trip:execute', 'transport:manage']),
  TransportController.recordInspection
);
transportRouter.get(
  '/inspections',
  requireAnyPermission(['vehicle:inspect', 'transport:read', 'transport:manage']),
  TransportController.getInspections
);

// =========================================================================
// 9. Transport Fee Billing
// =========================================================================
transportRouter.post(
  '/fees',
  requireAnyPermission(['transport:assign', 'fee:assign', 'transport:manage']),
  TransportController.createFeeAssignment
);
transportRouter.get(
  '/fees',
  requireAnyPermission(['fee:read', 'transport:read', 'transport:manage']),
  TransportController.getFeeAssignments
);
transportRouter.post(
  '/fees/:id/generate-invoice',
  requireAnyPermission(['fee:invoice', 'fee:manage', 'transport:manage']),
  TransportController.generateInvoice
);

// =========================================================================
// 10. Reports & Analytics
// =========================================================================
transportRouter.get(
  '/reports/dashboard',
  requirePermission('transport:read'),
  TransportController.getDashboardKPIs
);
transportRouter.get(
  '/reports/capacity',
  requirePermission('transport:read'),
  TransportController.getRouteCapacitySummary
);
transportRouter.get(
  '/reports/attendance',
  requirePermission('transport:read'),
  TransportController.getTripAttendanceSummary
);
transportRouter.get(
  '/reports/overdue-documents',
  requirePermission('transport:manage'),
  TransportController.getOverdueDocumentsReport
);
