import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import {
  Student,
  Parent,
  StudentParentRelation,
  StudentEnrollment,
  Counter,
  School,
  Campus,
  AcademicYear,
  User,
  UserRole,
  Role,
  Session,
  VerificationToken,
  IStudentDoc,
  IParentDoc,
  IStudentParentRelationDoc,
  IStudentEnrollmentDoc,
} from '@edusphere/database';
import {
  StudentStatus,
  Gender,
  GuardianRelationType,
  StudentDocumentType,
  DocumentVerificationStatus,
  AdmissionType,
  UserType,
  UserStatus,
  NotFoundError,
  ConflictError,
  BadRequestError,
  ValidationError,
  AuthorizationError,
} from '@edusphere/common';
import {
  StudentDto,
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilterQuery,
  StudentStatusTransitionInput,
  GuardianDto,
  CreateGuardianInput,
  UpdateGuardianInput,
  GuardianFilterQuery,
  StudentGuardianRelationDto,
  CreateStudentGuardianRelationInput,
  UpdateStudentGuardianRelationInput,
  EnrollmentDto,
  CreateEnrollmentInput,
  UpdateEnrollmentInput,
  EnrollmentFilterQuery,
  EnrollmentStatus,
  CreateStudentDocumentInput,
  VerifyStudentDocumentInput,
  AuthContext,
} from '@edusphere/types';
import { env } from '../../config/env.js';
import { recordAuditLog } from '../../core/audit/audit.service.js';
import { passwordService } from '../auth/password.service.js';
import { tokenService } from '../auth/token.service.js';
import { emailService } from '../auth/email.service.js';
import { resourcePolicy } from '../rbac/policies/resource.policy.js';
import { logger } from '../../core/logger/logger.js';
import { AuditContextMeta } from '../tenant/tenant.service.js';

export class StudentService {
  private async logAudit(input: {
    tenantId: string;
    schoolId?: string;
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    before?: any;
    after?: any;
    meta?: AuditContextMeta;
  }): Promise<void> {
    const validUserId =
      input.userId && Types.ObjectId.isValid(input.userId)
        ? input.userId
        : input.meta?.userId && Types.ObjectId.isValid(input.meta.userId)
          ? input.meta.userId
          : new Types.ObjectId().toString();

    await recordAuditLog({
      tenantId: input.tenantId,
      schoolId: input.schoolId,
      userId: validUserId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      ipAddress: input.meta?.ipAddress,
      userAgent: input.meta?.userAgent,
      requestId: input.meta?.requestId,
    });
  }
  // =========================================================================
  // 1. Unique Identifier Generation
  // =========================================================================

