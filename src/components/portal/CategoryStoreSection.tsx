import { useRef, useState } from "react";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
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
  const [activeIndex, setActiveIndex] = useState(0);

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

  const handleVerticalScroll = () => {
    const el = verticalScrollRef.current;
    if (!el || el.clientHeight === 0) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    const clamped = Math.max(0, Math.min(sortedTenants.length - 1, idx));
    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
    }
  };

  const scrollVertically = (direction: "up" | "down") => {
    const el = verticalScrollRef.current;
    if (!el) return;
    const step = el.clientHeight;
    el.scrollBy({
      top: direction === "up" ? -step : step,
      behavior: "smooth",
    });
  };

  const handleSelectCategory = () => {
    if (onFilterByCategory) {
      onFilterByCategory(category.id);
    }
  };

  return (
    <section
      id={`category-section-${category.id}`}
      className={`flex flex-col shrink-0 snap-start rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all duration-200 ${
        isFocused
          ? "w-[285px] xs:w-[300px] sm:w-[320px] ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10 shadow-md"
          : "w-[285px] xs:w-[300px] sm:w-[320px] bg-white dark:bg-slate-900/95 border-gray-200/80 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
      }`}
    >
      {/* Cabeçalho Clicável da Categoria (Seleciona e expande a lista completa abaixo) */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelectCategory}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelectCategory();
          }
        }}
        className="group/header flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-slate-800/80 shrink-0 cursor-pointer select-none"
        title={`Clique para ver todas as lojas de ${category.name} abaixo`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl border transition-colors ${
              isFocused
                ? "bg-primary text-white border-primary"
                : "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20 group-hover/header:border-primary/40"
            }`}
          >
            <span>{category.icon || "🍽️"}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white group-hover/header:text-primary transition-colors tracking-tight truncate">
                {category.name}
              </h3>
              <span
                className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                  isFocused
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                {sortedTenants.length} {sortedTenants.length === 1 ? "loja" : "lojas"}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
              {sortedTenants.length > 1 ? (
                <span>
                  Loja {activeIndex + 1} de {sortedTenants.length} • Role ↕ ou clique
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-primary font-semibold">
                  <span>Ver lista abaixo</span>
                  <ChevronRight className="h-3 w-3" />
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Controles Verticais (1 loja por vez) */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {sortedTenants.length > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollVertically("up")}
                disabled={activeIndex === 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-35 transition cursor-pointer"
                aria-label={`Loja anterior em ${category.name}`}
                title="Loja anterior (acima)"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollVertically("down")}
                disabled={activeIndex >= sortedTenants.length - 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-35 transition cursor-pointer"
                aria-label={`Próxima loja em ${category.name}`}
                title="Próxima loja (abaixo)"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSelectCategory}
              className={`text-[11px] font-bold flex items-center gap-0.5 transition px-2 py-1 rounded-lg cursor-pointer ${
                isFocused
                  ? "bg-primary text-white"
                  : "text-primary hover:bg-primary/10"
              }`}
              title={`Expandir todas as lojas de ${category.name} abaixo`}
            >
              <span>{isFocused ? "Ativa" : "Expandir"}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* EIXO VERTICAL INTERNO COM PAGINAÇÃO MANDATÓRIA (SNAP-Y SNAP-MANDATORY - ESTRITAMENTE 1 LOJA POR VEZ) */}
      <div
        ref={verticalScrollRef}
        onScroll={handleVerticalScroll}
        className="h-[256px] sm:h-[268px] w-full overflow-y-auto overflow-x-hidden scrollbar-none snap-y snap-mandatory scroll-smooth overscroll-y-contain"
      >
        {sortedTenants.map((store) => (
          <div
            key={store.id || store.slug}
            className="snap-start snap-always shrink-0 w-full h-full"
          >
            <StoreCard
              tenant={store}
              variant="carousel"
              fullWidth={true}
              fillHeight={true}
              onSelectStore={onSelectStore}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
