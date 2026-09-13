import { ShoppingCart } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice } from "@/utils/order";

interface FloatingCartProps {
  onClick: () => void;
}

export function FloatingCart({ onClick }: FloatingCartProps) {
  const { cartCount, cartSubtotal, config } = useStore();

  if (cartCount === 0) return null;

  const total = cartSubtotal + config.deliveryFee;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={onClick}
          className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-white shadow-2xl transition-all active:scale-[0.98] hover:bg-primary-dark animate-slide-up"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-gray-900">
                {cartCount}
              </span>
            </div>
            <span className="font-bold">Ver carrinho</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-white/70">Total</span>
            <p className="font-bold leading-none">{formatPrice(total, config)}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
