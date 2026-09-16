import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requirePermission } from '../../middlewares/authorize.js';
import { LibraryController } from './library.controller.js';

export const libraryRouter = Router();

// =========================================================================
// 1. Library Branches & Settings
// =========================================================================
libraryRouter.post(
  ['/locations', '/libraries'],
  authenticate,
  requirePermission('library:manage'),
  LibraryController.createLibrary
);

libraryRouter.get(
  ['/locations', '/libraries'],
  authenticate,
  requirePermission('library:read'),
  LibraryController.getLibraries
);

libraryRouter.get(
  ['/locations/:id', '/libraries/:id'],
  authenticate,
  requirePermission('library:read'),
  LibraryController.getLibraryById
);

libraryRouter.put(
  ['/locations/:id', '/libraries/:id'],
  authenticate,
  requirePermission('library:manage'),
  LibraryController.updateLibrary
);

libraryRouter.delete(
  ['/locations/:id', '/libraries/:id'],
  authenticate,
  requirePermission('library:manage'),
  LibraryController.deleteLibrary
);

libraryRouter.get(
  '/settings',
  authenticate,
  requirePermission('library:read'),
  LibraryController.getSettings
);

libraryRouter.put(
  '/settings',
  authenticate,
  requirePermission('library:manage'),
  LibraryController.updateSettings
);

// =========================================================================
// 2. Authors, Publishers, Categories, Shelves
// =========================================================================
libraryRouter.post(
  '/authors',
  authenticate,
  requirePermission('book:create'),
  LibraryController.createAuthor
);

libraryRouter.get(
  '/authors',
  authenticate,
  requirePermission('book:read'),
  LibraryController.getAuthors
);

libraryRouter.post(
  '/publishers',
  authenticate,
  requirePermission('book:create'),
  LibraryController.createPublisher
);

libraryRouter.get(
  '/publishers',
  authenticate,
  requirePermission('book:read'),
  LibraryController.getPublishers
);

libraryRouter.post(
  '/categories',
  authenticate,
  requirePermission('library:manage'),
  LibraryController.createCategory
);

libraryRouter.get(
  '/categories',
  authenticate,
  requirePermission('book:read'),
  LibraryController.getCategories
);

libraryRouter.post(
  '/shelves',
  authenticate,
  requirePermission('library:manage'),
  LibraryController.createShelf
);

libraryRouter.get(
  '/shelves',
  authenticate,
  requirePermission('library:read'),
  LibraryController.getShelves
);

// =========================================================================
// 3. Books & Book Copies
// =========================================================================
libraryRouter.post(
  '/books',
  authenticate,
  requirePermission('book:create'),
  LibraryController.createBook
);

libraryRouter.get(
  '/books',
  authenticate,
  requirePermission('book:read'),
  LibraryController.getBooks
);

libraryRouter.get(
  '/books/:id',
  authenticate,
  requirePermission('book:read'),
  LibraryController.getBookById
);

libraryRouter.put(
  '/books/:id',
  authenticate,
  requirePermission('book:update'),
  LibraryController.updateBook
);

libraryRouter.delete(
  '/books/:id',
  authenticate,
  requirePermission('book:archive'),
  LibraryController.archiveBook
);

libraryRouter.post(
  '/books/:id/copies',
  authenticate,
  requirePermission('book_copy:create'),
  LibraryController.addCopies
);

libraryRouter.get(
  '/copies',
  authenticate,
  requirePermission('book_copy:read'),
  LibraryController.getCopies
);

libraryRouter.get(
  '/copies/lookup/:identifier',
  authenticate,
  requirePermission('book_copy:read'),
  LibraryController.getCopyByIdentifier
);

libraryRouter.patch(
  '/copies/:id/condition',
  authenticate,
  requirePermission('book_copy:update'),
  LibraryController.updateCopyCondition
);

libraryRouter.post(
  '/copies/:id/withdraw',
  authenticate,
  requirePermission('book_copy:manage'),
  LibraryController.withdrawCopy
);

// =========================================================================
// 4. Members
// =========================================================================
libraryRouter.post(
  '/members',
  authenticate,
  requirePermission('library_member:create'),
  LibraryController.registerMember
);

