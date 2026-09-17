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
  HostelDashboardPage,
  HostelsPage,
  BedsPage,
  AllocationsPage,
  OutingsPage,
  MyHostelPage,
} from '../pages/hostel/index.js';
import {
  UserType,
  UserStatus,
  HostelType,
  HostelStatus,
  BedStatus,
  HostelAllocationStatus,
  HostelOutingStatus,
} from '@edusphere/common';

// =============================================================================
// Mock Domain Data
// =============================================================================

const mockDashboardStats = {
  totalHostels: 4,
  totalBuildings: 6,
  totalRooms: 120,
  totalCapacity: 300,
  occupiedBeds: 245,
  vacantBeds: 50,
  maintenanceBeds: 5,
  occupancyRate: 81.67,
  activeAllocations: 245,
  checkedInToday: 12,
  checkedOutToday: 3,
  pendingTransfers: 2,
  openIncidents: 1,
  pendingMaintenance: 4,
  activeOutings: 8,
};

const mockHostel = {
  _id: 'hostel_001',
  id: 'hostel_001',
  name: 'Himalaya Boys Hostel',
  code: 'HBH-01',
  type: HostelType.BOYS,
  status: HostelStatus.ACTIVE,
  description: 'Senior boys residential hall',
  address: 'North Residential Zone',
  totalFloors: 4,
  totalRooms: 60,
  capacity: 150,
  contactPhone: '+91 9876543210',
  contactEmail: 'himalaya.warden@edusphere.edu',
};

const mockBuilding = {
  _id: 'bld_001',
  id: 'bld_001',
  hostelId: 'hostel_001',
  name: 'Wing A',
  code: 'WA',
  totalFloors: 4,
};

const mockRoom = {
  _id: 'rm_001',
  id: 'rm_001',
  hostelId: 'hostel_001',
  roomNumber: '101',
  floor: 1,
  capacity: 2,
  occupiedBeds: 1,
};

const mockBed = {
  _id: 'bed_001',
  id: 'bed_001',
  hostelId: { _id: 'hostel_001', name: 'Himalaya Boys Hostel' },
  roomId: { _id: 'rm_001', roomNumber: '101', floor: 1 },
  bedNumber: '101-A',
  code: 'BED-101-A',
  status: BedStatus.AVAILABLE,
  monthlyFeeMinorUnits: 450000, // ₹4,500.00
};

const mockAllocation = {
  _id: 'alloc_001',
  id: 'alloc_001',
  studentId: {
    _id: 'stud_001',
    personalDetails: {
      firstName: 'Rohan',
      lastName: 'Mehta',
    },
    admissionNumber: 'ADM-2026-088',
  },
  hostelId: { _id: 'hostel_001', name: 'Himalaya Boys Hostel', code: 'HBH-01' },
  roomId: { _id: 'rm_001', roomNumber: '101', floor: 1 },
  bedId: { _id: 'bed_001', bedNumber: '101-A', code: 'BED-101-A' },
  status: HostelAllocationStatus.CHECKED_IN,
  allocationDate: '2026-08-01T09:00:00.000Z',
  actualCheckInDate: '2026-08-01T09:00:00.000Z',
  totalFeeMinorUnits: 450000,
};

const mockOuting = {
  _id: 'out_001',
  id: 'out_001',
  studentId: {
    _id: 'stud_001',
    personalDetails: {
      firstName: 'Rohan',
      lastName: 'Mehta',
    },
    admissionNumber: 'ADM-2026-088',
  },
  hostelId: { _id: 'hostel_001', name: 'Himalaya Boys Hostel' },
  status: HostelOutingStatus.APPROVED,
  destination: 'City Library & Book Market',
  purpose: 'Academic project research',
  startDateTime: '2026-09-17T10:00:00.000Z',
  expectedReturnDateTime: '2026-09-17T18:00:00.000Z',
};

// =============================================================================
// Test Store & Providers Setup
// =============================================================================

