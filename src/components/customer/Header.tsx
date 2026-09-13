import { Clock, MapPin } from "lucide-react";
import { useStore } from "@/context/StoreContext";

interface HeaderProps {
  onAdminClick: () => void;
}

export function Header({ onAdminClick }: HeaderProps) {
  const { isStoreOpen, config } = useStore();

  return (
    <header className="relative overflow-hidden bg-primary-dark text-white">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 20% 50%, var(--color-primary-light) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent) 0%, transparent 40%)`,
        }}
      />
      <div className="relative mx-auto max-w-2xl px-5 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur-sm">
              {config.logo}
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">{config.name}</h1>
              <p className="text-sm text-white/80">{config.tagline}</p>
            </div>
          </div>
          <button
            onClick={onAdminClick}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-white/20"
          >
            Admin
          </button>
        </div>

        <div className="mt-5 flex items-center gap-4 text-sm">
          <span
            className={`flex items-center gap-1.5 font-semibold ${
              isStoreOpen ? "text-green-300" : "text-red-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isStoreOpen ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            {isStoreOpen ? "Aberto agora" : "Fechado"}
          </span>
          <span className="flex items-center gap-1.5 text-white/80">
            <Clock className="h-4 w-4" />
            {config.hours}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
          <MapPin className="h-3.5 w-3.5" />
          {config.address}
        </div>
      </div>
    </header>
  );
}
