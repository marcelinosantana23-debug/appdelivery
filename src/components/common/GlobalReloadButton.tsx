import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface GlobalReloadButtonProps {
  className?: string;
  variant?: "glass" | "light" | "dark" | "outline";
  showLabel?: boolean;
}

/**
 * Botão discreto de recarga da aplicação Top Food.
 * Força window.location.reload() mantendo a rota e dados do storage intactos.
 */
export function GlobalReloadButton({
  className = "",
  variant = "glass",
  showLabel = true,
}: GlobalReloadButtonProps) {
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    try {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      if (typeof window !== "undefined") {
        window.location.replace(window.location.href);
      }
    }
  };

  const variantStyles = {
    glass:
      "bg-black/40 hover:bg-black/60 text-white/95 border border-white/20 backdrop-blur-md shadow-xs",
    light:
      "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 border border-gray-200/80 dark:border-slate-700 shadow-xs",
    dark:
      "bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 shadow-xs",
    outline:
      "bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-700 shadow-xs",
  };

  return (
    <button
      id="global-header-reload-btn"
      type="button"
      onClick={handleReload}
      title="Atualizar aplicação (recarregar página)"
      aria-label="Atualizar aplicação"
      className={`inline-flex h-8 w-8 sm:h-8 sm:w-auto ${
        showLabel ? "sm:px-2.5" : ""
      } items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0 ${variantStyles[variant]} ${className}`}
    >
      <RefreshCw
        className={`h-3.5 w-3.5 text-current shrink-0 transition-transform ${
          isReloading ? "animate-spin" : ""
        }`}
      />
      {showLabel && <span className="hidden sm:inline">Atualizar</span>}
    </button>
  );
}
