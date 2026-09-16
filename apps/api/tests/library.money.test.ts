import { describe, it, expect } from 'vitest';
import { Money } from '@edusphere/common';

describe('Phase 15: Library Management Zero-Float Precision Suite', () => {
  it('1. Calculates overdue fine with DAILY rate and grace period deterministically in integer minor units', () => {
    // Daily fine rate: $0.50 -> 50 cents (minor units)
    const dailyRate = 50;
    const gracePeriodDays = 2;
    const maxFineCap = 1500; // $15.00 cap

    // Scenario A: Returned within grace period (e.g. 2 days overdue) -> 0 fine
    const daysOverdueA = 2;
    const billableDaysA = Math.max(0, daysOverdueA - gracePeriodDays);
    const fineA = billableDaysA * dailyRate;
    expect(fineA).toBe(0);

    // Scenario B: Returned 7 days overdue (5 billable days) -> $2.50 = 250 cents
    const daysOverdueB = 7;
    const billableDaysB = Math.max(0, daysOverdueB - gracePeriodDays);
    const fineB = Money.multiply(dailyRate, billableDaysB);
    expect(fineB).toBe(250);
    expect(Money.fromMinorUnits(fineB)).toBe(2.50);

    // Scenario C: Returned 40 days overdue (38 billable days) -> 38 * 50 = 1900, but capped at 1500
    const daysOverdueC = 40;
    const billableDaysC = Math.max(0, daysOverdueC - gracePeriodDays);
    const rawFineC = Money.multiply(dailyRate, billableDaysC);
    const cappedFineC = Math.min(rawFineC, maxFineCap);
    expect(rawFineC).toBe(1900);
    expect(cappedFineC).toBe(1500);
    expect(Money.fromMinorUnits(cappedFineC)).toBe(15.00);
  });

  it('2. Calculates FIXED overdue fine without regard to days past grace period', () => {
    const fixedFineAmount = 500; // $5.00 fixed fine
    const gracePeriodDays = 3;

    // Within grace period (3 days) -> 0
    const daysOverdueA = 3;
    const fineA = daysOverdueA <= gracePeriodDays ? 0 : fixedFineAmount;
    expect(fineA).toBe(0);

    // Beyond grace period (4 days or 30 days) -> fixed amount
    const daysOverdueB = 4;
    const fineB = daysOverdueB <= gracePeriodDays ? 0 : fixedFineAmount;
    expect(fineB).toBe(500);

    const daysOverdueC = 30;
    const fineC = daysOverdueC <= gracePeriodDays ? 0 : fixedFineAmount;
    expect(fineC).toBe(500);
  });

  it('3. Computes lost book assessment: replacement cost + processing fee with multiplier', () => {
    // Book replacement cost: $35.00 -> 3500 cents
    const replacementCost = 3500;
    // Multiplier 1.5x (represented as integer percentage or scaling: 150%)
    const costMultiplier = 1.5;
    const processingFee = 500; // $5.00 processing fee

    // Base replacement = 3500 * 1.5 = 5250
    const scaledReplacement = Money.multiply(replacementCost, costMultiplier);
    expect(scaledReplacement).toBe(5250);

    // Total lost assessment = scaledReplacement + processingFee
    const totalAssessment = Money.add(scaledReplacement, processingFee);
    expect(totalAssessment).toBe(5750);
    expect(Money.fromMinorUnits(totalAssessment)).toBe(57.50);
  });

  it('4. Computes damaged book repair vs replacement assessment in exact cents', () => {
    // Book cost $40.00 = 4000 cents
    const originalCost = 4000;
    // Minor damage: 25% penalty
    const minorDamageFee = Money.calculatePercentage(originalCost, 25);
    expect(minorDamageFee).toBe(1000); // $10.00

    // Moderate damage: 50% penalty
    const moderateDamageFee = Money.calculatePercentage(originalCost, 50);
    expect(moderateDamageFee).toBe(2000); // $20.00

    // Severe / irreparable damage: 100% + $5 processing fee
    const processingFee = 500;
    const severeDamageFee = Money.add(originalCost, processingFee);
    expect(severeDamageFee).toBe(4500); // $45.00
  });

  it('5. Handles partial fine waivers and settlements with zero floating-point remainder errors', () => {
    const originalFine = 1850; // $18.50
    const waiverAmount = 500;  // $5.00 authorized waiver

    const remainingPayable = Money.subtract(originalFine, waiverAmount);
    expect(remainingPayable).toBe(1350); // $13.50

    // Partial payment of $10.00
    const partialPayment = 1000;
    const balanceAfterPayment = Money.subtract(remainingPayable, partialPayment);
    expect(balanceAfterPayment).toBe(350); // $3.50

    // Final settlement of $3.50
    const finalPayment = 350;
    const finalBalance = Money.subtract(balanceAfterPayment, finalPayment);
    expect(finalBalance).toBe(0);
  });

  it('6. Multi-currency library fine formatting verifies standard currency support', () => {
    const fineAmount = 1250; // 12.50

    const formattedUsd = Money.formatMoney(fineAmount, 'USD', 'en-US');
    expect(formattedUsd).toContain('12.50');

    const formattedGbp = Money.formatMoney(fineAmount, 'GBP', 'en-GB');
    expect(formattedGbp).toContain('12.50');

    const formattedInr = Money.formatMoney(fineAmount, 'INR', 'en-IN');
    expect(formattedInr).toContain('12.50');
  });
});
