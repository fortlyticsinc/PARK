// frontend/src/components/ErrorBoundary.tsx
/**
 * PARK — Error Boundary
 * Catches React render errors and maps them to friendly UX per §9.2.
 */
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorCode: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCode: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorCode: "INTERNAL_ERROR" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-stone-950 px-4">
            <div className="max-w-md text-center">
              <div className="mb-6 text-6xl">🔧</div>
              <h1 className="mb-2 font-serif text-2xl text-sage-100">
                Something went wrong
              </h1>
              <p className="mb-6 text-stone-400">
                This wasn't supposed to happen. Please refresh the page or try
                again later.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-sage-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-sage-500"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
