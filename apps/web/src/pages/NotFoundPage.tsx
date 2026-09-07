import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex p-4 rounded-full bg-slate-900 text-indigo-400 mb-4 border border-slate-800 shadow-lg">
          <FileQuestion className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2 font-mono">404</h1>
        <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          The requested path does not exist on this tenant server or may have been moved.
        </p>
        <Link to="/">
          <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Safety
          </Button>
        </Link>
      </div>
    </div>
  );
}
