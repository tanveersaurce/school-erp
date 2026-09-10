import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import {
  Department,
  Designation,
  Counter,
  Employee,
  TeacherProfile,
  School,
  Campus,
  User,
  UserRole,
  Role,
  Session,
  VerificationToken,
  IDepartmentDoc,
  IDesignationDoc,
  IEmployeeDoc,
  ITeacherProfileDoc,
} from '@edusphere/database';
import {
  EmploymentStatus,
  EmploymentType,
  UserType,
  UserStatus,
  NotFoundError,
  ConflictError,
  BadRequestError,
  ValidationError,
} from '@edusphere/common';
import {
  DepartmentDto,
  DesignationDto,
  EmployeeDto,
  TeacherDto,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateDesignationInput,
  UpdateDesignationInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  EmployeeStatusTransitionInput,
  EmployeeFilterQuery,
  CreateTeacherProfileInput,
  UpdateTeacherProfileInput,
  TeacherFilterQuery,
} from '@edusphere/types';
import { getRedisClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { recordAuditLog } from '../../core/audit/audit.service.js';
import { passwordService } from '../auth/password.service.js';
import { tokenService } from '../auth/token.service.js';
import { emailService } from '../auth/email.service.js';
import { logger } from '../../core/logger/logger.js';

import { AuditContextMeta } from '../tenant/tenant.service.js';

const CACHE_TTL_SECONDS = 300;

export class EmployeeService {
  // =========================================================================
  // Redis Cache Utilities
  // =========================================================================

  private async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        const cached = await redis.get(key);
        if (cached) {
          return JSON.parse(cached) as T;
        }
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Redis cache read failed');
    }
    return null;
  }

  private async setCachedData(key: string, data: any, ttl = CACHE_TTL_SECONDS): Promise<void> {
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        await redis.setex(key, ttl, JSON.stringify(data));
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Redis cache write failed');
    }
  }

  private async invalidateCache(key: string): Promise<void> {
    try {
      const redis = getRedisClient();
      if (redis && redis.status === 'ready') {
        await redis.del(key);
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message, key }, 'Redis cache invalidation failed');
    }
  }

  // =========================================================================
  // Department Management
  // =========================================================================

  async createDepartment(
    input: CreateDepartmentInput,
    tenantId: string,
    schoolId: string,
    meta: AuditContextMeta
  ): Promise<DepartmentDto> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    const existing = await Department.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError(`Department with code '${code}' already exists.`);
    }

    if (input.headOfDepartmentId) {
      const head = await Employee.findOne({
        _id: new Types.ObjectId(input.headOfDepartmentId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!head) {
        throw new NotFoundError('Designated head of department employee not found.');
      }
    }

    const doc = await Department.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      name,
      code,
      description: input.description,
      headOfDepartmentId: input.headOfDepartmentId
        ? new Types.ObjectId(input.headOfDepartmentId)
        : undefined,
      status: input.status || 'ACTIVE',
      isDeleted: false,
    });

    await this.invalidateCache(`dept:${tenantId}`);

    await recordAuditLog({
      tenantId,
      schoolId,
      userId: meta.userId,
      action: 'DEPARTMENT_CREATED',
      entity: 'Department',
      entityId: doc._id.toString(),
      after: doc.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.mapDepartmentDto(doc);
  }

  async getDepartments(tenantId: string, schoolId: string): Promise<DepartmentDto[]> {
    const cacheKey = `dept:${tenantId}`;
    const cached = await this.getCachedData<DepartmentDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const departments = await Department.find({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    }).sort({ name: 1 });

    // Aggregate active employee counts
    const counts = await Employee.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          schoolId: new Types.ObjectId(schoolId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$departmentId',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c._id.toString(), c.count));

    const result = departments.map((d) =>
      this.mapDepartmentDto(d, countMap.get(d._id.toString()) || 0)
    );
    await this.setCachedData(cacheKey, result);
    return result;
  }

  async getDepartmentById(id: string, tenantId: string): Promise<DepartmentDto> {
    const doc = await Department.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Department not found.');
    }

    const employeeCount = await Employee.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      departmentId: doc._id,
      isDeleted: false,
    });

    return this.mapDepartmentDto(doc, employeeCount);
  }

  async updateDepartment(
    id: string,
    input: UpdateDepartmentInput,
    tenantId: string,
    meta: AuditContextMeta
  ): Promise<DepartmentDto> {
    const doc = await Department.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Department not found.');
    }

    if (input.code && input.code.toUpperCase() !== doc.code) {
      const existing = await Department.findOne({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: doc.schoolId,
        code: input.code.toUpperCase(),
        _id: { $ne: doc._id },
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(`Department with code '${input.code}' already exists.`);
      }
      doc.code = input.code.toUpperCase();
    }

    if (input.name) doc.name = input.name.trim();
    if (input.description !== undefined) doc.description = input.description;
    if (input.status) doc.status = input.status;

    if (input.headOfDepartmentId !== undefined) {
      if (input.headOfDepartmentId) {
        const head = await Employee.findOne({
          _id: new Types.ObjectId(input.headOfDepartmentId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (!head) {
          throw new NotFoundError('Designated head of department employee not found.');
        }
        doc.headOfDepartmentId = new Types.ObjectId(input.headOfDepartmentId);
      } else {
        doc.headOfDepartmentId = undefined;
      }
    }

    const before = doc.toJSON();
    await doc.save();
    await this.invalidateCache(`dept:${tenantId}`);

    await recordAuditLog({
      tenantId,
      schoolId: doc.schoolId.toString(),
      userId: meta.userId,
      action: 'DEPARTMENT_UPDATED',
      entity: 'Department',
      entityId: doc._id.toString(),
      before,
      after: doc.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.mapDepartmentDto(doc);
  }

  async deleteDepartment(id: string, tenantId: string, meta: AuditContextMeta): Promise<void> {
    const doc = await Department.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Department not found.');
    }

    // Integrity check: any active employees assigned?
    const employeeCount = await Employee.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      departmentId: doc._id,
      isDeleted: false,
    });

    if (employeeCount > 0) {
      throw new ConflictError(
        `Cannot delete department '${doc.name}'. It is currently assigned to ${employeeCount} employee(s).`
      );
    }

    // Integrity check: any active designations assigned?
    const designationCount = await Designation.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      departmentId: doc._id,
      isDeleted: false,
    });

    if (designationCount > 0) {
      throw new ConflictError(
        `Cannot delete department '${doc.name}'. It is currently assigned to ${designationCount} designation(s).`
      );
    }

    doc.isDeleted = true;
    await doc.save();
    await this.invalidateCache(`dept:${tenantId}`);

    await recordAuditLog({
      tenantId,
      schoolId: doc.schoolId.toString(),
      userId: meta.userId,
      action: 'DEPARTMENT_DELETED',
      entity: 'Department',
      entityId: doc._id.toString(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  }

  // =========================================================================
  // Designation Management
  // =========================================================================

  async createDesignation(
    input: CreateDesignationInput,
    tenantId: string,
    schoolId: string,
    meta: AuditContextMeta
  ): Promise<DesignationDto> {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    const existing = await Designation.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      code,
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError(`Designation with code '${code}' already exists.`);
    }

    if (input.departmentId) {
      const dept = await Department.findOne({
        _id: new Types.ObjectId(input.departmentId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!dept) {
        throw new NotFoundError('Assigned department not found.');
      }
    }

    const doc = await Designation.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      departmentId: input.departmentId ? new Types.ObjectId(input.departmentId) : undefined,
      name,
      code,
      description: input.description,
      level: input.level || 1,
      status: input.status || 'ACTIVE',
      isDeleted: false,
    });

    await this.invalidateCache(`desig:${tenantId}`);

    await recordAuditLog({
      tenantId,
      schoolId,
      userId: meta.userId,
      action: 'DESIGNATION_CREATED',
      entity: 'Designation',
      entityId: doc._id.toString(),
      after: doc.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.mapDesignationDto(doc);
  }

  async getDesignations(
    tenantId: string,
    schoolId: string,
    departmentId?: string
  ): Promise<DesignationDto[]> {
    const cacheKey = departmentId ? `desig:${tenantId}:${departmentId}` : `desig:${tenantId}`;
    const cached = await this.getCachedData<DesignationDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (departmentId) {
      query.departmentId = new Types.ObjectId(departmentId);
    }

    const designations = await Designation.find(query)
      .populate('departmentId', 'name')
      .sort({ level: 1, name: 1 });

    const counts = await Employee.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          schoolId: new Types.ObjectId(schoolId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$designationId',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c._id.toString(), c.count));

    const result = designations.map((d) =>
      this.mapDesignationDto(d, countMap.get(d._id.toString()) || 0)
    );
    await this.setCachedData(cacheKey, result);
    return result;
  }

  async getDesignationById(id: string, tenantId: string): Promise<DesignationDto> {
    const doc = await Designation.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).populate('departmentId', 'name');

    if (!doc) {
      throw new NotFoundError('Designation not found.');
    }

    const employeeCount = await Employee.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      designationId: doc._id,
      isDeleted: false,
    });

    return this.mapDesignationDto(doc, employeeCount);
  }

  async updateDesignation(
    id: string,
    input: UpdateDesignationInput,
    tenantId: string,
    meta: AuditContextMeta
  ): Promise<DesignationDto> {
    const doc = await Designation.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Designation not found.');
    }

    if (input.code && input.code.toUpperCase() !== doc.code) {
      const existing = await Designation.findOne({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: doc.schoolId,
        code: input.code.toUpperCase(),
        _id: { $ne: doc._id },
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(`Designation with code '${input.code}' already exists.`);
      }
      doc.code = input.code.toUpperCase();
    }

    if (input.departmentId !== undefined) {
      if (input.departmentId) {
        const dept = await Department.findOne({
          _id: new Types.ObjectId(input.departmentId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (!dept) {
          throw new NotFoundError('Assigned department not found.');
        }
        doc.departmentId = new Types.ObjectId(input.departmentId);
      } else {
        doc.departmentId = undefined;
      }
    }

    if (input.name) doc.name = input.name.trim();
    if (input.description !== undefined) doc.description = input.description;
    if (input.level !== undefined) doc.level = input.level;
    if (input.status) doc.status = input.status;

    const before = doc.toJSON();
    await doc.save();
    await this.invalidateCache(`desig:${tenantId}`);

    await recordAuditLog({
      tenantId,
      schoolId: doc.schoolId.toString(),
      userId: meta.userId,
      action: 'DESIGNATION_UPDATED',
      entity: 'Designation',
      entityId: doc._id.toString(),
      before,
      after: doc.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    return this.mapDesignationDto(doc);
  }

  async deleteDesignation(id: string, tenantId: string, meta: AuditContextMeta): Promise<void> {
    const doc = await Designation.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Designation not found.');
    }

    const employeeCount = await Employee.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      designationId: doc._id,
      isDeleted: false,
    });

    if (employeeCount > 0) {
      throw new ConflictError(
        `Cannot delete designation '${doc.name}'. It is currently assigned to ${employeeCount} employee(s).`
      );
    }

    doc.isDeleted = true;
    await doc.save();
    await this.invalidateCache(`desig:${tenantId}`);

    await recordAuditLog({
      tenantId,
      schoolId: doc.schoolId.toString(),
      userId: meta.userId,
      action: 'DESIGNATION_DELETED',
      entity: 'Designation',
      entityId: doc._id.toString(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  }

  // =========================================================================
  // Atomic Sequence / Employee ID Generation
  // =========================================================================

  async generateNextEmployeeId(
    tenantId: string,
    schoolId: string,
    customPrefix?: string
  ): Promise<string> {
    let prefix = customPrefix;

    if (!prefix) {
      const school = await School.findById(schoolId);
      prefix = school?.settings?.numbering?.employeeIdPrefix || 'EMP';
    }

    const counter = await Counter.findOneAndUpdate(
      {
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        sequenceType: 'EMPLOYEE_ID',
      },
      { $inc: { currentValue: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const sequenceNumber = String(counter.currentValue).padStart(4, '0');
    return `${prefix}-${sequenceNumber}`;
  }

  // =========================================================================
  // Employee Management
  // =========================================================================

  async createEmployee(
    input: CreateEmployeeInput,
    tenantId: string,
    schoolId: string,
    meta: AuditContextMeta
  ): Promise<{ employee: EmployeeDto; invitationToken?: string }> {
    // 1. Verify Department exists and is active
    const department = await Department.findOne({
      _id: new Types.ObjectId(input.departmentId),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    });
    if (!department) {
      throw new NotFoundError('Selected department does not exist in this school.');
    }

    // 2. Verify Designation exists and is active
    const designation = await Designation.findOne({
      _id: new Types.ObjectId(input.designationId),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    });
    if (!designation) {
      throw new NotFoundError('Selected designation does not exist in this school.');
    }

    // 3. Verify Campus if provided
    let campusObjectId: Types.ObjectId | undefined;
    if (input.campusId) {
      const campus = await Campus.findOne({
        _id: new Types.ObjectId(input.campusId),
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        isDeleted: false,
      });
      if (!campus) {
        throw new NotFoundError('Selected campus does not belong to this school.');
      }
      campusObjectId = campus._id;
    }

    // 4. Verify Work Email uniqueness if provided
    if (input.workEmail) {
      const normalizedEmail = input.workEmail.trim().toLowerCase();
      const existingEmail = await Employee.findOne({
        tenantId: new Types.ObjectId(tenantId),
        workEmail: normalizedEmail,
        isDeleted: false,
      });
      if (existingEmail) {
        throw new ConflictError(`An employee with work email '${normalizedEmail}' already exists.`);
      }
    }

    // 5. Generate collision-safe Employee ID
    let employeeId = input.employeeId?.trim().toUpperCase();
    if (employeeId) {
      const existingId = await Employee.findOne({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        employeeId,
        isDeleted: false,
      });
      if (existingId) {
        throw new ConflictError(`Employee with ID '${employeeId}' already exists.`);
      }
    } else {
      employeeId = await this.generateNextEmployeeId(tenantId, schoolId);
    }

    // 6. Optional User Account Provisioning
    let userObjectId: Types.ObjectId | undefined;
    let invitationToken: string | undefined;

    if (input.provisionUser) {
      if (!input.workEmail) {
        throw new BadRequestError('Work email is required to provision a user account.');
      }

      const email = input.workEmail.trim().toLowerCase();
      const existingUser = await User.findOne({
        tenantId: new Types.ObjectId(tenantId),
        email,
        isDeleted: false,
      });

      if (existingUser) {
        throw new ConflictError(`A user account with email '${email}' already exists.`);
      }

      const userType = input.userType || UserType.STAFF;
      let passwordHash: string;
      let userStatus: UserStatus;

      if (input.initialPassword) {
        const policy = passwordService.validatePasswordPolicy(input.initialPassword);
        if (!policy.isValid) {
          throw new ValidationError('Initial password does not meet security requirements.', [
            { field: 'initialPassword', issue: policy.issues[0] || 'Weak password' },
          ]);
        }
        passwordHash = await passwordService.hashPassword(input.initialPassword);
        userStatus = UserStatus.ACTIVE;
      } else {
        const tempPassword = crypto.randomBytes(16).toString('hex') + '!1Aa';
        passwordHash = await passwordService.hashPassword(tempPassword);
        userStatus = UserStatus.PENDING_VERIFICATION;
      }

      const user = await User.create({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        email,
        phone: input.workPhone || input.personalPhone,
        passwordHash,
        userType,
        status: userStatus,
        isDeleted: false,
      });

      userObjectId = user._id;

      // Assign roles if provided
      if (input.roles && input.roles.length > 0) {
        for (const roleId of input.roles) {
          const role = await Role.findOne({
            _id: new Types.ObjectId(roleId),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
          });
          if (role) {
            await UserRole.create({
              tenantId: new Types.ObjectId(tenantId),
              userId: user._id,
              roleId: role._id,
              schoolId: new Types.ObjectId(schoolId),
              campusId: campusObjectId,
            });
          }
        }
      }

      // If no initial password, generate 48h invitation token and send email
      if (!input.initialPassword) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = tokenService.hashToken(rawToken);

        await VerificationToken.create({
          tenantId: new Types.ObjectId(tenantId),
          userId: user._id,
          tokenHash,
          tokenType: 'STAFF_INVITATION',
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours TTL
          isUsed: false,
        });

        invitationToken = rawToken;
        const school = await School.findById(schoolId);
        const inviteUrl = `${env.FRONTEND_URL}/accept-invitation?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
        await emailService.sendStaffInvitationEmail(user.email, rawToken, inviteUrl, school?.name);
      }
    }

    // 7. Create Employee Document
    const displayName =
      input.displayName?.trim() || `${input.firstName.trim()} ${input.lastName.trim()}`;

    const employeeDoc = await Employee.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: campusObjectId,
      userId: userObjectId,
      employeeId,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim(),
      lastName: input.lastName.trim(),
      displayName,
      gender: input.gender,
      dateOfBirth: new Date(input.dateOfBirth),
      bloodGroup: input.bloodGroup?.trim(),
      nationality: input.nationality?.trim() || 'Indian',
      profilePhotoUrl: input.profilePhotoUrl,
      workEmail: input.workEmail?.trim().toLowerCase(),
      workPhone: input.workPhone?.trim(),
      personalEmail: input.personalEmail?.trim().toLowerCase(),
      personalPhone: input.personalPhone?.trim(),
      currentAddress: input.currentAddress?.trim(),
      permanentAddress: input.permanentAddress?.trim(),
      departmentId: department._id,
      designationId: designation._id,
      reportingManagerId: input.reportingManagerId
        ? new Types.ObjectId(input.reportingManagerId)
        : undefined,
      employmentType: input.employmentType || EmploymentType.FULL_TIME,
      employmentStatus: input.employmentStatus || EmploymentStatus.ACTIVE,
      joiningDate: new Date(input.joiningDate),
      confirmationDate: input.confirmationDate ? new Date(input.confirmationDate) : undefined,
      qualifications: input.qualifications || [],
      previousExperience: input.previousExperience || [],
      emergencyContact: input.emergencyContact,
      documents: input.documents || [],
      isDeleted: false,
    });

    await recordAuditLog({
      tenantId,
      schoolId,
      userId: meta.userId,
      action: 'EMPLOYEE_CREATED',
      entity: 'Employee',
      entityId: employeeDoc._id.toString(),
      after: employeeDoc.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    const populated = await Employee.findById(employeeDoc._id)
      .populate('departmentId', 'name')
      .populate('designationId', 'name')
      .populate('campusId', 'name')
      .populate('userId', 'email status');

    return {
      employee: this.mapEmployeeDto(populated as IEmployeeDoc),
      invitationToken,
    };
  }

  async getEmployeeById(id: string, tenantId: string): Promise<EmployeeDto> {
    const doc = await Employee.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('departmentId', 'name')
      .populate('designationId', 'name')
      .populate('campusId', 'name')
      .populate('reportingManagerId', 'displayName')
      .populate('userId', 'email status');

    if (!doc) {
      throw new NotFoundError('Employee not found.');
    }

    const teacherProfile = await TeacherProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: doc._id,
      isDeleted: false,
    });

    return this.mapEmployeeDto(doc, teacherProfile ? teacherProfile._id.toString() : undefined);
  }

  async updateEmployee(
    id: string,
    input: UpdateEmployeeInput,
    tenantId: string,
    meta: AuditContextMeta
  ): Promise<EmployeeDto> {
    const doc = await Employee.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Employee not found.');
    }

    if (input.departmentId) {
      const dept = await Department.findOne({
        _id: new Types.ObjectId(input.departmentId),
        tenantId: new Types.ObjectId(tenantId),
        schoolId: doc.schoolId,
        isDeleted: false,
      });
      if (!dept) {
        throw new NotFoundError('Selected department not found.');
      }
      doc.departmentId = dept._id;
    }

    if (input.designationId) {
      const desig = await Designation.findOne({
        _id: new Types.ObjectId(input.designationId),
        tenantId: new Types.ObjectId(tenantId),
        schoolId: doc.schoolId,
        isDeleted: false,
      });
      if (!desig) {
        throw new NotFoundError('Selected designation not found.');
      }
      doc.designationId = desig._id;
    }

    if (input.campusId !== undefined) {
      if (input.campusId) {
        const campus = await Campus.findOne({
          _id: new Types.ObjectId(input.campusId),
          tenantId: new Types.ObjectId(tenantId),
          schoolId: doc.schoolId,
          isDeleted: false,
        });
        if (!campus) {
          throw new NotFoundError('Selected campus not found.');
        }
        doc.campusId = campus._id;
      } else {
        doc.campusId = undefined;
      }
    }

    if (input.workEmail && input.workEmail.toLowerCase() !== doc.workEmail?.toLowerCase()) {
      const normalizedEmail = input.workEmail.trim().toLowerCase();
      const existing = await Employee.findOne({
        tenantId: new Types.ObjectId(tenantId),
        workEmail: normalizedEmail,
        _id: { $ne: doc._id },
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(
          `Work email '${normalizedEmail}' is already in use by another employee.`
        );
      }
      doc.workEmail = normalizedEmail;

      // Update linked User email if user account exists
      if (doc.userId) {
        await User.findByIdAndUpdate(doc.userId, { email: normalizedEmail });
      }
    }

    if (input.firstName) doc.firstName = input.firstName.trim();
    if (input.middleName !== undefined) doc.middleName = input.middleName?.trim();
    if (input.lastName) doc.lastName = input.lastName.trim();
    doc.displayName = input.displayName?.trim() || `${doc.firstName} ${doc.lastName}`;

    if (input.gender) doc.gender = input.gender;
    if (input.dateOfBirth) doc.dateOfBirth = new Date(input.dateOfBirth);
    if (input.bloodGroup !== undefined) doc.bloodGroup = input.bloodGroup?.trim();
    if (input.nationality !== undefined) doc.nationality = input.nationality?.trim();
    if (input.profilePhotoUrl !== undefined)
      doc.profilePhotoUrl = input.profilePhotoUrl || undefined;
    if (input.workPhone !== undefined) doc.workPhone = input.workPhone?.trim();
    if (input.personalEmail !== undefined)
      doc.personalEmail = input.personalEmail?.trim().toLowerCase();
    if (input.personalPhone !== undefined) doc.personalPhone = input.personalPhone?.trim();
    if (input.currentAddress !== undefined) doc.currentAddress = input.currentAddress?.trim();
    if (input.permanentAddress !== undefined) doc.permanentAddress = input.permanentAddress?.trim();
    if (input.reportingManagerId !== undefined) {
      doc.reportingManagerId = input.reportingManagerId
        ? new Types.ObjectId(input.reportingManagerId)
        : undefined;
    }
    if (input.employmentType) doc.employmentType = input.employmentType;
    if (input.joiningDate) doc.joiningDate = new Date(input.joiningDate);
    if (input.confirmationDate !== undefined) {
      doc.confirmationDate = input.confirmationDate ? new Date(input.confirmationDate) : undefined;
    }
    if (input.qualifications) doc.qualifications = input.qualifications as any;
    if (input.previousExperience) doc.previousExperience = input.previousExperience as any;
    if (input.emergencyContact) doc.emergencyContact = input.emergencyContact as any;
    if (input.documents) doc.documents = input.documents as any;

    const before = doc.toJSON();
    await doc.save();

    await recordAuditLog({
      tenantId,
      schoolId: doc.schoolId.toString(),
      userId: meta.userId,
      action: 'EMPLOYEE_UPDATED',
      entity: 'Employee',
      entityId: doc._id.toString(),
      before,
      after: doc.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    const populated = await Employee.findById(doc._id)
      .populate('departmentId', 'name')
      .populate('designationId', 'name')
      .populate('campusId', 'name')
      .populate('reportingManagerId', 'displayName')
      .populate('userId', 'email status');

    return this.mapEmployeeDto(populated as IEmployeeDoc);
  }

  async transitionEmployeeStatus(
    id: string,
    input: EmployeeStatusTransitionInput,
    tenantId: string,
    meta: AuditContextMeta
  ): Promise<EmployeeDto> {
    const doc = await Employee.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!doc) {
      throw new NotFoundError('Employee not found.');
    }

    if (doc.employmentStatus === input.status) {
      throw new BadRequestError(`Employee is already in '${input.status}' status.`);
    }

    // Guard terminal states
    if (
      (doc.employmentStatus === EmploymentStatus.TERMINATED ||
        doc.employmentStatus === EmploymentStatus.RETIRED) &&
      (input.status === EmploymentStatus.PROBATION || input.status === EmploymentStatus.ON_LEAVE)
    ) {
      throw new BadRequestError(
        `Cannot transition employee from terminal state '${doc.employmentStatus}' to '${input.status}'.`
      );
    }

    const previousStatus = doc.employmentStatus;
    doc.employmentStatus = input.status;

    if (input.status === EmploymentStatus.TERMINATED) {
      doc.terminationDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date();
      doc.terminationReason = input.reason;
    }

    const before = doc.toJSON();
    await doc.save();

    // Cascading Session & User Account Revocation
    if (
      doc.userId &&
      [
        EmploymentStatus.TERMINATED,
        EmploymentStatus.SUSPENDED,
        EmploymentStatus.RESIGNED,
        EmploymentStatus.INACTIVE,
      ].includes(input.status)
    ) {
      const targetUserStatus =
        input.status === EmploymentStatus.SUSPENDED ? UserStatus.SUSPENDED : UserStatus.DEACTIVATED;

      await User.findByIdAndUpdate(doc.userId, { status: targetUserStatus });

      // Revoke all sessions across all devices
      await Session.updateMany(
        {
          tenantId: new Types.ObjectId(tenantId),
          userId: doc.userId,
          isRevoked: false,
        },
        {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: `EMPLOYEE_STATUS_TRANSITION_${input.status}`,
        }
      );

      // Invalidate Redis Authorization cache
      try {
        const redis = getRedisClient();
        if (redis && redis.status === 'ready') {
          await redis.del(`authz:${tenantId}:${doc.userId.toString()}`);
        }
      } catch (err) {
        logger.warn(
          { err: (err as Error).message, userId: doc.userId.toString() },
          'Failed to clear user authz cache'
        );
      }
    }

    await recordAuditLog({
      tenantId,
      schoolId: doc.schoolId.toString(),
      userId: meta.userId,
      action: 'EMPLOYEE_STATUS_TRANSITION',
      entity: 'Employee',
      entityId: doc._id.toString(),
      before: { status: previousStatus },
      after: { status: input.status, reason: input.reason, effectiveDate: input.effectiveDate },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    const populated = await Employee.findById(doc._id)
      .populate('departmentId', 'name')
      .populate('designationId', 'name')
      .populate('campusId', 'name')
      .populate('userId', 'email status');

    return this.mapEmployeeDto(populated as IEmployeeDoc);
  }

  async listEmployees(
    query: EmployeeFilterQuery,
    tenantId: string,
    schoolId: string,
    campusScope?: string[]
  ): Promise<{ data: EmployeeDto[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const mongoQuery: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    // Campus scoping enforcement
    if (campusScope && campusScope.length > 0) {
      mongoQuery.$or = [
        { campusId: { $in: campusScope.map((id) => new Types.ObjectId(id)) } },
        { campusId: { $exists: false } },
        { campusId: null },
      ];
    }

    if (query.campusId) {
      mongoQuery.campusId = new Types.ObjectId(query.campusId);
    }
    if (query.departmentId) {
      mongoQuery.departmentId = new Types.ObjectId(query.departmentId);
    }
    if (query.designationId) {
      mongoQuery.designationId = new Types.ObjectId(query.designationId);
    }
    if (query.status) {
      mongoQuery.employmentStatus = query.status;
    }
    if (query.employmentType) {
      mongoQuery.employmentType = query.employmentType;
    }
    if (query.joiningDateFrom || query.joiningDateTo) {
      mongoQuery.joiningDate = {};
      if (query.joiningDateFrom) mongoQuery.joiningDate.$gte = new Date(query.joiningDateFrom);
      if (query.joiningDateTo) mongoQuery.joiningDate.$lte = new Date(query.joiningDateTo);
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      mongoQuery.$and = mongoQuery.$and || [];
      mongoQuery.$and.push({
        $or: [
          { displayName: regex },
          { firstName: regex },
          { lastName: regex },
          { employeeId: regex },
          { workEmail: regex },
          { workPhone: regex },
        ],
      });
    }

    const sortOptions: Record<string, 1 | -1> = {};
    const sortDir = query.sortOrder === 'asc' ? 1 : -1;
    if (query.sortBy === 'name') {
      sortOptions.displayName = sortDir;
    } else if (query.sortBy === 'employeeId') {
      sortOptions.employeeId = sortDir;
    } else if (query.sortBy === 'joiningDate') {
      sortOptions.joiningDate = sortDir;
    } else {
      sortOptions.createdAt = sortDir;
    }

    const [employees, total] = await Promise.all([
      Employee.find(mongoQuery)
        .populate('departmentId', 'name')
        .populate('designationId', 'name')
        .populate('campusId', 'name')
        .populate('userId', 'email status')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Employee.countDocuments(mongoQuery),
    ]);

    const employeeIds = employees.map((e) => e._id);
    const teachers = await TeacherProfile.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: { $in: employeeIds },
      isDeleted: false,
    });

    const teacherMap = new Map<string, string>();
    teachers.forEach((t) => teacherMap.set(t.employeeId.toString(), t._id.toString()));

    const data = employees.map((e) =>
      this.mapEmployeeDto(e as IEmployeeDoc, teacherMap.get(e._id.toString()))
    );

    return { data, total, page, limit };
  }

  // =========================================================================
  // Teacher Profile Management
  // =========================================================================

  async createTeacherProfile(
    input: CreateTeacherProfileInput,
    tenantId: string,
    schoolId: string,
    meta: AuditContextMeta
  ): Promise<TeacherDto> {
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(input.employeeId),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    });

    if (!employee) {
      throw new NotFoundError('Employee record not found.');
    }

    const existing = await TeacherProfile.findOne({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: employee._id,
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError('A teacher profile already exists for this employee.');
    }

    const campusId = input.campusId ? new Types.ObjectId(input.campusId) : employee.campusId;

    const teacher = await TeacherProfile.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId,
      employeeId: employee._id,
      userId: employee.userId,
      teacherCode: input.teacherCode?.trim().toUpperCase() || employee.employeeId,
      specialization: input.specialization?.trim(),
      primarySubject: input.primarySubject?.trim(),
      secondarySubjects: input.secondarySubjects || [],
      teachingExperienceYears: input.teachingExperienceYears || 0,
      isAvailableForTimetable:
        input.isAvailableForTimetable !== undefined ? input.isAvailableForTimetable : true,
      maxWeeklyPeriods: input.maxWeeklyPeriods || 30,
      bio: input.bio?.trim(),
      isDeleted: false,
    });

    await recordAuditLog({
      tenantId,
      schoolId,
      userId: meta.userId,
      action: 'TEACHER_PROFILE_CREATED',
      entity: 'TeacherProfile',
      entityId: teacher._id.toString(),
      after: teacher.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    const populated = await TeacherProfile.findById(teacher._id)
      .populate('campusId', 'name')
      .populate({
        path: 'employeeId',
        select:
          'employeeId displayName workEmail workPhone employmentStatus profilePhotoUrl departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'name' },
        ],
      });

    return this.mapTeacherDto(populated as ITeacherProfileDoc);
  }

  async getTeacherProfileByEmployeeId(employeeId: string, tenantId: string): Promise<TeacherDto> {
    const teacher = await TeacherProfile.findOne({
      employeeId: new Types.ObjectId(employeeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name')
      .populate({
        path: 'employeeId',
        select:
          'employeeId displayName workEmail workPhone employmentStatus profilePhotoUrl departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'name' },
        ],
      });

    if (!teacher) {
      throw new NotFoundError('Teacher profile not found for this employee.');
    }

    return this.mapTeacherDto(teacher as ITeacherProfileDoc);
  }

  async updateTeacherProfile(
    employeeId: string,
    input: UpdateTeacherProfileInput,
    tenantId: string,
    meta: AuditContextMeta
  ): Promise<TeacherDto> {
    const teacher = await TeacherProfile.findOne({
      employeeId: new Types.ObjectId(employeeId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!teacher) {
      throw new NotFoundError('Teacher profile not found.');
    }

    if (input.campusId !== undefined) {
      teacher.campusId = input.campusId ? new Types.ObjectId(input.campusId) : undefined;
    }
    if (input.teacherCode) teacher.teacherCode = input.teacherCode.trim().toUpperCase();
    if (input.specialization !== undefined) teacher.specialization = input.specialization?.trim();
    if (input.primarySubject !== undefined) teacher.primarySubject = input.primarySubject?.trim();
    if (input.secondarySubjects) teacher.secondarySubjects = input.secondarySubjects;
    if (input.teachingExperienceYears !== undefined) {
      teacher.teachingExperienceYears = input.teachingExperienceYears;
    }
    if (input.isAvailableForTimetable !== undefined) {
      teacher.isAvailableForTimetable = input.isAvailableForTimetable;
    }
    if (input.maxWeeklyPeriods !== undefined) {
      teacher.maxWeeklyPeriods = input.maxWeeklyPeriods;
    }
    if (input.bio !== undefined) teacher.bio = input.bio?.trim();

    const before = teacher.toJSON();
    await teacher.save();

    await recordAuditLog({
      tenantId,
      schoolId: teacher.schoolId.toString(),
      userId: meta.userId,
      action: 'TEACHER_PROFILE_UPDATED',
      entity: 'TeacherProfile',
      entityId: teacher._id.toString(),
      before,
      after: teacher.toJSON(),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });

    const populated = await TeacherProfile.findById(teacher._id)
      .populate('campusId', 'name')
      .populate({
        path: 'employeeId',
        select:
          'employeeId displayName workEmail workPhone employmentStatus profilePhotoUrl departmentId designationId',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'name' },
        ],
      });

    return this.mapTeacherDto(populated as ITeacherProfileDoc);
  }

  async listTeachers(
    query: TeacherFilterQuery,
    tenantId: string,
    schoolId: string,
    campusScope?: string[]
  ): Promise<{ data: TeacherDto[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const mongoQuery: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    };

    if (campusScope && campusScope.length > 0) {
      mongoQuery.$or = [
        { campusId: { $in: campusScope.map((id) => new Types.ObjectId(id)) } },
        { campusId: { $exists: false } },
        { campusId: null },
      ];
    }

    if (query.campusId) {
      mongoQuery.campusId = new Types.ObjectId(query.campusId);
    }
    if (query.primarySubject) {
      mongoQuery.primarySubject = new RegExp(query.primarySubject, 'i');
    }
    if (query.isAvailableForTimetable !== undefined) {
      mongoQuery.isAvailableForTimetable = query.isAvailableForTimetable;
    }

    const [teachers, total] = await Promise.all([
      TeacherProfile.find(mongoQuery)
        .populate('campusId', 'name')
        .populate({
          path: 'employeeId',
          select:
            'employeeId displayName workEmail workPhone employmentStatus profilePhotoUrl departmentId designationId',
          populate: [
            { path: 'departmentId', select: 'name' },
            { path: 'designationId', select: 'name' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TeacherProfile.countDocuments(mongoQuery),
    ]);

    let data = teachers.map((t) => this.mapTeacherDto(t as ITeacherProfileDoc));

    if (query.search) {
      const q = query.search.toLowerCase();
      data = data.filter(
        (t) =>
          t.employeeDetails?.name.toLowerCase().includes(q) ||
          t.employeeDetails?.employeeId.toLowerCase().includes(q) ||
          t.primarySubject?.toLowerCase().includes(q) ||
          t.specialization?.toLowerCase().includes(q)
      );
    }

    return { data, total, page, limit };
  }

  // =========================================================================
  // DTO Mappers
  // =========================================================================

  private mapDepartmentDto(doc: IDepartmentDoc, employeeCount = 0): DepartmentDto {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      name: doc.name,
      code: doc.code,
      description: doc.description,
      headOfDepartmentId: doc.headOfDepartmentId ? doc.headOfDepartmentId.toString() : undefined,
      status: doc.status,
      employeeCount,
      createdAt: (doc as any).createdAt
        ? (doc as any).createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: (doc as any).updatedAt
        ? (doc as any).updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private mapDesignationDto(doc: any, employeeCount = 0): DesignationDto {
    const dept = doc.departmentId as any;
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      departmentId: dept?._id ? dept._id.toString() : doc.departmentId?.toString(),
      departmentName: dept?.name,
      name: doc.name,
      code: doc.code,
      description: doc.description,
      level: doc.level,
      status: doc.status,
      employeeCount,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private mapEmployeeDto(doc: any, teacherProfileId?: string): EmployeeDto {
    const dept = doc.departmentId as any;
    const desig = doc.designationId as any;
    const campus = doc.campusId as any;
    const user = doc.userId as any;
    const reporting = doc.reportingManagerId as any;

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: campus?._id ? campus._id.toString() : doc.campusId?.toString(),
      campusName: campus?.name,
      userId: user?._id ? user._id.toString() : doc.userId?.toString(),
      userEmail: user?.email,
      userStatus: user?.status,
      employeeId: doc.employeeId,
      firstName: doc.firstName,
      middleName: doc.middleName,
      lastName: doc.lastName,
      displayName: doc.displayName,
      gender: doc.gender,
      dateOfBirth: doc.dateOfBirth ? doc.dateOfBirth.toISOString() : '',
      bloodGroup: doc.bloodGroup,
      nationality: doc.nationality,
      profilePhotoUrl: doc.profilePhotoUrl,
      workEmail: doc.workEmail,
      workPhone: doc.workPhone,
      personalEmail: doc.personalEmail,
      personalPhone: doc.personalPhone,
      currentAddress: doc.currentAddress,
      permanentAddress: doc.permanentAddress,
      departmentId: dept?._id ? dept._id.toString() : doc.departmentId?.toString(),
      departmentName: dept?.name,
      designationId: desig?._id ? desig._id.toString() : doc.designationId?.toString(),
      designationName: desig?.name,
      reportingManagerId: reporting?._id
        ? reporting._id.toString()
        : doc.reportingManagerId?.toString(),
      reportingManagerName: reporting?.displayName,
      employmentType: doc.employmentType,
      employmentStatus: doc.employmentStatus,
      joiningDate: doc.joiningDate ? doc.joiningDate.toISOString() : '',
      confirmationDate: doc.confirmationDate ? doc.confirmationDate.toISOString() : undefined,
      terminationDate: doc.terminationDate ? doc.terminationDate.toISOString() : undefined,
      terminationReason: doc.terminationReason,
      qualifications: doc.qualifications || [],
      previousExperience: doc.previousExperience || [],
      emergencyContact: doc.emergencyContact,
      documents: (doc.documents || []).map((d: any) => ({
        id: d._id ? d._id.toString() : d.id,
        name: d.name,
        documentType: d.documentType,
        fileRecordId: d.fileRecordId?.toString(),
        fileUrl: d.fileUrl,
        uploadedAt: d.uploadedAt,
      })),
      hasTeacherProfile: !!teacherProfileId,
      teacherProfileId,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  private mapTeacherDto(doc: any): TeacherDto {
    const emp = doc.employeeId as any;
    const campus = doc.campusId as any;
    const empDept = emp?.departmentId as any;
    const empDesig = emp?.designationId as any;

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: campus?._id ? campus._id.toString() : doc.campusId?.toString(),
      campusName: campus?.name,
      employeeId: emp?._id ? emp._id.toString() : doc.employeeId?.toString(),
      employeeDetails: emp
        ? {
            employeeId: emp.employeeId,
            name: emp.displayName || `${emp.firstName} ${emp.lastName}`,
            email: emp.workEmail,
            phone: emp.workPhone,
            departmentName: empDept?.name,
            designationName: empDesig?.name,
            employmentStatus: emp.employmentStatus,
            profilePhotoUrl: emp.profilePhotoUrl,
          }
        : undefined,
      userId: doc.userId?.toString(),
      teacherCode: doc.teacherCode,
      specialization: doc.specialization,
      primarySubject: doc.primarySubject,
      secondarySubjects: doc.secondarySubjects || [],
      teachingExperienceYears: doc.teachingExperienceYears || 0,
      isAvailableForTimetable: doc.isAvailableForTimetable,
      maxWeeklyPeriods: doc.maxWeeklyPeriods,
      bio: doc.bio,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}

export const employeeService = new EmployeeService();
