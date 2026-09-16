import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Bus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  useGetTransportSettingsQuery,
  useUpdateTransportSettingsMutation,
  useGetVehicleTypesQuery,
  useCreateVehicleTypeMutation,
  useDeleteVehicleTypeMutation,
} from '../../features/transport/transportApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const TransportSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'policy' | 'vehicleTypes'>('policy');

  // Policy Form State
  const [gpsTrackingEnabled, setGpsTrackingEnabled] = useState(true);
  const [speedLimitKmph, setSpeedLimitKmph] = useState(50);
  const [alertGracePeriodMinutes, setAlertGracePeriodMinutes] = useState(5);
  const [boardingVerificationPolicy, setBoardingVerificationPolicy] = useState('MANUAL_ROSTER');
  const [parentTrackingMode, setParentTrackingMode] = useState('REALTIME');
  const [transportFeeModel, setTransportFeeModel] = useState('STOP_BASED');

  // Vehicle Type Form State
  const [typeName, setTypeName] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [defaultCapacity, setDefaultCapacity] = useState(40);

  const { data: settingsRes, refetch: refetchSettings } = useGetTransportSettingsQuery();
  const { data: vTypesRes, refetch: refetchVTypes } = useGetVehicleTypesQuery();

  const [updateSettings, { isLoading: isUpdatingSettings }] = useUpdateTransportSettingsMutation();
  const [createVType, { isLoading: isCreatingVType }] = useCreateVehicleTypeMutation();
  const [deleteVType] = useDeleteVehicleTypeMutation();

  const settings = settingsRes?.data;
  const vehicleTypes = vTypesRes?.data || [];

  useEffect(() => {
    if (settings) {
      setGpsTrackingEnabled(settings.enableLiveTracking ?? true);
      setSpeedLimitKmph(settings.speedThresholdKmh ?? 50);
      setAlertGracePeriodMinutes(settings.etaAlertThresholdMinutes ?? 5);
      setBoardingVerificationPolicy(settings.boardingVerificationPolicy || 'MANUAL_ROSTER');
      setTransportFeeModel((settings.defaultFeeModel as string) || 'STOP_BASED');
    }
  }, [settings]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        data: {
          enableLiveTracking: gpsTrackingEnabled,
          speedThresholdKmh: Number(speedLimitKmph),
          etaAlertThresholdMinutes: Number(alertGracePeriodMinutes),
          boardingVerificationPolicy: boardingVerificationPolicy as any,
          defaultFeeModel: transportFeeModel as any,
        },
      }).unwrap();
      alert('Transport settings updated successfully!');
      refetchSettings();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to update transport settings');
    }
  };

  const handleAddVType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVType({
        name: typeName,
        code: typeCode,
        defaultCapacity: Number(defaultCapacity),
      }).unwrap();
      setTypeName('');
      setTypeCode('');
      refetchVTypes();
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to add vehicle type');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-slate-400" />
          Transport Policies & Fleet Configuration
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Campus speed limits, telemetry geofencing, boarding verification policies, and vehicle classes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('policy')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'policy' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Safety & Tracking Policies
        </button>
        <button
          onClick={() => setActiveTab('vehicleTypes')}
          className={`pb-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'vehicleTypes' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bus className="w-4 h-4" />
          Vehicle Classifications ({vehicleTypes.length})
        </button>
      </div>

      {/* Tab 1: Policies */}
      {activeTab === 'policy' && (
        <div className="max-w-2xl space-y-6">
          <Card className="bg-slate-900/60 border-slate-800 p-6">
            <form onSubmit={handleSavePolicy} className="space-y-5">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpsTrackingEnabled}
                    onChange={(e) => setGpsTrackingEnabled(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-bold text-white block">Enable Live GPS Fleet Tracking</span>
                    <span className="text-xs text-slate-400 block">
                      Enables continuous telemetry ingestion and real-time parent tracking updates
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Fleet Speed Limit (km/h) *
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={100}
                    required
                    value={speedLimitKmph}
                    onChange={(e) => setSpeedLimitKmph(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Trigger alert if exceeded</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Delay Alert Grace Period (mins) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={alertGracePeriodMinutes}
                    onChange={(e) => setAlertGracePeriodMinutes(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Tolerance before delayed alert</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Boarding Verification Policy *
                  </label>
                  <select
                    value={boardingVerificationPolicy}
                    onChange={(e) => setBoardingVerificationPolicy(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="MANUAL_ROSTER">Manual Attendant Roster</option>
                    <option value="RFID_CARD">RFID Student Smart Card</option>
                    <option value="QR_CODE">QR Code Digital Pass</option>
                    <option value="BIOMETRIC">Biometric Fingerprint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Parent Tracking Visibility *
                  </label>
                  <select
                    value={parentTrackingMode}
                    onChange={(e) => setParentTrackingMode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="REALTIME">Live Real-time BroadCast</option>
                    <option value="AT_STOPS">At Stops Only (Battery Saver)</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Default Transport Fee Model *
                </label>
                <select
                  value={transportFeeModel}
                  onChange={(e) => setTransportFeeModel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="STOP_BASED">Stop-Based (Fare defined per pickup/drop stop)</option>
                  <option value="FLAT">Flat Fee (Uniform fare across campus)</option>
                  <option value="ZONE_BASED">Zone-Based (Concentric distance rings)</option>
                  <option value="DISTANCE_BASED">Per Kilometer Rate</option>
                </select>
              </div>

              <div className="pt-2">
                <Button variant="primary" type="submit" disabled={isUpdatingSettings} leftIcon={<Save className="w-4 h-4" />}>
                  {isUpdatingSettings ? 'Saving Settings...' : 'Save Transport Policies'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Tab 2: Vehicle Types */}
      {activeTab === 'vehicleTypes' && (
        <div className="space-y-6">
          <Card className="bg-slate-900/60 border-slate-800 p-6 max-w-xl">
            <h2 className="text-sm font-bold text-white mb-3">Add Vehicle Classification</h2>
            <form onSubmit={handleAddVType} className="grid grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Name (e.g. Standard Bus)"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Code (e.g. BUS_STD)"
                  value={typeCode}
                  onChange={(e) => setTypeCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="Seats"
                  value={defaultCapacity}
                  onChange={(e) => setDefaultCapacity(Number(e.target.value))}
                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <Button variant="primary" size="sm" type="submit" disabled={isCreatingVType}>
                  Add
                </Button>
              </div>
            </form>
          </Card>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden max-w-2xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Classification Name</th>
                  <th className="px-4 py-3">Default Seats</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vehicleTypes.map((vt) => (
                  <tr key={vt.id}>
                    <td className="px-4 py-3 font-mono text-xs text-amber-400 font-bold">{vt.code}</td>
                    <td className="px-4 py-3 font-bold text-white">{vt.name}</td>
                    <td className="px-4 py-3 text-xs">{vt.defaultCapacity || 40} seats</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                        onClick={() => deleteVType(vt.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
