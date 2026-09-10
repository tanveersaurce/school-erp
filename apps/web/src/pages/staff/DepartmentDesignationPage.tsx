import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetDesignationsQuery,
  useCreateDesignationMutation,
  useUpdateDesignationMutation,
  useDeleteDesignationMutation,
} from '../../features/employee/employeeApi.js';
import { Can } from '../../components/auth/Can.js';

export const DepartmentDesignationPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'departments' | 'designations'>('departments');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const {
    data: deptRes,
    isLoading: isDeptLoading,
    refetch: refetchDepts,
  } = useGetDepartmentsQuery();
  const {
    data: desigRes,
    isLoading: isDesigLoading,
    refetch: refetchDesigs,
  } = useGetDesignationsQuery();

  // Mutations
  const [createDept, { isLoading: isCreatingDept }] = useCreateDepartmentMutation();
  const [updateDept, { isLoading: isUpdatingDept }] = useUpdateDepartmentMutation();
  const [deleteDept] = useDeleteDepartmentMutation();

  const [createDesig, { isLoading: isCreatingDesig }] = useCreateDesignationMutation();
  const [updateDesig, { isLoading: isUpdatingDesig }] = useUpdateDesignationMutation();
  const [deleteDesig] = useDeleteDesignationMutation();

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Designation Modal State
  const [isDesigModalOpen, setIsDesigModalOpen] = useState(false);
  const [editingDesigId, setEditingDesigId] = useState<string | null>(null);
  const [desigName, setDesigName] = useState('');
  const [desigCode, setDesigCode] = useState('');
  const [desigDeptId, setDesigDeptId] = useState('');
  const [desigLevel, setDesigLevel] = useState(1);
  const [desigDesc, setDesigDesc] = useState('');

  // Department Submit
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    try {
      if (editingDeptId) {
        await updateDept({
          id: editingDeptId,
          data: {
            name: deptName.trim(),
            code: deptCode.trim().toUpperCase(),
            description: deptDesc.trim() || undefined,
          },
        }).unwrap();
        setNotice({ type: 'success', message: 'Department updated successfully.' });
      } else {
        await createDept({
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          description: deptDesc.trim() || undefined,
        }).unwrap();
        setNotice({ type: 'success', message: 'Department created successfully.' });
      }

      setIsDeptModalOpen(false);
      setEditingDeptId(null);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');
      refetchDepts();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.data?.error?.message || err?.data?.message || 'Failed to save department.',
      });
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete department '${name}'?`)) return;

    try {
      await deleteDept(id).unwrap();
      setNotice({ type: 'success', message: `Department '${name}' deleted successfully.` });
      refetchDepts();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.data?.error?.message || err?.data?.message || 'Failed to delete department.',
      });
    }
  };

  // Designation Submit
  const handleDesigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    try {
      if (editingDesigId) {
        await updateDesig({
          id: editingDesigId,
          data: {
            name: desigName.trim(),
            code: desigCode.trim().toUpperCase(),
            departmentId: desigDeptId || null,
            level: Number(desigLevel),
            description: desigDesc.trim() || undefined,
          },
        }).unwrap();
        setNotice({ type: 'success', message: 'Designation updated successfully.' });
      } else {
        await createDesig({
          name: desigName.trim(),
          code: desigCode.trim().toUpperCase(),
          departmentId: desigDeptId || undefined,
          level: Number(desigLevel),
          description: desigDesc.trim() || undefined,
        }).unwrap();
        setNotice({ type: 'success', message: 'Designation created successfully.' });
      }

      setIsDesigModalOpen(false);
      setEditingDesigId(null);
      setDesigName('');
      setDesigCode('');
      setDesigDeptId('');
      setDesigLevel(1);
      setDesigDesc('');
      refetchDesigs();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.data?.error?.message || err?.data?.message || 'Failed to save designation.',
      });
    }
  };

  const handleDeleteDesig = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete designation '${name}'?`)) return;

    try {
      await deleteDesig(id).unwrap();
      setNotice({ type: 'success', message: `Designation '${name}' deleted successfully.` });
      refetchDesigs();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.data?.error?.message || err?.data?.message || 'Failed to delete designation.',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Departments & Designations
          </h1>
          <p className="text-sm text-gray-500">
            Configure organizational hierarchies, departmental units, and employment levels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/staff')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            &larr; Staff Directory
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="font-bold ml-4">
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'departments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Departments ({deptRes?.data?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('designations')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'designations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Designations ({desigRes?.data?.length || 0})
          </button>
        </nav>

        <div>
          {activeTab === 'departments' ? (
            <Can permission="department:create">
              <button
                onClick={() => {
                  setEditingDeptId(null);
                  setDeptName('');
                  setDeptCode('');
                  setDeptDesc('');
                  setIsDeptModalOpen(true);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Add Department
              </button>
            </Can>
          ) : (
            <Can permission="designation:create">
              <button
                onClick={() => {
                  setEditingDesigId(null);
                  setDesigName('');
                  setDesigCode('');
                  setDesigDeptId('');
                  setDesigLevel(1);
                  setDesigDesc('');
                  setIsDesigModalOpen(true);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Add Designation
              </button>
            </Can>
          )}
        </div>
      </div>

      {/* Departments Tab View */}
      {activeTab === 'departments' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isDeptLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : deptRes?.data && deptRes.data.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Department Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Assigned Staff</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {deptRes.data.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600">
                      {dept.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{dept.name}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{dept.description || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        {dept.employeeCount || 0} employees
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">
                        {dept.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Can permission="department:update">
                        <button
                          onClick={() => {
                            setEditingDeptId(dept.id);
                            setDeptName(dept.name);
                            setDeptCode(dept.code);
                            setDeptDesc(dept.description || '');
                            setIsDeptModalOpen(true);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can permission="department:delete">
                        <button
                          onClick={() => handleDeleteDept(dept.id, dept.name)}
                          className="text-xs text-rose-600 hover:text-rose-900 font-medium"
                        >
                          Delete
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">No departments configured yet.</div>
          )}
        </div>
      )}

      {/* Designations Tab View */}
      {activeTab === 'designations' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isDesigLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : desigRes?.data && desigRes.data.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Designation Title</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Level</th>
                  <th className="px-6 py-3.5">Assigned Staff</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {desigRes.data.map((desig) => (
                  <tr key={desig.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600">
                      {desig.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{desig.name}</td>
                    <td className="px-6 py-4 text-gray-700">{desig.departmentName || 'Global'}</td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        Level {desig.level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        {desig.employeeCount || 0} employees
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-medium">
                        {desig.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Can permission="designation:update">
                        <button
                          onClick={() => {
                            setEditingDesigId(desig.id);
                            setDesigName(desig.name);
                            setDesigCode(desig.code);
                            setDesigDeptId(desig.departmentId || '');
                            setDesigLevel(desig.level || 1);
                            setDesigDesc(desig.description || '');
                            setIsDesigModalOpen(true);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can permission="designation:delete">
                        <button
                          onClick={() => handleDeleteDesig(desig.id, desig.name)}
                          className="text-xs text-rose-600 hover:text-rose-900 font-medium"
                        >
                          Delete
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">No designations configured yet.</div>
          )}
        </div>
      )}

      {/* Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editingDeptId ? 'Edit Department' : 'Create Department'}
            </h3>

            <form onSubmit={handleDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Science & Technology"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SCI"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDept || isUpdatingDept}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingDept || isUpdatingDept ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Designation Modal */}
      {isDesigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editingDesigId ? 'Edit Designation' : 'Create Designation'}
            </h3>

            <form onSubmit={handleDesigSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Designation Title *
                </label>
                <input
                  type="text"
                  required
                  value={desigName}
                  onChange={(e) => setDesigName(e.target.value)}
                  placeholder="e.g. Senior Teacher"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Designation Code *
                </label>
                <input
                  type="text"
                  required
                  value={desigCode}
                  onChange={(e) => setDesigCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SR-TCH"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department (Optional)
                </label>
                <select
                  value={desigDeptId}
                  onChange={(e) => setDesigDeptId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Global (All Departments) --</option>
                  {deptRes?.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hierarchy Level (1-20)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={desigLevel}
                  onChange={(e) => setDesigLevel(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDesigModalOpen(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDesig || isUpdatingDesig}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingDesig || isUpdatingDesig ? 'Saving...' : 'Save Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
