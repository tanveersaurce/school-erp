import {
  StudentStatus,
  Gender,
  GuardianRelationType,
  StudentDocumentType,
  DocumentVerificationStatus,
  AdmissionType,
} from '@edusphere/common';
import { EnrollmentStatus } from './academic.js';

// =========================================================================
// 1. Common Sub-Interfaces
// =========================================================================
export interface IStructuredAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IStudentEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  priority?: number;
}

export interface IPreviousSchoolDetails {
  schoolName?: string;
  lastClassPassed?: string;
  tcNumber?: string;
  percentageObtained?: number;
}

export interface IMedicalInfo {
  allergies?: string[];
  chronicConditions?: string[];
  physicianName?: string;
  physicianContact?: string;
  medicalNotes?: string;
}

export interface IStudentDocument {
  id?: string;
  _id?: string;
  documentType: StudentDocumentType;
  title: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  verificationStatus: DocumentVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface IStudentStatusHistory {
  previousStatus: StudentStatus;
  newStatus: StudentStatus;
  reason?: string;
  changedBy: string;
  changedAt: Date;
}

// =========================================================================
// 2. Student Interface & DTOs
// =========================================================================
export interface IStudentPersonalDetails {
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  dateOfBirth: Date;
  gender: Gender;
  bloodGroup?: string;
  nationality?: string;
  religion?: string;
  category?: string;
  profilePhoto?: string;
}

export interface IStudentContactDetails {
  email?: string;
  phone?: string;
  alternatePhone?: string;
  emergencyPhone?: string;
  currentAddress: IStructuredAddress | string;
  permanentAddress?: IStructuredAddress | string;
  emergencyContacts?: IStudentEmergencyContact[];
}

export interface IStudentAcademicDetails {
  campusId?: string;
  currentAcademicYearId?: string;
  admissionDate: Date;
  admissionType: AdmissionType;
  previousSchoolDetails?: IPreviousSchoolDetails;
}

export interface IStudentEntity {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  userId?: string;
  studentId: string;
  admissionNumber: string;
  personalDetails: IStudentPersonalDetails;
  contactDetails: IStudentContactDetails;
  academicDetails: IStudentAcademicDetails;
  medicalInfo?: IMedicalInfo;
  documents: IStudentDocument[];
  currentStatus: StudentStatus;
  statusHistory: IStudentStatusHistory[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  userId?: string;
  studentId: string;
  admissionNumber: string;
  personalDetails: IStudentPersonalDetails;
  contactDetails: IStudentContactDetails;
  academicDetails: IStudentAcademicDetails;
  medicalInfo?: IMedicalInfo;
  documents: IStudentDocument[];
  currentStatus: StudentStatus;
  statusHistory: IStudentStatusHistory[];
  guardians?: StudentGuardianRelationDto[];
  currentEnrollment?: EnrollmentDto;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentInput {
  admissionNumber?: string; // Optional: auto-generated if omitted
  studentId?: string; // Optional: auto-generated if omitted
  campusId?: string;
  currentAcademicYearId?: string;
  admissionDate?: string | Date;
  admissionType?: AdmissionType;
  studentCategory?: string;
  personalDetails: {
    firstName: string;
    middleName?: string;
    lastName: string;
    displayName?: string;
    dateOfBirth: string | Date;
    gender: Gender;
    bloodGroup?: string;
    nationality?: string;
    religion?: string;
    category?: string;
    profilePhoto?: string;
  };
  contactDetails: {
    email?: string;
    phone?: string;
    alternatePhone?: string;
    emergencyPhone?: string;
    currentAddress: IStructuredAddress | string;
    permanentAddress?: IStructuredAddress | string;
    emergencyContacts?: IStudentEmergencyContact[];
  };
  previousSchoolDetails?: IPreviousSchoolDetails;
  medicalInfo?: IMedicalInfo;
  initialEnrollment?: {
    academicYearId: string;
    campusId?: string;
    classId?: string;
    sectionId?: string;
    rollNumber?: number;
    startDate?: string | Date;
  };
  primaryGuardian?: {
    guardianId?: string; // If linking existing guardian
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    relationshipType: GuardianRelationType;
    isPrimaryContact?: boolean;
    isEmergencyContact?: boolean;
    canPickup?: boolean;
  };
  provisionUser?: boolean;
  userPassword?: string;
  sendUserInvitation?: boolean;
}

export interface UpdateStudentInput {
  personalDetails?: Partial<IStudentPersonalDetails>;
  contactDetails?: Partial<IStudentContactDetails>;
  academicDetails?: Partial<IStudentAcademicDetails>;
  medicalInfo?: Partial<IMedicalInfo>;
  previousSchoolDetails?: Partial<IPreviousSchoolDetails>;
  campusId?: string;
  currentAcademicYearId?: string;
  studentCategory?: string;
}

export interface StudentFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  campusId?: string;
  academicYearId?: string;
  status?: StudentStatus | string;
  gender?: Gender | string;
  admissionType?: AdmissionType | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentStatusTransitionInput {
  status: StudentStatus;
  reason?: string;
}

// =========================================================================
// 3. Guardian Interface & DTOs
// =========================================================================
export interface IGuardianPersonalDetails {
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  occupation?: string;
  annualIncome?: number;
  profilePhoto?: string;
}

export interface IGuardianContactDetails {
  email: string;
  phone: string;
  alternatePhone?: string;
  address: IStructuredAddress | string;
}

export interface ICommunicationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface IGuardianEntity {
  id: string;
  tenantId: string;
  guardianId: string;
  userId?: string;
  personalDetails: IGuardianPersonalDetails;
  contactDetails: IGuardianContactDetails;
  communicationPreferences?: ICommunicationPreferences;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuardianDto {
  id: string;
  tenantId: string;
  guardianId: string;
  userId?: string;
  personalDetails: IGuardianPersonalDetails;
  contactDetails: IGuardianContactDetails;
  communicationPreferences?: ICommunicationPreferences;
  children?: StudentGuardianRelationDto[];
  hasAccount?: boolean;
  userStatus?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGuardianInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: IStructuredAddress | string;
  occupation?: string;
  annualIncome?: number;
  profilePhoto?: string;
  communicationPreferences?: ICommunicationPreferences;
  provisionUser?: boolean;
  userPassword?: string;
  sendUserInvitation?: boolean;
}

export interface UpdateGuardianInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: IStructuredAddress | string;
  occupation?: string;
  annualIncome?: number;
  profilePhoto?: string;
  communicationPreferences?: Partial<ICommunicationPreferences>;
}

export interface GuardianFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =========================================================================
// 4. Student ↔ Guardian Relationship Interface & DTOs
// =========================================================================
export interface IStudentGuardianRelationEntity {
  id: string;
  tenantId: string;
  studentId: string;
  guardianId: string;
  relationshipType: GuardianRelationType;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  canAccessAcademicInformation: boolean;
  canAccessFinancialInformation: boolean;
  canReceiveNotifications: boolean;
  custodyRestrictions?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt?: Date;
}

export interface StudentGuardianRelationDto {
  id: string;
  tenantId: string;
  studentId: string;
  guardianId: string;
  relationshipType: GuardianRelationType;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  canAccessAcademicInformation: boolean;
  canAccessFinancialInformation: boolean;
  canReceiveNotifications: boolean;
  custodyRestrictions?: string;
  status: 'ACTIVE' | 'INACTIVE';
  student?: {
    id: string;
    studentId: string;
    admissionNumber: string;
    name: string;
    status: StudentStatus;
    gender: Gender;
    profilePhoto?: string;
  };
  guardian?: {
    id: string;
    guardianId: string;
    name: string;
    email: string;
    phone: string;
    occupation?: string;
    relationshipType?: GuardianRelationType;
  };
  createdAt: Date;
}

export interface CreateStudentGuardianRelationInput {
  guardianId: string;
  relationshipType: GuardianRelationType;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
  canAccessAcademicInformation?: boolean;
  canAccessFinancialInformation?: boolean;
  canReceiveNotifications?: boolean;
  custodyRestrictions?: string;
}

export interface UpdateStudentGuardianRelationInput {
  relationshipType?: GuardianRelationType;
  isPrimaryContact?: boolean;
  isEmergencyContact?: boolean;
  canPickup?: boolean;
  canAccessAcademicInformation?: boolean;
  canAccessFinancialInformation?: boolean;
  canReceiveNotifications?: boolean;
  custodyRestrictions?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

// =========================================================================
// 5. Enrollment Interface & DTOs
// =========================================================================
export interface IEnrollmentEntity {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  studentId: string;
  academicYearId: string;
  classId?: string;
  sectionId?: string;
  rollNumber?: number;
  status: EnrollmentStatus;
  startDate: Date;
  endDate?: Date;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnrollmentDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  campusName?: string;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  academicYearId: string;
  academicYearName?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  rollNumber?: number;
  status: EnrollmentStatus;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEnrollmentInput {
  studentId: string;
  academicYearId: string;
  campusId?: string;
  classId?: string;
  sectionId?: string;
  rollNumber?: number;
  status?: EnrollmentStatus;
  startDate?: string | Date;
}

export interface UpdateEnrollmentInput {
  campusId?: string;
  classId?: string;
  sectionId?: string;
  rollNumber?: number;
  status?: EnrollmentStatus;
  endDate?: string | Date;
}

export interface EnrollmentFilterQuery {
  page?: number;
  limit?: number;
  studentId?: string;
  academicYearId?: string;
  campusId?: string;
  status?: EnrollmentStatus | string;
}

// =========================================================================
// 6. Document Verification DTOs
// =========================================================================
export interface CreateStudentDocumentInput {
  documentType: StudentDocumentType;
  title: string;
  fileUrl: string;
}

export interface VerifyStudentDocumentInput {
  verificationStatus: DocumentVerificationStatus.VERIFIED | DocumentVerificationStatus.REJECTED;
  rejectionReason?: string;
}
