import { useRef } from "react";
import { Flame, ChevronLeft, ChevronRight, ShoppingBag, ArrowRight, Store } from "lucide-react";
import type { TopSellingProduct } from "@/types";
import { useStore } from "@/context/StoreContext";

interface TopSellingProductsCarouselProps {
  products?: TopSellingProduct[];
  onSelectStore: (slug: string) => void;
}

export function TopSellingProductsCarousel({
  products: propProducts,
  onSelectStore,
}: TopSellingProductsCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { topSellingProducts: contextProducts } = useStore();

  const products = propProducts && propProducts.length > 0 ? propProducts : contextProducts;

  if (!products || products.length === 0) {
    return null;
  }

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = direction === "left" ? -230 : 230;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const formatPrice = (price: number) => {
    return Number(price).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <section id="top-selling-products-carousel" className="mt-8">
      {/* Cabeçalho do Carrossel 2 */}
      <div className="flex items-center justify-between px-4 sm:px-0 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
            <Flame className="h-4 w-4 fill-red-500 text-red-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Mais Pedidos
              </h2>
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
                <span>🔥</span>
                <span>Ranking Geral</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
              Os lanches individuais mais vendidos em todas as lojas do aplicativo
            </p>
          </div>
        </div>

        {/* Setas de rolagem em desktop */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850 shadow-2xs transition cursor-pointer"
            aria-label="Rolar lanches para a esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850 shadow-2xs transition cursor-pointer"
            aria-label="Rolar lanches para a direita"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Container horizontal dos cards de lanches */}
      <div
        ref={containerRef}
        className="flex gap-3.5 overflow-x-auto overflow-y-hidden pb-3 px-4 sm:px-0 scrollbar-none snap-x overscroll-x-contain"
      >
        {products.map((item, index) => {
          const rank = item.rank || index + 1;
          const isLeader = rank === 1;

          const uniqueKey = item.id ? `${item.id}-${index}` : `top-product-${item.tenantId}-${item.productId}-${index}`;

          return (
            <div
              key={uniqueKey}
              id={`top-product-card-${item.tenantId}-${item.productId}-${index}`}
              onClick={() => onSelectStore(item.tenantSlug || item.tenantId)}
              className={`group relative flex w-[210px] sm:w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                isLeader
                  ? "border-amber-400/80 dark:border-amber-500/70 shadow-amber-500/10 ring-1 ring-amber-400/40"
                  : "border-gray-200/80 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
              }`}
            >
              {/* Foto do Lanche (max-h-36, object-cover compacto) */}
              <div className="relative h-28 sm:h-32 max-h-36 w-full overflow-hidden bg-slate-950">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-amber-600/40 to-red-600/40 text-3xl">
                    🍔
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Badge do Ranking */}
                <div className="absolute top-2 left-2 z-10">
                  <div
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black shadow-md backdrop-blur-md ${
                      isLeader
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 ring-1 ring-white/50"
                        : rank === 2
                        ? "bg-slate-200 text-slate-900 ring-1 ring-slate-400/50"
                        : rank === 3
                        ? "bg-amber-700 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    <span>#{rank}</span>
                    <span>Mais Pedido</span>
                  </div>
                </div>

                {/* Volume de Pedidos */}
                {item.totalSold > 0 && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-md border border-white/10">
                      <span>🔥 {item.totalSold}</span>
                    </span>
                  </div>
                )}

                {/* Loja que vende o lanche (sobreposta no rodapé da imagem) */}
                <div className="absolute bottom-1.5 left-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-md border border-white/15">
                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-white/20 text-[9px]">
                    <Store className="h-2 w-2 text-amber-300" />
                  </div>
                  <span className="text-[10px] font-bold text-white truncate">
                    {item.tenantName}
                  </span>
                </div>
              </div>

              {/* Informações do Lanche (Layout compacto verticalmente) */}
              <div className="flex flex-1 flex-col justify-between p-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>

                  {item.description ? (
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 leading-tight">
                      {item.description}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 italic line-clamp-1">
                      Disponível para pedido
                    </p>
                  )}
                </div>

                <div className="mt-2 border-t border-gray-100 dark:border-slate-800 pt-2 flex items-center justify-between gap-1.5">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500">
                      Preço
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {formatPrice(item.price)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStore(item.tenantSlug || item.tenantId);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-primary hover:bg-primary-dark px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag className="h-3 w-3" />
                    <span>Pedir</span>
                    <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
