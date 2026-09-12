import { Request, Response, NextFunction } from 'express';
import { academicService } from './academic.service.js';
import {
  createClassSchema,
  updateClassSchema,
  classFilterSchema,
  createSectionSchema,
  updateSectionSchema,
  sectionFilterSchema,
  createAcademicClassSchema,
  updateAcademicClassSchema,
  academicClassFilterSchema,
  createSubjectSchema,
  updateSubjectSchema,
  subjectFilterSchema,
  createClassSubjectSchema,
  updateClassSubjectSchema,
  createTeacherAssignmentSchema,
  updateTeacherAssignmentSchema,
  teacherAssignmentFilterSchema,
  enrollStudentAcademicSchema,
  assignRollNumberSchema,
  classTeacherAssignmentSchema,
} from './academic.validator.js';
import { BadRequestError } from '@edusphere/common';

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

export class AcademicController {
  private getMeta(req: Request) {
    return {
      tenantId: req.auth!.tenantId,
      userId: req.auth!.userId,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    };
  }

  // =========================================================================
  // 1. Grade / Class Level Handlers
  // =========================================================================

  async createClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const schoolId = (req.body.schoolId || req.auth?.schoolId) as string;
      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const validated = createClassSchema.parse(req.body);
      const result = await academicService.createClass(
        tenantId,
        schoolId,
        validated,
        this.getMeta(req)
      );

