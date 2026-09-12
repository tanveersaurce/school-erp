import mongoose, { Types } from 'mongoose';
import {
  Class,
  Section,
  AcademicClass,
  Subject,
  ClassSubject,
  TeacherSubjectAssignment,
  StudentEnrollment,
  Student,
  Teacher,
  Campus,
  AcademicYear,
  School,
  IClassDoc,
  ISectionDoc,
  IAcademicClassDoc,
  ISubjectDoc,
  IClassSubjectDoc,
  ITeacherSubjectAssignmentDoc,
} from '@edusphere/database';
import {
  AcademicStatus,
  TeacherAssignmentStatus,
  UserType,
  NotFoundError,
  ConflictError,
  BadRequestError,
  ValidationError,
  AuthorizationError,
} from '@edusphere/common';
import {
  ClassDto,
  CreateClassInput,
  UpdateClassInput,
  ClassFilterQuery,
  SectionDto,
  CreateSectionInput,
  UpdateSectionInput,
  SectionFilterQuery,
  AcademicClassDto,
  CreateAcademicClassInput,
  UpdateAcademicClassInput,
  AcademicClassFilterQuery,
  SubjectDto,
  CreateSubjectInput,
  UpdateSubjectInput,
  SubjectFilterQuery,
  ClassSubjectDto,
  CreateClassSubjectInput,
  UpdateClassSubjectInput,
  TeacherSubjectAssignmentDto,
  CreateTeacherAssignmentInput,
  UpdateTeacherAssignmentInput,
  TeacherAssignmentFilterQuery,
  AuthContext,
} from '@edusphere/types';
import { recordAuditLog } from '../../core/audit/audit.service.js';
import { AuditContextMeta } from '../tenant/tenant.service.js';
import { resourcePolicy } from '../rbac/policies/resource.policy.js';

export class AcademicService {
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
  // 1. Grade / Class Level Management
  // =========================================================================

  async createClass(
    tenantId: string,
    schoolId: string,
    input: CreateClassInput,
    meta?: AuditContextMeta
  ): Promise<ClassDto> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(schoolId);