libraryRouter.get(
  '/members',
  authenticate,
  requirePermission('library_member:read'),
  LibraryController.getMembers
);

libraryRouter.get(
  '/members/:id',
  authenticate,
  requirePermission('library_member:read'),
  LibraryController.getMemberById
);

libraryRouter.put(
  '/members/:id',
  authenticate,
  requirePermission('library_member:update'),
  LibraryController.updateMember
);

libraryRouter.post(
  '/members/:id/suspend',
  authenticate,
  requirePermission('library_member:suspend'),
  LibraryController.suspendMember
);

// Self-service member endpoints
libraryRouter.get(
  '/me/profile',
  authenticate,
  LibraryController.getMyMemberProfile
);

libraryRouter.get(
  '/me/circulations',
  authenticate,
  LibraryController.getMyCirculations
);

libraryRouter.get(
  '/me/reservations',
  authenticate,
  LibraryController.getMyReservations
);

libraryRouter.get(
  '/me/fines',
  authenticate,
  LibraryController.getMyFines
);

// =========================================================================
// 5. Circulation (Checkout, Checkin, Renew, Lost)
// =========================================================================
libraryRouter.post(
  ['/circulation/issue', '/circulation/checkout', '/circulations/issue', '/circulations/checkout'],
  authenticate,
  requirePermission('circulation:issue'),
  LibraryController.issueBook
);

libraryRouter.post(
  ['/circulation/return', '/circulations/return', '/circulations/:id/return'],
  authenticate,
  requirePermission('circulation:return'),
  LibraryController.returnBook
);

libraryRouter.post(
  ['/circulation/renew', '/circulations/renew', '/circulations/:id/renew'],
  authenticate,
  requirePermission('circulation:renew'),
  LibraryController.renewBook
);

libraryRouter.post(
  ['/circulation/lost', '/circulations/lost', '/circulations/:id/lost'],
  authenticate,
  requirePermission('circulation:return'),
  LibraryController.markBookLost
);

libraryRouter.get(
  ['/circulation', '/circulations'],
  authenticate,
  requirePermission('circulation:read'),
  LibraryController.getCirculations
);

// =========================================================================
// 6. Reservations
// =========================================================================
libraryRouter.post(
  '/reservations',
  authenticate,
  requirePermission('reservation:create'),
  LibraryController.reserveBook
);

libraryRouter.post(
  '/reservations/:id/cancel',
  authenticate,
  requirePermission('reservation:create'),
  LibraryController.cancelReservation
);

libraryRouter.get(
  '/reservations',
  authenticate,
  requirePermission('reservation:read'),
  LibraryController.getReservations
);

// =========================================================================
// 7. Fines & Waivers
// =========================================================================
libraryRouter.get(
  '/fines',
  authenticate,
  requirePermission('fine:read'),
  LibraryController.getFines
);

libraryRouter.post(
  '/fines/:id/waive',
  authenticate,
  requirePermission('fine:waive'),
  LibraryController.waiveFine
);

libraryRouter.post(
  ['/fines/:id/settle', '/fines/:id/pay'],
  authenticate,
  requirePermission('fine:settle'),
  LibraryController.settleFine
);

// =========================================================================
// 8. Reports & Analytics
// =========================================================================
libraryRouter.get(
  '/reports/kpis',
  authenticate,
  requirePermission('library_report:read'),
  LibraryController.getDashboardKPIs
);

libraryRouter.get(
  '/reports/overdue',
  authenticate,
  requirePermission('library_report:read'),
  LibraryController.getOverdueReport
);

libraryRouter.get(
  '/reports/popular-books',
  authenticate,
  requirePermission('library_report:read'),
  LibraryController.getPopularBooks
);

libraryRouter.get(
  '/reports/inventory',
  authenticate,
  requirePermission('library_report:read'),
  LibraryController.getInventoryReport
);

// =========================================================================
// 9. Parent / Student Scoped View
// =========================================================================
libraryRouter.get(
  '/students/:studentId',
  authenticate,
  LibraryController.getStudentLibraryInfo
);
