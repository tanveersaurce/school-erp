import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetGuardianByIdQuery,
  useUpdateGuardianMutation,
  useInviteGuardianMutation,
} from '../../features/student/studentApi.js';
import { Can } from '../../components/auth/Can.js';

export const GuardianDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: guardianRes, isLoading, refetch } = useGetGuardianByIdQuery(id!, { skip: !id });
  const [updateGuardian, { isLoading: updating }] = useUpdateGuardianMutation();
  const [inviteGuardian, { isLoading: inviting }] = useInviteGuardianMutation();

  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const guardian = guardianRes?.data;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        Loading guardian profile...
      </div>
    );
  }

  if (!guardian) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
          Guardian profile not found.
        </div>
        <button
          onClick={() => navigate('/guardians')}
          className="mt-4 rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          ← Back to Guardians
        </button>
      </div>
    );
  }

  const handleInvite = async () => {
    try {
      const res = await inviteGuardian(guardian.id).unwrap();
      setBannerMessage(
        res.data?.invitationToken
          ? `Portal invitation sent! Token: ${res.data.invitationToken}`
          : 'Portal invitation sent successfully.'
      );
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to send invitation.');
    }
  };

  const handleCommPrefToggle = async (channel: 'email' | 'sms' | 'whatsapp') => {
    const currentPrefs = guardian.communicationPreferences || {
      email: true,
      sms: true,
      whatsapp: false,
    };
    try {
      await updateGuardian({
        id: guardian.id,
        data: {
          communicationPreferences: {
            ...currentPrefs,
            [channel]: !currentPrefs[channel],
          },
        },
      }).unwrap();
      setBannerMessage('Communication preferences updated.');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to update preferences.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/guardians')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Back to Guardians
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-xs font-mono text-gray-500">ID: {guardian.guardianId}</span>
        </div>

        {!guardian.hasAccount && (
          <Can permission="guardian:update">
            <button
              disabled={inviting}
              onClick={handleInvite}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {inviting ? 'Dispatching...' : 'Invite to Parent Portal'}
            </button>
          </Can>
        )}
      </div>

      {bannerMessage && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-800">
          <span>{bannerMessage}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-2xl text-white shadow-md">
            {guardian.personalDetails.firstName[0]}
            {guardian.personalDetails.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {guardian.personalDetails.firstName} {guardian.personalDetails.lastName}
              </h1>
              <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {guardian.guardianId}
              </span>
              {guardian.hasAccount ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Portal Account Active
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                  No Portal Account
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Occupation:{' '}
              <span className="font-semibold text-gray-700">
                {guardian.personalDetails.occupation || 'N/A'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Contact & Address Details
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gray-500">Email Address</span>
              <p className="font-semibold text-gray-900 mt-0.5">{guardian.contactDetails.email}</p>
            </div>
            <div>
              <span className="text-gray-500">Primary Phone</span>
              <p className="font-semibold text-gray-900 mt-0.5">{guardian.contactDetails.phone}</p>
            </div>
            {guardian.contactDetails.alternatePhone && (
              <div>
                <span className="text-gray-500">Alternate Phone</span>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {guardian.contactDetails.alternatePhone}
                </p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Address</span>
              <p className="font-medium text-gray-900 mt-0.5">
                {typeof guardian.contactDetails.address === 'string'
                  ? guardian.contactDetails.address
                  : `${guardian.contactDetails.address?.addressLine1}, ${guardian.contactDetails.address?.city}, ${guardian.contactDetails.address?.state} ${guardian.contactDetails.address?.postalCode}`}
              </p>
            </div>
          </div>
        </div>

        {/* Communication Preferences */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Communication Channels
          </h3>
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <span className="font-medium text-gray-800">Email Notifications</span>
              <input
                type="checkbox"
                disabled={updating}
                checked={guardian.communicationPreferences?.email ?? true}
                onChange={() => handleCommPrefToggle('email')}
                className="h-4 w-4 rounded text-indigo-600"
              />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <span className="font-medium text-gray-800">SMS Alerts</span>
              <input
                type="checkbox"
                disabled={updating}
                checked={guardian.communicationPreferences?.sms ?? true}
                onChange={() => handleCommPrefToggle('sms')}
                className="h-4 w-4 rounded text-indigo-600"
              />
            </label>
            <label className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <span className="font-medium text-gray-800">WhatsApp Messaging</span>
              <input
                type="checkbox"
                disabled={updating}
                checked={guardian.communicationPreferences?.whatsapp ?? false}
                onChange={() => handleCommPrefToggle('whatsapp')}
                className="h-4 w-4 rounded text-indigo-600"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Linked Children Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900">Associated Children / Students</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {guardian.children && guardian.children.length > 0 ? (
            guardian.children.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigate(`/students/${rel.studentId}`)}
                className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition cursor-pointer bg-gray-50/50"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-gray-900">
                    {rel.student?.name || 'Student'}
                  </h4>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                    {rel.relationshipType}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-2 space-y-0.5 font-mono">
                  <div>Adm: {rel.student?.admissionNumber || 'N/A'}</div>
                  <div>ID: {rel.student?.studentId || 'N/A'}</div>
                </div>
                <div className="mt-3 text-xs text-indigo-600 font-medium">
                  View Student Profile →
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
              No students currently linked to this guardian record.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
