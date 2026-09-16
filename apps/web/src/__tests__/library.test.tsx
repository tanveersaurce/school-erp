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
  LibraryDashboardPage,
  BookCatalogPage,
  CirculationDeskPage,
  LibraryMembersPage,
  ReservationsPage,
  FinesManagementPage,
  LibraryReportsPage,
  LibrarySettingsPage,
  MyLibraryPage,
} from '../pages/library/index.js';
import { UserType, UserStatus } from '@edusphere/common';

// =============================================================================
// Mock Domain Data
// =============================================================================

const mockKPIs = {
  totalBooks: 1420,
  totalCopies: 3200,
  availableCopies: 2850,
  issuedCopies: 310,
  overdueCount: 15,
  reservedCount: 25,
  lostCopies: 12,
  damagedCopies: 8,
  withdrawnCopies: 5,
  activeMembers: 840,
  pendingReservations: 25,
  totalOutstandingFines: 12500, // $125.00
};

const mockLibraries = [
  {
    _id: 'lib_main',
    id: 'lib_main',
    name: 'Main Campus Central Library',
    code: 'LIB-MAIN',
    operatingHours: '8:00 AM - 6:00 PM',
    isActive: true,
  },
];

const mockCategories = [
  { _id: 'cat_sci', id: 'cat_sci', name: 'Science & Physics', code: 'SCI' },
  { _id: 'cat_lit', id: 'cat_lit', name: 'Literature & Fiction', code: 'LIT' },
];

const mockShelves = [
  { _id: 'shelf_a1', id: 'shelf_a1', name: 'Shelf A1', code: 'A1', section: 'Main Wing' },
];

const mockBooks = [
  {
    _id: 'book_001',
    id: 'book_001',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    subtitle: 'A Handbook of Agile Software Craftsmanship',
    isbn: '978-0132350884',
    publicationYear: 2008,
    category: 'Computer Science',
    categoryId: { _id: 'cat_cs', name: 'Computer Science' },
    availableCopies: 4,
    totalCopies: 5,
  },
  {
    _id: 'book_002',
    id: 'book_002',
    title: 'Introduction to Algorithms',
    isbn: '978-0262033848',
    publicationYear: 2009,
    category: 'Computer Science',
    categoryId: { _id: 'cat_cs', name: 'Computer Science' },
    availableCopies: 2,
    totalCopies: 3,
  },
];

const mockCirculations = [
  {
    _id: 'circ_001',
    id: 'circ_001',
    bookId: { _id: 'book_001', title: 'Clean Code', isbn: '978-0132350884' },
    copyId: { _id: 'copy_001', accessionNumber: 'ACC-2026-0001', barcode: 'BC-001' },
    bookCopyId: { _id: 'copy_001', accessionNumber: 'ACC-2026-0001', barcode: 'BC-001' },
    memberId: { _id: 'mem_001', memberNumber: 'LIB-MEM-0001', memberType: 'STUDENT' },
    issuedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'ISSUED',
    renewalCount: 0,
    fineAmount: 0,
  },
  {
    _id: 'circ_002',
    id: 'circ_002',
    bookId: { _id: 'book_002', title: 'Introduction to Algorithms', isbn: '978-0262033848' },
    copyId: { _id: 'copy_002', accessionNumber: 'ACC-2026-0002', barcode: 'BC-002' },
    bookCopyId: { _id: 'copy_002', accessionNumber: 'ACC-2026-0002', barcode: 'BC-002' },
    memberId: { _id: 'mem_002', memberNumber: 'LIB-MEM-0002', memberType: 'TEACHER' },
    issuedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    dueDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    dueAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    status: 'OVERDUE',
    renewalCount: 1,
    fineAmount: 500,
  },
];

const mockMembers = [
  {
    _id: 'mem_001',
    id: 'mem_001',
    memberNumber: 'LIB-MEM-0001',
    memberType: 'STUDENT',
    status: 'ACTIVE',
    activeLoansCount: 1,
    maxBooks: 3,
    totalFinesUnpaid: 0,
  },
  {
    _id: 'mem_002',
    id: 'mem_002',
    memberNumber: 'LIB-MEM-0002',
    memberType: 'TEACHER',
    status: 'ACTIVE',
    activeLoansCount: 2,
    maxBooks: 10,
    totalFinesUnpaid: 500,
  },
];

const mockReservations = [
  {
    _id: 'res_001',
    id: 'res_001',
    bookId: { _id: 'book_001', title: 'Clean Code' },
    memberId: { _id: 'mem_001', memberNumber: 'LIB-MEM-0001' },
    status: 'PENDING',
    queuePosition: 1,
    createdAt: new Date().toISOString(),
  },
];

