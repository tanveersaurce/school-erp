import React, { useState } from 'react';
import {
  useGetClassroomsQuery,
  useCreateClassroomMutation,
  useUpdateClassroomMutation,
  useDeleteClassroomMutation,
} from '../../features/timetable/timetableApi.js';
import { useGetCampusesQuery } from '../../features/tenant/tenantApi.js';
import { RoomType, AcademicStatus } from '@edusphere/common';
import type { ClassroomDto, CampusDto } from '@edusphere/types';
import { Can } from '../../components/auth/Can.js';

export const ClassroomListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ClassroomDto | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const { data: campusesRes } = useGetCampusesQuery();
  const campuses = campusesRes?.data || [];

  const [formData, setFormData] = useState({
    campusId: '',
    name: '',
    code: '',
    roomNumber: '',
    capacity: 40,
    roomType: RoomType.CLASSROOM,
    status: AcademicStatus.ACTIVE,
  });

  const { data: classroomsRes, isLoading } = useGetClassroomsQuery({
    search: search || undefined,
    roomType: selectedRoomType ? (selectedRoomType as RoomType) : undefined,
  });

  const [createClassroom, { isLoading: isCreating }] = useCreateClassroomMutation();
  const [updateClassroom, { isLoading: isUpdating }] = useUpdateClassroomMutation();
  const [deleteClassroom] = useDeleteClassroomMutation();

  const classrooms = classroomsRes?.data || [];

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData({
      campusId: campuses[0]?.id || '',
      name: '',
      code: '',
      roomNumber: '',
      capacity: 40,
      roomType: RoomType.CLASSROOM,
      status: AcademicStatus.ACTIVE,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: ClassroomDto) => {
    setEditingRoom(r);
    setFormData({
      campusId: r.campusId,
      name: r.name,
      code: r.code,
      roomNumber: r.roomNumber || '',
      capacity: r.capacity,
      roomType: r.roomType,
      status: r.status,
    });
    setErrorBanner(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!formData.campusId) {
      setErrorBanner('Please select a campus.');
      return;
    }

    try {
      if (editingRoom) {
        await updateClassroom({
          id: editingRoom.id,
          body: formData,
        }).unwrap();
      } else {
        await createClassroom(formData).unwrap();
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorBanner(err?.data?.error?.message || err?.data?.message || 'Failed to save classroom.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete classroom "${name}"?`)) return;
    try {
      await deleteClassroom(id).unwrap();
    } catch (err: any) {
      alert(err?.data?.error?.message || err?.data?.message || 'Cannot delete classroom.');
    }
  };

  const getRoomTypeBadge = (type: RoomType) => {
    switch (type) {
      case RoomType.CLASSROOM:
        return 'bg-blue-100 text-blue-800';
      case RoomType.LABORATORY:
        return 'bg-emerald-100 text-emerald-800';
      case RoomType.COMPUTER_LAB:
        return 'bg-cyan-100 text-cyan-800';
      case RoomType.AUDITORIUM:
        return 'bg-purple-100 text-purple-800';
      case RoomType.LIBRARY:
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classrooms & Facilities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Physical spaces, labs, auditoriums, and seat capacities for timetable allocation.
          </p>
        </div>
        <Can permission="room:create">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            + Add Classroom
          </button>
        </Can>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by room name, code or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Room Types</option>
            {Object.values(RoomType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Room Name & Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Room No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Campus
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading classrooms...
                  </td>
                </tr>
              ) : classrooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No classrooms defined yet. Click "+ Add Classroom" to register one.
                  </td>
                </tr>
              ) : (
                classrooms.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{r.code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {r.roomNumber || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoomTypeBadge(
                          r.roomType
                        )}`}
                      >
                        {r.roomType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {r.capacity} seats
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {r.campusName || 'Main Campus'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === AcademicStatus.ACTIVE
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <Can permission="room:update">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can permission="room:delete">
                        <button
                          onClick={() => handleDelete(r.id, r.name)}
                          className="text-rose-600 hover:text-rose-900"
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
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingRoom ? 'Edit Classroom' : 'Add New Classroom'}
            </h3>

            {errorBanner && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Campus *</label>
                <select
                  required
                  value={formData.campusId}
                  onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Campus</option>
                  {campuses.map((c: CampusDto) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Room Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Lab or Room 204"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Room Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LAB-PHY"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 204"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Room Type *
                  </label>
                  <select
                    value={formData.roomType}
                    onChange={(e) =>
                      setFormData({ ...formData, roomType: e.target.value as RoomType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.values(RoomType).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Student Capacity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as AcademicStatus })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={AcademicStatus.ACTIVE}>ACTIVE</option>
                  <option value={AcademicStatus.INACTIVE}>INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreating || isUpdating ? 'Saving...' : editingRoom ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
