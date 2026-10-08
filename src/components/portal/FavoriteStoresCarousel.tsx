import { useRef, useMemo } from "react";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import type { Tenant } from "@/types";
import { useStore } from "@/context/StoreContext";
import { StoreCard } from "./StoreCard";

interface FavoriteStoresCarouselProps {
  tenants: Tenant[];
  onSelectStore: (slug: string) => void;
}

export function FavoriteStoresCarousel({
  tenants,
  onSelectStore,
}: FavoriteStoresCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { favoriteStoreIds, isFavoriteStore } = useStore();

  const favoriteStores = useMemo(() => {
    if (!favoriteStoreIds || favoriteStoreIds.length === 0) return [];
    const matched = (tenants || []).filter(
      (t) => t.status !== "inactive" && isFavoriteStore(t)
    );
    // Preserve order in which user favorited stores
    return matched.sort((a, b) => {
      const idxA = favoriteStoreIds.findIndex(
        (k) => k === a.slug || k === a.id
      );
      const idxB = favoriteStoreIds.findIndex(
        (k) => k === b.slug || k === b.id
      );
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [tenants, favoriteStoreIds, isFavoriteStore]);

  if (favoriteStores.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = direction === "left" ? -230 : 230;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section id="favorite-stores-carousel" className="mb-6">
      <div className="flex items-center justify-between px-4 sm:px-0 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Favoritos
              </h2>
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 border border-rose-500/25 flex items-center gap-1">
                <span>
                  {favoriteStores.length}{" "}
                  {favoriteStores.length === 1 ? "loja salva" : "lojas salvas"}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
              Suas lojas preferidas salvas para acesso rápido
            </p>
          </div>
        </div>

        {favoriteStores.length > 1 && (
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850 shadow-2xs transition cursor-pointer"
              aria-label="Rolar favoritos para a esquerda"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850 shadow-2xs transition cursor-pointer"
              aria-label="Rolar favoritos para a direita"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex gap-3.5 overflow-x-auto overflow-y-hidden pb-3 px-4 sm:px-0 scrollbar-none snap-x overscroll-x-contain"
      >
        {favoriteStores.map((store) => (
          <StoreCard
            key={`favorite-${store.id || store.slug}`}
            tenant={store}
            variant="carousel"
            onSelectStore={onSelectStore}
          />
        ))}
      </div>
    </section>
  );
}
