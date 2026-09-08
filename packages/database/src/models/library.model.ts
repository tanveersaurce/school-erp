import { Schema, model, Types } from 'mongoose';
import {
  IBook,
  IBookCopy,
  ILibraryTransaction,
  BookCopyStatus,
  LibraryBorrowerType,
  LibraryTxnStatus,
} from '@edusphere/types';
import { tenantPlugin } from '../plugins/tenantPlugin.js';
import { softDeletePlugin } from '../plugins/softDeletePlugin.js';

export interface IBookDoc extends Omit<IBook, 'id' | 'tenantId' | 'schoolId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
}

export interface IBookCopyDoc extends Omit<IBookCopy, 'id' | 'tenantId' | 'schoolId' | 'bookId'> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  bookId: Types.ObjectId;
}

export interface ILibraryTransactionDoc extends Omit<
  ILibraryTransaction,
  | 'id'
  | 'tenantId'
  | 'schoolId'
  | 'bookCopyId'
  | 'bookId'
  | 'borrowerId'
  | 'issuedBy'
  | 'returnedTo'
> {
  tenantId: Types.ObjectId;
  schoolId: Types.ObjectId;
  bookCopyId: Types.ObjectId;
  bookId: Types.ObjectId;
  borrowerId: Types.ObjectId;
  issuedBy: Types.ObjectId;
  returnedTo?: Types.ObjectId;
}

// 1. Book Schema
const BookSchema = new Schema<IBookDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true },
    author: { type: String, required: true, trim: true },
    publisher: { type: String, trim: true },
    edition: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    totalCopies: { type: Number, required: true, min: 0, default: 1 },
    availableCopies: { type: Number, required: true, min: 0, default: 1 },
    shelfLocation: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
BookSchema.plugin(tenantPlugin);
BookSchema.plugin(softDeletePlugin);
BookSchema.index({ tenantId: 1, schoolId: 1, isbn: 1 }, { sparse: true });
BookSchema.index({ tenantId: 1, schoolId: 1, title: 1 });

// 2. BookCopy Schema
const BookCopySchema = new Schema<IBookCopyDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    accessionNumber: { type: String, required: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ISSUED', 'LOST', 'DAMAGED', 'RESERVED'] as BookCopyStatus[],
      default: 'AVAILABLE',
      required: true,
      index: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: '__v' }
);
BookCopySchema.plugin(tenantPlugin);
BookCopySchema.plugin(softDeletePlugin);
BookCopySchema.index({ tenantId: 1, schoolId: 1, accessionNumber: 1 }, { unique: true });

// 3. LibraryTransaction Schema
const LibraryTransactionSchema = new Schema<ILibraryTransactionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    bookCopyId: { type: Schema.Types.ObjectId, ref: 'BookCopy', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    borrowerType: {
      type: String,
      enum: ['STUDENT', 'STAFF', 'TEACHER'] as LibraryBorrowerType[],
      required: true,
    },
    borrowerId: { type: Schema.Types.ObjectId, required: true, index: true },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true, index: true },
    returnDate: { type: Date },
    fineAmount: { type: Number, default: 0, min: 0 },
    finePaid: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['ISSUED', 'RETURNED', 'OVERDUE', 'LOST'] as LibraryTxnStatus[],
      default: 'ISSUED',
      required: true,
      index: true,
    },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    returnedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: '__v' }
);
LibraryTransactionSchema.plugin(tenantPlugin);
LibraryTransactionSchema.index({ tenantId: 1, bookCopyId: 1, status: 1 });
LibraryTransactionSchema.index({ tenantId: 1, borrowerId: 1, status: 1 });

export const Book = model<IBookDoc>('Book', BookSchema);
export const BookCopy = model<IBookCopyDoc>('BookCopy', BookCopySchema);
export const LibraryTransaction = model<ILibraryTransactionDoc>(
  'LibraryTransaction',
  LibraryTransactionSchema
);
