import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';

export function LoginPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-600 items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30 mb-3">
            E
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            EduSphere <span className="text-indigo-400 font-normal">Portal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Multi-Tenant Identity & Access Management</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Lock className="w-4 h-4 mr-2 text-indigo-400" />
              Authentication Foundation Shell
            </CardTitle>
            <CardDescription>Architectural Route Preparation (Phase 1 Foundation)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-indigo-950/40 border border-indigo-900/60 text-xs text-slate-300 flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-1">
                  Notice: Zero Mock Authentication Policy
                </strong>
                Per Phase 1 strict governance rules, fake JWTs, hardcoded credentials, and mock
                logins are deliberately omitted. Complete Argon2id, dual-token rotation, and session
                management will be implemented during <strong>Phase 3 (Authentication)</strong>.
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Link to="/">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
