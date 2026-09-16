import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  Barcode,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  useGetBookByIdQuery,
  useGetCopiesQuery,
  useAddBookCopiesMutation,
  useUpdateCopyConditionMutation,
  useWithdrawCopyMutation,
  useGetLibrariesQuery,
  useGetShelvesQuery,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const BookDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isAddCopiesOpen, setIsAddCopiesOpen] = useState(false);
  const [copyQuantity, setCopyQuantity] = useState(1);
  const [copyLibraryId, setCopyLibraryId] = useState('');
  const [copyShelfId, setCopyShelfId] = useState('');
  const [copyBarcode, setCopyBarcode] = useState('');

  const { data: bookRes, isLoading: loadingBook } = useGetBookByIdQuery(id || '');
  const { data: copiesRes, isLoading: loadingCopies } = useGetCopiesQuery(
    id ? { bookId: id } : undefined
  );
  const { data: libRes } = useGetLibrariesQuery();
  const { data: shelfRes } = useGetShelvesQuery();

  const [addCopies, { isLoading: addingCopies }] = useAddBookCopiesMutation();
  const [updateCondition] = useUpdateCopyConditionMutation();
  const [withdrawCopy] = useWithdrawCopyMutation();

  const book = bookRes?.data;
  const copies = copiesRes?.data || [];
  const libraries = libRes?.data || [];
  const shelves = shelfRes?.data || [];

  if (loadingBook || loadingCopies) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-8 text-center text-slate-400">
        Book not found.{' '}
        <Link to="/library/catalog" className="text-sky-400 hover:underline">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const handleAddCopies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await addCopies({
        bookId: id,
        data: {
          libraryId: copyLibraryId || (libraries[0] as any)?._id || libraries[0]?.id,
          shelfId: copyShelfId || undefined,
          quantity: Number(copyQuantity),
          barcode: copyBarcode.trim() || undefined,
        },
      }).unwrap();
      setIsAddCopiesOpen(false);
      setCopyBarcode('');
      setCopyQuantity(1);
    } catch (err) {
      console.error('Failed to add copies', err);
    }
  };

  const handleUpdateCondition = async (copyId: string, condition: string) => {
    try {
      await updateCondition({
        id: copyId,
        data: { condition, notes: `Manual condition change to ${condition}` },
      }).unwrap();
    } catch (err) {
      console.error('Failed to update condition', err);
    }
  };

  const handleWithdraw = async (copyId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this physical copy from circulation?')) return;
    try {
      await withdrawCopy({
        id: copyId,
        data: { reason: 'DAMAGED_BEYOND_REPAIR', notes: 'Withdrawn by librarian' },
      }).unwrap();
    } catch (err) {
      console.error('Failed to withdraw copy', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/library/catalog"
          className="text-xs text-sky-400 hover:text-sky-300 inline-flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Book Catalog
        </Link>
      </div>

      {/* Book Summary Card */}
      <Card className="p-6 bg-slate-800/80 border-slate-700/60 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {typeof (book as any).categoryId === 'object' ? (book as any).categoryId?.name : ((book as any).category?.name || (book as any).category || 'General Catalog')}
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-2">{book.title}</h1>
              {book.subtitle && <p className="text-sm text-slate-400 mt-0.5">{book.subtitle}</p>}
              <p className="text-xs text-slate-300 mt-2">
                ISBN: <span className="font-mono text-slate-200">{book.isbn || book.isbn13 || 'Unregistered'}</span> | Year: {book.publicationYear || 'N/A'} | Language: {book.language || 'English'} | Pages: {book.pages || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddCopiesOpen(true)}
            >
              Accession Copies
            </Button>
          </div>
        </div>

        {book.description && (
          <div className="pt-4 border-t border-slate-700/50">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Description / Summary</h4>
            <p className="text-sm text-slate-300 leading-relaxed">{book.description}</p>
          </div>
        )}
      </Card>

      {/* Physical Copies Inventory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Physical Copies Inventory ({copies.length})
          </h3>
          <span className="text-xs text-slate-400">
            {book.availableCopies ?? 0} available for immediate checkout
          </span>
        </div>

        <Card className="bg-slate-800/80 border-slate-700/60 overflow-hidden shadow-lg">
          {copies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No physical copies have been accessioned yet. Click "Accession Copies" to register barcodes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-700/60">
                  <tr>
                    <th className="px-4 py-3">Accession #</th>
                    <th className="px-4 py-3">Barcode</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {copies.map((copy: any) => (
                    <tr key={copy._id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3 font-mono text-white text-xs">
                        {copy.accessionNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 text-xs">
                        {copy.barcode || 'None'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={copy.condition}
                          onChange={(e) => handleUpdateCondition(copy._id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          <option value="NEW">NEW</option>
                          <option value="GOOD">GOOD</option>
                          <option value="FAIR">FAIR</option>
                          <option value="POOR">POOR</option>
                          <option value="DAMAGED">DAMAGED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            copy.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : copy.status === 'ISSUED'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : copy.status === 'RESERVED'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {copy.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {copy.status !== 'WITHDRAWN' && (
                          <button
                            onClick={() => handleWithdraw(copy._id)}
                            className="text-xs text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-500/10 transition-colors"
                            title="Withdraw Copy"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Accession Modal */}
      {isAddCopiesOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-400" />
                Accession Copies
              </h2>
              <button onClick={() => setIsAddCopiesOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCopies} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Library Branch *</label>
                <select
                  required
                  value={copyLibraryId}
                  onChange={(e) => setCopyLibraryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select Branch</option>
                  {libraries.map((l: any) => (
                    <option key={l._id} value={l._id}>{l.name} ({l.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Shelf Location</label>
                  <select
                    value={copyShelfId}
                    onChange={(e) => setCopyShelfId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Select Shelf</option>
                    {shelves.map((s: any) => (
                      <option key={s._id} value={s._id}>{s.name || s.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={copyQuantity}
                    onChange={(e) => setCopyQuantity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Barcode (Optional)</label>
                <input
                  type="text"
                  value={copyBarcode}
                  onChange={(e) => setCopyBarcode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setIsAddCopiesOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={addingCopies}>
                  {addingCopies ? <Spinner size="sm" /> : 'Accession Copies'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
