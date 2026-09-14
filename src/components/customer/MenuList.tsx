import { Plus, MessageCircle, Clock, Bike, MapPin } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/utils/order";
import { useStore } from "@/context/StoreContext";

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

  if (!products || products.length === 0) {
    const cleanWhatsapp = config.whatsapp?.replace(/\D/g, "") || "";
    const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
      `Olá! Acessei o link da ${config.name} e gostaria de informações sobre o cardápio.`
    )}`;

    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-4xl shadow-inner">
            {config.logo || "🏪"}
          </div>

          <h3 className="text-xl font-black text-gray-800 sm:text-2xl">
            {config.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {config.tagline || "Cardápio Online Exclusivo"}
          </p>

          <div className="my-6 rounded-2xl bg-gray-50 p-4 text-xs text-gray-600 space-y-2 border border-gray-100">
            <p className="font-semibold text-gray-700">
              Esta lanchonete está preparando novidades!
            </p>
            <p>
              Os itens do cardápio online estão sendo cadastrados pelo lojista. Você pode tirar dúvidas ou fazer seu pedido diretamente pelo WhatsApp:
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-gray-500">
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

  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    (acc[product.category] = acc[product.category] || []).push(product);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
      {Object.entries(grouped).map(([catId, items]) => {
        const displayName =
          defaultCategoryNames[catId] ||
          catId.charAt(0).toUpperCase() + catId.slice(1);

        return (
          <section key={catId} id={`cat-${catId}`} className="scroll-mt-20">
            <h2 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
              {displayName}
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
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
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
        );
      })}
    </div>
  );
}
