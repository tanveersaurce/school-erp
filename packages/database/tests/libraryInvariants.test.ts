import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  Library,
  LibrarySetting,
  LibraryAuthor,
  LibraryPublisher,
  LibraryCategory,
  LibraryShelf,
  Book,
  BookCopy,
  LibraryMember,
  LibraryCirculation,
  LibraryReservation,
  LibraryFine,
} from '../src/models/library.model.js';
import {
  BookCopyStatus,
  BookCondition,
  LibraryMemberType,
  LibraryMemberStatus,
  CirculationStatus,
  ReservationStatus,
  LibraryFineType,
  LibraryFineStatus,
} from '@edusphere/common';

describe('Phase 15: Library Database Invariants & Unique Constraints', () => {
  let mongod: MongoMemoryServer;
  const tenantId = new Types.ObjectId();
  const schoolId = new Types.ObjectId();
  const campusId = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Library.init();
    await LibrarySetting.init();
    await LibraryAuthor.init();
    await LibraryPublisher.init();
    await LibraryCategory.init();
    await LibraryShelf.init();
    await Book.init();
    await BookCopy.init();
    await LibraryMember.init();
    await LibraryCirculation.init();
    await LibraryReservation.init();
    await LibraryFine.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('1. Enforces unique Library code per tenant and school', async () => {
    await Library.create({
      tenantId,
      schoolId,
      campusId,
      name: 'Central Library',
      code: 'LIB-CENTRAL',
    });

    await expect(
      Library.create({
        tenantId,
        schoolId,
        campusId,
        name: 'Duplicate Library',
        code: 'LIB-CENTRAL',
      })
    ).rejects.toThrow();

    // Permitted under a different school
    const diffSchoolId = new Types.ObjectId();
    const otherSchoolLib = await Library.create({
      tenantId,
      schoolId: diffSchoolId,
      campusId,
      name: 'North Campus Library',
      code: 'LIB-CENTRAL',
    });
    expect(otherSchoolLib).toBeDefined();
  });

  it('2. Enforces unique BookCopy accessionNumber per tenant', async () => {
    const bookId = new Types.ObjectId();
    const libraryId = new Types.ObjectId();

    await BookCopy.create({
      tenantId,
      schoolId,
      bookId,
      libraryId,
      accessionNumber: 'ACC-2026-0001',
      barcode: 'BAR-0001',
      condition: BookCondition.NEW,
      status: BookCopyStatus.AVAILABLE,
    });

    // Duplicate accessionNumber within same tenant must fail
    await expect(
      BookCopy.create({
        tenantId,
        schoolId,
        bookId,
        libraryId,
        accessionNumber: 'ACC-2026-0001',
        barcode: 'BAR-0002',
        condition: BookCondition.NEW,
        status: BookCopyStatus.AVAILABLE,
      })
    ).rejects.toThrow();

    // Permitted in a different tenant
    const diffTenantId = new Types.ObjectId();
    const otherTenantCopy = await BookCopy.create({
      tenantId: diffTenantId,
      schoolId,
      bookId,
      libraryId,
      accessionNumber: 'ACC-2026-0001',
      barcode: 'BAR-0003',
      condition: BookCondition.NEW,
      status: BookCopyStatus.AVAILABLE,
    });
    expect(otherTenantCopy).toBeDefined();
  });

  it('3. Enforces unique BookCopy barcode per tenant when provided', async () => {
    const bookId = new Types.ObjectId();
    const libraryId = new Types.ObjectId();

    await BookCopy.create({
      tenantId,
      schoolId,
      bookId,
      libraryId,
      accessionNumber: 'ACC-2026-0010',
      barcode: 'BAR-UNIQUE-999',
      condition: BookCondition.GOOD,
      status: BookCopyStatus.AVAILABLE,
    });

    await expect(
      BookCopy.create({
        tenantId,
        schoolId,
        bookId,
        libraryId,
        accessionNumber: 'ACC-2026-0011',
        barcode: 'BAR-UNIQUE-999',
        condition: BookCondition.GOOD,
        status: BookCopyStatus.AVAILABLE,
      })
    ).rejects.toThrow();
  });

  it('4. Enforces unique LibraryMember memberNumber per tenant', async () => {
    const userId1 = new Types.ObjectId();
    const userId2 = new Types.ObjectId();

    await LibraryMember.create({
      tenantId,
      schoolId,
      memberNumber: 'MEM-2026-0001',
      memberType: LibraryMemberType.STUDENT,
      userId: userId1,
      status: LibraryMemberStatus.ACTIVE,
    });

    await expect(
      LibraryMember.create({
        tenantId,
        schoolId,
        memberNumber: 'MEM-2026-0001',
        memberType: LibraryMemberType.TEACHER,
        userId: userId2,
        status: LibraryMemberStatus.ACTIVE,
      })
    ).rejects.toThrow();
  });

  it('5. Enforces unique Category code per tenant and school', async () => {
    await LibraryCategory.create({
      tenantId,
      schoolId,
      name: 'Computer Science',
      code: 'CS',
    });

    await expect(
      LibraryCategory.create({
        tenantId,
        schoolId,
        name: 'Computing Sciences',
        code: 'CS',
      })
    ).rejects.toThrow();
  });

  it('6. Enforces unique Shelf code per Library', async () => {
    const libraryId = new Types.ObjectId();

    await LibraryShelf.create({
      tenantId,
      schoolId,
      libraryId,
      rack: 'RACK-A',
      shelf: 'SHELF-01',
      code: 'RACK-A-01',
      name: 'Science Section Shelf 1',
    });

    await expect(
      LibraryShelf.create({
        tenantId,
        schoolId,
        libraryId,
        rack: 'RACK-B',
        shelf: 'SHELF-01',
        code: 'RACK-A-01',
        name: 'Duplicate Shelf Code',
      })
    ).rejects.toThrow();
  });

  it('7. Verifies default non-negative constraints and availability counter structure on Book', async () => {
    const book = await Book.create({
      tenantId,
      schoolId,
      title: 'Operating System Concepts',
      totalCopies: 5,
      availableCopies: 5,
      issuedCopies: 0,
      reservedCopies: 0,
      lostCopies: 0,
      damagedCopies: 0,
      withdrawnCopies: 0,
    });

    expect(book._id).toBeDefined();
    expect(book.availableCopies).toBe(5);
    expect(book.totalCopies).toBe(5);
  });
});
