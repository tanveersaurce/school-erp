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
  CirculationStatus,
  ReservationStatus,
  LibraryFineStatus,
  LibraryMemberStatus,
} from '@edusphere/common';

export class LibraryReportsService {
  public static async getDashboardKPIs(tenantId: string, schoolId: string, libraryId?: string) {
    const tenantOid = new Types.ObjectId(tenantId);
    const schoolOid = new Types.ObjectId(schoolId);

    const baseFilter: any = { tenantId: tenantOid, isDeleted: false };
    const bookFilter: any = { tenantId: tenantOid, schoolId: schoolOid, isDeleted: false };
    const copyFilter: any = { tenantId: tenantOid, schoolId: schoolOid, isDeleted: false };
    const circFilter: any = { tenantId: tenantOid, schoolId: schoolOid, isDeleted: false };
    const resFilter: any = { tenantId: tenantOid, schoolId: schoolOid, isDeleted: false };
    const fineFilter: any = { tenantId: tenantOid, schoolId: schoolOid, isDeleted: false };

    if (libraryId) {
      const libOid = new Types.ObjectId(libraryId);
      copyFilter.libraryId = libOid;
      circFilter.libraryId = libOid;
      resFilter.libraryId = libOid;
    }

    const [
      totalBooks,
      copyAgg,
      activeMembers,
      pendingReservations,
      overdueCount,
      fineAgg,
    ] = await Promise.all([
      Book.countDocuments(bookFilter),
      BookCopy.aggregate([
        { $match: copyFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      LibraryMember.countDocuments({
        tenantId: tenantOid,
        schoolId: schoolOid,
        status: LibraryMemberStatus.ACTIVE,
        isDeleted: false,
      }),
      LibraryReservation.countDocuments({
        ...resFilter,
        status: { $in: [ReservationStatus.PENDING, ReservationStatus.READY] },
      }),
      LibraryCirculation.countDocuments({
        ...circFilter,
        status: { $in: [CirculationStatus.ISSUED, CirculationStatus.OVERDUE] },
        dueAt: { $lt: new Date() },
      }),
      LibraryFine.aggregate([
        {
          $match: {
            ...fineFilter,
            status: { $in: [LibraryFineStatus.PENDING, LibraryFineStatus.PARTIALLY_PAID] },
          },
        },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: '$outstandingAmount' },
          },
        },
      ]),
    ]);

    const copyStatusMap: Record<string, number> = {};
    let totalCopies = 0;
    copyAgg.forEach((c) => {
      copyStatusMap[c._id] = c.count;
      totalCopies += c.count;
    });

    return {
      totalBooks,
      totalCopies,
      availableCopies: copyStatusMap[BookCopyStatus.AVAILABLE] || 0,
      issuedCopies: copyStatusMap[BookCopyStatus.ISSUED] || 0,
      overdueCount,
      reservedCount: copyStatusMap[BookCopyStatus.RESERVED] || 0,
      lostCopies: copyStatusMap[BookCopyStatus.LOST] || 0,
      damagedCopies: copyStatusMap[BookCopyStatus.DAMAGED] || 0,
      withdrawnCopies: copyStatusMap[BookCopyStatus.WITHDRAWN] || 0,
      activeMembers,
      pendingReservations,
      totalOutstandingFines: fineAgg[0]?.totalOutstanding || 0,
    };
  }

  public static async getOverdueReport(tenantId: string, schoolId: string, libraryId?: string) {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      status: { $in: [CirculationStatus.ISSUED, CirculationStatus.OVERDUE] },
      dueAt: { $lt: new Date() },
      isDeleted: false,
    };
    if (libraryId) {
      query.libraryId = new Types.ObjectId(libraryId);
    }

    return LibraryCirculation.find(query)
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
      .sort({ dueAt: 1 });
  }

  public static async getPopularBooks(tenantId: string, schoolId: string, limit = 10) {
    const popularAgg = await LibraryCirculation.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          schoolId: new Types.ObjectId(schoolId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$bookId',
          checkoutCount: { $sum: 1 },
        },
      },
      { $sort: { checkoutCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: '$book' },
      {
        $project: {
          bookId: '$_id',
          title: '$book.title',
          author: '$book.author',
          coverImage: '$book.coverImage',
          checkoutCount: 1,
        },
      },
    ]);

    return popularAgg;
  }

  public static async getInventoryConditionReport(tenantId: string, schoolId: string) {
    const report = await BookCopy.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          schoolId: new Types.ObjectId(schoolId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { condition: '$condition', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    return report.map((r) => ({
      condition: r._id.condition,
      status: r._id.status,
      count: r.count,
    }));
  }
}
