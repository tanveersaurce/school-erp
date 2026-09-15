import { describe, it, expect } from 'vitest';
import { Money } from '@edusphere/common';

describe('Phase 14: HR & Payroll Zero-Float Precision Suite', () => {
  it('1. Calculates exact salary components in integer minor units without floating-point errors', () => {
    // Base salary: $5,000.00 -> 500,000 minor units (cents)
    const baseSalary = 500000;

    // HRA: 40% of base salary = 200,000 minor units ($2,000.00)
    const hra = Money.calculatePercentage(baseSalary, 40);
    expect(hra).toBe(200000);

    // Special Allowance: 15% of base salary = 75,000 minor units ($750.00)
    const specialAllowance = Money.calculatePercentage(baseSalary, 15);
    expect(specialAllowance).toBe(75000);

    // Gross salary: Base + HRA + Special Allowance = 775,000 minor units ($7,750.00)
    const grossSalary = Money.add(baseSalary, hra, specialAllowance);
    expect(grossSalary).toBe(775000);

    // Deductions: Provident Fund (PF) 12% = 60,000 minor units ($600.00)
    const pfDeduction = Money.calculatePercentage(baseSalary, 12);
    expect(pfDeduction).toBe(60000);

    // Professional Tax fixed amount = 20,000 minor units ($200.00)
    const ptDeduction = 20000;

    // Total deductions = 80,000 minor units ($800.00)
    const totalDeductions = Money.add(pfDeduction, ptDeduction);
    expect(totalDeductions).toBe(80000);

    // Net pay = 695,000 minor units ($6,950.00)
    const netPay = Money.subtract(grossSalary, totalDeductions);
    expect(netPay).toBe(695000);
    expect(Money.fromMinorUnits(netPay)).toBe(6950.0);
  });

  it('2. Calculates daily rate and Leave Without Pay (LWP) deductions deterministically', () => {
    const baseSalary = 660000; // $6,600.00 in minor units
    const workingDays = 22;

    // Daily rate = baseSalary / workingDays = 30,000 minor units/day ($300.00/day)
    const dailyRate = Math.floor(baseSalary / workingDays);
    expect(dailyRate).toBe(30000);

    // 3 days of unpaid leave (LWP)
    const unpaidDays = 3;
    const lwpDeduction = Money.multiply(dailyRate, unpaidDays);
    expect(lwpDeduction).toBe(90000); // Exactly $900.00

    // Adjusted pay after LWP
    const adjustedBase = Money.subtract(baseSalary, lwpDeduction);
    expect(adjustedBase).toBe(570000);
  });

  it('3. Computes overtime compensation with exact integer multiplication', () => {
    // Hourly rate: $45.50 -> 4550 minor units
    const hourlyRate = 4550;
    const overtimeHours = 8.5;

    const totalOvertime = Money.multiply(hourlyRate, overtimeHours);
    expect(totalOvertime).toBe(38675); // $386.75
    expect(Money.fromMinorUnits(totalOvertime)).toBe(386.75);
  });

  it('4. Computes annual CTC accurately', () => {
    const monthlyGross = 750000; // $7,500.00
    const annualCTC = Money.multiply(monthlyGross, 12);
    expect(annualCTC).toBe(9000000); // $90,000.00
    expect(Money.fromMinorUnits(annualCTC)).toBe(90000);
  });

  it('5. Supports multi-currency formatting dynamically without hardcoded currency', () => {
    const amount = 250050; // 2,500.50

    const formattedUsd = Money.formatMoney(amount, 'USD', 'en-US');
    expect(formattedUsd).toContain('2,500.50');

    const formattedGbp = Money.formatMoney(amount, 'GBP', 'en-GB');
    expect(formattedGbp).toContain('2,500.50');

    const formattedInr = Money.formatMoney(amount, 'INR', 'en-IN');
    expect(formattedInr).toContain('2,500.50');
  });
});
