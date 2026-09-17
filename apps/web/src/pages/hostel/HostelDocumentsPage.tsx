import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Dialog } from '../../components/ui/Dialog.js';

interface IDocItem {
  id: string;
  title: string;
  documentType: string;
  hostelName: string;
  status: 'VALID' | 'EXPIRED' | 'PENDING';
  expiryDate: string;
  fileUrl: string;
}

export const HostelDocumentsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Standard compliance items
  const [docs, setDocs] = useState<IDocItem[]>([
    {
      id: 'doc-1',
      title: 'Fire Safety NOC & Evacuation Plan',
      documentType: 'Statutory Safety',
      hostelName: 'Tagore Hall of Residence',
      status: 'VALID',
      expiryDate: '2027-12-31',
      fileUrl: '#',
    },
    {
      id: 'doc-2',
      title: 'Municipal Health & Sanitation Clearance',
      documentType: 'Health Permit',
      hostelName: 'Sarojini Naidu Girls Wing',
      status: 'VALID',
      expiryDate: '2027-08-15',
      fileUrl: '#',
    },
    {
      id: 'doc-3',
      title: 'Hostel Resident Code of Conduct & Rulebook',
      documentType: 'Internal Policy',
      hostelName: 'All Hostels',
      status: 'VALID',
      expiryDate: '2028-06-30',
      fileUrl: '#',
    },
    {
      id: 'doc-4',
      title: 'Pest Control & Fumigation Certificate',
      documentType: 'Hygiene Compliance',
      hostelName: 'Tagore Hall of Residence',
      status: 'EXPIRED',
      expiryDate: '2026-08-01',
      fileUrl: '#',
    },
  ]);

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('Safety Certificate');
  const [hostelName, setHostelName] = useState('Tagore Hall of Residence');
  const [expiryDate, setExpiryDate] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: IDocItem = {
      id: `doc-${Date.now()}`,
      title,
      documentType: docType,
      hostelName,
      status: 'VALID',
      expiryDate: expiryDate || '2028-01-01',
      fileUrl: '#',
    };
    setDocs((prev) => [newDoc, ...prev]);
    setIsAddOpen(false);
    setTitle('');
  };

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.hostelName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-indigo-400" />
            Hostel Statutory Compliance & Documents
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Maintain fire clearances, municipal health permits, fumigation certificates, and hostel rules
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddOpen(true)}
        >
          Register Document
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search document title or hostel name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Docs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map((d) => {
          const isExpired = d.status === 'EXPIRED';
          return (
            <Card
              key={d.id}
              className="bg-slate-900/60 border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{d.title}</h3>
                      <p className="text-xs text-slate-400">{d.documentType}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      isExpired
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-1.5 my-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hostel</span>
                    <span className="font-semibold text-white">{d.hostelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expiry Date</span>
                    <span className={isExpired ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                      {new Date(d.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <Button variant="secondary" className="text-xs" leftIcon={<Download className="w-3.5 h-3.5" />}>
                  Download Document
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Modal */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Compliance Document"
        description="Attach a statutory or regulatory document to a hostel"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Water Potability Test"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document Type *</label>
              <input
                type="text"
                required
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hostel Block *</label>
              <input
                type="text"
                required
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Document
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
