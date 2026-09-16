import { Schema, model, Types, Document } from 'mongoose';
import {
  ILibrary,
  ILibrarySetting,
  ILibraryAuthor,
  ILibraryPublisher,
  ILibraryCategory,
  ILibraryShelf,
  IBook,
  IBookCopy,
  ILibraryMember,
  ILibraryCirculation,
  ILibraryReservation,
  ILibraryFine,
  ILibraryWithdrawal,
  BookCopyStatus,
  BookCondition,
  LibraryMemberType,
  LibraryMemberStatus,
  CirculationStatus,
  ReservationStatus,
  LibraryFineType,
  LibraryFineStatus,
  FineCalculationMethod,
  BookWithdrawalReason,
  DamagedBookAction,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

// ============================================================================
// Document Interfaces
// ============================================================================

export interface ILibraryDoc extends Omit<ILibrary, 'id' | 'tenantId' | 'schoolId' | 'campusId'>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  campusId: Types.ObjectId;
}

export interface ILibrarySettingDoc extends Omit<ILibrarySetting, 'id' | 'tenantId' | 'schoolId' | 'libraryId'>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  libraryId?: Types.ObjectId;
}

export interface ILibraryAuthorDoc extends Omit<ILibraryAuthor, 'id' | 'tenantId' | 'schoolId'>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface ILibraryPublisherDoc extends Omit<ILibraryPublisher, 'id' | 'tenantId' | 'schoolId'>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface ILibraryCategoryDoc extends Omit<ILibraryCategory, 'id' | 'tenantId' | 'schoolId'>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface ILibraryShelfDoc extends Omit<ILibraryShelf, 'id' | 'tenantId' | 'schoolId' | 'libraryId'>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  libraryId: Types.ObjectId;
}

export interface IBookDoc extends Omit<
  IBook,
  'id' | 'tenantId' | 'schoolId' | 'authorIds' | 'publisherId' | 'categoryId' | 'subjectId'
>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  authorIds?: Types.ObjectId[];
  publisherId?: Types.ObjectId;
  categoryId?: Types.ObjectId;
  subjectId?: Types.ObjectId;
}

export interface IBookCopyDoc extends Omit<
  IBookCopy,
  'id' | 'tenantId' | 'schoolId' | 'bookId' | 'libraryId' | 'shelfId'
>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  bookId: Types.ObjectId;
  libraryId: Types.ObjectId;
  shelfId?: Types.ObjectId;
}

export interface ILibraryMemberDoc extends Omit<
  ILibraryMember,
  'id' | 'tenantId' | 'schoolId' | 'studentId' | 'employeeId' | 'userId' | 'libraryId'
>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  userId: Types.ObjectId;
  libraryId?: Types.ObjectId;
}

export interface ILibraryCirculationDoc extends Omit<
  ILibraryCirculation,
  'id' | 'tenantId' | 'schoolId' | 'libraryId' | 'bookCopyId' | 'bookId' | 'memberId' | 'borrowerId' | 'userId' | 'issuedBy' | 'returnedBy'
>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  libraryId: Types.ObjectId;
  bookCopyId: Types.ObjectId;
  bookId: Types.ObjectId;
  memberId: Types.ObjectId;
  borrowerId: Types.ObjectId;
  userId: Types.ObjectId;
  issuedBy: Types.ObjectId;
  returnedBy?: Types.ObjectId;
}

export type ILibraryTransactionDoc = ILibraryCirculationDoc;

export interface ILibraryReservationDoc extends Omit<
  ILibraryReservation,
  'id' | 'tenantId' | 'schoolId' | 'bookId' | 'bookCopyId' | 'memberId' | 'libraryId'
>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  bookId: Types.ObjectId;
  bookCopyId?: Types.ObjectId;
  memberId: Types.ObjectId;
  libraryId: Types.ObjectId;
}

export interface ILibraryFineDoc extends Omit<
  ILibraryFine,
  'id' | 'tenantId' | 'schoolId' | 'memberId' | 'circulationId' | 'bookId' | 'bookCopyId' | 'waivedBy'
>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  memberId: Types.ObjectId;
  circulationId?: Types.ObjectId;
  bookId?: Types.ObjectId;
  bookCopyId?: Types.ObjectId;
  waivedBy?: Types.ObjectId;
}

export interface ILibraryWithdrawalDoc extends Omit<
  ILibraryWithdrawal,
  'id' | 'tenantId' | 'schoolId' | 'bookCopyId' | 'bookId' | 'withdrawnBy'
