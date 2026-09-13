import { Minus, Plus, Trash2, X, ShoppingBag, ArrowRight } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice } from "@/utils/order";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { cart, updateCartQuantity, removeFromCart, cartSubtotal, clearCart, config } = useStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-800">Seu carrinho</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
            <ShoppingBag className="h-16 w-16" strokeWidth={1} />
            <p className="font-medium">Seu carrinho está vazio</p>
            <p className="text-sm">Adicione itens do cardápio para continuar</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map((item) => {
                const optionsTotal = item.selectedOptions.reduce((s, o) => s + o.price, 0);
                const unitPrice = item.product.price + optionsTotal;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-2xl border border-gray-100 p-3"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm font-bold text-gray-800">{item.product.name}</h3>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-300 transition hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.selectedOptions.length > 0 && (
                        <ul className="mt-0.5 space-y-0.5">
                          {item.selectedOptions.map((opt) => (
                            <li key={opt.id} className="text-xs text-gray-400">
                              {opt.name}
                              {opt.price > 0 && ` (+${formatPrice(opt.price, config)})`}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.notes && (
                        <p className="mt-0.5 text-xs italic text-gray-400">"{item.notes}"</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-gray-800">
                          {formatPrice(unitPrice * item.quantity, config)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={clearCart}
                className="w-full py-2 text-center text-xs font-medium text-gray-400 transition hover:text-red-500"
              >
                Limpar carrinho
              </button>
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <div className="mb-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartSubtotal, config)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Taxa de entrega</span>
                  <span>{formatPrice(config.deliveryFee, config)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Total</span>
                  <span>{formatPrice(cartSubtotal + config.deliveryFee, config)}</span>
                </div>
              </div>
              <button
                onClick={onCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-primary-dark"
              >
                Continuar para entrega
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
