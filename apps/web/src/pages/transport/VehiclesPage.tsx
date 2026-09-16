import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Wrench,
} from 'lucide-react';
import {
  useGetVehiclesQuery,
  useCreateVehicleMutation,
  useUpdateVehicleStatusMutation,
  useGetVehicleTypesQuery,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const VehiclesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [make, setMake] = useState('');
  const [modelName, setModelName] = useState('');
  const [yearOfManufacture, setYearOfManufacture] = useState(new Date().getFullYear());
  const [seatingCapacity, setSeatingCapacity] = useState(40);
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [fuelType, setFuelType] = useState('DIESEL');

  const { data: vehicleTypesRes } = useGetVehicleTypesQuery();
  const vehicleTypes = vehicleTypesRes?.data || [];

  const { data: vehiclesRes, isLoading, refetch } = useGetVehiclesQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    limit: 10,
  });

  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
  const [updateStatus] = useUpdateVehicleStatusMutation();

  const vehicles = vehiclesRes?.data?.items || [];
  const pagination = vehiclesRes?.data?.pagination;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVehicle({
        vehicleNumber,
        registrationNumber,
        make,
        model: modelName,
        yearOfManufacture: Number(yearOfManufacture),
        capacity: Number(seatingCapacity),
        seatingCapacity: Number(seatingCapacity),
        vehicleTypeId: vehicleTypeId || (vehicleTypes[0]?.id as any),
        fuelType,
      }).unwrap();
      setIsCreateOpen(false);
      // Reset form
      setVehicleNumber('');
      setRegistrationNumber('');
      setMake('');
      setModelName('');
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create vehicle');
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    try {
      await updateStatus({ id, status: nextStatus, reason: `Status toggled to ${nextStatus}` }).unwrap();
      refetch();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update vehicle status');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bus className="w-7 h-7 text-amber-400" />
            Fleet Vehicles
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage school buses, vans, seating capacity, and compliance readiness
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
          Add Vehicle
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/60 border-slate-800 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by registration, make, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">In Maintenance</option>
              <option value="INACTIVE">Inactive</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Vehicles Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : vehicles.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 p-12 text-center text-slate-400">
          <Bus className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-medium text-slate-300">No vehicles found</p>
          <p className="text-xs text-slate-500 mt-1">Add your school fleet buses and vans to begin operations.</p>
        </Card>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Vehicle / Reg #</th>
                  <th className="px-4 py-3">Make & Model</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Fuel</th>
                  <th className="px-4 py-3">Mileage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{v.registrationNumber}</div>
                      <div className="text-xs text-slate-400 font-mono">{v.vehicleNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{v.make} {v.model}</div>
                      <div className="text-xs text-slate-500">{v.yearOfManufacture}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white">{v.capacity || v.seatingCapacity}</span>
                      <span className="text-xs text-slate-400 ml-1">seats</span>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase text-slate-400">
                      {v.fuelType || 'DIESEL'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-300">
                      {(v.currentMileageKm || 0).toLocaleString()} km
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : v.status === 'MAINTENANCE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {v.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link to={`/transport/vehicles/${v.id}`}>
                        <Button variant="secondary" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                          Details
                        </Button>
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusToggle(v.id, v.status)}
                      >
                        {v.status === 'ACTIVE' ? 'Set Maint.' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} vehicles)</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bus className="w-5 h-5 text-amber-400" />
              Register New Vehicle
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Registration # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DL-01-AB-1234"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle Code # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BUS-01"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata / Ashok Leyland"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Starbus 40"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Year</label>
                  <input
                    type="number"
                    value={yearOfManufacture}
                    onChange={(e) => setYearOfManufacture(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Seats *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={seatingCapacity}
                    onChange={(e) => setSeatingCapacity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fuel</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="ELECTRIC">Electric</option>
                    <option value="PETROL">Petrol</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle Classification</label>
                <select
                  value={vehicleTypeId}
                  onChange={(e) => setVehicleTypeId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Default Classification --</option>
                  {vehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>{vt.name} ({vt.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Register Vehicle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
