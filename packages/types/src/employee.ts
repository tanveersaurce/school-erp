import {
  EmploymentStatus,
  EmploymentType,
  Gender,
  StaffDocumentType,
  UserType,
} from '@edusphere/common';

// =========================================================================
// 1. Department Types
// =========================================================================
export interface IDepartment {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string;
  headOfDepartmentId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentDto {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string;
  headOfDepartmentId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
  headOfDepartmentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
  headOfDepartmentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

// =========================================================================
// 2. Designation Types
// =========================================================================
export interface IDesignation {
  id: string;
  tenantId: string;
  schoolId: string;
  departmentId?: string;
  name: string;
  code: string;
  description?: string;
  level?: number;
  status: 'ACTIVE' | 'INACTIVE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignationDto {
  id: string;
  tenantId: string;
  schoolId: string;
  departmentId?: string;
  departmentName?: string;
  name: string;
  code: string;
  description?: string;
  level?: number;
  status: 'ACTIVE' | 'INACTIVE';
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignationInput {
  name: string;
  code: string;
  departmentId?: string | null;
  description?: string;
  level?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateDesignationInput {
  name?: string;
  code?: string;
  departmentId?: string | null;
  description?: string;
  level?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

// =========================================================================
// 3. Sub-document Interfaces
// =========================================================================
export interface IQualification {
  degree: string;
  institution: string;
  yearOfPassing: number;
  percentageOrCgpa?: string;
}

export interface IPreviousExperience {
  institutionOrCompany: string;
  role: string;
  fromYear: number;
  toYear: number;
  remarks?: string;
}

export interface IEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
}

export interface IStaffDocument {
  id?: string;
  name: string;
  documentType: StaffDocumentType;
  fileRecordId?: string;
  fileUrl?: string;
  uploadedAt?: Date | string;
}

// =========================================================================
// 4. Employee Types
// =========================================================================
export interface IEmployee {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  userId?: string;
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  gender: Gender;
  dateOfBirth: Date;
  bloodGroup?: string;
  nationality?: string;
  profilePhotoUrl?: string;
  workEmail?: string;
  workPhone?: string;
  personalEmail?: string;
  personalPhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  departmentId: string;
  designationId: string;
  reportingManagerId?: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  joiningDate: Date;
  confirmationDate?: Date;
  terminationDate?: Date;
  terminationReason?: string;
  qualifications: IQualification[];
  previousExperience: IPreviousExperience[];
  emergencyContact: IEmergencyContact;
  documents: IStaffDocument[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  userId?: string;
  userEmail?: string;
  userStatus?: string;
  userRoles?: string[];
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  gender: Gender;
  dateOfBirth: string;
  bloodGroup?: string;
  nationality?: string;
  profilePhotoUrl?: string;
  workEmail?: string;
  workPhone?: string;
  personalEmail?: string;
  personalPhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  departmentId: string;
  departmentName?: string;
  designationId: string;
  designationName?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  joiningDate: string;
  confirmationDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  qualifications: IQualification[];
  previousExperience: IPreviousExperience[];
  emergencyContact: IEmergencyContact;
  documents: IStaffDocument[];
  hasTeacherProfile?: boolean;
  teacherProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  campusId?: string | null;
  employeeId?: string; // Optional manual ID; auto-generated if omitted
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  gender: Gender;
  dateOfBirth: string | Date;
  bloodGroup?: string;
  nationality?: string;
  profilePhotoUrl?: string;
  workEmail?: string;
  workPhone?: string;
  personalEmail?: string;
  personalPhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  departmentId: string;
  designationId: string;
  reportingManagerId?: string | null;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  joiningDate: string | Date;
  confirmationDate?: string | Date;
  qualifications?: IQualification[];
  previousExperience?: IPreviousExperience[];
  emergencyContact?: IEmergencyContact;
  documents?: IStaffDocument[];
  // Account Provisioning options
  provisionUser?: boolean;
  userType?: UserType;
  roles?: string[];
  initialPassword?: string; // If provided, user is activated; if omitted and provisionUser=true, an invitation token is dispatched
}

export interface UpdateEmployeeInput {
  campusId?: string | null;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  gender?: Gender;
  dateOfBirth?: string | Date;
  bloodGroup?: string;
  nationality?: string;
  profilePhotoUrl?: string | null;
  workEmail?: string;
  workPhone?: string;
  personalEmail?: string;
  personalPhone?: string;
  currentAddress?: string;
  permanentAddress?: string;
  departmentId?: string;
  designationId?: string;
  reportingManagerId?: string | null;
  employmentType?: EmploymentType;
  joiningDate?: string | Date;
  confirmationDate?: string | Date | null;
  qualifications?: IQualification[];
  previousExperience?: IPreviousExperience[];
  emergencyContact?: IEmergencyContact;
  documents?: IStaffDocument[];
}

export interface EmployeeStatusTransitionInput {
  status: EmploymentStatus;
  reason?: string;
  effectiveDate?: string | Date;
}

export interface EmployeeFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  designationId?: string;
  campusId?: string;
  status?: EmploymentStatus;
  employmentType?: EmploymentType;
  joiningDateFrom?: string;
  joiningDateTo?: string;
  sortBy?: 'employeeId' | 'name' | 'joiningDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// =========================================================================
// 5. Teacher Profile Types
// =========================================================================
export interface ITeacherProfile {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  employeeId: string; // Ref to Employee
  userId?: string;
  teacherCode?: string;
  specialization?: string;
  primarySubject?: string;
  secondarySubjects: string[];
  teachingExperienceYears: number;
  isAvailableForTimetable: boolean;
  maxWeeklyPeriods?: number;
  bio?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  employeeId: string;
  employeeDetails?: {
    employeeId: string;
    name: string;
    email?: string;
    phone?: string;
    departmentName?: string;
    designationName?: string;
    employmentStatus: EmploymentStatus;
    profilePhotoUrl?: string;
  };
  userId?: string;
  teacherCode?: string;
  specialization?: string;
  primarySubject?: string;
  secondarySubjects: string[];
  teachingExperienceYears: number;
  isAvailableForTimetable: boolean;
  maxWeeklyPeriods?: number;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherProfileInput {
  employeeId: string;
  campusId?: string | null;
  teacherCode?: string;
  specialization?: string;
  primarySubject?: string;
  secondarySubjects?: string[];
  teachingExperienceYears?: number;
  isAvailableForTimetable?: boolean;
  maxWeeklyPeriods?: number;
  bio?: string;
}

export interface UpdateTeacherProfileInput {
  campusId?: string | null;
  teacherCode?: string;
  specialization?: string;
  primarySubject?: string;
  secondarySubjects?: string[];
  teachingExperienceYears?: number;
  isAvailableForTimetable?: boolean;
  maxWeeklyPeriods?: number;
  bio?: string;
}

export interface TeacherFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  campusId?: string;
  primarySubject?: string;
  isAvailableForTimetable?: boolean;
}
