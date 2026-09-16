import { Types } from 'mongoose';
import {
  LibraryMember,
  Student,
  Employee,
  User,
} from '@edusphere/database';
import {
  LibraryMemberType,
  LibraryMemberStatus,
  BadRequestError,
  NotFoundError,
} from '@edusphere/common';
import { LibraryConfigService } from './library-config.service.js';

export class MemberService {
  public static async registerMember(tenantId: string, schoolId: string, data: any) {
    let studentId: Types.ObjectId | undefined;
    let employeeId: Types.ObjectId | undefined;
    let userId: Types.ObjectId | undefined;

    if (data.memberType === LibraryMemberType.STUDENT) {
      if (data.studentId) {
        studentId = new Types.ObjectId(data.studentId);
        const student = await Student.findOne({
          _id: studentId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (!student) {
          throw new NotFoundError('Student record not found.');
        }
        userId = student.userId as Types.ObjectId;
      } else if (data.userId) {
        userId = new Types.ObjectId(data.userId);
        const student = await Student.findOne({
          userId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (student) {
          studentId = student._id as Types.ObjectId;
        }
      } else {
        throw new BadRequestError('Either studentId or userId is required for student library membership.');
      }

      const existing = await LibraryMember.findOne({
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          ...(studentId ? [{ studentId }] : []),
          ...(userId ? [{ userId }] : []),
        ],
        status: { $in: [LibraryMemberStatus.ACTIVE, LibraryMemberStatus.SUSPENDED] },
        isDeleted: false,
      });
      if (existing) {
        throw new BadRequestError('Student already has an active library membership.');
      }
    } else {
      // TEACHER or STAFF
      if (data.employeeId) {
        employeeId = new Types.ObjectId(data.employeeId);
        const employee = await Employee.findOne({
          _id: employeeId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (!employee) {
          throw new NotFoundError('Employee record not found.');
        }
        userId = employee.userId as Types.ObjectId;
      } else if (data.userId) {
        userId = new Types.ObjectId(data.userId);
        const employee = await Employee.findOne({
          userId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
        if (employee) {
          employeeId = employee._id as Types.ObjectId;
        }
      } else {
        throw new BadRequestError('Either employeeId or userId is required for staff/teacher library membership.');
      }

      const existing = await LibraryMember.findOne({
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          ...(employeeId ? [{ employeeId }] : []),
          ...(userId ? [{ userId }] : []),
        ],
        status: { $in: [LibraryMemberStatus.ACTIVE, LibraryMemberStatus.SUSPENDED] },
        isDeleted: false,
      });
      if (existing) {
        throw new BadRequestError('Employee already has an active library membership.');
      }
    }

    // Auto-generate Member Number: MEM-YYYY-XXXXX
    let memberNumber = data.memberNumber?.toUpperCase().trim();
    if (!memberNumber) {
      const count = await LibraryMember.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
      });
      memberNumber = `MEM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    }

    const settings = await LibraryConfigService.getSettings(tenantId, schoolId, data.libraryId);
    let defaultMaxBooks = 3;
    if (data.memberType === LibraryMemberType.STUDENT) {
      defaultMaxBooks = settings.maxBooksPerMember.student || 3;
    } else if (data.memberType === LibraryMemberType.TEACHER) {
      defaultMaxBooks = settings.maxBooksPerMember.teacher || 10;
    } else {
      defaultMaxBooks = settings.maxBooksPerMember.staff || 5;
    }

    const member = await LibraryMember.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      memberNumber,
      memberType: data.memberType,
      studentId,
      employeeId,
      userId,
      libraryId: data.libraryId ? new Types.ObjectId(data.libraryId) : undefined,
      membershipStart: data.membershipStart || new Date(),
      membershipEnd: data.membershipEnd,
      status: LibraryMemberStatus.ACTIVE,
      maxBooks: data.maxBooks || data.maxBorrowLimit || defaultMaxBooks,
      activeLoansCount: 0,
      totalFinesUnpaid: 0,
      notes: data.notes,
    });

    return member;
  }

  public static async getMembers(
    tenantId: string,
    schoolId: string,
    filters: {
      search?: string;
      memberType?: LibraryMemberType;
      status?: LibraryMemberStatus;
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

    if (filters.memberType) query.memberType = filters.memberType;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.memberNumber = { $regex: filters.search.trim(), $options: 'i' };
    }

    const [items, total] = await Promise.all([
      LibraryMember.find(query)
        .populate({
          path: 'studentId',
          select: 'firstName lastName admissionNumber rollNumber classId sectionId',
        })
        .populate({
          path: 'employeeId',
          select: 'firstName lastName employeeId designation department',
        })
        .populate('userId', 'email')
        .sort({ memberNumber: 1 })
        .skip(skip)
        .limit(limit),
      LibraryMember.countDocuments(query),
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

  public static async getMemberById(tenantId: string, memberId: string) {
    const member = await LibraryMember.findOne({
      _id: new Types.ObjectId(memberId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('studentId')
      .populate('employeeId')
      .populate('userId', 'email userType');

    if (!member) {
      throw new NotFoundError('Library member not found.');
    }
    return member;
  }

  public static async getMemberByUserId(tenantId: string, userId: string) {
    const member = await LibraryMember.findOne({
      userId: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('studentId')
      .populate('employeeId');

    return member;
  }

  public static async updateMember(tenantId: string, memberId: string, data: any) {
    const member = await LibraryMember.findOne({
      _id: new Types.ObjectId(memberId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!member) {
      throw new NotFoundError('Library member not found.');
    }

    if (data.maxBooks !== undefined) member.maxBooks = data.maxBooks;
    if (data.membershipEnd !== undefined) member.membershipEnd = data.membershipEnd;
    if (data.status) member.status = data.status;
    if (data.notes !== undefined) member.notes = data.notes;

    await member.save();
    return member;
  }

  public static async suspendMember(tenantId: string, memberId: string, reason?: string) {
    const member = await LibraryMember.findOne({
      _id: new Types.ObjectId(memberId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!member) {
      throw new NotFoundError('Library member not found.');
    }

    member.status = LibraryMemberStatus.SUSPENDED;
    if (reason) {
      member.notes = `${member.notes || ''}\n[Suspended: ${reason}]`.trim();
    }
    await member.save();
    return member;
  }
}
