import { Search, Sparkles, Store, UtensilsCrossed, ShieldCheck } from "lucide-react";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { useStore } from "@/context/StoreContext";

interface PortalHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onStoreAdminClick?: () => void;
  totalStores: number;
}

export function PortalHeader({
  searchQuery,
  onSearchChange,
  onStoreAdminClick,
  totalStores,
}: PortalHeaderProps) {
  const { platformSettings } = useStore();

  const bannerImg =
    platformSettings?.bannerUrl?.trim() ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80";
  const logoImg = platformSettings?.logoUrl?.trim() || "";
  const heroTitle = platformSettings?.heroTitle?.trim() || "Top Food - O Portal do Delivery";
  const heroSubtitle =
    platformSettings?.heroSubtitle?.trim() ||
    "O seu portal de delivery para as melhores lanchonetes, pizzarias, açaíterias e restaurantes.";
  const primaryColor = platformSettings?.primaryColor?.trim() || "#E63946";

  return (
    <header className="relative w-full bg-white dark:bg-slate-900 shadow-sm border-b border-gray-100 dark:border-slate-800 transition-colors">
      {/* 1. BANNER DO PORTAL TOP FOOD (Mesmo layout e proporção das vitrines) */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-900 sm:h-56 md:h-64">
        {/* Imagem de Capa Marketplace */}
        <img
          src={bannerImg}
          alt={heroTitle}
          className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        {/* Gradiente escuro para legibilidade perfeita */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30" />

        {/* Barra superior flutuante */}
        <div className="absolute inset-x-0 top-0 z-20 mx-auto max-w-5xl px-4 pt-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            {/* Badge oficial Top Food */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white/95 backdrop-blur-md shadow-xs">
              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
              <span>Top Food • Portal Oficial</span>
            </div>

            {/* Ações da barra */}
            <div className="flex items-center gap-2">
              <PWAInstallButton variant="header" />
              {onStoreAdminClick && (
                <button
                  type="button"
                  onClick={onStoreAdminClick}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 hover:bg-black/60 px-3 py-1.5 text-xs font-bold text-white/95 backdrop-blur-md shadow-xs transition active:scale-95 cursor-pointer"
                  title="Acessar painel do lojista"
                >
                  <Store className="h-3.5 w-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Área do Lojista</span>
                  <span className="sm:hidden">Lojista</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INFORMAÇÕES DO PORTAL (Avatar TF ou Logo oficial sobreposta com o mesmo layout da vitrine) */}
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pb-5">
        <div className="relative -mt-10 sm:-mt-12 flex items-end gap-3.5 sm:gap-4">
          {/* Logo Oficial ou Ícone do Top Food (TF) */}
          <div
            id="topfood-portal-logo"
            className="relative z-10 flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white dark:border-slate-900 shadow-xl select-none bg-slate-950"
            style={{
              boxShadow: `0 8px 24px -4px ${primaryColor}40`,
            }}
          >
            {logoImg ? (
              <img
                src={logoImg}
                alt="Logo Oficial Top Food"
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  // Fallback se imagem quebrar
                  e.currentTarget.style.display = "none";
                  const fallback = document.getElementById("tf-logo-fallback");
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              id="tf-logo-fallback"
              className={`h-full w-full flex items-center justify-center text-white ${
                logoImg ? "hidden" : "flex"
              }`}
              style={{
                backgroundColor: primaryColor,
              }}
            >
              <div className="text-center font-black leading-none">
                <span className="text-2xl sm:text-3xl tracking-tighter">TF</span>
                <span className="block text-[8px] font-bold tracking-widest text-amber-200 uppercase">Delivery</span>
              </div>
            </div>
          </div>

          {/* Nome e Descrição do Portal */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                {heroTitle}
              </h1>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  borderColor: `${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                <ShieldCheck className="h-3 w-3" />
                Multi-Lojas
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {heroSubtitle}
            </p>
          </div>
        </div>

        {/* Campo de Busca Rápida de Estabelecimentos */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              id="portal-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por lanchonete, pizzaria, açaí, burger, comida..."
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:bg-white dark:focus:bg-slate-800"
              style={{
                borderColor: undefined,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Contador de Lojas */}
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
            <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
              <Sparkles className="h-3.5 w-3.5" style={{ color: primaryColor }} />
              {totalStores} {totalStores === 1 ? "loja parceira" : "lojas parceiras"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
