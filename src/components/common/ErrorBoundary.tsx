import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[350px] flex-col items-center justify-center p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-red-200 bg-red-50/50 p-8 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-inner">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {this.props.fallbackTitle || "Ocorreu um erro ao carregar este módulo"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {this.state.error?.message || "Tente recarregar o módulo ou atualizar a página."}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
