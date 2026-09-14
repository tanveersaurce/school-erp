import {
  TenantPlan,
  TenantBillingStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  OnboardingStatus,
  WeekDay,
  AttendanceMode,
} from '@edusphere/common';

export interface TenantContext {
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  academicYearId?: string;
  userId?: string;
  isPlatformAdmin?: boolean;
}

export interface ITenantFeatures {
  maxStudents: number;
  modulesEnabled: string[];
  customBranding: boolean;
}

export interface ITenantDatabaseConfig {
  mode: 'SHARED' | 'DEDICATED';
  connectionUriSecretKey?: string;
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  plan: TenantPlan;
  billingStatus: TenantBillingStatus;
  status: TenantStatus;
  onboardingStep: OnboardingStatus;
  features: ITenantFeatures;
  databaseConfig: ITenantDatabaseConfig;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISchoolAddress {
  street: string;
  area?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ISchoolContact {
  email: string;
  secondaryEmail?: string;
  phone: string;
  emergencyPhone?: string;
  website?: string;
}

export interface ISchoolBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  displayName?: string;
  reportCardHeader?: string;
  emailSignature?: string;
}

export interface ISchoolGeneralSettings {
  dateFormat: string;
  timeFormat: string;
  weekStartDay: WeekDay;
  defaultLanguage: string;
}

export interface ISchoolNumberingSettings {
  admissionNumberPrefix: string;
  admissionNumberDigits: number;
  invoicePrefix: string;
  receiptPrefix: string;
  employeeIdPrefix: string;
}

export interface ISchoolAttendanceSettings {
  attendanceMode: AttendanceMode;
  lateThresholdMinutes: number;
  halfDayThresholdMinutes: number;
  attendanceCutoffTime?: string;
  approvalRequired: boolean;
  allowDirectCorrection: boolean;
  lowAttendanceThresholdPercentage: number;
}

export interface ISchoolSettings {
  general: ISchoolGeneralSettings;
  workingDays: WeekDay[];
  numbering: ISchoolNumberingSettings;
  attendance?: ISchoolAttendanceSettings;
}

export interface ISchool {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  code: string;
  affiliationBoard: string;
  registrationNumber?: string;
  establishedYear?: number;
  contact?: ISchoolContact;
  address?: ISchoolAddress;
  timezone: string;
  currency: string;
  branding?: ISchoolBranding;
  settings?: ISchoolSettings;
  principalId?: string;
  status: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampus {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  address: ISchoolAddress;
  contact?: {
    email?: string;
    phone?: string;
  };
  principalId?: string;
  status: CampusStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAcademicYear {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: AcademicYearStatus;
  isCurrent: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// -------------------------------------------------------------------------
// DTOs (Data Transfer Objects)
// -------------------------------------------------------------------------

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  plan: TenantPlan;
  billingStatus: TenantBillingStatus;
  status: TenantStatus;
  onboardingStep: OnboardingStatus;
  features: ITenantFeatures;
  databaseMode: 'SHARED' | 'DEDICATED';
  createdAt: string;
  updatedAt: string;
  studentCount?: number;
  schoolCount?: number;
  campusCount?: number;
}

export interface SchoolDto {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  code: string;
  affiliationBoard: string;
  registrationNumber?: string;
  establishedYear?: number;
  contact?: ISchoolContact;
  address?: ISchoolAddress;
  timezone: string;
  currency: string;
  branding?: ISchoolBranding;
  settings?: ISchoolSettings;
  principalId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  campusCount?: number;
}

export interface CampusDto {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  address: ISchoolAddress;
  contact?: {
    email?: string;
    phone?: string;
  };
  principalId?: string;
  status: CampusStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYearDto {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------------------
// Request Inputs
// -------------------------------------------------------------------------

export interface CreateTenantInput {
  name: string;
  slug: string;
  customDomain?: string;
  plan?: TenantPlan;
  features?: Partial<ITenantFeatures>;
}

export interface UpdateTenantInput {
  name?: string;
  customDomain?: string;
  plan?: TenantPlan;
  billingStatus?: TenantBillingStatus;
  status?: TenantStatus;
  features?: Partial<ITenantFeatures>;
}

export interface TenantOnboardInput {
  tenantName: string;
  slug: string;
  schoolName: string;
  schoolCode: string;
  affiliationBoard: string;
  campusName: string;
  campusCode: string;
  academicYearName: string;
  academicYearStartDate: string;
  academicYearEndDate: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone?: string;
}

export interface UpdateSchoolProfileInput {
  name?: string;
  legalName?: string;
  code?: string;
  affiliationBoard?: string;
  registrationNumber?: string;
  establishedYear?: number;
  contact?: Partial<ISchoolContact>;
  address?: Partial<ISchoolAddress>;
  timezone?: string;
  currency?: string;
}

export interface UpdateSchoolSettingsInput {
  general?: Partial<ISchoolGeneralSettings>;
  workingDays?: WeekDay[];
  numbering?: Partial<ISchoolNumberingSettings>;
}

export interface UpdateSchoolBrandingInput {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  displayName?: string;
  reportCardHeader?: string;
  emailSignature?: string;
}

export interface CreateCampusInput {
  schoolId?: string;
  name: string;
  code: string;
  address: ISchoolAddress;
  contact?: {
    email?: string;
    phone?: string;
  };
  status?: CampusStatus;
}

export interface UpdateCampusInput {
  name?: string;
  code?: string;
  address?: Partial<ISchoolAddress>;
  contact?: {
    email?: string;
    phone?: string;
  };
  status?: CampusStatus;
}

export interface CreateAcademicYearInput {
  schoolId?: string;
  campusId?: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: AcademicYearStatus;
  isCurrent?: boolean;
}

export interface UpdateAcademicYearInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: AcademicYearStatus;
}
