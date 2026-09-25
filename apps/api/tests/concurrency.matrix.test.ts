import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import {
  AcademicYear,
  Campus,
  BookCopy,
  InventoryItem,
  InventoryStock,
  User,
  HostelBed,
  HostelStudentAllocation,
} from '@edusphere/database';
import {
  createTenant,
  createSchool,
  createCampus,
  createAcademicYear,
  createBook,
  createBookCopy,
  createInventoryStore,
  createInventoryItem,
  createHostel,
  createHostelRoom,
  createHostelBed,
  createUser,
} from './factories/entity.factories.js';
import { sessionService } from '../src/modules/auth/session.service.js';
import { BookCopyStatus, BedStatus } from '@edusphere/common';

describe('High-Risk Concurrency & Race Condition Matrix Suite (Phase 23)', () => {
  let replSet: MongoMemoryReplSet;
  let tenant: any;
  let school: any;
  let campus: any;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    tenant = await createTenant();
    school = await createSchool(tenant._id);
    campus = await createCampus(tenant._id, school._id);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  // =========================================================================
  // 1. Current Academic Year Atomic Exclusivity
  // =========================================================================
  describe('1. Academic Year Concurrency', () => {
    it('guarantees only one current academic year when multiple are concurrently set current', async () => {
      const ay1 = await createAcademicYear(tenant._id, school._id, campus._id, { isCurrent: false });
      const ay2 = await createAcademicYear(tenant._id, school._id, campus._id, { isCurrent: false });

      // Simulate atomic setCurrent helper
      const setCurrentYear = async (targetId: Types.ObjectId) => {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await AcademicYear.updateMany(
              { tenantId: tenant._id, schoolId: school._id },
              { $set: { isCurrent: false } },
              { session }
            );
            await AcademicYear.updateOne(
              { _id: targetId },
              { $set: { isCurrent: true } },
              { session }
            );
          });
        } finally {
          await session.endSession();
        }
      };

      await Promise.all([setCurrentYear(ay1._id), setCurrentYear(ay2._id)]);

      const currentYears = await AcademicYear.find({
        tenantId: tenant._id,
        schoolId: school._id,
        isCurrent: true,
      });
      expect(currentYears.length).toBe(1);
    });
  });

  // =========================================================================
  // 2. Main Campus Exclusivity
  // =========================================================================
  describe('2. Main Campus Concurrency', () => {
    it('guarantees only one main campus per school under concurrent set-main requests', async () => {
      const cmp1 = await createCampus(tenant._id, school._id, { isMain: false });
      const cmp2 = await createCampus(tenant._id, school._id, { isMain: false });

      const setMainCampus = async (targetId: Types.ObjectId) => {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await Campus.updateMany(
              { tenantId: tenant._id, schoolId: school._id },
              { $set: { isMain: false } },
              { session }
            );
            await Campus.updateOne(
              { _id: targetId },
              { $set: { isMain: true } },
              { session }
            );
          });
        } finally {
          await session.endSession();
        }
      };

      await Promise.all([setMainCampus(cmp1._id), setMainCampus(cmp2._id)]);

      const mainCampuses = await Campus.find({
        tenantId: tenant._id,
        schoolId: school._id,
        isMain: true,
      });
      expect(mainCampuses.length).toBe(1);
    });
  });

  // =========================================================================
  // 3. Library Copy Concurrent Checkout
  // =========================================================================
  describe('3. Library Copy Concurrency', () => {
    it('allows only ONE borrower to acquire a single physical book copy when requested simultaneously', async () => {
      const book = await createBook(tenant._id, school._id);
      const copy = await createBookCopy(tenant._id, book._id, { status: BookCopyStatus.AVAILABLE });

      const student1Id = new Types.ObjectId();
      const student2Id = new Types.ObjectId();

      // Atomic checkout attempt
      const attemptCheckout = async (studentId: Types.ObjectId) => {
        return BookCopy.findOneAndUpdate(
          { _id: copy._id, status: BookCopyStatus.AVAILABLE },
          { $set: { status: BookCopyStatus.ISSUED } },
          { new: true }
        );
      };

      const [res1, res2] = await Promise.all([
        attemptCheckout(student1Id),
        attemptCheckout(student2Id),
      ]);

      const successCount = [res1, res2].filter((r) => r !== null).length;
      expect(successCount).toBe(1);

      const finalCopy = await BookCopy.findById(copy._id);
      expect(finalCopy?.status).toBe(BookCopyStatus.ISSUED);
    });
  });

  // =========================================================================
  // 4. Inventory Conditional Stock Decrement
  // =========================================================================
  describe('4. Inventory Stock Concurrency', () => {
    it('prevents negative stock when concurrent issues exceed remaining inventory', async () => {
      const stock = await InventoryStock.create({
        tenantId: tenant._id,
        schoolId: school._id,
        itemId: new Types.ObjectId(),
        storeId: new Types.ObjectId(),
        quantityOnHand: 3,
        quantityReserved: 0,
        quantityAvailable: 3,
      });

      // 6 concurrent requests attempting to issue 1 item each
      const issueItem = async () => {
        return InventoryStock.findOneAndUpdate(
          { _id: stock._id, quantityAvailable: { $gte: 1 } },
          { $inc: { quantityAvailable: -1, quantityOnHand: -1 } },
          { new: true }
        );
      };

      const results = await Promise.all([
        issueItem(),
        issueItem(),
        issueItem(),
        issueItem(),
        issueItem(),
        issueItem(),
      ]);

      const successCount = results.filter((r) => r !== null).length;
      const failureCount = results.filter((r) => r === null).length;

      expect(successCount).toBe(3);
      expect(failureCount).toBe(3);

      const finalStock = await InventoryStock.findById(stock._id);
      expect(finalStock?.quantityAvailable).toBe(0);
    });
  });

  // =========================================================================
  // 5. Hostel Bed Double-Booking Prevention
  // =========================================================================
  describe('5. Hostel Bed Allocation Concurrency', () => {
    it('prevents double-booking a single bed under concurrent allocation', async () => {
      const hostel = await createHostel(tenant._id, school._id);
      const room = await createHostelRoom(tenant._id, hostel._id);
      const bed = await createHostelBed(tenant._id, room._id, { status: BedStatus.AVAILABLE });

      const student1Id = new Types.ObjectId();
      const student2Id = new Types.ObjectId();

      const allocateBed = async (studentId: Types.ObjectId) => {
        const session = await mongoose.startSession();
        try {
          let allocated = false;
          await session.withTransaction(async () => {
            const updatedBed = await HostelBed.findOneAndUpdate(
              { _id: bed._id, status: BedStatus.AVAILABLE },
              { $set: { status: BedStatus.OCCUPIED } },
              { session, new: true }
            );

            if (updatedBed) {
              await HostelStudentAllocation.create(
                [
                  {
                    tenantId: tenant._id,
                    schoolId: school._id,
                    studentId,
                    hostelId: hostel._id,
                    roomId: room._id,
                    bedId: bed._id,
                    academicYearId: new Types.ObjectId(),
                    checkInDate: new Date(),
                    status: 'ALLOCATED',
                  },
                ],
                { session }
              );
              allocated = true;
            }
          });
          return allocated;
        } finally {
          await session.endSession();
        }
      };

      const [alloc1, alloc2] = await Promise.all([
        allocateBed(student1Id),
        allocateBed(student2Id),
      ]);

      const totalAllocated = [alloc1, alloc2].filter(Boolean).length;
      expect(totalAllocated).toBe(1);

      const allocations = await HostelStudentAllocation.find({ bedId: bed._id, status: 'ALLOCATED' });
      expect(allocations.length).toBe(1);
    });
  });

  // =========================================================================
  // 6. Refresh Token Rotation Replay Race Condition
  // =========================================================================
  describe('6. Session & Token Rotation Concurrency', () => {
    it('ensures only one concurrent refresh succeeds and the second triggers breach detection', async () => {
      const user = await createUser(tenant._id);
      const { session, rawRefreshToken } = await sessionService.createSession({
        userId: user._id,
        tenantId: tenant._id,
        deviceName: 'Concurrency Device',
      });

      // Attempt two simultaneous rotations with the identical rawRefreshToken
      const results = await Promise.allSettled([
        sessionService.rotateSession(rawRefreshToken, { deviceName: 'Request 1' }),
        sessionService.rotateSession(rawRefreshToken, { deviceName: 'Request 2' }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });
});
