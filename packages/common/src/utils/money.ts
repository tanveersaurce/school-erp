import { LateFeeType } from '../constants/enums.js';

/**
 * Utility functions for zero-floating-point financial calculations.
 * All monetary amounts are handled as integer minor units (e.g. cents/paise).
 */
export const Money = {
  /**
   * Converts major unit (e.g. 100.50) to integer minor unit (10050).
   */
  toMinorUnits(amount: number): number {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return 0;
    }
    return Math.round((amount + Number.EPSILON) * 100);
  },

  /**
   * Converts integer minor unit (10050) to major unit (100.50).
   */
  fromMinorUnits(minorUnits: number): number {
    if (typeof minorUnits !== 'number' || isNaN(minorUnits)) {
      return 0;
    }
    return Math.round(minorUnits) / 100;
  },

  /**
   * Formats minor units into localized currency string.
   */
  formatMoney(
    minorUnits: number,
    currency = 'USD',
    locale = 'en-US'
  ): string {
    const major = Money.fromMinorUnits(minorUnits);
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(major);
    } catch {
      return `${currency} ${major.toFixed(2)}`;
    }
  },

  /**
   * Adds integer minor units safely.
   */
  add(...amounts: number[]): number {
    return amounts.reduce((acc, curr) => acc + Math.round(curr || 0), 0);
  },

  /**
   * Subtracts integer minor units safely.
   */
  subtract(minuend: number, ...subtrahends: number[]): number {
    const subTotal = subtrahends.reduce((acc, curr) => acc + Math.round(curr || 0), 0);
    return Math.round(minuend || 0) - subTotal;
  },

  /**
   * Multiplies an integer minor unit amount by a quantity or factor.
   */
  multiply(amount: number, factor: number): number {
    return Math.round((Math.round(amount || 0) * factor) + Number.EPSILON);
  },

  /**
   * Calculates percentage discount or fee on an integer minor unit amount.
   * Deterministic half-up rounding.
   */
  calculatePercentage(baseAmount: number, percentage: number): number {
    if (!percentage || percentage <= 0) return 0;
    return Math.round(((Math.round(baseAmount || 0) * percentage) / 100) + Number.EPSILON);
  },

  /**
   * Calculates late fee based on policy rules.
   */
  calculateLateFee(
    baseAmount: number,
    lateFeeType: LateFeeType,
    rateOrAmount: number,
    daysOverdue: number,
    maxLateFee?: number
  ): number {
    if (daysOverdue <= 0 || !rateOrAmount || rateOrAmount <= 0) {
      return 0;
    }

    let calculated = 0;
    if (lateFeeType === LateFeeType.FLAT) {
      calculated = Math.round(rateOrAmount);
    } else if (lateFeeType === LateFeeType.DAILY_RATE) {
      calculated = Math.round(rateOrAmount) * daysOverdue;
    } else if (lateFeeType === LateFeeType.PERCENTAGE) {
      calculated = Money.calculatePercentage(baseAmount, rateOrAmount);
    }

    if (maxLateFee && maxLateFee > 0 && calculated > maxLateFee) {
      calculated = maxLateFee;
    }

    return calculated;
  },
};
