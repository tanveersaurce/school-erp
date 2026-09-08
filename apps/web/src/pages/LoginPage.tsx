import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
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
import { useLoginMutation } from '../services/authApi.js';
import { useAppDispatch } from '../store/index.js';
import { setCredentials } from '../store/slices/authSlice.js';

export function LoginPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      const response = await login({
        email: email.trim(),
        password,
        rememberMe,
      }).unwrap();

      if (response.success && response.data) {
        dispatch(
          setCredentials({
            accessToken: response.data.accessToken,
            user: response.data.user,
            session: response.data.session,
          })
        );
        sessionStorage.setItem('accessToken', response.data.accessToken);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.error?.message ||
        err?.error ||
        'Authentication failed. Please check your network and credentials.';
      setErrorMessage(errorMsg);
    }
  };

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
              Sign In to Your Account
            </CardTitle>
            <CardDescription>
              Enter your verified credentials to access the platform
            </CardDescription>
          </CardHeader>

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
                  htmlFor="email-input"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    id="email-input"
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

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-300" htmlFor="password-input">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-9 pr-9"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="remember-me" className="text-xs text-slate-400 cursor-pointer">
                  Remember this device for 7 days
                </label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                isLoading={isLoading}
              >
                Sign In
              </Button>

              <div className="w-full flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-800">
                <Link to="/" className="hover:text-slate-400 flex items-center">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Home
                </Link>
                <span>EduSphere v1.0.0</span>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