function createTestStore(
  userType: UserType = UserType.HOSTEL_MANAGER,
  userPermissions: string[] = [
    'hostel:read',
    'hostel:manage',
    'hostel:building:read',
    'hostel:building:manage',
    'hostel:room:read',
    'hostel:room:manage',
    'hostel:bed:read',
    'hostel:bed:manage',
    'hostel:staff:read',
    'hostel:staff:manage',
    'hostel:allocation:read',
    'hostel:allocation:manage',
    'hostel:attendance:read',
    'hostel:attendance:manage',
    'hostel:outing:read',
    'hostel:outing:manage',
    'hostel:incident:read',
    'hostel:incident:manage',
    'hostel:inspection:read',
    'hostel:inspection:manage',
    'hostel:maintenance:read',
    'hostel:maintenance:manage',
    'hostel:document:read',
    'hostel:document:manage',
    'hostel:report:read',
    'hostel:setting:manage',
    'hostel:student:view',
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
          id: 'warden_user_01',
          tenantId: 'tenant_test_123',
          schoolId: 'school_test_123',
          email: 'warden@edusphere.edu',
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

describe('Phase 17: Hostel Management Frontend Component Suite', () => {
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

      if (url.includes('/hostel/dashboard')) {
        return jsonResponse(mockDashboardStats);
      }
      if (url.includes('/hostel/occupancy')) {
        return jsonResponse([]);
      }
      if (url.includes('/hostel/my')) {
        return jsonResponse({
          allocation: mockAllocation,
          bed: mockBed,
          room: mockRoom,
          hostel: mockHostel,
        });
      }
      if (url.includes('/hostel/allocations')) {
        return jsonResponse({ items: [mockAllocation], pagination: { total: 1, page: 1, limit: 20 } });
      }
      if (url.includes('/hostel/outings')) {
        return jsonResponse({ items: [mockOuting], pagination: { total: 1, page: 1, limit: 20 } });
      }
      if (url.includes('/hostel/beds')) {
        return jsonResponse([mockBed]);
      }
      if (url.includes('/hostel/rooms')) {
        return jsonResponse([mockRoom]);
      }
      if (url.includes('/hostel/buildings')) {
        return jsonResponse([mockBuilding]);
      }
      if (url.includes('/hostel/hostels')) {
        return jsonResponse([mockHostel]);
      }
      if (url.includes('/hostel/room-types')) {
        return jsonResponse([{ _id: 'rt_01', name: 'Double Sharing Standard', capacity: 2 }]);
      }
      if (url.includes('/hostel/settings')) {
        return jsonResponse({
          curfewTime: '21:00',
          requireBiometricCheckout: true,
          defaultBillingFrequency: 'MONTHLY',
          allowOvernightLeave: true,
        });
      }

      return jsonResponse({});
    });
  });

  it('renders HostelDashboardPage with KPI metrics correctly', async () => {
    renderWithProviders(<HostelDashboardPage />);

    expect(screen.getByText(/Hostel & Residential Management/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText(/245 Occupied/i)).toBeInTheDocument();
      expect(screen.getByText(/50 Vacant/i)).toBeInTheDocument();
    });
  });

  it('renders HostelsPage with hostel facility cards', async () => {
    renderWithProviders(<HostelsPage />);

    expect(screen.getByText(/Hostels & Dormitories/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Himalaya Boys Hostel')).toBeInTheDocument();
      expect(screen.getByText('HBH-01')).toBeInTheDocument();
      expect(screen.getByText(/Senior boys residential hall/i)).toBeInTheDocument();
    });
  });

  it('renders BedsPage with bed inventory table', async () => {
    renderWithProviders(<BedsPage />);

    expect(screen.getByText(/Physical Beds Inventory/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bed 101-A')).toBeInTheDocument();
      expect(screen.getByText('BED-101-A')).toBeInTheDocument();
      expect(screen.getAllByText(/AVAILABLE/i).length).toBeGreaterThan(0);
    });
  });

  it('renders AllocationsPage with resident student allocations', async () => {
    renderWithProviders(<AllocationsPage />);

    expect(screen.getByText(/Hostel Allocations/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/CHECKED_IN/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/stud_001/i)).toBeInTheDocument();
    });
  });

  it('renders OutingsPage with student gate passes', async () => {
    renderWithProviders(<OutingsPage />);

    expect(screen.getByText(/Student Outings & Gate Passes/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/City Library & Book Market/i)).toBeInTheDocument();
      expect(screen.getAllByText(/APPROVED/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/stud_001/i)).toBeInTheDocument();
    });
  });

  it('renders MyHostelPage for student/parent self-service view', async () => {
    renderWithProviders(<MyHostelPage />);

    expect(screen.getByText(/My Hostel & Accommodation/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Himalaya Boys Hostel/i)).toBeInTheDocument();
      expect(screen.getByText('Bed 101-A')).toBeInTheDocument();
      expect(screen.getAllByText(/CHECKED_IN/i).length).toBeGreaterThan(0);
    });
  });
});
