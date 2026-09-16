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
  TransportDashboardPage,
  VehiclesPage,
  RoutesPage,
  DriversPage,
  TripsPage,
  MyTransportPage,
} from '../pages/transport/index.js';
import { UserType, UserStatus } from '@edusphere/common';

// =============================================================================
// Mock Domain Data
// =============================================================================

const mockKPIs = {
  totalVehicles: 18,
  activeVehicles: 15,
  maintenanceVehicles: 2,
  outOfServiceVehicles: 1,
  totalRoutes: 12,
  activeRoutes: 12,
  totalStops: 86,
  studentsAssigned: 420,
  totalCapacity: 540,
  averageOccupancyRate: 77.8,
  activeTrips: 6,
  completedTripsToday: 12,
  delayedTripsToday: 1,
  activeDrivers: 5,
  activeAttendants: 4,
  totalIncidentsThisMonth: 2,
  openIncidents: 1,
  expiringDocumentsCount: 3,
  pendingInspectionsCount: 2,
};

const mockVehicles = {
  items: [
    {
      _id: 'veh_001',
      id: 'veh_001',
      vehicleNumber: 'BUS-01',
      registrationNumber: 'DL-01-AB-1234',
      make: 'Tata Motors',
      model: 'Starbus Ultra',
      year: 2023,
      seatingCapacity: 40,
      standingCapacity: 10,
      status: 'ACTIVE',
      ownershipType: 'OWNED',
      vehicleTypeId: { _id: 'vt_001', name: 'Standard Bus', code: 'BUS' },
    },
    {
      _id: 'veh_002',
      id: 'veh_002',
      vehicleNumber: 'BUS-02',
      registrationNumber: 'DL-01-CD-5678',
      make: 'Ashok Leyland',
      model: 'Sunshine',
      year: 2022,
      seatingCapacity: 32,
      standingCapacity: 5,
      status: 'MAINTENANCE',
      ownershipType: 'OWNED',
      vehicleTypeId: { _id: 'vt_001', name: 'Standard Bus', code: 'BUS' },
    },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

const mockRoutes = [
  {
    _id: 'route_001',
    id: 'route_001',
    routeNumber: 'R-101',
    code: 'R-101',
    name: 'North Campus Express',
    description: 'Serving North Delhi residential sectors',
    isActive: true,
    totalDistanceMeters: 14500,
    estimatedDurationMinutes: 45,
    stopsCount: 3,
    morningPickupCapacity: 40,
    morningPickupOccupancy: 34,
    afternoonDropCapacity: 40,
    afternoonDropOccupancy: 32,
    stops: [
      { stopName: 'Sector 14 Junction', pickupTime: '07:15', dropTime: '15:15', sequence: 1 },
      { stopName: 'Market Complex', pickupTime: '07:25', dropTime: '15:05', sequence: 2 },
      { stopName: 'Campus Main Gate', pickupTime: '07:50', dropTime: '14:40', sequence: 3 },
    ],
  },
];

const mockDrivers = {
  items: [
    {
      _id: 'driver_001',
      id: 'driver_001',
      employeeId: {
        _id: 'emp_001',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        employeeNumber: 'EMP-DRV-001',
      },
      licenseNumber: 'DL-1420110012345',
      licenseType: 'COMMERCIAL_HEAVY',
      licenseExpiryDate: '2028-12-31T00:00:00.000Z',
      verificationStatus: 'VERIFIED',
      policeVerificationStatus: 'VERIFIED',
      medicalClearanceStatus: 'VERIFIED',
      status: 'ACTIVE',
      yearsOfExperience: 12,
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const mockTrips = {
  items: [
    {
      _id: 'trip_001',
      id: 'trip_001',
      tripNumber: 'TRIP-20260916-001',
      tripType: 'MORNING_PICKUP',
      routeId: { _id: 'route_001', name: 'North Campus Express', routeNumber: 'R-101' },
      vehicleId: { _id: 'veh_001', registrationNumber: 'DL-01-AB-1234' },
      driverId: {
        _id: 'driver_001',
        employeeId: { firstName: 'Rajesh', lastName: 'Sharma' },
      },
      scheduledStartTime: '07:00',
      scheduledEndTime: '08:00',
      status: 'IN_PROGRESS',
      passengersBoarded: 32,
      totalExpectedPassengers: 34,
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const mockStudentAssignment = {
  _id: 'assign_001',
  id: 'assign_001',
  studentId: {
    _id: 'stud_001',
    personalDetails: {
      firstName: 'Aarav',
      lastName: 'Kumar',
    },
    admissionNumber: 'ADM-2026-001',
  },
  routeId: { _id: 'route_001', name: 'North Campus Express', routeNumber: 'R-101' },
  pickupStopId: { stopName: 'Sector 14 Junction', pickupTime: '07:15' },
  dropStopId: { stopName: 'Sector 14 Junction', dropTime: '15:15' },
  status: 'ACTIVE',
  seatNumber: '12A',
  feeAmount: 3500, // ₹35.00
};

// =============================================================================
// Test Store & Providers Setup
// =============================================================================

function createTestStore(
  userType: UserType = UserType.TRANSPORT_MANAGER,
  userPermissions: string[] = [
    'transport:read',
    'transport:manage',
    'vehicle:read',
    'vehicle:manage',
    'vehicle:inspect',
    'route:read',
    'route:manage',
    'driver:read',
    'driver:manage',
    'attendant:read',
    'attendant:manage',
    'trip:read',
    'trip:manage',
    'trip:execute',
    'incident:read',
    'incident:manage',
    'transport:student:view',
    'transport:student:assign',
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
          id: 'admin_user_01',
          tenantId: 'tenant_test_123',
          schoolId: 'school_test_123',
          email: 'transport.admin@edusphere.edu',
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

describe('Phase 16: Transport Management Frontend Component Suite', () => {
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

      if (url.includes('/transport/reports/dashboard')) {
        return jsonResponse(mockKPIs);
      }
      if (url.includes('/transport/reports/occupancy')) {
        return jsonResponse([]);
      }
      if (url.includes('/transport/vehicles')) {
        return jsonResponse(mockVehicles);
      }
      if (url.includes('/transport/vehicle-types')) {
        return jsonResponse([{ _id: 'vt_001', name: 'Standard Bus', code: 'BUS' }]);
      }
      if (url.includes('/transport/routes')) {
        return jsonResponse(mockRoutes);
      }
      if (url.includes('/transport/stops')) {
        return jsonResponse([]);
      }
      if (url.includes('/transport/drivers')) {
        return jsonResponse(mockDrivers);
      }
      if (url.includes('/transport/trips')) {
        return jsonResponse(mockTrips);
      }
      if (url.includes('/transport/assignments/my')) {
        return jsonResponse([mockStudentAssignment]);
      }
      if (url.includes('/transport/assignments')) {
        return jsonResponse({ items: [mockStudentAssignment], pagination: { total: 1 } });
      }
      if (url.includes('/transport/settings')) {
        return jsonResponse({
          enableLiveTracking: true,
          speedThresholdKmh: 60,
          etaAlertThresholdMinutes: 10,
          defaultFeeModel: 'DISTANCE_TIER',
        });
      }

      return jsonResponse({});
    });
  });

  it('renders TransportDashboardPage with KPI metrics correctly', async () => {
    renderWithProviders(<TransportDashboardPage />);

    expect(screen.getByText(/Transport & Fleet Management/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/420 Students Assigned/i)).toBeInTheDocument();
    });
  });

  it('renders VehiclesPage with vehicle inventory list', async () => {
    renderWithProviders(<VehiclesPage />);

    expect(screen.getByText(/Fleet Vehicles/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('DL-01-AB-1234')).toBeInTheDocument();
      expect(screen.getByText(/Tata Motors/i)).toBeInTheDocument();
      expect(screen.getByText('DL-01-CD-5678')).toBeInTheDocument();
    });
  });

  it('renders RoutesPage with route information and stops', async () => {
    renderWithProviders(<RoutesPage />);

    expect(screen.getByText(/Transport Routes/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('R-101')).toBeInTheDocument();
      expect(screen.getByText('North Campus Express')).toBeInTheDocument();
    });
  });

  it('renders DriversPage with licensed driver details', async () => {
    renderWithProviders(<DriversPage />);

    expect(screen.getByText(/Driver Management & Compliance/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Rajesh/i)).toBeInTheDocument();
      expect(screen.getByText('DL-1420110012345')).toBeInTheDocument();
    });
  });

  it('renders TripsPage with active trip operational data', async () => {
    renderWithProviders(<TripsPage />);

    expect(screen.getByText(/Trips Dispatch & Live Operations/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('North Campus Express')).toBeInTheDocument();
      expect(screen.getByText('DL-01-AB-1234')).toBeInTheDocument();
    });
  });

  it('renders MyTransportPage for student/parent view', async () => {
    renderWithProviders(<MyTransportPage />);

    expect(screen.getByText(/My Transport & Bus Tracking/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/North Campus Express/i)).toBeInTheDocument();
      expect(screen.getByText(/Aarav Kumar/i)).toBeInTheDocument();
    });
  });
});
