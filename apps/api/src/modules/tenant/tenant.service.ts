import mongoose, { Types } from 'mongoose';
import {
  TenantPlan,
  TenantBillingStatus,
  TenantStatus,
  CampusStatus,
  AcademicYearStatus,
  OnboardingStatus,
  WeekDay,
  UserType,
  UserStatus,
  NotFoundError,
  ConflictError,
  BadRequestError,
  AuthorizationError,
} from '@edusphere/common';
import {
  Tenant,
  School,
  Campus,
  AcademicYear,
  User,
  Role,
  UserRole,
  Session,
  Student,
} from '@edusphere/database';
import {
  TenantDto,
  SchoolDto,
  CampusDto,
  AcademicYearDto,
  CreateTenantInput,
  UpdateTenantInput,
  TenantOnboardInput,
  UpdateSchoolProfileInput,
  UpdateSchoolSettingsInput,
  UpdateSchoolBrandingInput,
  CreateCampusInput,
  UpdateCampusInput,
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from '@edusphere/types';
import { invalidateTenantResolverCache } from '../../middlewares/tenantContext.js';
import { recordAuditLog } from '../../core/audit/audit.service.js';
import { passwordService } from '../auth/password.service.js';
import { logger } from '../../core/logger/logger.js';

export interface AuditContextMeta {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export class TenantService {
  /**
   * Secure multi-entity onboarding workflow.
   * Atomically provisions: Tenant -> School -> Campus -> AcademicYear -> SchoolAdmin User -> Role Assignment
   */
  async onboardTenant(
    input: TenantOnboardInput,
    meta?: AuditContextMeta
  ): Promise<{
    tenant: TenantDto;
    school: SchoolDto;
    campus: CampusDto;
    academicYear: AcademicYearDto;
    adminUserId: string;
  }> {
    // 1. Verify slug uniqueness
    const normalizedSlug = input.slug.toLowerCase().trim();
    const existingTenant = await Tenant.findOne({ slug: normalizedSlug });
    if (existingTenant) {
      throw new ConflictError(`Tenant with slug '${normalizedSlug}' already exists.`);
    }

    // 2. Verify admin email uniqueness
    const normalizedEmail = input.adminEmail.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError(`User account with email '${normalizedEmail}' already registered.`);
    }

    const tenantId = new Types.ObjectId();
    const schoolId = new Types.ObjectId();
    const campusId = new Types.ObjectId();
    const academicYearId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    // Hash admin password
    const passwordHash = await passwordService.hashPassword(input.adminPassword);

    let session: mongoose.ClientSession | null = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch {
      // Degraded/standalone test environment without replica set
      session = null;
      useTransaction = false;
    }

    try {
      const opts = session ? { session } : {};

      // A. Create Tenant
      const [tenantDoc] = await Tenant.create(
        [
          {
            _id: tenantId,
            name: input.tenantName.trim(),
            slug: normalizedSlug,
            plan: TenantPlan.STARTER,
            billingStatus: TenantBillingStatus.ACTIVE,
            status: TenantStatus.ACTIVE,
            onboardingStep: OnboardingStatus.COMPLETED,
            features: {
              maxStudents: 500,
              modulesEnabled: ['ACADEMICS', 'ATTENDANCE', 'FEES', 'EXAMS'],
              customBranding: true,
            },
            databaseConfig: { mode: 'SHARED' },
          },
        ],
        opts
      );

      // B. Create School Profile with default settings
      const [schoolDoc] = await School.create(
        [
          {
            _id: schoolId,
            tenantId,
            name: input.schoolName.trim(),
            code: input.schoolCode.toUpperCase().trim(),
            affiliationBoard: input.affiliationBoard.trim(),
            contact: {
              email: normalizedEmail,
              phone: input.adminPhone?.trim() || '1234567890',
            },
            address: {
              street: 'Main Street',
              city: 'City',
              state: 'State',
              postalCode: '100001',
              country: 'India',
            },
            timezone: 'Asia/Kolkata',
            currency: 'INR',
            branding: {
              displayName: input.schoolName.trim(),
              primaryColor: '#4f46e5',
              secondaryColor: '#06b6d4',
            },
            status: 'ACTIVE',
          },
        ],
        opts
      );

      // C. Create Campus
      const [campusDoc] = await Campus.create(
        [
          {
            _id: campusId,
            tenantId,
            schoolId,
            name: input.campusName.trim(),
            code: input.campusCode.toUpperCase().trim(),
            address: {
              street: 'Campus Main Block',
              city: 'City',
              state: 'State',
              postalCode: '100001',
              country: 'India',
            },
            status: CampusStatus.ACTIVE,
          },
        ],
        opts
      );

      // D. Create Academic Year (Active & Current)
      const [academicYearDoc] = await AcademicYear.create(
        [
          {
            _id: academicYearId,
            tenantId,
            schoolId,
            campusId,
            name: input.academicYearName.trim(),
            startDate: new Date(input.academicYearStartDate),
            endDate: new Date(input.academicYearEndDate),
            status: AcademicYearStatus.ACTIVE,
            isCurrent: true,
          },
        ],
        opts
      );

      // E. Map or Create SCHOOL_ADMIN Role for this tenant
      let adminRole = await Role.findOne({
        $or: [{ tenantId }, { isSystemRole: true }],
        name: 'SCHOOL_ADMIN',
      }).session(session || null);

      if (!adminRole) {
        const [createdRole] = await Role.create(
          [
            {
              tenantId,
              name: 'SCHOOL_ADMIN',
              userType: UserType.SCHOOL_ADMIN,
              description: 'Institutional Administrator',
              isSystemRole: false,
            },
          ],
          opts
        );
        adminRole = createdRole;
      }

      // F. Create Initial Administrator User
      const [userDoc] = await User.create(
        [
          {
            _id: userId,
            tenantId,
            schoolId,
            email: normalizedEmail,
            passwordHash,
            firstName: input.adminFirstName.trim(),
            lastName: input.adminLastName.trim(),
            phone: input.adminPhone?.trim(),
            userType: UserType.SCHOOL_ADMIN,
            status: UserStatus.ACTIVE,
            emailVerified: true,
          },
        ],
        opts
      );

      // G. Assign Role
      await UserRole.create(
        [
          {
            tenantId,
            userId,
            roleId: adminRole._id,
          },
        ],
        opts
      );

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      // Audit Log
      await recordAuditLog({
        tenantId: tenantId.toString(),
        schoolId: schoolId.toString(),
        userId: userId.toString(),
        action: 'TENANT_ONBOARDED',
        entity: 'Tenant',
        entityId: tenantId.toString(),
        after: {
          tenant: tenantDoc.toObject(),
          school: schoolDoc.toObject(),
          campus: campusDoc.toObject(),
          academicYear: academicYearDoc.toObject(),
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });

      return {
        tenant: this.mapTenantDto(tenantDoc),
        school: this.mapSchoolDto(schoolDoc),
        campus: this.mapCampusDto(campusDoc),
        academicYear: this.mapAcademicYearDto(academicYearDoc),
        adminUserId: userDoc._id.toString(),
      };
    } catch (err) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Platform Tenant Administration (SUPER_ADMIN)
  // -------------------------------------------------------------------------

  async listTenants(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: TenantStatus;
      plan?: TenantPlan;
    } = {}
  ): Promise<{
    tenants: TenantDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };
    if (query.status) filter.status = query.status;
    if (query.plan) filter.plan = query.plan;
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { slug: searchRegex }, { customDomain: searchRegex }];
    }

    const [docs, total] = await Promise.all([
      Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Tenant.countDocuments(filter),
    ]);

    const dtos = await Promise.all(
      docs.map(async (doc) => {
        const studentCount = await Student.countDocuments({
          tenantId: doc._id,
          isDeleted: false,
        });
        const schoolCount = await School.countDocuments({
          tenantId: doc._id,
          isDeleted: false,
        });
        const campusCount = await Campus.countDocuments({
          tenantId: doc._id,
          isDeleted: false,
        });
        return {
          ...this.mapTenantDto(doc),
          studentCount,
          schoolCount,
          campusCount,
        };
      })
    );

    return { tenants: dtos, total, page, limit };
  }

  async getTenantById(id: string): Promise<TenantDto> {
    const tenant = await Tenant.findOne({ _id: id, isDeleted: false });
    if (!tenant) {
      throw new NotFoundError('Tenant organization not found.');
    }

    const [studentCount, schoolCount, campusCount] = await Promise.all([
      Student.countDocuments({ tenantId: tenant._id, isDeleted: false }),
      School.countDocuments({ tenantId: tenant._id, isDeleted: false }),
      Campus.countDocuments({ tenantId: tenant._id, isDeleted: false }),
    ]);

    return {
      ...this.mapTenantDto(tenant),
      studentCount,
      schoolCount,
      campusCount,
    };
  }

  async createTenant(input: CreateTenantInput, meta?: AuditContextMeta): Promise<TenantDto> {
    const normalizedSlug = input.slug.toLowerCase().trim();
    const existing = await Tenant.findOne({ slug: normalizedSlug });
    if (existing) {
      throw new ConflictError(`Tenant slug '${normalizedSlug}' is already taken.`);
    }

    if (input.customDomain) {
      const existingDomain = await Tenant.findOne({
        customDomain: input.customDomain.toLowerCase().trim(),
      });
      if (existingDomain) {
        throw new ConflictError(
          `Custom domain '${input.customDomain}' is already bound to another tenant.`
        );
      }
    }

    const doc = await Tenant.create({
      name: input.name.trim(),
      slug: normalizedSlug,
      customDomain: input.customDomain?.toLowerCase().trim(),
      plan: input.plan || TenantPlan.STARTER,
      billingStatus: TenantBillingStatus.ACTIVE,
      status: TenantStatus.ACTIVE,
      onboardingStep: OnboardingStatus.IN_PROGRESS,
      features: {
        maxStudents: input.features?.maxStudents || 500,
        modulesEnabled: input.features?.modulesEnabled || ['ACADEMICS'],
        customBranding: input.features?.customBranding ?? false,
      },
    });

    if (meta?.userId) {
      await recordAuditLog({
        tenantId: doc._id.toString(),
        userId: meta.userId,
        action: 'TENANT_CREATED',
        entity: 'Tenant',
        entityId: doc._id.toString(),
        after: doc.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapTenantDto(doc);
  }

  async updateTenant(
    id: string,
    input: UpdateTenantInput,
    meta?: AuditContextMeta
  ): Promise<TenantDto> {
    const tenant = await Tenant.findOne({ _id: id, isDeleted: false });
    if (!tenant) {
      throw new NotFoundError('Tenant organization not found.');
    }

    if (input.customDomain && input.customDomain !== tenant.customDomain) {
      const conflict = await Tenant.findOne({
        _id: { $ne: tenant._id },
        customDomain: input.customDomain.toLowerCase().trim(),
      });
      if (conflict) {
        throw new ConflictError(
          `Custom domain '${input.customDomain}' already bound to another tenant.`
        );
      }
    }

    const before = tenant.toObject();

    if (input.name) tenant.name = input.name.trim();
    if (input.customDomain !== undefined) {
      tenant.customDomain = input.customDomain?.toLowerCase().trim() || undefined;
    }
    if (input.plan) tenant.plan = input.plan;
    if (input.billingStatus) tenant.billingStatus = input.billingStatus;
    if (input.status) tenant.status = input.status;
    if (input.features) {
      tenant.features = {
        ...tenant.features,
        ...input.features,
      };
    }

    await tenant.save();

    // Invalidate resolver cache
    invalidateTenantResolverCache(tenant._id.toString(), tenant.slug, tenant.customDomain);

    if (meta?.userId) {
      await recordAuditLog({
        tenantId: tenant._id.toString(),
        userId: meta.userId,
        action: 'TENANT_UPDATED',
        entity: 'Tenant',
        entityId: tenant._id.toString(),
        before,
        after: tenant.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapTenantDto(tenant);
  }

  async suspendTenant(id: string, reason?: string, meta?: AuditContextMeta): Promise<TenantDto> {
    const tenant = await Tenant.findOne({ _id: id, isDeleted: false });
    if (!tenant) {
      throw new NotFoundError('Tenant organization not found.');
    }

    const before = tenant.toObject();
    tenant.status = TenantStatus.SUSPENDED;
    tenant.billingStatus = TenantBillingStatus.SUSPENDED;
    await tenant.save();

    // Invalidate resolver cache so subsequent requests fail immediately
    invalidateTenantResolverCache(tenant._id.toString(), tenant.slug, tenant.customDomain);

    // Revoke all active sessions for this tenant
    await Session.updateMany(
      { tenantId: tenant._id, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: `TENANT_SUSPENDED: ${reason || 'Administrative action'}`,
        },
      }
    );

    if (meta?.userId) {
      await recordAuditLog({
        tenantId: tenant._id.toString(),
        userId: meta.userId,
        action: 'TENANT_SUSPENDED',
        entity: 'Tenant',
        entityId: tenant._id.toString(),
        before,
        after: tenant.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapTenantDto(tenant);
  }

  async restoreTenant(id: string, meta?: AuditContextMeta): Promise<TenantDto> {
    const tenant = await Tenant.findOne({ _id: id, isDeleted: false });
    if (!tenant) {
      throw new NotFoundError('Tenant organization not found.');
    }

    const before = tenant.toObject();
    tenant.status = TenantStatus.ACTIVE;
    tenant.billingStatus = TenantBillingStatus.ACTIVE;
    await tenant.save();

    invalidateTenantResolverCache(tenant._id.toString(), tenant.slug, tenant.customDomain);

    if (meta?.userId) {
      await recordAuditLog({
        tenantId: tenant._id.toString(),
        userId: meta.userId,
        action: 'TENANT_RESTORED',
        entity: 'Tenant',
        entityId: tenant._id.toString(),
        before,
        after: tenant.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapTenantDto(tenant);
  }

  async archiveTenant(id: string, reason?: string, meta?: AuditContextMeta): Promise<TenantDto> {
    const tenant = await Tenant.findOne({ _id: id, isDeleted: false });
    if (!tenant) {
      throw new NotFoundError('Tenant organization not found.');
    }

    const before = tenant.toObject();
    tenant.status = TenantStatus.ARCHIVED;
    tenant.billingStatus = TenantBillingStatus.CANCELLED;
    await tenant.save();

    invalidateTenantResolverCache(tenant._id.toString(), tenant.slug, tenant.customDomain);

    // Revoke sessions
    await Session.updateMany(
      { tenantId: tenant._id, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: `TENANT_ARCHIVED: ${reason || 'Tenant archived'}`,
        },
      }
    );

    if (meta?.userId) {
      await recordAuditLog({
        tenantId: tenant._id.toString(),
        userId: meta.userId,
        action: 'TENANT_ARCHIVED',
        entity: 'Tenant',
        entityId: tenant._id.toString(),
        before,
        after: tenant.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapTenantDto(tenant);
  }

  // -------------------------------------------------------------------------
  // School Profile & Configuration
  // -------------------------------------------------------------------------

  async getSchoolProfile(tenantId: string, schoolId?: string): Promise<SchoolDto> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (schoolId) filter._id = new Types.ObjectId(schoolId);

    const school = await School.findOne(filter);
    if (!school) {
      throw new NotFoundError('School profile not found for this tenant.');
    }

    const campusCount = await Campus.countDocuments({
      tenantId: school.tenantId,
      schoolId: school._id,
      isDeleted: false,
    });

    return {
      ...this.mapSchoolDto(school),
      campusCount,
    };
  }

  async updateSchoolProfile(
    tenantId: string,
    input: UpdateSchoolProfileInput,
    schoolId?: string,
    meta?: AuditContextMeta
  ): Promise<SchoolDto> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (schoolId) filter._id = new Types.ObjectId(schoolId);

    const school = await School.findOne(filter);
    if (!school) {
      throw new NotFoundError('School profile not found.');
    }

    // Code uniqueness check within tenant
    if (input.code && input.code.toUpperCase().trim() !== school.code) {
      const codeConflict = await School.findOne({
        _id: { $ne: school._id },
        tenantId: school.tenantId,
        code: input.code.toUpperCase().trim(),
        isDeleted: false,
      });
      if (codeConflict) {
        throw new ConflictError(
          `School code '${input.code}' is already used by another school in this tenant.`
        );
      }
      school.code = input.code.toUpperCase().trim();
    }

    const before = school.toObject();

    if (input.name) school.name = input.name.trim();
    if (input.legalName !== undefined) school.legalName = input.legalName?.trim();
    if (input.affiliationBoard) school.affiliationBoard = input.affiliationBoard.trim();
    if (input.registrationNumber !== undefined) {
      school.registrationNumber = input.registrationNumber?.trim();
    }
    if (input.establishedYear !== undefined) school.establishedYear = input.establishedYear;
    if (input.timezone) school.timezone = input.timezone.trim();
    if (input.currency) school.currency = input.currency.trim();

    if (input.contact) {
      const curContact = school.contact || { email: '', phone: '' };
      school.contact = {
        email: input.contact.email ?? curContact.email,
        secondaryEmail: input.contact.secondaryEmail ?? curContact.secondaryEmail,
        phone: input.contact.phone ?? curContact.phone,
        emergencyPhone: input.contact.emergencyPhone ?? curContact.emergencyPhone,
        website: input.contact.website ?? curContact.website,
      };
    }

    if (input.address) {
      const curAddress = school.address || {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      };
      school.address = {
        street: input.address.street ?? curAddress.street,
        area: input.address.area ?? curAddress.area,
        city: input.address.city ?? curAddress.city,
        state: input.address.state ?? curAddress.state,
        postalCode: input.address.postalCode ?? curAddress.postalCode,
        country: input.address.country ?? curAddress.country,
      };
    }

    await school.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: school._id.toString(),
        userId: meta.userId,
        action: 'SCHOOL_PROFILE_UPDATED',
        entity: 'School',
        entityId: school._id.toString(),
        before,
        after: school.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapSchoolDto(school);
  }

  async getSchoolSettings(tenantId: string, schoolId?: string) {
    const school = await this.getSchoolProfile(tenantId, schoolId);
    return (
      school.settings || {
        general: {
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '12H',
          weekStartDay: 'MONDAY',
          defaultLanguage: 'en',
        },
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        numbering: {
          admissionNumberPrefix: 'ADM',
          admissionNumberDigits: 5,
          invoicePrefix: 'INV',
          receiptPrefix: 'REC',
          employeeIdPrefix: 'EMP',
        },
      }
    );
  }

  async updateSchoolSettings(
    tenantId: string,
    input: UpdateSchoolSettingsInput,
    schoolId?: string,
    meta?: AuditContextMeta
  ) {
    const filter: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (schoolId) filter._id = new Types.ObjectId(schoolId);

    const school = await School.findOne(filter);
    if (!school) {
      throw new NotFoundError('School not found.');
    }

    const before = school.settings;

    const currentGeneral = school.settings?.general || {
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12H',
      weekStartDay: WeekDay.MONDAY,
      defaultLanguage: 'en',
    };
    const currentNumbering = school.settings?.numbering || {
      admissionNumberPrefix: 'ADM',
      admissionNumberDigits: 5,
      invoicePrefix: 'INV',
      receiptPrefix: 'REC',
      employeeIdPrefix: 'EMP',
    };

    school.settings = {
      general: {
        dateFormat: input.general?.dateFormat ?? currentGeneral.dateFormat,
        timeFormat: input.general?.timeFormat ?? currentGeneral.timeFormat,
        weekStartDay: input.general?.weekStartDay ?? currentGeneral.weekStartDay,
        defaultLanguage: input.general?.defaultLanguage ?? currentGeneral.defaultLanguage,
      },
      workingDays: input.workingDays || school.settings?.workingDays || [],
      numbering: {
        admissionNumberPrefix:
          input.numbering?.admissionNumberPrefix ?? currentNumbering.admissionNumberPrefix,
        admissionNumberDigits:
          input.numbering?.admissionNumberDigits ?? currentNumbering.admissionNumberDigits,
        invoicePrefix: input.numbering?.invoicePrefix ?? currentNumbering.invoicePrefix,
        receiptPrefix: input.numbering?.receiptPrefix ?? currentNumbering.receiptPrefix,
        employeeIdPrefix: input.numbering?.employeeIdPrefix ?? currentNumbering.employeeIdPrefix,
      },
    };

    await school.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: school._id.toString(),
        userId: meta.userId,
        action: 'SCHOOL_SETTINGS_UPDATED',
        entity: 'SchoolSettings',
        entityId: school._id.toString(),
        before,
        after: school.settings,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return school.settings;
  }

  async getSchoolBranding(tenantId: string, schoolId?: string) {
    const school = await this.getSchoolProfile(tenantId, schoolId);
    return (
      school.branding || {
        primaryColor: '#4f46e5',
        secondaryColor: '#06b6d4',
        displayName: school.name,
      }
    );
  }

  async updateSchoolBranding(
    tenantId: string,
    input: UpdateSchoolBrandingInput,
    schoolId?: string,
    meta?: AuditContextMeta
  ) {
    const filter: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (schoolId) filter._id = new Types.ObjectId(schoolId);

    const school = await School.findOne(filter);
    if (!school) {
      throw new NotFoundError('School not found.');
    }

    const before = school.branding;

    school.branding = {
      ...school.branding,
      ...input,
    };

    await school.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: school._id.toString(),
        userId: meta.userId,
        action: 'SCHOOL_BRANDING_UPDATED',
        entity: 'SchoolBranding',
        entityId: school._id.toString(),
        before,
        after: school.branding,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return school.branding;
  }

  // -------------------------------------------------------------------------
  // Campus Management (Branch / Campus Sites)
  // -------------------------------------------------------------------------

  async listCampuses(
    tenantId: string,
    schoolId?: string,
    query: { page?: number; limit?: number; status?: CampusStatus; search?: string } = {}
  ): Promise<{ campuses: CampusDto[]; total: number }> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (schoolId) filter.schoolId = new Types.ObjectId(schoolId);
    if (query.status) filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { 'address.city': regex }];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Campus.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Campus.countDocuments(filter),
    ]);

    return {
      campuses: docs.map((d) => this.mapCampusDto(d)),
      total,
    };
  }

  async getCampusById(tenantId: string, campusId: string): Promise<CampusDto> {
    const campus = await Campus.findOne({
      _id: campusId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!campus) {
      throw new NotFoundError('Campus not found.');
    }
    return this.mapCampusDto(campus);
  }

  async createCampus(
    tenantId: string,
    input: CreateCampusInput,
    meta?: AuditContextMeta
  ): Promise<CampusDto> {
    // Determine schoolId: use provided or fallback to tenant's default school
    let targetSchoolId: Types.ObjectId;
    if (input.schoolId) {
      targetSchoolId = new Types.ObjectId(input.schoolId);
    } else {
      const defaultSchool = await School.findOne({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!defaultSchool) {
        throw new BadRequestError('Tenant has no configured school. Please create a school first.');
      }
      targetSchoolId = defaultSchool._id as Types.ObjectId;
    }

    // Verify code uniqueness within school
    const normalizedCode = input.code.toUpperCase().trim();
    const existing = await Campus.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: targetSchoolId,
      code: normalizedCode,
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(
        `Campus with code '${normalizedCode}' already exists in this school.`
      );
    }

    const campus = await Campus.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: targetSchoolId,
      name: input.name.trim(),
      code: normalizedCode,
      address: input.address,
      contact: input.contact,
      status: input.status || CampusStatus.ACTIVE,
    });

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: targetSchoolId.toString(),
        userId: meta.userId,
        action: 'CAMPUS_CREATED',
        entity: 'Campus',
        entityId: campus._id.toString(),
        after: campus.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapCampusDto(campus);
  }

  async updateCampus(
    tenantId: string,
    campusId: string,
    input: UpdateCampusInput,
    meta?: AuditContextMeta
  ): Promise<CampusDto> {
    const campus = await Campus.findOne({
      _id: campusId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!campus) {
      throw new NotFoundError('Campus not found.');
    }

    // Code uniqueness check if changed
    if (input.code && input.code.toUpperCase().trim() !== campus.code) {
      const normalizedCode = input.code.toUpperCase().trim();
      const conflict = await Campus.findOne({
        _id: { $ne: campus._id },
        tenantId: campus.tenantId,
        schoolId: campus.schoolId,
        code: normalizedCode,
        isDeleted: false,
      });
      if (conflict) {
        throw new ConflictError(
          `Campus with code '${normalizedCode}' already exists in this school.`
        );
      }
      campus.code = normalizedCode;
    }

    const before = campus.toObject();

    if (input.name) campus.name = input.name.trim();
    if (input.status) campus.status = input.status;
    if (input.address) {
      campus.address = {
        ...campus.address,
        ...input.address,
      };
    }
    if (input.contact) {
      campus.contact = {
        ...campus.contact,
        ...input.contact,
      };
    }

    await campus.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: campus.schoolId.toString(),
        userId: meta.userId,
        action: 'CAMPUS_UPDATED',
        entity: 'Campus',
        entityId: campus._id.toString(),
        before,
        after: campus.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapCampusDto(campus);
  }

  async archiveCampus(
    tenantId: string,
    campusId: string,
    meta?: AuditContextMeta
  ): Promise<CampusDto> {
    const campus = await Campus.findOne({
      _id: campusId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!campus) {
      throw new NotFoundError('Campus not found.');
    }

    const before = campus.toObject();
    campus.status = CampusStatus.ARCHIVED;
    await campus.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: campus.schoolId.toString(),
        userId: meta.userId,
        action: 'CAMPUS_ARCHIVED',
        entity: 'Campus',
        entityId: campus._id.toString(),
        before,
        after: campus.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapCampusDto(campus);
  }

  // -------------------------------------------------------------------------
  // Academic Year Management
  // -------------------------------------------------------------------------

  async listAcademicYears(
    tenantId: string,
    campusId?: string,
    status?: AcademicYearStatus
  ): Promise<AcademicYearDto[]> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    if (campusId) filter.campusId = new Types.ObjectId(campusId);
    if (status) filter.status = status;

    const docs = await AcademicYear.find(filter).sort({ startDate: -1 });
    return docs.map((d) => this.mapAcademicYearDto(d));
  }

  async getAcademicYearById(tenantId: string, academicYearId: string): Promise<AcademicYearDto> {
    const ay = await AcademicYear.findOne({
      _id: academicYearId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!ay) {
      throw new NotFoundError('Academic year not found.');
    }
    return this.mapAcademicYearDto(ay);
  }

  async getCurrentAcademicYear(tenantId: string, campusId?: string): Promise<AcademicYearDto> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isCurrent: true,
      isDeleted: false,
    };
    if (campusId) filter.campusId = new Types.ObjectId(campusId);

    const ay = await AcademicYear.findOne(filter);
    if (!ay) {
      throw new NotFoundError('No active current academic year found for this institution.');
    }
    return this.mapAcademicYearDto(ay);
  }

  async createAcademicYear(
    tenantId: string,
    input: CreateAcademicYearInput,
    meta?: AuditContextMeta
  ): Promise<AcademicYearDto> {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (start >= end) {
      throw new BadRequestError('Start date must precede end date.');
    }

    // Resolve campusId and schoolId
    let campusId: Types.ObjectId;
    let schoolId: Types.ObjectId;

    if (input.campusId) {
      const campus = await Campus.findOne({
        _id: input.campusId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!campus) {
        throw new NotFoundError('Campus specified for academic year does not exist.');
      }
      campusId = campus._id as Types.ObjectId;
      schoolId = campus.schoolId;
    } else {
      const defaultCampus = await Campus.findOne({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!defaultCampus) {
        throw new BadRequestError('Tenant has no campus configured. Please create a campus first.');
      }
      campusId = defaultCampus._id as Types.ObjectId;
      schoolId = defaultCampus.schoolId;
    }

    // Check unique name per campus
    const existingName = await AcademicYear.findOne({
      tenantId: new Types.ObjectId(tenantId),
      campusId,
      name: input.name.trim(),
      isDeleted: false,
    });
    if (existingName) {
      throw new ConflictError(`Academic year '${input.name}' already exists for this campus.`);
    }

    const ay = await AcademicYear.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId,
      campusId,
      name: input.name.trim(),
      startDate: start,
      endDate: end,
      status: input.status || AcademicYearStatus.DRAFT,
      isCurrent: input.isCurrent || false,
    });

    if (ay.isCurrent || ay.status === AcademicYearStatus.ACTIVE) {
      await this.activateAcademicYear(tenantId, ay._id.toString(), meta);
      return this.getAcademicYearById(tenantId, ay._id.toString());
    }

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: schoolId.toString(),
        userId: meta.userId,
        action: 'ACADEMIC_YEAR_CREATED',
        entity: 'AcademicYear',
        entityId: ay._id.toString(),
        after: ay.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapAcademicYearDto(ay);
  }

  async updateAcademicYear(
    tenantId: string,
    academicYearId: string,
    input: UpdateAcademicYearInput,
    meta?: AuditContextMeta
  ): Promise<AcademicYearDto> {
    const ay = await AcademicYear.findOne({
      _id: academicYearId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!ay) {
      throw new NotFoundError('Academic year not found.');
    }

    if (ay.status === AcademicYearStatus.CLOSED || ay.status === AcademicYearStatus.ARCHIVED) {
      throw new BadRequestError('Closed or archived academic years cannot be modified.');
    }

    const before = ay.toObject();

    if (input.name) ay.name = input.name.trim();
    if (input.startDate) ay.startDate = new Date(input.startDate);
    if (input.endDate) ay.endDate = new Date(input.endDate);

    if (ay.startDate >= ay.endDate) {
      throw new BadRequestError('Start date must precede end date.');
    }

    if (input.status) {
      if (input.status === AcademicYearStatus.ACTIVE && ay.status !== AcademicYearStatus.ACTIVE) {
        return this.activateAcademicYear(tenantId, academicYearId, meta);
      }
      ay.status = input.status;
    }

    await ay.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: ay.schoolId.toString(),
        userId: meta.userId,
        action: 'ACADEMIC_YEAR_UPDATED',
        entity: 'AcademicYear',
        entityId: ay._id.toString(),
        before,
        after: ay.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapAcademicYearDto(ay);
  }

  async activateAcademicYear(
    tenantId: string,
    academicYearId: string,
    meta?: AuditContextMeta
  ): Promise<AcademicYearDto> {
    const ay = await AcademicYear.findOne({
      _id: academicYearId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!ay) {
      throw new NotFoundError('Academic year not found.');
    }

    if (ay.status === AcademicYearStatus.ARCHIVED) {
      throw new BadRequestError('Archived academic years cannot be reactivated.');
    }

    const before = ay.toObject();

    // 1. Close/unset any existing current year for this campus
    await AcademicYear.updateMany(
      {
        tenantId: ay.tenantId,
        campusId: ay.campusId,
        _id: { $ne: ay._id },
        isCurrent: true,
      },
      {
        $set: {
          isCurrent: false,
          status: AcademicYearStatus.CLOSED,
        },
      }
    );

    // 2. Set this academic year to ACTIVE & Current
    ay.status = AcademicYearStatus.ACTIVE;
    ay.isCurrent = true;
    await ay.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: ay.schoolId.toString(),
        userId: meta.userId,
        action: 'ACADEMIC_YEAR_ACTIVATED',
        entity: 'AcademicYear',
        entityId: ay._id.toString(),
        before,
        after: ay.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapAcademicYearDto(ay);
  }

  async closeAcademicYear(
    tenantId: string,
    academicYearId: string,
    meta?: AuditContextMeta
  ): Promise<AcademicYearDto> {
    const ay = await AcademicYear.findOne({
      _id: academicYearId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!ay) {
      throw new NotFoundError('Academic year not found.');
    }

    const before = ay.toObject();
    ay.status = AcademicYearStatus.CLOSED;
    ay.isCurrent = false;
    await ay.save();

    if (meta?.userId) {
      await recordAuditLog({
        tenantId,
        schoolId: ay.schoolId.toString(),
        userId: meta.userId,
        action: 'ACADEMIC_YEAR_CLOSED',
        entity: 'AcademicYear',
        entityId: ay._id.toString(),
        before,
        after: ay.toObject(),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      });
    }

    return this.mapAcademicYearDto(ay);
  }

  // -------------------------------------------------------------------------
  // Private DTO Mappers
  // -------------------------------------------------------------------------

  private mapTenantDto(doc: any): TenantDto {
    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug,
      customDomain: doc.customDomain,
      plan: doc.plan,
      billingStatus: doc.billingStatus,
      status: doc.status,
      onboardingStep: doc.onboardingStep,
      features: doc.features,
      databaseMode: doc.databaseConfig?.mode || 'SHARED',
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
  }

  private mapSchoolDto(doc: any): SchoolDto {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      name: doc.name,
      legalName: doc.legalName,
      code: doc.code,
      affiliationBoard: doc.affiliationBoard,
      registrationNumber: doc.registrationNumber,
      establishedYear: doc.establishedYear,
      contact: doc.contact,
      address: doc.address,
      timezone: doc.timezone || 'Asia/Kolkata',
      currency: doc.currency || 'INR',
      branding: doc.branding,
      settings: doc.settings,
      principalId: doc.principalId?.toString(),
      status: doc.status || 'ACTIVE',
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
  }

  private mapCampusDto(doc: any): CampusDto {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      name: doc.name,
      code: doc.code,
      address: doc.address,
      contact: doc.contact,
      principalId: doc.principalId?.toString(),
      status: doc.status,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
  }

  private mapAcademicYearDto(doc: any): AcademicYearDto {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: doc.campusId.toString(),
      name: doc.name,
      startDate: doc.startDate?.toISOString(),
      endDate: doc.endDate?.toISOString(),
      status: doc.status,
      isCurrent: doc.isCurrent,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString(),
    };
  }
}

export const tenantService = new TenantService();