  /**
   * Generates next collision-free admission number formatted as PREFIX-YYYY-XXXX.
   * Prefix is resolved from School configuration if available (default: ADM).
   */
  async generateNextAdmissionNumber(tenantId: string, schoolId?: string): Promise<string> {
    let prefix = 'ADM';
    let digits = 5;
    const year = new Date().getFullYear();

    let schoolObjectId: Types.ObjectId | undefined;
    if (schoolId && Types.ObjectId.isValid(schoolId)) {
      schoolObjectId = new Types.ObjectId(schoolId);
      const school = await School.findOne({
        _id: schoolObjectId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).lean();

      if (school?.settings?.numbering?.admissionNumberPrefix) {
        prefix = school.settings.numbering.admissionNumberPrefix;
      }
      if (school?.settings?.numbering?.admissionNumberDigits) {
        digits = school.settings.numbering.admissionNumberDigits;
      }
    } else {
      const defaultSchool = await School.findOne({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).lean();
      if (defaultSchool) {
        schoolObjectId = defaultSchool._id as Types.ObjectId;
        if (defaultSchool.settings?.numbering?.admissionNumberPrefix) {
          prefix = defaultSchool.settings.numbering.admissionNumberPrefix;
        }
        if (defaultSchool.settings?.numbering?.admissionNumberDigits) {
          digits = defaultSchool.settings.numbering.admissionNumberDigits;
        }
      }
    }

    const counter = await Counter.findOneAndUpdate(
      {
        tenantId: new Types.ObjectId(tenantId),
        schoolId: schoolObjectId || new Types.ObjectId(tenantId),
        sequenceType: `ADMISSION_NUMBER_${year}`,
      },
      { $inc: { currentValue: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const val = counter?.currentValue ?? 1;
    return `${prefix}-${year}-${String(val).padStart(digits, '0')}`;
  }

  /**
   * Generates next collision-free studentId formatted as STU-YYYY-XXXX.
   */
  async generateNextStudentId(tenantId: string, schoolId?: string): Promise<string> {
    const year = new Date().getFullYear();
    let schoolObjectId: Types.ObjectId | undefined;
    if (schoolId && Types.ObjectId.isValid(schoolId)) {
      schoolObjectId = new Types.ObjectId(schoolId);
    } else {
      const defaultSchool = await School.findOne({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).lean();
      if (defaultSchool) schoolObjectId = defaultSchool._id as Types.ObjectId;
    }

    const counter = await Counter.findOneAndUpdate(
      {
        tenantId: new Types.ObjectId(tenantId),
        schoolId: schoolObjectId || new Types.ObjectId(tenantId),
        sequenceType: `STUDENT_ID_${year}`,
      },
      { $inc: { currentValue: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const val = counter?.currentValue ?? 1;
    return `STU-${year}-${String(val).padStart(4, '0')}`;
  }

  /**
   * Generates next collision-free guardianId formatted as GRD-YYYY-XXXX.
   */
  async generateNextGuardianId(tenantId: string, schoolId?: string): Promise<string> {
    const year = new Date().getFullYear();
    let schoolObjectId: Types.ObjectId | undefined;
    if (schoolId && Types.ObjectId.isValid(schoolId)) {
      schoolObjectId = new Types.ObjectId(schoolId);
    } else {
      const defaultSchool = await School.findOne({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).lean();
      if (defaultSchool) schoolObjectId = defaultSchool._id as Types.ObjectId;
    }

    const counter = await Counter.findOneAndUpdate(
      {
        tenantId: new Types.ObjectId(tenantId),
        schoolId: schoolObjectId || new Types.ObjectId(tenantId),
        sequenceType: `GUARDIAN_ID_${year}`,
      },
      { $inc: { currentValue: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const val = counter?.currentValue ?? 1;
    return `GRD-${year}-${String(val).padStart(4, '0')}`;
  }

  // =========================================================================
  // 2. Student CRUD Operations
  // =========================================================================

  /**
   * Retrieves paginated list of students matching query criteria.
   */
  async getStudents(
    tenantId: string,
    query: StudentFilterQuery,
    campusIdScope?: string
  ): Promise<{ students: StudentDto[]; total: number; page: number; totalPages: number }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (campusIdScope && Types.ObjectId.isValid(campusIdScope)) {
      filter.campusId = new Types.ObjectId(campusIdScope);
    } else if (query.campusId && Types.ObjectId.isValid(query.campusId)) {
      filter.campusId = new Types.ObjectId(query.campusId);
    }

    if (query.academicYearId && Types.ObjectId.isValid(query.academicYearId)) {
      filter.currentAcademicYearId = new Types.ObjectId(query.academicYearId);
    }

    if (query.status) {
      filter.currentStatus = query.status;
    }

    if (query.gender) {
      filter['personalDetails.gender'] = query.gender;
    }

    if (query.admissionType) {
      filter.admissionType = query.admissionType;
    }

    if (query.search && query.search.trim().length > 0) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { admissionNumber: searchRegex },
        { studentId: searchRegex },
        { 'personalDetails.firstName': searchRegex },
        { 'personalDetails.lastName': searchRegex },
        { 'personalDetails.displayName': searchRegex },
        { 'contactDetails.primaryEmail': searchRegex },
        { 'contactDetails.primaryPhone': searchRegex },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [rawStudents, total] = await Promise.all([
      Student.find(filter)
        .select('-documents -statusHistory')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('campusId', 'name code')
        .populate('currentAcademicYearId', 'name code')
        .lean(),
      Student.countDocuments(filter),
    ]);

    const students = rawStudents.map((s) => this.mapStudentToDto(s));
    const totalPages = Math.ceil(total / limit) || 1;

    return { students, total, page, totalPages };
  }

  /**
   * Retrieves detailed student record with guardians and enrollment, verifying authorization.
   */
  async getStudentById(
    tenantId: string,
    studentId: string,
    authContext: AuthContext
  ): Promise<StudentDto> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const isAuthorized = await resourcePolicy.canAccessStudent(authContext, studentId);
    if (!isAuthorized) {
      throw new AuthorizationError(
        'Access denied. You do not have authorization to view this student profile.'
      );
    }

    const student = await Student.findOne({
      _id: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name code')
      .populate('currentAcademicYearId', 'name code')
      .lean();

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }

    // Fetch active guardians
    const relations = await StudentParentRelation.find({
      studentId: student._id,
      tenantId: new Types.ObjectId(tenantId),
      status: 'ACTIVE',
    })
      .populate('parentId')
      .lean();

    const guardians: StudentGuardianRelationDto[] = relations.map((rel: any) => ({
      id: rel._id.toString(),
      tenantId: rel.tenantId.toString(),
      studentId: rel.studentId.toString(),
      guardianId: rel.parentId?._id?.toString() || rel.parentId?.toString(),
      relationshipType: rel.relationshipType,
      isPrimaryContact: rel.isPrimaryContact,
      isEmergencyContact: rel.isEmergencyContact,
      canPickup: rel.canPickup,
      canAccessAcademicInformation: rel.canAccessAcademicInformation,
      canAccessFinancialInformation: rel.canAccessFinancialInformation,
      canReceiveNotifications: rel.canReceiveNotifications,
      custodyRestrictions: rel.custodyRestrictions,
      status: rel.status,
      guardian: rel.parentId
        ? {
            id: rel.parentId._id.toString(),
            guardianId: rel.parentId.guardianId,
            name: `${rel.parentId.personalDetails?.firstName} ${rel.parentId.personalDetails?.lastName}`.trim(),
            email: rel.parentId.contactDetails?.email,
            phone: rel.parentId.contactDetails?.phone,
            occupation: rel.parentId.personalDetails?.occupation,
            relationshipType: rel.relationshipType,
          }
        : undefined,
      createdAt: rel.createdAt,
    }));

    // Fetch active enrollment
    const activeEnrollment = await StudentEnrollment.findOne({
      studentId: student._id,
      tenantId: new Types.ObjectId(tenantId),
      status: 'ENROLLED',
    })
      .populate('academicYearId', 'name code')
      .populate('campusId', 'name code')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .lean();

    const enrollmentDto: EnrollmentDto | undefined = activeEnrollment
      ? this.mapEnrollmentToDto(activeEnrollment)
      : undefined;

    return this.mapStudentToDto(student, guardians, enrollmentDto);
  }

  /**
   * Onboards a new student with optional atomic initial enrollment, primary guardian, and user provisioning.
   */
  async createStudent(
    tenantId: string,
    schoolId: string,
    input: CreateStudentInput,
    meta: AuditContextMeta
  ): Promise<StudentDto> {
    const admissionNumber =
      input.admissionNumber && input.admissionNumber.trim().length > 0
        ? input.admissionNumber.trim().toUpperCase()
        : await this.generateNextAdmissionNumber(tenantId, schoolId);

    const studentId =
      input.studentId && input.studentId.trim().length > 0
        ? input.studentId.trim().toUpperCase()
        : await this.generateNextStudentId(tenantId);

    // Validate unique admission number
    const existingAdmission = await Student.findOne({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      admissionNumber,
      isDeleted: false,
    }).lean();

    if (existingAdmission) {
      throw new ConflictError(
        `Admission number '${admissionNumber}' is already registered in this school.`
      );
    }

    // Validate campus
    let campusObjectId: Types.ObjectId | undefined;
    if (input.campusId) {
      if (!Types.ObjectId.isValid(input.campusId)) {
        throw new BadRequestError('Invalid campus ID format.');
      }
      const campus = await Campus.findOne({
        _id: new Types.ObjectId(input.campusId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).lean();
      if (!campus) {
        throw new NotFoundError(`Campus with ID '${input.campusId}' not found.`);
      }
      campusObjectId = campus._id;
    }

    // Validate academic year
    let academicYearObjectId: Types.ObjectId | undefined;
    const targetAcademicYearId =
      input.currentAcademicYearId || input.initialEnrollment?.academicYearId;
    if (targetAcademicYearId) {
      if (!Types.ObjectId.isValid(targetAcademicYearId)) {
        throw new BadRequestError('Invalid academic year ID format.');
      }
      const year = await AcademicYear.findOne({
        _id: new Types.ObjectId(targetAcademicYearId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).lean();
      if (!year) {
        throw new NotFoundError(`Academic year with ID '${targetAcademicYearId}' not found.`);
      }
      academicYearObjectId = year._id;
    }

    // Optional user provisioning
    let userObjectId: Types.ObjectId | undefined;
    if (input.provisionUser && input.contactDetails.email) {
      const existingUser = await User.findOne({
        tenantId: new Types.ObjectId(tenantId),
        email: input.contactDetails.email.toLowerCase().trim(),
        isDeleted: false,
      }).lean();

      if (existingUser) {
        throw new ConflictError(
          `User with email '${input.contactDetails.email}' already exists in this tenant.`
        );
      }

      if (input.userPassword && input.userPassword.trim().length >= 8) {
        const passwordHash = await passwordService.hashPassword(input.userPassword.trim());
        const createdUser = await User.create({
          tenantId: new Types.ObjectId(tenantId),
          schoolId: new Types.ObjectId(schoolId),
          email: input.contactDetails.email.toLowerCase().trim(),
          phone: input.contactDetails.phone,
          passwordHash,
          userType: UserType.STUDENT,
          status: UserStatus.ACTIVE,
        });
        userObjectId = createdUser._id;
      } else if (input.sendUserInvitation) {
        const tempPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await passwordService.hashPassword(tempPassword);
        const createdUser = await User.create({
          tenantId: new Types.ObjectId(tenantId),
          schoolId: new Types.ObjectId(schoolId),
          email: input.contactDetails.email.toLowerCase().trim(),
          phone: input.contactDetails.phone,
          passwordHash,
          userType: UserType.STUDENT,
          status: UserStatus.PENDING_VERIFICATION,
        });
        userObjectId = createdUser._id;

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await VerificationToken.create({
          tenantId: new Types.ObjectId(tenantId),
          userId: createdUser._id,
          tokenHash,
          tokenType: 'STUDENT_INVITATION',
          expiresAt,
          isUsed: false,
        });

        const activationUrl = `${env.FRONTEND_URL || 'http://localhost:5173'}/auth/accept-invitation?token=${rawToken}`;
        await emailService.sendStudentInvitationEmail(createdUser.email, rawToken, activationUrl);
      }
    }

    const studentDoc = await Student.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: campusObjectId,
      currentAcademicYearId: academicYearObjectId,
      userId: userObjectId,
      admissionNumber,
      studentId,
      admissionDate: input.admissionDate ? new Date(input.admissionDate) : new Date(),
      admissionType: input.admissionType || AdmissionType.REGULAR,
      studentCategory: input.studentCategory,
      personalDetails: {
        firstName: input.personalDetails.firstName.trim(),
        middleName: input.personalDetails.middleName?.trim(),
        lastName: input.personalDetails.lastName.trim(),
        displayName:
          input.personalDetails.displayName ||
          `${input.personalDetails.firstName} ${input.personalDetails.lastName}`.trim(),
        dateOfBirth: new Date(input.personalDetails.dateOfBirth),
        gender: input.personalDetails.gender,
        bloodGroup: input.personalDetails.bloodGroup,
        nationality: input.personalDetails.nationality || 'Indian',
        religion: input.personalDetails.religion,
        category: input.personalDetails.category,
        profilePhoto: input.personalDetails.profilePhoto,
      },
      contactDetails: {
        primaryEmail: input.contactDetails.email?.toLowerCase().trim(),
        primaryPhone: input.contactDetails.phone?.trim(),
        alternatePhone: input.contactDetails.alternatePhone?.trim(),
        emergencyPhone: input.contactDetails.emergencyPhone || input.contactDetails.phone || 'N/A',
        currentAddress: input.contactDetails.currentAddress,
        permanentAddress: input.contactDetails.permanentAddress,
        emergencyContacts: input.contactDetails.emergencyContacts || [],
      },
      previousSchoolDetails: input.previousSchoolDetails,
      medicalInfo: input.medicalInfo || { allergies: [], chronicConditions: [] },
      currentStatus: StudentStatus.ACTIVE,
      statusHistory: [
        {
          previousStatus: StudentStatus.ADMITTED,
          newStatus: StudentStatus.ACTIVE,
          reason: 'Initial enrollment onboarding',
          changedBy: meta.userId ? new Types.ObjectId(meta.userId) : undefined,
          changedAt: new Date(),
        },
      ],
      documents: [],
    });

    // Optional Initial Enrollment
    let createdEnrollmentDto: EnrollmentDto | undefined;
    if (academicYearObjectId && input.initialEnrollment) {
      const enrollmentDoc = await StudentEnrollment.create({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        campusId: campusObjectId,
        studentId: studentDoc._id,
        academicYearId: academicYearObjectId,
        classId: input.initialEnrollment?.classId
          ? new Types.ObjectId(input.initialEnrollment.classId)
          : undefined,
        sectionId: input.initialEnrollment?.sectionId
          ? new Types.ObjectId(input.initialEnrollment.sectionId)
          : undefined,
        rollNumber: input.initialEnrollment?.rollNumber,
        status: 'ENROLLED',
        startDate: input.initialEnrollment?.startDate
          ? new Date(input.initialEnrollment.startDate)
          : new Date(),
      });
      createdEnrollmentDto = this.mapEnrollmentToDto(enrollmentDoc.toObject());
    }

    // Optional Primary Guardian
    const createdGuardians: StudentGuardianRelationDto[] = [];
    if (input.primaryGuardian) {
      let guardianDoc: any;
      if (
        input.primaryGuardian.guardianId &&
        Types.ObjectId.isValid(input.primaryGuardian.guardianId)
      ) {
        guardianDoc = await Parent.findOne({
          _id: new Types.ObjectId(input.primaryGuardian.guardianId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
      } else if (
        input.primaryGuardian.firstName &&
        input.primaryGuardian.lastName &&
        input.primaryGuardian.email &&
        input.primaryGuardian.phone
      ) {
        const guardianIdCode = await this.generateNextGuardianId(tenantId);
        guardianDoc = await Parent.create({
          tenantId: new Types.ObjectId(tenantId),
          guardianId: guardianIdCode,
          personalDetails: {
            firstName: input.primaryGuardian.firstName.trim(),
            lastName: input.primaryGuardian.lastName.trim(),
            displayName:
              `${input.primaryGuardian.firstName} ${input.primaryGuardian.lastName}`.trim(),
          },
          contactDetails: {
            email: input.primaryGuardian.email.toLowerCase().trim(),
            phone: input.primaryGuardian.phone.trim(),
            address: input.contactDetails.currentAddress,
          },
          communicationPreferences: { email: true, sms: true, whatsapp: false },
        });
      }

      if (guardianDoc) {
        const relationDoc = await StudentParentRelation.create({
          tenantId: new Types.ObjectId(tenantId),
          studentId: studentDoc._id,
          parentId: guardianDoc._id,
          relationshipType: input.primaryGuardian.relationshipType,
          isPrimaryContact: input.primaryGuardian.isPrimaryContact ?? true,
          isEmergencyContact: input.primaryGuardian.isEmergencyContact ?? true,
          canPickup: input.primaryGuardian.canPickup ?? false,
          canAccessAcademicInformation: true,
          canAccessFinancialInformation: true,
          canReceiveNotifications: true,
          status: 'ACTIVE',
        });

        createdGuardians.push({
          id: relationDoc._id.toString(),
          tenantId,
          studentId: studentDoc._id.toString(),
          guardianId: guardianDoc._id.toString(),
          relationshipType: relationDoc.relationshipType as unknown as GuardianRelationType,
          isPrimaryContact: relationDoc.isPrimaryContact ?? false,
          isEmergencyContact: relationDoc.isEmergencyContact ?? false,
          canPickup: relationDoc.canPickup ?? false,
          canAccessAcademicInformation: relationDoc.canAccessAcademicInformation ?? false,
          canAccessFinancialInformation: relationDoc.canAccessFinancialInformation ?? false,
          canReceiveNotifications: relationDoc.canReceiveNotifications ?? false,
          status: (relationDoc.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
          guardian: {
            id: guardianDoc._id.toString(),
            guardianId: guardianDoc.guardianId || guardianDoc._id.toString(),
            name: `${guardianDoc.personalDetails?.firstName} ${guardianDoc.personalDetails?.lastName}`.trim(),
            email: guardianDoc.contactDetails?.email,
            phone: guardianDoc.contactDetails?.phone,
            relationshipType: relationDoc.relationshipType as unknown as GuardianRelationType,
          },
          createdAt: relationDoc.createdAt,
        });
      }
    }

    await this.logAudit({
      tenantId,
      schoolId: studentDoc.schoolId?.toString(),
      action: 'STUDENT_CREATED',
      entity: 'Student',
      entityId: studentDoc._id.toString(),
      after: {
        admissionNumber: studentDoc.admissionNumber,
        studentId: studentDoc.studentId,
      },
      meta,
    });

    return this.mapStudentToDto(studentDoc.toObject(), createdGuardians, createdEnrollmentDto);
  }

  /**
   * Updates student personal, contact, academic details.
   */
  async updateStudent(
    tenantId: string,
    studentId: string,
    input: UpdateStudentInput,
    meta: AuditContextMeta
  ): Promise<StudentDto> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const student = await Student.findOne({
      _id: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }

    if (input.campusId) {
      if (!Types.ObjectId.isValid(input.campusId)) {
        throw new BadRequestError('Invalid campus ID format.');
      }
      student.campusId = new Types.ObjectId(input.campusId) as any;
    }

    if (input.currentAcademicYearId) {
      if (!Types.ObjectId.isValid(input.currentAcademicYearId)) {
        throw new BadRequestError('Invalid academic year ID format.');
      }
      student.currentAcademicYearId = new Types.ObjectId(input.currentAcademicYearId) as any;
    }

    if (input.studentCategory !== undefined) {
      student.studentCategory = input.studentCategory;
    }

    if (input.personalDetails) {
      student.personalDetails = {
        ...student.personalDetails,
        ...input.personalDetails,
        firstName: input.personalDetails.firstName || student.personalDetails.firstName,
        lastName: input.personalDetails.lastName || student.personalDetails.lastName,
        dateOfBirth: input.personalDetails.dateOfBirth
          ? new Date(input.personalDetails.dateOfBirth)
          : student.personalDetails.dateOfBirth,
        gender: input.personalDetails.gender || student.personalDetails.gender,
      } as any;
    }

    if (input.contactDetails) {
      student.contactDetails = {
        ...student.contactDetails,
        ...input.contactDetails,
      } as any;
    }

    if (input.previousSchoolDetails) {
      student.previousSchoolDetails = {
        ...student.previousSchoolDetails,
        ...input.previousSchoolDetails,
      };
    }

    if (input.medicalInfo) {
      student.medicalInfo = {
        ...student.medicalInfo,
        ...input.medicalInfo,
      } as any;
    }

    await student.save();

    await this.logAudit({
      tenantId,
      schoolId: student.schoolId?.toString(),
      action: 'STUDENT_UPDATED',
      entity: 'Student',
      entityId: student._id.toString(),
      after: student.toJSON(),
      meta,
    });

    return this.mapStudentToDto(student.toObject());
  }

  /**
   * Soft deletes student record and deactivates associated user account.
   */
  async deleteStudent(tenantId: string, studentId: string, meta: AuditContextMeta): Promise<void> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const student = await Student.findOne({
      _id: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }

    student.isDeleted = true;
    student.currentStatus = StudentStatus.ARCHIVED;
    await student.save();

    // Deactivate user if exists
    if (student.userId) {
      await User.updateOne(
        { _id: student.userId, tenantId: new Types.ObjectId(tenantId) },
        { $set: { status: UserStatus.DEACTIVATED } }
      );
      await Session.updateMany(
        { userId: student.userId, tenantId: new Types.ObjectId(tenantId), isRevoked: false },
        {
          $set: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'Student record deleted',
          },
        }
      );
    }

    await this.logAudit({
      tenantId,
      schoolId: student.schoolId?.toString(),
      action: 'STUDENT_DELETED',
      entity: 'Student',
      entityId: student._id.toString(),
      after: {
        admissionNumber: student.admissionNumber,
      },
      meta,
    });
  }

  // =========================================================================
  // 3. Student Lifecycle State Machine
  // =========================================================================

  /**
   * Transitions student lifecycle state enforcing allowed transition rules.
   */
  async transitionStudentStatus(
    tenantId: string,
    studentId: string,
    newStatus: StudentStatus,
    reason: string | undefined,
    meta: AuditContextMeta
  ): Promise<StudentDto> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const student = await Student.findOne({
      _id: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }

    const currentStatus = student.currentStatus;

    // Terminal states cannot be transitioned
    const terminalStates = [
      StudentStatus.TRANSFERRED,
      StudentStatus.GRADUATED,
      StudentStatus.WITHDRAWN,
      StudentStatus.EXPELLED,
      StudentStatus.ARCHIVED,
    ];

    if (terminalStates.includes(currentStatus)) {
      throw new BadRequestError(
        `Cannot transition student from terminal status '${currentStatus}' to '${newStatus}'.`
      );
    }

    // Valid transition matrix
    const allowedTransitions: Record<string, StudentStatus[]> = {
      [StudentStatus.PROSPECT]: [
        StudentStatus.APPLIED,
        StudentStatus.ADMITTED,
        StudentStatus.WITHDRAWN,
        StudentStatus.ARCHIVED,
      ],
      [StudentStatus.APPLICANT]: [
        StudentStatus.APPLIED,
        StudentStatus.ADMITTED,
        StudentStatus.WITHDRAWN,
        StudentStatus.ARCHIVED,
      ],
      [StudentStatus.APPLIED]: [
        StudentStatus.ADMITTED,
        StudentStatus.WITHDRAWN,
        StudentStatus.ARCHIVED,
      ],
      [StudentStatus.ADMITTED]: [
        StudentStatus.ACTIVE,
        StudentStatus.WITHDRAWN,
        StudentStatus.ARCHIVED,
      ],
      [StudentStatus.ACTIVE]: [
        StudentStatus.ON_LEAVE,
        StudentStatus.SUSPENDED,
        StudentStatus.TRANSFERRED,
        StudentStatus.GRADUATED,
        StudentStatus.WITHDRAWN,
        StudentStatus.EXPELLED,
      ],
      [StudentStatus.ON_LEAVE]: [StudentStatus.ACTIVE, StudentStatus.WITHDRAWN],
      [StudentStatus.SUSPENDED]: [
        StudentStatus.ACTIVE,
        StudentStatus.EXPELLED,
        StudentStatus.WITHDRAWN,
      ],
      [StudentStatus.PROMOTED]: [StudentStatus.ACTIVE, StudentStatus.WITHDRAWN],
    };

    const permitted = allowedTransitions[currentStatus] || [];
    if (!permitted.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${permitted.join(', ')}`
      );
    }

    // Cascading session revocation upon Suspension or Expulsion/Withdrawal
    if (
      student.userId &&
      [StudentStatus.SUSPENDED, StudentStatus.EXPELLED, StudentStatus.WITHDRAWN].includes(newStatus)
    ) {
      const userStatus =
        newStatus === StudentStatus.SUSPENDED ? UserStatus.SUSPENDED : UserStatus.DEACTIVATED;

      await User.updateOne(
        { _id: student.userId, tenantId: new Types.ObjectId(tenantId) },
        { $set: { status: userStatus } }
      );

      await Session.updateMany(
        { userId: student.userId, tenantId: new Types.ObjectId(tenantId), isRevoked: false },
        {
          $set: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: `STUDENT_STATUS_TRANSITION: ${newStatus}`,
          },
        }
      );
    }

    student.currentStatus = newStatus;
    student.statusHistory = student.statusHistory || [];
    student.statusHistory.push({
      previousStatus: currentStatus,
      newStatus,
      reason: reason || `Transitioned to ${newStatus}`,
      changedBy: meta.userId ? new Types.ObjectId(meta.userId) : (undefined as any),
      changedAt: new Date(),
    });

    await student.save();

    await this.logAudit({
      tenantId,
      schoolId: student.schoolId?.toString(),
      action: `STUDENT_STATUS_${newStatus}`,
      entity: 'Student',
      entityId: student._id.toString(),
      after: {
        previousStatus: currentStatus,
        newStatus,
        reason,
      },
      meta,
    });

    return this.mapStudentToDto(student.toObject());
  }

  // =========================================================================
  // 4. Student Documents
  // =========================================================================

  /**
   * Attaches document metadata to student document vault.
   */
  async addDocument(
    tenantId: string,
    studentId: string,
    input: CreateStudentDocumentInput,
    meta: AuditContextMeta
  ): Promise<StudentDto> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const student = await Student.findOne({
      _id: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }

    student.documents = student.documents || [];
    student.documents.push({
      documentType: input.documentType,
      title: input.title.trim(),
      fileUrl: input.fileUrl.trim(),
      uploadedBy: meta.userId ? (new Types.ObjectId(meta.userId) as any) : undefined,
      uploadedAt: new Date(),
      verificationStatus: DocumentVerificationStatus.PENDING_VERIFICATION,
    });

    await student.save();

    await this.logAudit({
      tenantId,
      schoolId: student.schoolId?.toString(),
      action: 'STUDENT_DOCUMENT_UPLOADED',
      entity: 'Student',
      entityId: student._id.toString(),
      after: {
        documentType: input.documentType,
        title: input.title,
      },
      meta,
    });

    return this.mapStudentToDto(student.toObject());
  }

  /**
   * Verifies or rejects student compliance document.
   */
  async verifyDocument(
    tenantId: string,
    studentId: string,
    docId: string,
    input: VerifyStudentDocumentInput,
    meta: AuditContextMeta
  ): Promise<StudentDto> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const student = await Student.findOne({
      _id: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }

    const doc = (student.documents as any)?.id(docId);
    if (!doc) {
      throw new NotFoundError(`Document with ID '${docId}' not found.`);
    }

    doc.verificationStatus = input.verificationStatus;
    doc.verifiedBy = meta.userId ? new Types.ObjectId(meta.userId) : undefined;
    doc.verifiedAt = new Date();
    if (input.rejectionReason) {
      doc.rejectionReason = input.rejectionReason;
    }

    await student.save();

    await this.logAudit({
      tenantId,
      schoolId: student.schoolId?.toString(),
      action: `STUDENT_DOCUMENT_${input.verificationStatus}`,
      entity: 'Student',
      entityId: student._id.toString(),
      after: {
        docId,
        verificationStatus: input.verificationStatus,
        rejectionReason: input.rejectionReason,
      },
      meta,
    });

    return this.mapStudentToDto(student.toObject());
  }

  /**
   * Deletes document from student vault.
   */
  async deleteDocument(
    tenantId: string,
    studentId: string,
    docId: string,
    meta: AuditContextMeta
  ): Promise<StudentDto> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const student = await Student.findOne({
      _id: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }

    const doc = (student.documents as any)?.id(docId);
    if (!doc) {
      throw new NotFoundError(`Document with ID '${docId}' not found.`);
    }

    doc.deleteOne();
    await student.save();

    await this.logAudit({
      tenantId,
      schoolId: student.schoolId?.toString(),
      action: 'STUDENT_DOCUMENT_DELETED',
      entity: 'Student',
      entityId: student._id.toString(),
      after: { docId },
      meta,
    });

    return this.mapStudentToDto(student.toObject());
  }

  // =========================================================================
  // 5. Parent / Guardian Operations
  // =========================================================================

  /**
   * Retrieves paginated list of guardians.
   */
  async getGuardians(
    tenantId: string,
    query: GuardianFilterQuery
  ): Promise<{ guardians: GuardianDto[]; total: number; page: number; totalPages: number }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (query.search && query.search.trim().length > 0) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { guardianId: searchRegex },
        { 'personalDetails.firstName': searchRegex },
        { 'personalDetails.lastName': searchRegex },
        { 'contactDetails.email': searchRegex },
        { 'contactDetails.phone': searchRegex },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [rawGuardians, total] = await Promise.all([
      Parent.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Parent.countDocuments(filter),
    ]);

    const guardians = rawGuardians.map((g) => this.mapGuardianToDto(g));
    const totalPages = Math.ceil(total / limit) || 1;

    return { guardians, total, page, totalPages };
  }

  /**
   * Retrieves guardian by ID along with linked children.
   */
  async getGuardianById(tenantId: string, guardianId: string): Promise<GuardianDto> {
    if (!Types.ObjectId.isValid(guardianId)) {
      throw new BadRequestError('Invalid guardian ID format.');
    }

    const guardian = await Parent.findOne({
      _id: new Types.ObjectId(guardianId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).lean();

    if (!guardian) {
      throw new NotFoundError(`Guardian with ID '${guardianId}' not found.`);
    }

    // Fetch linked children
    const relations = await StudentParentRelation.find({
      parentId: guardian._id,
      tenantId: new Types.ObjectId(tenantId),
      status: 'ACTIVE',
    })
      .populate('studentId')
      .lean();

    const children: StudentGuardianRelationDto[] = relations.map((rel: any) => ({
      id: rel._id.toString(),
      tenantId: rel.tenantId.toString(),
      studentId: rel.studentId?._id?.toString() || rel.studentId?.toString(),
      guardianId: rel.parentId.toString(),
      relationshipType: rel.relationshipType,
      isPrimaryContact: rel.isPrimaryContact,
      isEmergencyContact: rel.isEmergencyContact,
      canPickup: rel.canPickup,
      canAccessAcademicInformation: rel.canAccessAcademicInformation,
      canAccessFinancialInformation: rel.canAccessFinancialInformation,
      canReceiveNotifications: rel.canReceiveNotifications,
      status: rel.status,
      student: rel.studentId
        ? {
            id: rel.studentId._id.toString(),
            studentId: rel.studentId.studentId,
            admissionNumber: rel.studentId.admissionNumber,
            name: `${rel.studentId.personalDetails?.firstName} ${rel.studentId.personalDetails?.lastName}`.trim(),
            status: rel.studentId.currentStatus,
            gender: rel.studentId.personalDetails?.gender,
            profilePhoto: rel.studentId.personalDetails?.profilePhoto,
          }
        : undefined,
      createdAt: rel.createdAt,
    }));

    return this.mapGuardianToDto(guardian, children);
  }

  /**
   * Creates a guardian profile with optional user account provisioning and invitation.
   */
  async createGuardian(
    tenantId: string,
    input: CreateGuardianInput,
    meta: AuditContextMeta
  ): Promise<GuardianDto> {
    if (input.email) {
      const existingParent = await Parent.findOne({
        tenantId: new Types.ObjectId(tenantId),
        'contactDetails.email': input.email.toLowerCase().trim(),
        isDeleted: false,
      }).lean();

      if (existingParent) {
        throw new ConflictError(
          `Guardian with email '${input.email}' already exists in this tenant organization.`
        );
      }
    }

    const guardianId = await this.generateNextGuardianId(tenantId);

    // Optional user account provisioning
    let userObjectId: Types.ObjectId | undefined;
    if (input.provisionUser && input.email) {
      const existingUser = await User.findOne({
        tenantId: new Types.ObjectId(tenantId),
        email: input.email.toLowerCase().trim(),
        isDeleted: false,
      }).lean();

      if (existingUser) {
        throw new ConflictError(`User with email '${input.email}' already exists in this tenant.`);
      }

      if (input.userPassword && input.userPassword.trim().length >= 8) {
        const passwordHash = await passwordService.hashPassword(input.userPassword.trim());
        const createdUser = await User.create({
          tenantId: new Types.ObjectId(tenantId),
          email: input.email.toLowerCase().trim(),
          phone: input.phone,
          passwordHash,
          userType: UserType.PARENT,
          status: UserStatus.ACTIVE,
        });
        userObjectId = createdUser._id;
      } else if (input.sendUserInvitation) {
        const tempPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await passwordService.hashPassword(tempPassword);
        const createdUser = await User.create({
          tenantId: new Types.ObjectId(tenantId),
          email: input.email.toLowerCase().trim(),
          phone: input.phone,
          passwordHash,
          userType: UserType.PARENT,
          status: UserStatus.PENDING_VERIFICATION,
        });
        userObjectId = createdUser._id;

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await VerificationToken.create({
          tenantId: new Types.ObjectId(tenantId),
          userId: createdUser._id,
          tokenHash,
          tokenType: 'GUARDIAN_INVITATION',
          expiresAt,
          isUsed: false,
        });

        const activationUrl = `${env.FRONTEND_URL || 'http://localhost:5173'}/auth/accept-invitation?token=${rawToken}`;
        await emailService.sendGuardianInvitationEmail(createdUser.email, rawToken, activationUrl);
      }
    }

    const guardianDoc = await Parent.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: userObjectId,
      guardianId,
      personalDetails: {
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim(),
        lastName: input.lastName.trim(),
        displayName: input.displayName || `${input.firstName} ${input.lastName}`.trim(),
        occupation: input.occupation,
        annualIncome: input.annualIncome,
        profilePhoto: input.profilePhoto,
      },
      contactDetails: {
        email: input.email.toLowerCase().trim(),
        phone: input.phone.trim(),
        alternatePhone: input.alternatePhone?.trim(),
        address: input.address,
      },
      communicationPreferences: input.communicationPreferences || {
        email: true,
        sms: true,
        whatsapp: false,
      },
    });

    await this.logAudit({
      tenantId,
      action: 'GUARDIAN_CREATED',
      entity: 'Parent',
      entityId: guardianDoc._id.toString(),
      after: {
        guardianId,
        email: input.email,
      },
      meta,
    });

    return this.mapGuardianToDto(guardianDoc.toObject());
  }

  /**
   * Updates guardian personal or contact details.
   */
  async updateGuardian(
    tenantId: string,
    guardianId: string,
    input: UpdateGuardianInput,
    meta: AuditContextMeta
  ): Promise<GuardianDto> {
    if (!Types.ObjectId.isValid(guardianId)) {
      throw new BadRequestError('Invalid guardian ID format.');
    }

    const guardian = await Parent.findOne({
      _id: new Types.ObjectId(guardianId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!guardian) {
      throw new NotFoundError(`Guardian with ID '${guardianId}' not found.`);
    }

    if (
      input.firstName ||
      input.lastName ||
      input.middleName ||
      input.displayName ||
      input.occupation !== undefined ||
      input.annualIncome !== undefined ||
      input.profilePhoto !== undefined
    ) {
      guardian.personalDetails = {
        ...guardian.personalDetails,
        firstName: input.firstName || guardian.personalDetails.firstName,
        lastName: input.lastName || guardian.personalDetails.lastName,
        middleName:
          input.middleName !== undefined
            ? input.middleName
            : (guardian.personalDetails as any).middleName,
        displayName:
          input.displayName !== undefined
            ? input.displayName
            : (guardian.personalDetails as any).displayName,
        occupation:
          input.occupation !== undefined ? input.occupation : guardian.personalDetails.occupation,
        annualIncome:
          input.annualIncome !== undefined
            ? input.annualIncome
            : guardian.personalDetails.annualIncome,
        profilePhoto:
          input.profilePhoto !== undefined
            ? input.profilePhoto
            : (guardian.personalDetails as any).profilePhoto,
      } as any;
    }

    if (input.email || input.phone || input.alternatePhone || input.address) {
      guardian.contactDetails = {
        ...guardian.contactDetails,
        email: input.email ? input.email.toLowerCase().trim() : guardian.contactDetails.email,
        phone: input.phone ? input.phone.trim() : guardian.contactDetails.phone,
        alternatePhone:
          input.alternatePhone !== undefined
            ? input.alternatePhone
            : (guardian.contactDetails as any).alternatePhone,
        address: input.address !== undefined ? input.address : guardian.contactDetails.address,
      } as any;
    }

    if (input.communicationPreferences) {
      guardian.communicationPreferences = {
        ...guardian.communicationPreferences,
        ...input.communicationPreferences,
      } as any;
    }

    await guardian.save();

    await this.logAudit({
      tenantId,
      action: 'GUARDIAN_UPDATED',
      entity: 'Parent',
      entityId: guardian._id.toString(),
      after: guardian.toJSON(),
      meta,
    });

    return this.mapGuardianToDto(guardian.toObject());
  }

  /**
   * Soft deletes a guardian record.
   */
  async deleteGuardian(
    tenantId: string,
    guardianId: string,
    meta: AuditContextMeta
  ): Promise<void> {
    if (!Types.ObjectId.isValid(guardianId)) {
      throw new BadRequestError('Invalid guardian ID format.');
    }

    const guardian = await Parent.findOne({
      _id: new Types.ObjectId(guardianId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!guardian) {
      throw new NotFoundError(`Guardian with ID '${guardianId}' not found.`);
    }

    guardian.isDeleted = true;
    await guardian.save();

    // Deactivate user if exists
    if (guardian.userId) {
      await User.updateOne(
        { _id: guardian.userId, tenantId: new Types.ObjectId(tenantId) },
        { $set: { status: UserStatus.DEACTIVATED } }
      );
      await Session.updateMany(
        { userId: guardian.userId, tenantId: new Types.ObjectId(tenantId), isRevoked: false },
        {
          $set: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'Guardian record deleted',
          },
        }
      );
    }

    await this.logAudit({
      tenantId,
      action: 'GUARDIAN_DELETED',
      entity: 'Parent',
      entityId: guardian._id.toString(),
      meta,
    });
  }

  /**
   * Dispatches or resets 48-hour portal invitation email for guardian.
   */
  async inviteGuardian(
    tenantId: string,
    guardianId: string,
    meta: AuditContextMeta
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(guardianId)) {
      throw new BadRequestError('Invalid guardian ID format.');
    }

    const guardian = await Parent.findOne({
      _id: new Types.ObjectId(guardianId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!guardian) {
      throw new NotFoundError(`Guardian with ID '${guardianId}' not found.`);
    }

    let user: any;
    if (guardian.userId) {
      user = await User.findOne({
        _id: guardian.userId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
    } else {
      const existingUser = await User.findOne({
        tenantId: new Types.ObjectId(tenantId),
        email: guardian.contactDetails.email.toLowerCase().trim(),
        isDeleted: false,
      });

      if (existingUser) {
        user = existingUser;
        guardian.userId = user._id;
        await guardian.save();
      } else {
        const tempPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await passwordService.hashPassword(tempPassword);
        user = await User.create({
          tenantId: new Types.ObjectId(tenantId),
          email: guardian.contactDetails.email.toLowerCase().trim(),
          phone: guardian.contactDetails.phone,
          passwordHash,
          userType: UserType.PARENT,
          status: UserStatus.PENDING_VERIFICATION,
        });
        guardian.userId = user._id;
        await guardian.save();
      }
    }

    // Invalidate existing tokens
    await VerificationToken.updateMany(
      {
        userId: user._id,
        tenantId: new Types.ObjectId(tenantId),
        tokenType: 'GUARDIAN_INVITATION',
        isUsed: false,
      },
      { $set: { isUsed: true } }
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await VerificationToken.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: user._id,
      tokenHash,
      tokenType: 'GUARDIAN_INVITATION',
      expiresAt,
      isUsed: false,
    });

    const activationUrl = `${env.FRONTEND_URL || 'http://localhost:5173'}/auth/accept-invitation?token=${rawToken}`;
    await emailService.sendGuardianInvitationEmail(
      guardian.contactDetails.email,
      rawToken,
      activationUrl
    );

    await this.logAudit({
      tenantId,
      action: 'GUARDIAN_INVITATION_DISPATCHED',
      entity: 'Parent',
      entityId: guardian._id.toString(),
      after: { email: guardian.contactDetails.email },
      meta,
    });

    return { message: `Invitation successfully dispatched to ${guardian.contactDetails.email}` };
  }

  // =========================================================================
  // 6. Student-Guardian Relationships
  // =========================================================================

  /**
   * Retrieves all guardians linked to a student.
   */
  async getStudentGuardians(
    tenantId: string,
    studentId: string
  ): Promise<StudentGuardianRelationDto[]> {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestError('Invalid student ID format.');
    }

    const relations = await StudentParentRelation.find({
      studentId: new Types.ObjectId(studentId),
      tenantId: new Types.ObjectId(tenantId),
    })
      .populate('parentId')
      .lean();

    return relations.map((rel: any) => ({
      id: rel._id.toString(),
      tenantId: rel.tenantId.toString(),
      studentId: rel.studentId.toString(),
      guardianId: rel.parentId?._id?.toString() || rel.parentId?.toString(),
      relationshipType: rel.relationshipType,
      isPrimaryContact: rel.isPrimaryContact,
      isEmergencyContact: rel.isEmergencyContact,
      canPickup: rel.canPickup,
      canAccessAcademicInformation: rel.canAccessAcademicInformation,
      canAccessFinancialInformation: rel.canAccessFinancialInformation,
      canReceiveNotifications: rel.canReceiveNotifications,
      custodyRestrictions: rel.custodyRestrictions,
      status: rel.status,
      guardian: rel.parentId
        ? {
            id: rel.parentId._id.toString(),
            guardianId: rel.parentId.guardianId,
            name: `${rel.parentId.personalDetails?.firstName} ${rel.parentId.personalDetails?.lastName}`.trim(),
            email: rel.parentId.contactDetails?.email,
            phone: rel.parentId.contactDetails?.phone,
            occupation: rel.parentId.personalDetails?.occupation,
            relationshipType: rel.relationshipType,
          }
        : undefined,
      createdAt: rel.createdAt,
    }));
  }

  /**
   * Links a guardian to a student.
   */
  async linkStudentGuardian(
    tenantId: string,
    studentId: string,
    input: CreateStudentGuardianRelationInput,
    meta: AuditContextMeta
  ): Promise<StudentGuardianRelationDto> {
    if (!Types.ObjectId.isValid(studentId) || !Types.ObjectId.isValid(input.guardianId)) {
      throw new BadRequestError('Invalid student or guardian ID format.');
    }

    const [student, guardian] = await Promise.all([
      Student.findOne({
        _id: new Types.ObjectId(studentId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
      Parent.findOne({
        _id: new Types.ObjectId(input.guardianId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
    ]);

    if (!student) {
      throw new NotFoundError(`Student with ID '${studentId}' not found.`);
    }
    if (!guardian) {
      throw new NotFoundError(`Guardian with ID '${input.guardianId}' not found.`);
    }

    // Check duplicate
    const existing = await StudentParentRelation.findOne({
      tenantId: new Types.ObjectId(tenantId),
      studentId: student._id,
      parentId: guardian._id,
    });

    if (existing) {
      throw new ConflictError('This guardian is already linked to the student.');
    }

    const relation = await StudentParentRelation.create({
      tenantId: new Types.ObjectId(tenantId),
      studentId: student._id,
      parentId: guardian._id,
      relationshipType: input.relationshipType,
      isPrimaryContact: input.isPrimaryContact ?? false,
      isEmergencyContact: input.isEmergencyContact ?? false,
      canPickup: input.canPickup ?? false,
      canAccessAcademicInformation: input.canAccessAcademicInformation ?? true,
      canAccessFinancialInformation: input.canAccessFinancialInformation ?? true,
      canReceiveNotifications: input.canReceiveNotifications ?? true,
      custodyRestrictions: input.custodyRestrictions,
      status: 'ACTIVE',
    });

    await this.logAudit({
      tenantId,
      action: 'STUDENT_GUARDIAN_LINKED',
      entity: 'StudentParentRelation',
      entityId: relation._id.toString(),
      after: {
        studentId,
        guardianId: input.guardianId,
        relationshipType: input.relationshipType,
      },
      meta,
    });

    return {
      id: relation._id.toString(),
      tenantId,
      studentId,
      guardianId: guardian._id.toString(),
      relationshipType: relation.relationshipType as unknown as GuardianRelationType,
      isPrimaryContact: relation.isPrimaryContact ?? false,
      isEmergencyContact: relation.isEmergencyContact ?? false,
      canPickup: relation.canPickup ?? false,
      canAccessAcademicInformation: relation.canAccessAcademicInformation ?? false,
      canAccessFinancialInformation: relation.canAccessFinancialInformation ?? false,
      canReceiveNotifications: relation.canReceiveNotifications ?? false,
      status: (relation.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      guardian: {
        id: guardian._id.toString(),
        guardianId: guardian.guardianId || guardian._id.toString(),
        name: `${guardian.personalDetails?.firstName} ${guardian.personalDetails?.lastName}`.trim(),
        email: guardian.contactDetails?.email,
        phone: guardian.contactDetails?.phone,
        relationshipType: relation.relationshipType as unknown as GuardianRelationType,
      },
      createdAt: relation.createdAt,
    };
  }

  /**
   * Updates student-guardian relationship flags.
   */
  async updateRelationship(
    tenantId: string,
    relationshipId: string,
    input: UpdateStudentGuardianRelationInput,
    meta: AuditContextMeta
  ): Promise<StudentGuardianRelationDto> {
    if (!Types.ObjectId.isValid(relationshipId)) {
      throw new BadRequestError('Invalid relationship ID format.');
    }

    const relation = await StudentParentRelation.findOne({
      _id: new Types.ObjectId(relationshipId),
      tenantId: new Types.ObjectId(tenantId),
    }).populate('parentId');

    if (!relation) {
      throw new NotFoundError(`Relationship with ID '${relationshipId}' not found.`);
    }

    if (input.relationshipType) relation.relationshipType = input.relationshipType as any;
    if (input.isPrimaryContact !== undefined) relation.isPrimaryContact = input.isPrimaryContact;
    if (input.isEmergencyContact !== undefined)
      relation.isEmergencyContact = input.isEmergencyContact;
    if (input.canPickup !== undefined) relation.canPickup = input.canPickup;
    if (input.canAccessAcademicInformation !== undefined)
      relation.canAccessAcademicInformation = input.canAccessAcademicInformation;
    if (input.canAccessFinancialInformation !== undefined)
      relation.canAccessFinancialInformation = input.canAccessFinancialInformation;
    if (input.canReceiveNotifications !== undefined)
      relation.canReceiveNotifications = input.canReceiveNotifications;
    if (input.custodyRestrictions !== undefined)
      relation.custodyRestrictions = input.custodyRestrictions;
    if (input.status !== undefined) relation.status = input.status;

    await relation.save();

    await this.logAudit({
      tenantId,
      action: 'STUDENT_GUARDIAN_RELATIONSHIP_UPDATED',
      entity: 'StudentParentRelation',
      entityId: relation._id.toString(),
      after: relation.toJSON(),
      meta,
    });

    const parent = relation.parentId as any;
    return {
      id: relation._id.toString(),
      tenantId,
      studentId: relation.studentId.toString(),
      guardianId: parent?._id?.toString() || relation.parentId.toString(),
      relationshipType: relation.relationshipType as unknown as GuardianRelationType,
      isPrimaryContact: relation.isPrimaryContact ?? false,
      isEmergencyContact: relation.isEmergencyContact ?? false,
      canPickup: relation.canPickup ?? false,
      canAccessAcademicInformation: relation.canAccessAcademicInformation ?? false,
      canAccessFinancialInformation: relation.canAccessFinancialInformation ?? false,
      canReceiveNotifications: relation.canReceiveNotifications ?? false,
      status: (relation.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      guardian: parent
        ? {
            id: parent._id.toString(),
            guardianId: parent.guardianId || parent._id.toString(),
            name: `${parent.personalDetails?.firstName} ${parent.personalDetails?.lastName}`.trim(),
            email: parent.contactDetails?.email,
            phone: parent.contactDetails?.phone,
            relationshipType: relation.relationshipType as unknown as GuardianRelationType,
          }
        : undefined,
      createdAt: relation.createdAt,
    };
  }

  /**
   * Unlinks a student-guardian relationship.
   */
  async unlinkStudentGuardian(
    tenantId: string,
    relationshipId: string,
    meta: AuditContextMeta
  ): Promise<void> {
    if (!Types.ObjectId.isValid(relationshipId)) {
      throw new BadRequestError('Invalid relationship ID format.');
    }

    const relation = await StudentParentRelation.findOne({
      _id: new Types.ObjectId(relationshipId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!relation) {
      throw new NotFoundError(`Relationship with ID '${relationshipId}' not found.`);
    }

    await relation.deleteOne();

    await this.logAudit({
      tenantId,
      action: 'STUDENT_GUARDIAN_UNLINKED',
      entity: 'StudentParentRelation',
      entityId: relationshipId,
      after: {
        studentId: relation.studentId.toString(),
        guardianId: relation.parentId.toString(),
      },
      meta,
    });
  }

  // =========================================================================
  // 7. Enrollment Operations
  // =========================================================================

  /**
   * Lists enrollments with filters and pagination.
   */
  async getEnrollments(
    tenantId: string,
    query: EnrollmentFilterQuery
  ): Promise<{ enrollments: EnrollmentDto[]; total: number; page: number; totalPages: number }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 && query.limit <= 100 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (query.studentId && Types.ObjectId.isValid(query.studentId)) {
      filter.studentId = new Types.ObjectId(query.studentId);
    }
    if (query.academicYearId && Types.ObjectId.isValid(query.academicYearId)) {
      filter.academicYearId = new Types.ObjectId(query.academicYearId);
    }
    if (query.campusId && Types.ObjectId.isValid(query.campusId)) {
      filter.campusId = new Types.ObjectId(query.campusId);
    }
    if (query.status) {
      filter.status = query.status;
    }

    const [rawEnrollments, total] = await Promise.all([
      StudentEnrollment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'admissionNumber studentId personalDetails')
        .populate('academicYearId', 'name code')
        .populate('campusId', 'name code')
        .populate('classId', 'name code')
        .populate('sectionId', 'name')
        .lean(),
      StudentEnrollment.countDocuments(filter),
    ]);

    const enrollments = rawEnrollments.map((e) => this.mapEnrollmentToDto(e));
    const totalPages = Math.ceil(total / limit) || 1;

    return { enrollments, total, page, totalPages };
  }

  /**
   * Retrieves single enrollment by ID.
   */
  async getEnrollmentById(tenantId: string, enrollmentId: string): Promise<EnrollmentDto> {
    if (!Types.ObjectId.isValid(enrollmentId)) {
      throw new BadRequestError('Invalid enrollment ID format.');
    }

    const enrollment = await StudentEnrollment.findOne({
      _id: new Types.ObjectId(enrollmentId),
      tenantId: new Types.ObjectId(tenantId),
    })
      .populate('studentId', 'admissionNumber studentId personalDetails')
      .populate('academicYearId', 'name code')
      .populate('campusId', 'name code')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .lean();

    if (!enrollment) {
      throw new NotFoundError(`Enrollment with ID '${enrollmentId}' not found.`);
    }

    return this.mapEnrollmentToDto(enrollment);
  }

  /**
   * Creates a student enrollment for an academic session.
   */
  async createEnrollment(
    tenantId: string,
    schoolId: string,
    input: CreateEnrollmentInput,
    meta: AuditContextMeta
  ): Promise<EnrollmentDto> {
    if (!Types.ObjectId.isValid(input.studentId) || !Types.ObjectId.isValid(input.academicYearId)) {
      throw new BadRequestError('Invalid student or academic year ID format.');
    }

    const [student, year] = await Promise.all([
      Student.findOne({
        _id: new Types.ObjectId(input.studentId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
      AcademicYear.findOne({
        _id: new Types.ObjectId(input.academicYearId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }),
    ]);

    if (!student) throw new NotFoundError(`Student with ID '${input.studentId}' not found.`);
    if (!year)
      throw new NotFoundError(`Academic year with ID '${input.academicYearId}' not found.`);

    // Check duplicate active enrollment in same academic year
    const existing = await StudentEnrollment.findOne({
      tenantId: new Types.ObjectId(tenantId),
      academicYearId: year._id,
      studentId: student._id,
    });

    if (existing) {
      throw new ConflictError('Student already has an enrollment record for this academic year.');
    }

    const enrollment = await StudentEnrollment.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : student.campusId,
      studentId: student._id,
      academicYearId: year._id,
      classId: input.classId ? new Types.ObjectId(input.classId) : undefined,
      sectionId: input.sectionId ? new Types.ObjectId(input.sectionId) : undefined,
      rollNumber: input.rollNumber,
      status: input.status || 'ENROLLED',
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
    });

    // Update student's current academic year
    student.currentAcademicYearId = year._id;
    if (input.campusId) student.campusId = new Types.ObjectId(input.campusId) as any;
    await student.save();

    await this.logAudit({
      tenantId,
      schoolId: enrollment.schoolId?.toString(),
      action: 'STUDENT_ENROLLED',
      entity: 'StudentEnrollment',
      entityId: enrollment._id.toString(),
      after: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      },
      meta,
    });

    return this.mapEnrollmentToDto(enrollment.toObject());
  }

  /**
   * Updates an existing enrollment record.
   */
  async updateEnrollment(
    tenantId: string,
    enrollmentId: string,
    input: UpdateEnrollmentInput,
    meta: AuditContextMeta
  ): Promise<EnrollmentDto> {
    if (!Types.ObjectId.isValid(enrollmentId)) {
      throw new BadRequestError('Invalid enrollment ID format.');
    }

    const enrollment = await StudentEnrollment.findOne({
      _id: new Types.ObjectId(enrollmentId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!enrollment) {
      throw new NotFoundError(`Enrollment with ID '${enrollmentId}' not found.`);
    }

    if (input.campusId) enrollment.campusId = new Types.ObjectId(input.campusId) as any;
    if (input.classId) enrollment.classId = new Types.ObjectId(input.classId) as any;
    if (input.sectionId) enrollment.sectionId = new Types.ObjectId(input.sectionId) as any;
    if (input.rollNumber !== undefined) enrollment.rollNumber = input.rollNumber;
    if (input.status) enrollment.status = input.status as any;
    if (input.endDate) enrollment.endDate = new Date(input.endDate);

    await enrollment.save();

    await this.logAudit({
      tenantId,
      schoolId: enrollment.schoolId?.toString(),
      action: 'STUDENT_ENROLLMENT_UPDATED',
      entity: 'StudentEnrollment',
      entityId: enrollment._id.toString(),
      after: enrollment.toJSON(),
      meta,
    });

    return this.mapEnrollmentToDto(enrollment.toObject());
  }

  // =========================================================================
  // 8. Parent Perspective (Anti-IDOR Zero-Trust Endpoint)
  // =========================================================================

  /**
   * Retrieves all children authorized for the currently authenticated parent user.
   * Derives guardian exclusively from the auth context; client parentId is never trusted.
   */
  async getAuthorizedChildren(authContext: AuthContext): Promise<StudentDto[]> {
    if (authContext.userType !== UserType.PARENT && !authContext.roles?.includes('PARENT')) {
      throw new AuthorizationError('Only authenticated parents may access this endpoint.');
    }

    const parent = await Parent.findOne({
      userId: new Types.ObjectId(authContext.userId),
      tenantId: new Types.ObjectId(authContext.tenantId),
      isDeleted: false,
    }).lean();

    if (!parent) {
      return [];
    }

    const relations = await StudentParentRelation.find({
      parentId: parent._id,
      tenantId: new Types.ObjectId(authContext.tenantId),
      status: 'ACTIVE',
      canAccessAcademicInformation: true,
    }).lean();

    if (relations.length === 0) {
      return [];
    }

    const studentIds = relations.map((r) => r.studentId);
    const rawStudents = await Student.find({
      _id: { $in: studentIds },
      tenantId: new Types.ObjectId(authContext.tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name code')
      .populate('currentAcademicYearId', 'name code')
      .lean();

    return rawStudents.map((s) => this.mapStudentToDto(s));
  }

  /**
   * Retrieves single child for parent, verifying relationship access.
   */
  async getAuthorizedChildById(authContext: AuthContext, studentId: string): Promise<StudentDto> {
    return this.getStudentById(authContext.tenantId, studentId, authContext);
  }

  // =========================================================================
  // Helpers & DTO Mappers
  // =========================================================================

  private mapStudentToDto(
    student: any,
    guardians?: StudentGuardianRelationDto[],
    currentEnrollment?: EnrollmentDto
  ): StudentDto {
    return {
      id: student._id.toString(),
      tenantId: student.tenantId?.toString(),
      schoolId: student.schoolId?.toString(),
      campusId: student.campusId?._id?.toString() || student.campusId?.toString(),
      campusName: student.campusId?.name,
      userId: student.userId?.toString(),
      studentId: student.studentId,
      admissionNumber: student.admissionNumber,
      personalDetails: {
        firstName: student.personalDetails?.firstName,
        middleName: student.personalDetails?.middleName,
        lastName: student.personalDetails?.lastName,
        displayName:
          student.personalDetails?.displayName ||
          `${student.personalDetails?.firstName} ${student.personalDetails?.lastName}`.trim(),
        dateOfBirth: student.personalDetails?.dateOfBirth,
        gender: student.personalDetails?.gender,
        bloodGroup: student.personalDetails?.bloodGroup,
        nationality: student.personalDetails?.nationality,
        religion: student.personalDetails?.religion,
        category: student.personalDetails?.category,
        profilePhoto: student.personalDetails?.profilePhoto,
      },
      contactDetails: {
        email: student.contactDetails?.primaryEmail,
        phone: student.contactDetails?.primaryPhone,
        alternatePhone: student.contactDetails?.alternatePhone,
        emergencyPhone: student.contactDetails?.emergencyPhone,
        currentAddress: student.contactDetails?.currentAddress,
        permanentAddress: student.contactDetails?.permanentAddress,
        emergencyContacts: student.contactDetails?.emergencyContacts || [],
      },
      academicDetails: {
        campusId: student.campusId?._id?.toString() || student.campusId?.toString(),
        currentAcademicYearId:
          student.currentAcademicYearId?._id?.toString() ||
          student.currentAcademicYearId?.toString(),
        admissionDate: student.admissionDate,
        admissionType: student.admissionType,
        previousSchoolDetails: student.previousSchoolDetails,
      },
      medicalInfo: student.medicalInfo,
      documents: (student.documents || []).map((d: any) => ({
        id: d._id?.toString(),
        documentType: d.documentType,
        title: d.title,
        fileUrl: d.fileUrl,
        uploadedBy: d.uploadedBy?.toString(),
        uploadedAt: d.uploadedAt,
        verificationStatus: d.verificationStatus,
        verifiedBy: d.verifiedBy?.toString(),
        verifiedAt: d.verifiedAt,
        rejectionReason: d.rejectionReason,
      })),
      currentStatus: student.currentStatus,
      statusHistory: (student.statusHistory || []).map((h: any) => ({
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        reason: h.reason,
        changedBy: h.changedBy?.toString(),
        changedAt: h.changedAt,
      })),
      guardians,
      currentEnrollment,
      isDeleted: student.isDeleted,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  private mapGuardianToDto(guardian: any, children?: StudentGuardianRelationDto[]): GuardianDto {
    return {
      id: guardian._id.toString(),
      tenantId: guardian.tenantId?.toString(),
      guardianId: guardian.guardianId,
      userId: guardian.userId?.toString(),
      personalDetails: {
        firstName: guardian.personalDetails?.firstName,
        middleName: guardian.personalDetails?.middleName,
        lastName: guardian.personalDetails?.lastName,
        displayName:
          guardian.personalDetails?.displayName ||
          `${guardian.personalDetails?.firstName} ${guardian.personalDetails?.lastName}`.trim(),
        occupation: guardian.personalDetails?.occupation,
        annualIncome: guardian.personalDetails?.annualIncome,
        profilePhoto: guardian.personalDetails?.profilePhoto,
      },
      contactDetails: {
        email: guardian.contactDetails?.email,
        phone: guardian.contactDetails?.phone,
        alternatePhone: guardian.contactDetails?.alternatePhone,
        address: guardian.contactDetails?.address,
      },
      communicationPreferences: guardian.communicationPreferences,
      children,
      hasAccount: !!guardian.userId,
      isDeleted: guardian.isDeleted,
      createdAt: guardian.createdAt,
      updatedAt: guardian.updatedAt,
    };
  }

  private mapEnrollmentToDto(enrollment: any): EnrollmentDto {
    return {
      id: enrollment._id.toString(),
      tenantId: enrollment.tenantId?.toString(),
      schoolId: enrollment.schoolId?.toString(),
      campusId: enrollment.campusId?._id?.toString() || enrollment.campusId?.toString(),
      campusName: enrollment.campusId?.name,
      studentId: enrollment.studentId?._id?.toString() || enrollment.studentId?.toString(),
      studentName: enrollment.studentId?.personalDetails
        ? `${enrollment.studentId.personalDetails.firstName} ${enrollment.studentId.personalDetails.lastName}`.trim()
        : undefined,
      admissionNumber: enrollment.studentId?.admissionNumber,
      academicYearId:
        enrollment.academicYearId?._id?.toString() || enrollment.academicYearId?.toString(),
      academicYearName: enrollment.academicYearId?.name,
      classId: enrollment.classId?._id?.toString() || enrollment.classId?.toString(),
      className: enrollment.classId?.name,
      sectionId: enrollment.sectionId?._id?.toString() || enrollment.sectionId?.toString(),
      sectionName: enrollment.sectionId?.name,
      rollNumber: enrollment.rollNumber,
      status: enrollment.status,
      startDate: enrollment.startDate,
      endDate: enrollment.endDate,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
    };
  }
}

export const studentService = new StudentService();
