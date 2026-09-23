import { Star, Clock, Bike, ArrowRight, Sparkles } from "lucide-react";
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
  const { establishmentCategories, getStoreActiveStories, openStoreStoriesModal } = useStore();
  const allCategories = establishmentCategories && establishmentCategories.length > 0
    ? establishmentCategories
    : DEFAULT_ESTABLISHMENT_CATEGORIES;

  const stories = getStoreActiveStories(tenant.id || tenant.slug);
  const hasStories = stories.length > 0;
  const latestStory = hasStories ? stories[stories.length - 1] : null;
  const storyPreviewUrl = latestStory?.mediaUrl || (latestStory as any)?.imageUrl;

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
        className={`group relative flex w-[210px] sm:w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
          tenant.isFeatured
            ? "border-amber-400/60 dark:border-amber-500/40 shadow-amber-500/5 ring-1 ring-amber-500/20"
            : "border-gray-200/80 dark:border-slate-800"
        }`}
      >
        {/* Banner com Foto da Loja (Compacto, max-h-36 com object-fit cover) */}
        <div className="relative h-28 sm:h-32 max-h-36 w-full overflow-hidden bg-slate-900">
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

          {/* Badges no topo do Banner */}
          <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
            {tenant.isFeatured && (
              <div className="flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 px-2 py-0.5 text-[9px] font-extrabold shadow-md backdrop-blur-xs">
                <Sparkles className="h-2.5 w-2.5 fill-slate-950" />
                <span>Patrocinado</span>
              </div>
            )}
            {rank !== undefined && (
              <div
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black shadow-md backdrop-blur-xs ${
                  rank === 1
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 ring-1 ring-white/50"
                    : "bg-red-600/95 text-white"
                }`}
              >
                <span>#{rank}</span>
                {rank === 1 && <span>Líder</span>}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md ${
                isOpen ? "bg-emerald-500/90 text-white" : "bg-gray-800/85 text-gray-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-white animate-pulse" : "bg-gray-400"}`} />
              {isOpen ? "Aberto" : "Fechado"}
            </span>
          </div>

          {/* Logo da Loja sobreposta (com preview da foto do story recente se houver stories ativos) */}
          <div
            onClick={(e) => {
              if (hasStories) {
                e.stopPropagation();
                openStoreStoriesModal(tenant, stories);
              }
            }}
            className={`absolute -bottom-2 left-2.5 z-10 flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-800 text-lg shadow-md transition-transform ${
              hasStories
                ? "p-[2px] bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 ring-2 ring-emerald-400/80 cursor-pointer hover:scale-110"
                : "border-2 border-white dark:border-slate-900"
            }`}
            title={hasStories ? "Ver stories desta loja" : getSafeDisplayName(tenant.name, "Loja")}
          >
            {hasStories && storyPreviewUrl ? (
              <img
                src={storyPreviewUrl}
                alt={`Story de ${tenant.name}`}
                className="h-full w-full object-cover rounded-[8px]"
                loading="lazy"
              />
            ) : (
              <StoreLogo logo={tenant.logo} name={tenant.name} className="h-full w-full object-cover rounded-[10px]" />
            )}
          </div>
        </div>

        {/* Informações da Loja (Paddings reduzidos e layout verticalmente compacto) */}
        <div className="flex flex-1 flex-col justify-between p-2.5 pt-3">
          <div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 truncate">
                  <span>{catInfo.icon}</span>
                  <span className="truncate">{catInfo.label}</span>
                </span>
                {tenant.completedOrdersCount !== undefined && tenant.completedOrdersCount > 0 && (
                  <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                    <span>🔥 {tenant.completedOrdersCount}</span>
                  </span>
                )}
              </div>

              {/* Avaliação */}
              <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500 dark:text-amber-400 shrink-0">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
              </div>
            </div>

            <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
              {getSafeDisplayName(tenant.name, "Estabelecimento")}
            </h3>

            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
              {tenant.tagline || "Cardápio exclusivo no Top Food"}
            </p>
          </div>

          <div className="mt-2 border-t border-gray-100 dark:border-slate-800 pt-2">
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="flex items-center gap-1 truncate">
                <Bike className="h-3 w-3 text-primary shrink-0" />
                <span>{deliveryText}</span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3 text-primary shrink-0" />
                <span>{tenant.hours?.split("-")[0]?.trim() || "Hoje"}</span>
              </span>
            </div>

            {/* Botão de ação: Ver Cardápio */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectStore(tenant.slug);
              }}
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary hover:bg-primary-dark px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <span>Ver Cardápio</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
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
      className={`group relative flex flex-col sm:flex-row overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-md cursor-pointer ${
        tenant.isFeatured
          ? "border-amber-400/60 dark:border-amber-500/40 shadow-amber-500/5 ring-1 ring-amber-500/20 hover:border-amber-400"
          : "border-gray-200/80 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
      }`}
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

        {/* Patrocinado Badge no banner do grid */}
        {tenant.isFeatured && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 px-2.5 py-0.5 text-[10px] font-extrabold shadow-md backdrop-blur-xs">
            <Sparkles className="h-3 w-3 fill-slate-950" />
            <span>Patrocinado</span>
          </div>
        )}

        {/* Logo Avatar sobreposta (com preview da foto do story recente se houver stories ativos) */}
        <div
          onClick={(e) => {
            if (hasStories) {
              e.stopPropagation();
              openStoreStoriesModal(tenant, stories);
            }
          }}
          className={`absolute bottom-2.5 left-2.5 sm:bottom-auto sm:top-2.5 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-800 text-xl shadow-md transition-transform ${
            hasStories
              ? "p-[2.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 ring-2 ring-emerald-400/80 cursor-pointer hover:scale-110"
              : "border-2 border-white dark:border-slate-900"
          }`}
          title={hasStories ? "Ver stories desta loja" : getSafeDisplayName(tenant.name, "Loja")}
        >
          {hasStories && storyPreviewUrl ? (
            <img
              src={storyPreviewUrl}
              alt={`Story de ${tenant.name}`}
              className="h-full w-full object-cover rounded-[8px]"
              loading="lazy"
            />
          ) : (
            <StoreLogo logo={tenant.logo} name={tenant.name} className="h-full w-full object-cover rounded-[9px]" />
          )}
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
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                <span>{catInfo.icon}</span>
                <span>{catInfo.label}</span>
              </span>
              {tenant.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                  <span>⭐ Destaque</span>
                </span>
              )}
            </div>

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