const mockFines = [
  {
    _id: 'fine_001',
    id: 'fine_001',
    memberId: { _id: 'mem_002', memberNumber: 'LIB-MEM-0002', memberType: 'TEACHER' },
    type: 'OVERDUE',
    fineType: 'OVERDUE',
    amount: 500,
    paidAmount: 0,
    waivedAmount: 0,
    outstandingAmount: 500,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    reason: '6 days overdue',
  },
  {
    _id: 'fine_002',
    id: 'fine_002',
    memberId: { _id: 'mem_001', memberNumber: 'LIB-MEM-0001', memberType: 'STUDENT' },
    type: 'LOST_BOOK',
    fineType: 'LOST_BOOK',
    amount: 3500,
    paidAmount: 3500,
    waivedAmount: 0,
    outstandingAmount: 0,
    status: 'PAID',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    reason: 'Lost copy replacement fee',
  },
];

const mockSettings = {
  id: 'set_001',
  defaultLoanDurationDays: 14,
  maxBooksPerMember: { student: 3, teacher: 10, staff: 5 },
  maxRenewals: 2,
  renewalExtensionDays: 7,
  fineCalculationMethod: 'DAILY',
  finePerDay: 100, // $1.00
  fineGracePeriodDays: 1,
  maxFineCap: 5000, // $50.00
  reservationExpiryDays: 3,
  maxActiveReservations: 2,
  lostBookReplacementFeeMultiplier: 1.5,
  damagedBookDefaultFee: 500,
};

const mockOverdueReport = [
  {
    _id: 'circ_002',
    bookId: { _id: 'book_002', title: 'Introduction to Algorithms' },
    copyId: { _id: 'copy_002', accessionNumber: 'ACC-2026-0002' },
    memberId: { _id: 'mem_002', memberNumber: 'LIB-MEM-0002', memberType: 'TEACHER' },
    issuedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    dueDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    fineAmount: 500,
  },
];

const mockPopularBooks = [
  {
    _id: 'book_001',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    isbn: '978-0132350884',
    borrowCount: 42,
    availableCopies: 4,
    categoryId: { name: 'Computer Science' },
  },
];

const mockInventoryReport = {
  totalCopies: 3200,
  byStatus: { AVAILABLE: 2850, ISSUED: 310, LOST: 12, DAMAGED: 8, WITHDRAWN: 20 },
  byCondition: { NEW: 1500, GOOD: 1200, FAIR: 450, POOR: 50 },
};

// =============================================================================
// Test Store & Providers Setup
// =============================================================================

