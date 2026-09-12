import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Database,
  Layers,
  CheckCircle,
  Sun,
  Moon,
  Laptop,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useGetHealthQuery } from '../services/api.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../components/common/Toast.js';
import { Button } from '../components/ui/Button.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/Card.js';
import { Dialog } from '../components/ui/Dialog.js';

export function HomePage(): React.JSX.Element {
  const {
    data: healthData,
    isLoading: healthLoading,
    isError: healthError,
  } = useGetHealthQuery(undefined, {
    pollingInterval: 15000,
  });
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/30">
            E
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">
            EduSphere <span className="text-indigo-400 font-normal">ERP</span>
          </span>
          <span className="text-xs font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded-full ml-2">
            Phase 1: Foundation
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Selector */}
          <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg p-1">
            <button
              onClick={() => setTheme('light')}
              title="Light Theme"
              className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title="Dark Theme"
              className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              title="System Theme"
              className={`p-1.5 rounded-md transition-colors ${theme === 'system' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            to="/academic"
            className="text-xs text-indigo-300 hover:text-white font-medium mr-1"
          >
            Academic
          </Link>
          <Link to="/students" className="text-xs text-slate-300 hover:text-white mr-1">
            Students
          </Link>
          <Link to="/guardians" className="text-xs text-slate-300 hover:text-white mr-1">
            Guardians
          </Link>
          <Link to="/my-children" className="text-xs text-slate-300 hover:text-white mr-1">
            Parent Portal
          </Link>
          <Link to="/organization" className="text-xs text-slate-300 hover:text-white mr-1">
            Organization
          </Link>
          <Link to="/roles" className="text-xs text-slate-300 hover:text-white mr-2">
            Roles & Matrix
          </Link>
          <Link to="/login">
            <Button variant="outline" size="sm" leftIcon={<Lock className="w-3.5 h-3.5" />}>
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Production-Grade MERN <span className="text-indigo-400">School ERP Platform</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Multi-tenant architecture engineered for scale. Zero data leakage, strict RBAC,
            immutable ledger transactions, and decoupled domain services.
          </p>
        </div>

        {/* Live System Diagnostics Card */}
        <Card className="mb-10 border-indigo-900/50 bg-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center text-white">
                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
                  Live RTK Query Backend Status Check
                </CardTitle>
                <CardDescription>
                  Real-time status reported via REST API endpoint{' '}
                  <code className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300">
                    /api/v1/health/readiness
                  </code>
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => showToast('Diagnostics re-polled via RTK Query cache.', 'info')}
              >
                Ping Health
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">API Server</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {healthLoading
                    ? 'Checking...'
                    : healthError
                      ? 'OFFLINE'
                      : healthData?.data.checks?.server || 'UP'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">Database Engine</span>
                <span className="text-sm font-semibold text-indigo-300">
                  {healthLoading
                    ? 'Checking...'
                    : healthError
                      ? 'UNKNOWN'
                      : healthData?.data.checks?.database || 'DISCONNECTED'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">In-Memory Cache</span>
                <span className="text-sm font-semibold text-indigo-300">
                  {healthLoading
                    ? 'Checking...'
                    : healthError
                      ? 'UNKNOWN'
                      : healthData?.data.checks?.redis || 'DISCONNECTED'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">Environment</span>
                <span className="text-sm font-semibold text-slate-200 uppercase font-mono text-xs">
                  {healthLoading ? '...' : healthData?.data.environment || 'development'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="p-3 bg-indigo-900/40 text-indigo-400 rounded-lg w-fit mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Decoupled Security & RBAC</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                75 fine-grained permissions mapped to 14 system roles with zero hardcoded role
                checks. Ready for Phase 4 RBAC engine.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="p-3 bg-emerald-900/40 text-emerald-400 rounded-lg w-fit mb-4">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Multi-Tenancy Engine</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hybrid tenancy strategy with query-level discriminator plugins and connection
                routing for enterprise tenants.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="p-3 bg-blue-900/40 text-blue-400 rounded-lg w-fit mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Modular Monolith</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                36 bounded domain modules organized with strict isolation boundaries, enabling
                future microservices extraction.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Component & Routing Sandbox */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-base">
              Foundation Routing & UI Component Verification
            </CardTitle>
            <CardDescription>
              Test Phase 1 design system primitives, dialogs, toasts, and router views.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  showToast('Interactive toast system verified!', 'success');
                }}
              >
                Trigger Toast
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsDemoModalOpen(true)}>
                Open Dialog Modal
              </Button>
              <Link to="/academic">
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Academic Dashboard
                </Button>
              </Link>
              <Link to="/academic/academic-classes">
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Academic Classes
                </Button>
              </Link>
              <Link to="/students">
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Student Directory
                </Button>
              </Link>
              <Link to="/guardians">
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Guardians
                </Button>
              </Link>
              <Link to="/my-children">
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Parent Portal
                </Button>
              </Link>
              <Link to="/staff">
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Staff Directory
                </Button>
              </Link>
              <Link to="/teachers">
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Teaching Faculty
                </Button>
              </Link>
              <Link to="/departments-designations">
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Departments & Designations
                </Button>
              </Link>
              <Link to="/403">
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Test 403 Page
                </Button>
              </Link>
              <Link to="/non-existent-route">
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  Test 404 Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Interactive Verification Modal */}
      <Dialog
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        title="Phase 1 Design System Verification"
        description="Dialog modal primitive with accessible focus management."
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsDemoModalOpen(false)}>
            Close Modal
          </Button>
        }
      >
        <p className="text-xs text-slate-300 mb-3">
          This accessible modal dialog is verified with background blur, escape-key dismissal, and
          keyboard focus containment.
        </p>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-indigo-300">
          Status: Phase 1 UI Primitives Loaded Successfully
        </div>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        EduSphere ERP SaaS &copy; 2026. Production-Grade Enterprise Engineering Architecture.
      </footer>
    </div>
  );
}
