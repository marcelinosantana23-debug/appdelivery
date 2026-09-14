import { useRef, useMemo } from "react";
import type { Product } from "@/types";

interface CategoryNavProps {
  activeCategory: string;
  onCategoryClick: (id: string) => void;
  products?: Product[];
}

const categoryMeta: Record<string, { name: string; icon: string }> = {
  lanches: { name: "Lanches", icon: "🍔" },
  combos: { name: "Combos", icon: "🍟" },
  porcoes: { name: "Porções", icon: "🍗" },
  bebidas: { name: "Bebidas", icon: "🥤" },
  sobremesas: { name: "Sobremesas", icon: "🍰" },
  pizzas: { name: "Pizzas", icon: "🍕" },
  pasteis: { name: "Pastéis", icon: "🥟" },
  acai: { name: "Açaí", icon: "🍧" },
  doces: { name: "Doces", icon: "🍩" },
  salgados: { name: "Salgados", icon: "🥐" },
  pratos: { name: "Pratos", icon: "🍽️" },
  adicionais: { name: "Adicionais", icon: "🧀" },
};

export function CategoryNav({ activeCategory, onCategoryClick, products = [] }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Strictly extract unique categories from this tenant's products
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];

    const seen = new Set<string>();
    const list: { id: string; name: string; icon: string; count: number }[] = [];

    for (const p of products) {
      if (p.category && !seen.has(p.category)) {
        seen.add(p.category);
        const meta = categoryMeta[p.category] || {
          name: p.category.charAt(0).toUpperCase() + p.category.slice(1),
          icon: "🍽️",
        };
        const count = products.filter((item) => item.category === p.category).length;
        list.push({
          id: p.category,
          name: meta.name,
          icon: meta.icon,
          count,
        });
      }
    }

    return list;
  }, [products]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm border-b border-transparent dark:border-slate-800 transition-colors">
      <div
        ref={scrollRef}
        className="no-scrollbar mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-3"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-white shadow-md"
                : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            <span className="text-base">{cat.icon}</span>
            <span>{cat.name}</span>
            <span className={`text-xs ${activeCategory === cat.id ? "text-white/80" : "text-gray-400 dark:text-gray-400"}`}>
              ({cat.count})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
