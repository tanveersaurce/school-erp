import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Plus,
  Barcode,
  Eye,
  X,
} from 'lucide-react';
import {
  useGetBooksQuery,
  useGetCategoriesQuery,
  useCreateBookMutation,
  useAddBookCopiesMutation,
  useGetLibrariesQuery,
  useGetShelvesQuery,
} from '../../features/library/libraryApi.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';

export const BookCatalogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAddCopiesOpen, setIsAddCopiesOpen] = useState(false);
  const [selectedBookForCopies, setSelectedBookForCopies] = useState<any>(null);

  // New Book Form State
  const [bookTitle, setBookTitle] = useState('');
  const [bookSubtitle, setBookSubtitle] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookCategoryId, setBookCategoryId] = useState('');
  const [bookYear, setBookYear] = useState(new Date().getFullYear());
  const [bookLanguage, setBookLanguage] = useState('English');
  const [bookPages, setBookPages] = useState(250);
  const [bookDescription, setBookDescription] = useState('');

  // Add Copies Form State
  const [copyLibraryId, setCopyLibraryId] = useState('');
  const [copyShelfId, setCopyShelfId] = useState('');
  const [copyQuantity, setCopyQuantity] = useState(1);
  const [copyBarcode, setCopyBarcode] = useState('');

  const { data: booksRes, isLoading: loadingBooks } = useGetBooksQuery({
    search: searchTerm || undefined,
    categoryId: selectedCategory || undefined,
  });
  const { data: catRes } = useGetCategoriesQuery();
  const { data: libRes } = useGetLibrariesQuery();
  const { data: shelfRes } = useGetShelvesQuery();

  const [createBook, { isLoading: creatingBook }] = useCreateBookMutation();
  const [addCopies, { isLoading: addingCopies }] = useAddBookCopiesMutation();

  const books = booksRes?.data?.items || [];
  const categories = catRes?.data || [];
  const libraries = libRes?.data || [];
  const shelves = shelfRes?.data || [];

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBook({
        title: bookTitle.trim(),
        subtitle: bookSubtitle.trim() || undefined,
        isbn: bookIsbn.trim() || undefined,
        categoryId: bookCategoryId || undefined,
        publicationYear: Number(bookYear),
        language: bookLanguage,
        pages: Number(bookPages),
        description: bookDescription.trim() || undefined,
      }).unwrap();

      setIsAddBookOpen(false);
      setBookTitle('');
      setBookSubtitle('');
      setBookIsbn('');
      setBookDescription('');
    } catch (err) {
      console.error('Failed to create book', err);
    }
  };

  const handleAddCopies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForCopies) return;
    try {
      await addCopies({
        bookId: selectedBookForCopies._id,
        data: {
          libraryId: copyLibraryId || (libraries[0] as any)?._id || libraries[0]?.id,
          shelfId: copyShelfId || undefined,
          quantity: Number(copyQuantity),
          barcode: copyBarcode.trim() || undefined,
        },
      }).unwrap();

      setIsAddCopiesOpen(false);
      setSelectedBookForCopies(null);
      setCopyBarcode('');
      setCopyQuantity(1);
    } catch (err) {
      console.error('Failed to add physical copies', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-sky-400" />
            Book Catalog
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Bibliographic metadata repository, ISBN registry & inventory tracking
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddBookOpen(true)}
        >
          Add New Book
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Books Catalog Grid */}
      {loadingBooks ? (
        <div className="flex justify-center items-center py-24">
          <Spinner size="lg" />
        </div>
      ) : books.length === 0 ? (
        <Card className="p-12 text-center bg-slate-800/60 border-slate-700/60">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No Books Found</h3>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search criteria or register a new title.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((book: any) => (
            <Card key={book._id} className="p-5 bg-slate-800/80 border-slate-700/60 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-lg">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {book.categoryId?.name || 'General'}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-2 line-clamp-1">{book.title}</h3>
                    {book.subtitle && (
                      <p className="text-xs text-slate-400 line-clamp-1">{book.subtitle}</p>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-300 shrink-0">
                    <BookOpen className="w-5 h-5 text-sky-400" />
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ISBN:</span>
                    <span className="font-mono text-slate-200">{book.isbn || book.isbn13 || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Language:</span>
                    <span>{book.language || 'English'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Publication Year:</span>
                    <span>{book.publicationYear || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`inline-flex items-center font-bold ${
                    (book.availableCopies ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {book.availableCopies ?? 0}
                  </span>
                  <span className="text-slate-400">/ {book.totalCopies ?? 0} Copies Avail.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedBookForCopies(book);
                      setIsAddCopiesOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                    title="Add Physical Copies"
                  >
                    <Barcode className="w-4 h-4" />
                  </button>
                  <Link
                    to={`/library/books/${book._id}`}
                    className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Book Modal Dialog */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                Register New Book Title
              </h2>
              <button
                onClick={() => setIsAddBookOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="e.g. To Kill a Mockingbird"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={bookSubtitle}
                    onChange={(e) => setBookSubtitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    placeholder="Optional subtitle"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">ISBN</label>
                  <input
                    type="text"
                    value={bookIsbn}
                    onChange={(e) => setBookIsbn(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    placeholder="978-0-xxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={bookCategoryId}
                    onChange={(e) => setBookCategoryId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Publication Year</label>
                  <input
                    type="number"
                    value={bookYear}
                    onChange={(e) => setBookYear(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
                  <input
                    type="text"
                    value={bookLanguage}
                    onChange={(e) => setBookLanguage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    placeholder="e.g. English"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Page Count</label>
                  <input
                    type="number"
                    value={bookPages}
                    onChange={(e) => setBookPages(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  placeholder="Summary or synopsis..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="secondary" onClick={() => setIsAddBookOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={creatingBook}>
                  {creatingBook ? <Spinner size="sm" /> : 'Save Title'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Physical Copies Modal */}
      {isAddCopiesOpen && selectedBookForCopies && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-400" />
                Add Copies: {selectedBookForCopies.title}
              </h2>
              <button
                onClick={() => setIsAddCopiesOpen(false)}
                className="text-slate-400 hover:text-white"
              >
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
