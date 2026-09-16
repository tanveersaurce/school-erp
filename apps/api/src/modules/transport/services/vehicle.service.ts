import { Types } from 'mongoose';
import {
  Vehicle,
  VehicleType,
  VehicleDocument,
  TransportTrip,
} from '@edusphere/database';
import {
  BadRequestError,
  NotFoundError,
  VehicleStatus,
  TransportDocumentStatus,
} from '@edusphere/common';

export class VehicleService {
  // =========================================================================
  // 1. Vehicle Management
  // =========================================================================
  public static async createVehicle(tenantId: string, schoolId: string, data: any) {
    const registrationNumber = data.registrationNumber.toUpperCase().trim();
    const existing = await Vehicle.findOne({
      tenantId: new Types.ObjectId(tenantId),
      registrationNumber,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Vehicle with registration '${registrationNumber}' already exists.`);
    }

    const vehicleType = await VehicleType.findOne({
      _id: new Types.ObjectId(data.vehicleTypeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vehicleType) {
      throw new BadRequestError('Invalid vehicle type specified.');
    }

    const vehicleNumber = (data.vehicleNumber || registrationNumber).toUpperCase().trim();
    const capacity = data.capacity || data.seatingCapacity || (vehicleType as any).defaultCapacity || (vehicleType as any).defaultSeatingCapacity || 40;
    const seatingCapacity = data.seatingCapacity ?? capacity;

    const vehicle = await Vehicle.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId),
      vehicleTypeId: vehicleType._id,
      vehicleNumber,
      registrationNumber,
      vin: data.vin?.toUpperCase().trim(),
      make: data.make.trim(),
      model: data.model.trim(),
      yearOfManufacture: data.yearOfManufacture,
      capacity,
      seatingCapacity,
      standingCapacity: data.standingCapacity || 0,
      fuelType: data.fuelType || 'DIESEL',
      currentMileageKm: data.currentMileageKm || 0,
      ownershipType: data.ownershipType || 'OWNED',
      status: data.status || VehicleStatus.ACTIVE,
      gpsDeviceId: data.gpsDeviceId,
      fastagId: data.fastagId,
      insurancePolicyNumber: data.insurancePolicyNumber,
      insuranceExpiryDate: data.insuranceExpiryDate ? new Date(data.insuranceExpiryDate) : undefined,
      fitnessExpiryDate: data.fitnessExpiryDate ? new Date(data.fitnessExpiryDate) : undefined,
      permitExpiryDate: data.permitExpiryDate ? new Date(data.permitExpiryDate) : undefined,
      pollutionExpiryDate: data.pollutionExpiryDate ? new Date(data.pollutionExpiryDate) : undefined,
    });

    return vehicle;
  }

  public static async getVehicles(
    tenantId: string,
    schoolId: string,
    filters: {
      campusId?: string;
      vehicleTypeId?: string;
      status?: VehicleStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (filters.campusId) query.campusId = new Types.ObjectId(filters.campusId);
    if (filters.vehicleTypeId) query.vehicleTypeId = new Types.ObjectId(filters.vehicleTypeId);
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const regex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { registrationNumber: regex },
        { make: regex },
        { model: regex },
        { vin: regex },
      ];
    }

    const [items, total] = await Promise.all([
      Vehicle.find(query)
        .populate('vehicleTypeId', 'name code defaultSeatingCapacity')
        .populate('campusId', 'name code')
        .sort({ registrationNumber: 1 })
        .skip(skip)
        .limit(limit),
      Vehicle.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getVehicleById(tenantId: string, vehicleId: string) {
    const vehicle = await Vehicle.findOne({
      _id: new Types.ObjectId(vehicleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('vehicleTypeId', 'name code defaultSeatingCapacity')
      .populate('campusId', 'name code');

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    return vehicle;
  }

  public static async updateVehicle(tenantId: string, vehicleId: string, data: any) {
    const vehicle = await Vehicle.findOne({
      _id: new Types.ObjectId(vehicleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    if (data.campusId) vehicle.campusId = new Types.ObjectId(data.campusId);
    if (data.vehicleTypeId) vehicle.vehicleTypeId = new Types.ObjectId(data.vehicleTypeId);
    if (data.vin !== undefined) vehicle.vin = data.vin?.toUpperCase().trim();
    if (data.make !== undefined) vehicle.make = data.make.trim();
    if (data.model !== undefined) vehicle.model = data.model.trim();
    if (data.yearOfManufacture !== undefined) vehicle.yearOfManufacture = data.yearOfManufacture;
    if (data.seatingCapacity !== undefined) vehicle.seatingCapacity = data.seatingCapacity;
    if (data.standingCapacity !== undefined) vehicle.standingCapacity = data.standingCapacity;
    if (data.fuelType !== undefined) vehicle.fuelType = data.fuelType;
    if (data.currentMileageKm !== undefined) vehicle.currentMileageKm = data.currentMileageKm;
    if (data.ownershipType !== undefined) vehicle.ownershipType = data.ownershipType;
    if (data.status !== undefined) vehicle.status = data.status;
    if (data.gpsDeviceId !== undefined) vehicle.gpsDeviceId = data.gpsDeviceId;
    if (data.fastagId !== undefined) vehicle.fastagId = data.fastagId;
    if (data.insurancePolicyNumber !== undefined) vehicle.insurancePolicyNumber = data.insurancePolicyNumber;
    if (data.insuranceExpiryDate !== undefined) vehicle.insuranceExpiryDate = data.insuranceExpiryDate ? new Date(data.insuranceExpiryDate) : undefined;
    if (data.fitnessExpiryDate !== undefined) vehicle.fitnessExpiryDate = data.fitnessExpiryDate ? new Date(data.fitnessExpiryDate) : undefined;
    if (data.permitExpiryDate !== undefined) vehicle.permitExpiryDate = data.permitExpiryDate ? new Date(data.permitExpiryDate) : undefined;
    if (data.pollutionExpiryDate !== undefined) vehicle.pollutionExpiryDate = data.pollutionExpiryDate ? new Date(data.pollutionExpiryDate) : undefined;

    await vehicle.save();
    return vehicle;
  }

  public static async deleteVehicle(tenantId: string, vehicleId: string) {
    const vehicle = await Vehicle.findOne({
      _id: new Types.ObjectId(vehicleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    // Ensure vehicle is not currently deployed in an in-progress trip
    const activeTrip = await TransportTrip.findOne({
      tenantId: new Types.ObjectId(tenantId),
      vehicleId: vehicle._id,
      status: 'IN_PROGRESS',
      isDeleted: false,
    });

    if (activeTrip) {
      throw new BadRequestError('Cannot delete vehicle: currently deployed in an active trip.');
    }

    vehicle.isDeleted = true;
    await vehicle.save();
    return vehicle;
  }

  // =========================================================================
  // 2. Vehicle Compliance Documents
  // =========================================================================
  public static async addDocument(tenantId: string, vehicleId: string, data: any) {
    const vehicle = await Vehicle.findOne({
      _id: new Types.ObjectId(vehicleId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    const document = await VehicleDocument.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: vehicle.schoolId,
      vehicleId: vehicle._id,
      documentType: data.documentType,
      documentNumber: data.documentNumber.trim(),
      issuedDate: new Date(data.issuedDate || data.issueDate || new Date()),
      issueDate: new Date(data.issuedDate || data.issueDate || new Date()),
      expiryDate: new Date(data.expiryDate),
      fileUrl: data.fileUrl || '',
      fileReference: data.fileReference || data.fileUrl || '',
      verificationStatus: data.verificationStatus || data.status || TransportDocumentStatus.PENDING,
      status: data.status || data.verificationStatus || TransportDocumentStatus.PENDING,
      remarks: data.remarks,
    });

    return document;
  }

  public static async getDocuments(tenantId: string, vehicleId: string) {
    return VehicleDocument.find({
      tenantId: new Types.ObjectId(tenantId),
      vehicleId: new Types.ObjectId(vehicleId),
      isDeleted: false,
    }).sort({ expiryDate: 1 });
  }

  public static async verifyDocument(
    tenantId: string,
    documentId: string,
    verifierUserId: string,
    data: { status: TransportDocumentStatus; remarks?: string }
  ) {
    const doc = await VehicleDocument.findOne({
      _id: new Types.ObjectId(documentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Vehicle document not found.');
    }

    doc.verificationStatus = data.status;
    doc.verifiedBy = new Types.ObjectId(verifierUserId) as any;
    doc.verifiedAt = new Date();
    if (data.remarks) doc.remarks = data.remarks;

    await doc.save();
    return doc;
  }
}
