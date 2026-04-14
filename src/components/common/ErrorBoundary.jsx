import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-96 text-center px-6">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Une erreur est survenue</h2>
        <p className="text-slate-500 text-sm mb-1">Ce module a rencontré un problème inattendu.</p>
        {this.state.error?.message && (
          <p className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-2 rounded-lg mb-6 max-w-md truncate">
            {this.state.error.message}
          </p>
        )}
        <Button onClick={this.reset} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
