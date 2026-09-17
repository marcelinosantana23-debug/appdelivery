import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, Clock, Bike, Package, ChefHat, XCircle, Home, RefreshCw, ShoppingBag } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { formatPrice } from "@/utils/order";
import { useStore } from "@/context/StoreContext";
import { fetchOrderDetailsApi } from "@/services/api";
import { updateActiveOrderStatus } from "@/utils/orderStorage";

interface OrderTrackingProps {
  order: Order;
  onBack: () => void;
  onHome: () => void;
}

export function OrderTracking({ order: initialOrder, onBack, onHome }: OrderTrackingProps) {
  const { config } = useStore();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isPickup = order.orderType === "pickup" || (order as any).delivery_type === "pickup";

  const statusSteps: { status: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { status: "received", label: "Recebido", icon: Package },
    { status: "preparing", label: "Em produção", icon: ChefHat },
    {
      status: "delivering",
      label: isPickup ? "Pronto p/ retirada" : "Saiu para entrega",
      icon: isPickup ? ShoppingBag : Bike,
    },
    { status: "done", label: isPickup ? "Retirado" : "Finalizado", icon: CheckCircle2 },
  ];

  // Polling automático e sincronização em tempo real na tela de detalhes
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        setIsRefreshing(true);
        const res = await fetchOrderDetailsApi(initialOrder.id, config.slug);
        if (isMounted && res.success && res.order) {
          setOrder(res.order);
          updateActiveOrderStatus(res.order.status);
        }
      } catch (err) {
        console.warn("Polling order details error:", err);
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);

    const handleActiveOrderUpdate = (e: any) => {
      const detail = e.detail;
      if (detail?.orderId && (detail.orderId === initialOrder.id || detail.orderId === initialOrder.id.replace(/^#/, "") || `#${detail.orderId}` === initialOrder.id)) {
        if (detail.status) {
          setOrder((prev) => ({ ...prev, status: detail.status }));
        }
        if (detail.order) {
          setOrder(detail.order);
        }
      }
    };

    window.addEventListener("topfood-active-order-updated", handleActiveOrderUpdate);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("topfood-active-order-updated", handleActiveOrderUpdate);
    };
  }, [initialOrder.id, config.slug]);

  const currentIndex = statusSteps.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">Pedido {order.id}</h1>
          <p className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>Ao vivo (10s)</span>
          {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Status tracker */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {isCancelled ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Pedido cancelado</h2>
              <p className="text-sm text-gray-400">O pedido foi cancelado pela loja.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-gray-700">Acompanhe seu pedido</span>
              </div>
              <div className="relative">
                {statusSteps.map((step, i) => {
                  const isComplete = i <= currentIndex;
                  const isCurrent = i === currentIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.status} className="flex gap-4 pb-8 last:pb-0 relative">
                      {i < statusSteps.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 h-full w-0.5 ${
                            i < currentIndex ? "bg-primary" : "bg-gray-200"
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                          isComplete
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-300"
                        } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <span
                          className={`font-bold ${
                            isComplete ? "text-gray-800" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-xs text-primary font-medium animate-fade-in">
                            Status atual
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Order items */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-700">Itens do pedido</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">
                    {item.quantity}x {item.product.name}
                  </p>
                  {item.selectedOptions.length > 0 && (
                    <ul className="mt-0.5 space-y-0.5">
                      {item.selectedOptions.map((opt) => (
                        <li key={opt.id} className="text-xs text-gray-400">
                          {opt.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.notes && (
                    <p className="mt-0.5 text-xs italic text-gray-400">"{item.notes}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal, config)}</span>
            </div>
            {order.orderType === "delivery" && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxa de entrega</span>
                <span>{formatPrice(order.deliveryFee, config)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800">
              <span>Total</span>
              <span>{formatPrice(order.total, config)}</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-700">
            {order.orderType === "delivery" ? "Endereço de entrega" : "Retirada no balcão"}
          </h2>
          {order.orderType === "delivery" && order.address ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>{order.address.street}, {order.address.number}</p>
              <p>Bairro: {order.address.district}</p>
              {order.address.complement && <p>Complemento: {order.address.complement}</p>}
              {order.address.reference && <p>Referência: {order.address.reference}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {config.name} — {config.address}
            </p>
          )}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">Pagamento</p>
            <p className="text-sm font-medium text-gray-700">
              {order.paymentMethod === "pix" && "PIX"}
              {order.paymentMethod === "card" && "Cartão na entrega"}
              {order.paymentMethod === "cash" && `Dinheiro${order.changeFor ? ` (troco para ${formatPrice(parseFloat(order.changeFor), config)})` : ""}`}
            </p>
          </div>
        </div>

        <button
          onClick={onHome}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3.5 font-bold text-gray-600 transition hover:bg-gray-50"
        >
          <Home className="h-5 w-5" />
          Voltar ao cardápio
        </button>
        <div className="h-4" />
      </div>
    </div>
  );
}
