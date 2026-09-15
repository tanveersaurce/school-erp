import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Sliders,
} from 'lucide-react';
import { Money } from '@edusphere/common';
import {
  useGetSalaryComponentsQuery,
  useCreateSalaryComponentMutation,
  useGetSalaryStructuresQuery,
  useCreateSalaryStructureMutation,
  useAssignSalaryStructureMutation,
} from '../../features/hr/hrApi.js';
import { useGetEmployeesQuery } from '../../features/employee/employeeApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';

export const SalaryManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'structures' | 'components' | 'assignment'>('structures');

  // New Component state
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compType, setCompType] = useState('EARNING');
  const [compCalcType, setCompCalcType] = useState('FIXED');
  const [compDefaultVal, setCompDefaultVal] = useState(0);

  // New Structure state
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structName, setStructName] = useState('');
  const [structCode, setStructCode] = useState('');
  const [structDesc, setStructDesc] = useState('');
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);

  // Assign Salary state
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignStructId, setAssignStructId] = useState('');
  const [assignBaseSalary, setAssignBaseSalary] = useState<number>(5000); // Standard input in major units ($5,000)

  // Queries & Mutations
  const { data: componentsRes, isLoading: loadingComponents } = useGetSalaryComponentsQuery();
  const { data: structuresRes, isLoading: loadingStructures } = useGetSalaryStructuresQuery();
  const { data: employeesRes } = useGetEmployeesQuery();

  const [createComponent, { isLoading: creatingComp }] = useCreateSalaryComponentMutation();
  const [createStructure, { isLoading: creatingStruct }] = useCreateSalaryStructureMutation();
  const [assignSalary, { isLoading: assigningSalary }] = useAssignSalaryStructureMutation();

  const components = componentsRes?.data || [];
  const structures = structuresRes?.data || [];
  const employees = employeesRes?.data || [];

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createComponent({
        name: compName,
        code: compCode.toUpperCase(),
        type: compType,
        calculationType: compCalcType,
        amountOrPercentage:
          compCalcType === 'FIXED' ? Money.toMinorUnits(compDefaultVal) : Number(compDefaultVal),
      }).unwrap();
      setShowComponentModal(false);
      setCompName('');
      setCompCode('');
      setCompDefaultVal(0);
      alert('Salary component created.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create component.');
    }
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCompIds.length === 0) {
      alert('Please select at least one component.');
      return;
    }

    const structureComponents = selectedCompIds.map((id) => {
      const comp = components.find((c) => ((c as any)._id || c.id) === id);
      return {
        componentId: id,
        componentCode: comp?.code || 'COMP',
        name: comp?.name || 'Component',
        type: comp?.type || 'EARNING',
        calculationType: comp?.calculationType || 'FIXED',
        amountOrPercentage: comp?.amountOrPercentage || 0,
        baseComponentCode: 'BASIC',
      };
    });

    try {
      await createStructure({
        name: structName,
        code: structCode.toUpperCase(),
        description: structDesc,
        components: structureComponents,
        effectiveFrom: new Date().toISOString(),
      }).unwrap();
      setShowStructureModal(false);
      setStructName('');
      setStructCode('');
      setStructDesc('');
      setSelectedCompIds([]);
      alert('Salary structure created successfully.');
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to create structure.');
    }
  };

  const handleAssignSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmpId || !assignStructId) {
      alert('Please select employee and salary structure.');
      return;
    }

    try {
      const baseSalaryMinor = Money.toMinorUnits(assignBaseSalary);
      const res = await assignSalary({
        employeeId: assignEmpId,
        data: {
          salaryStructureId: assignStructId,
          baseSalary: baseSalaryMinor,
          currency: 'USD',
          customComponents: [],
          effectiveFrom: new Date().toISOString(),
        },
      }).unwrap();

      alert(`Salary assigned successfully! Gross: ${Money.format(res.data.grossSalary, 'USD')} / Net: ${Money.format(res.data.netSalary, 'USD')}`);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to assign salary structure.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Salary Structures & Compensation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Exact integer minor-unit salary configurations, versioned pay structures and employee compensation assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowStructureModal(true)}
          >
            New Structure
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowComponentModal(true)}
          >
            New Component
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2">
        <button
          onClick={() => setActiveTab('structures')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'structures'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Salary Structures ({structures.length})
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'components'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Pay Components ({components.length})
        </button>
        <button
          onClick={() => setActiveTab('assignment')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'assignment'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Assign Employee Salary
        </button>
      </div>

      {/* TAB 1: Structures */}
      {activeTab === 'structures' && (
        <Card className="p-6 bg-slate-800 border-slate-700">
          <h2 className="text-base font-bold text-white mb-4">Versioned Salary Structures</h2>
          {loadingStructures ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : structures.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No salary structures created yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {structures.map((struct) => {
                const structId = (struct as any)._id || struct.id;
                return (
                  <div
                    key={structId}
                    className="p-5 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-base">{struct.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{struct.description || 'Standard Structure'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {struct.code}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          v{struct.version}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <p className="text-xs font-semibold text-slate-400 mb-2">Components Breakdown:</p>
                      <div className="space-y-1.5">
                        {struct.components.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/40"
                          >
                            <span className="text-slate-200">{c.name}</span>
                            <span className="font-mono text-slate-400">
                              {c.calculationType === 'PERCENTAGE'
                                ? `${c.amountOrPercentage}% of ${c.baseComponentCode || 'Basic'}`
                                : Money.format(c.amountOrPercentage, 'USD')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Components */}
      {activeTab === 'components' && (
        <Card className="p-6 bg-slate-800 border-slate-700">
          <h2 className="text-base font-bold text-white mb-4">Configured Earnings & Deductions</h2>
          {loadingComponents ? (
            <div className="py-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : components.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No components configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {components.map((comp) => {
                const compId = (comp as any)._id || comp.id;
                return (
                  <div
                    key={compId}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{comp.name}</h3>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {comp.code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          comp.type === 'EARNING'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {comp.type}
                      </span>
                      <span className="text-slate-400 font-medium">
                        {comp.calculationType === 'PERCENTAGE' ? 'Percentage-based' : 'Fixed Amount'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Assignment Form */}
      {activeTab === 'assignment' && (
        <Card className="p-6 bg-slate-800 border-slate-700 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Assign Structure to Employee
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            Assigning a salary structure evaluates gross and net compensation in zero-float integer minor units.
          </p>

          <form onSubmit={handleAssignSalary} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Employee</label>
              <select
                required
                value={assignEmpId}
                onChange={(e) => setAssignEmpId(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Employee...</option>
                {employees.map((emp: any) => {
                  const empId = emp._id || emp.id;
                  return (
                    <option key={empId} value={empId}>
                      {emp.employeeId} - {emp.displayName || `${emp.firstName} ${emp.lastName}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Salary Structure</label>
              <select
                required
                value={assignStructId}
                onChange={(e) => setAssignStructId(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Structure...</option>
                {structures.map((st) => {
                  const structId = (st as any)._id || st.id;
                  return (
                    <option key={structId} value={structId}>
                      {st.name} (v{st.version} - {st.code})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Base Monthly Salary ($)</label>
              <Input
                type="number"
                required
                min={0}
                value={assignBaseSalary}
                onChange={(e) => setAssignBaseSalary(Number(e.target.value))}
                placeholder="5000"
                className="bg-slate-900 border-slate-700"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Converted to {Money.toMinorUnits(assignBaseSalary)} integer cents/paise for exact accounting.
              </p>
            </div>

            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary" isLoading={assigningSalary}>
                Assign Structure
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* MODAL: Create Component */}
      {showComponentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Salary Component</h3>
            <form onSubmit={handleCreateComponent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Component Name</label>
                <Input
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. House Rent Allowance"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Code</label>
                <Input
                  required
                  value={compCode}
                  onChange={(e) => setCompCode(e.target.value)}
                  placeholder="e.g. HRA"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                  <select
                    value={compType}
                    onChange={(e) => setCompType(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EARNING">EARNING</option>
                    <option value="DEDUCTION">DEDUCTION</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Calculation</label>
                  <select
                    value={compCalcType}
                    onChange={(e) => setCompCalcType(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FIXED">FIXED</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Default Value ({compCalcType === 'PERCENTAGE' ? '%' : '$'})
                </label>
                <Input
                  type="number"
                  required
                  value={compDefaultVal}
                  onChange={(e) => setCompDefaultVal(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowComponentModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creatingComp}>
                  Save Component
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Structure */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Salary Structure</h3>
            <form onSubmit={handleCreateStructure} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Structure Name</label>
                <Input
                  required
                  value={structName}
                  onChange={(e) => setStructName(e.target.value)}
                  placeholder="e.g. Senior Faculty Grade 1"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Code</label>
                <Input
                  required
                  value={structCode}
                  onChange={(e) => setStructCode(e.target.value)}
                  placeholder="e.g. SF_G1"
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <Input
                  value={structDesc}
                  onChange={(e) => setStructDesc(e.target.value)}
                  placeholder="Structure details..."
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Select Salary Components
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {components.map((comp) => {
                    const compId = (comp as any)._id || comp.id;
                    return (
                      <label
                        key={compId}
                        className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-700 cursor-pointer text-xs"
                      >
                        <span className="text-white">{comp.name} ({comp.code})</span>
                        <input
                          type="checkbox"
                          checked={selectedCompIds.includes(compId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompIds([...selectedCompIds, compId]);
                            } else {
                              setSelectedCompIds(selectedCompIds.filter((id) => id !== compId));
                            }
                          }}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowStructureModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creatingStruct}>
                  Save Structure
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
