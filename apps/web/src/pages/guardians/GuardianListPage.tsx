import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetGuardiansQuery,
  useCreateGuardianMutation,
  useDeleteGuardianMutation,
  useInviteGuardianMutation,
} from '../../features/student/studentApi.js';
import { Can } from '../../components/auth/Can.js';
import type { GuardianDto } from '@edusphere/types';

export const GuardianListPage: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    occupation: '',
    annualIncome: '',
    provisionUser: false,
    sendUserInvitation: true,
    userPassword: '',
  });

  const {
    data: guardiansRes,
    isLoading,
    refetch,
  } = useGetGuardiansQuery({
    search: search || undefined,
    page,
    limit: 15,
  });

  const [createGuardian, { isLoading: creating }] = useCreateGuardianMutation();
  const [deleteGuardian] = useDeleteGuardianMutation();
  const [inviteGuardian, { isLoading: inviting }] = useInviteGuardianMutation();

  const guardians: GuardianDto[] = guardiansRes?.data || [];
  const pagination = (guardiansRes as any)?.meta?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.total || guardians.length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      alert('First name, last name, email, and phone are required.');
      return;
    }
    if (
      !formData.addressLine1.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.postalCode.trim()
    ) {
      alert('Complete address is required.');
      return;
    }
    try {
      const res = await createGuardian({
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        alternatePhone: formData.alternatePhone.trim() || undefined,
        occupation: formData.occupation.trim() || undefined,
        annualIncome: formData.annualIncome ? Number(formData.annualIncome) : undefined,
        address: {
          addressLine1: formData.addressLine1.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim() || 'India',
        },
        provisionUser: formData.provisionUser,
        sendUserInvitation: formData.provisionUser ? formData.sendUserInvitation : undefined,
        userPassword:
          formData.provisionUser && !formData.sendUserInvitation
            ? formData.userPassword
            : undefined,
      }).unwrap();

      setBannerMessage(
        `Guardian '${res.data.personalDetails.firstName} ${res.data.personalDetails.lastName}' added successfully!`
      );
      setIsCreateModalOpen(false);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to create guardian.');
    }
  };

  const handleInvite = async (guardianId: string, name: string) => {
    try {
      const res = await inviteGuardian(guardianId).unwrap();
      setBannerMessage(
        res.data?.invitationToken
          ? `Invitation sent to '${name}'! Generated Token: ${res.data.invitationToken}`
          : `Portal invitation sent to '${name}'.`
      );
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to send invitation.');
    }
  };

  const handleDelete = async (guardianId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete guardian profile '${name}'?`)) return;
    try {
      await deleteGuardian(guardianId).unwrap();
      setBannerMessage(`Guardian '${name}' deleted.`);
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Failed to delete guardian.');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Guardian & Parent Directory
          </h1>
          <p className="text-sm text-gray-500">
            Manage parent records, contact details, and parent portal access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/students')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            ← Student Directory
          </button>
          <Can permission="guardian:create">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none"
            >
              + Add Guardian
            </button>
          </Can>
        </div>
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

      {/* Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="max-w-md">
          <label className="block text-xs font-medium text-gray-700">Search Guardians</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, guardian ID, phone, email..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Guardian ID</th>
                <th className="px-6 py-3">Full Name</th>
                <th className="px-6 py-3">Contact Details</th>
                <th className="px-6 py-3">Occupation</th>
                <th className="px-6 py-3">Portal Access</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading guardian records...
                  </td>
                </tr>
              ) : guardians.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No guardian records found.
                  </td>
                </tr>
              ) : (
                guardians.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-gray-900">
                      {g.guardianId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {g.personalDetails.firstName} {g.personalDetails.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 space-y-0.5">
                      <div>
                        Phone:{' '}
                        <span className="text-gray-900 font-medium">{g.contactDetails.phone}</span>
                      </div>
                      <div>
                        Email:{' '}
                        <span className="text-gray-900 font-medium">{g.contactDetails.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                      {g.personalDetails.occupation || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {g.hasAccount ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Account Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600">
                          Not Provisioned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <button
                        onClick={() => navigate(`/guardians/${g.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        View Profile
                      </button>
                      {!g.hasAccount && (
                        <Can permission="guardian:update">
                          <button
                            disabled={inviting}
                            onClick={() =>
                              handleInvite(
                                g.id,
                                `${g.personalDetails.firstName} ${g.personalDetails.lastName}`
                              )
                            }
                            className="text-blue-600 hover:text-blue-900 font-semibold ml-2 disabled:opacity-50"
                          >
                            Invite to Portal
                          </button>
                        </Can>
                      )}
                      <Can permission="guardian:delete">
                        <button
                          onClick={() =>
                            handleDelete(
                              g.id,
                              `${g.personalDetails.firstName} ${g.personalDetails.lastName}`
                            )
                          }
                          className="text-red-600 hover:text-red-900 font-semibold ml-2"
                        >
                          Delete
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
          <div className="text-xs text-gray-500">
            Showing Page <span className="font-semibold text-gray-900">{page}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalPages}</span> ({totalCount}{' '}
            guardians)
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create Guardian Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl border border-gray-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Add Guardian / Parent Profile</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700">Annual Income</label>
                  <input
                    type="number"
                    value={formData.annualIncome}
                    onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                    className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="border-t pt-3 space-y-2">
                <label className="block font-semibold text-gray-800">Residential Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Street Address *"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className="block w-full rounded border border-gray-300 p-2 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="City *"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="rounded border border-gray-300 p-2 text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="State *"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="rounded border border-gray-300 p-2 text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Postal Code *"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="rounded border border-gray-300 p-2 text-sm"
                  />
                </div>
              </div>

              {/* Portal Account Checkbox */}
              <div className="border-t pt-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={formData.provisionUser}
                    onChange={(e) => setFormData({ ...formData, provisionUser: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  Provision Parent Portal User Account
                </label>
                {formData.provisionUser && (
                  <div className="pl-5 space-y-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="guardianInvite"
                        checked={formData.sendUserInvitation}
                        onChange={() => setFormData({ ...formData, sendUserInvitation: true })}
                        className="text-indigo-600"
                      />
                      Send 48h invitation email link
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="guardianInvite"
                        checked={!formData.sendUserInvitation}
                        onChange={() => setFormData({ ...formData, sendUserInvitation: false })}
                        className="text-indigo-600"
                      />
                      Set direct password immediately
                    </label>
                    {!formData.sendUserInvitation && (
                      <input
                        type="password"
                        placeholder="Password (min 8 chars)"
                        value={formData.userPassword}
                        onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                        className="block w-full rounded border border-gray-300 p-2 text-sm"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Create Guardian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
