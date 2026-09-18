import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { HomePage } from '../pages/HomePage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage.js';
import { ResetPasswordPage } from '../pages/ResetPasswordPage.js';
import { VerifyEmailPage } from '../pages/VerifyEmailPage.js';
import { SessionsPage } from '../pages/SessionsPage.js';
import { ForbiddenPage } from '../pages/ForbiddenPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { RolesPage } from '../pages/rbac/RolesPage.js';
import { OrganizationPage } from '../pages/organization/OrganizationPage.js';
import { StaffListPage } from '../pages/staff/StaffListPage.js';
import { StaffDetailsPage } from '../pages/staff/StaffDetailsPage.js';
import { TeacherListPage } from '../pages/teachers/TeacherListPage.js';
import { DepartmentDesignationPage } from '../pages/staff/DepartmentDesignationPage.js';
import { StudentListPage } from '../pages/students/StudentListPage.js';
import { StudentDetailsPage } from '../pages/students/StudentDetailsPage.js';
import { GuardianListPage } from '../pages/guardians/GuardianListPage.js';
import { GuardianDetailsPage } from '../pages/guardians/GuardianDetailsPage.js';
import { MyChildrenPage } from '../pages/parent/MyChildrenPage.js';
import { AcademicDashboardPage } from '../pages/academic/AcademicDashboardPage.js';
import { ClassListPage } from '../pages/academic/ClassListPage.js';
import { SectionListPage } from '../pages/academic/SectionListPage.js';
import { AcademicClassListPage } from '../pages/academic/AcademicClassListPage.js';
import { AcademicClassDetailsPage } from '../pages/academic/AcademicClassDetailsPage.js';
import { SubjectListPage } from '../pages/academic/SubjectListPage.js';
import { TimetableDashboardPage } from '../pages/timetable/TimetableDashboardPage.js';
import { PeriodListPage } from '../pages/timetable/PeriodListPage.js';
import { ClassroomListPage } from '../pages/timetable/ClassroomListPage.js';
import { TimetableListPage } from '../pages/timetable/TimetableListPage.js';
import { ClassTimetablePage } from '../pages/timetable/ClassTimetablePage.js';
import { TeacherTimetableViewPage } from '../pages/timetable/TeacherTimetableViewPage.js';
import { RoomTimetableViewPage } from '../pages/timetable/RoomTimetableViewPage.js';
import { MySchedulePage } from '../pages/timetable/MySchedulePage.js';
import { AttendanceDashboardPage } from '../pages/attendance/AttendanceDashboardPage.js';
import { MarkAttendancePage } from '../pages/attendance/MarkAttendancePage.js';
import { AttendanceHistoryPage } from '../pages/attendance/AttendanceHistoryPage.js';
import { AttendanceCorrectionsPage } from '../pages/attendance/AttendanceCorrectionsPage.js';
import { AttendanceReportsPage } from '../pages/attendance/AttendanceReportsPage.js';
import {
  AssignmentDashboardPage,
  TeacherAssignmentListPage,
  CreateEditAssignmentPage,
  AssignmentDetailsPage,
  StudentAssignmentListPage,
  StudentAssignmentSubmitPage,
  ParentChildAssignmentsPage,
} from '../pages/assignments/index.js';
import {
  ExamDashboardPage,
  ExamListPage,
  CreateEditExamPage,
  ExamDetailsPage,
  ExamSchedulePage,
  MarksEntryPage,
  ResultsManagementPage,
  StudentResultViewPage,
} from '../pages/examinations/index.js';
import {
  FinanceDashboardPage,
  FeeStructuresPage,
  FeeInvoicesPage,
  FeePaymentsPage,
  StudentLedgerPage,
  RefundsManagementPage,
  IncomeExpensePage,
  FinanceReportsPage,
} from '../pages/finance/index.js';
import {
  HrDashboardPage,
  EmployeeHrPage,
  LeaveManagementPage,
  SalaryManagementPage,
  PayrollRunsPage,
  PayrollDetailsPage,
  PayslipsPage,
  HrReportsPage,
} from '../pages/hr/index.js';
import {
  LibraryDashboardPage,
  BookCatalogPage,
  BookDetailsPage,
  CirculationDeskPage,
  LibraryMembersPage,
  ReservationsPage,
  FinesManagementPage,
  LibraryReportsPage,
  LibrarySettingsPage,
  MyLibraryPage,
} from '../pages/library/index.js';
import {
  TransportDashboardPage,
  VehiclesPage,
  VehicleDetailsPage,
  RoutesPage,
  RouteDetailsPage,
  StopsPage,
  DriversPage,
  AttendantsPage,
  StudentAssignmentsPage,
  TripsPage,
  TripDetailsPage,
  IncidentsPage,
  MaintenancePage,
  InspectionsPage,
  DocumentsPage,
  TransportReportsPage,
  TransportSettingsPage,
  MyTransportPage,
} from '../pages/transport/index.js';
import {
  HostelDashboardPage,
  HostelsPage,
  HostelDetailsPage,
  BuildingsPage,
  RoomsPage,
  RoomDetailsPage,
  BedsPage,
  AllocationsPage,
  CheckInCheckOutPage,
  TransfersPage,
  HostelAttendancePage,
  OutingsPage,
  HostelIncidentsPage,
  HostelMaintenancePage,
  HostelInspectionsPage,
  HostelDocumentsPage,
  HostelReportsPage,
  HostelSettingsPage,
  MyHostelPage,
} from '../pages/hostel/index.js';
import {
  InventoryDashboardPage,
  InventoryItemsPage,
  InventoryItemDetailsPage,
  InventoryCategoriesPage,
  InventoryUnitsPage,
  InventorySuppliersPage,
  InventoryStoresPage,
  InventoryStoreDetailsPage,
  InventoryStockPage,
  InventoryReceiptsPage,
  InventoryIssuesPage,
  InventoryReturnsPage,
  InventoryTransfersPage,
  InventoryAdjustmentsPage,
  InventoryStocktakesPage,
  InventoryReservationsPage,
  InventoryAssetsPage,
  InventoryAssetDetailsPage,
  InventoryMaintenancePage,
  InventoryReportsPage,
  InventorySettingsPage,
} from '../pages/inventory/index.js';
import {
  NotificationCenterPage,
  AnnouncementsPage,
  AnnouncementDetailsPage,
  CreateEditAnnouncementPage,
  CommunicationJobsPage,
  CommunicationJobDetailsPage,
  NotificationTemplatesPage,
  NotificationTemplateEditorPage,
  NotificationPreferencesPage,
  NotificationDeliveriesPage,
  CommunicationReportsPage,
} from '../pages/communication/index.js';
import {
  ReportsDashboardPage,
  ReportExplorerPage,
  ScheduledReportsPage,
  ExportJobsPage,
} from '../pages/reports/index.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { PermissionRoute } from '../components/auth/PermissionRoute.js';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/sessions',
    element: (
      <ProtectedRoute>
        <SessionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/roles',
    element: (
      <PermissionRoute anyOf={['rbac:manage', 'role:read']}>
        <RolesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/organization',
    element: (
      <PermissionRoute anyOf={['school:read', 'school:update', 'campus:read', 'campus:manage']}>
        <OrganizationPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/staff',
    element: (
      <PermissionRoute anyOf={['employee:read', 'employee:create']}>
        <StaffListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/staff/:id',
    element: (
      <PermissionRoute anyOf={['employee:read', 'employee:update']}>
        <StaffDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/teachers',
    element: (
      <PermissionRoute anyOf={['teacher:read', 'teacher:create', 'employee:read']}>
        <TeacherListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/departments-designations',
    element: (
      <PermissionRoute anyOf={['department:read', 'designation:read']}>
        <DepartmentDesignationPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/students',
    element: (
      <PermissionRoute anyOf={['student:read', 'student:create']}>
        <StudentListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/students/:id',
    element: (
      <PermissionRoute anyOf={['student:read', 'student:update', 'student:view_pii']}>
        <StudentDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/guardians',
    element: (
      <PermissionRoute anyOf={['guardian:read', 'guardian:create']}>
        <GuardianListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/guardians/:id',
    element: (
      <PermissionRoute anyOf={['guardian:read', 'guardian:update']}>
        <GuardianDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/my-children',
    element: (
      <ProtectedRoute>
        <MyChildrenPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/academic',
    element: (
      <PermissionRoute
        anyOf={[
          'class:read',
          'section:read',
          'academic_class:read',
          'subject:read',
          'academic_class:manage',
        ]}
      >
        <AcademicDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/academic/classes',
    element: (
      <PermissionRoute anyOf={['class:read', 'class:create', 'class:manage']}>
        <ClassListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/academic/sections',
    element: (
      <PermissionRoute anyOf={['section:read', 'section:create', 'section:manage']}>
        <SectionListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/academic/academic-classes',
    element: (
      <PermissionRoute
        anyOf={['academic_class:read', 'academic_class:create', 'academic_class:manage']}
      >
        <AcademicClassListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/academic/academic-classes/:id',
    element: (
      <PermissionRoute
        anyOf={['academic_class:read', 'academic_class:update', 'academic_class:manage']}
      >
        <AcademicClassDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/academic/subjects',
    element: (
      <PermissionRoute anyOf={['subject:read', 'subject:create', 'subject:manage']}>
        <SubjectListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable',
    element: (
      <PermissionRoute
        anyOf={[
          'timetable:read',
          'period:read',
          'classroom:read',
          'timetable:manage',
          'timetable_entry:read',
        ]}
      >
        <TimetableDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable/periods',
    element: (
      <PermissionRoute anyOf={['period:read', 'period:manage']}>
        <PeriodListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable/classrooms',
    element: (
      <PermissionRoute anyOf={['classroom:read', 'classroom:manage']}>
        <ClassroomListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable/timetables',
    element: (
      <PermissionRoute anyOf={['timetable:read', 'timetable:manage']}>
        <TimetableListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable/class-view',
    element: (
      <PermissionRoute
        anyOf={[
          'timetable:read',
          'timetable_entry:read',
          'timetable:manage',
          'timetable_entry:manage',
        ]}
      >
        <ClassTimetablePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable/teacher-view',
    element: (
      <PermissionRoute anyOf={['timetable:read', 'timetable_entry:read', 'teacher:read']}>
        <TeacherTimetableViewPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable/room-view',
    element: (
      <PermissionRoute anyOf={['timetable:read', 'classroom:read']}>
        <RoomTimetableViewPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/timetable/my-schedule',
    element: (
      <ProtectedRoute>
        <MySchedulePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance',
    element: (
      <PermissionRoute anyOf={['attendance:read', 'attendance:mark']}>
        <AttendanceDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/attendance/mark',
    element: (
      <PermissionRoute anyOf={['attendance:mark']}>
        <MarkAttendancePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/attendance/history',
    element: (
      <PermissionRoute anyOf={['attendance:read']}>
        <AttendanceHistoryPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/attendance/corrections',
    element: (
      <PermissionRoute anyOf={['attendance:correct', 'attendance:read']}>
        <AttendanceCorrectionsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/attendance/reports',
    element: (
      <PermissionRoute anyOf={['attendance:read', 'attendance:reports']}>
        <AttendanceReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/assignments',
    element: (
      <ProtectedRoute>
        <AssignmentDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/assignments/list',
    element: (
      <PermissionRoute anyOf={['assignment:read', 'homework:read']}>
        <TeacherAssignmentListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/assignments/new',
    element: (
      <PermissionRoute anyOf={['assignment:create', 'homework:create']}>
        <CreateEditAssignmentPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/assignments/:id/edit',
    element: (
      <PermissionRoute anyOf={['assignment:update', 'homework:update']}>
        <CreateEditAssignmentPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/assignments/:id',
    element: (
      <PermissionRoute anyOf={['assignment:read', 'homework:read']}>
        <AssignmentDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/assignments/student',
    element: (
      <ProtectedRoute>
        <StudentAssignmentListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/assignments/:id/submit',
    element: (
      <ProtectedRoute>
        <StudentAssignmentSubmitPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/assignments/parent',
    element: (
      <ProtectedRoute>
        <ParentChildAssignmentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/examinations',
    element: (
      <ProtectedRoute>
        <ExamDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/examinations/list',
    element: (
      <PermissionRoute anyOf={['exam:read', 'exam:manage']}>
        <ExamListPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/examinations/new',
    element: (
      <PermissionRoute anyOf={['exam:create', 'exam:manage']}>
        <CreateEditExamPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/examinations/:id/edit',
    element: (
      <PermissionRoute anyOf={['exam:update', 'exam:manage']}>
        <CreateEditExamPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/examinations/:id',
    element: (
      <PermissionRoute anyOf={['exam:read', 'exam:manage']}>
        <ExamDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/examinations/:id/schedule',
    element: (
      <PermissionRoute anyOf={['exam:schedule', 'exam:manage']}>
        <ExamSchedulePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/examinations/:id/marks',
    element: (
      <PermissionRoute anyOf={['marks:entry', 'marks:read', 'marks:manage']}>
        <MarksEntryPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/examinations/:id/results',
    element: (
      <PermissionRoute anyOf={['result:calculate', 'result:approve', 'result:publish', 'result:read', 'exam:manage']}>
        <ResultsManagementPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/examinations/my-results',
    element: (
      <ProtectedRoute>
        <StudentResultViewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/examinations/results/student/:studentId',
    element: (
      <PermissionRoute anyOf={['result:read', 'exam:manage']}>
        <StudentResultViewPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/finance',
    element: (
      <ProtectedRoute>
        <FinanceDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance/structures',
    element: (
      <PermissionRoute anyOf={['fee_structure:read', 'fee_structure:manage', 'fee_category:read']}>
        <FeeStructuresPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/finance/invoices',
    element: (
      <PermissionRoute anyOf={['fee_invoice:read', 'fee_invoice:generate', 'fee_invoice:void']}>
        <FeeInvoicesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/finance/payments',
    element: (
      <PermissionRoute anyOf={['payment:read', 'payment:collect']}>
        <FeePaymentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/finance/ledger',
    element: (
      <PermissionRoute anyOf={['finance_report:read', 'payment:read', 'fee_invoice:read']}>
        <StudentLedgerPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/finance/my-fees',
    element: (
      <ProtectedRoute>
        <StudentLedgerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance/child-fees/:studentId',
    element: (
      <ProtectedRoute>
        <StudentLedgerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance/refunds',
    element: (
      <PermissionRoute
        anyOf={['payment:refund_request', 'payment:refund_review', 'payment:refund_process']}
      >
        <RefundsManagementPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/finance/income-expense',
    element: (
      <PermissionRoute anyOf={['income_expense:manage', 'finance_report:read']}>
        <IncomeExpensePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/finance/reports',
    element: (
      <PermissionRoute anyOf={['finance_report:read']}>
        <FinanceReportsPage />
      </PermissionRoute>
    ),
  },
  // =========================================================================
  // Phase 14: HR & Payroll Routes
  // =========================================================================
  {
    path: '/hr',
    element: (
      <ProtectedRoute>
        <HrDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/hr/employees',
    element: (
      <PermissionRoute anyOf={['employee_hr:read', 'employee_hr:update']}>
        <EmployeeHrPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hr/leaves',
    element: (
      <ProtectedRoute>
        <LeaveManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/hr/salaries',
    element: (
      <PermissionRoute anyOf={['salary_structure:read', 'salary_component:read', 'employee_salary:read']}>
        <SalaryManagementPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hr/payroll',
    element: (
      <PermissionRoute anyOf={['payroll_period:read', 'payroll:read']}>
        <PayrollRunsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hr/payroll/:id',
    element: (
      <PermissionRoute anyOf={['payroll_period:read', 'payroll:read']}>
        <PayrollDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hr/payslips',
    element: (
      <ProtectedRoute>
        <PayslipsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/hr/payslips/:id',
    element: (
      <ProtectedRoute>
        <PayslipsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/hr/reports',
    element: (
      <PermissionRoute anyOf={['employee_hr:read', 'payroll:read']}>
        <HrReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library',
    element: (
      <PermissionRoute anyOf={['library:read', 'book:read', 'circulation:read']}>
        <LibraryDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/catalog',
    element: (
      <PermissionRoute anyOf={['book:read']}>
        <BookCatalogPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/books/:id',
    element: (
      <PermissionRoute anyOf={['book:read']}>
        <BookDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/circulation',
    element: (
      <PermissionRoute anyOf={['circulation:read', 'circulation:issue', 'circulation:return']}>
        <CirculationDeskPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/members',
    element: (
      <PermissionRoute anyOf={['library_member:read', 'library:read']}>
        <LibraryMembersPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/reservations',
    element: (
      <PermissionRoute anyOf={['reservation:read', 'reservation:manage']}>
        <ReservationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/fines',
    element: (
      <PermissionRoute anyOf={['fine:read', 'fine:collect', 'fine:waive']}>
        <FinesManagementPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/reports',
    element: (
      <PermissionRoute anyOf={['library_report:read', 'library:read']}>
        <LibraryReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/settings',
    element: (
      <PermissionRoute anyOf={['library_settings:manage', 'library:manage']}>
        <LibrarySettingsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/library/me',
    element: (
      <ProtectedRoute>
        <MyLibraryPage />
      </ProtectedRoute>
    ),
  },
  // =========================================================================
  // Phase 16: Transport Management Routes
  // =========================================================================
  {
    path: '/transport',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <TransportDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/vehicles',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <VehiclesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/vehicles/:id',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <VehicleDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/routes',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <RoutesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/routes/:id',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <RouteDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/stops',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <StopsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/drivers',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <DriversPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/attendants',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <AttendantsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/assignments',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <StudentAssignmentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/trips',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage', 'trip:execute']}>
        <TripsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/trips/:id',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage', 'trip:execute']}>
        <TripDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/incidents',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <IncidentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/maintenance',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <MaintenancePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/inspections',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage', 'vehicle:inspect']}>
        <InspectionsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/documents',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <DocumentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/reports',
    element: (
      <PermissionRoute anyOf={['transport:read', 'transport:manage']}>
        <TransportReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/settings',
    element: (
      <PermissionRoute anyOf={['transport:manage']}>
        <TransportSettingsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/transport/me',
    element: (
      <ProtectedRoute>
        <MyTransportPage />
      </ProtectedRoute>
    ),
  },
  // =========================================================================
  // Phase 17 — Hostel & Residential Management
  // =========================================================================
  {
    path: '/hostel',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage', 'hostel:reports']}>
        <HostelDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/hostels',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage']}>
        <HostelsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/hostels/:id',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage']}>
        <HostelDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/buildings',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage']}>
        <BuildingsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/rooms',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage']}>
        <RoomsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/rooms/:id',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage']}>
        <RoomDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/beds',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage']}>
        <BedsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/allocations',
    element: (
      <PermissionRoute anyOf={['hostel:read', 'hostel:manage', 'hostel:allocate']}>
        <AllocationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/check-in-out',
    element: (
      <PermissionRoute anyOf={['hostel:manage', 'hostel:allocate']}>
        <CheckInCheckOutPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/transfers',
    element: (
      <PermissionRoute anyOf={['hostel:manage', 'hostel:allocate']}>
        <TransfersPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/attendance',
    element: (
      <PermissionRoute anyOf={['hostel:attendance', 'hostel:manage']}>
        <HostelAttendancePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/outings',
    element: (
      <PermissionRoute anyOf={['hostel:outing', 'hostel:manage']}>
        <OutingsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/incidents',
    element: (
      <PermissionRoute anyOf={['hostel:incident', 'hostel:manage']}>
        <HostelIncidentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/maintenance',
    element: (
      <PermissionRoute anyOf={['hostel:maintenance', 'hostel:manage']}>
        <HostelMaintenancePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/inspections',
    element: (
      <PermissionRoute anyOf={['hostel:maintenance', 'hostel:manage']}>
        <HostelInspectionsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/documents',
    element: (
      <PermissionRoute anyOf={['hostel:manage', 'hostel:read']}>
        <HostelDocumentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/reports',
    element: (
      <PermissionRoute anyOf={['hostel:reports', 'hostel:manage']}>
        <HostelReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/settings',
    element: (
      <PermissionRoute anyOf={['hostel:manage']}>
        <HostelSettingsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/hostel/me',
    element: (
      <ProtectedRoute>
        <MyHostelPage />
      </ProtectedRoute>
    ),
  },
  // =========================================================================
  // Phase 18: Inventory Management
  // =========================================================================
  {
    path: '/inventory',
    element: (
      <PermissionRoute anyOf={['inventory:read', 'inventory:manage', 'inventory_item:read']}>
        <InventoryDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/items',
    element: (
      <PermissionRoute anyOf={['inventory_item:read', 'inventory:read', 'inventory:manage']}>
        <InventoryItemsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/items/:id',
    element: (
      <PermissionRoute anyOf={['inventory_item:read', 'inventory:read', 'inventory:manage']}>
        <InventoryItemDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/categories',
    element: (
      <PermissionRoute anyOf={['inventory_item:read', 'inventory:read', 'inventory:manage']}>
        <InventoryCategoriesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/units',
    element: (
      <PermissionRoute anyOf={['inventory_item:read', 'inventory:read', 'inventory:manage']}>
        <InventoryUnitsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/suppliers',
    element: (
      <PermissionRoute anyOf={['inventory_supplier:read', 'inventory:read', 'inventory:manage']}>
        <InventorySuppliersPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/stores',
    element: (
      <PermissionRoute anyOf={['inventory_store:read', 'inventory:read', 'inventory:manage']}>
        <InventoryStoresPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/stores/:id',
    element: (
      <PermissionRoute anyOf={['inventory_store:read', 'inventory:read', 'inventory:manage']}>
        <InventoryStoreDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/stock',
    element: (
      <PermissionRoute anyOf={['inventory_stock:read', 'inventory:read', 'inventory:manage']}>
        <InventoryStockPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/receipts',
    element: (
      <PermissionRoute anyOf={['inventory_receipt:read', 'inventory_receipt:create', 'inventory:manage']}>
        <InventoryReceiptsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/issues',
    element: (
      <PermissionRoute anyOf={['inventory_issue:read', 'inventory_issue:create', 'inventory:manage']}>
        <InventoryIssuesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/returns',
    element: (
      <PermissionRoute anyOf={['inventory_issue:read', 'inventory:manage']}>
        <InventoryReturnsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/transfers',
    element: (
      <PermissionRoute anyOf={['inventory_transfer:read', 'inventory_transfer:create', 'inventory:manage']}>
        <InventoryTransfersPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/adjustments',
    element: (
      <PermissionRoute anyOf={['inventory_adjustment:read', 'inventory_adjustment:create', 'inventory:manage']}>
        <InventoryAdjustmentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/stocktakes',
    element: (
      <PermissionRoute anyOf={['stocktake:read', 'stocktake:create', 'inventory:manage']}>
        <InventoryStocktakesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/reservations',
    element: (
      <PermissionRoute anyOf={['inventory_stock:read', 'inventory:manage']}>
        <InventoryReservationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/assets',
    element: (
      <PermissionRoute anyOf={['inventory_asset:read', 'inventory:read', 'inventory:manage']}>
        <InventoryAssetsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/assets/:id',
    element: (
      <PermissionRoute anyOf={['inventory_asset:read', 'inventory:read', 'inventory:manage']}>
        <InventoryAssetDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/maintenance',
    element: (
      <PermissionRoute anyOf={['inventory_asset:maintenance', 'inventory:manage']}>
        <InventoryMaintenancePage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/reports',
    element: (
      <PermissionRoute anyOf={['inventory_report:read', 'inventory:manage']}>
        <InventoryReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/inventory/settings',
    element: (
      <PermissionRoute anyOf={['inventory:manage']}>
        <InventorySettingsPage />
      </PermissionRoute>
    ),
  },
  // Communication & Notifications (Phase 19)
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <NotificationCenterPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/communication',
    element: (
      <PermissionRoute anyOf={['communication_report:read', 'communication:read', 'announcement:read']}>
        <CommunicationReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/reports',
    element: (
      <PermissionRoute anyOf={['communication_report:read', 'communication:read']}>
        <CommunicationReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/announcements',
    element: (
      <PermissionRoute anyOf={['announcement:read', 'communication:read']}>
        <AnnouncementsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/announcements/new',
    element: (
      <PermissionRoute anyOf={['announcement:create', 'announcement:publish']}>
        <CreateEditAnnouncementPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/announcements/:id',
    element: (
      <PermissionRoute anyOf={['announcement:read', 'communication:read']}>
        <AnnouncementDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/announcements/:id/edit',
    element: (
      <PermissionRoute anyOf={['announcement:update', 'announcement:create']}>
        <CreateEditAnnouncementPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/templates',
    element: (
      <PermissionRoute anyOf={['notification_template:read', 'communication:read']}>
        <NotificationTemplatesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/templates/new',
    element: (
      <PermissionRoute anyOf={['notification_template:create']}>
        <NotificationTemplateEditorPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/templates/:id',
    element: (
      <PermissionRoute anyOf={['notification_template:read', 'notification_template:update']}>
        <NotificationTemplateEditorPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/preferences',
    element: (
      <ProtectedRoute>
        <NotificationPreferencesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/communication/deliveries',
    element: (
      <PermissionRoute anyOf={['notification_delivery:read', 'communication:read']}>
        <NotificationDeliveriesPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/jobs',
    element: (
      <PermissionRoute anyOf={['communication:read', 'communication:create']}>
        <CommunicationJobsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/communication/jobs/:id',
    element: (
      <PermissionRoute anyOf={['communication:read']}>
        <CommunicationJobDetailsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <PermissionRoute anyOf={['report:read', 'analytics:read']}>
        <ReportsDashboardPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/reports/explorer',
    element: (
      <PermissionRoute anyOf={['report:read', 'report:export']}>
        <ReportExplorerPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/reports/scheduled',
    element: (
      <PermissionRoute anyOf={['report:schedule', 'report:manage']}>
        <ScheduledReportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/reports/exports',
    element: (
      <PermissionRoute anyOf={['report:export', 'report:read']}>
        <ExportJobsPage />
      </PermissionRoute>
    ),
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '/404',
    element: <NotFoundPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
