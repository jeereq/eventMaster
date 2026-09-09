'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutGrid } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onFallbackTo2D?: () => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class Room3DErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Room3DErrorBoundary] Erreur dans le moteur 3D WebGL:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={
            this.props.className ??
            'relative flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border bg-surface-muted min-h-[320px] text-center space-y-3'
          }
          role="alert"
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="font-semibold text-foreground text-sm">
              {this.props.fallbackTitle ?? 'Affichage 3D temporairement indisponible'}
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Le pilote graphique (WebGL) de votre navigateur a rencontré une interruption. Vous pouvez relancer la scène 3D ou continuer sur la vue 2D.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={this.handleRetry}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Relancer la vue 3D
            </Button>
            {this.props.onFallbackTo2D && (
              <Button
                size="sm"
                onClick={this.props.onFallbackTo2D}
                leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}
              >
                Passer en vue 2D
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
