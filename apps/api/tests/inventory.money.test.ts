import { describe, it, expect } from 'vitest';
import { Money, InventoryValuationMethod } from '@edusphere/common';

describe('Phase 18: Inventory Zero-Float Financial Precision Suite', () => {
  it('1. Computes item receipt cost, batch valuations, and weighted average cost calculation with zero float precision', () => {
    // Initial opening stock: 100 units at $15.50 (1550 minor units) = $1550.00 (155000 minor units)
    const initialQty = 100;
    const initialUnitCost = 1550;
    const initialTotalCost = Money.multiply(initialUnitCost, initialQty);
    expect(initialTotalCost).toBe(155000);

    // New incoming batch receipt: 50 units at $18.25 (1825 minor units) = $912.50 (91250 minor units)
    const receiptQty = 50;
    const receiptUnitCost = 1825;
    const receiptTotalCost = Money.multiply(receiptUnitCost, receiptQty);
    expect(receiptTotalCost).toBe(91250);

    // Combined inventory pool
    const combinedQty = initialQty + receiptQty; // 150
    const combinedTotalCost = Money.add(initialTotalCost, receiptTotalCost); // 246250
    expect(combinedTotalCost).toBe(246250);
    expect(Money.fromMinorUnits(combinedTotalCost)).toBe(2462.50);

    // Weighted average unit cost = 246250 / 150 = 1641.67 -> rounded 1642 minor units ($16.42)
    const newAverageCost = Math.round(combinedTotalCost / combinedQty);
    expect(newAverageCost).toBe(1642);
    expect(Money.fromMinorUnits(newAverageCost)).toBe(16.42);
    expect(Money.format(newAverageCost, 'USD')).toBe('$16.42');
  });

  it('2. Calculates multi-item inventory shipment receipt total calculation without precision loss', () => {
    // Shipment items:
    // Item 1: 25 packs of Microscope Slides @ $12.35 -> 1235 minor units
    const item1Cost = Money.multiply(1235, 25); // 30875
    // Item 2: 100 units of Lab Beakers @ $4.49 -> 449 minor units
    const item2Cost = Money.multiply(449, 100); // 44900
    // Item 3: 15 boxes of Nitrile Gloves @ $29.99 -> 2999 minor units
    const item3Cost = Money.multiply(2999, 15); // 44985

    const totalShipmentCost = Money.add(item1Cost, item2Cost, item3Cost);
    expect(totalShipmentCost).toBe(120760);
    expect(Money.fromMinorUnits(totalShipmentCost)).toBe(1207.60);
    expect(Money.format(totalShipmentCost, 'USD')).toBe('$1,207.60');
  });

  it('3. Computes stock issue consumption and depletion valuation', () => {
    // Current stock on hand: 80 units @ $25.00 (2500 minor units) = $2000.00 (200000 minor units)
    const currentQty = 80;
    const unitCost = 2500;
    const totalValuationBefore = Money.multiply(unitCost, currentQty);
    expect(totalValuationBefore).toBe(200000);

    // Issue 35 units to Chemistry Department
    const issuedQty = 35;
    const issueValuation = Money.multiply(unitCost, issuedQty);
    expect(issueValuation).toBe(87500);
    expect(Money.fromMinorUnits(issueValuation)).toBe(875.00);

    // Balance remaining: 45 units @ $25.00 = $1125.00 (112500 minor units)
    const balanceAfterQty = currentQty - issuedQty;
    const totalValuationAfter = Money.subtract(totalValuationBefore, issueValuation);
    expect(balanceAfterQty).toBe(45);
    expect(totalValuationAfter).toBe(112500);
    expect(Money.fromMinorUnits(totalValuationAfter)).toBe(1125.00);
  });

  it('4. Reconciles physical count variance valuation and inventory adjustment cost impact', () => {
    // Item unit cost: $14.75 -> 1475 minor units
    const unitCost = 1475;

    // Physical count: system expected 50, counted 46 (deficit of 4 units due to breakage)
    const systemQty = 50;
    const countedQty = 46;
    const variance = countedQty - systemQty; // -4
    expect(variance).toBe(-4);

    const varianceCostImpact = Money.multiply(unitCost, Math.abs(variance));
    expect(varianceCostImpact).toBe(5900); // $59.00
    expect(Money.fromMinorUnits(varianceCostImpact)).toBe(59.00);
    expect(Money.format(varianceCostImpact, 'USD')).toBe('$59.00');
  });

  it('5. Computes durable asset purchase, maintenance, and disposal recovery proceeds', () => {
    // 5 Digital Projectors purchased @ $650.00 each -> 65000 minor units
    const projectorUnitCost = 65000;
    const totalAssetCost = Money.multiply(projectorUnitCost, 5);
    expect(totalAssetCost).toBe(325000); // $3250.00

    // Annual maintenance: bulb replacement ($85.50) + lens cleaning ($35.00)
    const bulbCost = 8550;
    const serviceCost = 3500;
    const totalMaintenance = Money.add(bulbCost, serviceCost);
    expect(totalMaintenance).toBe(12050); // $120.50

    // After 5 years, decommission and sell 1 projector for salvage value of $120.00
    const salvageProceeds = 12000;
    expect(Money.fromMinorUnits(salvageProceeds)).toBe(120.00);
    expect(Money.format(salvageProceeds, 'USD')).toBe('$120.00');
  });
});
