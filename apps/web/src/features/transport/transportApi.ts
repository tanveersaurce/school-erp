import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
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
  ITransportIncident,
  IVehicleMaintenance,
  IVehicleInspection,
  ITransportFeeAssignment,
  ITransportDashboardKPIs,
  IRouteCapacitySummary,
  ITransportOverdueDocumentReport,
} from '@edusphere/types';

export interface VehicleQueryFilters {
  campusId?: string;
  vehicleTypeId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DriverQueryFilters {
  campusId?: string;
  status?: string;
  verificationStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RouteQueryFilters {
  campusId?: string;
  isActive?: boolean;
  search?: string;
}

export interface AssignmentQueryFilters {
  campusId?: string;
  routeId?: string;
  studentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface TripQueryFilters {
  campusId?: string;
  routeId?: string;
  vehicleId?: string;
  driverId?: string;
  date?: string;
  status?: string;
  tripType?: string;
  page?: number;
  limit?: number;
}

export interface IncidentQueryFilters {
  campusId?: string;
  tripId?: string;
  vehicleId?: string;
  severity?: string;
  status?: string;
  incidentType?: string;
  page?: number;
  limit?: number;
}

export interface MaintenanceQueryFilters {
  campusId?: string;
  vehicleId?: string;
  status?: string;
  serviceType?: string;
  page?: number;
  limit?: number;
}

export interface InspectionQueryFilters {
  campusId?: string;
  vehicleId?: string;
  result?: string;
  page?: number;
  limit?: number;
}

export interface FeeAssignmentQueryFilters {
  campusId?: string;
  academicYearId?: string;
  routeId?: string;
  billingStatus?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const transportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =========================================================================
    // 1. Dashboard & Reports
    // =========================================================================
    getTransportDashboardKPIs: builder.query<ApiResponse<ITransportDashboardKPIs>, { campusId?: string } | void>({
      query: (params) => ({
        url: '/transport/reports/dashboard',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportReport'],
    }),

    getRouteOccupancyReport: builder.query<ApiResponse<IRouteCapacitySummary[]>, { campusId?: string } | void>({
      query: (params) => ({
        url: '/transport/reports/occupancy',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportReport'],
    }),

    getDocumentExpiriesReport: builder.query<ApiResponse<ITransportOverdueDocumentReport[]>, { days?: number; campusId?: string } | void>({
      query: (params) => ({
        url: '/transport/reports/expiries',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportReport'],
    }),

    // =========================================================================
    // 2. Settings & Vehicle Types & Stops
    // =========================================================================
    getTransportSettings: builder.query<ApiResponse<ITransportSetting>, { campusId?: string } | void>({
      query: (params) => ({
        url: '/transport/settings',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportSettings'],
    }),

    updateTransportSettings: builder.mutation<ApiResponse<ITransportSetting>, { campusId?: string; data: Partial<ITransportSetting> }>({
      query: ({ campusId, data }) => ({
        url: '/transport/settings',
        method: 'PUT',
        params: campusId ? { campusId } : {},
        body: data,
      }),
      invalidatesTags: ['TransportSettings', 'TransportReport'],
    }),

    getVehicleTypes: builder.query<ApiResponse<IVehicleType[]>, void>({
      query: () => ({
        url: '/transport/vehicle-types',
        method: 'GET',
      }),
      providesTags: ['VehicleType'],
    }),

    createVehicleType: builder.mutation<ApiResponse<IVehicleType>, Partial<IVehicleType>>({
      query: (body) => ({
        url: '/transport/vehicle-types',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VehicleType'],
    }),

    updateVehicleType: builder.mutation<ApiResponse<IVehicleType>, { id: string; data: Partial<IVehicleType> }>({
      query: ({ id, data }) => ({
        url: `/transport/vehicle-types/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['VehicleType'],
    }),

    deleteVehicleType: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/transport/vehicle-types/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['VehicleType'],
    }),

    getStops: builder.query<ApiResponse<ITransportStop[]>, { campusId?: string } | void>({
      query: (params) => ({
        url: '/transport/stops',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportStop'],
    }),

    getStopById: builder.query<ApiResponse<ITransportStop>, string>({
      query: (id) => ({
        url: `/transport/stops/${id}`,
        method: 'GET',
      }),
      providesTags: ['TransportStop'],
    }),

    createStop: builder.mutation<ApiResponse<ITransportStop>, Partial<ITransportStop>>({
      query: (body) => ({
        url: '/transport/stops',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportStop', 'TransportReport'],
    }),

    updateStop: builder.mutation<ApiResponse<ITransportStop>, { id: string; data: Partial<ITransportStop> }>({
      query: ({ id, data }) => ({
        url: `/transport/stops/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TransportStop'],
    }),

    deleteStop: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/transport/stops/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TransportStop'],
    }),

    // =========================================================================
    // 3. Vehicles & Documents
    // =========================================================================
    getVehicles: builder.query<ApiResponse<PaginatedResult<IVehicle>>, VehicleQueryFilters | void>({
      query: (params) => ({
        url: '/transport/vehicles',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Vehicle'],
    }),

    getVehicleById: builder.query<ApiResponse<IVehicle>, string>({
      query: (id) => ({
        url: `/transport/vehicles/${id}`,
        method: 'GET',
      }),
      providesTags: ['Vehicle'],
    }),

    createVehicle: builder.mutation<ApiResponse<IVehicle>, Partial<IVehicle>>({
      query: (body) => ({
        url: '/transport/vehicles',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Vehicle', 'TransportReport'],
    }),

    updateVehicle: builder.mutation<ApiResponse<IVehicle>, { id: string; data: Partial<IVehicle> }>({
      query: ({ id, data }) => ({
        url: `/transport/vehicles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Vehicle'],
    }),

    updateVehicleStatus: builder.mutation<ApiResponse<IVehicle>, { id: string; status: string; reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/transport/vehicles/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Vehicle', 'TransportReport'],
    }),

    getVehicleDocuments: builder.query<ApiResponse<IVehicleDocument[]>, string>({
      query: (vehicleId) => ({
        url: `/transport/vehicles/${vehicleId}/documents`,
        method: 'GET',
      }),
      providesTags: ['VehicleDocument'],
    }),

    uploadVehicleDocument: builder.mutation<ApiResponse<IVehicleDocument>, { vehicleId: string; data: Partial<IVehicleDocument> }>({
      query: ({ vehicleId, data }) => ({
        url: `/transport/vehicles/${vehicleId}/documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['VehicleDocument', 'TransportReport'],
    }),

    verifyVehicleDocument: builder.mutation<ApiResponse<IVehicleDocument>, { vehicleId: string; docId: string; status: string; remarks?: string }>({
      query: ({ vehicleId, docId, ...body }) => ({
        url: `/transport/vehicles/${vehicleId}/documents/${docId}/verify`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['VehicleDocument', 'TransportReport'],
    }),

    // =========================================================================
    // 4. Drivers & Attendants
    // =========================================================================
    getDrivers: builder.query<ApiResponse<PaginatedResult<IDriverProfile>>, DriverQueryFilters | void>({
      query: (params) => ({
        url: '/transport/drivers',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Driver'],
    }),

    getDriverById: builder.query<ApiResponse<IDriverProfile>, string>({
      query: (id) => ({
        url: `/transport/drivers/${id}`,
        method: 'GET',
      }),
      providesTags: ['Driver'],
    }),

    createDriver: builder.mutation<ApiResponse<IDriverProfile>, Partial<IDriverProfile>>({
      query: (body) => ({
        url: '/transport/drivers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Driver', 'TransportReport'],
    }),

    updateDriver: builder.mutation<ApiResponse<IDriverProfile>, { id: string; data: Partial<IDriverProfile> }>({
      query: ({ id, data }) => ({
        url: `/transport/drivers/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Driver'],
    }),

    getDriverDocuments: builder.query<ApiResponse<IDriverDocument[]>, string>({
      query: (driverId) => ({
        url: `/transport/drivers/${driverId}/documents`,
        method: 'GET',
      }),
      providesTags: ['Driver'],
    }),

    uploadDriverDocument: builder.mutation<ApiResponse<IDriverDocument>, { driverId: string; data: Partial<IDriverDocument> }>({
      query: ({ driverId, data }) => ({
        url: `/transport/drivers/${driverId}/documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Driver', 'TransportReport'],
    }),

    verifyDriverDocument: builder.mutation<ApiResponse<IDriverDocument>, { driverId: string; docId: string; status: string; remarks?: string }>({
      query: ({ driverId, docId, ...body }) => ({
        url: `/transport/drivers/${driverId}/documents/${docId}/verify`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Driver', 'TransportReport'],
    }),

    getAttendants: builder.query<ApiResponse<IAttendantProfile[]>, { campusId?: string } | void>({
      query: (params) => ({
        url: '/transport/attendants',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Attendant'],
    }),

    createAttendant: builder.mutation<ApiResponse<IAttendantProfile>, Partial<IAttendantProfile>>({
      query: (body) => ({
        url: '/transport/attendants',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attendant', 'TransportReport'],
    }),

    updateAttendant: builder.mutation<ApiResponse<IAttendantProfile>, { id: string; data: Partial<IAttendantProfile> }>({
      query: ({ id, data }) => ({
        url: `/transport/attendants/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Attendant'],
    }),

    // =========================================================================
    // 5. Routes
    // =========================================================================
    getRoutes: builder.query<ApiResponse<ITransportRoute[]>, RouteQueryFilters | void>({
      query: (params) => ({
        url: '/transport/routes',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportRoute'],
    }),

    getRouteById: builder.query<ApiResponse<ITransportRoute>, string>({
      query: (id) => ({
        url: `/transport/routes/${id}`,
        method: 'GET',
      }),
      providesTags: ['TransportRoute'],
    }),

    createRoute: builder.mutation<ApiResponse<ITransportRoute>, Partial<ITransportRoute>>({
      query: (body) => ({
        url: '/transport/routes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportRoute', 'TransportReport'],
    }),

    updateRoute: builder.mutation<ApiResponse<ITransportRoute>, { id: string; data: Partial<ITransportRoute> }>({
      query: ({ id, data }) => ({
        url: `/transport/routes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TransportRoute', 'TransportReport'],
    }),

    deleteRoute: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/transport/routes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TransportRoute', 'TransportReport'],
    }),

    getRouteVersions: builder.query<ApiResponse<ITransportRouteVersion[]>, string>({
      query: (routeId) => ({
        url: `/transport/routes/${routeId}/versions`,
        method: 'GET',
      }),
      providesTags: ['TransportRoute'],
    }),

    // =========================================================================
    // 6. Student Transport Assignments
    // =========================================================================
    getTransportAssignments: builder.query<ApiResponse<PaginatedResult<IStudentTransportAssignment>>, AssignmentQueryFilters | void>({
      query: (params) => ({
        url: '/transport/assignments',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportAssignment'],
    }),

    getTransportAssignmentById: builder.query<ApiResponse<IStudentTransportAssignment>, string>({
      query: (id) => ({
        url: `/transport/assignments/${id}`,
        method: 'GET',
      }),
      providesTags: ['TransportAssignment'],
    }),

    createTransportAssignment: builder.mutation<ApiResponse<IStudentTransportAssignment>, Partial<IStudentTransportAssignment>>({
      query: (body) => ({
        url: '/transport/assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportAssignment', 'TransportRoute', 'TransportReport'],
    }),

    updateTransportAssignment: builder.mutation<ApiResponse<IStudentTransportAssignment>, { id: string; data: Partial<IStudentTransportAssignment> }>({
      query: ({ id, data }) => ({
        url: `/transport/assignments/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TransportAssignment', 'TransportRoute', 'TransportReport'],
    }),

    cancelTransportAssignment: builder.mutation<ApiResponse<IStudentTransportAssignment>, { id: string; cancellationReason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/transport/assignments/${id}/cancel`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['TransportAssignment', 'TransportRoute', 'TransportReport'],
    }),

    getMyTransportAssignments: builder.query<ApiResponse<IStudentTransportAssignment[]>, { studentId?: string } | void>({
      query: (params) => ({
        url: '/transport/assignments/my',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportAssignment'],
    }),

    // =========================================================================
    // 7. Trips & Live Telemetry & Attendance
    // =========================================================================
    getTrips: builder.query<ApiResponse<PaginatedResult<ITransportTrip>>, TripQueryFilters | void>({
      query: (params) => ({
        url: '/transport/trips',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportTrip'],
    }),

    getTripById: builder.query<ApiResponse<ITransportTrip>, string>({
      query: (id) => ({
        url: `/transport/trips/${id}`,
        method: 'GET',
      }),
      providesTags: ['TransportTrip'],
    }),

    scheduleTrip: builder.mutation<ApiResponse<ITransportTrip>, Partial<ITransportTrip>>({
      query: (body) => ({
        url: '/transport/trips',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportTrip', 'TransportReport'],
    }),

    startTrip: builder.mutation<ApiResponse<ITransportTrip>, { id: string; startingOdometerKm?: number }>({
      query: ({ id, ...body }) => ({
        url: `/transport/trips/${id}/start`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportTrip', 'TransportReport'],
    }),

    recordTripTelemetry: builder.mutation<ApiResponse<ITransportTrip>, { id: string; latitude: number; longitude: number; speed?: number; heading?: number }>({
      query: ({ id, ...body }) => ({
        url: `/transport/trips/${id}/telemetry`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportTrip'],
    }),

    recordStudentBoarding: builder.mutation<ApiResponse<ITransportTrip>, { id: string; studentId: string; status: string; stopId?: string; notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `/transport/trips/${id}/boarding`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportTrip'],
    }),

    endTrip: builder.mutation<ApiResponse<ITransportTrip>, { id: string; endingOdometerKm?: number }>({
      query: ({ id, ...body }) => ({
        url: `/transport/trips/${id}/end`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportTrip', 'TransportReport', 'Vehicle'],
    }),

    cancelTrip: builder.mutation<ApiResponse<ITransportTrip>, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/transport/trips/${id}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportTrip', 'TransportReport'],
    }),

    // =========================================================================
    // 8. Incidents
    // =========================================================================
    getIncidents: builder.query<ApiResponse<PaginatedResult<ITransportIncident>>, IncidentQueryFilters | void>({
      query: (params) => ({
        url: '/transport/incidents',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportIncident'],
    }),

    getIncidentById: builder.query<ApiResponse<ITransportIncident>, string>({
      query: (id) => ({
        url: `/transport/incidents/${id}`,
        method: 'GET',
      }),
      providesTags: ['TransportIncident'],
    }),

    reportIncident: builder.mutation<ApiResponse<ITransportIncident>, Partial<ITransportIncident>>({
      query: (body) => ({
        url: '/transport/incidents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportIncident', 'TransportReport'],
    }),

    updateIncident: builder.mutation<ApiResponse<ITransportIncident>, { id: string; data: Partial<ITransportIncident> }>({
      query: ({ id, data }) => ({
        url: `/transport/incidents/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TransportIncident', 'TransportReport'],
    }),

    // =========================================================================
    // 9. Maintenance & Inspection
    // =========================================================================
    getMaintenances: builder.query<ApiResponse<PaginatedResult<IVehicleMaintenance>>, MaintenanceQueryFilters | void>({
      query: (params) => ({
        url: '/transport/maintenance',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['VehicleMaintenance'],
    }),

    scheduleMaintenance: builder.mutation<ApiResponse<IVehicleMaintenance>, Partial<IVehicleMaintenance>>({
      query: (body) => ({
        url: '/transport/maintenance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VehicleMaintenance', 'Vehicle', 'TransportReport'],
    }),

    updateMaintenance: builder.mutation<ApiResponse<IVehicleMaintenance>, { id: string; data: Partial<IVehicleMaintenance> }>({
      query: ({ id, data }) => ({
        url: `/transport/maintenance/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['VehicleMaintenance', 'Vehicle', 'TransportReport'],
    }),

    getInspections: builder.query<ApiResponse<PaginatedResult<IVehicleInspection>>, InspectionQueryFilters | void>({
      query: (params) => ({
        url: '/transport/inspections',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['VehicleInspection'],
    }),

    recordInspection: builder.mutation<ApiResponse<IVehicleInspection>, Partial<IVehicleInspection>>({
      query: (body) => ({
        url: '/transport/inspections',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['VehicleInspection', 'Vehicle', 'TransportReport'],
    }),

    // =========================================================================
    // 10. Fees
    // =========================================================================
    getFeeAssignments: builder.query<ApiResponse<PaginatedResult<ITransportFeeAssignment>>, FeeAssignmentQueryFilters | void>({
      query: (params) => ({
        url: '/transport/fees/assignments',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['TransportFee'],
    }),

    generateTransportFeeInvoices: builder.mutation<ApiResponse<{ generatedInvoicesCount: number; period: string }>, { academicYearId: string; feeStructureId: string; billingMonth: number; billingYear: number; campusId?: string }>({
      query: (body) => ({
        url: '/transport/fees/generate-invoices',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransportFee', 'TransportReport'],
    }),
  }),
});

export const {
  useGetTransportDashboardKPIsQuery,
  useGetRouteOccupancyReportQuery,
  useGetDocumentExpiriesReportQuery,
  useGetTransportSettingsQuery,
  useUpdateTransportSettingsMutation,
  useGetVehicleTypesQuery,
  useCreateVehicleTypeMutation,
  useUpdateVehicleTypeMutation,
  useDeleteVehicleTypeMutation,
  useGetStopsQuery,
  useGetStopByIdQuery,
  useCreateStopMutation,
  useUpdateStopMutation,
  useDeleteStopMutation,
  useGetVehiclesQuery,
  useGetVehicleByIdQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useUpdateVehicleStatusMutation,
  useGetVehicleDocumentsQuery,
  useUploadVehicleDocumentMutation,
  useVerifyVehicleDocumentMutation,
  useGetDriversQuery,
  useGetDriverByIdQuery,
  useCreateDriverMutation,
  useUpdateDriverMutation,
  useGetDriverDocumentsQuery,
  useUploadDriverDocumentMutation,
  useVerifyDriverDocumentMutation,
  useGetAttendantsQuery,
  useCreateAttendantMutation,
  useUpdateAttendantMutation,
  useGetRoutesQuery,
  useGetRouteByIdQuery,
  useCreateRouteMutation,
  useUpdateRouteMutation,
  useDeleteRouteMutation,
  useGetRouteVersionsQuery,
  useGetTransportAssignmentsQuery,
  useGetTransportAssignmentByIdQuery,
  useCreateTransportAssignmentMutation,
  useUpdateTransportAssignmentMutation,
  useCancelTransportAssignmentMutation,
  useGetMyTransportAssignmentsQuery,
  useGetTripsQuery,
  useGetTripByIdQuery,
  useScheduleTripMutation,
  useStartTripMutation,
  useRecordTripTelemetryMutation,
  useRecordStudentBoardingMutation,
  useEndTripMutation,
  useCancelTripMutation,
  useGetIncidentsQuery,
  useGetIncidentByIdQuery,
  useReportIncidentMutation,
  useUpdateIncidentMutation,
  useGetMaintenancesQuery,
  useScheduleMaintenanceMutation,
  useUpdateMaintenanceMutation,
  useGetInspectionsQuery,
  useRecordInspectionMutation,
  useGetFeeAssignmentsQuery,
  useGenerateTransportFeeInvoicesMutation,
} = transportApi;
