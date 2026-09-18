import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUpRight,
} from 'lucide-react';
import { useListExportJobsQuery } from '../../features/reports/reportsApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import type { IReportExportJob } from '@edusphere/types';

export const ExportJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: res, isLoading, isFetching, refetch } = useListExportJobsQuery();

  const jobs: IReportExportJob[] = res?.data || [];

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
            <Clock className="h-3.5 w-3.5" />
            Queued
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </span>
        );
      default:
        return <span className="text-slate-400">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-indigo-400" />
            Background Export Downloads
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor and download high-volume asynchronous analytical reports and scheduled data archives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/reports/explorer')}
            className="flex items-center gap-1.5 text-indigo-300 border-indigo-500/30 hover:bg-indigo-950/30"
          >
            <ArrowUpRight className="h-4 w-4" />
            Explorer
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/reports/scheduled')}
            className="flex items-center gap-1.5 text-slate-300"
          >
            <Clock className="h-4 w-4" />
            Schedules
          </Button>
        </div>
      </div>

      {/* Export Jobs Table */}
      <Card className="p-6">
        {jobs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileSpreadsheet className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-base font-semibold text-slate-300">No export jobs recorded</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Run reports with high volume in Report Explorer or trigger automated schedules to create asynchronous export tasks.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/reports/explorer')}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500"
            >
              Open Report Explorer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-700">Report Key</th>
                  <th className="px-4 py-3 border-b border-slate-700">Format</th>
                  <th className="px-4 py-3 border-b border-slate-700">Status</th>
                  <th className="px-4 py-3 border-b border-slate-700">Progress</th>
                  <th className="px-4 py-3 border-b border-slate-700">Rows / Size</th>
                  <th className="px-4 py-3 border-b border-slate-700">Created At</th>
                  <th className="px-4 py-3 border-b border-slate-700">Expires</th>
                  <th className="px-4 py-3 border-b border-slate-700 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {jobs.map((job) => {
                  const id = job.id || job._id;
                  const isCompleted = job.status === 'COMPLETED';
                  const errorMsg = job.failureReason || job.errorMessage;
                  const progressPct = job.progressPercentage ?? job.progress ?? 0;

                  return (
                    <tr key={id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-white">
                          {job.reportKey}
                        </span>
                        {errorMsg && (
                          <div className="text-[10px] text-rose-400 mt-0.5 truncate max-w-xs">
                            {errorMsg}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                          {job.format}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{progressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                job.status === 'FAILED'
                                  ? 'bg-rose-500'
                                  : isCompleted
                                  ? 'bg-emerald-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {job.rowCount !== undefined ? `${job.rowCount.toLocaleString()} rows` : '—'}
                        {job.fileSizeBytes ? ` • ${formatBytes(job.fileSizeBytes)}` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {job.expiresAt ? new Date(job.expiresAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isCompleted ? (
                          <a
                            href={`/api/v1/reports/exports/${id}/download`}
                            download
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
