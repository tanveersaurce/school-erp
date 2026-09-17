import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  IHostel,
  IHostelBuilding,
  IHostelFloor,
  IHostelRoomType,
  IHostelRoom,
  IHostelBed,
  IHostelStaffAssignment,
  IHostelStudentAllocation,
  IHostelAttendance,
  IHostelOuting,
  IHostelIncident,
  IHostelRoomInspection,
  IHostelMaintenance,
  IHostelFeeAssignment,
  HostelQueryFilters,
  BuildingQueryFilters,
  RoomQueryFilters,
  BedQueryFilters,
  AllocationQueryFilters,
  OutingQueryFilters,
  HostelIncidentQueryFilters,
  HostelMaintenanceQueryFilters,
  HostelInspectionQueryFilters,
  HostelFeeQueryFilters,
} from '@edusphere/types';

export interface IHostelDashboardData {
  totalCapacity: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  totalHostels: number;
  totalBuildings: number;
  totalRooms: number;
  activeOutings: number;
  overdueOutings: number;
  openMaintenance: number;
  openIncidents: number;
  attendanceBreakdown: Record<string, number>;
  hostels: {
    id: string;
    name: string;
    code: string;
    type: string;
    capacity: number;
    occupied: number;
    vacant: number;
    occupancyRate: number;
  }[];
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

export const hostelApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // =========================================================================
    // 1. Dashboard & Self Accommodation
    // =========================================================================
    getHostelDashboardStats: builder.query<ApiResponse<IHostelDashboardData>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/hostel/dashboard',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelStats'],
    }),

    getMyAccommodation: builder.query<ApiResponse<{ allocation: IHostelStudentAllocation | null; bed: IHostelBed | null; room: IHostelRoom | null; hostel: IHostel | null }>, void>({
      query: () => ({
        url: '/hostel/my',
        method: 'GET',
      }),
      providesTags: ['HostelAllocations', 'Hostels'],
    }),

    // =========================================================================
    // 2. Hostel Structure
    // =========================================================================
    getHostels: builder.query<ApiResponse<IHostel[]>, HostelQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/hostels',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Hostels'],
    }),

    getHostelById: builder.query<ApiResponse<IHostel>, string>({
      query: (id) => ({
        url: `/hostel/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'Hostels', id }],
    }),

    createHostel: builder.mutation<ApiResponse<IHostel>, Partial<IHostel>>({
      query: (body) => ({
        url: '/hostel',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Hostels', 'HostelStats'],
    }),

    updateHostel: builder.mutation<ApiResponse<IHostel>, { id: string; data: Partial<IHostel> }>({
      query: ({ id, data }) => ({
        url: `/hostel/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'Hostels', id }, 'Hostels', 'HostelStats'],
    }),

    deleteHostel: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/hostel/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Hostels', 'HostelStats'],
    }),

    // =========================================================================
    // 3. Buildings & Floors & Room Types
    // =========================================================================
    getBuildings: builder.query<ApiResponse<IHostelBuilding[]>, BuildingQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/buildings',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelBuildings'],
    }),

    createBuilding: builder.mutation<ApiResponse<IHostelBuilding>, Partial<IHostelBuilding>>({
      query: (body) => ({
        url: '/hostel/buildings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelBuildings', 'HostelStats'],
    }),

    getFloors: builder.query<ApiResponse<IHostelFloor[]>, { buildingId?: string; hostelId?: string } | void>({
      query: (params) => ({
        url: '/hostel/floors',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelFloors'],
    }),

    createFloor: builder.mutation<ApiResponse<IHostelFloor>, Partial<IHostelFloor>>({
      query: (body) => ({
        url: '/hostel/floors',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelFloors'],
    }),

    getRoomTypes: builder.query<ApiResponse<IHostelRoomType[]>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/hostel/room-types',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelRoomTypes'],
    }),

    createRoomType: builder.mutation<ApiResponse<IHostelRoomType>, Partial<IHostelRoomType>>({
      query: (body) => ({
        url: '/hostel/room-types',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelRoomTypes'],
    }),

    // =========================================================================
    // 4. Rooms & Beds
    // =========================================================================
    getRooms: builder.query<ApiResponse<IHostelRoom[]>, RoomQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/rooms',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelRooms'],
    }),

    getRoomById: builder.query<ApiResponse<IHostelRoom>, string>({
      query: (id) => ({
        url: `/hostel/rooms/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'HostelRooms', id }],
    }),

    createRoom: builder.mutation<ApiResponse<IHostelRoom>, Partial<IHostelRoom>>({
      query: (body) => ({
        url: '/hostel/rooms',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelRooms', 'Hostels', 'HostelStats'],
    }),

    updateRoom: builder.mutation<ApiResponse<IHostelRoom>, { id: string; data: Partial<IHostelRoom> }>({
      query: ({ id, data }) => ({
        url: `/hostel/rooms/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'HostelRooms', id }, 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    getBeds: builder.query<ApiResponse<IHostelBed[]>, BedQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/beds',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelBeds'],
    }),

    getBedById: builder.query<ApiResponse<IHostelBed>, string>({
      query: (id) => ({
        url: `/hostel/beds/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'HostelBeds', id }],
    }),

    createBed: builder.mutation<ApiResponse<IHostelBed>, Partial<IHostelBed>>({
      query: (body) => ({
        url: '/hostel/beds',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelBeds', 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    batchCreateBeds: builder.mutation<ApiResponse<IHostelBed[]>, { roomId: string; bedCount: number; codePrefix?: string }>({
      query: (body) => ({
        url: '/hostel/beds/batch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelBeds', 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    deleteBed: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/hostel/beds/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['HostelBeds', 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    // =========================================================================
    // 5. Staff & Wardens
    // =========================================================================
    getStaffAssignments: builder.query<ApiResponse<IHostelStaffAssignment[]>, { hostelId?: string } | void>({
      query: (params) => ({
        url: '/hostel/staff',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelStaff'],
    }),

    assignStaff: builder.mutation<ApiResponse<IHostelStaffAssignment>, Partial<IHostelStaffAssignment>>({
      query: (body) => ({
        url: '/hostel/staff',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelStaff'],
    }),

    removeStaffAssignment: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/hostel/staff/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['HostelStaff'],
    }),

    // =========================================================================
    // 6. Allocations, Check-in, Check-out, Transfers
    // =========================================================================
    getAllocations: builder.query<ApiResponse<PaginatedResult<IHostelStudentAllocation>>, AllocationQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/allocations',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelAllocations'],
    }),

    getAllocationById: builder.query<ApiResponse<IHostelStudentAllocation>, string>({
      query: (id) => ({
        url: `/hostel/allocations/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'HostelAllocations', id }],
    }),

    getStudentActiveAllocation: builder.query<ApiResponse<IHostelStudentAllocation | null>, string>({
      query: (studentId) => ({
        url: `/hostel/allocations/student/${studentId}/active`,
        method: 'GET',
      }),
      providesTags: ['HostelAllocations'],
    }),

    allocateBed: builder.mutation<ApiResponse<IHostelStudentAllocation>, {
      studentId: string;
      academicYearId: string;
      hostelId: string;
      buildingId: string;
      floorId?: string;
      roomId: string;
      bedId: string;
      expectedCheckInDate?: string | Date;
      reason?: string;
    }>({
      query: (body) => ({
        url: '/hostel/allocations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAllocations', 'HostelBeds', 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    checkIn: builder.mutation<ApiResponse<IHostelStudentAllocation>, string>({
      query: (id) => ({
        url: `/hostel/allocations/${id}/check-in`,
        method: 'POST',
      }),
      invalidatesTags: ['HostelAllocations', 'HostelBeds', 'HostelStats'],
    }),

    checkOut: builder.mutation<ApiResponse<IHostelStudentAllocation>, { id: string; checkoutReason?: string; clearanceStatus?: string }>({
      query: ({ id, ...body }) => ({
        url: `/hostel/allocations/${id}/check-out`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAllocations', 'HostelBeds', 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    transferBed: builder.mutation<ApiResponse<IHostelStudentAllocation>, {
      id: string;
      newHostelId: string;
      newBuildingId: string;
      newFloorId?: string;
      newRoomId: string;
      newBedId: string;
      transferReason: string;
      transferRemarks?: string;
    }>({
      query: ({ id, ...body }) => ({
        url: `/hostel/allocations/${id}/transfer`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAllocations', 'HostelBeds', 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    cancelAllocation: builder.mutation<ApiResponse<IHostelStudentAllocation>, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({
        url: `/hostel/allocations/${id}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAllocations', 'HostelBeds', 'HostelRooms', 'Hostels', 'HostelStats'],
    }),

    // =========================================================================
    // 7. Attendance
    // =========================================================================
    getAttendance: builder.query<ApiResponse<IHostelAttendance[]>, { hostelId?: string; studentId?: string; date?: string; status?: string } | void>({
      query: (params) => ({
        url: '/hostel/attendance',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelAttendance'],
    }),

    getAttendanceStats: builder.query<ApiResponse<any>, { hostelId?: string; date?: string } | void>({
      query: (params) => ({
        url: '/hostel/attendance/stats',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelAttendance', 'HostelStats'],
    }),

    markAttendance: builder.mutation<ApiResponse<IHostelAttendance>, Partial<IHostelAttendance>>({
      query: (body) => ({
        url: '/hostel/attendance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAttendance', 'HostelStats'],
    }),

    batchMarkAttendance: builder.mutation<ApiResponse<IHostelAttendance[]>, { hostelId: string; date: string; records: { studentId: string; status: string; remarks?: string }[] }>({
      query: (body) => ({
        url: '/hostel/attendance/batch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelAttendance', 'HostelStats'],
    }),

    // =========================================================================
    // 8. Outings
    // =========================================================================
    getOutings: builder.query<ApiResponse<PaginatedResult<IHostelOuting>>, OutingQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/outings',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelOutings'],
    }),

    requestOuting: builder.mutation<ApiResponse<IHostelOuting>, {
      studentId: string;
      hostelId: string;
      startDateTime: string | Date;
      expectedReturnDateTime: string | Date;
      reason: string;
      destination: string;
    }>({
      query: (body) => ({
        url: '/hostel/outings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelOutings', 'HostelStats'],
    }),

    approveOuting: builder.mutation<ApiResponse<IHostelOuting>, string>({
      query: (id) => ({
        url: `/hostel/outings/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['HostelOutings', 'HostelStats'],
    }),

    recordOutingDeparture: builder.mutation<ApiResponse<IHostelOuting>, string>({
      query: (id) => ({
        url: `/hostel/outings/${id}/depart`,
        method: 'POST',
      }),
      invalidatesTags: ['HostelOutings', 'HostelStats'],
    }),

    recordOutingReturn: builder.mutation<ApiResponse<IHostelOuting>, string>({
      query: (id) => ({
        url: `/hostel/outings/${id}/return`,
        method: 'POST',
      }),
      invalidatesTags: ['HostelOutings', 'HostelStats'],
    }),

    cancelOuting: builder.mutation<ApiResponse<IHostelOuting>, string>({
      query: (id) => ({
        url: `/hostel/outings/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['HostelOutings', 'HostelStats'],
    }),

    // =========================================================================
    // 9. Incidents
    // =========================================================================
    getIncidents: builder.query<ApiResponse<PaginatedResult<IHostelIncident>>, HostelIncidentQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/incidents',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelIncidents'],
    }),

    reportIncident: builder.mutation<ApiResponse<IHostelIncident>, Partial<IHostelIncident>>({
      query: (body) => ({
        url: '/hostel/incidents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelIncidents', 'HostelStats'],
    }),

    updateIncident: builder.mutation<ApiResponse<IHostelIncident>, { id: string; data: Partial<IHostelIncident> }>({
      query: ({ id, data }) => ({
        url: `/hostel/incidents/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['HostelIncidents', 'HostelStats'],
    }),

    // =========================================================================
    // 10. Inspections & Maintenance
    // =========================================================================
    getInspections: builder.query<ApiResponse<PaginatedResult<IHostelRoomInspection>>, HostelInspectionQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/inspections',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelInspections'],
    }),

    createInspection: builder.mutation<ApiResponse<IHostelRoomInspection>, Partial<IHostelRoomInspection>>({
      query: (body) => ({
        url: '/hostel/inspections',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelInspections'],
    }),

    getMaintenanceRequests: builder.query<ApiResponse<PaginatedResult<IHostelMaintenance>>, HostelMaintenanceQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/maintenance',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelMaintenance'],
    }),

    createMaintenance: builder.mutation<ApiResponse<IHostelMaintenance>, Partial<IHostelMaintenance>>({
      query: (body) => ({
        url: '/hostel/maintenance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelMaintenance', 'HostelStats'],
    }),

    updateMaintenance: builder.mutation<ApiResponse<IHostelMaintenance>, { id: string; data: Partial<IHostelMaintenance> }>({
      query: ({ id, data }) => ({
        url: `/hostel/maintenance/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['HostelMaintenance', 'HostelStats'],
    }),

    // =========================================================================
    // 11. Fees
    // =========================================================================
    getFeeAssignments: builder.query<ApiResponse<PaginatedResult<IHostelFeeAssignment>>, HostelFeeQueryFilters | void>({
      query: (params) => ({
        url: '/hostel/fees',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['HostelFees'],
    }),

    createFeeAssignment: builder.mutation<ApiResponse<IHostelFeeAssignment>, Partial<IHostelFeeAssignment>>({
      query: (body) => ({
        url: '/hostel/fees',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['HostelFees'],
    }),

    generateInvoice: builder.mutation<ApiResponse<IHostelFeeAssignment>, string>({
      query: (id) => ({
        url: `/hostel/fees/${id}/generate-invoice`,
        method: 'POST',
      }),
      invalidatesTags: ['HostelFees', 'FeeInvoice'],
    }),
  }),
});

export const {
  useGetHostelDashboardStatsQuery,
  useGetMyAccommodationQuery,
  useGetHostelsQuery,
  useGetHostelByIdQuery,
  useCreateHostelMutation,
  useUpdateHostelMutation,
  useDeleteHostelMutation,
  useGetBuildingsQuery,
  useCreateBuildingMutation,
  useGetFloorsQuery,
  useCreateFloorMutation,
  useGetRoomTypesQuery,
  useCreateRoomTypeMutation,
  useGetRoomsQuery,
  useGetRoomByIdQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useGetBedsQuery,
  useGetBedByIdQuery,
  useCreateBedMutation,
  useBatchCreateBedsMutation,
  useDeleteBedMutation,
  useGetStaffAssignmentsQuery,
  useAssignStaffMutation,
  useRemoveStaffAssignmentMutation,
  useGetAllocationsQuery,
  useGetAllocationByIdQuery,
  useGetStudentActiveAllocationQuery,
  useAllocateBedMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useTransferBedMutation,
  useCancelAllocationMutation,
  useGetAttendanceQuery,
  useGetAttendanceStatsQuery,
  useMarkAttendanceMutation,
  useBatchMarkAttendanceMutation,
  useGetOutingsQuery,
  useRequestOutingMutation,
  useApproveOutingMutation,
  useRecordOutingDepartureMutation,
  useRecordOutingReturnMutation,
  useCancelOutingMutation,
  useGetIncidentsQuery,
  useReportIncidentMutation,
  useUpdateIncidentMutation,
  useGetInspectionsQuery,
  useCreateInspectionMutation,
  useGetMaintenanceRequestsQuery,
  useCreateMaintenanceMutation,
  useUpdateMaintenanceMutation,
  useGetFeeAssignmentsQuery,
  useCreateFeeAssignmentMutation,
  useGenerateInvoiceMutation,
} = hostelApi;
