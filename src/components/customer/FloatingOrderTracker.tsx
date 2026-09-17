import { useState, useEffect, useCallback } from "react";
import {
  Package,
  ChefHat,
  Bike,
  ShoppingBag,
  ChevronRight,
  X,
  Clock,
  RefreshCw,
} from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { fetchOrderDetailsApi } from "@/services/api";
import {
  getActiveOrderData,
  updateActiveOrderStatus,
  clearActiveOrder,
} from "@/utils/orderStorage";

interface FloatingOrderTrackerProps {
  currentTenantSlug?: string;
  hasFloatingCart?: boolean;
  onOpenOrder: (order: Order) => void;
}

export function FloatingOrderTracker({
  currentTenantSlug,
  hasFloatingCart = false,
  onOpenOrder,
}: FloatingOrderTrackerProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>("received");
  const [isPickup, setIsPickup] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Checa se há pedido ativo válido vinculado à loja atual
  const checkActiveOrder = useCallback(() => {
    const data = getActiveOrderData(currentTenantSlug);

    // Se não há dados, ou se o status for finalizado/cancelado, oculta imediatamente
    if (!data || !data.orderId || data.status === "done" || data.status === "cancelled") {
      setOrderId(null);
      setOrder(null);
      return;
    }

    setOrderId(data.orderId);
    setStatus(data.status);
    setIsPickup(data.orderType === "pickup");
  }, [currentTenantSlug]);

  // Busca o status atualizado do pedido na API do backend
  const pollOrderStatus = useCallback(
    async (idToPoll: string) => {
      if (!idToPoll) return;
      setIsPolling(true);
      try {
        const res = await fetchOrderDetailsApi(idToPoll, currentTenantSlug);
        if (res.success && res.order) {
          // Se o pedido foi concluído ou cancelado no backend, oculta o banner imediatamente
          if (res.order.status === "done" || res.order.status === "cancelled") {
            clearActiveOrder();
            setOrderId(null);
            setOrder(null);
            return;
          }

          setOrder(res.order);
          setStatus(res.order.status);
          setIsPickup(res.order.orderType === "pickup" || (res.order as any).delivery_type === "pickup");
          updateActiveOrderStatus(res.order.status);
        } else {
          // Se a API não encontrou o pedido para este tenant, remove o pedido fantasma
          clearActiveOrder();
          setOrderId(null);
          setOrder(null);
        }
      } catch (err) {
        console.warn("Erro ao consultar status do pedido ativo:", err);
      } finally {
        setIsPolling(false);
      }
    },
    [currentTenantSlug]
  );

  // Inicialização e listeners de atualização de pedidos
  useEffect(() => {
    checkActiveOrder();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "topfood_active_order_id" || e.key === "topfood_active_order_data") {
        checkActiveOrder();
        setIsDismissed(false);
      }
    };

    const handleOrderCleared = () => {
      setOrderId(null);
      setOrder(null);
      setIsDismissed(true);
    };

    const handleActiveOrderUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      if (detail.status === "done" || detail.status === "cancelled") {
        clearActiveOrder();
        setOrderId(null);
        setOrder(null);
        return;
      }

      if (detail.orderId) {
        setOrderId(detail.orderId);
      }
      if (detail.status) {
        setStatus(detail.status);
      }
      if (detail.order) {
        setOrder(detail.order);
        setIsPickup(detail.order.orderType === "pickup" || detail.order.delivery_type === "pickup");
      }
      setIsDismissed(false);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("topfood-active-order-cleared", handleOrderCleared);
    window.addEventListener("topfood-active-order-updated", handleActiveOrderUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("topfood-active-order-cleared", handleOrderCleared);
      window.removeEventListener("topfood-active-order-updated", handleActiveOrderUpdate);
    };
  }, [checkActiveOrder]);

  // Polling automático a cada 5 segundos enquanto o pedido estiver ativo
  useEffect(() => {
    if (!orderId || isDismissed) return;

    pollOrderStatus(orderId);

    const interval = setInterval(() => {
      pollOrderStatus(orderId);
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, isDismissed, pollOrderStatus]);

  // Se não há pedido ativo ou foi encerrado/dispensado, NUNCA exibe nada (anti-fantasma)
  if (!orderId || isDismissed || status === "done" || status === "cancelled") {
    return null;
  }

  // Configuração visual dinâmica conforme Regra 3 (Entrega vs. Retirada no Balcão)
  const getDisplayConfig = () => {
    if (status === "received") {
      return {
        label: "Recebido",
        desc: "Seu pedido foi recebido e aguarda confirmação da loja ⏳",
        step: 1,
        totalSteps: 3,
        stepLabel: "Recebido",
        bgColor: "from-amber-500/10 to-amber-500/5",
        textColor: "text-amber-700 dark:text-amber-400",
        badgeBg: "bg-amber-100 dark:bg-amber-950/60",
        badgeText: "text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60",
        dotColor: "bg-amber-500",
        progressBarColor: "w-1/3 bg-amber-500",
        icon: Package,
      };
    }

    if (status === "preparing") {
      return {
        label: "Em preparo",
        desc: "Seu pedido foi aceito e está sendo preparado! 🍳",
        step: 2,
        totalSteps: 3,
        stepLabel: "Em preparo",
        bgColor: "from-orange-500/10 to-orange-500/5",
        textColor: "text-orange-700 dark:text-orange-400",
        badgeBg: "bg-orange-100 dark:bg-orange-950/60",
        badgeText: "text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60",
        dotColor: "bg-orange-500",
        progressBarColor: "w-2/3 bg-orange-500",
        icon: ChefHat,
      };
    }

    // status === "delivering"
    if (isPickup) {
      return {
        label: "Pronto p/ Retirada",
        desc: "Seu pedido está pronto para retirada no balcão! 🛍️",
        step: 3,
        totalSteps: 3,
        stepLabel: "Pronto no Balcão",
        bgColor: "from-emerald-500/10 to-emerald-500/5",
        textColor: "text-emerald-700 dark:text-emerald-400",
        badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
        badgeText: "text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60",
        dotColor: "bg-emerald-500",
        progressBarColor: "w-full bg-emerald-500",
        icon: ShoppingBag,
      };
    }

    // status === "delivering" (delivery flow)
    return {
      label: "Saiu para entrega",
      desc: "Seu pedido saiu para entrega! 🛵",
      step: 3,
      totalSteps: 3,
      stepLabel: "Em entrega",
      bgColor: "from-blue-500/10 to-blue-500/5",
      textColor: "text-blue-700 dark:text-blue-400",
      badgeBg: "bg-blue-100 dark:bg-blue-950/60",
      badgeText: "text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60",
      dotColor: "bg-blue-500",
      progressBarColor: "w-full bg-blue-500",
      icon: Bike,
    };
  };

  const config = getDisplayConfig();
  const StatusIcon = config.icon;

  const handleCardClick = () => {
    if (order) {
      onOpenOrder(order);
    } else {
      const fallbackOrder: Order = {
        id: orderId,
        items: [],
        orderType: isPickup ? "pickup" : "delivery",
        paymentMethod: "pix",
        subtotal: 0,
        deliveryFee: 0,
        total: 0,
        status: status,
        customerName: "Cliente",
        customerPhone: "",
        createdAt: Date.now(),
        statusHistory: [{ status: status, timestamp: Date.now() }],
      };
      onOpenOrder(fallbackOrder);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  return (
    <div
      id="floating-order-tracker"
      className={`fixed left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none transition-all duration-300 ${
        hasFloatingCart ? "bottom-24 sm:bottom-28" : "bottom-3 sm:bottom-4"
      }`}
    >
      <div className="mx-auto max-w-lg pointer-events-auto">
        <div
          onClick={handleCardClick}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all hover:shadow-amber-500/10 hover:border-amber-300 dark:hover:border-amber-700 active:scale-[0.99] p-3.5 sm:p-4"
        >
          {/* Fundo sutil com gradiente */}
          <div
            className={`absolute inset-0 bg-gradient-to-r ${config.bgColor} pointer-events-none transition-colors duration-500`}
          />

          <div className="relative flex items-center justify-between gap-3">
            {/* Ícone com pulso e status */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.badgeBg} ${config.textColor} shadow-sm`}
              >
                <StatusIcon className="h-6 w-6 transition-transform group-hover:scale-110" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${config.dotColor}`}
                  />
                </span>
              </div>

              {/* Textos de status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                    Pedido {orderId}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-tight ${config.badgeBg} ${config.badgeText}`}
                  >
                    {config.label}
                  </span>
                  {isPolling && (
                    <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-200 font-medium truncate">
                  {config.desc}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                  <Clock className="h-3 w-3 text-emerald-500" />
                  Ao vivo
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                  Acompanhar
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </span>
              </div>

              <button
                type="button"
                id="dismiss-tracker-banner"
                onClick={handleDismiss}
                title="Minimizar aviso"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Barra de progresso visual */}
          <div className="relative mt-3 pt-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 mb-1">
              <span>Recebido</span>
              <span>Em preparo</span>
              <span>{isPickup ? "Pronto no Balcão" : "Saiu p/ Entrega"}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${config.progressBarColor}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
