import {
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
} from '@edusphere/common';

export {
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
};

// Legacy backward-compatibility aliases
export type LibraryBorrowerType = 'STUDENT' | 'STAFF' | 'TEACHER';
export type LibraryTxnStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';

export interface ILibrary {
  id: string;
  tenantId: string;
  schoolId: string;
  campusId: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  contactDetails?: {
    email?: string;
    phone?: string;
  };
  operatingHours?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILibrarySetting {
  id: string;
  tenantId: string;
  schoolId: string;
  libraryId?: string;
  defaultLoanDurationDays: number;
  maxBooksPerMember: {
    student: number;
    teacher: number;
    staff: number;
  };
  maxRenewals: number;
  renewalExtensionDays: number;
  fineCalculationMethod: FineCalculationMethod;
  finePerDay: number; // Integer minor units (e.g. 100 paise = 1 INR / 100 cents = $1.00)
  fineGracePeriodDays: number;
  maxFineCap: number; // Integer minor units
  reservationExpiryDays: number;
  maxActiveReservations: number;
  lostBookReplacementFeeMultiplier: number;
  damagedBookDefaultFee: number; // Integer minor units
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILibraryAuthor {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  biography?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILibraryPublisher {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  contact?: string;
  website?: string;
  address?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILibraryCategory {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILibraryShelf {
  id: string;
  tenantId: string;
  schoolId: string;
  libraryId: string;
  room?: string;
  rack: string;
  shelf: string;
  code: string;
  name?: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBook {
  id: string;
  tenantId: string;
  schoolId: string;
  title: string;
  subtitle?: string;
  isbn10?: string;
  isbn13?: string;
  isbn?: string; // legacy support
  authorIds?: string[];
  authors?: ILibraryAuthor[];
  author?: string; // legacy fallback
  publisherId?: string;
  publisher?: string | ILibraryPublisher;
  publicationYear?: number;
  edition?: string;
  language?: string;
  categoryId?: string;
  category: string | ILibraryCategory;
  subjectId?: string;
  description?: string;
  pages?: number;
  coverImage?: string;
  tags?: string[];
  keywords?: string[];
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  reservedCopies: number;
  lostCopies: number;
  damagedCopies: number;
  withdrawnCopies: number;
  shelfLocation?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookCopyConditionHistory {
  condition: BookCondition;
  notes?: string;
  changedBy: string;
  changedAt: Date;
}

export interface IBookCopy {
  id: string;
  tenantId: string;
  schoolId: string;
  bookId: string;
  libraryId: string;
  shelfId?: string;
  accessionNumber: string;
  barcode?: string;
  purchaseDate?: Date;
  acquisitionCost?: number; // Integer minor units
  source?: string;
  condition: BookCondition;
  conditionHistory?: IBookCopyConditionHistory[];
  status: BookCopyStatus;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  book?: IBook;
  shelf?: ILibraryShelf;
}

export interface ILibraryMember {
  id: string;
  tenantId: string;
  schoolId: string;
  memberNumber: string;
  memberType: LibraryMemberType;
  studentId?: string;
  employeeId?: string;
  userId: string;
  libraryId?: string;
  membershipStart: Date;
  membershipEnd?: Date;
  status: LibraryMemberStatus;
  maxBooks?: number;
  activeLoansCount: number;
  totalFinesUnpaid: number; // Integer minor units
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  student?: any;
  employee?: any;
  user?: any;
}

export interface ILibraryCirculation {
  id: string;
  tenantId: string;
  schoolId: string;
  libraryId: string;
  bookCopyId: string;
  bookId: string;
  memberId: string;
  borrowerType: LibraryMemberType;
  borrowerId: string;
  userId: string;
  issuedAt: Date;
  dueAt: Date;
  returnedAt?: Date;
  issuedBy: string;
  returnedBy?: string;
  status: CirculationStatus;
  renewalCount: number;
  maxRenewals: number;
  fineAmount: number; // Integer minor units
  finePaid: boolean;
  notes?: string;
  idempotencyKey?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  book?: IBook;
  bookCopy?: IBookCopy;
  member?: ILibraryMember;
}

// Backward compatibility alias for ILibraryTransaction
export type ILibraryTransaction = ILibraryCirculation;

export interface ILibraryReservation {
  id: string;
  tenantId: string;
  schoolId: string;
  bookId: string;
  bookCopyId?: string;
  memberId: string;
  libraryId: string;
  requestedAt: Date;
  expiresAt?: Date;
  fulfilledAt?: Date;
  status: ReservationStatus;
  queuePosition?: number;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  book?: IBook;
  member?: ILibraryMember;
}

export interface ILibraryFine {
  id: string;
  tenantId: string;
  schoolId: string;
  memberId: string;
  circulationId?: string;
  bookId?: string;
  bookCopyId?: string;
  type: LibraryFineType;
  amount: number; // Integer minor units
  paidAmount: number; // Integer minor units
  outstandingAmount: number; // Integer minor units
  status: LibraryFineStatus;
  assessedAt: Date;
  settledAt?: Date;
  paymentReference?: string;
  waivedBy?: string;
  waiverReason?: string;
  waivedAmount?: number; // Integer minor units
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  member?: ILibraryMember;
  book?: IBook;
}

export interface ILibraryWithdrawal {
  id: string;
  tenantId: string;
  schoolId: string;
  bookCopyId: string;
  bookId: string;
  reason: BookWithdrawalReason;
  notes?: string;
  withdrawnBy: string;
  withdrawnAt: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  book?: IBook;
  bookCopy?: IBookCopy;
}

export interface ILibraryDashboardKPIs {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueCount: number;
  reservedCount: number;
  lostCopies: number;
  damagedCopies: number;
  withdrawnCopies: number;
  activeMembers: number;
  pendingReservations: number;
  totalOutstandingFines: number; // Integer minor units
}

