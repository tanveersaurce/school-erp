import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export function ForbiddenPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex p-4 rounded-full bg-amber-950/60 text-amber-400 mb-4 border border-amber-800/60 shadow-lg">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2 font-mono">403</h1>
        <h2 className="text-xl font-bold text-white mb-2">Access Forbidden</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          You do not have the required role permissions or tenant authorization to view this
          resource.
        </p>
        <Link to="/">
          <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
