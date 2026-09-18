import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Phone,
  Moon,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
} from 'lucide-react';
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { NotificationCategory } from '@edusphere/common';

const ALL_CATEGORIES = [
  { key: NotificationCategory.ACADEMIC, label: 'Academic & Courses', desc: 'Grades, curriculum, and subject updates' },
  { key: NotificationCategory.ATTENDANCE, label: 'Attendance & Leaves', desc: 'Daily attendance, tardiness, and absence alerts' },
  { key: NotificationCategory.HOMEWORK, label: 'Homework & Assignments', desc: 'Assignment submissions, due dates, and evaluations' },
  { key: NotificationCategory.EXAMINATION, label: 'Examinations', desc: 'Exam schedules, hall tickets, and datesheets' },
  { key: NotificationCategory.RESULTS, label: 'Results & Report Cards', desc: 'Published exam results and performance analytics' },
  { key: NotificationCategory.FEES, label: 'Billing & Fees', desc: 'Fee invoices, payment receipts, and reminders' },
  { key: NotificationCategory.TRANSPORT, label: 'Transportation & Bus', desc: 'Bus tracking, route alerts, and delay notices' },
  { key: NotificationCategory.LIBRARY, label: 'Library', desc: 'Book issues, due returns, and library fine notices' },
  { key: NotificationCategory.HOSTEL, label: 'Hostel & Residential', desc: 'Room check-in/out and hostel announcements' },
  { key: NotificationCategory.ANNOUNCEMENT, label: 'School Announcements', desc: 'School events, broadcasts, and holiday notices' },
  { key: NotificationCategory.SYSTEM, label: 'System & Maintenance', desc: 'Maintenance downtime and platform updates' },
  { key: NotificationCategory.SECURITY, label: 'Security Alerts', desc: 'Account access, password resets, and critical alerts', mandatory: true },
];

