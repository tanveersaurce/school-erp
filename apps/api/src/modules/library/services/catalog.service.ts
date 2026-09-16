import { Types } from 'mongoose';
import {
  Book,
  BookCopy,
  LibraryWithdrawal,
} from '@edusphere/database';
import {
  BookCopyStatus,
  BookCondition,
  BookWithdrawalReason,
} from '@edusphere/common';
import { BadRequestError, NotFoundError } from '@edusphere/common';

export class CatalogService {
  // =========================================================================
  // ISBN Validation Helper
  // =========================================================================
  public static isValidISBN(isbn: string): boolean {
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (cleaned.length === 10) {
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i], 10) * (10 - i);
      }
      const lastChar = cleaned[9].toUpperCase();
      sum += lastChar === 'X' ? 10 : parseInt(lastChar, 10);
      return sum % 11 === 0;
    } else if (cleaned.length === 13) {
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i], 10) * (i % 2 === 0 ? 1 : 3);
      }
      const checksum = (10 - (sum % 10)) % 10;
      return checksum === parseInt(cleaned[12], 10);
    }
    return false;
  }

  // =========================================================================
  // Book Catalog Methods
  // =========================================================================
  public static async createBook(tenantId: string, schoolId: string, data: any) {
    if (data.isbn10 && !this.isValidISBN(data.isbn10)) {
      throw new BadRequestError('Invalid ISBN-10 format or checksum.');
    }
    if (data.isbn13 && !this.isValidISBN(data.isbn13)) {
      throw new BadRequestError('Invalid ISBN-13 format or checksum.');
    }

    const book = await Book.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      title: data.title.trim(),
      subtitle: data.subtitle?.trim(),
      isbn10: data.isbn10?.trim(),
      isbn13: data.isbn13?.trim(),
      isbn: data.isbn13 || data.isbn10 || data.isbn,
      authorIds: data.authorIds?.map((id: string) => new Types.ObjectId(id)),
      publisherId: data.publisherId ? new Types.ObjectId(data.publisherId) : undefined,
      publicationYear: data.publicationYear,
      edition: data.edition?.trim(),
      language: data.language?.trim() || 'English',
      categoryId: data.categoryId ? new Types.ObjectId(data.categoryId) : undefined,
      category: data.category?.trim(),
      subjectId: data.subjectId ? new Types.ObjectId(data.subjectId) : undefined,
      description: data.description?.trim(),
      pages: data.pages,
      coverImage: data.coverImage,
      tags: data.tags,
      keywords: data.keywords,
      shelfLocation: data.shelfLocation,
      totalCopies: 0,
      availableCopies: 0,
      issuedCopies: 0,
      reservedCopies: 0,
      lostCopies: 0,
      damagedCopies: 0,
      withdrawnCopies: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return book;
  }

  public static async getBooks(
    tenantId: string,
    schoolId: string,
    filters: {
      search?: string;
      categoryId?: string;
      authorId?: string;
      subjectId?: string;
      availableOnly?: boolean;
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

    if (filters.categoryId) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }
    if (filters.authorId) {
      query.authorIds = new Types.ObjectId(filters.authorId);
    }
    if (filters.subjectId) {
      query.subjectId = new Types.ObjectId(filters.subjectId);
    }
    if (filters.availableOnly) {
      query.availableCopies = { $gt: 0 };
    }
    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { subtitle: searchRegex },
        { isbn10: searchRegex },
        { isbn13: searchRegex },
        { tags: searchRegex },
        { keywords: searchRegex },
      ];
    }

    const [items, total] = await Promise.all([
      Book.find(query)
        .populate('authorIds', 'name')
        .populate('publisherId', 'name')
        .populate('categoryId', 'name code')
        .populate('subjectId', 'name code')
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit),
      Book.countDocuments(query),
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

  public static async getBookById(tenantId: string, bookId: string) {
    const book = await Book.findOne({
      _id: new Types.ObjectId(bookId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('authorIds', 'name biography')
      .populate('publisherId', 'name contact website address')
      .populate('categoryId', 'name code description')
      .populate('subjectId', 'name code');

    if (!book) {
      throw new NotFoundError('Book title not found.');
    }
    return book;
  }

  public static async updateBook(tenantId: string, bookId: string, data: any) {
    const book = await Book.findOne({
      _id: new Types.ObjectId(bookId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!book) {
      throw new NotFoundError('Book title not found.');
    }

    if (data.isbn10 && !this.isValidISBN(data.isbn10)) {
      throw new BadRequestError('Invalid ISBN-10 format.');
    }
    if (data.isbn13 && !this.isValidISBN(data.isbn13)) {
      throw new BadRequestError('Invalid ISBN-13 format.');
    }

    if (data.title) book.title = data.title.trim();
    if (data.subtitle !== undefined) book.subtitle = data.subtitle;
    if (data.isbn10 !== undefined) book.isbn10 = data.isbn10;
    if (data.isbn13 !== undefined) book.isbn13 = data.isbn13;
    if (data.authorIds) book.authorIds = data.authorIds.map((id: string) => new Types.ObjectId(id));
    if (data.publisherId !== undefined) book.publisherId = data.publisherId ? new Types.ObjectId(data.publisherId) : undefined;
    if (data.publicationYear !== undefined) book.publicationYear = data.publicationYear;
    if (data.edition !== undefined) book.edition = data.edition;
    if (data.language !== undefined) book.language = data.language;
    if (data.categoryId !== undefined) book.categoryId = data.categoryId ? new Types.ObjectId(data.categoryId) : undefined;
    if (data.subjectId !== undefined) book.subjectId = data.subjectId ? new Types.ObjectId(data.subjectId) : undefined;
    if (data.description !== undefined) book.description = data.description;
    if (data.pages !== undefined) book.pages = data.pages;
    if (data.coverImage !== undefined) book.coverImage = data.coverImage;
    if (data.tags !== undefined) book.tags = data.tags;
    if (data.shelfLocation !== undefined) book.shelfLocation = data.shelfLocation;
    if (data.isActive !== undefined) book.isActive = data.isActive;

    await book.save();
    return book;
  }

  public static async archiveBook(tenantId: string, bookId: string) {
    const book = await Book.findOne({
      _id: new Types.ObjectId(bookId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!book) {
      throw new NotFoundError('Book title not found.');
    }

    const activeCopiesCount = await BookCopy.countDocuments({
      bookId: book._id,
      status: BookCopyStatus.ISSUED,
      isDeleted: false,
    });

    if (activeCopiesCount > 0) {
      throw new BadRequestError('Cannot archive book with actively issued copies.');
    }

    book.isDeleted = true;
    book.isActive = false;
    await book.save();
    return { success: true, message: 'Book catalog entry archived.' };
  }

  // =========================================================================
  // Book Copy Management
  // =========================================================================
  public static async addCopies(
    tenantId: string,
    schoolId: string,
    bookId: string,
    data: {
      libraryId: string;
      shelfId?: string;
      quantity?: number;
      accessionNumber?: string;
      barcode?: string;
      acquisitionCost?: number;
      purchaseDate?: Date;
      source?: string;
      condition?: BookCondition;
    }
  ) {
    const book = await Book.findOne({
      _id: new Types.ObjectId(bookId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!book) {
      throw new NotFoundError('Book title not found.');
    }

    const quantity = Math.max(1, data.quantity || 1);
    const copiesCreated = [];

    for (let i = 0; i < quantity; i++) {
      let accession = data.accessionNumber?.toUpperCase().trim();
      if (!accession || quantity > 1) {
        // Auto-generate accession number: ACC-YYYY-XXXXX
        const count = await BookCopy.countDocuments({
          tenantId: new Types.ObjectId(tenantId),
        });
        accession = `ACC-${new Date().getFullYear()}-${String(count + 1 + i).padStart(5, '0')}`;
      }

      const existing = await BookCopy.findOne({
        tenantId: new Types.ObjectId(tenantId),
        accessionNumber: accession,
        isDeleted: false,
      });
      if (existing) {
        throw new BadRequestError(`Accession number '${accession}' already exists.`);
      }

      const copy = await BookCopy.create({
        tenantId: new Types.ObjectId(tenantId),
        schoolId: new Types.ObjectId(schoolId),
        bookId: book._id,
        libraryId: new Types.ObjectId(data.libraryId),
        shelfId: data.shelfId ? new Types.ObjectId(data.shelfId) : undefined,
        accessionNumber: accession,
        barcode: data.barcode || accession,
        purchaseDate: data.purchaseDate || new Date(),
        acquisitionCost: data.acquisitionCost || 0,
        source: data.source,
        condition: data.condition || BookCondition.NEW,
        status: BookCopyStatus.AVAILABLE,
        conditionHistory: [
          {
            condition: data.condition || BookCondition.NEW,
            notes: 'Initial acquisition',
            changedBy: 'System/Librarian',
            changedAt: new Date(),
          },
        ],
      });
      copiesCreated.push(copy);
    }

    // Refresh Book counters
    await this.syncBookCounters(book._id.toString());

    return copiesCreated;
  }

  public static async getCopies(
    tenantId: string,
    bookId?: string,
    libraryId?: string,
    status?: BookCopyStatus
  ) {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };
    if (bookId) filter.bookId = new Types.ObjectId(bookId);
    if (libraryId) filter.libraryId = new Types.ObjectId(libraryId);
    if (status) filter.status = status;

    return BookCopy.find(filter)
      .populate('bookId', 'title isbn13 author')
      .populate('libraryId', 'name code')
      .populate('shelfId', 'rack shelf code')
      .sort({ accessionNumber: 1 });
  }

  public static async getCopyByAccessionOrBarcode(
    tenantId: string,
    identifier: string
  ) {
    const trimmed = identifier.trim();
    const copy = await BookCopy.findOne({
      tenantId: new Types.ObjectId(tenantId),
      $or: [
        { accessionNumber: trimmed.toUpperCase() },
        { barcode: trimmed },
      ],
      isDeleted: false,
    })
      .populate('bookId', 'title author coverImage')
      .populate('libraryId', 'name code')
      .populate('shelfId', 'rack shelf code');

    if (!copy) {
      throw new NotFoundError(`Book copy with identifier '${identifier}' not found.`);
    }
    return copy;
  }

  public static async updateCopyCondition(
    tenantId: string,
    copyId: string,
    data: { condition: BookCondition; notes?: string; changedBy: string }
  ) {
    const copy = await BookCopy.findOne({
      _id: new Types.ObjectId(copyId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!copy) {
      throw new NotFoundError('Book copy not found.');
    }

    copy.condition = data.condition;
    copy.conditionHistory = copy.conditionHistory || [];
    copy.conditionHistory.push({
      condition: data.condition,
      notes: data.notes,
      changedBy: data.changedBy,
      changedAt: new Date(),
    });

    if (data.condition === BookCondition.DAMAGED) {
      copy.status = BookCopyStatus.DAMAGED;
    } else if (data.condition === BookCondition.LOST) {
      copy.status = BookCopyStatus.LOST;
    }

    await copy.save();
    await this.syncBookCounters(copy.bookId.toString());
    return copy;
  }

  public static async withdrawCopy(
    tenantId: string,
    schoolId: string,
    copyId: string,
    data: { reason: BookWithdrawalReason; notes?: string; withdrawnBy: string }
  ) {
    const copy = await BookCopy.findOne({
      _id: new Types.ObjectId(copyId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
    if (!copy) {
      throw new NotFoundError('Book copy not found.');
    }

    if (copy.status === BookCopyStatus.ISSUED) {
      throw new BadRequestError('Cannot withdraw an actively issued book copy.');
    }

    copy.status = BookCopyStatus.WITHDRAWN;
    copy.isActive = false;
    await copy.save();

    await LibraryWithdrawal.create({
      tenantId: new Types.ObjectId(tenantId),
      schoolId: new Types.ObjectId(schoolId),
      bookCopyId: copy._id,
      bookId: copy.bookId,
      reason: data.reason,
      notes: data.notes,
      withdrawnBy: new Types.ObjectId(data.withdrawnBy),
      withdrawnAt: new Date(),
    });

    await this.syncBookCounters(copy.bookId.toString());
    return { success: true, message: 'Book copy successfully withdrawn.' };
  }

  // =========================================================================
  // Counter Sync Helper
  // =========================================================================
  public static async syncBookCounters(bookId: string) {
    const bookOid = new Types.ObjectId(bookId);

    const counts = await BookCopy.aggregate([
      { $match: { bookId: bookOid, isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap: Record<string, number> = {};
    counts.forEach((c) => {
      statusMap[c._id] = c.count;
    });

    const total = await BookCopy.countDocuments({ bookId: bookOid, isDeleted: false });

    await Book.findByIdAndUpdate(bookOid, {
      totalCopies: total,
      availableCopies: statusMap[BookCopyStatus.AVAILABLE] || 0,
      issuedCopies: statusMap[BookCopyStatus.ISSUED] || 0,
      reservedCopies: statusMap[BookCopyStatus.RESERVED] || 0,
      lostCopies: statusMap[BookCopyStatus.LOST] || 0,
      damagedCopies: statusMap[BookCopyStatus.DAMAGED] || 0,
      withdrawnCopies: statusMap[BookCopyStatus.WITHDRAWN] || 0,
    });
  }
}
