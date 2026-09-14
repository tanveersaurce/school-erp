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
