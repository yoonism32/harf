'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] caught:', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="card p-6 flex flex-col gap-3 items-start text-sm">
          <span className="text-muted">Something went wrong loading this section.</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1.5 rounded-lg bg-surface-plus border border-border text-muted
              hover:border-gold/40 hover:text-gold transition-colors text-xs"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
