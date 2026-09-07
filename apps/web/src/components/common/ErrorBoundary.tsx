import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full rounded-2xl border border-rose-900/60 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="inline-flex p-4 rounded-full bg-rose-950/60 text-rose-400 mb-4 border border-rose-800/60">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              An unexpected application error occurred. The system safely contained the failure to
              protect session state.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 rounded-lg bg-slate-950 border border-slate-800 text-left font-mono text-xs text-rose-300 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex justify-center space-x-3">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={this.handleReset}
              >
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
