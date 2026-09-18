import React, { useState } from 'react';
import { Truck, Plus, RotateCw, Search, Phone, Mail, MapPin } from 'lucide-react';
import {
  useGetInventorySuppliersQuery,
  useCreateInventorySupplierMutation,
} from '../../features/inventory/inventoryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Dialog } from '../../components/ui/Dialog.js';

export const InventorySuppliersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: res, isLoading, refetch } = useGetInventorySuppliersQuery({ search: searchTerm || undefined });
  const [createSupplier, { isLoading: isCreating }] = useCreateInventorySupplierMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const suppliers = res?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      await createSupplier({
        name,
        code,
        contactPerson: contactPerson || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        taxId: taxId || undefined,
        paymentTerms: paymentTerms || undefined,
        active: true,
      }).unwrap();

      setIsOpen(false);
      setName('');
      setCode('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAddress('');
      setTaxId('');
      setPaymentTerms('');
    } catch (err) {
      console.error('Failed to create supplier', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-indigo-400" />
            Suppliers & Vendors
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Approved vendor registry, contact records, tax credentials, and procurement terms
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => refetch()} title="Refresh">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
            Add Supplier
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-slate-900/60 border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <Input
            placeholder="Search suppliers by name, code, contact person, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No suppliers registered</h3>
          <p className="text-sm text-slate-500 mt-1">Add approved vendors to track purchase deliveries and stock inward receipts.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <Card key={s.id || s._id} className="p-5 bg-slate-900/60 border-slate-800 hover:border-slate-700 transition">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-indigo-400 font-semibold">{s.code}</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{s.name}</h3>
                  {s.contactPerson && <p className="text-xs text-slate-400 mt-1">Contact: {s.contactPerson}</p>}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Approved
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{s.email}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
                {s.taxId && (
                  <div className="text-slate-500 font-mono text-[11px] pt-1">
                    Tax / VAT: {s.taxId}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add Vendor / Supplier"
        description="Register a new procurement source in the system."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor Code *</label>
              <Input
                required
                placeholder="e.g. SUP-CHEM-01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
              <Input
                required
                placeholder="e.g. Apex Scientific Supplies Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person</label>
              <Input
                placeholder="e.g. Jane Doe"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tax / VAT ID</label>
              <Input
                placeholder="Tax identification number"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
              <Input
                type="email"
                placeholder="vendor@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <Input
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Office Address</label>
            <Input
              placeholder="Physical street address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Terms</label>
            <Input
              placeholder="e.g. Net 30 days"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Register Vendor
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
