import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import {
  InventoryDashboardPage,
  InventoryItemsPage,
  InventoryStoresPage,
  InventoryStockPage,
  InventoryAssetsPage,
} from '../pages/inventory/index.js';
import {
  UserType,
  UserStatus,
  InventoryItemType,
  InventoryStoreStatus,
  AssetStatus,
  AssetCondition,
} from '@edusphere/common';

// =============================================================================
// Mock Domain Data
// =============================================================================

const mockKPIs = {
  totalItems: 42,
  activeItems: 40,
  totalStockQuantity: 1850,
  totalStockValuationMinorUnits: 3450000, // $34,500.00
  lowStockItemsCount: 3,
  outOfStockItemsCount: 1,
  expiringStockCount: 2,
  totalAssets: 15,
  assignedAssets: 10,
  availableAssets: 4,
  maintenanceAssets: 1,
  lostAssets: 0,
  damagedAssets: 0,
  pendingReceipts: 2,
  pendingTransfers: 1,
  openStocktakes: 1,
};

const mockItem = {
  _id: 'item_001',
  id: 'item_001',
  itemCode: 'CHM-SUL-001',
  name: 'Sulfuric Acid 98% AR Grade',
  description: 'Concentrated laboratory chemical',
  categoryId: { _id: 'cat_001', name: 'Science Laboratory' },
  unitId: { _id: 'unit_001', name: 'Liters', symbol: 'L' },
  itemType: InventoryItemType.CONSUMABLE,
  reorderLevel: 10,
  minimumStock: 5,
  trackBatch: true,
  trackExpiry: true,
  active: true,
};

const mockStore = {
  _id: 'store_001',
  id: 'store_001',
  name: 'Main Chemistry Depot',
  code: 'STR-CHEM-01',
  location: 'Science Block, Room 102',
  status: InventoryStoreStatus.ACTIVE,
  active: true,
};

const mockStock = {
  _id: 'stock_001',
  id: 'stock_001',
  itemId: mockItem,
  storeId: mockStore,
  quantityOnHand: 45,
  quantityReserved: 5,
  quantityAvailable: 40,
  reorderLevel: 10,
  averageCostMinorUnits: 2500, // $25.00
};

const mockAsset = {
  _id: 'asset_001',
  id: 'asset_001',
  assetTag: 'AST-MIC-2026-101',
  serialNumber: 'SN-OLYMPUS-99182',
  itemId: {
    _id: 'item_002',
    name: 'Compound Binocular Microscope',
    itemCode: 'EQP-MIC-01',
  },
  model: 'CX23 LED',
  manufacturer: 'Olympus',
  purchaseCostMinorUnits: 125000, // $1,250.00
  status: AssetStatus.AVAILABLE,
  condition: AssetCondition.NEW,
  currentStoreId: mockStore,
};

// =============================================================================
// Test Store & Providers Setup
// =============================================================================

function createTestStore(
  userType: UserType = UserType.INVENTORY_MANAGER,
  userPermissions: string[] = [
    'inventory:read',
    'inventory:manage',
    'inventory_item:read',
    'inventory_item:create',
    'inventory_store:read',
    'inventory_store:create',
    'inventory_stock:read',
    'inventory_asset:read',
    'inventory_asset:create',
    'inventory_report:read',
  ]
) {
  const rootReducer = combineReducers({
    auth: authReducer,
    ui: uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(baseApi.middleware) as any,
    preloadedState: {
      auth: {
        isAuthenticated: true,
        isInitialized: true,
        currentSession: null,
        user: {
          id: 'inv_manager_01',
          tenantId: 'tenant_test_123',
          schoolId: 'school_test_123',
          email: 'inventory@edusphere.edu',
          userType,
          status: UserStatus.ACTIVE,
          roles: [userType],
          permissions: userPermissions,
        },
        accessToken: 'mock_jwt_token',
      },
    },
  });
}

function renderWithProviders(element: React.ReactElement, store = createTestStore()) {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>{element}</ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Phase 18: Inventory Management Frontend Component Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    const jsonResponse = (data: any) =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as any).url || String(input);

      if (url.includes('/inventory/reports/dashboard')) {
        return jsonResponse(mockKPIs);
      }
      if (url.includes('/inventory/items')) {
        return jsonResponse({ items: [mockItem], pagination: { total: 1, page: 1, totalPages: 1 } });
      }
      if (url.includes('/inventory/categories')) {
        return jsonResponse([{ id: 'cat_001', name: 'Science Laboratory', code: 'SCI' }]);
      }
      if (url.includes('/inventory/units')) {
        return jsonResponse([{ id: 'unit_001', name: 'Liters', code: 'LTR', symbol: 'L' }]);
      }
      if (url.includes('/inventory/stores')) {
        return jsonResponse([mockStore]);
      }
      if (url.includes('/inventory/stock')) {
        return jsonResponse([mockStock]);
      }
      if (url.includes('/inventory/assets')) {
        return jsonResponse({ items: [mockAsset], pagination: { total: 1, page: 1, totalPages: 1 } });
      }

      return jsonResponse({});
    });
  });

  it('1. Renders Inventory Dashboard with KPIs and Stock Valuation', async () => {
    renderWithProviders(<InventoryDashboardPage />);

    // Check title
    expect(screen.getByText(/Inventory & Asset Management/i)).toBeInTheDocument();

    // Check valuation KPI formatted
    await waitFor(() => {
      expect(screen.getByText(/\$34,500\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/42/i)).toBeInTheDocument(); // total items
      expect(screen.getByText(/15/i)).toBeInTheDocument(); // total assets
    });
  });

  it('2. Renders Inventory Items Catalog with classification and reorder level', async () => {
    renderWithProviders(<InventoryItemsPage />);

    expect(screen.getByText(/Inventory Item Catalog/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sulfuric Acid 98% AR Grade')).toBeInTheDocument();
      expect(screen.getByText('CHM-SUL-001')).toBeInTheDocument();
      expect(screen.getByText('Consumable')).toBeInTheDocument();
    });
  });

  it('3. Renders Stores & Warehouses list', async () => {
    renderWithProviders(<InventoryStoresPage />);

    expect(screen.getByText(/Stores & Warehouses/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Main Chemistry Depot')).toBeInTheDocument();
      expect(screen.getByText('STR-CHEM-01')).toBeInTheDocument();
      expect(screen.getByText('Science Block, Room 102')).toBeInTheDocument();
    });
  });

  it('4. Renders Stock Balances with on-hand, reserved, and available quantities', async () => {
    renderWithProviders(<InventoryStockPage />);

    expect(screen.getByText(/Stock & Inventory Balances/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument(); // on hand
      expect(screen.getByText('5')).toBeInTheDocument(); // reserved
      expect(screen.getByText('40')).toBeInTheDocument(); // available
      expect(screen.getByText('$1,125.00')).toBeInTheDocument(); // 45 * $25 = $1125.00
    });
  });

  it('5. Renders Durable Asset Register with asset tag and serial number', async () => {
    renderWithProviders(<InventoryAssetsPage />);

    expect(screen.getByText(/Durable Asset Register/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('AST-MIC-2026-101')).toBeInTheDocument();
      expect(screen.getByText(/SN-OLYMPUS-99182/i)).toBeInTheDocument();
      expect(screen.getByText('Compound Binocular Microscope')).toBeInTheDocument();
      expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
    });
  });
});
