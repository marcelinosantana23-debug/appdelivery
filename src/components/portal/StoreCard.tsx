import { Star, Clock, Bike, ArrowRight } from "lucide-react";
import type { Tenant } from "@/types";
import { useStore } from "@/context/StoreContext";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName } from "@/utils/storeFormat";
import { DEFAULT_ESTABLISHMENT_CATEGORIES, matchStoreCategory } from "./portalUtils";

interface StoreCardProps {
  tenant: Tenant;
  onSelectStore: (slug: string) => void;
  variant?: "carousel" | "grid";
  rank?: number;
}

export function StoreCard({ tenant, onSelectStore, variant = "grid", rank }: StoreCardProps) {
  const { establishmentCategories } = useStore();
  const allCategories = establishmentCategories && establishmentCategories.length > 0
    ? establishmentCategories
    : DEFAULT_ESTABLISHMENT_CATEGORIES;

  const matchedCat = matchStoreCategory(tenant, allCategories);
  const catInfo = {
    label: matchedCat?.name || tenant.businessType || "Lanchonete",
    icon: matchedCat?.icon || "🍽️",
  };

  const rating = tenant.rating || 4.9;
  const ratingCount = tenant.ratingCount || 120;
  const isOpen = tenant.isOpen !== false && tenant.status !== "inactive";
  const deliveryText = tenant.deliveryFee > 0
    ? `R$ ${tenant.deliveryFee.toFixed(2).replace(".", ",")}`
    : "Grátis";

  const handleCardClick = () => {
    onSelectStore(tenant.slug);
  };

  if (variant === "carousel") {
    return (
      <div
        id={`store-card-carousel-${tenant.slug}`}
        onClick={handleCardClick}
        className="group relative flex w-[280px] sm:w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
      >
        {/* Banner com Foto da Loja */}
        <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-900">
          {tenant.bannerImage ? (
            <img
              src={tenant.bannerImage}
              alt={`Foto da loja ${tenant.name}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div
              className="h-full w-full bg-gradient-to-r from-red-600 to-amber-500"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          {/* Ranking Badge opcional (ex: #1 Mais Pedido) */}
          {rank !== undefined && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-red-600/95 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md backdrop-blur-xs">
              <span>#{rank}</span>
              <span className="hidden sm:inline">Mais Pedido</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold backdrop-blur-md ${
                isOpen ? "bg-emerald-500/90 text-white" : "bg-gray-800/85 text-gray-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-white animate-pulse" : "bg-gray-400"}`} />
              {isOpen ? "Aberto" : "Fechado"}
            </span>
          </div>

          {/* Logo da Loja sobreposta */}
          <div className="absolute -bottom-3 left-3 z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-800 text-2xl shadow-md">
            <StoreLogo logo={tenant.logo} name={tenant.name} className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Informações da Loja */}
        <div className="flex flex-1 flex-col justify-between p-3.5 pt-4">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                <span>{catInfo.icon}</span>
                <span>{catInfo.label}</span>
              </span>

              {/* Avaliação */}
              <div className="flex items-center gap-1 text-xs font-bold text-amber-500 dark:text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
                <span className="text-[10px] font-normal text-gray-400">({ratingCount})</span>
              </div>
            </div>

            <h3 className="mt-1.5 text-base font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
              {getSafeDisplayName(tenant.name, "Estabelecimento")}
            </h3>

            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {tenant.tagline || "Cardápio exclusivo no Top Food"}
            </p>
          </div>

          <div className="mt-3 border-t border-gray-100 dark:border-slate-800 pt-2.5">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span className="flex items-center gap-1">
                <Bike className="h-3.5 w-3.5 text-primary" />
                {deliveryText}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {tenant.hours?.split("-")[0]?.trim() || "Hoje"}
              </span>
            </div>

            {/* Botão de ação: Ver Cardápio */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectStore(tenant.slug);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>Ver Cardápio</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid Variant (Lista principal de lojas)
  return (
    <div
      id={`store-card-grid-${tenant.slug}`}
      onClick={handleCardClick}
      className="group relative flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 cursor-pointer"
    >
      {/* Banner / Foto */}
      <div className="relative h-36 sm:h-auto sm:w-44 shrink-0 overflow-hidden bg-slate-900">
        {tenant.bannerImage ? (
          <img
            src={tenant.bannerImage}
            alt={`Foto da loja ${tenant.name}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-red-600 to-amber-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/60 to-transparent" />

        {/* Logo Avatar sobreposta */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-auto sm:top-2.5 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-800 text-xl shadow-md">
          <StoreLogo logo={tenant.logo} name={tenant.name} className="h-full w-full object-cover" />
        </div>

        {/* Status Chip */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md ${
              isOpen ? "bg-emerald-500/90 text-white" : "bg-gray-800/85 text-gray-200"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-white animate-pulse" : "bg-gray-400"}`} />
            {isOpen ? "Aberto" : "Fechado"}
          </span>
        </div>
      </div>

      {/* Conteúdo da Loja */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              <span>{catInfo.icon}</span>
              <span>{catInfo.label}</span>
            </span>

            {/* Avaliação */}
            <div className="flex items-center gap-1 text-xs font-bold text-amber-500 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{rating.toFixed(1)}</span>
              <span className="text-[10px] font-normal text-gray-400">({ratingCount})</span>
            </div>
          </div>

          <h3 className="mt-2 text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
            {getSafeDisplayName(tenant.name, "Estabelecimento")}
          </h3>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {tenant.tagline || tenant.address || "Cardápio online disponível"}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Bike className="h-3.5 w-3.5 text-primary" />
              Entrega: <strong className="text-gray-700 dark:text-gray-200">{deliveryText}</strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {tenant.hours || "18:00 - 23:30"}
            </span>
          </div>

          {/* Botão Ver Cardápio */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectStore(tenant.slug);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span>Ver Cardápio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
