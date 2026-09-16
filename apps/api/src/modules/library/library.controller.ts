import { Request, Response, NextFunction } from 'express';
import {
  createSuccessResponse,
  AuthenticationError,
  BadRequestError,
} from '@edusphere/common';
import { LibraryPolicy } from './policies/library.policy.js';
import { LibraryConfigService } from './services/library-config.service.js';
import { CatalogService } from './services/catalog.service.js';
import { MemberService } from './services/member.service.js';
import { CirculationService } from './services/circulation.service.js';
import { ReservationService } from './services/reservation.service.js';
import { FineService } from './services/fine.service.js';
import { LibraryReportsService } from './services/library-reports.service.js';

export class LibraryController {
  private static getAuth(req: Request) {
    const auth = req.auth;
    if (!auth) {
      throw new AuthenticationError('Authentication required.');
    }
    const tenantId = req.tenantContext?.tenantId || auth.tenantId;
    const schoolId = (req.query.schoolId as string) || (req.body?.schoolId as string) || auth.schoolId || '';
    const campusId = (req.query.campusId as string) || (req.body?.campusId as string) || auth.campusId;
    return { auth, tenantId, schoolId, campusId, userId: auth.userId };
  }

  private static reply(
    res: Response,
    req: Request,
    data: any,
    message = 'Operation completed successfully',
    status = 200
  ) {
    return res.status(status).json(
      createSuccessResponse(data, message, { requestId: (req as any).id || 'req_unknown' })
    );
  }

