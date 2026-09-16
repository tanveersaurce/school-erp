import { Types } from 'mongoose';
import {
  Book,
  BookCopy,
  LibraryMember,
  LibraryReservation,
} from '@edusphere/database';
import {
  BookCopyStatus,
  ReservationStatus,
  LibraryMemberStatus,
} from '@edusphere/common';
import { BadRequestError, NotFoundError } from '@edusphere/common';
import { LibraryConfigService } from './library-config.service.js';
import { CatalogService } from './catalog.service.js';

export class ReservationService {
  public static async reserveBook(
    tenantId: string,
    schoolId: string,
    data: {
      bookId: string;
      memberId: string;
      libraryId: string;
      notes?: string;
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
      throw new BadRequestError('Member is not active.');
    }

    const book = await Book.findOne({
      _id: new Types.ObjectId(data.bookId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!book) {
      throw new NotFoundError('Book not found.');
    }

    // Check if member already has an active reservation for this book
    const existing = await LibraryReservation.findOne({
      tenantId: new Types.ObjectId(tenantId),
      bookId: book._id,
      memberId: member._id,
      status: { $in: [ReservationStatus.PENDING, ReservationStatus.READY] },
      isDeleted: false,
    });
    if (existing) {
      throw new BadRequestError('You already have an active reservation for this book.');
    }

    // Check max active reservations limit
    const settings = await LibraryConfigService.getSettings(tenantId, schoolId, data.libraryId);
    const maxReservations = settings.maxActiveReservations || 3;
    const activeCount = await LibraryReservation.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      memberId: member._id,
      status: { $in: [ReservationStatus.PENDING, ReservationStatus.READY] },
      isDeleted: false,
    });
    if (activeCount >= maxReservations) {
      throw new BadRequestError(`Reservation limit reached (maximum ${maxReservations} active reservations).`);
    }

    // Determine queue position
    const queueCount = await LibraryReservation.countDocuments({
      bookId: book._id,
      status: ReservationStatus.PENDING,
      isDeleted: false,
    });

    const reservation = await LibraryReservation.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      bookId: book._id,
      memberId: member._id,
      libraryId: new Types.ObjectId(data.libraryId),
      requestedAt: new Date(),
      status: ReservationStatus.PENDING,
      queuePosition: queueCount + 1,
      notes: data.notes,
    });

    return reservation;
  }

  public static async cancelReservation(tenantId: string, reservationId: string) {
    const reservation = await LibraryReservation.findOne({
      _id: new Types.ObjectId(reservationId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!reservation) {
      throw new NotFoundError('Reservation not found.');
    }

    if (reservation.status !== ReservationStatus.PENDING && reservation.status !== ReservationStatus.READY) {
      throw new BadRequestError('Only pending or ready reservations can be cancelled.');
    }

    // If reservation was READY and held a physical copy, free the copy or pass to next in queue
    if (reservation.bookCopyId) {
      const nextInLine = await LibraryReservation.findOne({
        bookId: reservation.bookId,
        status: ReservationStatus.PENDING,
        isDeleted: false,
      }).sort({ queuePosition: 1, requestedAt: 1 });

      if (nextInLine) {
        nextInLine.status = ReservationStatus.READY;
        nextInLine.bookCopyId = reservation.bookCopyId;
        nextInLine.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await nextInLine.save();
      } else {
        await BookCopy.findByIdAndUpdate(reservation.bookCopyId, {
          status: BookCopyStatus.AVAILABLE,
        });
      }
    }

    reservation.status = ReservationStatus.CANCELLED;
    await reservation.save();

    await CatalogService.syncBookCounters(reservation.bookId.toString());
    return { success: true, message: 'Reservation cancelled.' };
  }

  public static async getReservations(
    tenantId: string,
    filters: {
      bookId?: string;
      memberId?: string;
      libraryId?: string;
      status?: ReservationStatus;
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

    if (filters.bookId) query.bookId = new Types.ObjectId(filters.bookId);
    if (filters.memberId) query.memberId = new Types.ObjectId(filters.memberId);
    if (filters.libraryId) query.libraryId = new Types.ObjectId(filters.libraryId);
    if (filters.status) query.status = filters.status;

    const [items, total] = await Promise.all([
      LibraryReservation.find(query)
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
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit),
      LibraryReservation.countDocuments(query),
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
