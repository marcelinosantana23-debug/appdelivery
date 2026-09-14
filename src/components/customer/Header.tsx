import { useState } from "react";
import { Clock, MapPin, Store, ChevronDown, Check, Shield, AlertTriangle } from "lucide-react";
import { useStore } from "@/context/StoreContext";

interface HeaderProps {
  onAdminClick?: () => void;
  onStoreAdminClick?: () => void;
  onSuperAdminClick?: () => void;
}

export function Header({ onAdminClick, onStoreAdminClick, onSuperAdminClick }: HeaderProps) {
  const { isStoreOpen, isStoreActive, config, tenants, currentTenant, selectTenant, isSuperAdmin, currentUser } = useStore();
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);

  const handleStoreAdmin = onStoreAdminClick || onAdminClick || (() => {});
  const handleSuperAdmin = onSuperAdminClick || onAdminClick || (() => {});

  return (
    <header className="relative overflow-hidden bg-primary-dark text-white">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 20% 50%, var(--color-primary-light) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent) 0%, transparent 40%)`,
        }}
      />

      {/* Inactive store banner */}
      {!isStoreActive && (
        <div className="relative z-10 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <span>Esta lanchonete está temporariamente desativada pela plataforma. Pedidos suspensos.</span>
        </div>
      )}

      <div className="relative mx-auto max-w-2xl px-5 pt-8 pb-6">
        {/* Top toolbar: Store Switcher & Admin Button */}
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          {/* Multi-tenant selector */}
          <div className="relative">
            <button
              onClick={() => setStoreMenuOpen(!storeMenuOpen)}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
            >
              <Store className="h-3.5 w-3.5 text-amber-300" />
              <span className="max-w-[140px] truncate sm:max-w-[200px]">{config.name}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>

            {storeMenuOpen && (
              <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-900 p-2 text-slate-100 shadow-2xl animate-scale-in">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Trocar Lanchonete
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {tenants.map((t) => {
                    const isSelected = (currentTenant?.id || config.id) === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          selectTenant(t.slug);
                          setStoreMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                          isSelected
                            ? "bg-amber-500/20 text-amber-300 font-bold"
                            : "hover:bg-slate-800 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{t.logo || "🍔"}</span>
                          <div>
                            <span className="block font-medium leading-tight">{t.name}</span>
                            <span className="text-[10px] text-slate-400">/loja/{t.slug}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStoreAdmin}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
              title="Acesso administrativo da lanchonete"
            >
              <Store className="h-3.5 w-3.5 text-white/80" />
              <span className="hidden xs:inline sm:inline">
                {currentUser?.role === "tenant_admin" ? "Painel da Loja" : "Área do Lojista"}
              </span>
              <span className="xs:hidden sm:hidden">Lojista</span>
            </button>

            <button
              onClick={handleSuperAdmin}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur-sm transition hover:bg-amber-500/30 active:scale-95 shadow-sm"
              title="Acesso restrito do Super Admin da plataforma"
            >
              <Shield className="h-3.5 w-3.5 text-amber-300" />
              <span className="hidden xs:inline sm:inline">
                {isSuperAdmin ? "Painel Super Admin (Ativo)" : "Painel Super Admin"}
              </span>
              <span className="xs:hidden sm:hidden">Super Admin</span>
            </button>
          </div>
        </div>

        {/* Store Identity */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-lg backdrop-blur-sm">
            {config.logo || "🏪"}
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{config.name}</h1>
            <p className="text-xs sm:text-sm text-white/80">{config.tagline}</p>
          </div>
        </div>

        {/* Status & Address */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
          <span
            className={`flex items-center gap-1.5 font-semibold ${
              isStoreOpen && isStoreActive ? "text-green-300" : "text-red-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isStoreOpen && isStoreActive ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            {!isStoreActive ? "Loja Desativada" : isStoreOpen ? "Aberto agora" : "Fechado no momento"}
          </span>
          <span className="flex items-center gap-1.5 text-white/80">
            <Clock className="h-3.5 w-3.5" />
            {config.hours}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{config.address}</span>
        </div>
      </div>
    </header>
  );
}
