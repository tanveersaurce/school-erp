import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}

export interface DropdownProps {
  triggerText: string;
  items: DropdownItem[];
  className?: string;
}

export function Dropdown({ triggerText, items, className }: DropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={clsx('relative inline-block text-left', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="inline-flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
      >
        <span>{triggerText}</span>
        <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl focus:outline-none">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={clsx(
                'flex w-full items-center px-3 py-2 text-xs font-medium transition-colors',
                item.destructive
                  ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
