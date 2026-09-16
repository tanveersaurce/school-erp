import { Types } from 'mongoose';
import {
  Library,
  LibrarySetting,
  LibraryAuthor,
  LibraryPublisher,
  LibraryCategory,
  LibraryShelf,
} from '@edusphere/database';
import { BadRequestError, NotFoundError } from '@edusphere/common';
import { FineCalculationMethod } from '@edusphere/types';

export class LibraryConfigService {
  // =========================================================================
  // 1. Library Branches / Locations
  // =========================================================================
  public static async createLibrary(tenantId: string, schoolId: string, data: any) {
    const code = data.code.toUpperCase().trim();
    const existing = await Library.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Library branch with code '${code}' already exists.`);
    }

    const library = await Library.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: new Types.ObjectId(data.campusId),
      name: data.name.trim(),
      code,
      description: data.description,
      address: data.address,
      contactDetails: data.contactDetails,
      operatingHours: data.operatingHours,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return library;
  }

  public static async getLibraries(tenantId: string, schoolId: string, campusId?: string) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (campusId) {
      filter.campusId = new Types.ObjectId(campusId);
    }
    return Library.find(filter).sort({ name: 1 });
  }

  public static async getLibraryById(tenantId: string, libraryId: string) {
    const library = await Library.findOne({
      _id: new Types.ObjectId(libraryId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!library) {
      throw new NotFoundError('Library location not found.');
    }
    return library;
  }

  public static async updateLibrary(tenantId: string, libraryId: string, data: any) {
    const library = await Library.findOne({
      _id: new Types.ObjectId(libraryId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!library) {
      throw new NotFoundError('Library location not found.');
    }

    if (data.name) library.name = data.name.trim();
    if (data.description !== undefined) library.description = data.description;
    if (data.address !== undefined) library.address = data.address;
    if (data.contactDetails) library.contactDetails = data.contactDetails;
    if (data.operatingHours !== undefined) library.operatingHours = data.operatingHours;
    if (data.isActive !== undefined) library.isActive = data.isActive;

    await library.save();
    return library;
  }

  public static async deleteLibrary(tenantId: string, libraryId: string) {
    const library = await Library.findOne({
      _id: new Types.ObjectId(libraryId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!library) {
      throw new NotFoundError('Library location not found.');
    }
    library.isDeleted = true;
    await library.save();
    return { success: true, message: 'Library location archived.' };
  }

  // =========================================================================
  // 2. Library Settings
  // =========================================================================
  public static async getSettings(tenantId: string, schoolId: string, libraryId?: string) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (libraryId) {
      filter.libraryId = new Types.ObjectId(libraryId);
    } else {
      filter.libraryId = { $exists: false };
    }

    let setting = await LibrarySetting.findOne(filter);
    if (!setting) {
      // Create defaults
      setting = await LibrarySetting.create({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        ...(libraryId ? { libraryId: new Types.ObjectId(libraryId) } : {}),
        defaultLoanDurationDays: 14,
        maxBooksPerMember: {
          student: 3,
          teacher: 10,
          staff: 5,
        },
        maxRenewals: 2,
        renewalExtensionDays: 14,
        fineCalculationMethod: FineCalculationMethod.DAILY_RATE,
        finePerDay: 100, // 100 minor units ($1.00 / 1.00)
        fineGracePeriodDays: 2,
        maxFineCap: 100000,
        reservationExpiryDays: 3,
        maxActiveReservations: 3,
        lostBookReplacementFeeMultiplier: 1.5,
        damagedBookDefaultFee: 5000,
      });
    }
    return setting;
  }

  public static async updateSettings(tenantId: string, schoolId: string, data: any, libraryId?: string) {
    const targetLibId = libraryId || data.libraryId;
    const setting = await this.getSettings(tenantId, schoolId, targetLibId);

    const loanDays = data.defaultLoanDurationDays ?? data.studentLoanPeriodDays;
    if (loanDays !== undefined) setting.defaultLoanDurationDays = loanDays;

    if (data.studentBorrowLimit !== undefined || data.staffBorrowLimit !== undefined) {
      setting.maxBooksPerMember = {
        student: data.studentBorrowLimit ?? setting.maxBooksPerMember?.student ?? 3,
        teacher: data.staffBorrowLimit ?? setting.maxBooksPerMember?.teacher ?? 10,
        staff: data.staffBorrowLimit ?? setting.maxBooksPerMember?.staff ?? 5,
      };
    }
    if (data.maxBooksPerMember) {
      setting.maxBooksPerMember = {
        ...setting.maxBooksPerMember,
        ...data.maxBooksPerMember,
      };
    }
    const maxR = data.maxRenewals ?? data.studentMaxRenewals;
    if (maxR !== undefined) setting.maxRenewals = maxR;
    if (data.renewalExtensionDays !== undefined) setting.renewalExtensionDays = data.renewalExtensionDays;
    if (data.fineCalculationMethod) setting.fineCalculationMethod = data.fineCalculationMethod;
    
    const fineRate = data.finePerDay ?? data.dailyFineRateMinorUnits;
    if (fineRate !== undefined) setting.finePerDay = fineRate;

    const graceDays = data.fineGracePeriodDays ?? data.gracePeriodDays;
    if (graceDays !== undefined) setting.fineGracePeriodDays = graceDays;

    const maxCap = data.maxFineCap ?? data.maxFinePerBookMinorUnits;
    if (maxCap !== undefined) setting.maxFineCap = maxCap;

    if (data.reservationExpiryDays !== undefined) setting.reservationExpiryDays = data.reservationExpiryDays;
    if (data.maxActiveReservations !== undefined) setting.maxActiveReservations = data.maxActiveReservations;
    if (data.lostBookReplacementFeeMultiplier !== undefined) setting.lostBookReplacementFeeMultiplier = data.lostBookReplacementFeeMultiplier;
    
    const fee = data.damagedBookDefaultFee ?? data.lostBookProcessingFeeMinorUnits;
    if (fee !== undefined) setting.damagedBookDefaultFee = fee;

    await setting.save();
    
    const settingObj = setting.toObject();
    return {
      ...settingObj,
      dailyFineRateMinorUnits: setting.finePerDay,
      gracePeriodDays: setting.fineGracePeriodDays,
      maxFinePerBookMinorUnits: setting.maxFineCap,
      studentBorrowLimit: setting.maxBooksPerMember?.student,
      staffBorrowLimit: setting.maxBooksPerMember?.staff,
    };
  }

  // =========================================================================
  // 3. Authors
  // =========================================================================
  public static async createAuthor(tenantId: string, schoolId: string, data: any) {
    const name = data.name.trim();
    const existing = await LibraryAuthor.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      name: new RegExp(`^${name}$`, 'i'),
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Author '${name}' already exists.`);
    }

    return LibraryAuthor.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      name,
      biography: data.biography,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  }

  public static async getAuthors(tenantId: string, schoolId: string, search?: string) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    return LibraryAuthor.find(filter).sort({ name: 1 });
  }

  // =========================================================================
  // 4. Publishers
  // =========================================================================
  public static async createPublisher(tenantId: string, schoolId: string, data: any) {
    const name = data.name.trim();
    const existing = await LibraryPublisher.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      name: new RegExp(`^${name}$`, 'i'),
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Publisher '${name}' already exists.`);
    }

    return LibraryPublisher.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      name,
      contact: data.contact,
      website: data.website,
      address: data.address,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  }

  public static async getPublishers(tenantId: string, schoolId: string, search?: string) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    return LibraryPublisher.find(filter).sort({ name: 1 });
  }

  // =========================================================================
  // 5. Categories
  // =========================================================================
  public static async createCategory(tenantId: string, schoolId: string, data: any) {
    const code = data.code.toUpperCase().trim();
    const existing = await LibraryCategory.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Category code '${code}' already exists.`);
    }

    return LibraryCategory.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      name: data.name.trim(),
      code,
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  }

  public static async getCategories(tenantId: string, schoolId: string) {
    return LibraryCategory.find({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    }).sort({ name: 1 });
  }

  // =========================================================================
  // 6. Shelves / Racks
  // =========================================================================
  public static async createShelf(tenantId: string, schoolId: string, data: any) {
    const code = data.code.toUpperCase().trim();
    const libraryId = new Types.ObjectId(data.libraryId);

    const existing = await LibraryShelf.findOne({
      tenantId: new Types.ObjectId(tenantId),
      libraryId,
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Shelf with code '${code}' already exists in this library.`);
    }

    const rack = (data.rack || data.aisle || 'R1').trim();
    const shelf = (data.shelf || data.floor || 'S1').trim();

    return LibraryShelf.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      libraryId,
      room: data.room,
      rack,
      shelf,
      code,
      name: data.name?.trim(),
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
  }

  public static async getShelves(tenantId: string, schoolId: string, libraryId?: string) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (libraryId) {
      filter.libraryId = new Types.ObjectId(libraryId);
    }
    return LibraryShelf.find(filter).populate('libraryId', 'name code').sort({ code: 1 });
  }
}
