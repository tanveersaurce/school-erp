export interface IHostel {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  type: 'BOYS' | 'GIRLS' | 'COED';
  wardenName?: string;
  wardenPhone?: string;
  address?: string;
  totalRooms: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoom {
  id: string;
  tenantId: string;
  hostelId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  roomType: 'STANDARD' | 'DELUXE' | 'DORMITORY';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBed {
  id: string;
  tenantId: string;
  hostelId: string;
  roomId: string;
  bedNumber: string;
  isOccupied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHostelAllocation {
  id: string;
  tenantId: string;
  studentId: string;
  hostelId: string;
  roomId: string;
  bedId: string;
  academicYearId: string;
  allocationDate: Date;
  vacatingDate?: Date;
  status: 'ALLOCATED' | 'VACATED';
  createdAt: Date;
  updatedAt: Date;
}
