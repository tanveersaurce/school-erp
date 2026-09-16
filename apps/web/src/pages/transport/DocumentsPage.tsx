import React, { useState } from 'react';
import {
  FileCheck,
  Bus,
  Users,
  CheckCircle,
} from 'lucide-react';
import {
  useGetDocumentExpiriesReportQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const DocumentsPage: React.FC = () => {
  const [daysFilter, setDaysFilter] = useState(30);

  const { data: expiriesRes, isLoading } = useGetDocumentExpiriesReportQuery({ days: daysFilter });
  const documents = expiriesRes?.data || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileCheck className="w-7 h-7 text-purple-400" />
            Compliance & Document Expiries
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Centralized monitoring of commercial vehicle permits, fitness certificates, insurance, and driver licenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filter window:</span>
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
          >
            <option value={15}>Next 15 Days</option>
            <option value={30}>Next 30 Days</option>
            <option value={60}>Next 60 Days</option>
            <option value={90}>Next 90 Days</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
          <p className="text-base font-medium text-slate-300">All Fleet Documents Compliant</p>
          <p className="text-xs text-slate-500 mt-1">No vehicle or driver regulatory documents are expiring within the next {daysFilter} days.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity Details</th>
                <th className="px-4 py-3">Document Type</th>
                <th className="px-4 py-3">Document #</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Days Remaining</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {documents.map((doc, idx) => {
                const isOverdue = doc.daysRemaining <= 0;
                const isUrgent = doc.daysRemaining > 0 && doc.daysRemaining <= 15;
                return (
                  <tr key={doc.id || idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                        {doc.entityType === 'VEHICLE' ? (
                          <Bus className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        {doc.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{doc.entityName}</div>
                      <div className="text-xs font-mono text-slate-400">{doc.entityIdentifier}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-purple-300">
                      {doc.documentType}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{doc.documentNumber}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(doc.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold ${
                          isOverdue ? 'text-rose-400' : isUrgent ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {isOverdue ? `${Math.abs(doc.daysRemaining)} days OVERDUE` : `${doc.daysRemaining} days left`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isOverdue
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : isUrgent
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
