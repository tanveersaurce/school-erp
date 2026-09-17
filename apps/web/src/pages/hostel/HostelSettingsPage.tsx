import React, { useState } from 'react';
import {
  Settings,
  Clock,
  Bell,
  CheckCircle2,
  Building2,
  Save,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { HostelGenderPolicy, HostelBillingFrequency } from '@edusphere/common';

export const HostelSettingsPage: React.FC = () => {
  const [curfewTime, setCurfewTime] = useState('21:30');
  const [genderPolicy, setGenderPolicy] = useState<HostelGenderPolicy>(HostelGenderPolicy.MALE_ONLY);
  const [billingFrequency, setBillingFrequency] = useState<HostelBillingFrequency>(HostelBillingFrequency.QUARTERLY);
  const [messFeeIncluded, setMessFeeIncluded] = useState(true);
  const [cautionDepositRequired, setCautionDepositRequired] = useState(true);

  // Notification toggles
  const [notifyCheckIn, setNotifyCheckIn] = useState(true);
  const [notifyCheckOut, setNotifyCheckOut] = useState(true);
  const [notifyOuting, setNotifyOuting] = useState(true);
  const [notifyOverdue, setNotifyOverdue] = useState(true);
  const [notifyIncident, setNotifyIncident] = useState(true);

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-indigo-400" />
            Hostel Rules & Policy Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure residential curfews, gender policies, guardian SMS/email alerts, and fee structures
          </p>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Hostel policies and guardian notification rules updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Curfew & Access Rules */}
        <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Night Curfew & Building Access
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Curfew Time (24h)
              </label>
              <input
                type="time"
                value={curfewTime}
                onChange={(e) => setCurfewTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Any boarder returning past this time will automatically be flagged as Overdue Curfew.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Campus Gender Eligibility Policy
              </label>
              <select
                value={genderPolicy}
                onChange={(e) => setGenderPolicy(e.target.value as HostelGenderPolicy)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={HostelGenderPolicy.MALE_ONLY}>
                  Boys Only (Male Students)
                </option>
                <option value={HostelGenderPolicy.FEMALE_ONLY}>
                  Girls Only (Female Students)
                </option>
                <option value={HostelGenderPolicy.COED}>
                  Co-Educational Residential Facility
                </option>
                <option value={HostelGenderPolicy.RESTRICTED}>
                  Restricted Access / Segregated Wings
                </option>
              </select>
            </div>
          </div>
        </Card>

        {/* Guardian Notification Dispatch */}
        <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Guardian Notification Triggers (SMS & Email)
          </h2>
          <p className="text-xs text-slate-400">
            Automatically dispatch real-time security alerts to linked parent/guardian profiles
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyCheckIn}
                onChange={(e) => setNotifyCheckIn(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Notify on Resident Check-In</span>
                <span className="text-xs text-slate-400">Send alert when student arrives and is assigned their room key</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyCheckOut}
                onChange={(e) => setNotifyCheckOut(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Notify on Resident Check-Out / Vacating</span>
                <span className="text-xs text-slate-400">Send alert upon student checkout clearance</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOuting}
                onChange={(e) => setNotifyOuting(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Notify on Outing Gate Pass Approval</span>
                <span className="text-xs text-slate-400">Send alert with destination and expected return time</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOverdue}
                onChange={(e) => setNotifyOverdue(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Alert on Overdue Curfew</span>
                <span className="text-xs text-rose-400 font-medium">Urgent security SMS if student has not logged return past curfew</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyIncident}
                onChange={(e) => setNotifyIncident(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Alert on High/Emergency Severity Incident</span>
                <span className="text-xs text-slate-400">Immediate alert if medical or disciplinary emergency involves the student</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Financial Billing Model */}
        <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Hostel Fee & Invoicing Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Billing Frequency
              </label>
              <select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value as HostelBillingFrequency)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={HostelBillingFrequency.MONTHLY}>Monthly Invoicing</option>
                <option value={HostelBillingFrequency.QUARTERLY}>Quarterly Invoicing</option>
                <option value={HostelBillingFrequency.HALF_YEARLY}>Half-Yearly Invoicing</option>
                <option value={HostelBillingFrequency.ANNUAL}>Annual Upfront</option>
                <option value={HostelBillingFrequency.CUSTOM}>Custom Frequency</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="messFee"
                checked={messFeeIncluded}
                onChange={(e) => setMessFeeIncluded(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="messFee" className="text-xs text-slate-300 font-semibold cursor-pointer">
                Include Dining / Mess Fee by Default
              </label>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="cautionDep"
                checked={cautionDepositRequired}
                onChange={(e) => setCautionDepositRequired(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="cautionDep" className="text-xs text-slate-300 font-semibold cursor-pointer">
                Require Caution Deposit on Admission
              </label>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" type="submit" leftIcon={<Save className="w-4 h-4" />}>
            Save All Policies
          </Button>
        </div>
      </form>
    </div>
  );
};
