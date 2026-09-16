import React, { useState } from 'react';
import {
  FileText,
  MapPin,
  FileCheck,
  Receipt,
  CheckCircle,
} from 'lucide-react';
import {
  useGetRouteOccupancyReportQuery,
  useGetDocumentExpiriesReportQuery,
  useGenerateTransportFeeInvoicesMutation,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const TransportReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'occupancy' | 'expiries' | 'billing'>('occupancy');

  // Fee billing form
  const [academicYearId, setAcademicYearId] = useState('');
  const [feeStructureId, setFeeStructureId] = useState('');
  const [billingMonth, setBillingMonth] = useState(new Date().getMonth() + 1);
  const [billingYear, setBillingYear] = useState(new Date().getFullYear());
  const [billingResult, setBillingResult] = useState<{ generatedInvoicesCount: number; period: string } | null>(null);

  const { data: occupancyRes, isLoading: loadingOcc } = useGetRouteOccupancyReportQuery();
  const { data: expiriesRes, isLoading: loadingExp } = useGetDocumentExpiriesReportQuery({ days: 60 });
  const [generateInvoices, { isLoading: isGenerating }] = useGenerateTransportFeeInvoicesMutation();

  const occupancyRoutes = occupancyRes?.data || [];
  const expiries = expiriesRes?.data || [];

  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await generateInvoices({
        academicYearId,
        feeStructureId,
        billingMonth: Number(billingMonth),
        billingYear: Number(billingYear),
      }).unwrap();
      setBillingResult(res.data);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to generate fee invoices');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-amber-400" />
            Transport Analytics & Fee Generation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Capacity utilization audits, compliance logs, and bulk transport fee invoice generation
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveReport('occupancy')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeReport === 'occupancy' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Route Occupancy & Capacity
        </button>
        <button
          onClick={() => setActiveReport('expiries')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeReport === 'expiries' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Regulatory Document Expiries
        </button>
        <button
          onClick={() => setActiveReport('billing')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeReport === 'billing' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Fee Invoice Generation (Phase 13)
        </button>
      </div>

      {/* Tab 1: Route Occupancy */}
      {activeReport === 'occupancy' && (
        <div className="space-y-4">
          {loadingOcc ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : occupancyRoutes.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No routes available for capacity audit.
            </Card>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Route Code</th>
                    <th className="px-4 py-3">Route Name</th>
                    <th className="px-4 py-3">Assigned Vehicle</th>
                    <th className="px-4 py-3">Vehicle Capacity</th>
                    <th className="px-4 py-3">Assigned Students</th>
                    <th className="px-4 py-3">Available Seats</th>
                    <th className="px-4 py-3">Occupancy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {occupancyRoutes.map((r) => {
                    const isFull = r.isOverCapacity || r.availableCapacity <= 0;
                    return (
                      <tr key={r.routeId} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-mono text-xs text-amber-400 font-bold">{r.routeCode}</td>
                        <td className="px-4 py-3 font-bold text-white">{r.routeName}</td>
                        <td className="px-4 py-3 text-xs">{r.assignedVehicleNumber || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-300">{r.vehicleCapacity} seats</td>
                        <td className="px-4 py-3 text-xs font-bold text-white">{r.assignedStudentsCount}</td>
                        <td className="px-4 py-3 text-xs font-mono">{r.availableCapacity}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isFull
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {isFull ? 'FULL / OVERCAPACITY' : 'SEATS AVAILABLE'}
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
      )}

      {/* Tab 2: Expiries */}
      {activeReport === 'expiries' && (
        <div className="space-y-4">
          {loadingExp ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : expiries.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              All compliance documents are current.
            </Card>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Identifier</th>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Days Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {expiries.map((d, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-semibold text-white">{d.entityType}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.entityIdentifier}</td>
                      <td className="px-4 py-3 text-xs font-medium text-purple-300">{d.documentType}</td>
                      <td className="px-4 py-3 text-xs">{new Date(d.expiryDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs font-bold text-amber-400">{d.daysRemaining} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Billing */}
      {activeReport === 'billing' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" />
              Generate Monthly Transport Fee Invoices
            </h2>
            <p className="text-xs text-slate-400">
              Runs atomic billing for all students with active bus allocations, creating fee invoices in the Phase 13 finance ledger with zero floating-point math.
            </p>

            <form onSubmit={handleGenerateInvoices} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Academic Year ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Academic Year MongoDB ObjectId"
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Transport Fee Structure ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter FeeStructure MongoDB ObjectId"
                  value={feeStructureId}
                  onChange={(e) => setFeeStructureId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Billing Month (1-12) *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Billing Year *</label>
                  <input
                    type="number"
                    required
                    value={billingYear}
                    onChange={(e) => setBillingYear(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button variant="primary" type="submit" disabled={isGenerating} leftIcon={<Receipt className="w-4 h-4" />}>
                  {isGenerating ? 'Generating Invoices...' : 'Generate Transport Invoices'}
                </Button>
              </div>
            </form>

            {billingResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Successfully generated <strong>{billingResult.generatedInvoicesCount}</strong> transport invoices for period <strong>{billingResult.period}</strong>.
                </span>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
