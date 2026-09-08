import { AttendanceStatus } from '@edusphere/common';

export interface IAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
  arrivalTimestamp?: Date;
}

export interface IStudentAttendance {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  date: Date;
  takenBy: string;
  verifiedBy?: string;
  isFinalized: boolean;
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffAttendance {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  staffId: string;
  date: Date;
  status: AttendanceStatus;
  checkInTime?: Date;
  checkOutTime?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}
