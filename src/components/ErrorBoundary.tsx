import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public handleReload = () => {
    try {
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D14] text-white flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full p-6 bg-black/60 border border-white/20 rounded-2xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Ops, ocorreu um erro ao carregar o app</h2>
            <p className="text-xs text-neutral-400">
              {this.state.error?.message || 'Ocorreu uma instabilidade temporária na interface.'}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recarregar Aplicativo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
