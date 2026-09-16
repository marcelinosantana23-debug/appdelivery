import { useState, useRef, useEffect } from "react";
import { Shield, ChevronDown, Check, LayoutDashboard, Settings, LogOut, Search } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { StoreLogo, getSafeDisplayName, getSafeSlug } from "@/components/common/StoreLogo";

interface SuperAdminInspectorBarProps {
  onGoToStoreAdmin?: () => void;
  onGoToSuperAdmin?: () => void;
}

export function SuperAdminInspectorBar({
  onGoToStoreAdmin,
  onGoToSuperAdmin,
}: SuperAdminInspectorBarProps) {
  const {
    isSuperAdmin,
    tenants,
    currentTenant,
    config,
    selectTenant,
    logout,
  } = useStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only render if user is authenticated Super Admin
  if (!isSuperAdmin) {
    return null;
  }

  const currentStoreName = getSafeDisplayName(currentTenant?.name || config.name, "Burger Town");
  const currentStoreSlug = getSafeSlug(currentTenant?.slug || config.slug, "loja");

  const filteredTenants = tenants.filter((t) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.slug.toLowerCase().includes(term) ||
      (t.address && t.address.toLowerCase().includes(term))
    );
  });

  return (
    <div className="sticky top-0 z-50 w-full border-b border-amber-500/40 bg-slate-950/95 text-slate-100 shadow-xl backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
        {/* Left: Super Admin Badge & Mode Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 shadow-sm">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>Super Admin</span>
          </div>
          <span className="hidden text-xs font-medium text-slate-400 md:inline">
            Modo Inspeção &amp; Teste de Vitrines
          </span>
        </div>

        {/* Center: Quick Store Selector Dropdown */}
        <div className="relative flex-1 max-w-md" ref={dropdownRef}>
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setSearchTerm("");
            }}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-inner transition hover:border-amber-400/60 hover:bg-slate-800/90 active:scale-[0.99]"
            title="Alternar vitrine de teste (exclusivo Super Admin)"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-800 text-sm">
                <StoreLogo
                  logo={currentTenant?.logo || config.logo}
                  name={currentStoreName}
                  className="h-full w-full object-cover"
                  fallbackEmoji="🏪"
                />
              </div>
              <span className="truncate font-bold text-amber-300">{currentStoreName}</span>
              <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">
                /loja/{currentStoreSlug}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                Trocar Loja
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-amber-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[300px] max-w-md rounded-2xl border border-amber-500/30 bg-slate-900/98 p-2 text-slate-100 shadow-2xl backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Seletor de Vitrines ({tenants.length} lojas)
                </span>
                <span className="text-[10px] text-amber-400/80">Acesso Restrito Super Admin</span>
              </div>

              {/* Search Filter */}
              {tenants.length > 3 && (
                <div className="relative mb-2 px-1">
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome ou slug..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {/* Store List */}
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {filteredTenants.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Nenhuma loja encontrada com "{searchTerm}"
                  </div>
                ) : (
                  filteredTenants.map((t) => {
                    const isSelected =
                      (currentTenant?.id || config.id) === t.id ||
                      (currentTenant?.slug || config.slug) === t.slug;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          selectTenant(t.slug);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                          isSelected
                            ? "bg-amber-500/20 text-amber-200 font-bold border border-amber-500/40"
                            : "hover:bg-slate-800 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800 border border-white/10 text-base shadow-sm">
                            <StoreLogo
                              logo={t.logo}
                              name={t.name}
                              className="h-full w-full object-cover"
                              fallbackEmoji="🍔"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-white">
                                {getSafeDisplayName(t.name, "Lanchonete")}
                              </span>
                              {t.status === "inactive" && (
                                <span className="rounded bg-red-900/60 px-1 py-0.2 text-[9px] text-red-300">
                                  Inativa
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              /loja/{getSafeSlug(t.slug, "loja")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                              <Check className="h-3.5 w-3.5" /> Atual
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 hover:text-amber-300">
                              Inspecionar &rarr;
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          {onGoToStoreAdmin && (
            <button
              onClick={onGoToStoreAdmin}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 active:scale-95"
              title="Acessar o painel desta loja para gerenciar cardápio e pedidos"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Painel da Loja</span>
            </button>
          )}

          {onGoToSuperAdmin && (
            <button
              onClick={onGoToSuperAdmin}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-500/30 active:scale-95"
              title="Voltar ao Painel Geral de Super Administrador"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-amber-400" />
              <span>Super Admin</span>
            </button>
          )}

          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-950/40 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-900/40 active:scale-95"
            title="Encerrar sessão de Super Admin"
          >
            <LogOut className="h-3.5 w-3.5 text-red-400" />
            <span className="hidden xs:inline">Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
}
