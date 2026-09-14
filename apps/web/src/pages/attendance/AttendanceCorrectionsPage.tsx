import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  User,
  X,
} from 'lucide-react';
import {
  useGetPendingCorrectionsQuery,
  useReviewCorrectionMutation,
} from '../../features/attendance/attendanceApi.js';
import { CorrectionStatus, AttendanceStatus } from '@edusphere/common';
import type { IAttendanceCorrection } from '@edusphere/types';

export const AttendanceCorrectionsPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<CorrectionStatus | ''>('');
  const [reviewingCorrection, setReviewingCorrection] = useState<IAttendanceCorrection | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const { data: correctionsRes, isLoading, refetch } = useGetPendingCorrectionsQuery();
  const [reviewCorrection, { isLoading: isReviewing }] = useReviewCorrectionMutation();

  const rawCorrections = correctionsRes?.data;
  const allCorrections: IAttendanceCorrection[] = Array.isArray(rawCorrections)
    ? rawCorrections
    : (rawCorrections as any)?.data || [];
  const filteredCorrections = selectedStatus
    ? allCorrections.filter((c) => c.status === selectedStatus)
    : allCorrections;

  const handleProcess = async (status: CorrectionStatus) => {
    if (!reviewingCorrection) return;
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      await reviewCorrection({
        correctionId: reviewingCorrection.id,
        body: {
          status,
          reviewRemarks: reviewRemarks.trim() || undefined,
        },
      }).unwrap();

      setSuccessBanner(`Correction marked as ${status}.`);
      setReviewingCorrection(null);
      setReviewRemarks('');
      refetch();
    } catch (err: any) {
      setErrorBanner(err?.data?.message || 'Failed to process correction.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Correction Audit Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review, authorize, or reject attendance adjustments on submitted, approved, and locked registers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as CorrectionStatus)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Corrections</option>
            <option value={CorrectionStatus.PENDING}>Pending Only</option>
            <option value={CorrectionStatus.APPROVED}>Approved</option>
            <option value={CorrectionStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      {/* Feedback Banners */}
      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Corrections Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3 text-left">Date Requested</th>
                <th className="px-6 py-3 text-left">Student</th>
                <th className="px-6 py-3 text-center">Change</th>
                <th className="px-6 py-3 text-left">Audit Justification</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading correction audit trail...
                  </td>
                </tr>
              ) : filteredCorrections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No attendance corrections match the current filter.
                  </td>
                </tr>
              ) : (
                filteredCorrections.map((corr) => (
                  <tr key={corr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(corr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-xs">{corr.studentId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-semibold text-xs">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {corr.oldStatus}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span
                          className={`px-2 py-0.5 rounded ${
                            corr.newStatus === AttendanceStatus.PRESENT
                              ? 'bg-emerald-100 text-emerald-800 font-bold'
                              : corr.newStatus === AttendanceStatus.ABSENT
                              ? 'bg-rose-100 text-rose-800 font-bold'
                              : 'bg-amber-100 text-amber-800 font-bold'
                          }`}
                        >
                          {corr.newStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-xs text-gray-600">
                      <span title={corr.reason}>{corr.reason}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          corr.status === CorrectionStatus.APPROVED
                            ? 'bg-emerald-100 text-emerald-800'
                            : corr.status === CorrectionStatus.REJECTED
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {corr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {corr.status === CorrectionStatus.PENDING ? (
                        <button
                          onClick={() => setReviewingCorrection(corr)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                        >
                          Review & Decide
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingCorrection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Review Correction Request</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Authorize or reject modification of historical register.
                </p>
              </div>
              <button
                onClick={() => setReviewingCorrection(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-xs">
                <div>
                  <span className="font-medium text-gray-500">Student ID:</span>{' '}
                  <span className="font-mono text-gray-900">{reviewingCorrection.studentId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Proposed Transition:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {reviewingCorrection.oldStatus} &rarr; {reviewingCorrection.newStatus}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Teacher Justification:</span>
                  <p className="mt-1 text-gray-800 italic">"{reviewingCorrection.reason}"</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reviewer Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes explaining approval or rejection reason..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => handleProcess(CorrectionStatus.REJECTED)}
                className="px-4 py-2 border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 text-sm font-medium rounded-lg disabled:opacity-50"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => handleProcess(CorrectionStatus.APPROVED)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50"
              >
                Approve & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
