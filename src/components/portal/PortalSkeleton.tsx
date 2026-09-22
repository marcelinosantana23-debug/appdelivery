import React from "react";

interface StoreCardSkeletonProps {
  variant?: "carousel" | "grid";
}

/**
 * Skeleton animado com a exata proporção e anatomia do StoreCard
 */
export function StoreCardSkeleton({ variant = "carousel" }: StoreCardSkeletonProps) {
  return (
    <div
      className={`relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs animate-pulse ${
        variant === "carousel" ? "w-[210px] sm:w-[220px]" : "w-full"
      }`}
    >
      {/* Banner da Loja */}
      <div className="relative h-28 sm:h-32 w-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-slate-800 dark:via-slate-700/60 dark:to-slate-800">
        <div className="absolute top-2 left-2 h-4 w-16 rounded-full bg-gray-300/80 dark:bg-slate-700/80" />
      </div>

      {/* Conteúdo do Card */}
      <div className="relative p-3 sm:p-3.5 space-y-2.5">
        {/* Logo sobreposta & Badge de Status */}
        <div className="-mt-8 mb-1 flex items-end justify-between">
          <div className="h-11 w-11 rounded-xl bg-gray-300 dark:bg-slate-700 border-2 border-white dark:border-slate-900 shadow-sm" />
          <div className="h-4 w-14 rounded-full bg-gray-200 dark:bg-slate-800" />
        </div>

        {/* Linhas de Título & Categoria */}
        <div className="space-y-1.5 pt-0.5">
          <div className="h-4 w-3/4 rounded bg-gray-300 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-800" />
        </div>

        {/* Rodapé: Taxa de Entrega / Avaliação */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-slate-800" />
          <div className="h-3 w-12 rounded bg-gray-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para carrosséis horizontais (Destaques e Mais Pedidos)
 */
export function PortalCarouselSkeleton({
  title,
  badge,
  icon = "⭐",
}: {
  title: string;
  badge?: string;
  icon?: string;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between px-4 sm:px-0 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 dark:bg-slate-800 text-sm">
            <span>{icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                {title}
              </h2>
              {badge && (
                <span className="rounded-full bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-extrabold text-gray-500 dark:text-gray-400">
                  {badge}
                </span>
              )}
            </div>
            <div className="h-3 w-44 bg-gray-200 dark:bg-slate-800 rounded mt-1 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-4 pt-1 px-4 sm:px-0 scrollbar-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <StoreCardSkeleton key={i} variant="carousel" />
        ))}
      </div>
    </section>
  );
}

/**
 * Skeleton para listagem de seções de categorias de lojas
 */
export function PortalStoreListSkeleton() {
  return (
    <div className="space-y-8 mt-6">
      {/* Skeleton Categoria 1 */}
      <div className="rounded-2xl border border-gray-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 animate-pulse flex items-center justify-center text-lg">
              🍔
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-gray-300 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-16 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <StoreCardSkeleton key={i} variant="carousel" />
          ))}
        </div>
      </div>

      {/* Skeleton Categoria 2 */}
      <div className="rounded-2xl border border-gray-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 animate-pulse flex items-center justify-center text-lg">
              🍕
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-gray-300 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-16 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="no-scrollbar flex gap-3.5 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <StoreCardSkeleton key={i} variant="carousel" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para pílulas da barra de categorias
 */
export function CategoryPillsSkeleton() {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex shrink-0 items-center gap-2 rounded-full bg-gray-200/80 dark:bg-slate-800/80 px-4 py-2 animate-pulse"
        >
          <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-slate-700" />
          <div
            className="h-3.5 bg-gray-300 dark:bg-slate-700 rounded"
            style={{ width: `${48 + (i % 4) * 16}px` }}
          />
          <div className="h-3 w-6 bg-gray-300/70 dark:bg-slate-700/70 rounded-full" />
        </div>
      ))}
    </div>
  );
}
