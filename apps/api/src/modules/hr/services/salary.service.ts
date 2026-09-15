import { Types } from 'mongoose';
import {
  SalaryComponent,
  SalaryStructure,
  EmployeeSalaryAssignment,
  Employee,
} from '@edusphere/database';
import {
  NotFoundError,
  BadRequestError,
  Money,
  SalaryComponentType,
  ComponentCalculationType,
} from '@edusphere/common';

export class SalaryService {
  // =========================================================================
  // Salary Components
  // =========================================================================
  public async createSalaryComponent(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId, input: any) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    const existing = await SalaryComponent.findOne({
      tenantId: tId,
      schoolId: sId,
      code: input.code.toUpperCase(),
      isDeleted: false,
    });

    if (existing) {
      throw new BadRequestError(`Salary component with code '${input.code}' already exists.`);
    }

    return await SalaryComponent.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      name: input.name,
      code: input.code.toUpperCase(),
      type: input.type,
      calculationType: input.calculationType || ComponentCalculationType.FIXED,
      amountOrPercentage: input.amountOrPercentage,
      baseComponentCode: input.baseComponentCode?.toUpperCase(),
      isTaxable: input.isTaxable ?? true,
      isStatutory: input.isStatutory ?? false,
      statutoryType: input.statutoryType,
      status: input.status || 'ACTIVE',
    });
  }

  public async getSalaryComponents(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId) {
    return await SalaryComponent.find({
      tenantId: new Types.ObjectId(tenantId.toString()),
      schoolId: new Types.ObjectId(schoolId.toString()),
      isDeleted: false,
    }).sort({ type: 1, name: 1 });
  }

  public async updateSalaryComponent(tenantId: string | Types.ObjectId, id: string | Types.ObjectId, input: any) {
    const comp = await SalaryComponent.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!comp) {
      throw new NotFoundError('Salary component not found.');
    }

    Object.assign(comp, input);
    await comp.save();
    return comp;
  }

  public async deleteSalaryComponent(tenantId: string | Types.ObjectId, id: string | Types.ObjectId) {
    const comp = await SalaryComponent.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!comp) {
      throw new NotFoundError('Salary component not found.');
    }

    comp.isDeleted = true;
    await comp.save();
    return { success: true, message: 'Salary component archived successfully.' };
  }

  // =========================================================================
  // Salary Structures
  // =========================================================================
  public async createSalaryStructure(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId, input: any) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    return await SalaryStructure.create({
      tenantId: tId,
      schoolId: sId,
      campusId: input.campusId ? new Types.ObjectId(input.campusId) : undefined,
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      components: input.components.map((c: any) => ({
        componentId: new Types.ObjectId(c.componentId),
        componentCode: c.componentCode.toUpperCase(),
        name: c.name,
        type: c.type,
        calculationType: c.calculationType,
        amountOrPercentage: c.amountOrPercentage,
        baseComponentCode: c.baseComponentCode?.toUpperCase(),
        isStatutory: c.isStatutory ?? false,
      })),
      version: 1,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
      status: 'ACTIVE',
    });
  }

  public async getSalaryStructures(tenantId: string | Types.ObjectId, schoolId: string | Types.ObjectId) {
    return await SalaryStructure.find({
      tenantId: new Types.ObjectId(tenantId.toString()),
      schoolId: new Types.ObjectId(schoolId.toString()),
      isDeleted: false,
    }).sort({ name: 1, version: -1 });
  }

  public async getSalaryStructureById(tenantId: string | Types.ObjectId, id: string | Types.ObjectId) {
    const structure = await SalaryStructure.findOne({
      _id: new Types.ObjectId(id.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!structure) {
      throw new NotFoundError('Salary structure not found.');
    }

    return structure;
  }

  public async versionSalaryStructure(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    existingStructureId: string | Types.ObjectId,
    input: any
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());

    const existing = await SalaryStructure.findOne({
      _id: new Types.ObjectId(existingStructureId.toString()),
      tenantId: tId,
      isDeleted: false,
    });

    if (!existing) {
      throw new NotFoundError('Salary structure not found.');
    }

    const nextVersion = existing.version + 1;

    return await SalaryStructure.create({
      tenantId: tId,
      schoolId: sId,
      campusId: existing.campusId,
      name: input.name || existing.name,
      code: existing.code,
      description: input.description || existing.description,
      components: input.components.map((c: any) => ({
        componentId: new Types.ObjectId(c.componentId),
        componentCode: c.componentCode.toUpperCase(),
        name: c.name,
        type: c.type,
        calculationType: c.calculationType,
        amountOrPercentage: c.amountOrPercentage,
        baseComponentCode: c.baseComponentCode?.toUpperCase(),
        isStatutory: c.isStatutory ?? false,
      })),
      version: nextVersion,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
      status: 'ACTIVE',
    });
  }

  // =========================================================================
  // Employee Salary Assignment
  // =========================================================================
  public async assignSalaryToEmployee(
    tenantId: string | Types.ObjectId,
    schoolId: string | Types.ObjectId,
    campusId: string | Types.ObjectId | undefined,
    employeeId: string | Types.ObjectId,
    input: any
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const sId = new Types.ObjectId(schoolId.toString());
    const empId = new Types.ObjectId(employeeId.toString());
    const structureId = new Types.ObjectId(input.salaryStructureId);

    const [employee, structure] = await Promise.all([
      Employee.findOne({ _id: empId, tenantId: tId, isDeleted: false }),
      SalaryStructure.findOne({ _id: structureId, tenantId: tId, isDeleted: false }),
    ]);

    if (!employee) throw new NotFoundError('Employee not found.');
    if (!structure) throw new NotFoundError('Salary structure not found.');

    const baseSalary = input.baseSalary; // Integer minor units
    let grossEarnings = baseSalary;
    let totalDeductions = 0;

    // Evaluate earnings & deductions from structure
    for (const comp of structure.components) {
      let compAmount = 0;
      if (comp.calculationType === ComponentCalculationType.PERCENTAGE) {
        compAmount = Money.calculatePercentage(baseSalary, comp.amountOrPercentage);
      } else {
        compAmount = comp.amountOrPercentage; // minor units
      }

      if (comp.type === SalaryComponentType.EARNING) {
        grossEarnings = Money.add(grossEarnings, compAmount);
      } else if (comp.type === SalaryComponentType.DEDUCTION) {
        totalDeductions = Money.add(totalDeductions, compAmount);
      }
    }

    // Evaluate custom employee overrides
    if (input.customComponents && Array.isArray(input.customComponents)) {
      for (const custom of input.customComponents) {
        if (custom.type === SalaryComponentType.EARNING) {
          grossEarnings = Money.add(grossEarnings, custom.amount);
        } else if (custom.type === SalaryComponentType.DEDUCTION) {
          totalDeductions = Money.add(totalDeductions, custom.amount);
        }
      }
    }

    const netSalary = Money.subtract(grossEarnings, totalDeductions);
    const annualCTC = Money.multiply(grossEarnings, 12);

    // Supersede any existing active assignment
    await EmployeeSalaryAssignment.updateMany(
      { tenantId: tId, employeeId: empId, status: 'ACTIVE' },
      { $set: { status: 'SUPERSEDED' } }
    );

    const latest = await EmployeeSalaryAssignment.findOne({ tenantId: tId, employeeId: empId })
      .sort({ version: -1 });
    const version = (latest?.version || 0) + 1;

    return await EmployeeSalaryAssignment.create({
      tenantId: tId,
      schoolId: sId,
      campusId: campusId ? new Types.ObjectId(campusId.toString()) : undefined,
      employeeId: empId,
      salaryStructureId: structureId,
      baseSalary,
      grossSalary: grossEarnings,
      totalDeductions,
      netSalary,
      annualCTC,
      currency: input.currency || 'USD',
      customComponents: input.customComponents || [],
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
      version,
      status: 'ACTIVE',
    });
  }

  public async getEmployeeSalaryAssignment(tenantId: string | Types.ObjectId, employeeId: string | Types.ObjectId) {
    const assignment = await EmployeeSalaryAssignment.findOne({
      tenantId: new Types.ObjectId(tenantId.toString()),
      employeeId: new Types.ObjectId(employeeId.toString()),
      status: 'ACTIVE',
      isDeleted: false,
    }).populate('salaryStructureId');

    return assignment;
  }

  public async getSalaryAssignmentHistory(tenantId: string | Types.ObjectId, employeeId: string | Types.ObjectId) {
    return await EmployeeSalaryAssignment.find({
      tenantId: new Types.ObjectId(tenantId.toString()),
      employeeId: new Types.ObjectId(employeeId.toString()),
      isDeleted: false,
    })
      .populate('salaryStructureId', 'name code version')
      .sort({ effectiveFrom: -1 });
  }
}

export const salaryService = new SalaryService();
