import { AdmissionStatus } from '@edusphere/common';

export interface IAdmissionApplication {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  applicationNumber: string;
  classId: string;
  studentDetails: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    bloodGroup?: string;
    nationality?: string;
    religion?: string;
  };
  parentDetails: {
    fatherName?: string;
    fatherPhone?: string;
    fatherEmail?: string;
    fatherOccupation?: string;
    motherName?: string;
    motherPhone?: string;
    motherEmail?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianRelation?: string;
    address: string;
  };
  previousSchoolDetails?: {
    schoolName?: string;
    lastClassPassed?: string;
    tcNumber?: string;
    percentageObtained?: number;
  };
  status: AdmissionStatus;
  interviewDate?: Date;
  documents: {
    name: string;
    fileUrl: string;
    isVerified: boolean;
  }[];
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
