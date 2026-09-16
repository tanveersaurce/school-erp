import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  X,
  UserCheck,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetMembersQuery,
  useRegisterMemberMutation,
  useSuspendMemberMutation,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const LibraryMembersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Form State
  const [memberType, setMemberType] = useState('STUDENT');
  const [memberUserId, setMemberUserId] = useState('');
  const [maxBooks, setMaxBooks] = useState(3);
  const [memberNotes, setMemberNotes] = useState('');

  const { data: membersRes, isLoading: loadingMembers } = useGetMembersQuery({
    search: searchTerm || undefined,
    memberType: selectedType || undefined,
    status: selectedStatus || undefined,
  });

  const [registerMember, { isLoading: registering }] = useRegisterMemberMutation();
  const [suspendMember] = useSuspendMemberMutation();

  const members = membersRes?.data?.items || [];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerMember({
        memberType,
        userId: memberUserId.trim() || undefined,
        studentId: memberType === 'STUDENT' ? memberUserId.trim() : undefined,
        employeeId: memberType !== 'STUDENT' ? memberUserId.trim() : undefined,
        maxBooks: Number(maxBooks),
        notes: memberNotes.trim() || undefined,
      }).unwrap();

      setIsRegisterOpen(false);
      setMemberUserId('');
      setMemberNotes('');
    } catch (err) {
      console.error('Failed to register member', err);
    }
  };

  const handleToggleSuspend = async (memberId: string, currentStatus: string) => {
    const isSuspended = currentStatus === 'SUSPENDED';
    if (!window.confirm(`Are you sure you want to ${isSuspended ? 'reactivate' : 'suspend'} this library membership?`)) return;
    try {
      await suspendMember({
        id: memberId,
        reason: isSuspended ? 'Reactivated by librarian' : 'Suspended for outstanding overdue/fines',
      }).unwrap();
    } catch (err) {
      console.error('Failed to update member status', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-400" />
            Library Members Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Student & staff borrowing profiles, membership limits & suspension gates
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsRegisterOpen(true)}
        >
          Enroll Member
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by member number or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Member Types</option>
            <option value="STUDENT">STUDENT</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STAFF">STAFF</option>
          </select>
        </div>
        <div className="sm:w-40">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <Card className="bg-slate-800/80 border-slate-700/60 overflow-hidden shadow-lg">
        {loadingMembers ? (
          <div className="flex justify-center items-center py-24">
            <Spinner size="lg" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No library members found matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3">Member #</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Active Loans</th>
                  <th className="px-4 py-3">Borrow Limit</th>
                  <th className="px-4 py-3">Unpaid Fines</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {members.map((m: any) => (
                  <tr key={m._id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-mono font-bold text-white text-xs">
                      {m.memberNumber}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {m.memberType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {m.activeLoansCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {m.maxBooks ?? 3} books
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className={(m.totalFinesUnpaid ?? 0) > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        {Money.formatMoney(m.totalFinesUnpaid ?? 0, 'USD')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleSuspend(m._id, m.status)}
                        className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                          m.status === 'ACTIVE'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {m.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Enroll Member Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Enroll Library Member
              </h2>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Member Type *</label>
                <select
                  value={memberType}
                  onChange={(e) => setMemberType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Student / Employee / User ID *
                </label>
                <input
                  type="text"
                  required
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="ID or system reference"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Max Borrow Limit</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxBooks}
                  onChange={(e) => setMaxBooks(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setIsRegisterOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={registering}>
                  {registering ? <Spinner size="sm" /> : 'Enroll Member'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
