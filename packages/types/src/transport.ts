export interface IVehicle {
  id: string;
  tenantId: string;
  schoolId: string;
  vehicleNumber: string;
  capacity: number;
  model?: string;
  type: 'BUS' | 'VAN' | 'MINIBUS';
  insuranceExpiry?: Date;
  fitnessExpiry?: Date;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriver {
  id: string;
  tenantId: string;
  schoolId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiry: Date;
  phone: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoute {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  vehicleId?: string;
  driverId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRouteStop {
  id: string;
  tenantId: string;
  routeId: string;
  stopName: string;
  sequenceOrder: number;
  pickupTime?: string;
  dropTime?: string;
  fare?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentTransportAssignment {
  id: string;
  tenantId: string;
  studentId: string;
  routeId: string;
  stopId: string;
  academicYearId: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}
