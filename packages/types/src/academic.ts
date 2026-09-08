export interface IClass {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  name: string;
  code: string;
  order: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISection {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  classId: string;
  name: string;
  capacity: number;
  room?: string;
  classTeacherId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SubjectType = 'CORE' | 'ELECTIVE' | 'LAB' | 'VOCATIONAL';

export interface ISubject {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  type: SubjectType;
  creditHours?: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeacherSubjectAssignment {
  id: string;
  tenantId: string;
  academicYearId: string;
  schoolId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId: string;
  createdAt: Date;
}

export type EnrollmentStatus = 'ENROLLED' | 'PROMOTED' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN';

export interface IStudentEnrollment {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  rollNumber: number;
  status: EnrollmentStatus;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
