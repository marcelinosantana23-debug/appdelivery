import { useRef, useEffect, useMemo } from "react";
import type { Tenant, EstablishmentCategory } from "@/types";
import { useStore } from "@/context/StoreContext";
import { DEFAULT_ESTABLISHMENT_CATEGORIES, matchStoreCategory } from "./portalUtils";

interface EstablishmentCategoriesProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  tenants: Tenant[];
  customCategories?: EstablishmentCategory[];
}

export function EstablishmentCategories({
  activeCategory,
  onSelectCategory,
  tenants,
  customCategories,
}: EstablishmentCategoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { establishmentCategories: storeCategoriesFromDb } = useStore();

  // Consolida as categorias vindas do banco de dados D1 com fallback padrão
  const allCategories = useMemo<EstablishmentCategory[]>(() => {
    const fromDb = customCategories || storeCategoriesFromDb || [];
    const baseList: EstablishmentCategory[] = fromDb.length > 0 ? [...fromDb] : DEFAULT_ESTABLISHMENT_CATEGORIES.filter(c => c.id !== "todos");

    // Garante que "todos" esteja sempre no início
    const sorted = [...baseList].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    return [
      { id: "todos", name: "Todos", icon: "🍽️", order: -1 },
      ...sorted.filter(c => c.id !== "todos"),
    ];
  }, [customCategories, storeCategoriesFromDb]);

  // Calcula a quantidade de lojas em cada categoria usando matchStoreCategory
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: tenants.length };

    allCategories.forEach((cat) => {
      if (cat.id !== "todos") {
        counts[cat.id] = 0;
      }
    });

    tenants.forEach((tenant) => {
      const matched = matchStoreCategory(tenant, allCategories);
      if (matched && matched.id !== "todos") {
        counts[matched.id] = (counts[matched.id] || 0) + 1;
      }
    });

    return counts;
  }, [allCategories, tenants]);

  // Filtra para exibir apenas categorias que possuem pelo menos 1 loja ativa (mais a opção "Todos")
  const visibleCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      if (cat.id === "todos") return true;
      const count = categoryCounts[cat.id] ?? 0;
      return count > 0;
    });
  }, [allCategories, categoryCounts]);

  // Centraliza suavemente a categoria ativa no scroll horizontal
  useEffect(() => {
    if (activeCategory && scrollRef.current) {
      const container = scrollRef.current;
      const activeBtn = container.querySelector<HTMLElement>(`[data-category="${activeCategory}"]`);
      if (activeBtn) {
        const btnOffsetLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        const containerWidth = container.offsetWidth;
        const targetScrollLeft = btnOffsetLeft - containerWidth / 2 + btnWidth / 2;

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: "smooth",
        });
      }
    }
  }, [activeCategory]);

  return (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs border-b border-gray-100 dark:border-slate-800 transition-colors">
      <div
        ref={scrollRef}
        className="no-scrollbar mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3 scrollbar-none"
      >
        {visibleCategories.map((cat) => {
          const count = categoryCounts[cat.id] ?? 0;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              id={`portal-cat-btn-${cat.id}`}
              data-category={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              <span className="text-base">{cat.icon || "🍽️"}</span>
              <span>{cat.name}</span>
              <span
                className={`text-xs ${
                  isActive ? "text-white/85" : "text-gray-400 dark:text-gray-400"
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
