import { useRef, useMemo } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import type { Tenant } from "@/types";
import { StoreCard } from "./StoreCard";

interface FeaturedStoresCarouselProps {
  tenants: Tenant[];
  onSelectStore: (slug: string) => void;
}

export function FeaturedStoresCarousel({ tenants, onSelectStore }: FeaturedStoresCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Exibe apenas lojas marcadas como destaque/patrocinadas, ordenadas por prioridade decrescente
  const featuredStores = useMemo(() => {
    return (tenants || [])
      .filter((t) => Boolean(t.isFeatured) && t.status !== "inactive")
      .sort((a, b) => {
        const aPri = a.priorityOrder || 0;
        const bPri = b.priorityOrder || 0;
        if (aPri !== bPri) return bPri - aPri;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [tenants]);

  if (!featuredStores || featuredStores.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="mt-6">
      {/* Cabeçalho do Carrossel com botões de navegação */}
      <div className="flex items-center justify-between px-4 sm:px-0 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Sparkles className="h-4 w-4 fill-amber-500 text-amber-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Lojas em Destaque
              </h2>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Patrocinadas
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
              Os estabelecimentos parceiros em evidência no Top Food
            </p>
          </div>
        </div>

        {/* Setas de rolagem em desktop */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850 shadow-2xs transition cursor-pointer"
            aria-label="Rolar para a esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850 shadow-2xs transition cursor-pointer"
            aria-label="Rolar para a direita"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Container horizontal dos cards */}
      <div
        ref={containerRef}
        className="flex gap-3.5 overflow-x-auto overflow-y-hidden pb-3 px-4 sm:px-0 scrollbar-none snap-x overscroll-x-contain"
      >
        {featuredStores.map((store, index) => (
          <StoreCard
            key={store.id || store.slug}
            tenant={store}
            variant="carousel"
            rank={index + 1}
            onSelectStore={onSelectStore}
          />
        ))}
      </div>
    </section>
  );
}
