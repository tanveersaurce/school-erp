import { z } from 'zod';
import {
  BookCondition,
  BookCopyStatus,
  BookWithdrawalReason,
  LibraryMemberType,
  LibraryMemberStatus,
  FineCalculationMethod,
} from '@edusphere/common';

export const createLibrarySchema = z.object({
  campusId: z.string().min(1, 'campusId is required'),
  name: z.string().min(1, 'name is required'),
  code: z.string().min(1, 'code is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  contactDetails: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  operatingHours: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateLibrarySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  contactDetails: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  operatingHours: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateSettingsSchema = z.object({
  libraryId: z.string().optional(),
  defaultLoanDurationDays: z.number().int().min(1).optional(),
  studentLoanPeriodDays: z.number().int().min(1).optional(),
  staffLoanPeriodDays: z.number().int().min(1).optional(),
  studentBorrowLimit: z.number().int().min(1).optional(),
  staffBorrowLimit: z.number().int().min(1).optional(),
  studentMaxRenewals: z.number().int().min(0).optional(),
  staffMaxRenewals: z.number().int().min(0).optional(),
  dailyFineRateMinorUnits: z.number().int().min(0).optional(),
  finePerDay: z.number().int().min(0).optional(),
  gracePeriodDays: z.number().int().min(0).optional(),
  fineGracePeriodDays: z.number().int().min(0).optional(),
  maxFinePerBookMinorUnits: z.number().int().min(0).optional(),
  maxFineCap: z.number().int().min(0).optional(),
  lostBookProcessingFeeMinorUnits: z.number().int().min(0).optional(),
  maxBooksPerMember: z
    .object({
      student: z.number().int().min(1).optional(),
      teacher: z.number().int().min(1).optional(),
      staff: z.number().int().min(1).optional(),
    })
    .optional(),
  maxRenewals: z.number().int().min(0).optional(),
  renewalExtensionDays: z.number().int().min(1).optional(),
  fineCalculationMethod: z.nativeEnum(FineCalculationMethod).optional(),
  reservationExpiryDays: z.number().int().min(1).optional(),
  maxActiveReservations: z.number().int().min(1).optional(),
  lostBookReplacementFeeMultiplier: z.number().min(1).optional(),
  damagedBookDefaultFee: z.number().int().min(0).optional(),
});

export const createAuthorSchema = z.object({
  name: z.string().min(1, 'Author name is required'),
  biography: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createPublisherSchema = z.object({
  name: z.string().min(1, 'Publisher name is required'),
  contact: z.string().optional(),
  contactEmail: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  code: z.string().min(1, 'Category code is required'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createShelfSchema = z.object({
  libraryId: z.string().min(1, 'libraryId is required'),
  room: z.string().optional(),
  rack: z.string().optional(),
  shelf: z.string().optional(),
  code: z.string().min(1, 'code is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  floor: z.string().optional(),
  aisle: z.string().optional(),
  capacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  isbn: z.string().optional(),
  isbn10: z.string().optional(),
  isbn13: z.string().optional(),
  authorIds: z.array(z.string()).optional(),
  publisherId: z.string().optional(),
  publicationYear: z.number().int().min(1000).max(2100).optional(),
  edition: z.string().optional(),
  language: z.string().optional(),
  categoryId: z.string().optional(),
  category: z.string().optional(),
  subjectId: z.string().optional(),
  description: z.string().optional(),
  pages: z.number().int().min(1).optional(),
  coverImage: z.string().optional(),
  priceMinorUnits: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  shelfLocation: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateBookSchema = createBookSchema.partial();

export const addCopiesSchema = z.object({
  libraryId: z.string().min(1, 'libraryId is required'),
  shelfId: z.string().optional(),
  quantity: z.number().int().min(1).max(100).optional(),
  accessionNumber: z.string().optional(),
  barcode: z.string().optional(),
  acquisitionCost: z.number().int().min(0).optional(),
  costMinorUnits: z.number().int().min(0).optional(),
  purchaseDate: z.string().datetime().or(z.date()).optional(),
  source: z.string().optional(),
  condition: z.nativeEnum(BookCondition).optional(),
});

export const updateCopyConditionSchema = z.object({
  condition: z.nativeEnum(BookCondition),
  notes: z.string().optional(),
});

export const withdrawCopySchema = z.object({
  reason: z.nativeEnum(BookWithdrawalReason),
  notes: z.string().optional(),
});

export const registerMemberSchema = z.object({
  memberNumber: z.string().optional(),
  memberType: z.nativeEnum(LibraryMemberType),
  studentId: z.string().optional(),
  employeeId: z.string().optional(),
  userId: z.string().optional(),
  libraryId: z.string().optional(),
  membershipStart: z.string().datetime().or(z.date()).optional(),
  membershipEnd: z.string().datetime().or(z.date()).optional(),
  maxBooks: z.number().int().min(1).optional(),
  maxBorrowLimit: z.number().int().min(1).optional(),
  notes: z.string().optional(),
});

export const updateMemberSchema = z.object({
  maxBooks: z.number().int().min(1).optional(),
  maxBorrowLimit: z.number().int().min(1).optional(),
  membershipEnd: z.string().datetime().or(z.date()).optional(),
  status: z.nativeEnum(LibraryMemberStatus).optional(),
  notes: z.string().optional(),
});

export const issueBookSchema = z.object({
  copyIdentifier: z.string().optional(),
  copyId: z.string().optional(),
  memberId: z.string().min(1, 'memberId is required'),
  libraryId: z.string().min(1, 'libraryId is required'),
  dueDateOverride: z.string().datetime().or(z.date()).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
}).refine(data => !!(data.copyIdentifier || data.copyId), {
  message: 'Either copyIdentifier or copyId must be provided',
});

export const returnBookSchema = z.object({
  circulationId: z.string().optional(),
  copyIdentifier: z.string().optional(),
  condition: z.nativeEnum(BookCondition).optional(),
  returnCondition: z.nativeEnum(BookCondition).optional(),
  damageNotes: z.string().optional(),
  notes: z.string().optional(),
});

export const renewBookSchema = z.object({
  circulationId: z.string().optional(),
  additionalDays: z.number().int().min(1).optional(),
});

export const markLostSchema = z.object({
  circulationId: z.string().optional(),
  replacementFeeMinorUnits: z.number().int().min(0).optional(),
  processingFeeMinorUnits: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const reserveBookSchema = z.object({
  bookId: z.string().min(1, 'bookId is required'),
  memberId: z.string().min(1, 'memberId is required'),
  libraryId: z.string().min(1, 'libraryId is required'),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
});

export const waiveFineSchema = z.object({
  reason: z.string().min(1, 'Waiver reason is required'),
  waivedAmount: z.number().int().min(1).optional(),
  waiverAmountMinorUnits: z.number().int().min(1).optional(),
});

export const settleFineSchema = z.object({
  amount: z.number().int().min(1).optional(),
  amountMinorUnits: z.number().int().min(1).optional(),
  paymentMethod: z.string().optional(),
  transactionReference: z.string().optional(),
  paymentReference: z.string().optional(),
}).refine(data => !!(data.amount || data.amountMinorUnits), {
  message: 'Settlement amount is required',
});