>, Document {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  bookCopyId: Types.ObjectId;
  bookId: Types.ObjectId;
  withdrawnBy: Types.ObjectId;
}

// ============================================================================
// 1. Library Schema
// ============================================================================
const LibrarySchema = new Schema<ILibraryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    address: { type: String, trim: true },
    contactDetails: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    operatingHours: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibrarySchema.plugin(tenantPlugin);
LibrarySchema.plugin(softDeletePlugin);
LibrarySchema.index({ tenantId: 1, schoolId: 1, code: 1, isDeleted: 1 }, { unique: true });

// ============================================================================
// 2. LibrarySetting Schema
// ============================================================================
const LibrarySettingSchema = new Schema<ILibrarySettingDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library' },
    defaultLoanDurationDays: { type: Number, required: true, default: 14, min: 1 },
    maxBooksPerMember: {
      student: { type: Number, default: 3, min: 1 },
      teacher: { type: Number, default: 10, min: 1 },
      staff: { type: Number, default: 5, min: 1 },
    },
    maxRenewals: { type: Number, default: 2, min: 0 },
    renewalExtensionDays: { type: Number, default: 14, min: 1 },
    fineCalculationMethod: {
      type: String,
      enum: Object.values(FineCalculationMethod),
      default: FineCalculationMethod.DAILY_RATE,
    },
    finePerDay: { type: Number, default: 100, min: 0 }, // 100 minor units ($1.00 or 1.00)
    fineGracePeriodDays: { type: Number, default: 2, min: 0 },
    maxFineCap: { type: Number, default: 100000, min: 0 }, // 100,000 minor units
    reservationExpiryDays: { type: Number, default: 3, min: 1 },
    maxActiveReservations: { type: Number, default: 3, min: 1 },
    lostBookReplacementFeeMultiplier: { type: Number, default: 1.5, min: 1 },
    damagedBookDefaultFee: { type: Number, default: 5000, min: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibrarySettingSchema.plugin(tenantPlugin);
LibrarySettingSchema.plugin(softDeletePlugin);
LibrarySettingSchema.index({ tenantId: 1, schoolId: 1, libraryId: 1, isDeleted: 1 }, { unique: true });

// ============================================================================
// 3. LibraryAuthor Schema
// ============================================================================
const LibraryAuthorSchema = new Schema<ILibraryAuthorDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    biography: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryAuthorSchema.plugin(tenantPlugin);
LibraryAuthorSchema.plugin(softDeletePlugin);
LibraryAuthorSchema.index({ tenantId: 1, schoolId: 1, name: 1, isDeleted: 1 }, { unique: true });

// ============================================================================
// 4. LibraryPublisher Schema
// ============================================================================
const LibraryPublisherSchema = new Schema<ILibraryPublisherDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    contact: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryPublisherSchema.plugin(tenantPlugin);
LibraryPublisherSchema.plugin(softDeletePlugin);
LibraryPublisherSchema.index({ tenantId: 1, schoolId: 1, name: 1, isDeleted: 1 }, { unique: true });

// ============================================================================
// 5. LibraryCategory Schema
// ============================================================================
const LibraryCategorySchema = new Schema<ILibraryCategoryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryCategorySchema.plugin(tenantPlugin);
LibraryCategorySchema.plugin(softDeletePlugin);
LibraryCategorySchema.index({ tenantId: 1, schoolId: 1, code: 1, isDeleted: 1 }, { unique: true });

// ============================================================================
// 6. LibraryShelf Schema
// ============================================================================
const LibraryShelfSchema = new Schema<ILibraryShelfDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true, index: true },
    room: { type: String, trim: true },
    rack: { type: String, required: true, trim: true },
    shelf: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryShelfSchema.plugin(tenantPlugin);
LibraryShelfSchema.plugin(softDeletePlugin);
LibraryShelfSchema.index({ tenantId: 1, libraryId: 1, code: 1, isDeleted: 1 }, { unique: true });

