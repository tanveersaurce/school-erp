import React, { useState } from 'react';
import {
  CalendarCheck,
  Save,
} from 'lucide-react';
import {
  useGetAttendanceQuery,
  useGetAttendanceStatsQuery,
  useBatchMarkAttendanceMutation,
  useGetHostelsQuery,
  useGetAllocationsQuery,
} from '../../features/hostel/hostelApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { HostelAttendanceStatus, HostelAllocationStatus } from '@edusphere/common';

export const HostelAttendancePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHostelId, setSelectedHostelId] = useState('');

  const { data: hostelsRes } = useGetHostelsQuery();
  const hostels = hostelsRes?.data || [];

  // Default to first hostel if none selected
  const activeHostelId = selectedHostelId || (hostels[0]?.id as any) || (hostels[0]?._id as any) || '';

  const { data: attendanceRes, isLoading: loadingAttendance, refetch: refetchAttendance } = useGetAttendanceQuery(
    activeHostelId
      ? {
          hostelId: activeHostelId,
          date: selectedDate,
        }
      : undefined
  );

  const { data: statsRes, refetch: refetchStats } = useGetAttendanceStatsQuery(
    activeHostelId
      ? {
          hostelId: activeHostelId,
          date: selectedDate,
        }
      : undefined
  );

  // Active residents in this hostel
  const { data: allocRes } = useGetAllocationsQuery({
    hostelId: activeHostelId || undefined,
    status: HostelAllocationStatus.CHECKED_IN,
  });

  const [batchMarkAttendance, { isLoading: isSaving }] = useBatchMarkAttendanceMutation();

  const residents = allocRes?.data?.items || [];
  const existingAttendance = attendanceRes?.data || [];

  // Local state for mark roll call
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: HostelAttendanceStatus; remarks: string }>>({});

  // Initialize or update map when residents load
  React.useEffect(() => {
    const map: Record<string, { status: HostelAttendanceStatus; remarks: string }> = {};
    for (const r of residents) {
      const sId = String(r.studentId?._id || r.studentId);
      const existing = existingAttendance.find(
        (att) => String(att.studentId?._id || att.studentId) === sId
      );
      map[sId] = {
        status: existing?.status || HostelAttendanceStatus.PRESENT,
        remarks: existing?.remarks || '',
      };
    }
    setAttendanceMap(map);
  }, [residents, existingAttendance]);

  const handleStatusChange = (sId: string, status: HostelAttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [sId]: {
        ...prev[sId],
        status,
      },
    }));
  };

  const handleRemarksChange = (sId: string, remarks: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [sId]: {
        ...prev[sId],
        remarks,
      },
    }));
  };

  const handleSaveAll = async () => {
    if (!activeHostelId) {
      alert('Please select a hostel');
      return;
    }
    const records = Object.entries(attendanceMap).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      remarks: data.remarks,
    }));

    if (records.length === 0) {
      alert('No active residents to mark roll call for.');
      return;
    }

    try {
      await batchMarkAttendance({
        hostelId: activeHostelId,
        date: selectedDate,
        records,
      }).unwrap();
      alert('Residential roll call saved successfully!');
      refetchAttendance();
      refetchStats();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to save attendance');
    }
  };

  const setAllStatus = (status: HostelAttendanceStatus) => {
    setAttendanceMap((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = { ...next[k], status };
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarCheck className="w-7 h-7 text-indigo-400" />
            Residential Attendance & Roll Call
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Evening curfew roll call, overnight headcounts, and boarder verification
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSaveAll}
            disabled={isSaving || residents.length === 0}
          >
            {isSaving ? 'Saving...' : 'Save Roll Call'}
          </Button>
        </div>
      </div>

      {/* Date & Hostel Selectors */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Hostel Block</label>
            <select
              value={activeHostelId}
              onChange={(e) => setSelectedHostelId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {hostels.map((h) => (
                <option key={h.id || h._id} value={h.id || h._id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Attendance Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </Card>

      {/* Quick Status Setter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
          <span>Active Residents: <strong className="text-white">{residents.length}</strong></span>
          {statsRes?.data && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <span className="text-emerald-400 font-semibold">Present: {statsRes.data.present}</span>
              <span className="text-rose-400 font-semibold">Absent: {statsRes.data.absent}</span>
              <span className="text-amber-400 font-semibold">On Leave: {statsRes.data.onLeave}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setAllStatus(HostelAttendanceStatus.PRESENT)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/20"
          >
            Mark All Present
          </button>
          <button
            onClick={() => setAllStatus(HostelAttendanceStatus.ABSENT)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/20"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Residents Roll Call Table */}
      {loadingAttendance ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : residents.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          No checked-in residents found in this hostel block.
        </Card>
      ) : (
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold uppercase text-slate-400">
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Room & Bed</th>
                  <th className="p-4">Roll Call Status</th>
                  <th className="p-4">Warden Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {residents.map((r) => {
                  const sId = String(r.studentId?._id || r.studentId);
                  const currentStatus = attendanceMap[sId]?.status || HostelAttendanceStatus.PRESENT;
                  const currentRemarks = attendanceMap[sId]?.remarks || '';

                  return (
                    <tr key={r.id || r._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono font-semibold text-white">
                        {sId}
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        Room: {String(r.roomId?._id || r.roomId)} • Bed: {String(r.bedId?._id || r.bedId)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { val: HostelAttendanceStatus.PRESENT, label: 'Present', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
                            { val: HostelAttendanceStatus.ABSENT, label: 'Absent', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
                            { val: HostelAttendanceStatus.OUT, label: 'Outing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
                            { val: HostelAttendanceStatus.LEAVE, label: 'Leave', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
                            { val: HostelAttendanceStatus.EXCUSED, label: 'Excused', color: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => handleStatusChange(sId, opt.val)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                                currentStatus === opt.val
                                  ? `${opt.color} ring-1 ring-white/20 font-bold`
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Optional remarks..."
                          value={currentRemarks}
                          onChange={(e) => handleRemarksChange(sId, e.target.value)}
                          className="w-full max-w-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
