import { baseApi } from '../../services/api.js';
import type { ApiResponse } from '@edusphere/common';
import type {
  IInventoryCategory,
  IInventoryUnit,
  IInventorySupplier,
  IInventoryStore,
  IInventoryLocation,
  IInventoryItem,
  IInventoryStock,
  IInventoryStockBatch,
  IInventoryStockLedger,
  IInventoryStockReservation,
  IInventoryReceipt,
  IInventoryIssue,
  IInventoryReturn,
  IInventoryTransfer,
  IInventoryAdjustment,
  IInventoryStocktake,
  IInventoryAsset,
  IInventoryAssetMaintenance,
  IInventorySetting,
  IInventoryDashboardKPIs,
} from '@edusphere/types';

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------------------------------------------------------------
    // Dashboard & Reports
    // -------------------------------------------------------------------------
    getInventoryDashboardKPIs: builder.query<ApiResponse<IInventoryDashboardKPIs>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/inventory/reports/dashboard',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryStats'],
    }),

    getInventoryValuationReport: builder.query<ApiResponse<any>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/inventory/reports/valuation',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryReports'],
    }),

    getInventoryAssetAuditReport: builder.query<ApiResponse<any>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/inventory/reports/assets',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryReports'],
    }),

    getInventoryExpiringStockReport: builder.query<ApiResponse<any>, { schoolId?: string; daysAhead?: number } | void>({
      query: (params) => ({
        url: '/inventory/reports/expiring',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryReports'],
    }),

    getInventoryLowStockReport: builder.query<ApiResponse<any>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/inventory/reports/low-stock',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryReports'],
    }),

    // -------------------------------------------------------------------------
    // Categories & Units
    // -------------------------------------------------------------------------
    getInventoryCategories: builder.query<ApiResponse<IInventoryCategory[]>, { schoolId?: string; active?: boolean } | void>({
      query: (params) => ({
        url: '/inventory/categories',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryCategories'],
    }),

    createInventoryCategory: builder.mutation<ApiResponse<IInventoryCategory>, Partial<IInventoryCategory>>({
      query: (body) => ({
        url: '/inventory/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryCategories'],
    }),

    getInventoryUnits: builder.query<ApiResponse<IInventoryUnit[]>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/inventory/units',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryUnits'],
    }),

    createInventoryUnit: builder.mutation<ApiResponse<IInventoryUnit>, Partial<IInventoryUnit>>({
      query: (body) => ({
        url: '/inventory/units',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryUnits'],
    }),

    // -------------------------------------------------------------------------
    // Suppliers & Vendors
    // -------------------------------------------------------------------------
    getInventorySuppliers: builder.query<ApiResponse<IInventorySupplier[]>, { schoolId?: string; search?: string } | void>({
      query: (params) => ({
        url: '/inventory/suppliers',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventorySuppliers'],
    }),

    createInventorySupplier: builder.mutation<ApiResponse<IInventorySupplier>, Partial<IInventorySupplier>>({
      query: (body) => ({
        url: '/inventory/suppliers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventorySuppliers'],
    }),

    // -------------------------------------------------------------------------
    // Stores & Locations
    // -------------------------------------------------------------------------
    getInventoryStores: builder.query<ApiResponse<IInventoryStore[]>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/inventory/stores',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryStores'],
    }),

    getInventoryStoreById: builder.query<ApiResponse<IInventoryStore>, string>({
      query: (id) => ({
        url: `/inventory/stores/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'InventoryStores', id }],
    }),

    createInventoryStore: builder.mutation<ApiResponse<IInventoryStore>, Partial<IInventoryStore>>({
      query: (body) => ({
        url: '/inventory/stores',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryStores'],
    }),

    getInventoryLocations: builder.query<ApiResponse<IInventoryLocation[]>, { storeId?: string } | void>({
      query: (params) => ({
        url: '/inventory/locations',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryLocations'],
    }),

    createInventoryLocation: builder.mutation<ApiResponse<IInventoryLocation>, Partial<IInventoryLocation>>({
      query: (body) => ({
        url: '/inventory/locations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryLocations'],
    }),

    // -------------------------------------------------------------------------
    // Catalog Items
    // -------------------------------------------------------------------------
    getInventoryItems: builder.query<ApiResponse<PaginatedResult<IInventoryItem>>, {
      schoolId?: string;
      categoryId?: string;
      itemType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } | void>({
      query: (params) => ({
        url: '/inventory/items',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryItems'],
    }),

    getInventoryItemById: builder.query<ApiResponse<IInventoryItem>, string>({
      query: (id) => ({
        url: `/inventory/items/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'InventoryItems', id }],
    }),

    createInventoryItem: builder.mutation<ApiResponse<IInventoryItem>, Partial<IInventoryItem>>({
      query: (body) => ({
        url: '/inventory/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryItems', 'InventoryStats'],
    }),

    updateInventoryItem: builder.mutation<ApiResponse<IInventoryItem>, { id: string; data: Partial<IInventoryItem> }>({
      query: ({ id, data }) => ({
        url: `/inventory/items/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [{ type: 'InventoryItems', id }, 'InventoryItems'],
    }),

    // -------------------------------------------------------------------------
    // Stock & Batches & Ledger
    // -------------------------------------------------------------------------
    getInventoryStock: builder.query<ApiResponse<IInventoryStock[]>, { storeId?: string; itemId?: string; lowStock?: boolean } | void>({
      query: (params) => ({
        url: '/inventory/stock',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryStock'],
    }),

    getInventoryStockBatches: builder.query<ApiResponse<IInventoryStockBatch[]>, { storeId?: string; itemId?: string } | void>({
      query: (params) => ({
        url: '/inventory/stock/batches',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryStock'],
    }),

    getInventoryStockLedger: builder.query<ApiResponse<PaginatedResult<IInventoryStockLedger>>, {
      storeId?: string;
      itemId?: string;
      movementType?: string;
      page?: number;
      limit?: number;
    } | void>({
      query: (params) => ({
        url: '/inventory/stock/ledger',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryStock'],
    }),

    // -------------------------------------------------------------------------
    // Receipts, Issues, Returns, Transfers, Adjustments
    // -------------------------------------------------------------------------
    getInventoryReceipts: builder.query<ApiResponse<PaginatedResult<IInventoryReceipt>>, { storeId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/inventory/receipts',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryReceipts'],
    }),

    getInventoryReceiptById: builder.query<ApiResponse<IInventoryReceipt>, string>({
      query: (id) => ({
        url: `/inventory/receipts/${id}`,
        method: 'GET',
      }),
      providesTags: ['InventoryReceipts'],
    }),

    createInventoryReceipt: builder.mutation<ApiResponse<IInventoryReceipt>, any>({
      query: (body) => ({
        url: '/inventory/receipts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryReceipts', 'InventoryStock', 'InventoryStats'],
    }),

    getInventoryIssues: builder.query<ApiResponse<PaginatedResult<IInventoryIssue>>, { storeId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/inventory/issues',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryIssues'],
    }),

    createInventoryIssue: builder.mutation<ApiResponse<IInventoryIssue>, any>({
      query: (body) => ({
        url: '/inventory/issues',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryIssues', 'InventoryStock', 'InventoryStats'],
    }),

    getInventoryReturns: builder.query<ApiResponse<PaginatedResult<IInventoryReturn>>, { storeId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/inventory/returns',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryReturns'],
    }),

    createInventoryReturn: builder.mutation<ApiResponse<IInventoryReturn>, any>({
      query: (body) => ({
        url: '/inventory/returns',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryReturns', 'InventoryStock', 'InventoryStats'],
    }),

    getInventoryTransfers: builder.query<ApiResponse<PaginatedResult<IInventoryTransfer>>, { storeId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/inventory/transfers',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryTransfers'],
    }),

    createInventoryTransfer: builder.mutation<ApiResponse<IInventoryTransfer>, any>({
      query: (body) => ({
        url: '/inventory/transfers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryTransfers', 'InventoryStock'],
    }),

    dispatchInventoryTransfer: builder.mutation<ApiResponse<IInventoryTransfer>, string>({
      query: (id) => ({
        url: `/inventory/transfers/${id}/dispatch`,
        method: 'POST',
      }),
      invalidatesTags: ['InventoryTransfers', 'InventoryStock'],
    }),

    receiveInventoryTransfer: builder.mutation<ApiResponse<IInventoryTransfer>, string>({
      query: (id) => ({
        url: `/inventory/transfers/${id}/receive`,
        method: 'POST',
      }),
      invalidatesTags: ['InventoryTransfers', 'InventoryStock'],
    }),

    getInventoryAdjustments: builder.query<ApiResponse<PaginatedResult<IInventoryAdjustment>>, { storeId?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/inventory/adjustments',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryAdjustments'],
    }),

    createInventoryAdjustment: builder.mutation<ApiResponse<IInventoryAdjustment>, any>({
      query: (body) => ({
        url: '/inventory/adjustments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryAdjustments', 'InventoryStock', 'InventoryStats'],
    }),

    // -------------------------------------------------------------------------
    // Stocktakes
    // -------------------------------------------------------------------------
    getInventoryStocktakes: builder.query<ApiResponse<PaginatedResult<IInventoryStocktake>>, { storeId?: string; status?: string } | void>({
      query: (params) => ({
        url: '/inventory/stocktakes',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryStocktakes'],
    }),

    getStocktakeById: builder.query<ApiResponse<IInventoryStocktake>, string>({
      query: (id) => ({
        url: `/inventory/stocktakes/${id}`,
        method: 'GET',
      }),
      providesTags: ['InventoryStocktakes'],
    }),

    createStocktake: builder.mutation<ApiResponse<IInventoryStocktake>, any>({
      query: (body) => ({
        url: '/inventory/stocktakes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryStocktakes'],
    }),

    startStocktake: builder.mutation<ApiResponse<IInventoryStocktake>, string>({
      query: (id) => ({
        url: `/inventory/stocktakes/${id}/start`,
        method: 'POST',
      }),
      invalidatesTags: ['InventoryStocktakes'],
    }),

    recordStocktakeCount: builder.mutation<ApiResponse<IInventoryStocktake>, { id: string; items: any[] }>({
      query: ({ id, items }) => ({
        url: `/inventory/stocktakes/${id}/items`,
        method: 'POST',
        body: { items },
      }),
      invalidatesTags: ['InventoryStocktakes'],
    }),

    reviewStocktake: builder.mutation<ApiResponse<IInventoryStocktake>, string>({
      query: (id) => ({
        url: `/inventory/stocktakes/${id}/review`,
        method: 'POST',
      }),
      invalidatesTags: ['InventoryStocktakes'],
    }),

    reconcileStocktake: builder.mutation<ApiResponse<IInventoryStocktake>, string>({
      query: (id) => ({
        url: `/inventory/stocktakes/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['InventoryStocktakes', 'InventoryStock', 'InventoryAdjustments', 'InventoryStats'],
    }),

    // -------------------------------------------------------------------------
    // Reservations
    // -------------------------------------------------------------------------
    getInventoryReservations: builder.query<ApiResponse<IInventoryStockReservation[]>, { storeId?: string; itemId?: string } | void>({
      query: (params) => ({
        url: '/inventory/reservations',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryReservations'],
    }),

    createInventoryReservation: builder.mutation<ApiResponse<IInventoryStockReservation>, any>({
      query: (body) => ({
        url: '/inventory/reservations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryReservations', 'InventoryStock'],
    }),

    fulfillInventoryReservation: builder.mutation<ApiResponse<IInventoryStockReservation>, string>({
      query: (id) => ({
        url: `/inventory/reservations/${id}/fulfill`,
        method: 'POST',
      }),
      invalidatesTags: ['InventoryReservations', 'InventoryStock'],
    }),

    cancelInventoryReservation: builder.mutation<ApiResponse<IInventoryStockReservation>, string>({
      query: (id) => ({
        url: `/inventory/reservations/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['InventoryReservations', 'InventoryStock'],
    }),

    // -------------------------------------------------------------------------
    // Durable Assets
    // -------------------------------------------------------------------------
    getInventoryAssets: builder.query<ApiResponse<PaginatedResult<IInventoryAsset>>, {
      schoolId?: string;
      itemId?: string;
      status?: string;
      assignedToType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } | void>({
      query: (params) => ({
        url: '/inventory/assets',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryAssets'],
    }),

    getInventoryAssetById: builder.query<ApiResponse<IInventoryAsset>, string>({
      query: (id) => ({
        url: `/inventory/assets/${id}`,
        method: 'GET',
      }),
      providesTags: (_res, _err, id) => [{ type: 'InventoryAssets', id }],
    }),

    createInventoryAsset: builder.mutation<ApiResponse<IInventoryAsset>, Partial<IInventoryAsset>>({
      query: (body) => ({
        url: '/inventory/assets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryAssets', 'InventoryStats'],
    }),

    assignInventoryAsset: builder.mutation<ApiResponse<IInventoryAsset>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/inventory/assets/${id}/assign`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['InventoryAssets', 'InventoryStats'],
    }),

    returnInventoryAsset: builder.mutation<ApiResponse<IInventoryAsset>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/inventory/assets/${id}/return`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['InventoryAssets', 'InventoryStats'],
    }),

    transferInventoryAsset: builder.mutation<ApiResponse<IInventoryAsset>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/inventory/assets/${id}/transfer`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['InventoryAssets'],
    }),

    disposeInventoryAsset: builder.mutation<ApiResponse<IInventoryAsset>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/inventory/assets/${id}/dispose`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['InventoryAssets', 'InventoryStats'],
    }),

    getInventoryMaintenance: builder.query<ApiResponse<IInventoryAssetMaintenance[]>, { assetId?: string; status?: string } | void>({
      query: (params) => ({
        url: '/inventory/maintenance',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryMaintenance'],
    }),

    logInventoryMaintenance: builder.mutation<ApiResponse<IInventoryAssetMaintenance>, any>({
      query: (body) => ({
        url: '/inventory/maintenance',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InventoryMaintenance', 'InventoryAssets', 'InventoryStats'],
    }),

    updateInventoryMaintenance: builder.mutation<ApiResponse<IInventoryAssetMaintenance>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/inventory/maintenance/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['InventoryMaintenance', 'InventoryAssets'],
    }),

    // -------------------------------------------------------------------------
    // Settings
    // -------------------------------------------------------------------------
    getInventorySettings: builder.query<ApiResponse<IInventorySetting>, { schoolId?: string } | void>({
      query: (params) => ({
        url: '/inventory/settings',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['InventoryStats'],
    }),

    updateInventorySettings: builder.mutation<ApiResponse<IInventorySetting>, Partial<IInventorySetting>>({
      query: (body) => ({
        url: '/inventory/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['InventoryStats'],
    }),
  }),
});

export const {
  useGetInventoryDashboardKPIsQuery,
  useGetInventoryValuationReportQuery,
  useGetInventoryAssetAuditReportQuery,
  useGetInventoryExpiringStockReportQuery,
  useGetInventoryLowStockReportQuery,
  useGetInventoryCategoriesQuery,
  useCreateInventoryCategoryMutation,
  useGetInventoryUnitsQuery,
  useCreateInventoryUnitMutation,
  useGetInventorySuppliersQuery,
  useCreateInventorySupplierMutation,
  useGetInventoryStoresQuery,
  useGetInventoryStoreByIdQuery,
  useCreateInventoryStoreMutation,
  useGetInventoryLocationsQuery,
  useCreateInventoryLocationMutation,
  useGetInventoryItemsQuery,
  useGetInventoryItemByIdQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useGetInventoryStockQuery,
  useGetInventoryStockBatchesQuery,
  useGetInventoryStockLedgerQuery,
  useGetInventoryReceiptsQuery,
  useGetInventoryReceiptByIdQuery,
  useCreateInventoryReceiptMutation,
  useGetInventoryIssuesQuery,
  useCreateInventoryIssueMutation,
  useGetInventoryReturnsQuery,
  useCreateInventoryReturnMutation,
  useGetInventoryTransfersQuery,
  useCreateInventoryTransferMutation,
  useDispatchInventoryTransferMutation,
  useReceiveInventoryTransferMutation,
  useGetInventoryAdjustmentsQuery,
  useCreateInventoryAdjustmentMutation,
  useGetInventoryStocktakesQuery,
  useGetStocktakeByIdQuery,
  useCreateStocktakeMutation,
  useStartStocktakeMutation,
  useRecordStocktakeCountMutation,
  useReviewStocktakeMutation,
  useReconcileStocktakeMutation,
  useGetInventoryReservationsQuery,
  useCreateInventoryReservationMutation,
  useFulfillInventoryReservationMutation,
  useCancelInventoryReservationMutation,
  useGetInventoryAssetsQuery,
  useGetInventoryAssetByIdQuery,
  useCreateInventoryAssetMutation,
  useAssignInventoryAssetMutation,
  useReturnInventoryAssetMutation,
  useTransferInventoryAssetMutation,
  useDisposeInventoryAssetMutation,
  useGetInventoryMaintenanceQuery,
  useLogInventoryMaintenanceMutation,
  useUpdateInventoryMaintenanceMutation,
  useGetInventorySettingsQuery,
  useUpdateInventorySettingsMutation,
} = inventoryApi;