export const NotificationPreferencesPage: React.FC = () => {
  const { data: prefRes, isLoading, refetch } = useGetPreferencesQuery();
  const [updatePreferences, { isLoading: isSaving }] = useUpdatePreferencesMutation();

  const [globalChannels, setGlobalChannels] = useState({
    inApp: true,
    email: true,
    sms: false,
    push: true,
    whatsapp: false,
  });

  const [categoryPreferences, setCategoryPreferences] = useState<
    Array<{
      category: NotificationCategory;
      inApp: boolean;
      email: boolean;
      sms: boolean;
      push: boolean;
      whatsapp: boolean;
    }>
  >([]);

  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (prefRes?.data) {
      const data = prefRes.data;
      if (data.globalChannels) {
        setGlobalChannels({
          inApp: data.globalChannels.inApp ?? true,
          email: data.globalChannels.email ?? true,
          sms: data.globalChannels.sms ?? false,
          push: data.globalChannels.push ?? true,
          whatsapp: data.globalChannels.whatsapp ?? false,
        });
      }
      if (data.categoryPreferences) {
        setCategoryPreferences(data.categoryPreferences);
      }
      if (data.quietHours) {
        setQuietHours({
          enabled: data.quietHours.enabled ?? false,
          start: data.quietHours.start || '22:00',
          end: data.quietHours.end || '07:00',
          timezone: data.quietHours.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
      }
    }
  }, [prefRes]);

  const handleGlobalChannelToggle = (channel: keyof typeof globalChannels) => {
    setGlobalChannels((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }));
  };

  const getCategoryChannels = (cat: NotificationCategory) => {
    const existing = categoryPreferences.find((c) => c.category === cat);
    if (existing) {
      return {
        inApp: existing.inApp,
        email: existing.email,
        sms: existing.sms,
        push: existing.push,
        whatsapp: existing.whatsapp,
      };
    }
    // Fallback to global channels
    return {
      inApp: globalChannels.inApp,
      email: globalChannels.email,
      sms: globalChannels.sms,
      push: globalChannels.push,
      whatsapp: globalChannels.whatsapp,
    };
  };

  const handleCategoryChannelToggle = (cat: NotificationCategory, channel: 'inApp' | 'email' | 'sms' | 'push' | 'whatsapp') => {
    if (cat === NotificationCategory.SECURITY) return; // Security alerts are mandatory

    setCategoryPreferences((prev) => {
      const idx = prev.findIndex((c) => c.category === cat);
      const current = getCategoryChannels(cat);
      const updated = {
        ...current,
        [channel]: !current[channel],
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { category: cat, ...updated };
        return copy;
      } else {
        return [...prev, { category: cat, ...updated }];
      }
    });
  };

  const handleSave = async () => {
    try {
      setErrorMessage(null);
      setSaveSuccess(false);

      await updatePreferences({
        globalChannels,
        categoryPreferences,
        quietHours,
      }).unwrap();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      refetch();
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to update notification preferences. Please try again.');
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
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Notification Preferences
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Control delivery channels, quiet hours, and category preferences across the platform.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>Your notification preferences have been saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Global Channel Master Toggles */}
      <Card className="p-6">
        <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Global Delivery Channels
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set default delivery channels for all standard notifications.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* In-App */}
          <div
            onClick={() => handleGlobalChannelToggle('inApp')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              globalChannels.inApp
                ? 'border-indigo-500 bg-indigo-50/50 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <Bell className="h-5 w-5" />
              </div>
              <input
                type="checkbox"
                checked={globalChannels.inApp}
                onChange={() => {}}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div className="mt-3 font-medium text-gray-900 dark:text-white">In-App Notification</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Web dashboard bell alerts</div>
          </div>

          {/* Email */}
          <div
            onClick={() => handleGlobalChannelToggle('email')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              globalChannels.email
                ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:border-blue-500 dark:bg-blue-950/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="checkbox"
                checked={globalChannels.email}
                onChange={() => {}}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="mt-3 font-medium text-gray-900 dark:text-white">Email</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Sent to registered mailbox</div>
          </div>

          {/* SMS */}
          <div
            onClick={() => handleGlobalChannelToggle('sms')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              globalChannels.sms
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <input
                type="checkbox"
                checked={globalChannels.sms}
                onChange={() => {}}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <div className="mt-3 font-medium text-gray-900 dark:text-white">SMS</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Direct mobile text message</div>
          </div>

          {/* Push */}
          <div
            onClick={() => handleGlobalChannelToggle('push')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              globalChannels.push
                ? 'border-purple-500 bg-purple-50/50 shadow-sm dark:border-purple-500 dark:bg-purple-950/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <input
                type="checkbox"
                checked={globalChannels.push}
                onChange={() => {}}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </div>
            <div className="mt-3 font-medium text-gray-900 dark:text-white">Push Notification</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Mobile & browser devices</div>
          </div>

          {/* WhatsApp */}
          <div
            onClick={() => handleGlobalChannelToggle('whatsapp')}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              globalChannels.whatsapp
                ? 'border-teal-500 bg-teal-50/50 shadow-sm dark:border-teal-500 dark:bg-teal-950/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
                <Phone className="h-5 w-5" />
              </div>
              <input
                type="checkbox"
                checked={globalChannels.whatsapp}
                onChange={() => {}}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
            </div>
            <div className="mt-3 font-medium text-gray-900 dark:text-white">WhatsApp</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Verified WhatsApp Business</div>
          </div>
        </div>
      </Card>

      {/* Quiet Hours Scheduler */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quiet Hours</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mute non-urgent notifications (SMS, WhatsApp, Push) during scheduled resting hours.
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={quietHours.enabled}
              onChange={(e) => setQuietHours((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
          </label>
        </div>

        {quietHours.enabled && (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 text-gray-400" /> Start Quiet Time
              </label>
              <input
                type="time"
                value={quietHours.start}
                onChange={(e) => setQuietHours((prev) => ({ ...prev, start: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 text-gray-400" /> End Quiet Time
              </label>
              <input
                type="time"
                value={quietHours.end}
                onChange={(e) => setQuietHours((prev) => ({ ...prev, end: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Globe className="h-4 w-4 text-gray-400" /> Timezone
              </label>
              <input
                type="text"
                value={quietHours.timezone}
                onChange={(e) => setQuietHours((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="UTC or Asia/Kolkata"
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 flex-shrink-0" />
          <span>
            Critical security alerts and emergency safety notices will bypass quiet hours regardless of settings.
          </span>
        </div>
      </Card>

      {/* Category-Specific Overrides */}
      <Card className="p-6">
        <div className="border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Category Overrides
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fine-tune which channels receive notifications for specific types of updates.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 px-3 text-center">In-App</th>
                <th className="pb-3 px-3 text-center">Email</th>
                <th className="pb-3 px-3 text-center">SMS</th>
                <th className="pb-3 px-3 text-center">Push</th>
                <th className="pb-3 pl-3 text-center">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {ALL_CATEGORIES.map((cat) => {
                const channels = getCategoryChannels(cat.key as NotificationCategory);
                const isMandatory = cat.mandatory;

                return (
                  <tr key={cat.key} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{cat.label}</span>
                        {isMandatory && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Mandatory
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cat.desc}</p>
                    </td>

                    {/* In-App */}
                    <td className="py-4 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isMandatory ? true : channels.inApp}
                        disabled={isMandatory}
                        onChange={() => handleCategoryChannelToggle(cat.key as NotificationCategory, 'inApp')}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                    </td>

                    {/* Email */}
                    <td className="py-4 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isMandatory ? true : channels.email}
                        disabled={isMandatory}
                        onChange={() => handleCategoryChannelToggle(cat.key as NotificationCategory, 'email')}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>

                    {/* SMS */}
                    <td className="py-4 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isMandatory ? true : channels.sms}
                        disabled={isMandatory}
                        onChange={() => handleCategoryChannelToggle(cat.key as NotificationCategory, 'sms')}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                      />
                    </td>

                    {/* Push */}
                    <td className="py-4 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isMandatory ? true : channels.push}
                        disabled={isMandatory}
                        onChange={() => handleCategoryChannelToggle(cat.key as NotificationCategory, 'push')}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                      />
                    </td>

                    {/* WhatsApp */}
                    <td className="py-4 pl-3 text-center">
                      <input
                        type="checkbox"
                        checked={isMandatory ? true : channels.whatsapp}
                        disabled={isMandatory}
                        onChange={() => handleCategoryChannelToggle(cat.key as NotificationCategory, 'whatsapp')}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Save Button Bar */}
      <div className="flex justify-end pt-4">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5"
        >
          {isSaving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving...' : 'Save Notification Preferences'}
        </Button>
      </div>
    </div>
  );
};
