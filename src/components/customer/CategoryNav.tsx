import { useRef } from "react";
import { categories } from "@/data/mockData";

interface CategoryNavProps {
  activeCategory: string;
  onCategoryClick: (id: string) => void;
}

export function CategoryNav({ activeCategory, onCategoryClick }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm">
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
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className="text-base">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
