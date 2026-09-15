import { useState } from "react";
import { Plus, MessageCircle, Clock, Bike, MapPin, Flame, LayoutGrid, List, Sparkles } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/utils/order";
import { useStore } from "@/context/StoreContext";
import { StoreLogo, getSafeDisplayName } from "@/components/common/StoreLogo";

interface MenuListProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const defaultCategoryNames: Record<string, string> = {
  lanches: "Lanches & Burgers",
  combos: "Combos Especiais",
  porcoes: "Porções & Aperitivos",
  bebidas: "Bebidas Geladas",
  sobremesas: "Sobremesas & Doces",
  pizzas: "Pizzas Artesanais",
  pasteis: "Pastéis Recheados",
  acai: "Açaí & Tigelas",
  doces: "Doces & Bolos",
  salgados: "Salgados Fritos & Assados",
  pratos: "Pratos Feitos & Refeições",
  adicionais: "Adicionais & Molhos",
};

export function MenuList({ products, onProductClick }: MenuListProps) {
  const { config } = useStore();
  const [viewMode, setViewMode] = useState<"list" | "grid">(config.menuLayout || "list");

  if (!products || products.length === 0) {
    const cleanWhatsapp = config.whatsapp?.replace(/\D/g, "") || "";
    const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
      `Olá! Acessei o link da ${config.name} e gostaria de informações sobre o cardápio.`
    )}`;

    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-amber-50 dark:bg-slate-800 text-4xl shadow-inner">
            <StoreLogo logo={config.logo} name={config.name} className="h-full w-full object-cover" />
          </div>

          <h3 className="text-xl font-black text-gray-800 dark:text-white sm:text-2xl">
            {getSafeDisplayName(config.name, "Burger Town")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {config.tagline || "Cardápio Online Exclusivo"}
          </p>

          <div className="my-6 rounded-2xl bg-gray-50 dark:bg-slate-800/60 p-4 text-xs text-gray-600 dark:text-gray-300 space-y-2 border border-gray-100 dark:border-slate-800">
            <p className="font-semibold text-gray-700 dark:text-gray-200">
              Esta lanchonete está preparando novidades!
            </p>
            <p>
              Os itens do cardápio online estão sendo cadastrados pelo lojista. Você pode tirar dúvidas ou fazer seu pedido diretamente pelo WhatsApp:
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {config.hours}
              </span>
              <span className="flex items-center gap-1">
                <Bike className="h-3.5 w-3.5 text-primary" />
                Taxa: {formatPrice(config.deliveryFee, config)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {config.address}
              </span>
            </div>
          </div>

          {cleanWhatsapp && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              Chamar no WhatsApp ({config.whatsapp})
            </a>
          )}
        </div>
      </div>
    );
  }

  // Highlights & Most Popular items (combos, or first available products)
  const featuredProducts = products
    .filter((p) => p.available)
    .slice(0, 6);

  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    (acc[product.category] = acc[product.category] || []).push(product);
    return acc;
  }, {});

  const showCarousel = config.showFeaturedCarousel !== false && featuredProducts.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 space-y-7">
      {/* 1. CARROSSEL DE MAIS PEDIDOS / DESTAQUES DA SEMANA */}
      {showCarousel && (
        <section className="pt-1">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                <Flame className="h-4 w-4 fill-current" />
              </div>
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                Mais Pedidos da Semana
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="h-3 w-3" />
              Destaques
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
            {featuredProducts.map((product, idx) => (
              <button
                key={`featured-${product.id}`}
                onClick={() => onProductClick(product)}
                className="group relative flex w-40 shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 text-left shadow-sm transition hover:shadow-md hover:border-primary active:scale-[0.98] snap-start"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-xs flex items-center gap-0.5">
                    <span>#{idx + 1}</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-400 line-clamp-1">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-primary-dark dark:text-primary-light">
                      {formatPrice(product.price, config)}
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm transition group-active:scale-90">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Control bar: Title & Layout Switcher (List vs Grid) */}
      <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-4 px-0.5">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
          Cardápio Completo
        </span>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-slate-800 p-1 border border-gray-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === "list"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
            }`}
            title="Exibir em Lista Detalhada"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden xs:inline text-[11px]">Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              viewMode === "grid"
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
            }`}
            title="Exibir em Grade de Cards"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden xs:inline text-[11px]">Grade</span>
          </button>
        </div>
      </div>

      {/* Product Categories */}
      {Object.entries(grouped).map(([catId, items]) => {
        const displayName =
          defaultCategoryNames[catId] ||
          catId.charAt(0).toUpperCase() + catId.slice(1);

        return (
          <section key={catId} id={`cat-${catId}`} className="scroll-mt-20">
            <h2 className="mb-3 text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {displayName}
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                ({items.length})
              </span>
            </h2>

            {/* Render items according to viewMode */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {items.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => product.available && onProductClick(product)}
                    disabled={!product.available}
                    className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 text-left shadow-sm transition-all ${
                      product.available
                        ? "hover:shadow-md hover:border-primary/50 active:scale-[0.99] cursor-pointer"
                        : "opacity-55 cursor-not-allowed"
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-slate-700">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {!product.available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-xs">
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Esgotado
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-3">
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-1">
                        <span className="font-extrabold text-xs sm:text-sm text-primary-dark dark:text-primary-light">
                          {formatPrice(product.price, config)}
                        </span>
                        {product.available && (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition-transform group-active:scale-90 shadow-xs">
                            <Plus className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => product.available && onProductClick(product)}
                    disabled={!product.available}
                    className={`flex w-full gap-3.5 sm:gap-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-3 text-left shadow-sm transition-all ${
                      product.available
                        ? "hover:shadow-md hover:border-primary/50 active:scale-[0.99] cursor-pointer"
                        : "opacity-55 cursor-not-allowed"
                    }`}
                  >
                    <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-700">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                      {!product.available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-xs">
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Esgotado
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between py-0.5 min-w-0">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="font-extrabold text-sm text-primary-dark dark:text-primary-light">
                          {formatPrice(product.price, config)}
                        </span>
                        {product.available && (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-90 shadow-xs">
                            <Plus className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
