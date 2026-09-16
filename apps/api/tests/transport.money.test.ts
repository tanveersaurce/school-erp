import { describe, it, expect } from 'vitest';
import { Money } from '@edusphere/common';

describe('Phase 16: Transport Zero-Float Financial Precision Suite', () => {
  it('1. Computes pickup and drop stop fare summation with zero float precision', () => {
    // Pickup stop fare: $15.50 -> 1550 cents
    const pickupFareMinorUnits = 1550;
    // Drop stop fare: $12.75 -> 1275 cents
    const dropFareMinorUnits = 1275;

    const totalFare = Money.add(pickupFareMinorUnits, dropFareMinorUnits);
    expect(totalFare).toBe(2825);
    expect(Money.fromMinorUnits(totalFare)).toBe(28.25);
    expect(Money.format(totalFare, 'USD')).toBe('$28.25');
  });

  it('2. Computes discount deduction on student transport assignment safely', () => {
    // Base fare: $120.00 / month = 12000 cents
    const baseFareMinorUnits = 12000;
    // Sibling discount: 15% -> 1800 cents
    const discountAmount = Money.calculatePercentage(baseFareMinorUnits, 15);
    expect(discountAmount).toBe(1800);

    // Final fare = 12000 - 1800 = 10200 cents
    const finalFare = Money.subtract(baseFareMinorUnits, discountAmount);
    expect(finalFare).toBe(10200);
    expect(Money.fromMinorUnits(finalFare)).toBe(102.00);
  });

  it('3. Computes vehicle maintenance expense reconciliation with parts and service charges', () => {
    // Parts: $450.25 -> 45025 cents
    const partsCost = 45025;
    // Labor: $150.50 -> 15050 cents
    const laborCost = 15050;
    // Tax 10% on labor: 1505 cents
    const laborTax = Money.calculatePercentage(laborCost, 10);
    expect(laborTax).toBe(1505);

    // Total actual cost
    const totalMaintenanceCost = Money.add(partsCost, laborCost, laborTax);
    expect(totalMaintenanceCost).toBe(61580);
    expect(Money.fromMinorUnits(totalMaintenanceCost)).toBe(615.80);

    // Variance against budget of $600.00 (60000 cents)
    const estimatedCost = 60000;
    const variance = Money.subtract(totalMaintenanceCost, estimatedCost);
    expect(variance).toBe(1580); // $15.80 over budget
  });

  it('4. Aggregates monthly transport revenue across routes deterministically', () => {
    // 35 students at $75.50 (7550 cents)
    const tier1StudentCount = 35;
    const tier1Fare = 7550;
    const tier1Revenue = Money.multiply(tier1Fare, tier1StudentCount);
    expect(tier1Revenue).toBe(264250);

    // 22 students at $110.25 (11025 cents)
    const tier2StudentCount = 22;
    const tier2Fare = 11025;
    const tier2Revenue = Money.multiply(tier2Fare, tier2StudentCount);
    expect(tier2Revenue).toBe(242550);

    // Total route fleet revenue = 264250 + 242550 = 506800 cents ($5,068.00)
    const totalFleetRevenue = Money.add(tier1Revenue, tier2Revenue);
    expect(totalFleetRevenue).toBe(506800);
    expect(Money.fromMinorUnits(totalFleetRevenue)).toBe(5068.00);
  });
});
