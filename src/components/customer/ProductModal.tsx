import { useState } from "react";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import type { Product, ProductOption } from "@/types";
import { formatPrice } from "@/utils/order";
import { useStore } from "@/context/StoreContext";
import { normalizeProductImage, handleImageError } from "@/utils/imageUtils";

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAdded: () => void;
}

export function ProductModal({ product, onClose, onAdded }: ProductModalProps) {
  const { addToCart, config } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [notes, setNotes] = useState("");

  const optionsTotal = selectedOptions.reduce((sum, o) => sum + o.price, 0);
  const unitPrice = product.price + optionsTotal;
  const totalPrice = unitPrice * quantity;

  const toggleOption = (option: ProductOption) => {
    setSelectedOptions((prev) => {
      const exists = prev.find((o) => o.id === option.id);
      if (exists) return prev.filter((o) => o.id !== option.id);
      return [...prev, option];
    });
  };

  const handleAdd = () => {
    addToCart(product, quantity, selectedOptions, notes.trim());
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        <div className="relative bg-gray-100">
          <img
            src={normalizeProductImage(product.image, product.category, product.name)}
            alt={product.name}
            onError={(e) => handleImageError(e, product.category, product.name)}
            className="h-56 w-full object-cover rounded-t-3xl"
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{product.description}</p>
          <p className="mt-2 text-lg font-bold text-primary-dark">{formatPrice(product.price, config)}</p>

          {product.options.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-bold text-gray-700">Adicionais e opcionais</h3>
              <div className="space-y-2">
                {product.options.map((option) => {
                  const checked = !!selectedOptions.find((o) => o.id === option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleOption(option)}
                      className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${
                            checked ? "border-primary bg-primary" : "border-gray-300"
                          }`}
                        >
                          {checked && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{option.name}</span>
                      </span>
                      {option.price > 0 && (
                        <span className="text-sm font-semibold text-primary-dark">
                          + {formatPrice(option.price, config)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold text-gray-700">Observações</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, etc."
              className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-primary"
              rows={2}
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border-2 border-gray-200 px-2 py-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-gray-200"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-bold text-gray-800">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-primary-dark"
            >
              <ShoppingBag className="h-5 w-5" />
              <span>Adicionar</span>
              <span className="ml-1">{formatPrice(totalPrice, config)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
