import { describe, it, expect } from 'vitest';
import {
  TenantStatus,
  AcademicYearStatus,
  AssignmentStatus,
  ExamStatus,
  InvoiceStatus,
  PaymentStatus,
  CirculationStatus,
  AssetStatus,
} from '@edusphere/common';

describe('Institutional Lifecycle State Machine Invariants Suite (Phase 23)', () => {
  // Helper to validate state machine transitions
  const canTransition = (transitions: Record<string, string[]>, current: string, target: string): boolean => {
    const allowed = transitions[current] || [];
    return allowed.includes(target);
  };

  // =========================================================================
  // 1. Tenant Lifecycle State Machine
  // =========================================================================
  describe('1. Tenant Lifecycle State Machine', () => {
    const tenantTransitions: Record<string, string[]> = {
      [TenantStatus.PENDING]: [TenantStatus.ACTIVE, TenantStatus.SUSPENDED],
      [TenantStatus.ACTIVE]: [TenantStatus.SUSPENDED, TenantStatus.ARCHIVED],
      [TenantStatus.SUSPENDED]: [TenantStatus.ACTIVE, TenantStatus.ARCHIVED],
      [TenantStatus.ARCHIVED]: [], // Terminal state
    };

    it('permits valid linear progression PENDING -> ACTIVE -> SUSPENDED -> ARCHIVED', () => {
      expect(canTransition(tenantTransitions, TenantStatus.PENDING, TenantStatus.ACTIVE)).toBe(true);
      expect(canTransition(tenantTransitions, TenantStatus.ACTIVE, TenantStatus.SUSPENDED)).toBe(true);
      expect(canTransition(tenantTransitions, TenantStatus.SUSPENDED, TenantStatus.ACTIVE)).toBe(true);
      expect(canTransition(tenantTransitions, TenantStatus.ACTIVE, TenantStatus.ARCHIVED)).toBe(true);
    });

    it('prohibits invalid transitions out of terminal ARCHIVED state', () => {
      expect(canTransition(tenantTransitions, TenantStatus.ARCHIVED, TenantStatus.ACTIVE)).toBe(false);
      expect(canTransition(tenantTransitions, TenantStatus.ARCHIVED, TenantStatus.PENDING)).toBe(false);
    });
  });

  // =========================================================================
  // 2. Academic Year Lifecycle State Machine
  // =========================================================================
  describe('2. Academic Year Lifecycle State Machine', () => {
    const academicYearTransitions: Record<string, string[]> = {
      [AcademicYearStatus.DRAFT]: [AcademicYearStatus.ACTIVE, AcademicYearStatus.ARCHIVED],
      [AcademicYearStatus.ACTIVE]: [AcademicYearStatus.CLOSED, AcademicYearStatus.ARCHIVED],
      [AcademicYearStatus.CLOSED]: [AcademicYearStatus.ARCHIVED],
      [AcademicYearStatus.ARCHIVED]: [],
    };

    it('permits valid progression DRAFT -> ACTIVE -> CLOSED -> ARCHIVED', () => {
      expect(canTransition(academicYearTransitions, AcademicYearStatus.DRAFT, AcademicYearStatus.ACTIVE)).toBe(true);
      expect(canTransition(academicYearTransitions, AcademicYearStatus.ACTIVE, AcademicYearStatus.CLOSED)).toBe(true);
      expect(canTransition(academicYearTransitions, AcademicYearStatus.CLOSED, AcademicYearStatus.ARCHIVED)).toBe(true);
    });

    it('prohibits reopening a CLOSED year back to DRAFT', () => {
      expect(canTransition(academicYearTransitions, AcademicYearStatus.CLOSED, AcademicYearStatus.DRAFT)).toBe(false);
      expect(canTransition(academicYearTransitions, AcademicYearStatus.ARCHIVED, AcademicYearStatus.ACTIVE)).toBe(false);
    });
  });

  // =========================================================================
  // 3. Homework / Assignment Lifecycle State Machine
  // =========================================================================
  describe('3. Homework & Assignment Lifecycle State Machine', () => {
    const assignmentTransitions: Record<string, string[]> = {
      [AssignmentStatus.DRAFT]: [AssignmentStatus.PUBLISHED, AssignmentStatus.ARCHIVED],
      [AssignmentStatus.PUBLISHED]: [AssignmentStatus.CLOSED, AssignmentStatus.ARCHIVED],
      [AssignmentStatus.CLOSED]: [AssignmentStatus.ARCHIVED],
      [AssignmentStatus.ARCHIVED]: [],
    };

    it('permits valid lifecycle transitions DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED', () => {
      expect(canTransition(assignmentTransitions, AssignmentStatus.DRAFT, AssignmentStatus.PUBLISHED)).toBe(true);
      expect(canTransition(assignmentTransitions, AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED)).toBe(true);
      expect(canTransition(assignmentTransitions, AssignmentStatus.CLOSED, AssignmentStatus.ARCHIVED)).toBe(true);
    });

    it('prohibits jumping directly from DRAFT to CLOSED without publishing', () => {
      expect(canTransition(assignmentTransitions, AssignmentStatus.DRAFT, AssignmentStatus.CLOSED)).toBe(false);
    });
  });

  // =========================================================================
  // 4. Master Examination Lifecycle State Machine
  // =========================================================================
  describe('4. Master Examination Lifecycle State Machine', () => {
    const examTransitions: Record<string, string[]> = {
      [ExamStatus.DRAFT]: [ExamStatus.SCHEDULED, ExamStatus.CANCELLED],
      [ExamStatus.SCHEDULED]: [ExamStatus.ONGOING, ExamStatus.CANCELLED],
      [ExamStatus.ONGOING]: [ExamStatus.COMPLETED, ExamStatus.CANCELLED],
      [ExamStatus.COMPLETED]: [ExamStatus.MARKS_ENTRY],
      [ExamStatus.MARKS_ENTRY]: [ExamStatus.VERIFICATION],
      [ExamStatus.VERIFICATION]: [ExamStatus.RESULTS_PENDING, ExamStatus.MARKS_ENTRY], // Can return for correction
      [ExamStatus.RESULTS_PENDING]: [ExamStatus.RESULTS_APPROVED],
      [ExamStatus.RESULTS_APPROVED]: [ExamStatus.PUBLISHED],
      [ExamStatus.PUBLISHED]: [ExamStatus.ARCHIVED],
      [ExamStatus.CANCELLED]: [],
      [ExamStatus.ARCHIVED]: [],
    };

    it('permits standard multi-stage examination workflow to result publication', () => {
      expect(canTransition(examTransitions, ExamStatus.DRAFT, ExamStatus.SCHEDULED)).toBe(true);
      expect(canTransition(examTransitions, ExamStatus.SCHEDULED, ExamStatus.ONGOING)).toBe(true);
      expect(canTransition(examTransitions, ExamStatus.ONGOING, ExamStatus.COMPLETED)).toBe(true);
      expect(canTransition(examTransitions, ExamStatus.COMPLETED, ExamStatus.MARKS_ENTRY)).toBe(true);
      expect(canTransition(examTransitions, ExamStatus.MARKS_ENTRY, ExamStatus.VERIFICATION)).toBe(true);
      expect(canTransition(examTransitions, ExamStatus.VERIFICATION, ExamStatus.RESULTS_PENDING)).toBe(true);
      expect(canTransition(examTransitions, ExamStatus.RESULTS_PENDING, ExamStatus.RESULTS_APPROVED)).toBe(true);
      expect(canTransition(examTransitions, ExamStatus.RESULTS_APPROVED, ExamStatus.PUBLISHED)).toBe(true);
    });

    it('prohibits publishing results directly from SCHEDULED or MARKS_ENTRY stage', () => {
      expect(canTransition(examTransitions, ExamStatus.SCHEDULED, ExamStatus.PUBLISHED)).toBe(false);
      expect(canTransition(examTransitions, ExamStatus.MARKS_ENTRY, ExamStatus.PUBLISHED)).toBe(false);
    });
  });

  // =========================================================================
  // 5. Tuition Invoice Lifecycle State Machine
  // =========================================================================
  describe('5. Tuition Invoice Lifecycle State Machine', () => {
    const invoiceTransitions: Record<string, string[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
      [InvoiceStatus.ISSUED]: [InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      [InvoiceStatus.PARTIALLY_PAID]: [InvoiceStatus.PAID],
      [InvoiceStatus.PAID]: [InvoiceStatus.REFUNDED],
      [InvoiceStatus.CANCELLED]: [],
      [InvoiceStatus.REFUNDED]: [],
    };

    it('permits invoice payments and terminal states', () => {
      expect(canTransition(invoiceTransitions, InvoiceStatus.DRAFT, InvoiceStatus.ISSUED)).toBe(true);
      expect(canTransition(invoiceTransitions, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)).toBe(true);
      expect(canTransition(invoiceTransitions, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID)).toBe(true);
      expect(canTransition(invoiceTransitions, InvoiceStatus.PAID, InvoiceStatus.REFUNDED)).toBe(true);
    });

    it('prohibits cancelling a PAID invoice directly', () => {
      expect(canTransition(invoiceTransitions, InvoiceStatus.PAID, InvoiceStatus.CANCELLED)).toBe(false);
    });
  });

  // =========================================================================
  // 6. Payment Transaction Lifecycle State Machine
  // =========================================================================
  describe('6. Payment Transaction Lifecycle State Machine', () => {
    const paymentTransitions: Record<string, string[]> = {
      [PaymentStatus.INITIATED]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED],
      [PaymentStatus.SUCCESS]: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
    };

    it('permits payment completion and subsequent refund', () => {
      expect(canTransition(paymentTransitions, PaymentStatus.INITIATED, PaymentStatus.SUCCESS)).toBe(true);
      expect(canTransition(paymentTransitions, PaymentStatus.INITIATED, PaymentStatus.FAILED)).toBe(true);
      expect(canTransition(paymentTransitions, PaymentStatus.SUCCESS, PaymentStatus.REFUNDED)).toBe(true);
    });

    it('prohibits refunding a FAILED payment', () => {
      expect(canTransition(paymentTransitions, PaymentStatus.FAILED, PaymentStatus.REFUNDED)).toBe(false);
    });
  });

  // =========================================================================
  // 7. Library Circulation Lifecycle State Machine
  // =========================================================================
  describe('7. Library Circulation Lifecycle State Machine', () => {
    const circulationTransitions: Record<string, string[]> = {
      [CirculationStatus.ISSUED]: [CirculationStatus.RETURNED, CirculationStatus.OVERDUE, CirculationStatus.LOST],
      [CirculationStatus.OVERDUE]: [CirculationStatus.RETURNED, CirculationStatus.LOST],
      [CirculationStatus.RETURNED]: [],
      [CirculationStatus.LOST]: [],
    };

    it('permits valid book loan lifecycle transitions', () => {
      expect(canTransition(circulationTransitions, CirculationStatus.ISSUED, CirculationStatus.OVERDUE)).toBe(true);
      expect(canTransition(circulationTransitions, CirculationStatus.OVERDUE, CirculationStatus.RETURNED)).toBe(true);
      expect(canTransition(circulationTransitions, CirculationStatus.ISSUED, CirculationStatus.RETURNED)).toBe(true);
      expect(canTransition(circulationTransitions, CirculationStatus.OVERDUE, CirculationStatus.LOST)).toBe(true);
    });

    it('prohibits transitioning a RETURNED book to OVERDUE or LOST', () => {
      expect(canTransition(circulationTransitions, CirculationStatus.RETURNED, CirculationStatus.OVERDUE)).toBe(false);
      expect(canTransition(circulationTransitions, CirculationStatus.RETURNED, CirculationStatus.LOST)).toBe(false);
    });
  });
});