  // =========================================================================
  // 1. Library Branches & Settings
  // =========================================================================
  public static async createLibrary(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const library = await LibraryConfigService.createLibrary(
        tenantId,
        schoolId,
        req.body
      );
      return LibraryController.reply(res, req, library, 'Library branch created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getLibraries(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const libraries = await LibraryConfigService.getLibraries(
        tenantId,
        schoolId,
        req.query.campusId as string
      );
      return LibraryController.reply(res, req, libraries);
    } catch (err) {
      next(err);
    }
  }

  public static async getLibraryById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = LibraryController.getAuth(req);
      const library = await LibraryConfigService.getLibraryById(
        tenantId,
        req.params.id
      );
      return LibraryController.reply(res, req, library);
    } catch (err) {
      next(err);
    }
  }

  public static async updateLibrary(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const library = await LibraryConfigService.updateLibrary(
        tenantId,
        req.params.id,
        req.body
      );
      return LibraryController.reply(res, req, library, 'Library branch updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async deleteLibrary(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const result = await LibraryConfigService.deleteLibrary(
        tenantId,
        req.params.id
      );
      return LibraryController.reply(res, req, result, 'Library branch archived.');
    } catch (err) {
      next(err);
    }
  }

  public static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const settings = await LibraryConfigService.getSettings(
        tenantId,
        schoolId,
        req.query.libraryId as string
      );
      return LibraryController.reply(res, req, settings);
    } catch (err) {
      next(err);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const settings = await LibraryConfigService.updateSettings(
        tenantId,
        schoolId,
        req.body,
        req.query.libraryId as string
      );
      return LibraryController.reply(res, req, settings, 'Library settings updated.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Authors, Publishers, Categories, Shelves
  // =========================================================================
  public static async createAuthor(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const author = await LibraryConfigService.createAuthor(
        tenantId,
        schoolId,
        req.body
      );
      return LibraryController.reply(res, req, author, 'Author created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getAuthors(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const authors = await LibraryConfigService.getAuthors(
        tenantId,
        schoolId,
        req.query.search as string
      );
      return LibraryController.reply(res, req, authors);
    } catch (err) {
      next(err);
    }
  }

  public static async createPublisher(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const publisher = await LibraryConfigService.createPublisher(
        tenantId,
        schoolId,
        req.body
      );
      return LibraryController.reply(res, req, publisher, 'Publisher created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getPublishers(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const publishers = await LibraryConfigService.getPublishers(
        tenantId,
        schoolId,
        req.query.search as string
      );
      return LibraryController.reply(res, req, publishers);
    } catch (err) {
      next(err);
    }
  }

  public static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const category = await LibraryConfigService.createCategory(
        tenantId,
        schoolId,
        req.body
      );
      return LibraryController.reply(res, req, category, 'Category created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const categories = await LibraryConfigService.getCategories(
        tenantId,
        schoolId
      );
      return LibraryController.reply(res, req, categories);
    } catch (err) {
      next(err);
    }
  }

  public static async createShelf(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const shelf = await LibraryConfigService.createShelf(
        tenantId,
        schoolId,
        req.body
      );
      return LibraryController.reply(res, req, shelf, 'Shelf created.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getShelves(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const shelves = await LibraryConfigService.getShelves(
        tenantId,
        schoolId,
        req.query.libraryId as string
      );
      return LibraryController.reply(res, req, shelves);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Books & Book Copies
  // =========================================================================
  public static async createBook(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const book = await CatalogService.createBook(
        tenantId,
        schoolId,
        req.body
      );
      return LibraryController.reply(res, req, book, 'Book created in catalog.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const result = await CatalogService.getBooks(
        tenantId,
        schoolId,
        {
          search: req.query.search as string,
          categoryId: req.query.categoryId as string,
          authorId: req.query.authorId as string,
          subjectId: req.query.subjectId as string,
          availableOnly: req.query.availableOnly === 'true',
          page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        }
      );
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  public static async getBookById(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = LibraryController.getAuth(req);
      const book = await CatalogService.getBookById(tenantId, req.params.id);
      return LibraryController.reply(res, req, book);
    } catch (err) {
      next(err);
    }
  }

  public static async updateBook(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const book = await CatalogService.updateBook(
        tenantId,
        req.params.id,
        req.body
      );
      return LibraryController.reply(res, req, book, 'Book updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async archiveBook(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const result = await CatalogService.archiveBook(tenantId, req.params.id);
      return LibraryController.reply(res, req, result, 'Book archived.');
    } catch (err) {
      next(err);
    }
  }

  public static async addCopies(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const copies = await CatalogService.addCopies(
        tenantId,
        schoolId,
        req.params.id,
        req.body
      );
      const dataToReturn = copies.length === 1 && (!req.body.quantity || req.body.quantity === 1) ? copies[0] : copies;
      return LibraryController.reply(res, req, dataToReturn, 'Book copies added.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getCopies(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = LibraryController.getAuth(req);
      const copies = await CatalogService.getCopies(
        tenantId,
        req.query.bookId as string,
        req.query.libraryId as string,
        req.query.status as any
      );
      return LibraryController.reply(res, req, copies);
    } catch (err) {
      next(err);
    }
  }

  public static async getCopyByIdentifier(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = LibraryController.getAuth(req);
      const copy = await CatalogService.getCopyByAccessionOrBarcode(
        tenantId,
        req.params.identifier
      );
      return LibraryController.reply(res, req, copy);
    } catch (err) {
      next(err);
    }
  }

  public static async updateCopyCondition(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, userId } = LibraryController.getAuth(req);
      const copy = await CatalogService.updateCopyCondition(
        tenantId,
        req.params.id,
        {
          condition: req.body.condition,
          notes: req.body.notes,
          changedBy: userId,
        }
      );
      return LibraryController.reply(res, req, copy, 'Copy condition updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async withdrawCopy(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId, userId } = LibraryController.getAuth(req);
      const result = await CatalogService.withdrawCopy(
        tenantId,
        schoolId,
        req.params.id,
        {
          reason: req.body.reason,
          notes: req.body.notes,
          withdrawnBy: userId,
        }
      );
      return LibraryController.reply(res, req, result, 'Copy withdrawn.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Members
  // =========================================================================
  public static async registerMember(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const member = await MemberService.registerMember(
        tenantId,
        schoolId,
        req.body
      );
      return LibraryController.reply(res, req, member, 'Member registered.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const result = await MemberService.getMembers(
        tenantId,
        schoolId,
        {
          search: req.query.search as string,
          memberType: req.query.memberType as any,
          status: req.query.status as any,
          page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        }
      );
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  public static async getMemberById(req: Request, res: Response, next: NextFunction) {
    try {
      await LibraryPolicy.assertMemberAccess(req, req.params.id);
      const { tenantId } = LibraryController.getAuth(req);
      const member = await MemberService.getMemberById(tenantId, req.params.id);
      return LibraryController.reply(res, req, member);
    } catch (err) {
      next(err);
    }
  }

  public static async updateMember(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const member = await MemberService.updateMember(
        tenantId,
        req.params.id,
        req.body
      );
      return LibraryController.reply(res, req, member, 'Member profile updated.');
    } catch (err) {
      next(err);
    }
  }

  public static async suspendMember(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const member = await MemberService.suspendMember(
        tenantId,
        req.params.id,
        req.body.reason
      );
      return LibraryController.reply(res, req, member, 'Member suspended.');
    } catch (err) {
      next(err);
    }
  }

  public static async getMyMemberProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = LibraryController.getAuth(req);
      const member = await MemberService.getMemberByUserId(tenantId, userId);
      return LibraryController.reply(res, req, member);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Circulation
  // =========================================================================
  public static async issueBook(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanCirculate(req);
      const { tenantId, schoolId, userId } = LibraryController.getAuth(req);
      const circulation = await CirculationService.issueBook(
        tenantId,
        schoolId,
        {
          copyIdentifier: req.body.copyIdentifier || req.body.copyId,
          memberId: req.body.memberId,
          libraryId: req.body.libraryId,
          issuedBy: userId,
          dueDateOverride: req.body.dueDateOverride || req.body.dueDate,
          notes: req.body.notes,
          idempotencyKey: req.body.idempotencyKey,
        }
      );
      return LibraryController.reply(res, req, circulation, 'Book successfully checked out.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async returnBook(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanCirculate(req);
      const { tenantId, schoolId, userId } = LibraryController.getAuth(req);
      const result = await CirculationService.returnBook(
        tenantId,
        schoolId,
        {
          circulationId: req.params.id || req.body.circulationId,
          copyIdentifier: req.body.copyIdentifier,
          returnedBy: userId,
          condition: req.body.condition || req.body.returnCondition,
          damageNotes: req.body.damageNotes,
          notes: req.body.notes,
        }
      );
      return LibraryController.reply(res, req, result, 'Book successfully returned.');
    } catch (err) {
      next(err);
    }
  }

  public static async renewBook(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanCirculate(req);
      const { tenantId, schoolId, userId } = LibraryController.getAuth(req);
      const circulation = await CirculationService.renewBook(
        tenantId,
        schoolId,
        req.params.id || req.body.circulationId,
        userId,
        req.body.additionalDays
      );
      return LibraryController.reply(res, req, circulation, 'Book loan renewed.');
    } catch (err) {
      next(err);
    }
  }

  public static async markBookLost(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanCirculate(req);
      const { tenantId, schoolId, userId } = LibraryController.getAuth(req);
      const result = await CirculationService.markBookLost(
        tenantId,
        schoolId,
        req.params.id || req.body.circulationId,
        userId,
        {
          notes: req.body.notes,
          replacementFeeMinorUnits: req.body.replacementFeeMinorUnits,
          processingFeeMinorUnits: req.body.processingFeeMinorUnits,
        }
      );
      return LibraryController.reply(res, req, result, 'Book marked as lost and replacement fee assessed.');
    } catch (err) {
      next(err);
    }
  }

  public static async getCirculations(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const result = await CirculationService.getCirculations(tenantId, {
        memberId: req.query.memberId as string,
        bookId: req.query.bookId as string,
        libraryId: req.query.libraryId as string,
        status: req.query.status as any,
        overdueOnly: req.query.overdueOnly === 'true',
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  public static async getMyCirculations(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = LibraryController.getAuth(req);
      const member = await MemberService.getMemberByUserId(tenantId, userId);
      if (!member) {
        return LibraryController.reply(res, req, { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
      const result = await CirculationService.getCirculations(tenantId, {
        memberId: member._id.toString(),
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Reservations
  // =========================================================================
  public static async reserveBook(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const reservation = await ReservationService.reserveBook(
        tenantId,
        schoolId,
        {
          bookId: req.body.bookId,
          memberId: req.body.memberId,
          libraryId: req.body.libraryId,
          notes: req.body.notes,
        }
      );
      return LibraryController.reply(res, req, reservation, 'Book reserved.', 201);
    } catch (err) {
      next(err);
    }
  }

  public static async cancelReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = LibraryController.getAuth(req);
      const result = await ReservationService.cancelReservation(tenantId, req.params.id);
      return LibraryController.reply(res, req, result, 'Reservation cancelled.');
    } catch (err) {
      next(err);
    }
  }

  public static async getReservations(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const result = await ReservationService.getReservations(tenantId, {
        bookId: req.query.bookId as string,
        memberId: req.query.memberId as string,
        libraryId: req.query.libraryId as string,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  public static async getMyReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = LibraryController.getAuth(req);
      const member = await MemberService.getMemberByUserId(tenantId, userId);
      if (!member) {
        return LibraryController.reply(res, req, { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
      const result = await ReservationService.getReservations(tenantId, {
        memberId: member._id.toString(),
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 7. Fines & Waivers
  // =========================================================================
  public static async getFines(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId } = LibraryController.getAuth(req);
      const result = await FineService.getFines(tenantId, {
        memberId: req.query.memberId as string,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  public static async getMyFines(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId } = LibraryController.getAuth(req);
      const member = await MemberService.getMemberByUserId(tenantId, userId);
      if (!member) {
        return LibraryController.reply(res, req, { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
      const result = await FineService.getFines(tenantId, {
        memberId: member._id.toString(),
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });
      return LibraryController.reply(res, req, result);
    } catch (err) {
      next(err);
    }
  }

  public static async waiveFine(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanWaiveFine(req);
      const { tenantId, userId } = LibraryController.getAuth(req);
      const fine = await FineService.waiveFine(tenantId, req.params.id, {
        waivedBy: userId,
        reason: req.body.reason,
        waivedAmount: req.body.waiverAmountMinorUnits || req.body.waivedAmount,
      });
      return LibraryController.reply(res, req, fine, 'Fine waived successfully.');
    } catch (err) {
      next(err);
    }
  }

  public static async settleFine(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanCirculate(req);
      const { tenantId } = LibraryController.getAuth(req);
      const fine = await FineService.settleFine(tenantId, req.params.id, {
        amount: req.body.amountMinorUnits || req.body.amount,
        paymentReference: req.body.paymentReference || req.body.transactionReference,
      });
      return LibraryController.reply(res, req, fine, 'Fine payment settled.');
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 8. Reports & Analytics
  // =========================================================================
  public static async getDashboardKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const kpis = await LibraryReportsService.getDashboardKPIs(
        tenantId,
        schoolId,
        req.query.libraryId as string
      );
      return LibraryController.reply(res, req, kpis);
    } catch (err) {
      next(err);
    }
  }

  public static async getOverdueReport(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const report = await LibraryReportsService.getOverdueReport(
        tenantId,
        schoolId,
        req.query.libraryId as string
      );
      return LibraryController.reply(res, req, report);
    } catch (err) {
      next(err);
    }
  }

  public static async getPopularBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const popular = await LibraryReportsService.getPopularBooks(
        tenantId,
        schoolId,
        req.query.limit ? parseInt(req.query.limit as string, 10) : 10
      );
      return LibraryController.reply(res, req, popular);
    } catch (err) {
      next(err);
    }
  }

  public static async getInventoryReport(req: Request, res: Response, next: NextFunction) {
    try {
      LibraryPolicy.assertCanManageLibrary(req);
      const { tenantId, schoolId } = LibraryController.getAuth(req);
      const inventory = await LibraryReportsService.getInventoryConditionReport(
        tenantId,
        schoolId
      );
      return LibraryController.reply(res, req, inventory);
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 9. Parent / Student Scoped View
  // =========================================================================
  public static async getStudentLibraryInfo(req: Request, res: Response, next: NextFunction) {
    try {
      await LibraryPolicy.assertStudentLibraryAccess(req, req.params.studentId);
      const { tenantId } = LibraryController.getAuth(req);

      const { LibraryMember } = await import('@edusphere/database');
      const studentMember = await LibraryMember.findOne({
        tenantId,
        studentId: req.params.studentId,
        isDeleted: false,
      });

      if (!studentMember) {
        return LibraryController.reply(res, req, {
          member: null,
          circulations: [],
          reservations: [],
          fines: [],
        });
      }

      const [circulations, reservations, fines] = await Promise.all([
        CirculationService.getCirculations(tenantId, {
          memberId: studentMember._id.toString(),
        }),
        ReservationService.getReservations(tenantId, {
          memberId: studentMember._id.toString(),
        }),
        FineService.getFines(tenantId, {
          memberId: studentMember._id.toString(),
        }),
      ]);

      return LibraryController.reply(res, req, {
        member: studentMember,
        circulations: circulations.items,
        activeLoans: circulations.items,
        reservations: reservations.items,
        fines: fines.items,
      });
    } catch (err) {
      next(err);
    }
  }
}
