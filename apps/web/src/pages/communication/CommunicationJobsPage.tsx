import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  RotateCw,
  ChevronRight,
} from 'lucide-react';
import { useGetCommunicationJobsQuery } from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { CommunicationJobStatus, CommunicationJobType } from '@edusphere/common';

export const CommunicationJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: res, isLoading, refetch } = useGetCommunicationJobsQuery(
    {
      status: statusFilter || undefined,
      communicationType: typeFilter || undefined,
      page,
      limit: 15,
    },
    { pollingInterval: 10000 }
  );

  const jobs = res?.data?.items || [];
  const total = res?.data?.total || 0;
  const totalPages = Math.ceil(total / 15) || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case CommunicationJobStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case CommunicationJobStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            Processing
          </span>
        );
      case CommunicationJobStatus.PARTIALLY_COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Partial
          </span>
        );
      case CommunicationJobStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600" />
            <span>Communication Jobs & Campaigns</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor background delivery progress, asynchronous dispatch batches, and recipient status.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2">
          <RotateCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.values(CommunicationJobStatus).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Communication Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {Object.values(CommunicationJobType).map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Jobs Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No Communication Jobs</h3>
          <p className="text-sm text-gray-500 mt-1">
            Jobs will appear automatically when announcements or bulk messages are broadcast.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-5 py-3">Campaign / Title</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Progress</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job: any) => {
                  const pct =
                    job.totalRecipients > 0
                      ? Math.round((job.processedRecipients / job.totalRecipients) * 100)
                      : 100;
                  return (
                    <tr
                      key={job._id || job.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => navigate(`/communication/jobs/${job._id || job.id}`)}
                    >
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {job.title}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-gray-600">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {job.communicationType}
                        </span>
                      </td>
                      <td className="px-5 py-4 w-48">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>
                            {job.processedRecipients} / {job.totalRecipients}
                          </span>
                          <span className="font-semibold text-gray-700">{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              job.failureCount > 0 ? 'bg-amber-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {job.failureCount > 0 && (
                          <p className="text-[10px] text-red-600 mt-1">
                            {job.failureCount} failed delivery attempts
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(job.status)}</td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {new Date(job.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 text-xs">
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {jobs.length} of {total} jobs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
