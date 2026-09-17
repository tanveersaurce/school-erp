import { describe, it, expect } from 'vitest';
import { Money, FeeCategoryType, HostelBillingFrequency } from '@edusphere/common';

describe('Phase 17: Hostel Zero-Float Financial Precision Suite', () => {
  it('1. Computes room rate, mess fee, and caution deposit summation with zero float precision', () => {
    // Base room rate: $350.00 / term -> 35000 cents
    const baseRoomMinorUnits = 35000;
    // Mess / dining fee: $125.50 -> 12550 cents
    const messFeeMinorUnits = 12550;
    // Caution deposit (refundable): $100.00 -> 10000 cents
    const cautionDepositMinorUnits = 10000;

    const totalHostelFee = Money.add(baseRoomMinorUnits, messFeeMinorUnits, cautionDepositMinorUnits);
    expect(totalHostelFee).toBe(57550);
    expect(Money.fromMinorUnits(totalHostelFee)).toBe(575.50);
    expect(Money.format(totalHostelFee, 'USD')).toBe('$575.50');
  });

  it('2. Calculates multi-term and annual boarding fee aggregations without floating point errors', () => {
    // Quarterly term fee: $450.75 (45075 minor units)
    const quarterlyFee = 45075;
    // 4 quarters in academic year
    const annualFee = Money.multiply(quarterlyFee, 4);
    expect(annualFee).toBe(180300);
    expect(Money.fromMinorUnits(annualFee)).toBe(1803.00);

    // 10% early registration discount on annual fee: $180.30 -> 18030 minor units
    const discountAmount = Money.calculatePercentage(annualFee, 10);
    expect(discountAmount).toBe(18030);

    const netAnnualFee = Money.subtract(annualFee, discountAmount);
    expect(netAnnualFee).toBe(162270);
    expect(Money.fromMinorUnits(netAnnualFee)).toBe(1622.70);
  });

  it('3. Computes hostel damage reconciliation and partial caution deposit refund', () => {
    // Student paid caution deposit: $150.00 -> 15000 minor units
    const cautionDeposit = 15000;

    // Room inspection damage charges:
    // Broken window pane: $45.25 -> 4525 cents
    const brokenWindow = 4525;
    // Wardrobe lock replacement: $22.50 -> 2250 cents
    const lockRepair = 2250;

    const totalDeductions = Money.add(brokenWindow, lockRepair);
    expect(totalDeductions).toBe(6775);
    expect(Money.fromMinorUnits(totalDeductions)).toBe(67.75);

    // Refundable caution balance
    const refundAmount = Money.subtract(cautionDeposit, totalDeductions);
    expect(refundAmount).toBe(8225);
    expect(Money.fromMinorUnits(refundAmount)).toBe(82.25);
    expect(Money.format(refundAmount, 'USD')).toBe('$82.25');
  });

  it('4. Reconciles maintenance expenses against budget with integer precision', () => {
    // Plumbing repair: $230.50 -> 23050 minor units
    const plumbingCost = 23050;
    // Electrical rewiring: $415.75 -> 41575 minor units
    const electricalCost = 41575;
    // Carpentry: $185.00 -> 18500 minor units
    const carpentryCost = 18500;

    const totalActualExpense = Money.add(plumbingCost, electricalCost, carpentryCost);
    expect(totalActualExpense).toBe(83125);
    expect(Money.fromMinorUnits(totalActualExpense)).toBe(831.25);

    // Budget allocated: $1000.00 -> 100000 minor units
    const allocatedBudget = 100000;
    const remainingBudget = Money.subtract(allocatedBudget, totalActualExpense);
    expect(remainingBudget).toBe(16875);
    expect(Money.fromMinorUnits(remainingBudget)).toBe(168.75);
  });

  it('5. Verifies FeeCategoryType.HOSTEL categorization integrity', () => {
    expect(FeeCategoryType.HOSTEL).toBe('HOSTEL');
    expect(HostelBillingFrequency.QUARTERLY).toBe('QUARTERLY');
  });
});
