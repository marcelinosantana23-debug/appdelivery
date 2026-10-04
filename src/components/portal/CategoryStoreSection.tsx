import { useRef } from "react";
import { ChevronUp, ChevronDown, ArrowRight } from "lucide-react";
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
  const verticalScrollRef = useRef<HTMLDivElement>(null);

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

  const scrollVertically = (direction: "up" | "down") => {
    if (verticalScrollRef.current) {
      const scrollAmount = direction === "up" ? -240 : 240;
      verticalScrollRef.current.scrollBy({ top: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section
      id={`category-section-${category.id}`}
      className={`flex flex-col shrink-0 snap-start rounded-2xl border bg-white dark:bg-slate-900/95 p-3.5 sm:p-4 shadow-xs transition-all ${
        isFocused
          ? "w-full sm:w-[340px] md:w-[360px] ring-2 ring-primary/30 border-primary/40 bg-primary/5 dark:bg-primary/10"
          : "w-[285px] xs:w-[300px] sm:w-[320px] border-gray-200/80 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Cabeçalho Fixo do Bloco de Categoria */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-xl border border-amber-500/20">
            <span>{category.icon || "🍽️"}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight truncate">
                {category.name}
              </h3>
              <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                {sortedTenants.length} {sortedTenants.length === 1 ? "loja" : "lojas"}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {sortedTenants.length > 1
                ? "Role para cima/baixo para ver todas"
                : `Especialista em ${category.name.toLowerCase()}`}
            </p>
          </div>
        </div>

        {/* Controles Verticais e Filtro da Categoria */}
        <div className="flex items-center gap-1 shrink-0">
          {sortedTenants.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => scrollVertically("up")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                aria-label={`Rolar ${category.name} para cima`}
                title="Rolar lojas para cima"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollVertically("down")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                aria-label={`Rolar ${category.name} para baixo`}
                title="Rolar lojas para baixo"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {onFilterByCategory && !isFocused && (
            <button
              type="button"
              onClick={() => onFilterByCategory(category.id)}
              className="text-[11px] font-bold text-primary hover:text-primary-dark flex items-center gap-0.5 transition px-2 py-1 rounded-lg hover:bg-primary/10 cursor-pointer"
              title={`Focar na categoria ${category.name}`}
            >
              <span>Focar</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* EIXO VERTICAL INTERNO: Container de Rolagem Vertical Dedicada por Categoria */}
      <div
        ref={verticalScrollRef}
        className="flex flex-col gap-3 max-h-[480px] overflow-y-auto overflow-x-hidden pr-0.5 pb-1 scrollbar-none snap-y overscroll-y-contain"
      >
        {sortedTenants.map((store) => (
          <div key={store.id || store.slug} className="snap-start shrink-0 w-full">
            <StoreCard
              tenant={store}
              variant="carousel"
              fullWidth={true}
              onSelectStore={onSelectStore}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
