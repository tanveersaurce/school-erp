import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
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
import { useResetPasswordMutation } from '../services/authApi.js';

export function ResetPasswordPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const isLengthValid = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new link.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!isLengthValid || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setErrorMessage('Password does not satisfy all complexity requirements.');
      return;
    }

    try {
      await resetPassword({ token, newPassword }).unwrap();
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err?.data?.error?.message ||
          'Failed to reset password. The link may have expired or been used already.'
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
          <p className="text-xs text-slate-400 mt-1">Create New Credentials</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <KeyRound className="w-4 h-4 mr-2 text-indigo-400" />
              Reset Password
            </CardTitle>
            <CardDescription>Enter a strong new password for your account</CardDescription>
          </CardHeader>

          {isSuccess ? (
            <div>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-1">Password Changed Successfully</strong>
                    Your password has been updated. All previous active sessions have been
                    terminated for your security. You can now log in with your new credentials.
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                  onClick={() => navigate('/login')}
                >
                  Proceed to Sign In
                </Button>
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

                {!token && (
                  <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800/60 text-xs text-amber-300">
                    No reset token found in URL. Please click the exact link from your email.
                  </div>
                )}

                <div>
                  <label
                    className="block text-xs font-medium text-slate-300 mb-1"
                    htmlFor="new-password"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading || !token}
                      className="pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium text-slate-300 mb-1"
                    htmlFor="confirm-password"
                  >
                    Confirm New Password
                  </label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading || !token}
                    required
                  />
                </div>

                {/* Password Policy Indicators */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400 font-medium mb-1">Password Requirements:</div>
                  <div className={isLengthValid ? 'text-emerald-400' : 'text-slate-500'}>
                    • Minimum 8 characters
                  </div>
                  <div className={hasUpper && hasLower ? 'text-emerald-400' : 'text-slate-500'}>
                    • Uppercase & lowercase letters
                  </div>
                  <div className={hasNumber ? 'text-emerald-400' : 'text-slate-500'}>
                    • At least one number
                  </div>
                  <div className={hasSpecial ? 'text-emerald-400' : 'text-slate-500'}>
                    • At least one special symbol
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                  isLoading={isLoading}
                  disabled={!token}
                >
                  Update Password
                </Button>

                <div className="w-full flex justify-center text-xs text-slate-500 pt-2 border-t border-slate-800">
                  <Link to="/login" className="hover:text-slate-400">
                    Cancel and Return to Sign In
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
