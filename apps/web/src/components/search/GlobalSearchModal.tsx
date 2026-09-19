import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  GraduationCap,
  Users,
  Briefcase,
  BookOpen,
  Package,
  Layers,
  Car,
  Building,
  Receipt,
  Bell,
  FileText,
  School,
  CornerDownLeft,
  Loader2,
} from 'lucide-react';
import { useGlobalSearchQuery } from '../../features/search/searchApi.js';
import { GlobalSearchEntity, GlobalSearchResultItem } from '@edusphere/types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ENTITY_ICONS: Record<GlobalSearchEntity, React.ComponentType<{ className?: string }>> = {
  STUDENT: GraduationCap,
  PARENT: Users,
  STAFF: Briefcase,
  BOOK: BookOpen,
  INVENTORY_ITEM: Package,
  ASSET: Layers,
  VEHICLE: Car,
  HOSTEL: Building,
  FEE_INVOICE: Receipt,
  ANNOUNCEMENT: Bell,
  EXAM: FileText,
  CLASS: School,
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
      setDebouncedTerm('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const { data, isFetching } = useGlobalSearchQuery(
    { q: debouncedTerm, limit: 5 },
    { skip: !isOpen || debouncedTerm.length < 2 }
  );

  const groups = data?.data?.groups || [];
  const totalMatches = data?.data?.totalMatches || 0;

  // Flattened items for keyboard arrow navigation
  const flatItems: GlobalSearchResultItem[] = useMemo(() => {
    return groups.flatMap((group) => group.items);
  }, [groups]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedTerm]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      if (selected) {
        navigate(selected.route);
        onClose();
      }
    }
  };

  const handleItemClick = (item: GlobalSearchResultItem) => {
    navigate(item.route);
    onClose();
  };

  if (!isOpen) return null;

  let currentFlatIndex = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl transition-all">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900/90">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students, staff, classes, library, fees, announcements..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base"
          />
          {isFetching && <Loader2 className="h-4 w-4 text-indigo-400 animate-spin mr-2 shrink-0" />}
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 mr-2"
              title="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto divide-y divide-slate-800/60 p-2"
        >
          {debouncedTerm.length >= 2 && groups.length === 0 && !isFetching && (
            <div className="py-12 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No results found for &ldquo;{debouncedTerm}&rdquo;</p>
              <p className="text-xs text-slate-500 mt-1">Try refining your search terms</p>
            </div>
          )}

          {debouncedTerm.length < 2 && (
            <div className="py-8 text-center text-slate-500">
              <p className="text-sm">Type at least 2 characters to search across school entities</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Students</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Faculty</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Library</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Classes</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Invoices</span>
              </div>
            </div>
          )}

          {groups.map((group) => {
            const Icon = ENTITY_ICONS[group.entityType] || Search;
            return (
              <div key={group.entityType} className="py-2 first:pt-0 last:pb-0">
                <div className="px-3 py-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{group.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{group.total}</span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    currentFlatIndex++;
                    const isSelected = currentFlatIndex === selectedIndex;
                    return (
                      <div
                        key={item.entityId}
                        onClick={() => handleItemClick(item)}
                        className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                            : 'hover:bg-slate-800/60 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div className={`p-1.5 rounded-md ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-medium text-sm leading-snug truncate">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-xs text-slate-400 truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 ml-4">
                          {item.status && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {item.status}
                            </span>
                          )}
                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">↵</kbd> Select
            </span>
          </div>
          {totalMatches > 0 && <span>{totalMatches} result{totalMatches === 1 ? '' : 's'}</span>}
        </div>
      </div>
    </div>
  );
};
