import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  FileCheck,
  Upload,
} from 'lucide-react';
import {
  useGetDriversQuery,
  useCreateDriverMutation,
  useUploadDriverDocumentMutation,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const DriversPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('HEAVY_VEHICLE');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState(5);

  // Doc form state
  const [docType, setDocType] = useState('DRIVING_LICENSE');
  const [docNumber, setDocNumber] = useState('');
  const [docExpiry, setDocExpiry] = useState('');

  const { data: driversRes, isLoading, refetch } = useGetDriversQuery({ search: search || undefined });
  const [createDriver, { isLoading: isCreating }] = useCreateDriverMutation();
  const [uploadDoc, { isLoading: isUploading }] = useUploadDriverDocumentMutation();

  const drivers = driversRes?.data?.items || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDriver({
        employeeId: employeeId as any,
        licenseNumber,
        licenseType: licenseType as any,
        licenseExpiryDate: new Date(licenseExpiryDate),
        yearsOfExperience: Number(yearsOfExperience),
        status: 'ACTIVE' as any,
      }).unwrap();
      setIsCreateOpen(false);
      setLicenseNumber('');
      setEmployeeId('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create driver profile');
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;
    try {
      await uploadDoc({
        driverId: selectedDriverId,
        data: {
          documentType: docType as any,
          documentNumber: docNumber,
          expiryDate: new Date(docExpiry),
          fileUrl: 'https://storage.edusphere.local/docs/driver_doc.pdf',
        },
      }).unwrap();
      setIsDocModalOpen(false);
      setDocNumber('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to upload document');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-400" />
            Driver Management & Compliance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Driver profiles linked to staff, commercial licenses, police verification, and medical certificates
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Register Driver
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search drivers by license number or employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </Card>

      {/* Drivers Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : drivers.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No drivers registered</p>
          <p className="text-xs text-slate-500 mt-1">Register drivers and attach their commercial licenses to begin.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Driver Name / Employee</th>
                <th className="px-4 py-3">License Number</th>
                <th className="px-4 py-3">License Type</th>
                <th className="px-4 py-3">License Expiry</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {drivers.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">
                      {d.employeeId?.firstName} {d.employeeId?.lastName || 'Driver Profile'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {d.employeeId?.employeeNumber || 'STAFF'}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white font-bold">{d.licenseNumber}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{d.licenseType}</td>
                  <td className="px-4 py-3 text-xs">
                    {d.licenseExpiryDate ? new Date(d.licenseExpiryDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        d.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {d.verificationStatus || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Upload className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setSelectedDriverId(d.id);
                        setIsDocModalOpen(true);
                      }}
                    >
                      Upload Doc
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Driver Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Register Driver Profile
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-1420110012345"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">License Type</label>
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="HEAVY_VEHICLE">Heavy Commercial Vehicle (HMV)</option>
                    <option value="LIGHT_VEHICLE">Light Motor Vehicle (LMV)</option>
                    <option value="TRANSPORT">Commercial Transport</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">License Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Register Driver'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Driver Doc Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-400" />
              Upload Driver Compliance Document
            </h2>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Document Type *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="MEDICAL_FITNESS">Medical Fitness Certificate</option>
                  <option value="POLICE_VERIFICATION">Police Clearance Certificate</option>
                  <option value="EYE_TEST">Eye Test Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Document # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DOC-990022"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Valid Until *</label>
                <input
                  type="date"
                  required
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsDocModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Save Document'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
