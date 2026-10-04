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
      className="flex flex-col shrink-0 snap-start w-[210px] sm:w-[220px]"
    >
      {/* Cabeçalho Compacto posicionado LOGO ACIMA do card original da loja */}
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
        className={`group/header flex items-center justify-between gap-1.5 px-2.5 py-1.5 mb-2 rounded-xl border transition-all cursor-pointer select-none shadow-2xs ${
          isFocused
            ? "bg-primary text-white border-primary ring-2 ring-primary/30"
            : "bg-white dark:bg-slate-900 border-gray-200/80 dark:border-slate-800 hover:border-primary/40"
        }`}
        title={`Clique para ver todas as lojas de ${category.name} abaixo`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0 leading-none">
            {category.icon || "🍽️"}
          </span>
          <h3
            className={`text-xs font-extrabold tracking-tight truncate transition-colors ${
              isFocused
                ? "text-white"
                : "text-gray-900 dark:text-white group-hover/header:text-primary"
            }`}
          >
            {category.name}
          </h3>
          <span
            className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
              isFocused
                ? "bg-white/20 text-white"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            {sortedTenants.length > 1
              ? `${activeIndex + 1}/${sortedTenants.length}`
              : `${sortedTenants.length}`}
          </span>
        </div>

        {/* Setinhas de rolagem vertical (ou indicador de expansão) */}
        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {sortedTenants.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => scrollVertically("up")}
                disabled={activeIndex === 0}
                className={`flex h-5 w-5 items-center justify-center rounded-md border transition cursor-pointer disabled:opacity-35 ${
                  isFocused
                    ? "border-white/30 bg-white/15 text-white hover:bg-white/25"
                    : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
                aria-label={`Loja anterior em ${category.name}`}
                title="Loja anterior (acima)"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => scrollVertically("down")}
                disabled={activeIndex >= sortedTenants.length - 1}
                className={`flex h-5 w-5 items-center justify-center rounded-md border transition cursor-pointer disabled:opacity-35 ${
                  isFocused
                    ? "border-white/30 bg-white/15 text-white hover:bg-white/25"
                    : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
                aria-label={`Próxima loja em ${category.name}`}
                title="Próxima loja (abaixo)"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSelectCategory}
              className={`flex h-5 w-5 items-center justify-center rounded-md transition cursor-pointer ${
                isFocused
                  ? "text-white hover:bg-white/20"
                  : "text-primary hover:bg-primary/10"
              }`}
              title={`Expandir todas as lojas de ${category.name} abaixo`}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* CONTAINER DE ROLAGEM VERTICAL COM ALTURA EXATAMENTE IGUAL AO CARD DE LOJA ORIGINAL */}
      <div
        ref={verticalScrollRef}
        onScroll={handleVerticalScroll}
        className={`h-[256px] sm:h-[268px] w-[210px] sm:w-[220px] overflow-y-auto overflow-x-hidden scrollbar-none snap-y snap-mandatory scroll-smooth overscroll-y-contain rounded-2xl ${
          isFocused ? "ring-2 ring-primary rounded-2xl" : ""
        }`}
      >
        {sortedTenants.map((store) => (
          <div
            key={store.id || store.slug}
            className="snap-start snap-always shrink-0 w-[210px] sm:w-[220px] h-[256px] sm:h-[268px]"
          >
            <StoreCard
              tenant={store}
              variant="carousel"
              onSelectStore={onSelectStore}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
