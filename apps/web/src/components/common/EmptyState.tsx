import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from '../ui/Button.js';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = <Layers className="w-10 h-10 text-slate-500" />,
  actionText,
  onAction,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 my-6">
      <div className="p-3 bg-slate-800/60 rounded-full mb-3 text-slate-400">{icon}</div>
      <h4 className="text-base font-semibold text-white mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
