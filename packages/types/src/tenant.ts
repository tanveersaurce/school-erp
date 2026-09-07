import { TenantPlan, TenantBillingStatus } from '@edusphere/common';

export interface TenantContext {
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  academicYearId?: string;
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  plan: TenantPlan;
  billingStatus: TenantBillingStatus;
  features: {
    maxStudents: number;
    modulesEnabled: string[];
    customBranding: boolean;
  };
  databaseConfig: {
    mode: 'SHARED' | 'DEDICATED';
    connectionUriSecretKey?: string;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISchool {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  affiliationBoard: string;
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
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
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
  isCurrent: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
