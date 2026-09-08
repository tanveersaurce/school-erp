import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/Card.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useForgotPasswordMutation } from '../services/authApi.js';

export function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(
        err?.data?.error?.message ||
          'Failed to dispatch reset request. Please check your connection.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-600 items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30 mb-3">
            E
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">EduSphere Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Identity & Access Recovery</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Mail className="w-4 h-4 mr-2 text-indigo-400" />
              Reset Your Password
            </CardTitle>
            <CardDescription>
              Enter the email address associated with your account to receive instructions
            </CardDescription>
          </CardHeader>

          {isSubmitted ? (
            <div>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-1">Check Your Inbox</strong>
                    If an account with that email exists, password reset instructions have been
                    sent. The link will expire in 15 minutes.
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link to="/login" className="w-full">
                  <Button variant="outline" className="w-full">
                    Back to Sign In
                  </Button>
                </Link>
              </CardFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start space-x-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label
                    className="block text-xs font-medium text-slate-300 mb-1"
                    htmlFor="reset-email"
                  >
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-9"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                  isLoading={isLoading}
                >
                  Send Reset Instructions
                </Button>

                <div className="w-full flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-800">
                  <Link to="/login" className="hover:text-slate-400 flex items-center">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sign In
                  </Link>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
