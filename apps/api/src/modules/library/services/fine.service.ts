import { Types } from 'mongoose';
import {
  LibraryFine,
  LibraryMember,
  LibraryCirculation,
} from '@edusphere/database';
import {
  LibraryFineStatus,
  Money,
} from '@edusphere/common';
import { BadRequestError, NotFoundError } from '@edusphere/common';

export class FineService {
  public static async getFines(
    tenantId: string,
    filters: {
      memberId?: string;
      status?: LibraryFineStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.memberId) query.memberId = new Types.ObjectId(filters.memberId);
    if (filters.status) query.status = filters.status;

    const [items, total] = await Promise.all([
      LibraryFine.find(query)
        .populate('bookId', 'title author')
        .populate('bookCopyId', 'accessionNumber barcode')
        .populate({
          path: 'memberId',
          select: 'memberNumber memberType studentId employeeId',
          populate: [
            { path: 'studentId', select: 'firstName lastName admissionNumber' },
            { path: 'employeeId', select: 'firstName lastName employeeId' },
          ],
        })
        .populate('waivedBy', 'email')
        .sort({ assessedAt: -1 })
        .skip(skip)
        .limit(limit),
      LibraryFine.countDocuments(query),
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

  public static async waiveFine(
    tenantId: string,
    fineId: string,
    data: {
      waivedBy: string;
      reason: string;
      waivedAmount?: number; // integer minor units
    }
  ) {
    if (!data.reason || !data.reason.trim()) {
      throw new BadRequestError('Reason is mandatory for fine waivers.');
    }

    const fine = await LibraryFine.findOne({
      _id: new Types.ObjectId(fineId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!fine) {
      throw new NotFoundError('Fine record not found.');
    }

    if (fine.status === LibraryFineStatus.PAID || fine.status === LibraryFineStatus.WAIVED) {
      throw new BadRequestError(`Cannot waive fine: already ${fine.status.toLowerCase()}.`);
    }

    const waiveAmount = data.waivedAmount !== undefined
      ? Math.min(data.waivedAmount, fine.outstandingAmount)
      : fine.outstandingAmount;

    fine.outstandingAmount = Money.subtract(fine.outstandingAmount, waiveAmount);
    fine.waivedAmount = Money.add(fine.waivedAmount || 0, waiveAmount);
    fine.waivedBy = new Types.ObjectId(data.waivedBy);
    fine.waiverReason = data.reason.trim();

    if (fine.outstandingAmount === 0) {
      fine.status = LibraryFineStatus.WAIVED;
      fine.settledAt = new Date();
    }

    await fine.save();

    // Adjust member's unpaid fine total
    await LibraryMember.findByIdAndUpdate(fine.memberId, {
      $inc: { totalFinesUnpaid: -waiveAmount },
    });

    return fine;
  }

  public static async settleFine(
    tenantId: string,
    fineId: string,
    data: {
      amount: number; // integer minor units
      paymentReference?: string;
    }
  ) {
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero.');
    }

    const fine = await LibraryFine.findOne({
      _id: new Types.ObjectId(fineId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!fine) {
      throw new NotFoundError('Fine record not found.');
    }

    if (fine.status === LibraryFineStatus.PAID || fine.status === LibraryFineStatus.WAIVED) {
      throw new BadRequestError(`Cannot settle fine: already ${fine.status.toLowerCase()}.`);
    }

    if (data.amount > fine.outstandingAmount) {
      throw new BadRequestError(
        `Payment amount (${Money.format(data.amount)}) exceeds outstanding fine (${Money.format(fine.outstandingAmount)}).`
      );
    }

    fine.paidAmount = Money.add(fine.paidAmount, data.amount);
    fine.outstandingAmount = Money.subtract(fine.outstandingAmount, data.amount);

    if (!data.paymentReference) {
      const count = await LibraryFine.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        status: LibraryFineStatus.PAID,
      });
      fine.paymentReference = `LIB-RCP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    } else {
      fine.paymentReference = data.paymentReference.trim();
    }

    if (fine.outstandingAmount === 0) {
      fine.status = LibraryFineStatus.PAID;
      fine.settledAt = new Date();
    } else {
      fine.status = LibraryFineStatus.PARTIALLY_PAID;
    }

    await fine.save();

    // Adjust member's unpaid fine total
    await LibraryMember.findByIdAndUpdate(fine.memberId, {
      $inc: { totalFinesUnpaid: -data.amount },
    });

    // If circulation loan was attached and fine is now cleared, mark circulation finePaid
    if (fine.circulationId && fine.outstandingAmount === 0) {
      await LibraryCirculation.findByIdAndUpdate(fine.circulationId, {
        finePaid: true,
      });
    }

    const fineObj = fine.toObject();
    return {
      ...fineObj,
      amountMinorUnits: fine.amount,
      paidAmountMinorUnits: fine.paidAmount,
    };
  }
}
