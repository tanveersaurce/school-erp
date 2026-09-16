import { Types } from 'mongoose';
import {
  Book,
  BookCopy,
  LibraryMember,
  LibraryCirculation,
  LibraryReservation,
  LibraryFine,
} from '@edusphere/database';
import {
  BookCopyStatus,
  BookCondition,
  CirculationStatus,
  ReservationStatus,
  LibraryFineType,
  LibraryFineStatus,
  LibraryMemberStatus,
  Money,
} from '@edusphere/common';
import { BadRequestError, NotFoundError } from '@edusphere/common';
import { LibraryConfigService } from './library-config.service.js';
import { CatalogService } from './catalog.service.js';

export class CirculationService {
  // =========================================================================
  // 1. Issue Book (Checkout)
  // =========================================================================
  public static async issueBook(
    tenantId: string,
    schoolId: string,
    data: {
      copyIdentifier: string; // copyId, barcode, or accessionNumber
      memberId: string;
      libraryId: string;
      issuedBy: string;
      dueDateOverride?: Date;
      notes?: string;
      idempotencyKey?: string;
    }
  ) {
    const member = await LibraryMember.findOne({
      _id: new Types.ObjectId(data.memberId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!member) {
      throw new NotFoundError('Library member not found.');
    }

    if (member.status !== LibraryMemberStatus.ACTIVE) {
      throw new BadRequestError(`Cannot issue book: membership is ${member.status.toLowerCase()}.`);
    }

    if (member.membershipEnd && new Date(member.membershipEnd) < new Date()) {
      throw new BadRequestError('Cannot issue book: membership has expired.');
    }

    // Check borrowing limit
    const maxBooks = member.maxBooks || 3;
    if (member.activeLoansCount >= maxBooks) {
      throw new BadRequestError(
        `Borrowing limit exceeded: Member already has ${member.activeLoansCount} active loans (limit: ${maxBooks}).`
      );
    }

    // Check for blocking unpaid fines (e.g. > $20.00 / 2000 minor units)
    if (member.totalFinesUnpaid > 5000) {
      throw new BadRequestError(
        `Cannot issue book: Member has ${Money.format(member.totalFinesUnpaid)} in outstanding fines.`
      );
    }

    // Check idempotency if key provided
    if (data.idempotencyKey) {
      const existing = await LibraryCirculation.findOne({
        tenantId: new Types.ObjectId(tenantId),
        idempotencyKey: data.idempotencyKey.trim(),
      });
      if (existing) {
        return existing;
      }
    }

    // Find the physical BookCopy
    let copy;
    if (Types.ObjectId.isValid(data.copyIdentifier)) {
      copy = await BookCopy.findOne({
        _id: new Types.ObjectId(data.copyIdentifier),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
    }
    if (!copy) {
      copy = await BookCopy.findOne({
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          { accessionNumber: data.copyIdentifier.toUpperCase().trim() },
          { barcode: data.copyIdentifier.trim() },
        ],
        isDeleted: false,
      });
    }

    if (!copy) {
      throw new NotFoundError(`Physical book copy '${data.copyIdentifier}' not found.`);
    }

    // Check if copy is reserved for someone else
    if (copy.status === BookCopyStatus.RESERVED) {
      const reservation = await LibraryReservation.findOne({
        bookCopyId: copy._id,
        status: ReservationStatus.READY,
        isDeleted: false,
      });
      if (reservation && reservation.memberId.toString() !== member._id.toString()) {
        throw new BadRequestError('This copy is currently held for another member on reservation.');
      }
    }

    // CRITICAL CONCURRENCY DEFENSE: Atomic conditional update
    const updatedCopy = await BookCopy.findOneAndUpdate(
      {
        _id: copy._id,
        status: { $in: [BookCopyStatus.AVAILABLE, BookCopyStatus.RESERVED] },
        isDeleted: false,
      },
      {
        $set: { status: BookCopyStatus.ISSUED },
      },
      { new: true }
    );

    if (!updatedCopy) {
      throw new BadRequestError('Book copy is not available for issue (may have just been checked out).');
    }

    // Calculate due date
    const settings = await LibraryConfigService.getSettings(tenantId, schoolId, data.libraryId);
    const loanDays = settings.defaultLoanDurationDays || 14;
    const issuedAt = new Date();
    const dueAt = data.dueDateOverride
      ? new Date(data.dueDateOverride)
      : new Date(issuedAt.getTime() + loanDays * 24 * 60 * 60 * 1000);

    const circPayload: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      libraryId: new Types.ObjectId(data.libraryId),
      bookCopyId: copy._id,
      bookId: copy.bookId,
      memberId: member._id,
      borrowerType: member.memberType,
      borrowerId: (member.studentId || member.employeeId || member.userId) as Types.ObjectId,
      userId: member.userId,
      issuedAt,
      dueAt,
      issuedBy: new Types.ObjectId(data.issuedBy),
      status: CirculationStatus.ISSUED,
      renewalCount: 0,
      maxRenewals: settings.maxRenewals || 2,
      fineAmount: 0,
      finePaid: false,
      notes: data.notes,
    };
    if (data.idempotencyKey) {
      circPayload.idempotencyKey = data.idempotencyKey.trim();
    }
    const circulation = await LibraryCirculation.create(circPayload);

    // Increment member's active loan count
    await LibraryMember.findByIdAndUpdate(member._id, {
      $inc: { activeLoansCount: 1 },
    });

    // Fulfill active reservation if one existed for this member
    await LibraryReservation.findOneAndUpdate(
      {
        bookId: copy.bookId,
        memberId: member._id,
        status: { $in: [ReservationStatus.PENDING, ReservationStatus.READY] },
        isDeleted: false,
      },
      {
        $set: {
          status: ReservationStatus.FULFILLED,
          fulfilledAt: new Date(),
        },
      }
    );

    // Synchronize Book counters
    await CatalogService.syncBookCounters(copy.bookId.toString());

    return circulation;
  }

  // =========================================================================
  // 2. Return Book (Checkin)
  // =========================================================================
  public static async returnBook(
    tenantId: string,
    schoolId: string,
    data: {
      circulationId?: string;
      copyIdentifier?: string;
      returnedBy: string;
      condition?: BookCondition;
      damageNotes?: string;
      notes?: string;
    }
  ) {
    let circulation;
    if (data.circulationId) {
      circulation = await LibraryCirculation.findOne({
        _id: new Types.ObjectId(data.circulationId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
    } else if (data.copyIdentifier) {
      let copy = await BookCopy.findOne({
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          { accessionNumber: data.copyIdentifier.toUpperCase().trim() },
          { barcode: data.copyIdentifier.trim() },
        ],
        isDeleted: false,
      });
      if (!copy && Types.ObjectId.isValid(data.copyIdentifier)) {
        copy = await BookCopy.findOne({
          _id: new Types.ObjectId(data.copyIdentifier),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
      }
      if (copy) {
        circulation = await LibraryCirculation.findOne({
          bookCopyId: copy._id,
          status: { $in: [CirculationStatus.ISSUED, CirculationStatus.OVERDUE] },
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        });
      }
    }

    if (!circulation) {
      throw new NotFoundError('Active circulation loan not found.');
    }

    if (circulation.status === CirculationStatus.RETURNED) {
      throw new BadRequestError('This book has already been returned.');
    }

    const now = new Date();
    const settings = await LibraryConfigService.getSettings(
      tenantId,
      schoolId,
      circulation.libraryId.toString()
    );

    // Overdue Calculation & Fine Assessment
    let fineAmount = 0;
    if (now > circulation.dueAt) {
      const diffMs = now.getTime() - circulation.dueAt.getTime();
      const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const graceDays = settings.fineGracePeriodDays || 0;

      if (overdueDays > graceDays) {
        const chargeableDays = overdueDays;
        fineAmount = Money.multiply(settings.finePerDay || 100, chargeableDays);
        if (settings.maxFineCap && fineAmount > settings.maxFineCap) {
          fineAmount = settings.maxFineCap;
        }
      }
    }

    let assessedFineDoc = null;
    if (fineAmount > 0) {
      assessedFineDoc = await LibraryFine.create({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        memberId: circulation.memberId,
        circulationId: circulation._id,
        bookId: circulation.bookId,
        bookCopyId: circulation.bookCopyId,
        type: LibraryFineType.OVERDUE,
        amount: fineAmount,
        paidAmount: 0,
        outstandingAmount: fineAmount,
        status: LibraryFineStatus.PENDING,
        assessedAt: now,
      });

      await LibraryMember.findByIdAndUpdate(circulation.memberId, {
        $inc: { totalFinesUnpaid: fineAmount },
      });
    }

    // Update circulation status
    circulation.status = CirculationStatus.RETURNED;
    circulation.returnedAt = now;
    circulation.returnedBy = new Types.ObjectId(data.returnedBy);
    circulation.fineAmount = fineAmount;
    if (data.notes) {
      circulation.notes = `${circulation.notes || ''}\n[Return note: ${data.notes}]`.trim();
    }
    await circulation.save();

    // Check if next member in waitlist has reserved this book
    const nextReservation = await LibraryReservation.findOne({
      bookId: circulation.bookId,
      status: ReservationStatus.PENDING,
      isDeleted: false,
    }).sort({ queuePosition: 1, requestedAt: 1 });

    let newCopyStatus = BookCopyStatus.AVAILABLE;
    if (nextReservation) {
      newCopyStatus = BookCopyStatus.RESERVED;
      nextReservation.status = ReservationStatus.READY;
      nextReservation.bookCopyId = circulation.bookCopyId;
      const expiryDays = settings.reservationExpiryDays || 3;
      nextReservation.expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      await nextReservation.save();
    }

    // Update copy condition if specified
    const copy = await BookCopy.findById(circulation.bookCopyId);
    if (copy) {
      if (data.condition && data.condition !== copy.condition) {
        copy.condition = data.condition;
        copy.conditionHistory = copy.conditionHistory || [];
        copy.conditionHistory.push({
          condition: data.condition,
          notes: data.damageNotes || 'Condition change noted on return',
          changedBy: data.returnedBy,
          changedAt: now,
        });
        if (data.condition === BookCondition.DAMAGED) {
          newCopyStatus = BookCopyStatus.DAMAGED;
        }
      }
      copy.status = newCopyStatus;
      await copy.save();
    }

    // Decrement member's active loan count
    await LibraryMember.findByIdAndUpdate(circulation.memberId, {
      $inc: { activeLoansCount: -1 },
    });

    // Synchronize Book availability
    await CatalogService.syncBookCounters(circulation.bookId.toString());

    return {
      circulation,
      fine: assessedFineDoc,
      copyStatus: newCopyStatus,
      nextReservationReserved: !!nextReservation,
    };
  }

  // =========================================================================
  // 3. Renew Book
  // =========================================================================
  public static async renewBook(
    tenantId: string,
    schoolId: string,
    circulationId: string,
    requestedBy: string,
    additionalDays?: number
  ) {
    const circulation = await LibraryCirculation.findOne({
      _id: new Types.ObjectId(circulationId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!circulation) {
      throw new NotFoundError('Circulation record not found.');
    }

    if (circulation.status !== CirculationStatus.ISSUED && circulation.status !== CirculationStatus.OVERDUE) {
      throw new BadRequestError('Only active or overdue loans can be renewed.');
    }

    const settings = await LibraryConfigService.getSettings(
      tenantId,
      schoolId,
      circulation.libraryId.toString()
    );

    const maxRenewals = circulation.maxRenewals !== undefined ? circulation.maxRenewals : settings.maxRenewals || 2;
    if (circulation.renewalCount >= maxRenewals) {
      throw new BadRequestError(
        `Renewal limit exceeded: This loan has already reached the maximum of ${maxRenewals} renewals.`
      );
    }

    // Check if someone else reserved this book
    const pendingReservation = await LibraryReservation.findOne({
      bookId: circulation.bookId,
      status: ReservationStatus.PENDING,
      memberId: { $ne: circulation.memberId },
      isDeleted: false,
    });

    if (pendingReservation) {
      throw new BadRequestError('Cannot renew loan: this title has pending reservations from other members.');
    }

    // Calculate extended due date
    const extensionDays = additionalDays || settings.renewalExtensionDays || 14;
    const baseDate = new Date() > circulation.dueAt ? new Date() : circulation.dueAt;
    const newDueDate = new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);

    circulation.dueAt = newDueDate;
    circulation.renewalCount += 1;
    circulation.status = CirculationStatus.ISSUED; // Reset to ISSUED if previously marked OVERDUE
    await circulation.save();

    return circulation;
  }

  // =========================================================================
  // 4. Declare Book Lost
  // =========================================================================
  public static async markBookLost(
    tenantId: string,
    schoolId: string,
    circulationId: string,
    reportedBy: string,
    opts?: string | { notes?: string; replacementFeeMinorUnits?: number; processingFeeMinorUnits?: number }
  ) {
    const circulation = await LibraryCirculation.findOne({
      _id: new Types.ObjectId(circulationId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!circulation) {
      throw new NotFoundError('Circulation loan not found.');
    }

    const copy = await BookCopy.findById(circulation.bookCopyId);
    if (!copy) {
      throw new NotFoundError('Book copy not found.');
    }

    const settings = await LibraryConfigService.getSettings(
      tenantId,
      schoolId,
      circulation.libraryId.toString()
    );

    // Calculate replacement fine
    const baseCost = copy.acquisitionCost || 2000; // Default $20.00 / 2000 minor units if 0
    const multiplier = settings.lostBookReplacementFeeMultiplier || 1.5;
    
    let replacementFine = Math.round(baseCost * multiplier);
    let notesText = '';
    if (typeof opts === 'string') {
      notesText = opts;
    } else if (opts) {
      notesText = opts.notes || '';
      if (opts.replacementFeeMinorUnits !== undefined) {
        replacementFine = opts.replacementFeeMinorUnits + (opts.processingFeeMinorUnits || 0);
      }
    }

    // Create Fine
    const fine = await LibraryFine.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      memberId: circulation.memberId,
      circulationId: circulation._id,
      bookId: circulation.bookId,
      bookCopyId: copy._id,
      type: LibraryFineType.LOST_BOOK,
      amount: replacementFine,
      paidAmount: 0,
      outstandingAmount: replacementFine,
      status: LibraryFineStatus.PENDING,
      assessedAt: new Date(),
    });

    await LibraryMember.findByIdAndUpdate(circulation.memberId, {
      $inc: { totalFinesUnpaid: replacementFine, activeLoansCount: -1 },
    });

    circulation.status = CirculationStatus.LOST;
    if (notesText) {
      circulation.notes = `${circulation.notes || ''}\n[Declared Lost: ${notesText}]`.trim();
    }
    await circulation.save();

    copy.status = BookCopyStatus.LOST;
    copy.condition = BookCondition.LOST;
    await copy.save();

    await CatalogService.syncBookCounters(copy.bookId.toString());

    const fineObj = fine.toObject();
    const fineData = {
      ...fineObj,
      amountMinorUnits: fine.amount,
      paidAmountMinorUnits: fine.paidAmount,
    };

    return { circulation, fine: fineData };
  }

  // =========================================================================
  // 5. Query Circulations
  // =========================================================================
  public static async getCirculations(
    tenantId: string,
    filters: {
      memberId?: string;
      bookId?: string;
      libraryId?: string;
      status?: CirculationStatus;
      overdueOnly?: boolean;
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
    if (filters.bookId) query.bookId = new Types.ObjectId(filters.bookId);
    if (filters.libraryId) query.libraryId = new Types.ObjectId(filters.libraryId);
    if (filters.status) query.status = filters.status;
    if (filters.overdueOnly) {
      query.status = { $in: [CirculationStatus.ISSUED, CirculationStatus.OVERDUE] };
      query.dueAt = { $lt: new Date() };
    }

    const [items, total] = await Promise.all([
      LibraryCirculation.find(query)
        .populate('bookId', 'title author coverImage')
        .populate('bookCopyId', 'accessionNumber barcode')
        .populate({
          path: 'memberId',
          select: 'memberNumber memberType studentId employeeId',
          populate: [
            { path: 'studentId', select: 'firstName lastName admissionNumber' },
            { path: 'employeeId', select: 'firstName lastName employeeId' },
          ],
        })
        .populate('issuedBy', 'email')
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit),
      LibraryCirculation.countDocuments(query),
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
}
