import { useRef, useEffect, useMemo } from "react";
import type { Tenant, EstablishmentCategory } from "@/types";
import { useStore } from "@/context/StoreContext";
import {
  extractDynamicCategories,
  matchStoreCategory,
  slugifyCategory,
  doesCategoryMatch,
} from "./portalUtils";
import { CategoryPillsSkeleton } from "./PortalSkeleton";

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
  const { establishmentCategories: storeCategoriesFromDb, isLoadingTenants } = useStore();

  // Extrai dinamicamente as categorias únicas reais atribuídas às lojas ativas no banco de dados (D1 / KV)
  const dynamicCategories = useMemo<EstablishmentCategory[]>(() => {
    if (customCategories && customCategories.length > 0) {
      return customCategories;
    }
    return extractDynamicCategories(tenants, storeCategoriesFromDb || []);
  }, [customCategories, tenants, storeCategoriesFromDb]);

  const allCategories = useMemo<EstablishmentCategory[]>(() => {
    return [
      { id: "todos", name: "Todos", icon: "🍽️", order: -1 },
      ...dynamicCategories.filter((c) => c.id !== "todos"),
    ];
  }, [dynamicCategories]);

  // Calcula a quantidade real de lojas em cada categoria usando a correspondência dinâmica
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: tenants.length };

    dynamicCategories.forEach((cat) => {
      counts[cat.id] = tenants.filter((tenant) => {
        const matched = matchStoreCategory(tenant, dynamicCategories);
        return (
          doesCategoryMatch(matched, cat.id, tenant.businessType) ||
          doesCategoryMatch(matched, cat.name, tenant.businessType)
        );
      }).length;
    });

    return counts;
  }, [dynamicCategories, tenants]);

  // Filtra para exibir todas as categorias que possuem pelo menos 1 loja ativa (mais a opção "Todos")
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
        {isLoadingTenants && tenants.length === 0 ? (
          <CategoryPillsSkeleton />
        ) : (
          visibleCategories.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const isActive =
              cat.id === "todos"
                ? !activeCategory || activeCategory.toLowerCase() === "todos"
                : activeCategory === cat.id ||
                  activeCategory.toLowerCase() === cat.name.toLowerCase() ||
                  slugifyCategory(activeCategory) === slugifyCategory(cat.name) ||
                  doesCategoryMatch(cat, activeCategory);

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
          })
        )}
      </div>
    </div>
  );
}
