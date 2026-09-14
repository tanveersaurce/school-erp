import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../store/slices/authSlice.js';
import { uiReducer } from '../store/slices/uiSlice.js';
import { baseApi } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.js';
import { ToastProvider } from '../components/common/Toast.js';
import { TimetableDashboardPage } from '../pages/timetable/TimetableDashboardPage.js';
import { PeriodListPage } from '../pages/timetable/PeriodListPage.js';
import { ClassroomListPage } from '../pages/timetable/ClassroomListPage.js';
import { TimetableListPage } from '../pages/timetable/TimetableListPage.js';
import { ClassTimetablePage } from '../pages/timetable/ClassTimetablePage.js';
import { TeacherTimetableViewPage } from '../pages/timetable/TeacherTimetableViewPage.js';
import { RoomTimetableViewPage } from '../pages/timetable/RoomTimetableViewPage.js';
import { MySchedulePage } from '../pages/timetable/MySchedulePage.js';
import {
  UserType,
  UserStatus,
  PeriodType,
  RoomType,
  TimetableStatus,
  AcademicStatus,
} from '@edusphere/common';

const mockPeriods = [
  {
    id: 'period_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Period 1',
    code: 'P1',
    sequence: 1,
    startTime: '08:30',
    endTime: '09:15',
    duration: 45,
    type: PeriodType.TEACHING,
    status: AcademicStatus.ACTIVE,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'period_break',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    name: 'Morning Break',
    code: 'BRK',
    sequence: 2,
    startTime: '09:15',
    endTime: '09:30',
    duration: 15,
    type: PeriodType.BREAK,
    status: AcademicStatus.ACTIVE,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockClassrooms = [
  {
    id: 'room_101',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    campusId: 'campus_1',
    name: 'Room 101',
    code: 'R101',
    capacity: 40,
    roomType: RoomType.CLASSROOM,
    status: AcademicStatus.ACTIVE,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTimetables = [
  {
    id: 'tt_1',
    tenantId: 'tenant_123',
    schoolId: 'school_123',
    campusId: 'campus_1',
    academicYearId: 'ay_2026',
    name: 'Term 1 Master Timetable',
    code: 'TT-T1',
    description: 'Primary bell schedule',
    status: TimetableStatus.PUBLISHED,
    version: 1,
    isCurrent: true,
    effectiveFrom: new Date(),
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockClassTimetableView = {
  timetableId: 'tt_1',
  timetableName: 'Term 1 Master Timetable',
  academicClassId: 'ac_10a',
  className: 'Grade 10',
  sectionName: 'A',
  campusName: 'Main Campus',
  academicYearName: '2026-2027',
  classTeacherName: 'Vikram Malhotra',
  workingDays: [
    { dayOfWeek: 1, dayName: 'Monday' },
    { dayOfWeek: 2, dayName: 'Tuesday' },
  ],
  periods: mockPeriods,
  grid: {
    period_1: {
      1: {
        entryId: 'entry_1',
        academicClassId: 'ac_10a',
        className: 'Grade 10',
        sectionName: 'A',
        subjectId: 'sub_math',
        subjectName: 'Mathematics',
        subjectCode: 'MATH10',
        teacherId: 'teacher_1',
        teacherName: 'Vikram Malhotra',
        roomId: 'room_101',
        roomName: 'Room 101',
        periodId: 'period_1',
        periodName: 'Period 1',
        periodSequence: 1,
        periodType: PeriodType.TEACHING,
        startTime: '08:30',
        endTime: '09:15',
        dayOfWeek: 1,
        dayName: 'Monday',
        isBreak: false,
      },
    },
    period_break: {
      1: {
        periodId: 'period_break',
        periodName: 'Morning Break',
        periodSequence: 2,
        periodType: PeriodType.BREAK,
        startTime: '09:15',
        endTime: '09:30',
        dayOfWeek: 1,
        dayName: 'Monday',
        isBreak: true,
      },
    },
  },
};

const mockTeacherTimetableView = {
  timetableId: 'tt_1',
  timetableName: 'Term 1 Master Timetable',
  teacherId: 'teacher_1',
  teacherName: 'Vikram Malhotra',
  teacherCode: 'TCH-001',
  totalWeeklyPeriods: 18,
  workingDays: [
    { dayOfWeek: 1, dayName: 'Monday' },
    { dayOfWeek: 2, dayName: 'Tuesday' },
  ],
  periods: mockPeriods,
  grid: {
    period_1: {
      1: {
        entryId: 'entry_1',
        academicClassId: 'ac_10a',
        className: 'Grade 10',
        sectionName: 'A',
        subjectId: 'sub_math',
        subjectName: 'Mathematics',
        teacherId: 'teacher_1',
        teacherName: 'Vikram Malhotra',
        roomId: 'room_101',
        roomName: 'Room 101',
        periodId: 'period_1',
        periodName: 'Period 1',
        periodSequence: 1,
        periodType: PeriodType.TEACHING,
        startTime: '08:30',
        endTime: '09:15',
        dayOfWeek: 1,
        dayName: 'Monday',
        isBreak: false,
      },
    },
  },
};

const mockRoomTimetableView = {
  timetableId: 'tt_1',
  timetableName: 'Term 1 Master Timetable',
  roomId: 'room_101',
  roomName: 'Room 101',
  roomCode: 'R101',
  roomType: RoomType.CLASSROOM,
  capacity: 40,
  workingDays: [
    { dayOfWeek: 1, dayName: 'Monday' },
    { dayOfWeek: 2, dayName: 'Tuesday' },
  ],
  periods: mockPeriods,
  grid: {
    period_1: {
      1: {
        entryId: 'entry_1',
        className: 'Grade 10',
        sectionName: 'A',
        subjectName: 'Mathematics',
        teacherName: 'Vikram Malhotra',
        periodId: 'period_1',
        periodName: 'Period 1',
        periodSequence: 1,
        periodType: PeriodType.TEACHING,
        startTime: '08:30',
        endTime: '09:15',
        dayOfWeek: 1,
        dayName: 'Monday',
        isBreak: false,
      },
    },
  },
};

function createTestStore(
  userPermissions: string[] = [
    'timetable:read',
    'timetable:create',
    'timetable:update',
    'timetable:delete',
    'timetable:manage',
    'period:read',
    'period:create',
    'period:update',
    'period:delete',
    'period:manage',
    'classroom:read',
    'classroom:create',
    'classroom:update',
    'classroom:delete',
    'classroom:manage',
    'timetable_entry:read',
    'timetable_entry:create',
    'timetable_entry:update',
    'timetable_entry:delete',
    'timetable_entry:manage',
    'academic_class:read',
    'subject:read',
    'teacher:read',
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
          id: 'user_1',
          tenantId: 'tenant_123',
          schoolId: 'school_123',
          email: 'admin@school.edu',
          userType: UserType.SCHOOL_ADMIN,
          status: UserStatus.ACTIVE,
          roles: ['Admin'],
          permissions: userPermissions,
        },
        accessToken: 'mock.token',
      },
      ui: {
        theme: 'light',
        sidebarOpen: false,
        globalLoading: false,
      },
    } as any,
  });
}

function renderWithRouter(initialRoute: string, routes: any[], store = createTestStore()) {
  const router = createMemoryRouter(routes, { initialEntries: [initialRoute] });
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

describe('Timetable & Scheduling Management Frontend Suite (Phase 9)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(global, 'fetch').mockImplementation((input: any, _init?: any) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('/api/v1/timetable/periods')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockPeriods,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/timetable/classrooms')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockClassrooms,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/timetable/my-schedule')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockTeacherTimetableView,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/timetable/timetables/tt_1/views/class/ac_10a')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockClassTimetableView,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/timetable/timetables/tt_1/views/teacher/teacher_1')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockTeacherTimetableView,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/timetable/timetables/tt_1/views/room/room_101')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockRoomTimetableView,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/timetable/timetables/tt_1/teacher-workload')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                timetableId: 'tt_1',
                totalTeachers: 1,
                averagePeriodsPerTeacher: 18,
                workload: [
                  {
                    teacherId: 'teacher_1',
                    teacherName: 'Vikram Malhotra',
                    totalPeriodsPerWeek: 18,
                    bySubject: [],
                    byClass: [],
                    byDay: {},
                  },
                ],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/timetable/timetables')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: mockTimetables,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic/academic-classes')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'ac_10a',
                  className: 'Grade 10',
                  sectionName: 'A',
                  status: 'ACTIVE',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic/subjects')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'sub_math',
                  name: 'Mathematics',
                  code: 'MATH10',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/teachers')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'teacher_1',
                  employeeId: 'EMP-001',
                  teacherCode: 'TCH-001',
                  employeeDetails: {
                    name: 'Vikram Malhotra',
                  },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/campuses')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'campus_1',
                  name: 'Main Campus',
                  code: 'MAIN',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (url.includes('/api/v1/academic-years')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'ay_2026',
                  name: '2026-2027',
                  isCurrent: true,
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('renders TimetableDashboardPage with module overview and statistics', async () => {
    const routes = [{ path: '/timetable', element: <TimetableDashboardPage /> }];
    renderWithRouter('/timetable', routes);

    expect(screen.getByText('Timetable & Scheduling')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Term 1 Master Timetable')).toBeInTheDocument();
      expect(screen.getAllByText('Master Timetables').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bell Schedule & Periods').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Classrooms & Rooms').length).toBeGreaterThan(0);
    });
  });

  it('renders PeriodListPage and displays bell schedules', async () => {
    const routes = [{ path: '/timetable/periods', element: <PeriodListPage /> }];
    renderWithRouter('/timetable/periods', routes);

    expect(screen.getByText('Bell Schedule & Periods')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Period 1')).toBeInTheDocument();
      expect(screen.getByText('Morning Break')).toBeInTheDocument();
      expect(screen.getByText(/08:30.*09:15/)).toBeInTheDocument();
    });
  });

  it('renders ClassroomListPage and displays facility records', async () => {
    const routes = [{ path: '/timetable/classrooms', element: <ClassroomListPage /> }];
    renderWithRouter('/timetable/classrooms', routes);

    expect(screen.getByText('Classrooms & Facilities')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Room 101')).toBeInTheDocument();
      expect(screen.getByText('R101')).toBeInTheDocument();
    });
  });

  it('renders TimetableListPage with master versions and action triggers', async () => {
    const routes = [{ path: '/timetable/timetables', element: <TimetableListPage /> }];
    renderWithRouter('/timetable/timetables', routes);

    expect(screen.getByText('Master Timetables')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Term 1 Master Timetable')).toBeInTheDocument();
      expect(screen.getByText('CURRENT ACTIVE')).toBeInTheDocument();
    });
  });

  it('renders ClassTimetablePage with 2D weekly matrix grid and slot data', async () => {
    const routes = [{ path: '/timetable/class-view', element: <ClassTimetablePage /> }];
    renderWithRouter('/timetable/class-view', routes);

    expect(screen.getByText('Class Timetable Matrix')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(/Grade 10/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Monday').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mathematics').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Vikram Malhotra/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Morning Break').length).toBeGreaterThan(0);
    });
  });

  it('renders TeacherTimetableViewPage with faculty schedule and workload metrics', async () => {
    const routes = [{ path: '/timetable/teacher-view', element: <TeacherTimetableViewPage /> }];
    renderWithRouter('/timetable/teacher-view', routes);

    expect(screen.getByText('Faculty Schedule & Workload')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Schedule for Vikram Malhotra/i)).toBeInTheDocument();
      expect(screen.getAllByText('18').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mathematics').length).toBeGreaterThan(0);
    });
  });

  it('renders RoomTimetableViewPage with room occupancy schedule', async () => {
    const routes = [{ path: '/timetable/room-view', element: <RoomTimetableViewPage /> }];
    renderWithRouter('/timetable/room-view', routes);

    expect(screen.getByText('Room & Facility Occupancy')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Room 101 (R101)')).toBeInTheDocument();
      expect(screen.getByText('Grade 10 - A')).toBeInTheDocument();
    });
  });

  it('renders MySchedulePage with logged-in faculty timetable', async () => {
    const routes = [{ path: '/timetable/my-schedule', element: <MySchedulePage /> }];
    renderWithRouter('/timetable/my-schedule', routes);

    expect(screen.getByText('My Weekly Teaching Schedule')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Active Master: Term 1 Master Timetable')).toBeInTheDocument();
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
      expect(screen.getByText('Grade 10 - A')).toBeInTheDocument();
    });
  });
});
