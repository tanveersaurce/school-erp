import { Types } from 'mongoose';
import {
  ExportJobStatus,
  ReportFormat,
  NotFoundError,
  BadRequestError,
} from '@edusphere/common';
import {
  IReportScope,
  IReportExportJob,
} from '@edusphere/types';
import { ReportExportJob } from '@edusphere/database';
import { REPORT_DEFINITIONS_MAP } from '../registry/report-definitions.js';
import { reportQueryEngineService } from './report-query-engine.service.js';
import { csvGeneratorService } from './csv-generator.service.js';

// Ephemeral export file content store for generated exports
const exportFileCache = new Map<string, { content: string; contentType: string; fileName: string }>();

export class ReportExportService {
  /**
   * Generates a synchronous CSV export for smaller datasets.
   */
  async exportSync(
    reportKey: string,
    filters: Record<string, any>,
    scope: IReportScope
  ): Promise<{ fileName: string; content: string; rowCount: number }> {
    const definition = REPORT_DEFINITIONS_MAP.get(reportKey);
    if (!definition) {
      throw new NotFoundError(`Report '${reportKey}' not found.`);
    }

    const result = await reportQueryEngineService.executeReport(
      {
        reportKey,
        filters,
        format: ReportFormat.CSV,
        limit: 2000,
      },
      scope
    );

    const rows = result.data || result.items || [];
    const csvContent = csvGeneratorService.generateCsv(definition.columns, rows);
    const fileName = `${reportKey.replace('.', '_')}_${new Date().toISOString().substring(0, 10)}.csv`;

    return {
      fileName,
      content: csvContent,
      rowCount: rows.length,
    };
  }

