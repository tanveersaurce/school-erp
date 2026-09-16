import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Clock,
  BookmarkCheck,
  Building,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetLibrarySettingsQuery,
  useUpdateLibrarySettingsMutation,
  useGetLibrariesQuery,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const LibrarySettingsPage: React.FC = () => {
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: libsRes } = useGetLibrariesQuery();
  const libraries = libsRes?.data || [];

  const { data: settingsRes, isLoading: loadingSettings, refetch } = useGetLibrarySettingsQuery(
    selectedLibraryId ? { libraryId: selectedLibraryId } : undefined
  );

  const [updateSettings, { isLoading: updating }] = useUpdateLibrarySettingsMutation();

  // Form State
  const [form, setForm] = useState({
    defaultLoanDurationDays: 14,
    studentLimit: 3,
    teacherLimit: 10,
    staffLimit: 5,
    maxRenewals: 2,
    renewalExtensionDays: 7,
    fineCalculationMethod: 'DAILY',
    finePerDay: 100, // 100 cents / paise = $1.00
    fineGracePeriodDays: 1,
    maxFineCap: 5000, // 5000 cents = $50.00
    reservationExpiryDays: 3,
    maxActiveReservations: 2,
    lostBookReplacementFeeMultiplier: 1.5,
    damagedBookDefaultFee: 500, // $5.00
  });

  useEffect(() => {
    if (settingsRes?.data) {
      const s = settingsRes.data;
      setForm({
        defaultLoanDurationDays: s.defaultLoanDurationDays ?? 14,
        studentLimit: s.maxBooksPerMember?.student ?? 3,
        teacherLimit: s.maxBooksPerMember?.teacher ?? 10,
        staffLimit: s.maxBooksPerMember?.staff ?? 5,
        maxRenewals: s.maxRenewals ?? 2,
        renewalExtensionDays: s.renewalExtensionDays ?? 7,
        fineCalculationMethod: s.fineCalculationMethod ?? 'DAILY',
        finePerDay: s.finePerDay ?? 100,
        fineGracePeriodDays: s.fineGracePeriodDays ?? 1,
        maxFineCap: s.maxFineCap ?? 5000,
        reservationExpiryDays: s.reservationExpiryDays ?? 3,
        maxActiveReservations: s.maxActiveReservations ?? 2,
        lostBookReplacementFeeMultiplier: s.lostBookReplacementFeeMultiplier ?? 1.5,
        damagedBookDefaultFee: s.damagedBookDefaultFee ?? 500,
      });
    }
  }, [settingsRes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateSettings({
        libraryId: selectedLibraryId || undefined,
        defaultLoanDurationDays: Number(form.defaultLoanDurationDays),
        maxBooksPerMember: {
          student: Number(form.studentLimit),
          teacher: Number(form.teacherLimit),
          staff: Number(form.staffLimit),
        },
        maxRenewals: Number(form.maxRenewals),
        renewalExtensionDays: Number(form.renewalExtensionDays),
        fineCalculationMethod: form.fineCalculationMethod,
        finePerDay: Math.floor(Number(form.finePerDay)),
        fineGracePeriodDays: Number(form.fineGracePeriodDays),
        maxFineCap: Math.floor(Number(form.maxFineCap)),
        reservationExpiryDays: Number(form.reservationExpiryDays),
        maxActiveReservations: Number(form.maxActiveReservations),
        lostBookReplacementFeeMultiplier: Number(form.lostBookReplacementFeeMultiplier),
        damagedBookDefaultFee: Math.floor(Number(form.damagedBookDefaultFee)),
      }).unwrap();

      setSuccessMsg('Library circulation settings and policy rules updated successfully.');
      refetch();
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to update library settings.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Library Rules & Policy Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure borrow limits, loan durations, daily overdue rates, hold policies, and lost item multipliers.
          </p>
        </div>

        {libraries.length > 0 && (
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-400" />
            <select
              value={selectedLibraryId}
              onChange={(e) => setSelectedLibraryId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Global School Default</option>
              {libraries.map((lib: any) => (
                <option key={lib._id} value={lib._id}>
                  {lib.name} ({lib.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loadingSettings ? (
        <div className="p-16 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Loan & Circulation Limits */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-gray-900 font-semibold">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Circulation & Loan Periods</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Default Loan Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={form.defaultLoanDurationDays}
                  onChange={(e) => setForm({ ...form, defaultLoanDurationDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Standard loan length for books</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Renewals Allowed
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.maxRenewals}
                  onChange={(e) => setForm({ ...form, maxRenewals: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Times a member can extend loan</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Extension Days per Renewal
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={form.renewalExtensionDays}
                  onChange={(e) => setForm({ ...form, renewalExtensionDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Additional days granted per renewal</p>
              </div>
            </div>

            {/* Max Books Per Member */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Maximum Simultaneous Books Borrowed by Role
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Student Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.studentLimit}
                    onChange={(e) => setForm({ ...form, studentLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Default 3 books</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Teacher Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={form.teacherLimit}
                    onChange={(e) => setForm({ ...form, teacherLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Default 10 books</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Staff Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.staffLimit}
                    onChange={(e) => setForm({ ...form, staffLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Default 5 books</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Fines & Penalties */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-gray-900 font-semibold">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Overdue Fines & Penalty Calculations (Integer Minor Units)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fine Rate Calculation Method
                </label>
                <select
                  value={form.fineCalculationMethod}
                  onChange={(e) => setForm({ ...form, fineCalculationMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="DAILY">Daily Flat Accrual</option>
                  <option value="FIXED">Fixed Single Penalty</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Frequency of overdue fine assessment</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Daily Fine Amount (in minor units / cents)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.finePerDay}
                  onChange={(e) => setForm({ ...form, finePerDay: Math.floor(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Value: {Money.format(form.finePerDay || 0)} / day
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fine Grace Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={form.fineGracePeriodDays}
                  onChange={(e) => setForm({ ...form, fineGracePeriodDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Days late before fine begins accumulating</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Maximum Overdue Cap (in minor units / cents)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.maxFineCap}
                  onChange={(e) => setForm({ ...form, maxFineCap: Math.floor(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Cap: {Money.format(form.maxFineCap || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Lost Book Replacement Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={form.lostBookReplacementFeeMultiplier}
                  onChange={(e) => setForm({ ...form, lostBookReplacementFeeMultiplier: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">e.g. 1.5x price of original book</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Default Damaged Book Assessment Fee (Minor Units)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.damagedBookDefaultFee}
                  onChange={(e) => setForm({ ...form, damagedBookDefaultFee: Math.floor(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Value: {Money.format(form.damagedBookDefaultFee || 0)}
                </p>
              </div>
            </div>
          </Card>

          {/* Section 3: Reservations / Holds */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-gray-900 font-semibold">
              <BookmarkCheck className="w-5 h-5 text-indigo-600" />
              <span>Reservation & Hold Policies</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reservation Pick-up Expiry (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={form.reservationExpiryDays}
                  onChange={(e) => setForm({ ...form, reservationExpiryDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Days to collect book once available before hold is cancelled</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Active Reservations per Member
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxActiveReservations}
                  onChange={(e) => setForm({ ...form, maxActiveReservations: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Maximum queued holds allowed simultaneously</p>
              </div>
            </div>
          </Card>

          {/* Submit Action */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updating}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2.5 shadow-sm"
            >
              {updating ? <Spinner className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4" />}
              Save Library Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