// ============================================================================
// 7. Book Schema (Bibliographic Metadata)
// ============================================================================
const BookSchema = new Schema<IBookDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    subtitle: { type: String, trim: true },
    isbn10: { type: String, trim: true },
    isbn13: { type: String, trim: true },
    isbn: { type: String, trim: true },
    authorIds: [{ type: Schema.Types.ObjectId, ref: 'LibraryAuthor' }],
    publisherId: { type: Schema.Types.ObjectId, ref: 'LibraryPublisher' },
    publicationYear: { type: Number, min: 1000, max: 2100 },
    edition: { type: String, trim: true },
    language: { type: String, default: 'English', trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'LibraryCategory', index: true },
    category: { type: String, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
    description: { type: String, trim: true },
    pages: { type: Number, min: 1 },
    coverImage: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    totalCopies: { type: Number, required: true, min: 0, default: 0 },
    availableCopies: { type: Number, required: true, min: 0, default: 0 },
    issuedCopies: { type: Number, required: true, min: 0, default: 0 },
    reservedCopies: { type: Number, required: true, min: 0, default: 0 },
    lostCopies: { type: Number, required: true, min: 0, default: 0 },
    damagedCopies: { type: Number, required: true, min: 0, default: 0 },
    withdrawnCopies: { type: Number, required: true, min: 0, default: 0 },
    shelfLocation: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
BookSchema.plugin(tenantPlugin);
BookSchema.plugin(softDeletePlugin);
BookSchema.index({ tenantId: 1, schoolId: 1, isbn13: 1 }, { sparse: true });
BookSchema.index({ tenantId: 1, schoolId: 1, title: 1 });
BookSchema.index({ tenantId: 1, schoolId: 1, categoryId: 1 });

// ============================================================================
// 8. BookCopy Schema (Physical Copy)
// ============================================================================
const BookCopySchema = new Schema<IBookCopyDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true, index: true },
    shelfId: { type: Schema.Types.ObjectId, ref: 'LibraryShelf' },
    accessionNumber: { type: String, required: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true },
    purchaseDate: { type: Date },
    acquisitionCost: { type: Number, min: 0, default: 0 },
    source: { type: String, trim: true },
    condition: {
      type: String,
      enum: Object.values(BookCondition),
      default: BookCondition.GOOD,
      required: true,
    },
    conditionHistory: [
      {
        condition: { type: String, enum: Object.values(BookCondition), required: true },
        notes: { type: String, trim: true },
        changedBy: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: Object.values(BookCopyStatus),
      default: BookCopyStatus.AVAILABLE,
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
BookCopySchema.plugin(tenantPlugin);
BookCopySchema.plugin(softDeletePlugin);
BookCopySchema.index({ tenantId: 1, accessionNumber: 1, isDeleted: 1 }, { unique: true });
BookCopySchema.index({ tenantId: 1, barcode: 1 }, { sparse: true, unique: true });
BookCopySchema.index({ tenantId: 1, bookId: 1, status: 1 });
BookCopySchema.index({ tenantId: 1, libraryId: 1, status: 1 });

// ============================================================================
// 9. LibraryMember Schema
// ============================================================================
const LibraryMemberSchema = new Schema<ILibraryMemberDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    memberNumber: { type: String, required: true, uppercase: true, trim: true },
    memberType: {
      type: String,
      enum: Object.values(LibraryMemberType),
      required: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', sparse: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', sparse: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library' },
    membershipStart: { type: Date, required: true, default: Date.now },
    membershipEnd: { type: Date },
    status: {
      type: String,
      enum: Object.values(LibraryMemberStatus),
      default: LibraryMemberStatus.ACTIVE,
      required: true,
      index: true,
    },
    maxBooks: { type: Number, min: 1 },
    activeLoansCount: { type: Number, default: 0, min: 0 },
    totalFinesUnpaid: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryMemberSchema.plugin(tenantPlugin);
LibraryMemberSchema.plugin(softDeletePlugin);
LibraryMemberSchema.index({ tenantId: 1, memberNumber: 1, isDeleted: 1 }, { unique: true });
LibraryMemberSchema.index({ tenantId: 1, schoolId: 1, studentId: 1 }, { sparse: true });
LibraryMemberSchema.index({ tenantId: 1, schoolId: 1, employeeId: 1 }, { sparse: true });
LibraryMemberSchema.index({ tenantId: 1, schoolId: 1, userId: 1 });

// ============================================================================
// 10. LibraryCirculation Schema
// ============================================================================
const LibraryCirculationSchema = new Schema<ILibraryCirculationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true, index: true },
    bookCopyId: { type: Schema.Types.ObjectId, ref: 'BookCopy', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'LibraryMember', required: true, index: true },
    borrowerType: {
      type: String,
      enum: Object.values(LibraryMemberType),
      required: true,
    },
    borrowerId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    dueAt: { type: Date, required: true, index: true },
    returnedAt: { type: Date },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    returnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: Object.values(CirculationStatus),
      default: CirculationStatus.ISSUED,
      required: true,
      index: true,
    },
    renewalCount: { type: Number, default: 0, min: 0 },
    maxRenewals: { type: Number, default: 2, min: 0 },
    fineAmount: { type: Number, default: 0, min: 0 },
    finePaid: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryCirculationSchema.plugin(tenantPlugin);
LibraryCirculationSchema.plugin(softDeletePlugin);
LibraryCirculationSchema.index({ tenantId: 1, bookCopyId: 1, status: 1 });
LibraryCirculationSchema.index({ tenantId: 1, memberId: 1, status: 1 });
LibraryCirculationSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

// ============================================================================
// 11. LibraryReservation Schema
// ============================================================================
const LibraryReservationSchema = new Schema<ILibraryReservationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    bookCopyId: { type: Schema.Types.ObjectId, ref: 'BookCopy' },
    memberId: { type: Schema.Types.ObjectId, ref: 'LibraryMember', required: true, index: true },
    libraryId: { type: Schema.Types.ObjectId, ref: 'Library', required: true },
    requestedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date },
    fulfilledAt: { type: Date },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.PENDING,
      required: true,
      index: true,
    },
    queuePosition: { type: Number, default: 1 },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryReservationSchema.plugin(tenantPlugin);
