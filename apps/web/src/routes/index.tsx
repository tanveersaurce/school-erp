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
