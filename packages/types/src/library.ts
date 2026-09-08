export interface IBook {
  id: string;
  tenantId: string;
  schoolId: string;
  title: string;
  isbn?: string;
  author: string;
  publisher?: string;
  edition?: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BookCopyStatus = 'AVAILABLE' | 'ISSUED' | 'LOST' | 'DAMAGED' | 'RESERVED';

export interface IBookCopy {
  id: string;
  tenantId: string;
  schoolId: string;
  bookId: string;
  accessionNumber: string;
  barcode?: string;
  status: BookCopyStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type LibraryBorrowerType = 'STUDENT' | 'STAFF' | 'TEACHER';
export type LibraryTxnStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';

export interface ILibraryTransaction {
  id: string;
  tenantId: string;
  schoolId: string;
  bookCopyId: string;
  bookId: string;
  borrowerType: LibraryBorrowerType;
  borrowerId: string;
  issueDate: Date;
  dueDate: Date;
  returnDate?: Date;
  fineAmount: number;
  finePaid: boolean;
  status: LibraryTxnStatus;
  issuedBy: string;
  returnedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}