      res.status(201).json(ApiResponse.success(result, 'Class created successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const query = classFilterSchema.parse(req.query);
      const result = await academicService.getClasses(tenantId, query);

      res
        .status(200)
        .json(
          ApiResponse.paginated(
            result.items,
            result.totalRecords,
            result.page,
            result.limit,
            result.totalPages
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async getClassById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.getClassById(tenantId, req.params.id);
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = updateClassSchema.parse(req.body);
      const result = await academicService.updateClass(
        tenantId,
        req.params.id,
        validated,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Class updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      await academicService.deleteClass(tenantId, req.params.id, this.getMeta(req));
      res.status(200).json(ApiResponse.success(null, 'Class deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Section Handlers
  // =========================================================================

  async createSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const schoolId = (req.body.schoolId || req.auth?.schoolId) as string;
      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const validated = createSectionSchema.parse(req.body);
      const result = await academicService.createSection(
        tenantId,
        schoolId,
        validated,
        this.getMeta(req)
      );

      res.status(201).json(ApiResponse.success(result, 'Section created successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getSections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const query = sectionFilterSchema.parse(req.query);
      const result = await academicService.getSections(tenantId, query);

      res
        .status(200)
        .json(
          ApiResponse.paginated(
            result.items,
            result.totalRecords,
            result.page,
            result.limit,
            result.totalPages
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async getSectionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.getSectionById(tenantId, req.params.id);
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = updateSectionSchema.parse(req.body);
      const result = await academicService.updateSection(
        tenantId,
        req.params.id,
        validated,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Section updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      await academicService.deleteSection(tenantId, req.params.id, this.getMeta(req));
      res.status(200).json(ApiResponse.success(null, 'Section deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Academic Class Handlers
  // =========================================================================

  async createAcademicClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const schoolId = (req.body.schoolId || req.auth?.schoolId) as string;
      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const validated = createAcademicClassSchema.parse(req.body);
      const result = await academicService.createAcademicClass(
        tenantId,
        schoolId,
        validated,
        this.getMeta(req)
      );

      res.status(201).json(ApiResponse.success(result, 'Academic class created successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getAcademicClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const query = academicClassFilterSchema.parse(req.query);
      const result = await academicService.getAcademicClasses(tenantId, query, req.auth);

      res
        .status(200)
        .json(
          ApiResponse.paginated(
            result.items,
            result.totalRecords,
            result.page,
            result.limit,
            result.totalPages
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async getAcademicClassById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.getAcademicClassById(tenantId, req.params.id, req.auth);
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateAcademicClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = updateAcademicClassSchema.parse(req.body);
      const result = await academicService.updateAcademicClass(
        tenantId,
        req.params.id,
        validated,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Academic class updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteAcademicClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      await academicService.deleteAcademicClass(tenantId, req.params.id, this.getMeta(req));
      res.status(200).json(ApiResponse.success(null, 'Academic class deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  async assignClassTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = classTeacherAssignmentSchema.parse(req.body);
      const result = await academicService.assignClassTeacher(
        tenantId,
        req.params.id,
        validated.classTeacherId,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Class teacher assigned successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getAcademicClassDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.getAcademicClassDetails(
        tenantId,
        req.params.id,
        req.auth
      );
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Subject Handlers
  // =========================================================================

  async createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const schoolId = (req.body.schoolId || req.auth?.schoolId) as string;
      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const validated = createSubjectSchema.parse(req.body);
      const result = await academicService.createSubject(
        tenantId,
        schoolId,
        validated,
        this.getMeta(req)
      );

      res.status(201).json(ApiResponse.success(result, 'Subject created successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const query = subjectFilterSchema.parse(req.query);
      const result = await academicService.getSubjects(tenantId, query);

      res
        .status(200)
        .json(
          ApiResponse.paginated(
            result.items,
            result.totalRecords,
            result.page,
            result.limit,
            result.totalPages
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async getSubjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.getSubjectById(tenantId, req.params.id);
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = updateSubjectSchema.parse(req.body);
      const result = await academicService.updateSubject(
        tenantId,
        req.params.id,
        validated,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Subject updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      await academicService.deleteSubject(tenantId, req.params.id, this.getMeta(req));
      res.status(200).json(ApiResponse.success(null, 'Subject deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. Class ↔ Subject Handlers
  // =========================================================================

  async createClassSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const schoolId = (req.body.schoolId || req.auth?.schoolId) as string;
      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const validated = createClassSubjectSchema.parse(req.body);
      const result = await academicService.createClassSubject(
        tenantId,
        schoolId,
        validated,
        this.getMeta(req)
      );

      res.status(201).json(ApiResponse.success(result, 'Subject mapped to class successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getClassSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const academicYearId = req.query.academicYearId as string;
      const classId = req.query.classId as string;

      if (!academicYearId || !classId) {
        throw new BadRequestError('Both academicYearId and classId query parameters are required');
      }

      const result = await academicService.getClassSubjects(tenantId, academicYearId, classId);
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateClassSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = updateClassSubjectSchema.parse(req.body);
      const result = await academicService.updateClassSubject(
        tenantId,
        req.params.id,
        validated,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Mapping updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteClassSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      await academicService.deleteClassSubject(tenantId, req.params.id, this.getMeta(req));
      res.status(200).json(ApiResponse.success(null, 'Mapping deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 6. Teacher Subject Assignment Handlers
  // =========================================================================

  async createTeacherAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const schoolId = (req.body.schoolId || req.auth?.schoolId) as string;
      if (!schoolId) {
        throw new BadRequestError('School ID is required');
      }

      const validated = createTeacherAssignmentSchema.parse(req.body);
      const result = await academicService.assignTeacherToSubject(
        tenantId,
        schoolId,
        validated,
        this.getMeta(req)
      );

      res.status(201).json(ApiResponse.success(result, 'Teacher assigned to subject successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getTeacherAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const query = teacherAssignmentFilterSchema.parse(req.query);
      const result = await academicService.getTeacherAssignments(tenantId, query, req.auth);

      res
        .status(200)
        .json(
          ApiResponse.paginated(
            result.items,
            result.totalRecords,
            result.page,
            result.limit,
            result.totalPages
          )
        );
    } catch (err) {
      next(err);
    }
  }

  async getTeacherAssignmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.getTeacherAssignmentById(tenantId, req.params.id);
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateTeacherAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = updateTeacherAssignmentSchema.parse(req.body);
      const result = await academicService.updateTeacherAssignment(
        tenantId,
        req.params.id,
        validated,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Assignment updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  async deleteTeacherAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      await academicService.deleteTeacherAssignment(tenantId, req.params.id, this.getMeta(req));
      res.status(200).json(ApiResponse.success(null, 'Assignment deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 7. Academic Enrollment & Roll Numbers Handlers
  // =========================================================================

  async enrollStudentAcademic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = enrollStudentAcademicSchema.parse(req.body);
      const result = await academicService.enrollStudentAcademic(
        tenantId,
        validated,
        this.getMeta(req)
      );
      res.status(201).json(ApiResponse.success(result, 'Student enrolled in class successfully'));
    } catch (err) {
      next(err);
    }
  }

  async assignRollNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const validated = assignRollNumberSchema.parse(req.body);
      const result = await academicService.assignRollNumber(
        tenantId,
        req.params.id,
        validated.rollNumber,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Roll number assigned successfully'));
    } catch (err) {
      next(err);
    }
  }

  async autoAssignRollNumbers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.autoAssignRollNumbers(
        tenantId,
        req.params.id,
        this.getMeta(req)
      );
      res.status(200).json(ApiResponse.success(result, 'Roll numbers auto-assigned successfully'));
    } catch (err) {
      next(err);
    }
  }

  async getClassStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const result = await academicService.getClassStudents(tenantId, req.params.id, req.auth);
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 8. Academic Dashboard Summary Handler
  // =========================================================================

  async getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId!;
      const campusId = req.query.campusId as string | undefined;
      const academicYearId = req.query.academicYearId as string | undefined;

      const result = await academicService.getAcademicDashboardSummary(
        tenantId,
        campusId,
        academicYearId
      );
      res.status(200).json(ApiResponse.success(result));
    } catch (err) {
      next(err);
    }
  }
}

export const academicController = new AcademicController();
