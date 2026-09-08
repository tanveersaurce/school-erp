export interface ITimetable {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId?: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPeriod {
  id: string;
  tenantId: string;
  schoolId: string;
  timetableId: string;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  periodNumber: number;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  subjectId?: string;
  teacherId?: string;
  room?: string;
  isBreak: boolean;
  createdAt: Date;
  updatedAt: Date;
}
