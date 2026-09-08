import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { useVerifyEmailMutation } from '../services/authApi.js';

export function VerifyEmailPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async (tokenToVerify: string) => {
    try {
      await verifyEmail({ token: tokenToVerify }).unwrap();
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(
        err?.data?.error?.message ||
          'Email verification link is invalid or has expired. Please request a new link.'
      );
    }
  };

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-600 items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30 mb-3">
            E
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">EduSphere Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Identity Verification</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl text-center">
          <CardHeader>
            <CardTitle className="text-lg flex justify-center items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-indigo-400" />
              Email Verification
            </CardTitle>
            <CardDescription>Confirming your institution email address</CardDescription>
          </CardHeader>

          <CardContent className="py-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-300">Validating your verification token...</p>
              </div>
            )}

            {!isLoading && status === 'success' && (
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex flex-col items-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <h3 className="font-semibold text-white">Email Confirmed!</h3>
                <p className="text-xs text-slate-300">
                  Your email address has been successfully verified. You now have full access to
                  your EduSphere account.
                </p>
              </div>
            )}

            {!isLoading && status === 'error' && (
              <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 flex flex-col items-center space-y-2">
                <AlertCircle className="w-10 h-10 text-rose-400" />
                <h3 className="font-semibold text-white">Verification Failed</h3>
                <p className="text-xs text-slate-300">{errorMessage}</p>
              </div>
            )}

            {!token && (
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 p-4 rounded-lg">
                No verification token was detected in the URL. Please use the link sent to your
                email.
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-center">
            <Link to="/login" className="w-full">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                Proceed to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
