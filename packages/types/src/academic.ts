import {
  EducationLevel,
  AcademicStatus,
  SubjectCategory,
  TeacherAssignmentStatus,
} from '@edusphere/common';

// =========================================================================
// 1. Grade / Class Level Interfaces & DTOs
// =========================================================================
export interface IClass {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId?: string;
  name: string;
  shortName?: string;
  code: string;
  order: number;
  educationLevel?: EducationLevel;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  academicYearId?: string;
  name: string;
  shortName?: string;
  code: string;
  order: number;
  educationLevel?: EducationLevel;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClassInput {
  name: string;
  shortName?: string;
  code: string;
  order: number;
  educationLevel?: EducationLevel;
  campusId?: string;
  academicYearId?: string;
  status?: AcademicStatus;
}

export interface UpdateClassInput {
  name?: string;
  shortName?: string;
  code?: string;
  order?: number;
  educationLevel?: EducationLevel;
  campusId?: string;
  academicYearId?: string;
  status?: AcademicStatus;
}

export interface ClassFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  campusId?: string;
  academicYearId?: string;
  educationLevel?: EducationLevel;
  status?: AcademicStatus | string;
}

// =========================================================================
// 2. Section Interfaces & DTOs
// =========================================================================
export interface ISection {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId?: string;
  classId: string;
  name: string;
  code?: string;
  capacity: number;
  room?: string;
  classTeacherId?: string;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SectionDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  academicYearId?: string;
  classId: string;
  className?: string;
  name: string;
  code?: string;
  capacity: number;
  room?: string;
  classTeacherId?: string;
  classTeacherName?: string;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSectionInput {
  classId: string;
  name: string;
  code?: string;
  capacity?: number;
  room?: string;
  classTeacherId?: string;
  campusId?: string;
  academicYearId?: string;
  status?: AcademicStatus;
}

export interface UpdateSectionInput {
  name?: string;
  code?: string;
  capacity?: number;
  room?: string;
  classTeacherId?: string | null;
  status?: AcademicStatus;
}

export interface SectionFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  campusId?: string;
  academicYearId?: string;
  status?: AcademicStatus | string;
}

// =========================================================================
// 3. Academic Class / Section Offering Interfaces & DTOs
// =========================================================================
export interface IAcademicClass {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  classTeacherId?: string;
  capacity: number;
  room?: string;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicClassDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  campusName?: string;
  academicYearId: string;
  academicYearName?: string;
  classId: string;
  className?: string;
  classCode?: string;
  sectionId: string;
  sectionName?: string;
  classTeacherId?: string;
  classTeacherName?: string;
  classTeacherEmail?: string;
  capacity: number;
  currentEnrollment: number;
  availableCapacity: number;
  room?: string;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAcademicClassInput {
  campusId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  classTeacherId?: string;
  capacity?: number;
  room?: string;
  status?: AcademicStatus;
}

export interface UpdateAcademicClassInput {
  classTeacherId?: string | null;
  capacity?: number;
  room?: string;
  status?: AcademicStatus;
}

export interface AcademicClassFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  campusId?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  classTeacherId?: string;
  status?: AcademicStatus | string;
}

// =========================================================================
// 4. Subject Interfaces & DTOs
// =========================================================================
export type SubjectType = 'CORE' | 'ELECTIVE' | 'LAB' | 'VOCATIONAL';

export interface ISubject {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  shortName?: string;
  code: string;
  type: SubjectType;
  category?: SubjectCategory;
  educationLevel?: EducationLevel;
  creditHours?: number;
  sequence?: number;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectDto {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  shortName?: string;
  code: string;
  type: SubjectType;
  category?: SubjectCategory;
  educationLevel?: EducationLevel;
  creditHours?: number;
  sequence?: number;
  status: AcademicStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectInput {
  name: string;
  shortName?: string;
  code: string;
  type?: SubjectType;
  category?: SubjectCategory;
  educationLevel?: EducationLevel;
  creditHours?: number;
  sequence?: number;
  status?: AcademicStatus;
}

export interface UpdateSubjectInput {
  name?: string;
  shortName?: string;
  code?: string;
  type?: SubjectType;
  category?: SubjectCategory;
  educationLevel?: EducationLevel;
  creditHours?: number;
  sequence?: number;
  status?: AcademicStatus;
}

export interface SubjectFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: SubjectType | string;
  category?: SubjectCategory | string;
  educationLevel?: EducationLevel | string;
  status?: AcademicStatus | string;
}

// =========================================================================
// 5. Class ↔ Subject Mapping Interfaces & DTOs
// =========================================================================
export interface IClassSubject {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  isOptional: boolean;
  creditHours?: number;
  sequence: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSubjectDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  academicYearName?: string;
  classId: string;
  className?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  subjectType?: SubjectType;
  isOptional: boolean;
  creditHours?: number;
  sequence: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClassSubjectInput {
  academicYearId: string;
  classId: string;
  subjectId: string;
  campusId?: string;
  isOptional?: boolean;
  creditHours?: number;
  sequence?: number;
}

export interface UpdateClassSubjectInput {
  isOptional?: boolean;
  creditHours?: number;
  sequence?: number;
}

// =========================================================================
// 6. Teacher Subject Assignment Interfaces & DTOs
// =========================================================================
export interface ITeacherSubjectAssignment {
  id: string;
  tenantId: string;
  academicYearId: string;
  schoolId: string;
  campusId?: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId: string;
  academicClassId?: string;
  status: TeacherAssignmentStatus;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdAt: Date;
}

export interface TeacherSubjectAssignmentDto {
  id: string;
  tenantId: string;
  academicYearId: string;
  academicYearName?: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  teacherId: string;
  teacherName?: string;
  teacherCode?: string;
  teacherEmail?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  classId: string;
  className?: string;
  sectionId: string;
  sectionName?: string;
  academicClassId?: string;
  status: TeacherAssignmentStatus;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdAt: Date;
}

export interface CreateTeacherAssignmentInput {
  academicYearId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId: string;
  academicClassId?: string;
  campusId?: string;
  status?: TeacherAssignmentStatus;
  effectiveFrom?: string | Date;
  effectiveTo?: string | Date;
}

export interface UpdateTeacherAssignmentInput {
  status?: TeacherAssignmentStatus;
  effectiveTo?: string | Date;
}

export interface TeacherAssignmentFilterQuery {
  page?: number;
  limit?: number;
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  sectionId?: string;
  academicClassId?: string;
  academicYearId?: string;
  campusId?: string;
  status?: TeacherAssignmentStatus | string;
}

// =========================================================================
// 7. Student Academic Enrollment & Roll Number Interfaces & DTOs
// =========================================================================
export type EnrollmentStatus = 'ENROLLED' | 'PROMOTED' | 'RETAINED' | 'TRANSFERRED' | 'WITHDRAWN';

export interface IStudentEnrollment {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  studentId: string;
  academicYearId: string;
  classId?: string;
  sectionId?: string;
  academicClassId?: string;
  rollNumber?: number;
  status: EnrollmentStatus;
  startDate: Date;
  endDate?: Date;
  promotionStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignRollNumberInput {
  rollNumber: number;
}

export interface ClassTeacherAssignmentInput {
  classTeacherId: string | null;
}
