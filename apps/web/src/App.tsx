import React, { useState, useEffect } from 'react';
import { Shield, Server, CheckCircle, Database, Layers, ArrowRight } from 'lucide-react';
import { UserType } from '@edusphere/common';

export function App(): React.JSX.Element {
  const [apiHealth, setApiHealth] = useState<{ status: string; uptimeSeconds?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/health/liveness')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setApiHealth(data.data);
        }
      })
      .catch(() => {
        setApiHealth({ status: 'OFFLINE' });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/30">
            E
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">
            EduSphere <span className="text-indigo-400 font-normal">ERP</span>
          </span>
          <span className="text-xs font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full ml-2">
            Phase 1: Foundation
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">API Connection:</span>
            {loading ? (
              <span className="text-amber-400">Checking...</span>
            ) : apiHealth?.status === 'UP' ? (
              <span className="inline-flex items-center text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Online
              </span>
            ) : (
              <span className="text-rose-400">Offline / Standby</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-4">
            Enterprise Multi-Tenant <span className="text-indigo-400">School ERP Platform</span>
          </h1>
          <p className="text-lg text-slate-400">
            Engineered for educational societies, multi-campus institutions, and independent schools.
            Strict tenant isolation, immutable financial ledgers, and decoupled RBAC.
          </p>
        </div>

        {/* System Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-sm">
            <div className="p-3 bg-indigo-900/40 text-indigo-400 rounded-lg w-fit mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Decoupled Security & RBAC</h3>
            <p className="text-sm text-slate-400">
              75 fine-grained permissions mapped to 14 system roles including {UserType.SUPER_ADMIN}, {UserType.TEACHER}, and {UserType.STUDENT}.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-sm">
            <div className="p-3 bg-emerald-900/40 text-emerald-400 rounded-lg w-fit mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Multi-Tenancy Engine</h3>
            <p className="text-sm text-slate-400">
              Hybrid tenancy strategy with query-level discriminator plugins and connection routing for enterprise tenants.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-sm">
            <div className="p-3 bg-blue-900/40 text-blue-400 rounded-lg w-fit mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Modular Monolith</h3>
            <p className="text-sm text-slate-400">
              36 bounded modules ready for seamless independent microservice extraction when scaling to 1000+ schools.
            </p>
          </div>
        </div>

        {/* Foundation Status Banner */}
        <div className="bg-gradient-to-r from-indigo-900/40 to-slate-800/60 border border-indigo-800/60 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h4 className="text-base font-semibold text-white mb-1 flex items-center">
              <Server className="w-4 h-4 mr-2 text-indigo-400" />
              Phase 1 Monorepo & Technical Baseline Verified
            </h4>
            <p className="text-sm text-slate-400">
              Workspace packages <code className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300">@edusphere/common</code>, <code className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300">@edusphere/types</code>, and <code className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300">@edusphere/api</code> active.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-xs font-medium text-indigo-300 bg-indigo-950/80 border border-indigo-800 px-3 py-1.5 rounded-lg">
            <span>Ready for Phase 2 (Database Layer)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        EduSphere ERP SaaS &copy; 2026. Production-Grade Enterprise Engineering Architecture.
      </footer>
    </div>
  );
}
export default App;
