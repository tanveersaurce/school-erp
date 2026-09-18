import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  StopCircle,
  Bell,
} from 'lucide-react';
import {
  useGetCommunicationJobByIdQuery,
  useCancelCommunicationJobMutation,
} from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { CommunicationJobStatus } from '@edusphere/common';

export const CommunicationJobDetailsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: res, isLoading, refetch } = useGetCommunicationJobByIdQuery(id, {
    skip: !id,
    pollingInterval: 5000,
  });
  const [cancelJob, { isLoading: isCancelling }] = useCancelCommunicationJobMutation();

  const job = res?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-bold text-gray-800">Job Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/communication/jobs')} className="mt-4">
          Back to Jobs
        </Button>
      </div>
    );
  }

  const handleCancel = async () => {
    if (confirm('Cancel this active communication job? Pending dispatches will be stopped.')) {
      await cancelJob(id);
      refetch();
    }
  };

  const progressPct =
    job.totalRecipients > 0
      ? Math.round((job.processedRecipients / job.totalRecipients) * 100)
      : 100;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={() => navigate('/communication/jobs')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Jobs</span>
      </button>

      {/* Main Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                {job.communicationType}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-gray-100 text-gray-800">
                Status: {job.status}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">{job.title}</h1>
          </div>

          {(job.status === CommunicationJobStatus.QUEUED ||
            job.status === CommunicationJobStatus.PROCESSING) && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel Job</span>
            </Button>
          )}
        </div>

        {/* Progress Metric Box */}
        <div className="p-5 bg-slate-50 rounded-xl border border-gray-100 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Dispatch Progress</span>
            <span className="font-bold text-gray-900">
              {job.processedRecipients} of {job.totalRecipients} ({progressPct}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                job.status === CommunicationJobStatus.FAILED
                  ? 'bg-red-500'
                  : job.status === CommunicationJobStatus.COMPLETED
                  ? 'bg-green-600'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 text-center border-t border-gray-200/60">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Targets</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{job.totalRecipients}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Delivered</p>
              <p className="text-lg font-bold text-green-700 mt-0.5">{job.successCount}</p>
            </div>
            <div>
              <p className="text-xs text-red-600 font-medium">Failures</p>
              <p className="text-lg font-bold text-red-700 mt-0.5">{job.failureCount}</p>
            </div>
          </div>
        </div>

        {/* Channels and Timestamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-gray-400" />
              <span>Requested Channels</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {job.requestedChannels?.map((ch: string) => (
                <span key={ch} className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                  {ch}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Timestamps</span>
            </h4>
            <p className="text-xs text-gray-600">
              Started: <strong>{new Date(job.startedAt || job.createdAt).toLocaleString()}</strong>
            </p>
            {job.completedAt && (
              <p className="text-xs text-gray-600 mt-1">
                Completed: <strong>{new Date(job.completedAt).toLocaleString()}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Failure Summary (if any) */}
        {job.failureSummary && job.failureSummary.length > 0 && (
          <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
            <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Logged Failure Diagnostics ({job.failureSummary.length})</span>
            </h4>
            <ul className="text-xs text-red-700 font-mono space-y-1 list-disc pl-5 max-h-40 overflow-y-auto">
              {job.failureSummary.map((fail: string, idx: number) => (
                <li key={idx}>{fail}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};
