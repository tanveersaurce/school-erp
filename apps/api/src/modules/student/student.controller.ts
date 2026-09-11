import { Request, Response, NextFunction } from 'express';
import { studentService } from './student.service.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentFilterSchema,
  studentStatusTransitionSchema,
  createGuardianSchema,
  updateGuardianSchema,
  guardianFilterSchema,
  createRelationSchema,
  updateRelationSchema,
  createEnrollmentSchema,
  updateEnrollmentSchema,
  enrollmentFilterSchema,
  createDocumentSchema,
  verifyDocumentSchema,
} from './student.validator.js';
import { StudentStatus, BadRequestError, createSuccessResponse } from '@edusphere/common';

const ApiResponse = {
  success: <T>(data: T, message = 'Success', meta?: Record<string, any>) => ({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: meta?.requestId || '',
      ...meta,
    },
  }),
  paginated: <T>(
    items: T[],
    totalRecords: number,
    page: number,
    limit: number,
    totalPages: number,
    message = 'Success'
  ) => ({
    success: true,
    message,
    data: items,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: '',
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  }),
};

export class StudentController {
  // =========================================================================
  // 1. Unique Identifiers
  // =========================================================================
  async getNextAdmissionNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId;
      const admissionNumber = await studentService.generateNextAdmissionNumber(tenantId, schoolId);
      res.json(ApiResponse.success({ admissionNumber }));
    } catch (err) {
      next(err);
    }
  }

  async getNextStudentId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const studentId = await studentService.generateNextStudentId(tenantId);
      res.json(ApiResponse.success({ studentId }));
    } catch (err) {
      next(err);
    }
  }

  async getNextGuardianId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const guardianId = await studentService.generateNextGuardianId(tenantId);
      res.json(ApiResponse.success({ guardianId }));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Student Endpoints
  // =========================================================================
  async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const campusIdScope = req.auth!.campusId;
      const query = studentFilterSchema.parse(req.query);
      const result = await studentService.getStudents(tenantId, query, campusIdScope);
      res.json(
        ApiResponse.paginated(
          result.students,
          result.total,
          result.page,
          query.limit || 20,
          result.totalPages
        )
      );
    } catch (err) {
      next(err);
    }
  }

  async getStudentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const student = await studentService.getStudentById(tenantId, id, req.auth!);
      res.json(ApiResponse.success(student));
    } catch (err) {
      next(err);
    }
  }

  async createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId || (req.body.schoolId as string);
      if (!schoolId) {
        throw new BadRequestError('School ID is required for student registration.');
      }
      const input = createStudentSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const student = await studentService.createStudent(tenantId, schoolId, input as any, meta);
      res.status(201).json(ApiResponse.success(student, 'Student created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const input = updateStudentSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const student = await studentService.updateStudent(tenantId, id, input as any, meta);
      res.json(ApiResponse.success(student, 'Student updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      await studentService.deleteStudent(tenantId, id, meta);
      res.json(ApiResponse.success(null, 'Student archived successfully.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Lifecycle Endpoints
  // =========================================================================
  async transitionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const { status, reason } = studentStatusTransitionSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const student = await studentService.transitionStudentStatus(
        tenantId,
        id,
        status,
        reason,
        meta
      );
      res.json(ApiResponse.success(student, `Student status transitioned to ${status}.`));
    } catch (err) {
      next(err);
    }
  }

  async admitStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.body.status = StudentStatus.ADMITTED;
    return this.transitionStatus(req, res, next);
  }

  async activateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.body.status = StudentStatus.ACTIVE;
    return this.transitionStatus(req, res, next);
  }

  async suspendStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.body.status = StudentStatus.SUSPENDED;
    return this.transitionStatus(req, res, next);
  }

  async transferStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.body.status = StudentStatus.TRANSFERRED;
    return this.transitionStatus(req, res, next);
  }

  async withdrawStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.body.status = StudentStatus.WITHDRAWN;
    return this.transitionStatus(req, res, next);
  }

  async graduateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.body.status = StudentStatus.GRADUATED;
    return this.transitionStatus(req, res, next);
  }

  async archiveStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.body.status = StudentStatus.ARCHIVED;
    return this.transitionStatus(req, res, next);
  }

  // =========================================================================
  // 4. Documents
  // =========================================================================
  async addDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const input = createDocumentSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const student = await studentService.addDocument(tenantId, id, input, meta);
      res.status(201).json(ApiResponse.success(student, 'Document uploaded successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async verifyDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id, docId } = req.params;
      const input = verifyDocumentSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const student = await studentService.verifyDocument(tenantId, id, docId, input, meta);
      res.json(
        ApiResponse.success(
          student,
          `Document ${input.verificationStatus.toLowerCase()} successfully.`
        )
      );
    } catch (err) {
      next(err);
    }
  }

  async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id, docId } = req.params;
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const student = await studentService.deleteDocument(tenantId, id, docId, meta);
      res.json(ApiResponse.success(student, 'Document deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Guardians
  // =========================================================================
  async getGuardians(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const query = guardianFilterSchema.parse(req.query);
      const result = await studentService.getGuardians(tenantId, query);
      res.json(
        ApiResponse.paginated(
          result.guardians,
          result.total,
          result.page,
          query.limit || 20,
          result.totalPages
        )
      );
    } catch (err) {
      next(err);
    }
  }

  async getGuardianById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const guardian = await studentService.getGuardianById(tenantId, id);
      res.json(ApiResponse.success(guardian));
    } catch (err) {
      next(err);
    }
  }

  async createGuardian(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const input = createGuardianSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const guardian = await studentService.createGuardian(tenantId, input, meta);
      res.status(201).json(ApiResponse.success(guardian, 'Guardian created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateGuardian(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const input = updateGuardianSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const guardian = await studentService.updateGuardian(tenantId, id, input, meta);
      res.json(ApiResponse.success(guardian, 'Guardian updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deleteGuardian(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      await studentService.deleteGuardian(tenantId, id, meta);
      res.json(ApiResponse.success(null, 'Guardian deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async inviteGuardian(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const result = await studentService.inviteGuardian(tenantId, id, meta);
      res.json(ApiResponse.success(null, result.message));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Relationships
  // =========================================================================
  async getStudentGuardians(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { studentId } = req.params;
      const relations = await studentService.getStudentGuardians(tenantId, studentId);
      res.json(ApiResponse.success(relations));
    } catch (err) {
      next(err);
    }
  }

  async linkStudentGuardian(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { studentId } = req.params;
      const input = createRelationSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const relation = await studentService.linkStudentGuardian(tenantId, studentId, input, meta);
      res.status(201).json(ApiResponse.success(relation, 'Guardian linked successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateRelationship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const input = updateRelationSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const relation = await studentService.updateRelationship(tenantId, id, input, meta);
      res.json(ApiResponse.success(relation, 'Relationship updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async unlinkStudentGuardian(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      await studentService.unlinkStudentGuardian(tenantId, id, meta);
      res.json(ApiResponse.success(null, 'Relationship removed successfully.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 7. Enrollments
  // =========================================================================
  async getEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const query = enrollmentFilterSchema.parse(req.query);
      const result = await studentService.getEnrollments(tenantId, query);
      res.json(
        ApiResponse.paginated(
          result.enrollments,
          result.total,
          result.page,
          query.limit || 20,
          result.totalPages
        )
      );
    } catch (err) {
      next(err);
    }
  }

  async getEnrollmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const enrollment = await studentService.getEnrollmentById(tenantId, id);
      res.json(ApiResponse.success(enrollment));
    } catch (err) {
      next(err);
    }
  }

  async createEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const schoolId = req.auth!.schoolId || (req.body.schoolId as string);
      if (!schoolId) {
        throw new BadRequestError('School ID is required for enrollment.');
      }
      const input = createEnrollmentSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const enrollment = await studentService.createEnrollment(
        tenantId,
        schoolId,
        input as any,
        meta
      );
      res.status(201).json(ApiResponse.success(enrollment, 'Enrollment created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const input = updateEnrollmentSchema.parse(req.body);
      const meta = {
        tenantId,
        userId: req.auth!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };
      const enrollment = await studentService.updateEnrollment(tenantId, id, input, meta);
      res.json(ApiResponse.success(enrollment, 'Enrollment updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 8. Parent Perspective (Zero-Trust Anti-IDOR)
  // =========================================================================
  async getMyChildren(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const children = await studentService.getAuthorizedChildren(req.auth!);
      res.json(ApiResponse.success(children));
    } catch (err) {
      next(err);
    }
  }

  async getMyChildById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const child = await studentService.getAuthorizedChildById(req.auth!, id);
      res.json(ApiResponse.success(child));
    } catch (err) {
      next(err);
    }
  }
}

export const studentController = new StudentController();
