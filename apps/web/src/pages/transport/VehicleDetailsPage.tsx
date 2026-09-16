import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bus,
  ArrowLeft,
  FileCheck,
  Upload,
} from 'lucide-react';
import { TransportDocumentStatus } from '@edusphere/common';
import {
  useGetVehicleByIdQuery,
  useGetVehicleDocumentsQuery,
  useUploadVehicleDocumentMutation,
  useVerifyVehicleDocumentMutation,
  useGetMaintenancesQuery,
  useGetInspectionsQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const VehicleDetailsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'maintenance' | 'inspections'>('details');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Doc form state
  const [documentType, setDocumentType] = useState('INSURANCE');
  const [documentNumber, setDocumentNumber] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const { data: vehicleRes, isLoading: loadingVehicle } = useGetVehicleByIdQuery(id);
  const { data: docsRes, refetch: refetchDocs } = useGetVehicleDocumentsQuery(id);
  const { data: maintRes } = useGetMaintenancesQuery({ vehicleId: id });
  const { data: inspRes } = useGetInspectionsQuery({ vehicleId: id });

  const [uploadDoc, { isLoading: isUploading }] = useUploadVehicleDocumentMutation();
  const [verifyDoc] = useVerifyVehicleDocumentMutation();

  const vehicle = vehicleRes?.data;
  const documents = docsRes?.data || [];
  const maintenances = maintRes?.data?.items || [];
  const inspections = inspRes?.data?.items || [];

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await uploadDoc({
        vehicleId: id,
        data: {
          documentType: documentType as any,
          documentNumber,
          issueDate: validFrom ? new Date(validFrom) : undefined,
          expiryDate: new Date(validUntil),
          fileUrl: 'https://storage.edusphere.local/docs/sample.pdf',
        },
      }).unwrap();
      setIsDocModalOpen(false);
      setDocumentNumber('');
      refetchDocs();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to upload document');
    }
  };

  const handleVerify = async (docId: string) => {
    try {
      await verifyDoc({
        vehicleId: id,
        docId,
        status: 'VERIFIED',
        remarks: 'Document verified by fleet manager',
      }).unwrap();
      refetchDocs();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to verify document');
    }
  };

  if (loadingVehicle) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center text-slate-400">
        Vehicle not found.
        <div className="mt-4">
          <Link to="/transport/vehicles">
            <Button variant="secondary">Back to Vehicles</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center gap-4">
        <Link to="/transport/vehicles">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Fleet
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bus className="w-6 h-6 text-amber-400" />
            {vehicle.registrationNumber}
            <span className="text-sm font-normal text-slate-400">({vehicle.vehicleNumber})</span>
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'details' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Vehicle Overview
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'documents' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Compliance Documents ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'maintenance' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Maintenance ({maintenances.length})
        </button>
        <button
          onClick={() => setActiveTab('inspections')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'inspections' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Inspections ({inspections.length})
        </button>
      </div>

      {/* Tab 1: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              Vehicle Specifications
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Make & Model</span>
                <span className="text-white font-medium">{vehicle.make} {vehicle.model}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Year of Manufacture</span>
                <span className="text-white font-medium">{vehicle.yearOfManufacture || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Seating Capacity</span>
                <span className="text-white font-bold">{vehicle.capacity || vehicle.seatingCapacity} seats</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Fuel Type</span>
                <span className="text-white font-medium uppercase">{vehicle.fuelType || 'DIESEL'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Odometer Reading</span>
                <span className="text-white font-mono font-medium">{(vehicle.currentMileageKm || 0).toLocaleString()} km</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Current Status</span>
                <span className="text-emerald-400 font-semibold">{vehicle.status}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              Telematics & Hardware Integration
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">GPS Device ID</span>
                <span className="text-white font-mono">{vehicle.gpsDeviceId || 'Not Installed'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">FASTag ID</span>
                <span className="text-white font-mono">{vehicle.fastagId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">VIN / Chassis #</span>
                <span className="text-white font-mono">{vehicle.vin || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Ownership</span>
                <span className="text-white font-medium uppercase">{vehicle.ownershipType || 'OWNED'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Compliance & Regulatory Documents</h2>
            <Button variant="primary" size="sm" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setIsDocModalOpen(true)}>
              Upload Document
            </Button>
          </div>

          {documents.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No compliance documents uploaded for this vehicle.
            </Card>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Document #</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-4 py-3 font-semibold text-white">{doc.documentType}</td>
                      <td className="px-4 py-3 font-mono text-xs">{doc.documentNumber}</td>
                      <td className="px-4 py-3 text-xs">
                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            doc.verificationStatus === TransportDocumentStatus.VALID
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {doc.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {doc.verificationStatus !== TransportDocumentStatus.VALID && (
                          <Button variant="secondary" size="sm" onClick={() => handleVerify(doc.id)}>
                            Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Maintenance Log</h2>
            <Link to="/transport/maintenance">
              <Button variant="secondary" size="sm">Go to Maintenance</Button>
            </Link>
          </div>
          {maintenances.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No maintenance records found for this vehicle.
            </Card>
          ) : (
            <div className="space-y-3">
              {maintenances.map((m) => (
                <Card key={m.id} className="bg-slate-900/60 border-slate-800 p-4 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-white">{m.serviceType}</span>
                    <span className="text-xs text-slate-400 ml-2">({m.description})</span>
                    <div className="text-xs text-slate-500 mt-1">Vendor: {m.vendor || 'In-House Workshop'}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">{m.status}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Inspections */}
      {activeTab === 'inspections' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Inspection History</h2>
            <Link to="/transport/inspections">
              <Button variant="secondary" size="sm">Go to Inspections</Button>
            </Link>
          </div>
          {inspections.length === 0 ? (
            <Card className="bg-slate-900/40 border-slate-800 p-8 text-center text-slate-400">
              No daily inspections recorded yet.
            </Card>
          ) : (
            <div className="space-y-3">
              {inspections.map((i) => (
                <Card key={i.id} className="bg-slate-900/60 border-slate-800 p-4 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-white">Date: {new Date(i.inspectionDate).toLocaleDateString()}</span>
                    <div className="text-xs text-slate-400 mt-1">Result: {i.result}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${i.result === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {i.result}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              Upload Compliance Document
            </h2>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Document Type *</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="INSURANCE">Insurance Policy</option>
                  <option value="FITNESS_CERTIFICATE">Fitness Certificate</option>
                  <option value="REGISTRATION_CERTIFICATE">Registration Certificate (RC)</option>
                  <option value="POLLUTION_CERTIFICATE">Pollution (PUC)</option>
                  <option value="PERMIT">School Bus Permit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Document Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POL-998822"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
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
