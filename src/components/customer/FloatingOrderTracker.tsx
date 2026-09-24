import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  PackageCheck,
  ChefHat,
  Bike,
  ShoppingBag,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  MapPin,
  CreditCard,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { fetchOrderDetailsApi } from "@/services/api";
import { useStore } from "@/context/StoreContext";
import { formatPrice } from "@/utils/order";
import {
  getActiveOrderData,
  updateActiveOrderStatus,
  clearActiveOrder,
  normalizeOrderStatus,
} from "@/utils/orderStorage";

interface FloatingOrderTrackerProps {
  currentTenantSlug?: string;
  hasFloatingCart?: boolean;
}

export function FloatingOrderTracker({
  currentTenantSlug,
  hasFloatingCart = false,
}: FloatingOrderTrackerProps) {
  const { config, orders } = useStore();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>("received");
  const [isPickup, setIsPickup] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCompletedCelebration, setIsCompletedCelebration] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>(() => {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Referência para controlar alterações reais de status e evitar alertas repetidos
  const statusRef = useRef<OrderStatus>(status);
  statusRef.current = status;

  // Mapeamento das 4 etapas visuais simples exigidas:
  // [ Pedido Recebido ] ➔ [ Em Preparo ] ➔ [ Saiu para Entrega ] ➔ [ Entregue ]
  const currentStepNumber = useMemo(() => {
    const s = normalizeOrderStatus(status);
    switch (s) {
      case "received":
        return 1;
      case "preparing":
        return 2;
      case "delivering":
        return 3;
      case "done":
        return 4;
      default:
        return 1;
    }
  }, [status]);

  const stepsConfig = useMemo(
    () => [
      {
        step: 1,
        key: "received",
        label: "Pedido Recebido",
        shortLabel: "Recebido",
        icon: PackageCheck,
      },
      {
        step: 2,
        key: "preparing",
        label: "Em Preparo",
        shortLabel: "Em Preparo",
        icon: ChefHat,
      },
      {
        step: 3,
        key: "delivering",
        label: isPickup ? "Pronto no Balcão" : "Saiu para Entrega",
        shortLabel: isPickup ? "Pronto" : "A Caminho",
        icon: isPickup ? ShoppingBag : Bike,
      },
      {
        step: 4,
        key: "done",
        label: isPickup ? "Retirado" : "Entregue",
        shortLabel: isPickup ? "Retirado" : "Entregue",
        icon: CheckCircle2,
      },
    ],
    [isPickup]
  );

  // Link para WhatsApp da loja
  const storeWhatsAppUrl = useMemo(() => {
    const phone = config.whatsapp ? config.whatsapp.replace(/\D/g, "") : "";
    if (!phone || !orderId) return null;
    const msg = encodeURIComponent(
      `Olá! Gostaria de acompanhar meu pedido #${orderId} na loja ${config.name}.`
    );
    return `https://wa.me/55${phone}?text=${msg}`;
  }, [config.whatsapp, config.name, orderId]);

  // Consulta o localStorage para verificar se existe um pedido ativo vinculado a esta loja
  const checkActiveOrder = useCallback(() => {
    const data = getActiveOrderData(currentTenantSlug);

    // Se não há dados, oculta totalmente (a não ser que esteja no meio da comemoração de entregue)
    if (!data || !data.orderId) {
      if (!isCompletedCelebration) {
        setOrderId(null);
        setOrder(null);
      }
      return;
    }

    const norm = normalizeOrderStatus(data.status);
    setOrderId(data.orderId);
    setStatus(norm);
    statusRef.current = norm;
    setIsPickup(data.orderType === "pickup");

    if (norm === "done") {
      setIsCompletedCelebration(true);
    }
  }, [currentTenantSlug, isCompletedCelebration]);

  // Aplica a alteração de status recebida em tempo real da cozinha/admin
  const applyStatusUpdate = useCallback(
    (rawStatus: OrderStatus | string, updatedOrder?: Order | null, _playSound = true) => {
      const normStatus = normalizeOrderStatus(rawStatus);
      const prevStatus = statusRef.current;

      if (updatedOrder) {
        setOrder(updatedOrder);
        setIsPickup(
          updatedOrder.orderType === "pickup" ||
            (updatedOrder as any).delivery_type === "pickup"
        );
      }

      // Se o status alterou de fato:
      if (normStatus !== prevStatus) {
        statusRef.current = normStatus;
        setStatus(normStatus);
        const now = new Date();
        setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

        // Atualiza o estado no localStorage (mantém a barra visível nas etapas intermediárias)
        updateActiveOrderStatus(normStatus);

        // Se o status for entregue/concluído
        if (normStatus === "done") {
          setIsCompletedCelebration(true);
          // Mantém "Entregue" visível por 5 segundos antes de remover a barra e o ID do localStorage
          setTimeout(() => {
            clearActiveOrder();
            setOrderId(null);
            setOrder(null);
            setIsCompletedCelebration(false);
          }, 5000);
        } else if (normStatus === "cancelled") {
          setTimeout(() => {
            clearActiveOrder();
            setOrderId(null);
            setOrder(null);
          }, 3500);
        }
      }
    },
    []
  );

  // Sincroniza pedido em tempo real com o array de pedidos do StoreContext caso já esteja na memória
  useEffect(() => {
    if (!orderId) return;
    const cleanId = orderId.replace(/^#/, "");
    const matchingOrder = orders.find(
      (o) => o.id === orderId || o.id === `#${cleanId}` || o.id.replace(/^#/, "") === cleanId
    );

    if (matchingOrder) {
      applyStatusUpdate(matchingOrder.status, matchingOrder);
    }
  }, [orders, orderId, applyStatusUpdate]);

  // 3. Persistência: Carga pontual inicial no Cloudflare D1 (apenas uma vez na inicialização/recarregamento)
  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;

    fetchOrderDetailsApi(orderId, currentTenantSlug)
      .then((res) => {
        if (!isMounted || !res.success || !res.order) return;
        const norm = normalizeOrderStatus(res.order.status);
        const now = new Date();
        setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        setOrder(res.order);
        setIsPickup(
          res.order.orderType === "pickup" || (res.order as any).delivery_type === "pickup"
        );

        if (norm === "done") {
          setIsCompletedCelebration(true);
          setStatus("done");
          statusRef.current = "done";
          setTimeout(() => {
            if (isMounted) {
              clearActiveOrder();
              setOrderId(null);
              setOrder(null);
              setIsCompletedCelebration(false);
            }
          }, 5000);
          return;
        }

        if (norm === "cancelled") {
          clearActiveOrder();
          setOrderId(null);
          setOrder(null);
          return;
        }

        setStatus(norm);
        statusRef.current = norm;
        updateActiveOrderStatus(norm);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [orderId, currentTenantSlug]);

  // Busca manual no banco D1 ao clicar no botão "Atualizar Status" (economiza requisições Cloudflare/D1)
  const handleRefreshStatus = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!orderId || isRefreshing) return;
      setIsRefreshing(true);
      setRefreshSuccess(false);
      const cleanId = orderId.replace(/^#/, "");

      try {
        const res = await fetchOrderDetailsApi(cleanId, currentTenantSlug);
        const now = new Date();
        setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

        if (res.success && res.order) {
          applyStatusUpdate(res.order.status, res.order);
        }
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 3000);
      } catch (err) {
        console.warn("Erro ao buscar status mais recente no D1:", err);
      } finally {
        setIsRefreshing(false);
      }
    },
    [orderId, currentTenantSlug, applyStatusUpdate, isRefreshing]
  );

  // Inicialização e listeners de eventos do localStorage e StoreContext
  useEffect(() => {
    checkActiveOrder();

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "topfood_active_order_id" ||
        e.key === "active_order_id" ||
        e.key === "topfood_active_order_data" ||
        e.key === "topfood_active_order_status"
      ) {
        checkActiveOrder();
        setIsDismissed(false);
      }
    };

    const handleOrderCleared = () => {
      setOrderId(null);
      setOrder(null);
      setIsDismissed(true);
      setIsCompletedCelebration(false);
    };

    const handleActiveOrderUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      if (detail.orderId && !orderId) {
        setOrderId(detail.orderId);
      }

      if (detail.status) {
        applyStatusUpdate(detail.status, detail.order || detail.orderData);
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
  }, [checkActiveOrder, applyStatusUpdate, orderId]);

  // Conexão de Eventos em Tempo Real (SSE Stream da Cozinha + BroadcastChannel entre abas)
  useEffect(() => {
    if (!orderId || isDismissed || isCompletedCelebration) return;

    const cleanId = orderId.replace(/^#/, "");
    let eventSource: EventSource | null = null;
    let bc: BroadcastChannel | null = null;

    // 1. Conexão SSE de eventos em tempo real
    try {
      const sseUrl = `/api/orders/${encodeURIComponent(cleanId)}/stream`;
      eventSource = new EventSource(sseUrl);

      const handleEventMessage = (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.status) {
            applyStatusUpdate(payload.status, payload.order);
          }
        } catch (err) {
          console.warn("Erro ao ler evento de status SSE:", err);
        }
      };

      eventSource.addEventListener("status_update", handleEventMessage);
      eventSource.onmessage = handleEventMessage;
    } catch (err) {
      console.warn("EventSource SSE não suportado:", err);
    }

    // 2. BroadcastChannel nativo para comunicação instantânea entre abas no mesmo dispositivo
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("topfood_order_events");
        bc.onmessage = (e) => {
          const data = e.data;
          if (
            data &&
            (data.type === "ORDER_STATUS_CHANGED" || data.type === "ACTIVE_ORDER_UPDATED")
          ) {
            const incomingId = (data.orderId || "").replace(/^#/, "");
            if ((!incomingId || incomingId === cleanId) && data.status) {
              applyStatusUpdate(data.status, data.order || data.orderData);
            }
          } else if (data && data.type === "ACTIVE_ORDER_CLEARED") {
            if (!isCompletedCelebration) {
              setOrderId(null);
              setOrder(null);
              setIsDismissed(true);
            }
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel error:", err);
      }
    }

    // 3. Sincronização ao focar ou retornar para a aba
    const handleFocusSync = () => {
      if (document.visibilityState === "visible") {
        fetchOrderDetailsApi(cleanId, currentTenantSlug)
          .then((res) => {
            if (res.success && res.order?.status) {
              applyStatusUpdate(res.order.status, res.order);
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener("focus", handleFocusSync);
    document.addEventListener("visibilitychange", handleFocusSync);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener("focus", handleFocusSync);
      document.removeEventListener("visibilitychange", handleFocusSync);
    };
  }, [orderId, isDismissed, isCompletedCelebration, applyStatusUpdate, currentTenantSlug]);

  // Informações de status contextual
  const getStatusDetails = () => {
    const norm = normalizeOrderStatus(status);
    if (norm === "received") {
      return {
        badge: "Pedido Recebido",
        title: "Pedido Recebido!",
        description: "Seu pedido foi registrado e aguarda confirmação da cozinha.",
        accentColor: "text-amber-600 dark:text-amber-400",
        badgeBg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300",
        pulseColor: "bg-amber-500",
        icon: PackageCheck,
      };
    }
    if (norm === "preparing") {
      return {
        badge: "Em Preparo",
        title: "Em Preparo!",
        description: "A cozinha já aceitou seu pedido e está preparando tudo com cuidado.",
        accentColor: "text-orange-600 dark:text-orange-400",
        badgeBg: "bg-orange-100 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/60 text-orange-800 dark:text-orange-300",
        pulseColor: "bg-orange-500",
        icon: ChefHat,
      };
    }
    if (norm === "delivering") {
      if (isPickup) {
        return {
          badge: "Pronto no Balcão",
          title: "Pronto para Retirada! 🛍️",
          description: "Seu pedido já está pronto! Você já pode retirar no balcão da loja.",
          accentColor: "text-emerald-600 dark:text-emerald-400",
          badgeBg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300",
          pulseColor: "bg-emerald-500",
          icon: ShoppingBag,
        };
      }
      return {
        badge: "Saiu para Entrega",
        title: "Saiu para Entrega! 🛵",
        description: "O entregador já está a caminho com seu pedido.",
        accentColor: "text-blue-600 dark:text-blue-400",
        badgeBg: "bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300",
        pulseColor: "bg-blue-500",
        icon: Bike,
      };
    }
    if (norm === "done") {
      return {
        badge: isPickup ? "Retirado" : "Entregue",
        title: isPickup ? "Pedido Retirado! 🎉" : "Pedido Entregue! 🎉",
        description: "Seu pedido foi entregue com sucesso. Bom apetite!",
        accentColor: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300",
        pulseColor: "bg-emerald-500",
        icon: CheckCircle2,
      };
    }
    // Cancelled
    return {
      badge: "Cancelado",
      title: "Pedido Cancelado",
      description: "Este pedido foi cancelado pelo estabelecimento.",
      accentColor: "text-red-600 dark:text-red-400",
      badgeBg: "bg-red-100 dark:bg-red-950/60 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300",
      pulseColor: "bg-red-500",
      icon: X,
    };
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  // Se não há pedido ativo ou foi dispensado, NUNCA exibe nada (tela 100% limpa)
  if (!orderId || isDismissed) {
    return null;
  }

  // Se o pedido já for cancelado e não estiver em celebração, oculta imediatamente
  if (status === "cancelled" && !order) {
    return null;
  }

  const details = getStatusDetails();
  const ActiveIcon = details.icon;

  return (
    <div
      id="floating-order-tracker"
      className={`fixed left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none transition-all duration-300 ${
        hasFloatingCart ? "bottom-24 sm:bottom-28" : "bottom-3 sm:bottom-4"
      }`}
    >
      <div className="mx-auto max-w-xl pointer-events-auto">
        <div
          className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl transition-all duration-300 ${
            status === "done"
              ? "ring-2 ring-emerald-500/50 shadow-emerald-500/10"
              : "shadow-black/15 hover:shadow-black/20"
          }`}
        >
          {/* Barra de destaque superior de progresso animado */}
          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                status === "done"
                  ? "bg-emerald-500 w-full"
                  : status === "delivering"
                  ? "bg-blue-500 w-3/4"
                  : status === "preparing"
                  ? "bg-orange-500 w-1/2"
                  : "bg-amber-500 w-1/4"
              }`}
            />
          </div>

          <div className="p-3.5 sm:p-4">
            {/* Cabeçalho do Card Flutuante */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Ícone com pulso em tempo real */}
                <div
                  className={`relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border ${details.badgeBg} shadow-sm`}
                >
                  <ActiveIcon className={`h-5 w-5 sm:h-6 sm:w-6 ${details.accentColor}`} />
                  {status !== "done" && status !== "cancelled" && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${details.pulseColor} opacity-75`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${details.pulseColor}`}
                      />
                    </span>
                  )}
                </div>

                {/* Textos de identificação e status atual */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                      Pedido #{orderId}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${details.badgeBg}`}
                    >
                      {details.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                    {details.description}
                  </p>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 flex-wrap">
                    <span>Última atualização às <strong className="text-gray-700 dark:text-gray-200 font-semibold">{lastCheckTime}</strong></span>
                    {refreshSuccess && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• Atualizado!</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Ações da direita: Botão Atualizar Status, Resumo, expandir e fechar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Botão Atualizar Status */}
                <button
                  type="button"
                  id="floating-tracker-refresh-btn"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="flex h-8 items-center gap-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-60 shrink-0"
                  title="Clique para buscar o status mais recente do pedido no banco D1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
                  <span className="hidden sm:inline">{isRefreshing ? "Atualizando..." : "Atualizar Status"}</span>
                  <span className="sm:hidden">{isRefreshing ? "..." : "Atualizar"}</span>
                </button>
                {order?.total ? (
                  <span className="hidden sm:inline-block text-xs font-bold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {formatPrice(order.total, config)}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="flex h-8 items-center gap-1 px-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  title={isExpanded ? "Ocultar resumo" : "Ver resumo"}
                >
                  <span className="hidden sm:inline">{isExpanded ? "Ocultar" : "Resumo"}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  id="dismiss-tracker-banner"
                  onClick={handleDismiss}
                  title="Minimizar acompanhamento"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* As 4 Etapas Visuais Simples:
                [ Pedido Recebido ] ➔ [ Em Preparo ] ➔ [ Saiu para Entrega ] ➔ [ Concluído ] */}
            <div className="mt-3.5 pt-2 border-t border-gray-100 dark:border-slate-800/80">
              <div className="relative flex items-center justify-between">
                {/* Linha de fundo dos conectores */}
                <div className="absolute left-4 right-4 top-4 -translate-y-1/2 h-1 bg-gray-200 dark:bg-slate-800 -z-0 rounded-full" />

                {/* Linha de progresso preenchida em tempo real */}
                <div
                  className="absolute left-4 top-4 -translate-y-1/2 h-1 bg-emerald-500 -z-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width:
                      currentStepNumber === 1
                        ? "0%"
                        : currentStepNumber === 2
                        ? "33%"
                        : currentStepNumber === 3
                        ? "66%"
                        : "calc(100% - 2rem)",
                  }}
                />

                {/* Os 4 Nós das Etapas */}
                {stepsConfig.map((s) => {
                  const isPast = s.step < currentStepNumber;
                  const isCurrent = s.step === currentStepNumber;
                  const StepIcon = s.icon;

                  let nodeStyles = "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-700";
                  let labelStyles = "text-gray-400 dark:text-gray-500 font-medium";

                  if (isPast) {
                    nodeStyles = "bg-emerald-500 text-white shadow-sm";
                    labelStyles = "text-emerald-700 dark:text-emerald-400 font-semibold";
                  } else if (isCurrent) {
                    if (s.key === "received") {
                      nodeStyles = "bg-amber-500 text-white shadow-md ring-4 ring-amber-500/20";
                      labelStyles = "text-amber-800 dark:text-amber-300 font-bold";
                    } else if (s.key === "preparing") {
                      nodeStyles = "bg-orange-500 text-white shadow-md ring-4 ring-orange-500/20";
                      labelStyles = "text-orange-800 dark:text-orange-300 font-bold";
                    } else if (s.key === "delivering") {
                      nodeStyles = "bg-blue-500 text-white shadow-md ring-4 ring-blue-500/20";
                      labelStyles = "text-blue-800 dark:text-blue-300 font-bold";
                    } else {
                      nodeStyles = "bg-emerald-500 text-white shadow-md ring-4 ring-emerald-500/20";
                      labelStyles = "text-emerald-800 dark:text-emerald-300 font-bold";
                    }
                  }

                  return (
                    <div
                      key={s.step}
                      className="relative z-10 flex flex-col items-center flex-1 text-center"
                    >
                      <div
                        className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-300 ${nodeStyles}`}
                      >
                        {isPast ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
                        ) : (
                          <StepIcon className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${isCurrent ? "scale-110" : ""}`} />
                        )}

                        {/* Efeito pulsante na etapa atual */}
                        {isCurrent && status !== "done" && status !== "cancelled" && (
                          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-current opacity-30" />
                        )}
                      </div>

                      <span className={`mt-1.5 text-[10px] sm:text-[11px] leading-tight transition-colors ${labelStyles}`}>
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="sm:hidden">{s.shortLabel}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aviso de conclusão comemorativo automático */}
            {isCompletedCelebration && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-2.5 text-xs text-emerald-800 dark:text-emerald-200 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Pedido concluído! O aviso sumirá em instantes.</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-mono">Concluído</span>
              </div>
            )}

            {/* Seção resumida expansível (Sem modais ou telas extras) */}
            {isExpanded && (
              <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs space-y-2.5 animate-slide-down">
                {/* Itens do pedido */}
                {order?.items && order.items.length > 0 ? (
                  <div className="rounded-xl bg-gray-50 dark:bg-slate-800/60 p-2.5 space-y-1.5">
                    <p className="font-bold text-gray-700 dark:text-gray-300 text-[11px] uppercase tracking-wider">
                      Itens do Pedido:
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-gray-100 dark:divide-slate-700/50">
                      {order.items.map((item, idx) => {
                        const itemTotal =
                          item.totalPrice ??
                          ((item.product.price +
                            (item.selectedOptions || []).reduce((acc, opt) => acc + opt.price, 0)) *
                            item.quantity);
                        return (
                          <div key={idx} className="flex justify-between items-start pt-1 first:pt-0">
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {item.quantity}x {item.product.name}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 font-mono">
                              {formatPrice(itemTotal, config)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Detalhes de entrega ou retirada */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 p-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {isPickup
                        ? "Retirada no Balcão da Loja"
                        : order?.address
                        ? `${order.address.street}, ${order.address.number}`
                        : "Entrega em Domicílio"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 p-2 text-gray-700 dark:text-gray-300">
                    <CreditCard className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="capitalize truncate">
                      Pagamento: {order?.paymentMethod || "Não informado"}
                    </span>
                  </div>
                </div>

                {/* Botão de contato direto pelo WhatsApp se disponível */}
                {storeWhatsAppUrl && (
                  <a
                    href={storeWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 transition text-xs shadow-sm"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Falar com a Loja no WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const FloatingOrderStatus = FloatingOrderTracker;
export const OrderTracker = FloatingOrderTracker;