    // Uniqueness validation within school
    const existing = await Class.findOne({
      tenantId: tId,
      schoolId: sId,
      code: input.code.toUpperCase().trim(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Class with code "${input.code}" already exists in this school.`);
    }

    const doc = await Class.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      academicYearId: input.academicYearId ? new Types.ObjectId(input.academicYearId) : undefined,
      name: input.name.trim(),
      shortName: input.shortName?.trim(),
      code: input.code.toUpperCase().trim(),
      order: input.order,
      educationLevel: input.educationLevel,
      status: input.status || AcademicStatus.ACTIVE,
    });

    const dto = this.mapClassToDto(doc);
    await this.logAudit({
      tenantId,
      schoolId,
      action: 'CREATE',
      entity: 'Class',
      entityId: doc._id.toString(),
      after: dto,
      meta,
    });

    return dto;
  }

  async getClasses(
    tenantId: string,
    query: ClassFilterQuery
  ): Promise<{
    items: ClassDto[];
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (query.campusId && Types.ObjectId.isValid(query.campusId)) {
      filter.campusId = new Types.ObjectId(query.campusId);
    }
    if (query.academicYearId && Types.ObjectId.isValid(query.academicYearId)) {
      filter.academicYearId = new Types.ObjectId(query.academicYearId);
    }
    if (query.educationLevel) {
      filter.educationLevel = query.educationLevel;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { shortName: regex }];
    }

    const [docs, totalRecords] = await Promise.all([
      Class.find(filter)
        .populate('campusId', 'name')
        .sort({ order: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Class.countDocuments(filter),
    ]);

    const items = docs.map((d) => this.mapClassToDto(d));
    return {
      items,
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  async getClassById(tenantId: string, classId: string): Promise<ClassDto> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestError('Invalid Class ID');
    }

    const doc = await Class.findOne({
      _id: new Types.ObjectId(classId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name')
      .lean();

    if (!doc) {
      throw new NotFoundError('Class not found');
    }

    return this.mapClassToDto(doc);
  }

  async updateClass(
    tenantId: string,
    classId: string,
    input: UpdateClassInput,
    meta?: AuditContextMeta
  ): Promise<ClassDto> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestError('Invalid Class ID');
    }

    const classDoc = await Class.findOne({
      _id: new Types.ObjectId(classId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!classDoc) {
      throw new NotFoundError('Class not found');
    }

    if (input.code && input.code.toUpperCase().trim() !== classDoc.code) {
      const existing = await Class.findOne({
        _id: { $ne: classDoc._id },
        tenantId: classDoc.tenantId,
        schoolId: classDoc.schoolId,
        code: input.code.toUpperCase().trim(),
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(`Class with code "${input.code}" already exists.`);
      }
      classDoc.code = input.code.toUpperCase().trim();
    }

    const before = this.mapClassToDto(classDoc);

    if (input.name !== undefined) classDoc.name = input.name.trim();
    if (input.shortName !== undefined) classDoc.shortName = input.shortName.trim();
    if (input.order !== undefined) classDoc.order = input.order;
    if (input.educationLevel !== undefined) classDoc.educationLevel = input.educationLevel;
    if (input.status !== undefined) classDoc.status = input.status;
    if (input.campusId !== undefined) {
      classDoc.campusId = input.campusId ? new Types.ObjectId(input.campusId) : undefined;
    }
    if (input.academicYearId !== undefined) {
      classDoc.academicYearId = input.academicYearId
        ? new Types.ObjectId(input.academicYearId)
        : undefined;
    }

    await classDoc.save();

    const after = this.mapClassToDto(classDoc);
    await this.logAudit({
      tenantId,
      schoolId: classDoc.schoolId.toString(),
      action: 'UPDATE',
      entity: 'Class',
      entityId: classDoc._id.toString(),
      before,
      after,
      meta,
    });

    return after;
  }

  async deleteClass(tenantId: string, classId: string, meta?: AuditContextMeta): Promise<void> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestError('Invalid Class ID');
    }

    const cId = new Types.ObjectId(classId);
    const tId = new Types.ObjectId(tenantId);

    const classDoc = await Class.findOne({ _id: cId, tenantId: tId, isDeleted: false });
    if (!classDoc) {
      throw new NotFoundError('Class not found');
    }

    // Dependency check: Are sections or academic classes configured?
    const hasSections = await Section.exists({ classId: cId, tenantId: tId, isDeleted: false });
    if (hasSections) {
      throw new BadRequestError('Cannot delete Class with active sections. Remove sections first.');
    }

    const hasAcademicClasses = await AcademicClass.exists({
      classId: cId,
      tenantId: tId,
      isDeleted: false,
    });
    if (hasAcademicClasses) {
      throw new BadRequestError(
        'Cannot delete Class with active academic class offerings. Deactivate offerings first.'
      );
    }

    classDoc.isDeleted = true;
    await classDoc.save();

    await this.logAudit({
      tenantId,
      schoolId: classDoc.schoolId.toString(),
      action: 'DELETE',
      entity: 'Class',
      entityId: classId,
      before: { id: classId, name: classDoc.name, code: classDoc.code },
      meta,
    });
  }

  // =========================================================================
  // 2. Section Management
  // =========================================================================

  async createSection(
    tenantId: string,
    schoolId: string,
    input: CreateSectionInput,
    meta?: AuditContextMeta
  ): Promise<SectionDto> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(schoolId);
    const cId = new Types.ObjectId(input.classId);

    // Verify parent class exists
    const classDoc = await Class.findOne({ _id: cId, tenantId: tId, isDeleted: false });
    if (!classDoc) {
      throw new NotFoundError('Parent Class not found');
    }

    // Uniqueness validation (classId + name)
    const existing = await Section.findOne({
      tenantId: tId,
      classId: cId,
      name: input.name.trim(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(
        `Section "${input.name}" already exists for class "${classDoc.name}".`
      );
    }

    let teacherId: Types.ObjectId | undefined;
    if (input.classTeacherId) {
      if (!Types.ObjectId.isValid(input.classTeacherId)) {
        throw new BadRequestError('Invalid classTeacherId');
      }
      teacherId = new Types.ObjectId(input.classTeacherId);
      const teacher = await Teacher.findOne({ _id: teacherId, tenantId: tId, isDeleted: false });
      if (!teacher) {
        throw new NotFoundError('Designated Class Teacher not found');
      }
    }

    const doc = await Section.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : classDoc.campusId,
      academicYearId: input.academicYearId
        ? new Types.ObjectId(input.academicYearId)
        : classDoc.academicYearId,
      classId: cId,
      name: input.name.trim(),
      code: input.code?.trim().toUpperCase(),
      capacity: input.capacity || 40,
      room: input.room?.trim(),
      classTeacherId: teacherId,
      status: input.status || AcademicStatus.ACTIVE,
    });

    const dto = this.mapSectionToDto(doc);
    await this.logAudit({
      tenantId,
      schoolId,
      action: 'CREATE',
      entity: 'Section',
      entityId: doc._id.toString(),
      after: dto,
      meta,
    });

    return dto;
  }

  async getSections(
    tenantId: string,
    query: SectionFilterQuery
  ): Promise<{
    items: SectionDto[];
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (query.classId && Types.ObjectId.isValid(query.classId)) {
      filter.classId = new Types.ObjectId(query.classId);
    }
    if (query.campusId && Types.ObjectId.isValid(query.campusId)) {
      filter.campusId = new Types.ObjectId(query.campusId);
    }
    if (query.academicYearId && Types.ObjectId.isValid(query.academicYearId)) {
      filter.academicYearId = new Types.ObjectId(query.academicYearId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { room: regex }];
    }

    const [docs, totalRecords] = await Promise.all([
      Section.find(filter)
        .populate('classId', 'name code')
        .populate('campusId', 'name')
        .populate({
          path: 'classTeacherId',
          select: 'employeeId userId',
          populate: { path: 'userId', select: 'firstName lastName email' },
        })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Section.countDocuments(filter),
    ]);

    const items = docs.map((d) => this.mapSectionToDto(d));
    return {
      items,
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  async getSectionById(tenantId: string, sectionId: string): Promise<SectionDto> {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestError('Invalid Section ID');
    }

    const doc = await Section.findOne({
      _id: new Types.ObjectId(sectionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('classId', 'name code')
      .populate('campusId', 'name')
      .populate({
        path: 'classTeacherId',
        select: 'employeeId userId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .lean();

    if (!doc) {
      throw new NotFoundError('Section not found');
    }

    return this.mapSectionToDto(doc);
  }

  async updateSection(
    tenantId: string,
    sectionId: string,
    input: UpdateSectionInput,
    meta?: AuditContextMeta
  ): Promise<SectionDto> {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestError('Invalid Section ID');
    }

    const sec = await Section.findOne({
      _id: new Types.ObjectId(sectionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!sec) {
      throw new NotFoundError('Section not found');
    }

    if (input.name && input.name.trim() !== sec.name) {
      const existing = await Section.findOne({
        _id: { $ne: sec._id },
        tenantId: sec.tenantId,
        classId: sec.classId,
        name: input.name.trim(),
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(`Section "${input.name}" already exists for this class.`);
      }
      sec.name = input.name.trim();
    }

    const before = this.mapSectionToDto(sec);

    if (input.code !== undefined) sec.code = input.code?.trim().toUpperCase();
    if (input.capacity !== undefined) sec.capacity = input.capacity;
    if (input.room !== undefined) sec.room = input.room?.trim();
    if (input.status !== undefined) sec.status = input.status;
    if (input.classTeacherId !== undefined) {
      if (input.classTeacherId === null) {
        sec.classTeacherId = undefined;
      } else {
        if (!Types.ObjectId.isValid(input.classTeacherId)) {
          throw new BadRequestError('Invalid classTeacherId');
        }
        const teacher = await Teacher.findOne({
          _id: new Types.ObjectId(input.classTeacherId),
          tenantId: sec.tenantId,
          isDeleted: false,
        });
        if (!teacher) {
          throw new NotFoundError('Teacher not found');
        }
        sec.classTeacherId = teacher._id as Types.ObjectId;
      }
    }

    await sec.save();

    const after = this.mapSectionToDto(sec);
    await this.logAudit({
      tenantId,
      schoolId: sec.schoolId.toString(),
      action: 'UPDATE',
      entity: 'Section',
      entityId: sec._id.toString(),
      before,
      after,
      meta,
    });

    return after;
  }

  async deleteSection(tenantId: string, sectionId: string, meta?: AuditContextMeta): Promise<void> {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestError('Invalid Section ID');
    }

    const sec = await Section.findOne({
      _id: new Types.ObjectId(sectionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!sec) {
      throw new NotFoundError('Section not found');
    }

    const hasAcademicClasses = await AcademicClass.exists({
      sectionId: sec._id,
      tenantId: sec.tenantId,
      isDeleted: false,
    });
    if (hasAcademicClasses) {
      throw new BadRequestError(
        'Cannot delete Section associated with active Academic Class offerings.'
      );
    }

    sec.isDeleted = true;
    await sec.save();

    await this.logAudit({
      tenantId,
      schoolId: sec.schoolId.toString(),
      action: 'DELETE',
      entity: 'Section',
      entityId: sectionId,
      before: { id: sectionId, name: sec.name },
      meta,
    });
  }

  // =========================================================================
  // 3. Academic Class / Offering Management
  // =========================================================================

  async createAcademicClass(
    tenantId: string,
    schoolId: string,
    input: CreateAcademicClassInput,
    meta?: AuditContextMeta
  ): Promise<AcademicClassDto> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(schoolId);
    const campusId = new Types.ObjectId(input.campusId);
    const academicYearId = new Types.ObjectId(input.academicYearId);
    const classId = new Types.ObjectId(input.classId);
    const sectionId = new Types.ObjectId(input.sectionId);

    // Validate relationships
    const [campus, academicYear, classDoc, sectionDoc] = await Promise.all([
      Campus.findOne({ _id: campusId, tenantId: tId, isDeleted: false }),
      AcademicYear.findOne({ _id: academicYearId, tenantId: tId }),
      Class.findOne({ _id: classId, tenantId: tId, isDeleted: false }),
      Section.findOne({ _id: sectionId, tenantId: tId, isDeleted: false }),
    ]);

    if (!campus) throw new NotFoundError('Campus not found');
    if (!academicYear) throw new NotFoundError('Academic Year not found');
    if (!classDoc) throw new NotFoundError('Class not found');
    if (!sectionDoc) throw new NotFoundError('Section not found');

    if (sectionDoc.classId.toString() !== classId.toString()) {
      throw new BadRequestError('Section does not belong to specified Class.');
    }

    // Uniqueness validation (academicYearId + campusId + classId + sectionId)
    const existing = await AcademicClass.findOne({
      tenantId: tId,
      academicYearId,
      campusId,
      classId,
      sectionId,
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(
        `Academic Class for ${classDoc.name} - ${sectionDoc.name} already exists for this Academic Year and Campus.`
      );
    }

    let classTeacherId: Types.ObjectId | undefined;
    if (input.classTeacherId) {
      if (!Types.ObjectId.isValid(input.classTeacherId)) {
        throw new BadRequestError('Invalid classTeacherId');
      }
      classTeacherId = new Types.ObjectId(input.classTeacherId);
      const teacher = await Teacher.findOne({
        _id: classTeacherId,
        tenantId: tId,
        isDeleted: false,
      });
      if (!teacher) {
        throw new NotFoundError('Designated Class Teacher not found');
      }
    }

    const doc = await AcademicClass.create({
      tenantId: tId,
      schoolId: sId,
      campusId,
      academicYearId,
      classId,
      sectionId,
      classTeacherId,
      capacity: input.capacity || sectionDoc.capacity || 40,
      room: input.room?.trim() || sectionDoc.room,
      status: input.status || AcademicStatus.ACTIVE,
    });

    const populated = await AcademicClass.findById(doc._id)
      .populate('campusId', 'name')
      .populate('academicYearId', 'name')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate({
        path: 'classTeacherId',
        select: 'employeeId userId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .lean();

    const dto = this.mapAcademicClassToDto(populated, 0);

    await this.logAudit({
      tenantId,
      schoolId,
      action: 'CREATE',
      entity: 'AcademicClass',
      entityId: doc._id.toString(),
      after: dto,
      meta,
    });

    return dto;
  }

  async getAcademicClasses(
    tenantId: string,
    query: AcademicClassFilterQuery,
    auth?: AuthContext
  ): Promise<{
    items: AcademicClassDto[];
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (query.campusId && Types.ObjectId.isValid(query.campusId)) {
      filter.campusId = new Types.ObjectId(query.campusId);
    }
    if (query.academicYearId && Types.ObjectId.isValid(query.academicYearId)) {
      filter.academicYearId = new Types.ObjectId(query.academicYearId);
    }
    if (query.classId && Types.ObjectId.isValid(query.classId)) {
      filter.classId = new Types.ObjectId(query.classId);
    }
    if (query.sectionId && Types.ObjectId.isValid(query.sectionId)) {
      filter.sectionId = new Types.ObjectId(query.sectionId);
    }
    if (query.classTeacherId && Types.ObjectId.isValid(query.classTeacherId)) {
      filter.classTeacherId = new Types.ObjectId(query.classTeacherId);
    }
    if (query.status) {
      filter.status = query.status;
    }

    // Role-based scope filtering for Teachers
    if (auth && auth.userType === UserType.TEACHER) {
      const teacher = await Teacher.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();

      if (teacher) {
        // Teacher sees classes where they are class teacher OR subject teacher
        const assignments = await TeacherSubjectAssignment.find({
          tenantId: new Types.ObjectId(tenantId),
          teacherId: teacher._id,
        }).lean();

        const assignedSectionIds = assignments.map((a) => a.sectionId);
        filter.$or = [{ classTeacherId: teacher._id }, { sectionId: { $in: assignedSectionIds } }];
      }
    }

    const [docs, totalRecords] = await Promise.all([
      AcademicClass.find(filter)
        .populate('campusId', 'name')
        .populate('academicYearId', 'name')
        .populate('classId', 'name code')
        .populate('sectionId', 'name')
        .populate({
          path: 'classTeacherId',
          select: 'employeeId userId',
          populate: { path: 'userId', select: 'firstName lastName email' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AcademicClass.countDocuments(filter),
    ]);

    // Aggregate active enrollment counts per academic class
    const academicClassIds = docs.map((d) => d._id);
    const enrollmentCounts = await StudentEnrollment.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          $or: [
            { academicClassId: { $in: academicClassIds } },
            // fallback for earlier schema entries
            {
              $expr: {
                $in: ['$classId', docs.map((d: any) => d.classId?._id || d.classId)],
              },
            },
          ],
          status: 'ENROLLED',
        },
      },
      {
        $group: {
          _id: {
            academicClassId: '$academicClassId',
            classId: '$classId',
            sectionId: '$sectionId',
            academicYearId: '$academicYearId',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map<string, number>();
    for (const ec of enrollmentCounts) {
      if (ec._id.academicClassId) {
        countMap.set(ec._id.academicClassId.toString(), ec.count);
      }
      // Also index by compound key for fallback
      const compoundKey = `${ec._id.academicYearId}_${ec._id.classId}_${ec._id.sectionId}`;
      countMap.set(compoundKey, ec.count);
    }

    const items = docs.map((doc: any) => {
      const byIdCount = countMap.get(doc._id.toString());
      const classIdStr = (doc.classId?._id || doc.classId).toString();
      const sectionIdStr = (doc.sectionId?._id || doc.sectionId).toString();
      const ayIdStr = (doc.academicYearId?._id || doc.academicYearId).toString();
      const compoundKey = `${ayIdStr}_${classIdStr}_${sectionIdStr}`;
      const count = byIdCount !== undefined ? byIdCount : countMap.get(compoundKey) || 0;
      return this.mapAcademicClassToDto(doc, count);
    });

    return {
      items,
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  async getAcademicClassById(
    tenantId: string,
    academicClassId: string,
    auth?: AuthContext
  ): Promise<AcademicClassDto> {
    if (!Types.ObjectId.isValid(academicClassId)) {
      throw new BadRequestError('Invalid Academic Class ID');
    }

    if (auth) {
      const allowed = await resourcePolicy.canAccessAcademicClass(auth, academicClassId);
      if (!allowed) {
        throw new AuthorizationError('You are not authorized to access this academic class.');
      }
    }

    const doc = await AcademicClass.findOne({
      _id: new Types.ObjectId(academicClassId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('campusId', 'name')
      .populate('academicYearId', 'name')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate({
        path: 'classTeacherId',
        select: 'employeeId userId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .lean();

    if (!doc) {
      throw new NotFoundError('Academic Class not found');
    }

    const count = await StudentEnrollment.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      $or: [
        { academicClassId: doc._id },
        {
          classId: (doc.classId as any)._id || doc.classId,
          sectionId: (doc.sectionId as any)._id || doc.sectionId,
          academicYearId: (doc.academicYearId as any)._id || doc.academicYearId,
        },
      ],
      status: 'ENROLLED',
    });

    return this.mapAcademicClassToDto(doc, count);
  }

  async updateAcademicClass(
    tenantId: string,
    academicClassId: string,
    input: UpdateAcademicClassInput,
    meta?: AuditContextMeta
  ): Promise<AcademicClassDto> {
    if (!Types.ObjectId.isValid(academicClassId)) {
      throw new BadRequestError('Invalid Academic Class ID');
    }

    const ac = await AcademicClass.findOne({
      _id: new Types.ObjectId(academicClassId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!ac) {
      throw new NotFoundError('Academic Class not found');
    }

    // Capacity validation against current enrollment
    if (input.capacity !== undefined) {
      const currentEnrollment = await StudentEnrollment.countDocuments({
        tenantId: ac.tenantId,
        $or: [
          { academicClassId: ac._id },
          {
            classId: ac.classId,
            sectionId: ac.sectionId,
            academicYearId: ac.academicYearId,
          },
        ],
        status: 'ENROLLED',
      });

      if (input.capacity < currentEnrollment) {
        throw new BadRequestError(
          `Cannot reduce capacity to ${input.capacity}. Current enrollment is ${currentEnrollment} students.`
        );
      }
      ac.capacity = input.capacity;
    }

    if (input.room !== undefined) ac.room = input.room?.trim();
    if (input.status !== undefined) ac.status = input.status;

    if (input.classTeacherId !== undefined) {
      if (input.classTeacherId === null) {
        ac.classTeacherId = undefined;
      } else {
        if (!Types.ObjectId.isValid(input.classTeacherId)) {
          throw new BadRequestError('Invalid classTeacherId');
        }
        const teacher = await Teacher.findOne({
          _id: new Types.ObjectId(input.classTeacherId),
          tenantId: ac.tenantId,
          isDeleted: false,
        });
        if (!teacher) {
          throw new NotFoundError('Teacher not found');
        }
        ac.classTeacherId = teacher._id as Types.ObjectId;
      }
    }

    await ac.save();

    return this.getAcademicClassById(tenantId, academicClassId);
  }

  async deleteAcademicClass(
    tenantId: string,
    academicClassId: string,
    meta?: AuditContextMeta
  ): Promise<void> {
    if (!Types.ObjectId.isValid(academicClassId)) {
      throw new BadRequestError('Invalid Academic Class ID');
    }

    const ac = await AcademicClass.findOne({
      _id: new Types.ObjectId(academicClassId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!ac) {
      throw new NotFoundError('Academic Class not found');
    }

    // Check active enrollments
    const activeEnrollments = await StudentEnrollment.countDocuments({
      tenantId: ac.tenantId,
      $or: [
        { academicClassId: ac._id },
        { classId: ac.classId, sectionId: ac.sectionId, academicYearId: ac.academicYearId },
      ],
      status: 'ENROLLED',
    });

    if (activeEnrollments > 0) {
      throw new BadRequestError(
        `Cannot delete Academic Class with ${activeEnrollments} active student enrollments. Withdraw or transfer students first.`
      );
    }

    ac.isDeleted = true;
    await ac.save();

    await this.logAudit({
      tenantId,
      schoolId: ac.schoolId.toString(),
      action: 'DELETE',
      entity: 'AcademicClass',
      entityId: academicClassId,
      before: { id: academicClassId },
      meta,
    });
  }

  async assignClassTeacher(
    tenantId: string,
    academicClassId: string,
    teacherId: string | null,
    meta?: AuditContextMeta
  ): Promise<AcademicClassDto> {
    return this.updateAcademicClass(tenantId, academicClassId, { classTeacherId: teacherId }, meta);
  }

  async getAcademicClassDetails(
    tenantId: string,
    academicClassId: string,
    auth?: AuthContext
  ): Promise<any> {
    const academicClass = await this.getAcademicClassById(tenantId, academicClassId, auth);

    const [students, subjects, teacherAssignments] = await Promise.all([
      this.getClassStudents(tenantId, academicClassId, auth),
      this.getClassSubjects(tenantId, academicClass.academicYearId, academicClass.classId),
      this.getTeacherAssignments(tenantId, {
        academicClassId,
        academicYearId: academicClass.academicYearId,
        sectionId: academicClass.sectionId,
      }),
    ]);

    return {
      academicClass,
      students,
      subjects,
      teachers: teacherAssignments.items,
    };
  }

  // =========================================================================
  // 4. Subject Management
  // =========================================================================

  async createSubject(
    tenantId: string,
    schoolId: string,
    input: CreateSubjectInput,
    meta?: AuditContextMeta
  ): Promise<SubjectDto> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(schoolId);
    const code = input.code.toUpperCase().trim();

    const existing = await Subject.findOne({
      tenantId: tId,
      schoolId: sId,
      code,
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictError(`Subject with code "${code}" already exists.`);
    }

    const doc = await Subject.create({
      tenantId: tId,
      schoolId: sId,
      name: input.name.trim(),
      shortName: input.shortName?.trim(),
      code,
      type: input.type || 'CORE',
      category: input.category,
      educationLevel: input.educationLevel,
      creditHours: input.creditHours || 1,
      sequence: input.sequence || 0,
      status: input.status || AcademicStatus.ACTIVE,
    });

    const dto = this.mapSubjectToDto(doc);
    await this.logAudit({
      tenantId,
      schoolId,
      action: 'CREATE',
      entity: 'Subject',
      entityId: doc._id.toString(),
      after: dto,
      meta,
    });

    return dto;
  }

  async getSubjects(
    tenantId: string,
    query: SubjectFilterQuery
  ): Promise<{
    items: SubjectDto[];
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (query.type) filter.type = query.type;
    if (query.category) filter.category = query.category;
    if (query.educationLevel) filter.educationLevel = query.educationLevel;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { shortName: regex }];
    }

    const [docs, totalRecords] = await Promise.all([
      Subject.find(filter).sort({ sequence: 1, name: 1 }).skip(skip).limit(limit).lean(),
      Subject.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => this.mapSubjectToDto(d)),
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  async getSubjectById(tenantId: string, subjectId: string): Promise<SubjectDto> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestError('Invalid Subject ID');
    }

    const doc = await Subject.findOne({
      _id: new Types.ObjectId(subjectId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).lean();

    if (!doc) {
      throw new NotFoundError('Subject not found');
    }

    return this.mapSubjectToDto(doc);
  }

  async updateSubject(
    tenantId: string,
    subjectId: string,
    input: UpdateSubjectInput,
    meta?: AuditContextMeta
  ): Promise<SubjectDto> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestError('Invalid Subject ID');
    }

    const sub = await Subject.findOne({
      _id: new Types.ObjectId(subjectId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!sub) {
      throw new NotFoundError('Subject not found');
    }

    if (input.code && input.code.toUpperCase().trim() !== sub.code) {
      const existing = await Subject.findOne({
        _id: { $ne: sub._id },
        tenantId: sub.tenantId,
        schoolId: sub.schoolId,
        code: input.code.toUpperCase().trim(),
        isDeleted: false,
      });
      if (existing) {
        throw new ConflictError(`Subject with code "${input.code}" already exists.`);
      }
      sub.code = input.code.toUpperCase().trim();
    }

    const before = this.mapSubjectToDto(sub);

    if (input.name !== undefined) sub.name = input.name.trim();
    if (input.shortName !== undefined) sub.shortName = input.shortName.trim();
    if (input.type !== undefined) sub.type = input.type;
    if (input.category !== undefined) sub.category = input.category;
    if (input.educationLevel !== undefined) sub.educationLevel = input.educationLevel;
    if (input.creditHours !== undefined) sub.creditHours = input.creditHours;
    if (input.sequence !== undefined) sub.sequence = input.sequence;
    if (input.status !== undefined) sub.status = input.status;

    await sub.save();

    const after = this.mapSubjectToDto(sub);
    await this.logAudit({
      tenantId,
      schoolId: sub.schoolId.toString(),
      action: 'UPDATE',
      entity: 'Subject',
      entityId: sub._id.toString(),
      before,
      after,
      meta,
    });

    return after;
  }

  async deleteSubject(tenantId: string, subjectId: string, meta?: AuditContextMeta): Promise<void> {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestError('Invalid Subject ID');
    }

    const sub = await Subject.findOne({
      _id: new Types.ObjectId(subjectId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!sub) {
      throw new NotFoundError('Subject not found');
    }

    // Check if subject is mapped to any class
    const isMapped = await ClassSubject.exists({
      subjectId: sub._id,
      tenantId: sub.tenantId,
      isDeleted: false,
    });
    if (isMapped) {
      throw new BadRequestError(
        'Cannot delete Subject mapped to class curriculum. Remove mappings first.'
      );
    }

    sub.isDeleted = true;
    await sub.save();

    await this.logAudit({
      tenantId,
      schoolId: sub.schoolId.toString(),
      action: 'DELETE',
      entity: 'Subject',
      entityId: subjectId,
      before: { id: subjectId, name: sub.name, code: sub.code },
      meta,
    });
  }

  // =========================================================================
  // 5. Class ↔ Subject Curriculum Mapping
  // =========================================================================

  async createClassSubject(
    tenantId: string,
    schoolId: string,
    input: CreateClassSubjectInput,
    meta?: AuditContextMeta
  ): Promise<ClassSubjectDto> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(schoolId);
    const ayId = new Types.ObjectId(input.academicYearId);
    const cId = new Types.ObjectId(input.classId);
    const subId = new Types.ObjectId(input.subjectId);

    const [ay, cls, sub] = await Promise.all([
      AcademicYear.findOne({ _id: ayId, tenantId: tId }),
      Class.findOne({ _id: cId, tenantId: tId, isDeleted: false }),
      Subject.findOne({ _id: subId, tenantId: tId, isDeleted: false }),
    ]);

    if (!ay) throw new NotFoundError('Academic Year not found');
    if (!cls) throw new NotFoundError('Class not found');
    if (!sub) throw new NotFoundError('Subject not found');

    const existing = await ClassSubject.findOne({
      tenantId: tId,
      academicYearId: ayId,
      classId: cId,
      subjectId: subId,
      isDeleted: false,
    });

    if (existing) {
      throw new ConflictError(
        `Subject "${sub.name}" is already mapped to Class "${cls.name}" for this academic year.`
      );
    }

    const doc = await ClassSubject.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : cls.campusId,
      academicYearId: ayId,
      classId: cId,
      subjectId: subId,
      isOptional: input.isOptional || false,
      creditHours: input.creditHours !== undefined ? input.creditHours : sub.creditHours,
      sequence: input.sequence || 0,
    });

    const populated = await ClassSubject.findById(doc._id)
      .populate('academicYearId', 'name')
      .populate('classId', 'name')
      .populate('subjectId', 'name code type')
      .lean();

    return this.mapClassSubjectToDto(populated);
  }

  async getClassSubjects(
    tenantId: string,
    academicYearId: string,
    classId: string
  ): Promise<ClassSubjectDto[]> {
    if (!Types.ObjectId.isValid(academicYearId) || !Types.ObjectId.isValid(classId)) {
      throw new BadRequestError('Invalid academicYearId or classId');
    }

    const docs = await ClassSubject.find({
      tenantId: new Types.ObjectId(tenantId),
      academicYearId: new Types.ObjectId(academicYearId),
      classId: new Types.ObjectId(classId),
      isDeleted: false,
    })
      .populate('academicYearId', 'name')
      .populate('classId', 'name')
      .populate('subjectId', 'name code type')
      .sort({ sequence: 1 })
      .lean();

    return docs.map((d) => this.mapClassSubjectToDto(d));
  }

  async updateClassSubject(
    tenantId: string,
    mappingId: string,
    input: UpdateClassSubjectInput,
    meta?: AuditContextMeta
  ): Promise<ClassSubjectDto> {
    if (!Types.ObjectId.isValid(mappingId)) {
      throw new BadRequestError('Invalid mapping ID');
    }

    const cs = await ClassSubject.findOne({
      _id: new Types.ObjectId(mappingId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!cs) {
      throw new NotFoundError('Class Subject mapping not found');
    }

    if (input.isOptional !== undefined) cs.isOptional = input.isOptional;
    if (input.creditHours !== undefined) cs.creditHours = input.creditHours;
    if (input.sequence !== undefined) cs.sequence = input.sequence;

    await cs.save();

    const populated = await ClassSubject.findById(cs._id)
      .populate('academicYearId', 'name')
      .populate('classId', 'name')
      .populate('subjectId', 'name code type')
      .lean();

    return this.mapClassSubjectToDto(populated);
  }

  async deleteClassSubject(
    tenantId: string,
    mappingId: string,
    meta?: AuditContextMeta
  ): Promise<void> {
    if (!Types.ObjectId.isValid(mappingId)) {
      throw new BadRequestError('Invalid mapping ID');
    }

    const cs = await ClassSubject.findOne({
      _id: new Types.ObjectId(mappingId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!cs) {
      throw new NotFoundError('Class Subject mapping not found');
    }

    cs.isDeleted = true;
    await cs.save();

    await this.logAudit({
      tenantId,
      schoolId: cs.schoolId.toString(),
      action: 'DELETE',
      entity: 'ClassSubject',
      entityId: mappingId,
      before: { id: mappingId },
      meta,
    });
  }

  // =========================================================================
  // 6. Teacher-Subject Assignment
  // =========================================================================

  async assignTeacherToSubject(
    tenantId: string,
    schoolId: string,
    input: CreateTeacherAssignmentInput,
    meta?: AuditContextMeta
  ): Promise<TeacherSubjectAssignmentDto> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(schoolId);
    const ayId = new Types.ObjectId(input.academicYearId);
    const teacherId = new Types.ObjectId(input.teacherId);
    const subjectId = new Types.ObjectId(input.subjectId);
    const classId = new Types.ObjectId(input.classId);
    const sectionId = new Types.ObjectId(input.sectionId);
    const academicClassId = input.academicClassId
      ? new Types.ObjectId(input.academicClassId)
      : undefined;

    // Validate active teacher
    const teacher = await Teacher.findOne({
      _id: teacherId,
      tenantId: tId,
      isDeleted: false,
    });
    if (!teacher) {
      throw new NotFoundError('Teacher profile not found or inactive');
    }

    // Validate subject
    const subject = await Subject.findOne({
      _id: subjectId,
      tenantId: tId,
      isDeleted: false,
    });
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    // Uniqueness: one primary teacher assignment per section + subject + academic year
    const existing = await TeacherSubjectAssignment.findOne({
      tenantId: tId,
      academicYearId: ayId,
      sectionId,
      subjectId,
    });

    if (existing) {
      throw new ConflictError(
        'A teacher is already assigned to this subject in this section for the academic year.'
      );
    }

    const doc = await TeacherSubjectAssignment.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      academicYearId: ayId,
      teacherId,
      subjectId,
      classId,
      sectionId,
      academicClassId,
      status: input.status || TeacherAssignmentStatus.ACTIVE,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
    });

    const populated = await TeacherSubjectAssignment.findById(doc._id)
      .populate('academicYearId', 'name')
      .populate('campusId', 'name')
      .populate({
        path: 'teacherId',
        select: 'employeeId userId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .lean();

    const dto = this.mapTeacherAssignmentToDto(populated);

    await this.logAudit({
      tenantId,
      schoolId,
      action: 'CREATE',
      entity: 'TeacherSubjectAssignment',
      entityId: doc._id.toString(),
      after: dto,
      meta,
    });

    return dto;
  }

  async getTeacherAssignments(
    tenantId: string,
    query: TeacherAssignmentFilterQuery,
    auth?: AuthContext
  ): Promise<{
    items: TeacherSubjectAssignmentDto[];
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (query.teacherId && Types.ObjectId.isValid(query.teacherId)) {
      filter.teacherId = new Types.ObjectId(query.teacherId);
    }
    if (query.subjectId && Types.ObjectId.isValid(query.subjectId)) {
      filter.subjectId = new Types.ObjectId(query.subjectId);
    }
    if (query.classId && Types.ObjectId.isValid(query.classId)) {
      filter.classId = new Types.ObjectId(query.classId);
    }
    if (query.sectionId && Types.ObjectId.isValid(query.sectionId)) {
      filter.sectionId = new Types.ObjectId(query.sectionId);
    }
    if (query.academicClassId && Types.ObjectId.isValid(query.academicClassId)) {
      filter.academicClassId = new Types.ObjectId(query.academicClassId);
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

    // Role-based scope filtering for Teachers
    if (auth && auth.userType === UserType.TEACHER && !query.teacherId) {
      const teacher = await Teacher.findOne({
        tenantId: new Types.ObjectId(tenantId),
        userId: new Types.ObjectId(auth.userId),
        isDeleted: false,
      }).lean();
      if (teacher) {
        filter.teacherId = teacher._id;
      }
    }

    const [docs, totalRecords] = await Promise.all([
      TeacherSubjectAssignment.find(filter)
        .populate('academicYearId', 'name')
        .populate('campusId', 'name')
        .populate({
          path: 'teacherId',
          select: 'employeeId userId',
          populate: { path: 'userId', select: 'firstName lastName email' },
        })
        .populate('subjectId', 'name code')
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TeacherSubjectAssignment.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => this.mapTeacherAssignmentToDto(d)),
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    };
  }

  async getTeacherAssignmentById(
    tenantId: string,
    assignmentId: string
  ): Promise<TeacherSubjectAssignmentDto> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new BadRequestError('Invalid Assignment ID');
    }

    const doc = await TeacherSubjectAssignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
    })
      .populate('academicYearId', 'name')
      .populate('campusId', 'name')
      .populate({
        path: 'teacherId',
        select: 'employeeId userId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .lean();

    if (!doc) {
      throw new NotFoundError('Teacher Subject Assignment not found');
    }

    return this.mapTeacherAssignmentToDto(doc);
  }

  async updateTeacherAssignment(
    tenantId: string,
    assignmentId: string,
    input: UpdateTeacherAssignmentInput,
    meta?: AuditContextMeta
  ): Promise<TeacherSubjectAssignmentDto> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new BadRequestError('Invalid Assignment ID');
    }

    const doc = await TeacherSubjectAssignment.findOne({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!doc) {
      throw new NotFoundError('Teacher Subject Assignment not found');
    }

    if (input.status !== undefined) doc.status = input.status;
    if (input.effectiveTo !== undefined) {
      doc.effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : undefined;
    }

    await doc.save();

    return this.getTeacherAssignmentById(tenantId, assignmentId);
  }

  async deleteTeacherAssignment(
    tenantId: string,
    assignmentId: string,
    meta?: AuditContextMeta
  ): Promise<void> {
    if (!Types.ObjectId.isValid(assignmentId)) {
      throw new BadRequestError('Invalid Assignment ID');
    }

    const doc = await TeacherSubjectAssignment.findOneAndDelete({
      _id: new Types.ObjectId(assignmentId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!doc) {
      throw new NotFoundError('Teacher Subject Assignment not found');
    }

    await this.logAudit({
      tenantId,
      schoolId: doc.schoolId.toString(),
      action: 'DELETE',
      entity: 'TeacherSubjectAssignment',
      entityId: assignmentId,
      before: { id: assignmentId },
      meta,
    });
  }

  // =========================================================================
  // 7. Student Academic Enrollment & Roll Number Management
  // =========================================================================

  async enrollStudentAcademic(
    tenantId: string,
    input: {
      studentId: string;
      academicClassId: string;
      rollNumber?: number;
      startDate?: Date | string;
    },
    meta?: AuditContextMeta
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(input.studentId);
    const acId = new Types.ObjectId(input.academicClassId);

    // Verify student exists and is active
    const student = await Student.findOne({ _id: sId, tenantId: tId, isDeleted: false });
    if (!student) throw new NotFoundError('Student not found');

    // Verify academic class exists and has capacity
    const academicClass = await AcademicClass.findOne({
      _id: acId,
      tenantId: tId,
      isDeleted: false,
    });
    if (!academicClass) throw new NotFoundError('Academic Class not found');

    // Check concurrency-safe capacity
    const currentEnrollmentCount = await StudentEnrollment.countDocuments({
      tenantId: tId,
      $or: [
        { academicClassId: acId },
        {
          classId: academicClass.classId,
          sectionId: academicClass.sectionId,
          academicYearId: academicClass.academicYearId,
        },
      ],
      status: 'ENROLLED',
    });

    if (currentEnrollmentCount >= academicClass.capacity) {
      throw new BadRequestError(
        `Academic Class capacity reached (${currentEnrollmentCount}/${academicClass.capacity}). Cannot enroll more students.`
      );
    }

    // Verify student doesn't already have an active enrollment in this academic year
    const existingEnrollment = await StudentEnrollment.findOne({
      tenantId: tId,
      academicYearId: academicClass.academicYearId,
      studentId: sId,
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'ENROLLED') {
        throw new ConflictError(
          'Student is already actively enrolled in this academic year. Transfer or withdraw the existing enrollment first.'
        );
      }
      // Re-enroll with updated class
      existingEnrollment.classId = academicClass.classId;
      existingEnrollment.sectionId = academicClass.sectionId;
      existingEnrollment.academicClassId = acId;
      existingEnrollment.campusId = academicClass.campusId;
      existingEnrollment.status = 'ENROLLED';
      existingEnrollment.startDate = input.startDate ? new Date(input.startDate) : new Date();
      existingEnrollment.endDate = undefined;
      if (input.rollNumber) existingEnrollment.rollNumber = input.rollNumber;
      await existingEnrollment.save();
      return existingEnrollment;
    }

    // Roll number uniqueness check if provided
    if (input.rollNumber) {
      const duplicateRoll = await StudentEnrollment.findOne({
        tenantId: tId,
        academicYearId: academicClass.academicYearId,
        classId: academicClass.classId,
        sectionId: academicClass.sectionId,
        rollNumber: input.rollNumber,
        status: 'ENROLLED',
      });
      if (duplicateRoll) {
        throw new ConflictError(
          `Roll Number ${input.rollNumber} is already taken in this section.`
        );
      }
    }

    const enrollment = await StudentEnrollment.create({
      tenantId: tId,
      schoolId: academicClass.schoolId,
      campusId: academicClass.campusId,
      studentId: sId,
      academicYearId: academicClass.academicYearId,
      classId: academicClass.classId,
      sectionId: academicClass.sectionId,
      academicClassId: acId,
      rollNumber: input.rollNumber,
      status: 'ENROLLED',
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
    });

    await this.logAudit({
      tenantId,
      schoolId: academicClass.schoolId.toString(),
      action: 'ENROLL',
      entity: 'StudentEnrollment',
      entityId: enrollment._id.toString(),
      after: {
        studentId: input.studentId,
        academicClassId: input.academicClassId,
        rollNumber: input.rollNumber,
      },
      meta,
    });

    return enrollment;
  }

  async assignRollNumber(
    tenantId: string,
    enrollmentId: string,
    rollNumber: number,
    meta?: AuditContextMeta
  ): Promise<any> {
    if (!Types.ObjectId.isValid(enrollmentId)) {
      throw new BadRequestError('Invalid Enrollment ID');
    }

    const enrollment = await StudentEnrollment.findOne({
      _id: new Types.ObjectId(enrollmentId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!enrollment) {
      throw new NotFoundError('Student Enrollment record not found');
    }

    // Check roll number collision within the same academicYear + class + section
    const conflict = await StudentEnrollment.findOne({
      _id: { $ne: enrollment._id },
      tenantId: enrollment.tenantId,
      academicYearId: enrollment.academicYearId,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      rollNumber,
      status: 'ENROLLED',
    });

    if (conflict) {
      throw new ConflictError(
        `Roll Number ${rollNumber} is already assigned to another student in this section.`
      );
    }

    enrollment.rollNumber = rollNumber;
    await enrollment.save();

    await this.logAudit({
      tenantId,
      schoolId: enrollment.schoolId.toString(),
      action: 'ASSIGN_ROLL_NUMBER',
      entity: 'StudentEnrollment',
      entityId: enrollmentId,
      after: { rollNumber },
      meta,
    });

    return enrollment;
  }

  async autoAssignRollNumbers(
    tenantId: string,
    academicClassId: string,
    meta?: AuditContextMeta
  ): Promise<{ updatedCount: number; assignments: { studentId: string; rollNumber: number }[] }> {
    if (!Types.ObjectId.isValid(academicClassId)) {
      throw new BadRequestError('Invalid Academic Class ID');
    }

    const ac = await AcademicClass.findOne({
      _id: new Types.ObjectId(academicClassId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!ac) {
      throw new NotFoundError('Academic Class not found');
    }

    // Find all enrolled students in this academic class
    const enrollments = await StudentEnrollment.find({
      tenantId: ac.tenantId,
      $or: [
        { academicClassId: ac._id },
        { classId: ac.classId, sectionId: ac.sectionId, academicYearId: ac.academicYearId },
      ],
      status: 'ENROLLED',
    })
      .populate('studentId', 'personalDetails admissionNumber')
      .lean();

    if (enrollments.length === 0) {
      return { updatedCount: 0, assignments: [] };
    }

    // Sort alphabetically by student first name + last name
    enrollments.sort((a: any, b: any) => {
      const nameA =
        `${a.studentId?.personalDetails?.firstName || ''} ${a.studentId?.personalDetails?.lastName || ''}`.trim();
      const nameB =
        `${b.studentId?.personalDetails?.firstName || ''} ${b.studentId?.personalDetails?.lastName || ''}`.trim();
      return nameA.localeCompare(nameB);
    });

    // Bulk update roll numbers 1..N
    const assignments: { studentId: string; rollNumber: number }[] = [];
    const bulkOps = enrollments.map((enr: any, index: number) => {
      const rollNumber = index + 1;
      assignments.push({
        studentId: (enr.studentId?._id || enr.studentId).toString(),
        rollNumber,
      });
      return {
        updateOne: {
          filter: { _id: enr._id },
          update: { $set: { rollNumber } },
        },
      };
    });

    await StudentEnrollment.bulkWrite(bulkOps);

    await this.logAudit({
      tenantId,
      schoolId: ac.schoolId.toString(),
      action: 'AUTO_ASSIGN_ROLL_NUMBERS',
      entity: 'AcademicClass',
      entityId: academicClassId,
      after: { totalAssigned: assignments.length },
      meta,
    });

    return {
      updatedCount: assignments.length,
      assignments,
    };
  }

  async getClassStudents(
    tenantId: string,
    academicClassId: string,
    auth?: AuthContext
  ): Promise<any[]> {
    if (!Types.ObjectId.isValid(academicClassId)) {
      throw new BadRequestError('Invalid Academic Class ID');
    }

    const ac = await AcademicClass.findOne({
      _id: new Types.ObjectId(academicClassId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).lean();

    if (!ac) {
      throw new NotFoundError('Academic Class not found');
    }

    const enrollments = await StudentEnrollment.find({
      tenantId: ac.tenantId,
      $or: [
        { academicClassId: ac._id },
        { classId: ac.classId, sectionId: ac.sectionId, academicYearId: ac.academicYearId },
      ],
      status: 'ENROLLED',
    })
      .populate({
        path: 'studentId',
        select: 'admissionNumber personalDetails contactDetails currentStatus',
      })
      .sort({ rollNumber: 1, 'studentId.personalDetails.firstName': 1 })
      .lean();

    return enrollments.map((e: any) => ({
      enrollmentId: e._id.toString(),
      studentId: e.studentId?._id?.toString() || e.studentId?.toString(),
      admissionNumber: e.studentId?.admissionNumber,
      firstName: e.studentId?.personalDetails?.firstName,
      lastName: e.studentId?.personalDetails?.lastName,
      gender: e.studentId?.personalDetails?.gender,
      dateOfBirth: e.studentId?.personalDetails?.dateOfBirth,
      email: e.studentId?.contactDetails?.primaryEmail,
      phone: e.studentId?.contactDetails?.primaryPhone,
      rollNumber: e.rollNumber,
      enrollmentStatus: e.status,
      startDate: e.startDate,
    }));
  }

  // =========================================================================
  // 8. Academic Dashboard Summary
  // =========================================================================

  async getAcademicDashboardSummary(
    tenantId: string,
    campusId?: string,
    academicYearId?: string
  ): Promise<any> {
    const tId = new Types.ObjectId(tenantId);
    const filter: any = { tenantId: tId, isDeleted: false };
    if (campusId && Types.ObjectId.isValid(campusId)) {
      filter.campusId = new Types.ObjectId(campusId);
    }
    if (academicYearId && Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = new Types.ObjectId(academicYearId);
    }

    const [
      totalClasses,
      totalSections,
      totalAcademicClasses,
      totalSubjects,
      totalTeacherAssignments,
      academicClassList,
    ] = await Promise.all([
      Class.countDocuments({ tenantId: tId, isDeleted: false }),
      Section.countDocuments({ tenantId: tId, isDeleted: false }),
      AcademicClass.countDocuments(filter),
      Subject.countDocuments({ tenantId: tId, isDeleted: false }),
      TeacherSubjectAssignment.countDocuments({ tenantId: tId }),
      AcademicClass.find(filter).select('_id capacity classId sectionId academicYearId').lean(),
    ]);

    const acIds = academicClassList.map((ac) => ac._id);
    const totalCapacity = academicClassList.reduce((acc, curr) => acc + (curr.capacity || 40), 0);

    const totalEnrolled = await StudentEnrollment.countDocuments({
      tenantId: tId,
      $or: [
        { academicClassId: { $in: acIds } },
        {
          classId: { $in: academicClassList.map((a) => a.classId) },
          sectionId: { $in: academicClassList.map((a) => a.sectionId) },
        },
      ],
      status: 'ENROLLED',
    });

    const capacityUtilization =
      totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    return {
      totalClasses,
      totalSections,
      totalAcademicClasses,
      totalSubjects,
      totalTeacherAssignments,
      totalCapacity,
      totalEnrolled,
      capacityUtilization,
    };
  }

  // =========================================================================
  // Mapping Helpers
  // =========================================================================

  private mapClassToDto(doc: any): ClassDto {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: doc.campusId?._id ? doc.campusId._id.toString() : doc.campusId?.toString(),
      campusName: doc.campusId?.name,
      academicYearId: doc.academicYearId?.toString(),
      name: doc.name,
      shortName: doc.shortName,
      code: doc.code,
      order: doc.order,
      educationLevel: doc.educationLevel,
      status: doc.status,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapSectionToDto(doc: any): SectionDto {
    const classObj = doc.classId?._id ? doc.classId : undefined;
    const teacherObj = doc.classTeacherId?._id ? doc.classTeacherId : undefined;
    const userObj = teacherObj?.userId?._id ? teacherObj.userId : undefined;

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: doc.campusId?._id ? doc.campusId._id.toString() : doc.campusId?.toString(),
      campusName: doc.campusId?.name,
      academicYearId: doc.academicYearId?.toString(),
      classId: classObj ? classObj._id.toString() : doc.classId?.toString(),
      className: classObj ? classObj.name : undefined,
      name: doc.name,
      code: doc.code,
      capacity: doc.capacity,
      room: doc.room,
      classTeacherId: teacherObj ? teacherObj._id.toString() : doc.classTeacherId?.toString(),
      classTeacherName: userObj
        ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim()
        : undefined,
      status: doc.status,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapAcademicClassToDto(doc: any, currentEnrollment: number): AcademicClassDto {
    const classObj = doc.classId?._id ? doc.classId : undefined;
    const sectionObj = doc.sectionId?._id ? doc.sectionId : undefined;
    const campusObj = doc.campusId?._id ? doc.campusId : undefined;
    const ayObj = doc.academicYearId?._id ? doc.academicYearId : undefined;
    const teacherObj = doc.classTeacherId?._id ? doc.classTeacherId : undefined;
    const userObj = teacherObj?.userId?._id ? teacherObj.userId : undefined;

    const capacity = doc.capacity || 40;
    const available = Math.max(0, capacity - currentEnrollment);

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: campusObj ? campusObj._id.toString() : doc.campusId?.toString(),
      campusName: campusObj?.name,
      academicYearId: ayObj ? ayObj._id.toString() : doc.academicYearId?.toString(),
      academicYearName: ayObj?.name,
      classId: classObj ? classObj._id.toString() : doc.classId?.toString(),
      className: classObj?.name,
      classCode: classObj?.code,
      sectionId: sectionObj ? sectionObj._id.toString() : doc.sectionId?.toString(),
      sectionName: sectionObj?.name,
      classTeacherId: teacherObj ? teacherObj._id.toString() : doc.classTeacherId?.toString(),
      classTeacherName: userObj
        ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim()
        : undefined,
      classTeacherEmail: userObj?.email,
      capacity,
      currentEnrollment,
      availableCapacity: available,
      room: doc.room,
      status: doc.status,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapSubjectToDto(doc: any): SubjectDto {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      name: doc.name,
      shortName: doc.shortName,
      code: doc.code,
      type: doc.type,
      category: doc.category,
      educationLevel: doc.educationLevel,
      creditHours: doc.creditHours,
      sequence: doc.sequence,
      status: doc.status,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapClassSubjectToDto(doc: any): ClassSubjectDto {
    const classObj = doc.classId?._id ? doc.classId : undefined;
    const subjectObj = doc.subjectId?._id ? doc.subjectId : undefined;
    const ayObj = doc.academicYearId?._id ? doc.academicYearId : undefined;

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      schoolId: doc.schoolId.toString(),
      campusId: doc.campusId?.toString(),
      academicYearId: ayObj ? ayObj._id.toString() : doc.academicYearId?.toString(),
      academicYearName: ayObj?.name,
      classId: classObj ? classObj._id.toString() : doc.classId?.toString(),
      className: classObj?.name,
      subjectId: subjectObj ? subjectObj._id.toString() : doc.subjectId?.toString(),
      subjectName: subjectObj?.name,
      subjectCode: subjectObj?.code,
      subjectType: subjectObj?.type,
      isOptional: doc.isOptional,
      creditHours: doc.creditHours,
      sequence: doc.sequence,
      isDeleted: doc.isDeleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapTeacherAssignmentToDto(doc: any): TeacherSubjectAssignmentDto {
    const classObj = doc.classId?._id ? doc.classId : undefined;
    const sectionObj = doc.sectionId?._id ? doc.sectionId : undefined;
    const subjectObj = doc.subjectId?._id ? doc.subjectId : undefined;
    const campusObj = doc.campusId?._id ? doc.campusId : undefined;
    const ayObj = doc.academicYearId?._id ? doc.academicYearId : undefined;
    const teacherObj = doc.teacherId?._id ? doc.teacherId : undefined;
    const userObj = teacherObj?.userId?._id ? teacherObj.userId : undefined;

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      academicYearId: ayObj ? ayObj._id.toString() : doc.academicYearId?.toString(),
      academicYearName: ayObj?.name,
      schoolId: doc.schoolId.toString(),
      campusId: campusObj ? campusObj._id.toString() : doc.campusId?.toString(),
      campusName: campusObj?.name,
      teacherId: teacherObj ? teacherObj._id.toString() : doc.teacherId?.toString(),
      teacherName: userObj
        ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim()
        : undefined,
      teacherCode: teacherObj?.employeeId,
      teacherEmail: userObj?.email,
      subjectId: subjectObj ? subjectObj._id.toString() : doc.subjectId?.toString(),
      subjectName: subjectObj?.name,
      subjectCode: subjectObj?.code,
      classId: classObj ? classObj._id.toString() : doc.classId?.toString(),
      className: classObj?.name,
      sectionId: sectionObj ? sectionObj._id.toString() : doc.sectionId?.toString(),
      sectionName: sectionObj?.name,
      academicClassId: doc.academicClassId?.toString(),
      status: doc.status,
      effectiveFrom: doc.effectiveFrom,
      effectiveTo: doc.effectiveTo,
      createdAt: doc.createdAt,
    };
  }
}

export const academicService = new AcademicService();
