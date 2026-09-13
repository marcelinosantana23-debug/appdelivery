import { Plus } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/utils/order";
import { useStore } from "@/context/StoreContext";

interface MenuListProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function MenuList({ products, onProductClick }: MenuListProps) {
  const { config } = useStore();

  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    (acc[product.category] = acc[product.category] || []).push(product);
    return acc;
  }, {});

  const categoryNames: Record<string, string> = {
    lanches: "Lanches",
    combos: "Combos",
    porcoes: "Porções",
    bebidas: "Bebidas",
    sobremesas: "Sobremesas",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
      {Object.entries(grouped).map(([catId, items]) => (
        <section key={catId} id={`cat-${catId}`} className="scroll-mt-20">
          <h2 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
            {categoryNames[catId] || catId}
            <span className="text-sm font-normal text-gray-400">({items.length})</span>
          </h2>
          <div className="space-y-3">
            {items.map((product) => (
              <button
                key={product.id}
                onClick={() => product.available && onProductClick(product)}
                disabled={!product.available}
                className={`flex w-full gap-4 rounded-2xl bg-white p-3 text-left shadow-sm transition-all ${
                  product.available
                    ? "hover:shadow-md active:scale-[0.99] cursor-pointer"
                    : "opacity-55 cursor-not-allowed"
                }`}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  {!product.available && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-xs font-bold text-white">Esgotado</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between py-0.5">
                  <div>
                    <h3 className="font-bold text-gray-800 leading-tight">{product.name}</h3>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary-dark">
                      {formatPrice(product.price, config)}
                    </span>
                    {product.available && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-90">
                        <Plus className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
