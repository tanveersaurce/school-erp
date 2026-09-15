import { Types } from 'mongoose';
import {
  StudentFeeAssignment,
  FeeStructure,
  Student,
  StudentEnrollment,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  Money,
  DiscountType,
} from '@edusphere/common';
import type { IStudentFeeAssignment, ICustomDiscount } from '@edusphere/types';

export class FeeAssignmentService {
  public static calculatePayable(
    structureTotal: number,
    discounts: ICustomDiscount[] = []
  ): number {
    let totalDiscount = 0;

    for (const d of discounts) {
      if (d.discountType === DiscountType.FLAT) {
        totalDiscount = Money.add(totalDiscount, Math.round(d.value));
      } else if (d.discountType === DiscountType.PERCENTAGE) {
        const percAmount = Money.calculatePercentage(structureTotal, d.value);
        totalDiscount = Money.add(totalDiscount, percAmount);
      }
    }

    const netPayable = Money.subtract(structureTotal, totalDiscount);
    return netPayable < 0 ? 0 : netPayable;
  }

  public static async assignFeeStructure(
    tenantId: string,
    schoolId: string,
    input: {
      studentId: string;
      academicYearId: string;
      classId: string;
      feeStructureId: string;
      customDiscounts?: ICustomDiscount[];
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const studentOid = new Types.ObjectId(input.studentId);
    const structureOid = new Types.ObjectId(input.feeStructureId);

    const [student, structure] = await Promise.all([
      Student.findOne({ _id: studentOid, tenantId: tenantOid, isDeleted: false }),
      FeeStructure.findOne({ _id: structureOid, tenantId: tenantOid, isDeleted: false }),
    ]);

    if (!student) throw new NotFoundError('Student not found.');
    if (!structure) throw new NotFoundError('Fee structure not found.');

    const totalPayable = this.calculatePayable(structure.totalAmount, input.customDiscounts);

    const assignment = await StudentFeeAssignment.findOneAndUpdate(
      {
        tenantId: tenantOid,
        studentId: studentOid,
        feeStructureId: structureOid,
      },
      {
        tenantId: tenantOid,
        schoolId: schoolOid,
        studentId: studentOid,
        academicYearId: new Types.ObjectId(input.academicYearId),
        classId: new Types.ObjectId(input.classId),
        feeStructureId: structureOid,
        customDiscounts: input.customDiscounts || [],
        totalPayable,
        isActive: true,
        isDeleted: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return assignment;
  }

  public static async batchAssignClass(
    tenantId: string,
    schoolId: string,
    input: {
      academicYearId: string;
      classId: string;
      feeStructureId: string;
      studentIds?: string[];
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const ayOid = new Types.ObjectId(input.academicYearId);
    const classOid = new Types.ObjectId(input.classId);
    const structureOid = new Types.ObjectId(input.feeStructureId);

    const structure = await FeeStructure.findOne({
      _id: structureOid,
      tenantId: tenantOid,
      isDeleted: false,
    });

    if (!structure) throw new NotFoundError('Fee structure not found.');

    let targetStudentIds: Types.ObjectId[] = [];

    if (input.studentIds && input.studentIds.length > 0) {
      targetStudentIds = input.studentIds.map((id) => new Types.ObjectId(id));
    } else {
      // Find all active enrollments for this class and academic year
      const enrollments = await StudentEnrollment.find({
        tenantId: tenantOid,
        academicYearId: ayOid,
        classId: classOid,
        status: { $in: ['ENROLLED', 'PROMOTED', 'ACTIVE'] },
        isDeleted: false,
      }).select('studentId').lean();

      targetStudentIds = enrollments.map((e) => e.studentId as unknown as Types.ObjectId);
    }

    if (targetStudentIds.length === 0) {
      throw new BadRequestError('No eligible students found in the selected class.');
    }

    const assignedCount = await Promise.all(
      targetStudentIds.map(async (stId) => {
        return StudentFeeAssignment.findOneAndUpdate(
          {
            tenantId: tenantOid,
            studentId: stId,
            feeStructureId: structureOid,
          },
          {
            tenantId: tenantOid,
            schoolId: schoolOid,
            studentId: stId,
            academicYearId: ayOid,
            classId: classOid,
            feeStructureId: structureOid,
            customDiscounts: [],
            totalPayable: structure.totalAmount,
            isActive: true,
            isDeleted: false,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      })
    );

    return {
      success: true,
      message: `Assigned fee structure to ${assignedCount.length} students.`,
      count: assignedCount.length,
    };
  }

  public static async getStudentFeeAssignments(
    tenantId: string,
    schoolId: string,
    query: {
      studentId?: string;
      classId?: string;
      academicYearId?: string;
      feeStructureId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      tenantId: tenantOid,
      schoolId: schoolOid,
      isDeleted: false,
    };

    if (query.studentId) filter.studentId = new Types.ObjectId(query.studentId);
    if (query.classId) filter.classId = new Types.ObjectId(query.classId);
    if (query.academicYearId) filter.academicYearId = new Types.ObjectId(query.academicYearId);
    if (query.feeStructureId) filter.feeStructureId = new Types.ObjectId(query.feeStructureId);

    const [items, total] = await Promise.all([
      StudentFeeAssignment.find(filter)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('feeStructureId', 'title totalAmount heads')
        .populate('classId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentFeeAssignment.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getStudentFeeAssignmentById(
    tenantId: string,
    schoolId: string,
    id: string
  ) {
    const assignment = await StudentFeeAssignment.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      isDeleted: false,
    })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber')
      .populate('feeStructureId')
      .populate('classId', 'name code');

    if (!assignment) throw new NotFoundError('Student fee assignment not found.');
    return assignment;
  }
}
