import { StudentStatus } from '@edusphere/common';

export interface IStudent {
  id: string;
  tenantId: string;
  schoolId: string;
  userId?: string;
  admissionNumber: string;
  personalDetails: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    bloodGroup?: string;
    nationality?: string;
    religion?: string;
  };
  contactDetails: {
    primaryEmail?: string;
    primaryPhone?: string;
    emergencyPhone: string;
    currentAddress: string;
    permanentAddress?: string;
  };
  medicalInfo?: {
    allergies: string[];
    chronicConditions: string[];
    physicianName?: string;
    physicianContact?: string;
  };
  currentStatus: StudentStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IParent {
  id: string;
  tenantId: string;
  userId?: string;
  personalDetails: {
    firstName: string;
    lastName: string;
    occupation?: string;
    annualIncome?: number;
  };
  contactDetails: {
    email: string;
    phone: string;
    address: string;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ParentRelationType = 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'GRANDPARENT' | 'OTHER';

export interface IStudentParentRelation {
  id: string;
  tenantId: string;
  studentId: string;
  parentId: string;
  relationshipType: ParentRelationType;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  hasFeeResponsibility: boolean;
  createdAt: Date;
}

export interface ITeacher {
  id: string;
  tenantId: string;
  schoolId: string;
  userId: string;
  employeeId: string;
  department: string;
  designation: string;
  qualifications: string[];
  joiningDate: Date;
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'RESIGNED' | 'TERMINATED';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaff {
  id: string;
  tenantId: string;
  schoolId: string;
  userId: string;
  employeeId: string;
  department: string;
  designation: string;
  joiningDate: Date;
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'RESIGNED' | 'TERMINATED';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
