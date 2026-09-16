import { useState } from "react";
import { Clock, MapPin, Store, ChevronDown, Check, Shield, AlertTriangle, Bike, Sparkles } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { StoreLogo, getSafeDisplayName, getSafeSlug } from "@/components/common/StoreLogo";

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

  const hasBanner = Boolean(config.bannerImage);

  return (
    <header className="relative w-full bg-white dark:bg-slate-900 shadow-sm border-b border-gray-100 dark:border-slate-800 transition-colors">
      {/* Inactive store notification banner */}
      {!isStoreActive && (
        <div className="relative z-30 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Esta lanchonete está temporariamente desativada pela plataforma. Pedidos suspensos.</span>
        </div>
      )}

      {/* 1. FOTO DA LANCHONETE / BANNER DA VITRINE (Capa estilo iFood/Delivery) */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-900 sm:h-56 md:h-64">
        {hasBanner ? (
          <img
            src={config.bannerImage}
            alt={`Banner de ${config.name}`}
            className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full bg-primary-dark"
            style={{
              background: `linear-gradient(135deg, var(--color-primary-dark, #C1121F) 0%, var(--color-primary, #E63946) 50%, var(--color-primary-light, #F77F00) 100%)`,
            }}
          />
        )}

        {/* Gradiente escuro para legibilidade perfeita dos controles e textos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/30" />

        {/* Top Floating Toolbar */}
        <div className="absolute inset-x-0 top-0 z-20 mx-auto max-w-2xl px-4 pt-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            {/* Multi-tenant selector - ONLY visible if user is logged in as Super Admin */}
            {isSuperAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                  className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur-md transition hover:bg-slate-900 active:scale-95 shadow-lg"
                  title="Alternar vitrine (Exclusivo Super Admin)"
                >
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span className="max-w-[130px] truncate sm:max-w-[190px]">{config.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-amber-400 opacity-80" />
                </button>

                {storeMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-900/95 p-2 text-slate-100 shadow-2xl backdrop-blur-md animate-scale-in">
                    <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Trocar Lanchonete (Super Admin)
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
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800 border border-white/10 text-base">
                                <StoreLogo logo={t.logo} name={t.name} className="h-full w-full object-cover" fallbackEmoji="🍔" />
                              </div>
                              <div>
                                <span className="block font-medium leading-tight">{getSafeDisplayName(t.name, "Lanchonete")}</span>
                                <span className="text-[10px] text-slate-400">/loja/{getSafeSlug(t.slug, "loja")}</span>
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
            ) : (
              // For regular customers: clean, non-clickable store badge (NO switcher, NO competitors)
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md shadow">
                <Store className="h-3.5 w-3.5 text-amber-300" />
                <span className="max-w-[160px] truncate sm:max-w-[220px]">{config.name}</span>
              </div>
            )}

            {/* Admin Buttons - strictly isolated by role */}
            <div className="flex items-center gap-1.5">
              {/* If merchant is logged in, show their Store Admin Panel button */}
              {currentUser?.role === "tenant_admin" && (
                <button
                  onClick={handleStoreAdmin}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/70 active:scale-95 shadow-lg"
                  title="Acesso ao Painel da Lanchonete"
                >
                  <Store className="h-3.5 w-3.5 text-amber-300" />
                  <span>Painel da Loja</span>
                </button>
              )}

              {/* Super Admin button - ONLY visible if authenticated as Super Admin */}
              {isSuperAdmin && (
                <button
                  onClick={handleSuperAdmin}
                  className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur-md transition hover:bg-amber-500/40 active:scale-95 shadow-lg"
                  title="Painel Geral do Super Admin"
                >
                  <Shield className="h-3.5 w-3.5 text-amber-300" />
                  <span className="hidden xs:inline sm:inline">Super Admin</span>
                  <span className="xs:hidden sm:hidden">Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INFORMAÇÕES DA LANCHONETE (Perfil iFood com avatar sobreposto) */}
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pb-4">
        <div className="relative -mt-10 sm:-mt-12 flex items-end gap-3.5 sm:gap-4">
          {/* Logo / Foto de Perfil da Loja */}
          <div className="relative z-10 flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800 text-4xl sm:text-5xl shadow-xl">
            <StoreLogo logo={config.logo} name={config.name} className="h-full w-full object-cover object-center" fallbackEmoji="🏪" />
          </div>

          {/* Nome e Tagline da Loja */}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate">
              {getSafeDisplayName(config.name, "Burger Town")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {config.tagline && !config.tagline.startsWith("data:") ? config.tagline : ""}
            </p>
          </div>
        </div>

        {/* Aviso da Loja / Promoção do Dia */}
        {config.announcement && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
            <span className="flex-1 leading-snug">{config.announcement}</span>
          </div>
        )}

        {/* Badges de Status, Horário, Taxa de Entrega e Endereço */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Status Aberto/Fechado */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
              isStoreOpen && isStoreActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isStoreOpen && isStoreActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            {!isStoreActive ? "Loja Desativada" : isStoreOpen ? "Aberto agora" : "Fechado no momento"}
          </span>

          {/* Horário de Funcionamento */}
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 px-2.5 py-1 text-gray-600 dark:text-gray-300">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>{config.hours}</span>
          </span>

          {/* Taxa de Entrega */}
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 px-2.5 py-1 text-gray-600 dark:text-gray-300">
            <Bike className="h-3.5 w-3.5 text-primary" />
            <span>
              Entrega:{" "}
              {config.deliveryFee > 0
                ? `${config.currency} ${config.deliveryFee.toFixed(2).replace(".", ",")}`
                : "Grátis"}
            </span>
          </span>
        </div>

        {/* Endereço */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{config.address}</span>
        </div>
      </div>
    </header>
  );
}
