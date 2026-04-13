import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Capture runtime errors in React Islands to prevent total page crash.
 * Styled according to DragonMineZ design system.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-elevated border border-error/20 rounded-3xl shadow-glass">
          <div className="w-16 h-16 mb-4 flex items-center justify-center bg-error-glass rounded-full">
            <i className="fa-solid fa-triangle-exclamation text-error text-2xl animate-pulse"></i>
          </div>
          <h2 className="text-xl font-bold mb-2">Error en el Componente</h2>
          <p className="text-muted text-sm max-w-xs mb-6">
            Ha ocurrido un problema al cargar esta sección. No te preocupes, el resto del sitio sigue funcionando.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-2 bg-foreground text-background text-sm font-bold rounded-xl hover:scale-105 transition-all active:scale-95 shadow-glow"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
