import { describe, it, expect } from 'vitest';
import { Money, LateFeeType } from '@edusphere/common';

describe('Phase 13: Zero-Float Money Math & Precision Suite', () => {
  it('should accurately convert between major and integer minor units avoiding IEEE-754 precision bugs', () => {
    // Classic JavaScript float pitfall: 0.1 + 0.2 = 0.30000000000000004
    const floatSum = 0.1 + 0.2;
    expect(floatSum).not.toBe(0.3); // Demonstrates JS native float inaccuracy

    // Money utility eliminates float inaccuracy
    const minorSum = Money.toMinorUnits(floatSum);
    expect(minorSum).toBe(30); // Exactly 30 cents/paise
    expect(Money.fromMinorUnits(minorSum)).toBe(0.3);

    expect(Money.toMinorUnits(100.5)).toBe(10050);
    expect(Money.toMinorUnits(99.99)).toBe(9999);
    expect(Money.fromMinorUnits(10050)).toBe(100.5);
    expect(Money.fromMinorUnits(9999)).toBe(99.99);
  });

  it('should format minor units into localized currency strings', () => {
    const formattedUsd = Money.formatMoney(125050, 'USD', 'en-US');
    expect(formattedUsd).toContain('1,250.50');

    const formattedEur = Money.formatMoney(50000, 'EUR', 'en-US');
    expect(formattedEur).toContain('500.00');
  });

  it('should perform deterministic addition and subtraction with integer minor units', () => {
    const sum = Money.add(10000, 2500, 500); // 100.00 + 25.00 + 5.00
    expect(sum).toBe(13000);

    const diff = Money.subtract(13000, 2500, 500);
    expect(diff).toBe(10000);
  });

  it('should calculate percentage discounts with deterministic half-up rounding', () => {
    // 10% on 15,000 minor units ($150.00) = 1,500 minor units ($15.00)
    const discount10 = Money.calculatePercentage(15000, 10);
    expect(discount10).toBe(1500);

    // 15% on 9,999 minor units = 1499.85 -> rounds to 1500
    const discount15 = Money.calculatePercentage(9999, 15);
    expect(discount15).toBe(1500);

    // 0% discount
    expect(Money.calculatePercentage(10000, 0)).toBe(0);
    expect(Money.calculatePercentage(10000, -5)).toBe(0);
  });

  it('should calculate late fees correctly across FLAT, DAILY_RATE, and PERCENTAGE policies', () => {
    // No late fee if not overdue
    expect(Money.calculateLateFee(50000, LateFeeType.FLAT, 500, 0)).toBe(0);
    expect(Money.calculateLateFee(50000, LateFeeType.DAILY_RATE, 50, -2)).toBe(0);

    // FLAT late fee
    const flatFee = Money.calculateLateFee(50000, LateFeeType.FLAT, 1000, 5);
    expect(flatFee).toBe(1000);

    // DAILY_RATE: 50 minor units per day * 10 days = 500
    const dailyFee = Money.calculateLateFee(50000, LateFeeType.DAILY_RATE, 50, 10);
    expect(dailyFee).toBe(500);

    // PERCENTAGE: 2% on 100,000 = 2,000
    const percFee = Money.calculateLateFee(100000, LateFeeType.PERCENTAGE, 2, 5);
    expect(percFee).toBe(2000);

    // Capped by maxLateFee
    const cappedFee = Money.calculateLateFee(50000, LateFeeType.DAILY_RATE, 500, 10, 2000);
    expect(cappedFee).toBe(2000); // 5000 clamped to 2000
  });
});
