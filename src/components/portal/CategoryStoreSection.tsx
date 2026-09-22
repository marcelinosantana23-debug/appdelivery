import { useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { Tenant, EstablishmentCategory } from "@/types";
import { StoreCard } from "./StoreCard";

interface CategoryStoreSectionProps {
  category: EstablishmentCategory;
  tenants: Tenant[];
  onSelectStore: (slug: string) => void;
  onFilterByCategory?: (categoryId: string) => void;
  isFocused?: boolean;
}

export function CategoryStoreSection({
  category,
  tenants,
  onSelectStore,
  onFilterByCategory,
  isFocused = false,
}: CategoryStoreSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!tenants || tenants.length === 0) return null;

  const sortedTenants = [...tenants].sort((a, b) => {
    const aFeat = a.isFeatured ? 1 : 0;
    const bFeat = b.isFeatured ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    const aPri = a.priorityOrder || 0;
    const bPri = b.priorityOrder || 0;
    if (aPri !== bPri) return bPri - aPri;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = direction === "left" ? -230 : 230;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section
      id={`category-section-${category.id}`}
      className={`mt-7 rounded-2xl transition-all ${
        isFocused
          ? "ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 p-3 sm:p-4"
          : ""
      }`}
    >
      {/* Cabeçalho da Categoria */}
      <div className="flex items-center justify-between px-1 sm:px-0 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-xl border border-amber-500/20">
            <span>{category.icon || "🍽️"}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
              <span>{category.name}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                {tenants.length} {tenants.length === 1 ? "loja" : "lojas"}
              </span>
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block truncate">
              Opções artesanais e especializadas em {category.name.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Controles de Navegação e Atalho */}
        <div className="flex items-center gap-2 shrink-0">
          {onFilterByCategory && (
            <button
              type="button"
              onClick={() => onFilterByCategory(category.id)}
              className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-primary/10 cursor-pointer"
            >
              <span>Ver mais</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Setas de rolagem para desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-2xs transition cursor-pointer"
              aria-label={`Rolar ${category.name} para a esquerda`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-2xs transition cursor-pointer"
              aria-label={`Rolar ${category.name} para a direita`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carrossel Horizontal de Lojas */}
      <div
        ref={containerRef}
        className="flex gap-3.5 overflow-x-auto overflow-y-hidden pb-2.5 px-1 sm:px-0 scrollbar-none snap-x overscroll-x-contain"
      >
        {sortedTenants.map((store) => (
          <StoreCard
            key={store.id || store.slug}
            tenant={store}
            variant="carousel"
            onSelectStore={onSelectStore}
          />
        ))}
      </div>
    </section>
  );
}