  /**
   * Creates an asynchronous background export job.
   */
  async createExportJob(
    reportKey: string,
    filters: Record<string, any>,
    scope: IReportScope,
    format = ReportFormat.CSV
  ): Promise<IReportExportJob> {
    const definition = REPORT_DEFINITIONS_MAP.get(reportKey);
    if (!definition) {
      throw new NotFoundError(`Report '${reportKey}' not found.`);
    }

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours TTL

    const job = await ReportExportJob.create({
      tenantId: new Types.ObjectId(scope.tenantId),
      schoolId: scope.schoolId ? new Types.ObjectId(scope.schoolId) : undefined,
      requestedBy: new Types.ObjectId(scope.userId),
      reportKey,
      filters,
      format,
      status: ExportJobStatus.QUEUED,
      progressPercentage: 0,
      expiresAt,
    });

    // Fire asynchronous background worker execution
    this.processJobAsync(job._id.toString(), reportKey, filters, scope).catch(() => {});

    return {
      id: job._id.toString(),
      tenantId: scope.tenantId,
      schoolId: scope.schoolId,
      requestedBy: scope.userId || '',
      reportKey,
      filters,
      format,
      status: ExportJobStatus.QUEUED,
      progressPercentage: 0,
      expiresAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  /**
   * Background processor for an export job.
   */
  private async processJobAsync(
    jobId: string,
    reportKey: string,
    filters: Record<string, any>,
    scope: IReportScope
  ): Promise<void> {
    try {
      const job = await ReportExportJob.findById(jobId);
      if (!job) return;

      job.status = ExportJobStatus.PROCESSING;
      job.progressPercentage = 30;
      job.startedAt = new Date();
      await job.save();

      const definition = REPORT_DEFINITIONS_MAP.get(reportKey);
      if (!definition) throw new Error(`Report definition ${reportKey} not found`);

      const result = await reportQueryEngineService.executeReport(
        {
          reportKey,
          filters,
          format: ReportFormat.CSV,
          limit: 5000,
        },
        scope
      );

      job.progressPercentage = 75;
      await job.save();

      const rows = result.data || result.items || [];
      const csvContent = csvGeneratorService.generateCsv(definition.columns, rows);
      const fileName = `${reportKey.replace('.', '_')}_${Date.now()}.csv`;
      const fileBytes = Buffer.byteLength(csvContent, 'utf8');

      // Store in memory cache for downloads
      exportFileCache.set(jobId, {
        content: csvContent,
        contentType: 'text/csv; charset=utf-8',
        fileName,
      });

      job.status = ExportJobStatus.COMPLETED;
      job.progressPercentage = 100;
      job.rowCount = rows.length;
      job.fileSizeBytes = fileBytes;
      job.fileName = fileName;
      job.fileReference = `exports/${scope.tenantId}/${jobId}.csv`;
      job.downloadUrl = `/api/v1/reports/exports/${jobId}/download`;
      job.completedAt = new Date();
      await job.save();
    } catch (err) {
      await ReportExportJob.findByIdAndUpdate(jobId, {
        status: ExportJobStatus.FAILED,
        failureReason: (err as Error).message || 'Export execution failed.',
      });
    }
  }

  /**
   * Retrieves an export job status.
   */
  async getJobStatus(jobId: string, tenantId: string): Promise<IReportExportJob> {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestError('Invalid export job ID.');
    }

    const job = await ReportExportJob.findOne({
      _id: new Types.ObjectId(jobId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!job) {
      throw new NotFoundError('Export job not found.');
    }

    return {
      id: job._id.toString(),
      tenantId: job.tenantId.toString(),
      schoolId: job.schoolId?.toString(),
      requestedBy: job.requestedBy.toString(),
      reportKey: job.reportKey,
      filters: job.filters || {},
      format: job.format as ReportFormat,
      status: job.status as ExportJobStatus,
      progressPercentage: job.progressPercentage,
      rowCount: job.rowCount,
      fileSizeBytes: job.fileSizeBytes,
      fileName: job.fileName,
      downloadUrl: job.downloadUrl,
      failureReason: job.failureReason,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      expiresAt: job.expiresAt || new Date(),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  /**
   * List recent export jobs for the requesting user.
   */
  async listUserJobs(
    tenantId: string,
    requestedBy: string,
    page = 1,
    limit = 20
  ): Promise<{ jobs: IReportExportJob[]; totalCount: number }> {
    const query = {
      tenantId: new Types.ObjectId(tenantId),
      requestedBy: new Types.ObjectId(requestedBy),
    };

    const totalCount = await ReportExportJob.countDocuments(query);
    const docs = await ReportExportJob.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const jobs = docs.map((j: any) => ({
      id: j._id.toString(),
      tenantId: j.tenantId.toString(),
      schoolId: j.schoolId?.toString(),
      requestedBy: j.requestedBy.toString(),
      reportKey: j.reportKey,
      filters: j.filters || {},
      format: j.format as ReportFormat,
      status: j.status as ExportJobStatus,
      progressPercentage: j.progressPercentage,
      rowCount: j.rowCount,
      fileSizeBytes: j.fileSizeBytes,
      fileName: j.fileName,
      downloadUrl: j.downloadUrl,
      failureReason: j.failureReason,
      expiresAt: j.expiresAt,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }));

    return { jobs, totalCount };
  }

  /**
   * Retrieves downloadable content for a completed job.
   */
  async getExportFile(
    jobId: string,
    tenantId: string
  ): Promise<{ content: string; contentType: string; fileName: string }> {
    const job = await this.getJobStatus(jobId, tenantId);
    if (job.status !== ExportJobStatus.COMPLETED) {
      throw new BadRequestError(`Export job status is ${job.status}. File not ready.`);
    }

    const cached = exportFileCache.get(jobId);
    if (cached) {
      return cached;
    }

    // If cache expired, re-generate on demand
    const definition = REPORT_DEFINITIONS_MAP.get(job.reportKey);
    if (!definition) throw new NotFoundError('Report definition not found.');

    const result = await reportQueryEngineService.executeReport(
      {
        reportKey: job.reportKey,
        filters: job.filters,
        format: ReportFormat.CSV,
        limit: 5000,
      },
      { tenantId }
    );

    const rows = result.data || result.items || [];
    const content = csvGeneratorService.generateCsv(definition.columns, rows);
    const fileName = job.fileName || `${job.reportKey}.csv`;

    return {
      content,
      contentType: 'text/csv; charset=utf-8',
      fileName,
    };
  }
}

export const reportExportService = new ReportExportService();
