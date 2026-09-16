import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
} from 'lucide-react';
import {
  useGetAttendantsQuery,
  useCreateAttendantMutation,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const AttendantsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');

  const { data: attendantsRes, isLoading, refetch } = useGetAttendantsQuery();
  const [createAttendant, { isLoading: isCreating }] = useCreateAttendantMutation();

  const attendants = (attendantsRes?.data || []).filter((a: any) =>
    search ? (a.employeeId?.firstName || '').toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAttendant({
        employeeId: employeeId as any,
        emergencyContact: emergencyContactNumber ? { name: 'Emergency Contact', relation: 'Other', phone: emergencyContactNumber } : undefined,
        status: 'ACTIVE' as any,
      }).unwrap();
      setIsCreateOpen(false);
      setEmployeeId('');
      setEmergencyContactNumber('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to register attendant');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-sky-400" />
            Bus Attendants & Monitors
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            School bus attendants responsible for student boarding safety, roll calls, and route supervision
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Register Attendant
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search attendants by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>
      </Card>

      {/* Attendants Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : attendants.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No attendants registered</p>
          <p className="text-xs text-slate-500 mt-1">Register staff members as transport attendants to monitor trips.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Attendant / Staff Member</th>
                <th className="px-4 py-3">Emergency Contact</th>
                <th className="px-4 py-3">Police Verification</th>
                <th className="px-4 py-3">First Aid Certified</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendants.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">
                      {a.employeeId?.firstName} {a.employeeId?.lastName || 'Attendant'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {a.employeeId?.employeeNumber || 'STAFF'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{a.emergencyContact?.phone || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        a.policeVerificationStatus === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {a.policeVerificationStatus || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-slate-300">
                      {a.firstAidCertified ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              Register Bus Attendant
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Staff Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Employee MongoDB ObjectId or Staff ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Emergency Contact Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={emergencyContactNumber}
                  onChange={(e) => setEmergencyContactNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Register'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