function createTestStore(
  userType: UserType = UserType.LIBRARIAN,
  userPermissions: string[] = [
    'library:read',
    'library:manage',
    'book:read',
    'book:create',
    'book:update',
    'circulation:read',
    'circulation:issue',
    'circulation:return',
    'circulation:renew',
    'library_member:read',
    'library_member:create',
    'reservation:read',
    'reservation:manage',
    'fine:read',
    'fine:collect',
    'fine:waive',
    'library_report:read',
    'library_settings:manage',
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
          id: 'librarian_user_01',
          tenantId: 'tenant_test_123',
          schoolId: 'school_test_123',
          email: 'librarian@edusphere.edu',
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

describe('Phase 15: Library Management Frontend Component Suite', () => {
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

      if (url.includes('/library/reports/kpis')) {
        return jsonResponse(mockKPIs);
      }
      if (url.includes('/library/reports/overdue')) {
        return jsonResponse(mockOverdueReport);
      }
      if (url.includes('/library/reports/popular-books')) {
        return jsonResponse(mockPopularBooks);
      }
      if (url.includes('/library/reports/inventory')) {
        return jsonResponse(mockInventoryReport);
      }
      if (url.includes('/library/locations')) {
        return jsonResponse(mockLibraries);
      }
      if (url.includes('/library/categories')) {
        return jsonResponse(mockCategories);
      }
      if (url.includes('/library/shelves')) {
        return jsonResponse(mockShelves);
      }
      if (url.includes('/library/settings')) {
        return jsonResponse(mockSettings);
      }
      if (url.includes('/library/books')) {
        return jsonResponse({ items: mockBooks, pagination: { total: mockBooks.length } });
      }
      if (url.includes('/library/circulation')) {
        return jsonResponse({ items: mockCirculations, pagination: { total: mockCirculations.length } });
      }
      if (url.includes('/library/members')) {
        return jsonResponse({ items: mockMembers, pagination: { total: mockMembers.length } });
      }
      if (url.includes('/library/reservations')) {
        return jsonResponse({ items: mockReservations, pagination: { total: mockReservations.length } });
      }
      if (url.includes('/library/fines')) {
        return jsonResponse({ items: mockFines, pagination: { total: mockFines.length } });
      }
      if (url.includes('/library/me/profile')) {
        return jsonResponse(mockMembers[0]);
      }
      if (url.includes('/library/me/circulations')) {
        return jsonResponse({ items: [mockCirculations[0]], pagination: { total: 1 } });
      }
      if (url.includes('/library/me/reservations')) {
        return jsonResponse({ items: mockReservations, pagination: { total: 1 } });
      }
      if (url.includes('/library/me/fines')) {
        return jsonResponse({ items: [], pagination: { total: 0 } });
      }

      return jsonResponse({});
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Library Dashboard Page
  // ---------------------------------------------------------------------------
  it('renders LibraryDashboardPage with KPI counters and overdue alerts', async () => {
    renderWithProviders(<LibraryDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Library & Resource Center/i)).toBeInTheDocument();
      expect(screen.getByText('1420')).toBeInTheDocument(); // totalBooks unformatted number
      expect(screen.getByText(/2850 Available on Shelves/i)).toBeInTheDocument(); // availableCopies
      expect(screen.getByText('15')).toBeInTheDocument();    // overdue items
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Book Catalog Page
  // ---------------------------------------------------------------------------
  it('renders BookCatalogPage with book titles and search filter', async () => {
    renderWithProviders(<BookCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText(/Book Catalog/i)).toBeInTheDocument();
      expect(screen.getByText(/Clean Code/i)).toBeInTheDocument();
      expect(screen.getByText(/Introduction to Algorithms/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by title, author, or ISBN/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Circulation Desk Page
  // ---------------------------------------------------------------------------
  it('renders CirculationDeskPage with active loans and navigation tabs', async () => {
    renderWithProviders(<CirculationDeskPage />);

    await waitFor(() => {
      expect(screen.getByText(/Circulation Desk/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Loans/i)).toBeInTheDocument();
      expect(screen.getByText(/Issue \/ Checkout/i)).toBeInTheDocument();
      expect(screen.getByText(/Checkin \/ Return/i)).toBeInTheDocument();
      expect(screen.getByText('BC-001')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Library Members Page
  // ---------------------------------------------------------------------------
  it('renders LibraryMembersPage with member roster and statuses', async () => {
    renderWithProviders(<LibraryMembersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Library Members Directory/i)).toBeInTheDocument();
      expect(screen.getByText('LIB-MEM-0001')).toBeInTheDocument();
      expect(screen.getByText('LIB-MEM-0002')).toBeInTheDocument();
      expect(screen.getAllByText('STUDENT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('TEACHER').length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Reservations Page
  // ---------------------------------------------------------------------------
  it('renders ReservationsPage with queue positions and hold status', async () => {
    renderWithProviders(<ReservationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Hold & Reservation Queue/i)).toBeInTheDocument();
      expect(screen.getByText('Clean Code')).toBeInTheDocument();
      expect(screen.getByText('LIB-MEM-0001')).toBeInTheDocument();
      expect(screen.getByText(/PENDING/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Fines Management Page
  // ---------------------------------------------------------------------------
  it('renders FinesManagementPage with zero-float money formatting and action triggers', async () => {
    renderWithProviders(<FinesManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Fines & Penalty Management/i)).toBeInTheDocument();
      expect(screen.getByText('LIB-MEM-0001')).toBeInTheDocument();
      expect(screen.getByText('LIB-MEM-0002')).toBeInTheDocument();
      expect(screen.getAllByText('$5.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$35.00').length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Library Reports Page
  // ---------------------------------------------------------------------------
  it('renders LibraryReportsPage with overdue loans, popular books, and inventory tabs', async () => {
    renderWithProviders(<LibraryReportsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Library Analytics & Reports/i)).toBeInTheDocument();
      expect(screen.getByText(/Overdue Loans/i)).toBeInTheDocument();
      expect(screen.getByText(/Most Borrowed Books/i)).toBeInTheDocument();
      expect(screen.getByText(/Inventory Condition & Health/i)).toBeInTheDocument();
      expect(screen.getByText('ACC-2026-0002')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Library Settings Page
  // ---------------------------------------------------------------------------
  it('renders LibrarySettingsPage with circulation rules and policy form controls', async () => {
    renderWithProviders(<LibrarySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Library Rules & Policy Configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/Circulation & Loan Periods/i)).toBeInTheDocument();
      expect(screen.getByText(/Overdue Fines & Penalty Calculations/i)).toBeInTheDocument();
      expect(screen.getByText(/Save Library Settings/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. My Library Self-Service Page
  // ---------------------------------------------------------------------------
  it('renders MyLibraryPage for patron self-service portal', async () => {
    renderWithProviders(<MyLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText(/My Library Account/i)).toBeInTheDocument();
      expect(screen.getByText('LIB-MEM-0001')).toBeInTheDocument();
      expect(screen.getByText(/Currently Borrowed/i)).toBeInTheDocument();
      expect(screen.getByText(/Holds & Reservations/i)).toBeInTheDocument();
      expect(screen.getByText(/Fines & Dues/i)).toBeInTheDocument();
    });
  });
});
