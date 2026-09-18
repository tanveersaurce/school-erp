import { Types } from 'mongoose';
import {
  CommunicationJob,
  ICommunicationJobDoc,
} from '@edusphere/database';
import {
  CommunicationJobType,
  CommunicationJobStatus,
  NotificationChannel,
  NotFoundError,
  BadRequestError,
} from '@edusphere/common';
import { IAnnouncementAudience } from '@edusphere/types';

export interface CreateCommunicationJobInput {
  tenantId: string;
  schoolId?: string;
  title: string;
  communicationType: CommunicationJobType;
  sourceEntity?: {
    entityType: string;
    entityId: string;
  };
  audienceDefinition?: IAnnouncementAudience;
  requestedChannels: NotificationChannel[];
  totalRecipients: number;
  createdBy?: string;
}

export class CommunicationJobService {
  /**
   * Create a communication job record
   */
  public static async createJob(
    input: CreateCommunicationJobInput
  ): Promise<ICommunicationJobDoc> {
    const job = await CommunicationJob.create({
      tenantId: new Types.ObjectId(input.tenantId),
      schoolId: input.schoolId ? new Types.ObjectId(input.schoolId) : undefined,
      title: input.title,
      communicationType: input.communicationType,
      sourceEntity: input.sourceEntity
        ? {
            entityType: input.sourceEntity.entityType,
            entityId: new Types.ObjectId(input.sourceEntity.entityId),
          }
        : undefined,
      audienceDefinition: input.audienceDefinition,
      requestedChannels: input.requestedChannels,
      status: CommunicationJobStatus.PROCESSING,
      totalRecipients: input.totalRecipients,
      processedRecipients: 0,
      successCount: 0,
      failureCount: 0,
      startedAt: new Date(),
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
    });

    return job;
  }

  /**
   * Update progress counters
   */
  public static async updateJobProgress(
    jobId: string,
    processed: number,
    success: number,
    failure: number,
    failures: string[]
  ): Promise<void> {
    await CommunicationJob.findByIdAndUpdate(jobId, {
      $set: {
        processedRecipients: processed,
        successCount: success,
        failureCount: failure,
        failureSummary: failures.slice(0, 20), // Cap logged failures to 20
      },
    });
  }

  /**
   * Mark job completed or partially completed
   */
  public static async completeJob(
    jobId: string,
    success: number,
    failure: number,
    failures: string[]
  ): Promise<void> {
    const finalStatus =
      failure === 0
        ? CommunicationJobStatus.COMPLETED
        : success > 0
        ? CommunicationJobStatus.PARTIALLY_COMPLETED
        : CommunicationJobStatus.FAILED;

    await CommunicationJob.findByIdAndUpdate(jobId, {
      $set: {
        status: finalStatus,
        successCount: success,
        failureCount: failure,
        failureSummary: failures.slice(0, 20),
        completedAt: new Date(),
      },
    });
  }

  /**
   * Retrieve list of communication jobs with pagination
   */
  public static async getJobs(
    tenantId: string,
    query: {
      status?: CommunicationJobStatus;
      communicationType?: CommunicationJobType;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: ICommunicationJobDoc[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (query.status) {
      filter.status = query.status;
    }
    if (query.communicationType) {
      filter.communicationType = query.communicationType;
    }

    const [items, total] = await Promise.all([
      CommunicationJob.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CommunicationJob.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Get single job by ID
   */
  public static async getJobById(
    tenantId: string,
    id: string
  ): Promise<ICommunicationJobDoc> {
    const job = await CommunicationJob.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!job) {
      throw new NotFoundError('Communication job not found.');
    }
    return job;
  }

  /**
   * Cancel a pending or processing communication job
   */
  public static async cancelJob(
    tenantId: string,
    id: string
  ): Promise<ICommunicationJobDoc> {
    const job = await this.getJobById(tenantId, id);

    if (
      job.status === CommunicationJobStatus.COMPLETED ||
      job.status === CommunicationJobStatus.CANCELLED
    ) {
      throw new BadRequestError(`Cannot cancel job in state ${job.status}.`);
    }

    job.status = CommunicationJobStatus.CANCELLED;
    await job.save();
    return job;
  }
}
