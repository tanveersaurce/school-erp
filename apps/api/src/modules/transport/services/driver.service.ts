import { Types } from 'mongoose';
import {
  DriverProfile,
  DriverDocument,
  AttendantProfile,
  Employee,
  Vehicle,
} from '@edusphere/database';
import {
  BadRequestError,
  NotFoundError,
  DriverStatus,
  DriverVerificationStatus,
  TransportDocumentStatus,
} from '@edusphere/common';

export class DriverService {
  // =========================================================================
  // 1. Driver Profiles (Linked to Phase 6 Employee)
  // =========================================================================
  public static async createDriverProfile(tenantId: string, schoolId: string, data: any) {
    const licenseNumber = data.licenseNumber.toUpperCase().trim();

    // Verify employee exists and belongs to this tenant/school
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(data.employeeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!employee) {
      throw new BadRequestError('Specified employee record does not exist.');
    }

    // Check if employee already has a driver profile
    const existingEmp = await DriverProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: employee._id,
      isDeleted: false,
    });

    if (existingEmp) {
      throw new BadRequestError('Driver profile already exists for this employee.');
    }

    // Check if licenseNumber already registered
    const existingLic = await DriverProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
      licenseNumber,
      isDeleted: false,
    });

    if (existingLic) {
      throw new BadRequestError(`Driver license '${licenseNumber}' is already registered.`);
    }

    let defaultVehicleId: Types.ObjectId | undefined;
    if (data.defaultVehicleId) {
      const vehicle = await Vehicle.findOne({
        _id: new Types.ObjectId(data.defaultVehicleId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!vehicle) {
        throw new BadRequestError('Invalid default vehicle specified.');
      }
      defaultVehicleId = vehicle._id;
    }

    const profile = await DriverProfile.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId || employee.campusId),
      employeeId: employee._id,
      licenseNumber,
      licenseType: data.licenseType || 'COMMERCIAL_HEAVY',
      licenseExpiryDate: new Date(data.licenseExpiryDate),
      badgeNumber: data.badgeNumber?.trim(),
      badgeExpiryDate: data.badgeExpiryDate ? new Date(data.badgeExpiryDate) : undefined,
      yearsOfExperience: data.yearsOfExperience || 0,
      medicalFitnessExpiryDate: data.medicalFitnessExpiryDate ? new Date(data.medicalFitnessExpiryDate) : undefined,
      policeVerificationReference: data.policeVerificationReference,
      policeVerificationDate: data.policeVerificationDate ? new Date(data.policeVerificationDate) : undefined,
      bloodGroup: data.bloodGroup,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      status: data.status || DriverStatus.ACTIVE,
      verificationStatus: data.verificationStatus || DriverVerificationStatus.PENDING,
      defaultVehicleId,
    });

    return profile;
  }

  public static async getDrivers(
    tenantId: string,
    schoolId: string,
    filters: {
      campusId?: string;
      status?: DriverStatus;
      verificationStatus?: DriverVerificationStatus;
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
    if (filters.status) query.status = filters.status;
    if (filters.verificationStatus) query.verificationStatus = filters.verificationStatus;
    if (filters.search) {
      const regex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { licenseNumber: regex },
        { badgeNumber: regex },
      ];
    }

    const [items, total] = await Promise.all([
      DriverProfile.find(query)
        .populate('employeeId', 'employeeId firstName lastName email phone designation department')
        .populate('campusId', 'name code')
        .populate('defaultVehicleId', 'registrationNumber make model')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DriverProfile.countDocuments(query),
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

  public static async getDriverById(tenantId: string, driverId: string) {
    const driver = await DriverProfile.findOne({
      _id: new Types.ObjectId(driverId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('employeeId', 'employeeId firstName lastName email phone designation department')
      .populate('campusId', 'name code')
      .populate('defaultVehicleId', 'registrationNumber make model');

    if (!driver) {
      throw new NotFoundError('Driver profile not found.');
    }

    return driver;
  }

  public static async updateDriver(tenantId: string, driverId: string, data: any) {
    const driver = await DriverProfile.findOne({
      _id: new Types.ObjectId(driverId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!driver) {
      throw new NotFoundError('Driver profile not found.');
    }

    if (data.licenseNumber) driver.licenseNumber = data.licenseNumber.toUpperCase().trim();
    if (data.licenseType) driver.licenseType = data.licenseType;
    if (data.licenseExpiryDate) driver.licenseExpiryDate = new Date(data.licenseExpiryDate);
    if (data.badgeNumber !== undefined) driver.badgeNumber = data.badgeNumber?.trim();
    if (data.badgeExpiryDate !== undefined) driver.badgeExpiryDate = data.badgeExpiryDate ? new Date(data.badgeExpiryDate) : undefined;
    if (data.yearsOfExperience !== undefined) driver.yearsOfExperience = data.yearsOfExperience;
    if (data.medicalFitnessExpiryDate !== undefined) driver.medicalFitnessExpiryDate = data.medicalFitnessExpiryDate ? new Date(data.medicalFitnessExpiryDate) : undefined;
    if (data.policeVerificationReference !== undefined) driver.policeVerificationReference = data.policeVerificationReference;
    if (data.policeVerificationDate !== undefined) driver.policeVerificationDate = data.policeVerificationDate ? new Date(data.policeVerificationDate) : undefined;
    if (data.bloodGroup !== undefined) driver.bloodGroup = data.bloodGroup;
    if (data.emergencyContactName !== undefined) driver.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined) driver.emergencyContactPhone = data.emergencyContactPhone;
    if (data.status) driver.status = data.status;
    if (data.verificationStatus) driver.verificationStatus = data.verificationStatus;
    if (data.defaultVehicleId !== undefined) {
      driver.defaultVehicleId = (data.defaultVehicleId ? new Types.ObjectId(data.defaultVehicleId) : undefined) as any;
    }

    await driver.save();
    return driver;
  }

  public static async verifyDriver(
    tenantId: string,
    driverId: string,
    verifierUserId: string,
    data: { status: DriverVerificationStatus; remarks?: string }
  ) {
    const driver = await DriverProfile.findOne({
      _id: new Types.ObjectId(driverId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!driver) {
      throw new NotFoundError('Driver profile not found.');
    }

    driver.verificationStatus = data.status;
    await driver.save();
    return driver;
  }

  // Driver Documents
  public static async addDriverDocument(tenantId: string, driverProfileId: string, data: any) {
    const driver = await DriverProfile.findOne({
      _id: new Types.ObjectId(driverProfileId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!driver) {
      throw new NotFoundError('Driver profile not found.');
    }

    const doc = await DriverDocument.create({
      tenantId: new Types.ObjectId(tenantId),
      driverProfileId: driver._id,
      documentType: data.documentType,
      documentNumber: data.documentNumber.trim(),
      issuedDate: new Date(data.issuedDate),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      fileUrl: data.fileUrl || '',
      verificationStatus: data.verificationStatus || TransportDocumentStatus.PENDING,
      remarks: data.remarks,
    });

    return doc;
  }

  public static async getDriverDocuments(tenantId: string, driverProfileId: string) {
    return DriverDocument.find({
      tenantId: new Types.ObjectId(tenantId),
      driverProfileId: new Types.ObjectId(driverProfileId),
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  // =========================================================================
  // 2. Attendant Profiles (Linked to Phase 6 Employee)
  // =========================================================================
  public static async createAttendantProfile(tenantId: string, schoolId: string, data: any) {
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(data.employeeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!employee) {
      throw new BadRequestError('Specified employee record does not exist.');
    }

    const existing = await AttendantProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: employee._id,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError('Attendant profile already exists for this employee.');
    }

    let defaultVehicleId: Types.ObjectId | undefined;
    if (data.defaultVehicleId) {
      defaultVehicleId = new Types.ObjectId(data.defaultVehicleId);
    }

    const profile = await AttendantProfile.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId || employee.campusId),
      employeeId: employee._id,
      firstAidCertified: data.firstAidCertified ?? false,
      firstAidExpiryDate: data.firstAidExpiryDate ? new Date(data.firstAidExpiryDate) : undefined,
      policeVerificationReference: data.policeVerificationReference,
      policeVerificationDate: data.policeVerificationDate ? new Date(data.policeVerificationDate) : undefined,
      status: data.status || DriverStatus.ACTIVE,
      defaultVehicleId,
    });

    return profile;
  }

  public static async getAttendants(tenantId: string, schoolId: string, filters: { campusId?: string }) {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (filters.campusId) query.campusId = new Types.ObjectId(filters.campusId);

    return AttendantProfile.find(query)
      .populate('employeeId', 'employeeId firstName lastName email phone designation department')
      .populate('campusId', 'name code')
      .populate('defaultVehicleId', 'registrationNumber make model')
      .sort({ createdAt: -1 });
  }

  public static async getAttendantById(tenantId: string, attendantId: string) {
    const attendant = await AttendantProfile.findOne({
      _id: new Types.ObjectId(attendantId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('employeeId', 'employeeId firstName lastName email phone designation department')
      .populate('campusId', 'name code')
      .populate('defaultVehicleId', 'registrationNumber make model');

    if (!attendant) {
      throw new NotFoundError('Attendant profile not found.');
    }

    return attendant;
  }

  public static async updateAttendant(tenantId: string, attendantId: string, data: any) {
    const attendant = await AttendantProfile.findOne({
      _id: new Types.ObjectId(attendantId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!attendant) {
      throw new NotFoundError('Attendant profile not found.');
    }

    if (data.firstAidCertified !== undefined) attendant.firstAidCertified = data.firstAidCertified;
    if (data.firstAidExpiryDate !== undefined) attendant.firstAidExpiryDate = data.firstAidExpiryDate ? new Date(data.firstAidExpiryDate) : undefined;
    if (data.policeVerificationReference !== undefined) attendant.policeVerificationReference = data.policeVerificationReference;
    if (data.policeVerificationDate !== undefined) attendant.policeVerificationDate = data.policeVerificationDate ? new Date(data.policeVerificationDate) : undefined;
    if (data.status) attendant.status = data.status;
    if (data.defaultVehicleId !== undefined) {
      attendant.defaultVehicleId = (data.defaultVehicleId ? new Types.ObjectId(data.defaultVehicleId) : undefined) as any;
    }

    await attendant.save();
    return attendant;
  }
}