LibraryReservationSchema.plugin(softDeletePlugin);
LibraryReservationSchema.index({ tenantId: 1, bookId: 1, status: 1 });
LibraryReservationSchema.index({ tenantId: 1, memberId: 1, status: 1 });

// ============================================================================
// 12. LibraryFine Schema
// ============================================================================
const LibraryFineSchema = new Schema<ILibraryFineDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'LibraryMember', required: true, index: true },
    circulationId: { type: Schema.Types.ObjectId, ref: 'LibraryCirculation' },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book' },
    bookCopyId: { type: Schema.Types.ObjectId, ref: 'BookCopy' },
    type: {
      type: String,
      enum: Object.values(LibraryFineType),
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    outstandingAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(LibraryFineStatus),
      default: LibraryFineStatus.PENDING,
      required: true,
      index: true,
    },
    assessedAt: { type: Date, required: true, default: Date.now },
    settledAt: { type: Date },
    paymentReference: { type: String, trim: true },
    waivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    waiverReason: { type: String, trim: true },
    waivedAmount: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryFineSchema.plugin(tenantPlugin);
LibraryFineSchema.plugin(softDeletePlugin);
LibraryFineSchema.index({ tenantId: 1, memberId: 1, status: 1 });
LibraryFineSchema.index({ tenantId: 1, circulationId: 1 });

// ============================================================================
// 13. LibraryWithdrawal Schema
// ============================================================================
const LibraryWithdrawalSchema = new Schema<ILibraryWithdrawalDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    bookCopyId: { type: Schema.Types.ObjectId, ref: 'BookCopy', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    reason: {
      type: String,
      enum: Object.values(BookWithdrawalReason),
      required: true,
    },
    notes: { type: String, trim: true },
    withdrawnBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    withdrawnAt: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryWithdrawalSchema.plugin(tenantPlugin);
LibraryWithdrawalSchema.plugin(softDeletePlugin);
LibraryWithdrawalSchema.index({ tenantId: 1, bookCopyId: 1 });

// ============================================================================
// Models Export
// ============================================================================
export const Library = model<ILibraryDoc>('Library', LibrarySchema);
export const LibrarySetting = model<ILibrarySettingDoc>('LibrarySetting', LibrarySettingSchema);
export const LibraryAuthor = model<ILibraryAuthorDoc>('LibraryAuthor', LibraryAuthorSchema);
export const LibraryPublisher = model<ILibraryPublisherDoc>('LibraryPublisher', LibraryPublisherSchema);
export const LibraryCategory = model<ILibraryCategoryDoc>('LibraryCategory', LibraryCategorySchema);
export const LibraryShelf = model<ILibraryShelfDoc>('LibraryShelf', LibraryShelfSchema);
export const Book = model<IBookDoc>('Book', BookSchema);
export const BookCopy = model<IBookCopyDoc>('BookCopy', BookCopySchema);
export const LibraryMember = model<ILibraryMemberDoc>('LibraryMember', LibraryMemberSchema);
export const LibraryCirculation = model<ILibraryCirculationDoc>('LibraryCirculation', LibraryCirculationSchema);
export const LibraryTransaction = LibraryCirculation; // Alias for backward compatibility
export const LibraryReservation = model<ILibraryReservationDoc>('LibraryReservation', LibraryReservationSchema);
export const LibraryFine = model<ILibraryFineDoc>('LibraryFine', LibraryFineSchema);
export const LibraryWithdrawal = model<ILibraryWithdrawalDoc>('LibraryWithdrawal', LibraryWithdrawalSchema);

