import { Types } from 'mongoose';
import { Employee, AuditLog } from '@edusphere/database';
import { NotFoundError, BadRequestError, EmploymentStatus } from '@edusphere/common';

export class EmployeeHrService {
  /**
   * Retrieves an employee profile with HR extensions and document metadata.
   */
  public async getHrProfile(tenantId: string | Types.ObjectId, employeeId: string | Types.ObjectId) {
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(employeeId.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    })
      .populate('departmentId', 'name code')
      .populate('designationId', 'name code level')
      .populate('reportingManagerId', 'firstName lastName employeeId displayName');

    if (!employee) {
      throw new NotFoundError('Employee record not found.');
    }

    return employee;
  }

  /**
   * Updates HR-specific lifecycle and employment fields.
   */
  public async updateHrProfile(
    tenantId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    input: any,
    actorUserId?: string | Types.ObjectId
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const empId = new Types.ObjectId(employeeId.toString());

    const employee = await Employee.findOne({ _id: empId, tenantId: tId, isDeleted: false });
    if (!employee) {
      throw new NotFoundError('Employee record not found.');
    }

    const previousSnapshot = employee.toObject();

    if (input.probationStartDate !== undefined) employee.probationStartDate = input.probationStartDate ? new Date(input.probationStartDate) : undefined;
    if (input.probationEndDate !== undefined) employee.probationEndDate = input.probationEndDate ? new Date(input.probationEndDate) : undefined;
    if (input.confirmationDate !== undefined) employee.confirmationDate = input.confirmationDate ? new Date(input.confirmationDate) : undefined;
    if (input.workLocation !== undefined) employee.workLocation = input.workLocation;
    if (input.resignationDate !== undefined) employee.resignationDate = input.resignationDate ? new Date(input.resignationDate) : undefined;
    if (input.lastWorkingDate !== undefined) employee.lastWorkingDate = input.lastWorkingDate ? new Date(input.lastWorkingDate) : undefined;
    if (input.terminationDate !== undefined) employee.terminationDate = input.terminationDate ? new Date(input.terminationDate) : undefined;
    if (input.terminationReason !== undefined) employee.terminationReason = input.terminationReason;
    if (input.employmentType) employee.employmentType = input.employmentType;

    await employee.save();

    if (actorUserId) {
      await AuditLog.create({
        tenantId: tId,
        schoolId: employee.schoolId,
        userId: new Types.ObjectId(actorUserId.toString()),
        action: 'EMPLOYEE_HR_UPDATE',
        entity: 'Employee',
        entityId: empId.toString(),
        before: previousSnapshot,
        after: employee.toObject(),
      });
    }

    return employee;
  }

  /**
   * Controlled employment status transition state machine.
   */
  public async transitionStatus(
    tenantId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    newStatus: EmploymentStatus,
    reason?: string,
    effectiveDate?: string,
    actorUserId?: string | Types.ObjectId
  ) {
    const tId = new Types.ObjectId(tenantId.toString());
    const empId = new Types.ObjectId(employeeId.toString());

    const employee = await Employee.findOne({ _id: empId, tenantId: tId, isDeleted: false });
    if (!employee) {
      throw new NotFoundError('Employee record not found.');
    }

    const currentStatus = employee.employmentStatus;

    // Allowed status transitions
    const validTransitions: Record<EmploymentStatus, EmploymentStatus[]> = {
      [EmploymentStatus.ACTIVE]: [
        EmploymentStatus.PROBATION,
        EmploymentStatus.ON_LEAVE,
        EmploymentStatus.SUSPENDED,
        EmploymentStatus.RESIGNED,
        EmploymentStatus.TERMINATED,
        EmploymentStatus.RETIRED,
        EmploymentStatus.INACTIVE,
      ],
      [EmploymentStatus.PROBATION]: [
        EmploymentStatus.ACTIVE,
        EmploymentStatus.TERMINATED,
        EmploymentStatus.RESIGNED,
        EmploymentStatus.INACTIVE,
      ],
      [EmploymentStatus.ON_LEAVE]: [
        EmploymentStatus.ACTIVE,
        EmploymentStatus.RESIGNED,
        EmploymentStatus.TERMINATED,
      ],
      [EmploymentStatus.SUSPENDED]: [
        EmploymentStatus.ACTIVE,
        EmploymentStatus.TERMINATED,
        EmploymentStatus.INACTIVE,
      ],
      [EmploymentStatus.RESIGNED]: [
        EmploymentStatus.ACTIVE, // Re-hiring
        EmploymentStatus.INACTIVE,
      ],
      [EmploymentStatus.TERMINATED]: [
        EmploymentStatus.ACTIVE, // Reversal / Re-instatement
      ],
      [EmploymentStatus.RETIRED]: [],
      [EmploymentStatus.INACTIVE]: [
        EmploymentStatus.ACTIVE,
      ],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'.`
      );
    }

    const previousSnapshot = employee.toObject();
    employee.employmentStatus = newStatus;

    if (newStatus === EmploymentStatus.TERMINATED) {
      employee.terminationDate = effectiveDate ? new Date(effectiveDate) : new Date();
      if (reason) employee.terminationReason = reason;
    } else if (newStatus === EmploymentStatus.RESIGNED) {
      employee.resignationDate = effectiveDate ? new Date(effectiveDate) : new Date();
    }

    await employee.save();

    if (actorUserId) {
      await AuditLog.create({
        tenantId: tId,
        schoolId: employee.schoolId,
        userId: new Types.ObjectId(actorUserId.toString()),
        action: 'EMPLOYEE_STATUS_TRANSITION',
        entity: 'Employee',
        entityId: empId.toString(),
        before: { status: currentStatus },
        after: { status: newStatus, reason, effectiveDate },
      });
    }

    return employee;
  }

  /**
   * Adds an HR document metadata attachment.
   */
  public async addDocument(
    tenantId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    docInput: any
  ) {
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(employeeId.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!employee) {
      throw new NotFoundError('Employee record not found.');
    }

    employee.documents.push({
      name: docInput.name,
      documentType: docInput.documentType,
      fileRecordId: docInput.fileRecordId ? new Types.ObjectId(docInput.fileRecordId) : undefined,
      fileUrl: docInput.fileUrl,
      uploadedAt: new Date(),
    });

    await employee.save();
    return employee.documents;
  }

  /**
   * Removes an HR document attachment.
   */
  public async removeDocument(
    tenantId: string | Types.ObjectId,
    employeeId: string | Types.ObjectId,
    documentId: string
  ) {
    const employee = await Employee.findOne({
      _id: new Types.ObjectId(employeeId.toString()),
      tenantId: new Types.ObjectId(tenantId.toString()),
      isDeleted: false,
    });

    if (!employee) {
      throw new NotFoundError('Employee record not found.');
    }

    employee.documents = employee.documents.filter(
      (d: any) => d._id?.toString() !== documentId && d.id !== documentId
    );

    await employee.save();
    return employee.documents;
  }
}

export const employeeHrService = new EmployeeHrService();
