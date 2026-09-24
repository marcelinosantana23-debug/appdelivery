import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Clock, Bike, Package, ChefHat, XCircle, Home, ShoppingBag, RefreshCw } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { formatPrice } from "@/utils/order";
import { useStore } from "@/context/StoreContext";
import { fetchOrderDetailsApi } from "@/services/api";
import { updateActiveOrderStatus } from "@/utils/orderStorage";
import { normalizeProductImage, handleImageError } from "@/utils/imageUtils";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";
import { playOrderStatusUpdateChime } from "@/utils/audio";

interface OrderTrackingProps {
  order: Order;
  onBack: () => void;
  onHome: () => void;
}

const STATUS_RANKS: Record<OrderStatus, number> = {
  received: 0,
  preparing: 1,
  delivering: 2,
  done: 3,
  cancelled: -1,
};

export function OrderTracking({ order: initialOrder, onBack, onHome }: OrderTrackingProps) {
  const { config } = useStore();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState<boolean>(() => {
    return !initialOrder?.items || initialOrder.items.length === 0;
  });
  const [lastCheckTime, setLastCheckTime] = useState<string>(() => {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Referência para o status atual e rastreio de transição para disparo sonoro
  const prevStatusRef = useRef<OrderStatus>(initialOrder?.status || "received");
  const isInitialLoadRef = useRef<boolean>(true);
  const statusRef = useRef<OrderStatus>(initialOrder?.status || "received");
  statusRef.current = order?.status || "received";

  const isPickup = order?.orderType === "pickup" || (order as any)?.delivery_type === "pickup";

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

  // Aplica atualização de status em tempo real por eventos (sem loops de polling)
  const applyStatus = useCallback((newStatus: OrderStatus, updatedOrder?: Order | null) => {
    const prevStatus = prevStatusRef.current;
    if (updatedOrder) {
      setOrder(updatedOrder);
    } else {
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }

    const currentRank = STATUS_RANKS[prevStatus] ?? -1;
    const newRank = STATUS_RANKS[newStatus] ?? -1;

    // Dispara efeito sonoro suave quando o status avança e NÃO é o carregamento inicial
    if (newRank > currentRank && !isInitialLoadRef.current) {
      playOrderStatusUpdateChime(newStatus);
    }

    if (newStatus !== prevStatus) {
      prevStatusRef.current = newStatus;
      statusRef.current = newStatus;
      updateActiveOrderStatus(newStatus);
    }
  }, []);

  // Busca manual sob demanda no banco D1 ao clicar no botão "Atualizar Status"
  const handleRefreshStatus = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshSuccess(false);
    const cleanId = (initialOrder?.id || order?.id || "").replace(/^#/, "");

    try {
      const res = await fetchOrderDetailsApi(cleanId, config.slug);
      const now = new Date();
      setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

      if (res.success && res.order) {
        applyStatus(res.order.status, res.order);
      }
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (err) {
      console.warn("Erro ao buscar status mais recente no D1:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [initialOrder?.id, order?.id, config.slug, applyStatus, isRefreshing]);

  // Sincronização inicial pontual + eventos sob demanda (SEM intervalos periódicos de polling automático)
  useEffect(() => {
    let isMounted = true;
    const cleanId = (initialOrder?.id || "").replace(/^#/, "");

    // Carga inicial pontual única ao abrir a tela
    const loadInitialStatus = async () => {
      try {
        const res = await fetchOrderDetailsApi(cleanId, config.slug);
        if (isMounted && res.success && res.order) {
          applyStatus(res.order.status, res.order);
          const now = new Date();
          setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        }
      } catch (err) {
        console.warn("Aviso na carga inicial de status:", err);
      } finally {
        if (isMounted) {
          setIsLoadingOrderDetails(false);
          // Libera para tocar áudio apenas em transições subsequentes
          setTimeout(() => {
            if (isMounted) {
              isInitialLoadRef.current = false;
            }
          }, 400);
        }
      }
    };

    loadInitialStatus();

    // Conexão Server-Sent Events (SSE) para entrega instantânea baseada em eventos
    let eventSource: EventSource | null = null;
    try {
      const sseUrl = `/api/orders/${encodeURIComponent(cleanId)}/stream`;
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("status_update", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.status) {
            applyStatus(payload.status, payload.order);
            const now = new Date();
            setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
          }
        } catch (err) {
          console.warn("Erro ao ler evento SSE em OrderTracking:", err);
        }
      });

      eventSource.onerror = () => {
        // SSE error handled silently
      };
    } catch (err) {
      console.warn("EventSource SSE não disponível:", err);
    }

    // Sincronização local entre abas abertas no mesmo navegador
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("topfood_order_events");
        bc.onmessage = (e) => {
          const data = e.data;
          if (data && (data.type === "ORDER_STATUS_CHANGED" || data.type === "ACTIVE_ORDER_UPDATED")) {
            const incomingId = (data.orderId || "").replace(/^#/, "");
            if (incomingId === cleanId && data.status) {
              applyStatus(data.status, data.order || data.orderData);
              const now = new Date();
              setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
            }
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel error:", err);
      }
    }

    const handleActiveOrderUpdate = (e: any) => {
      const detail = e.detail;
      if (
        detail?.orderId &&
        (detail.orderId === initialOrder?.id ||
          detail.orderId.replace(/^#/, "") === cleanId ||
          `#${detail.orderId}` === initialOrder?.id)
      ) {
        if (detail.status) {
          applyStatus(detail.status, detail.order || detail.orderData);
          const now = new Date();
          setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        }
      }
    };

    window.addEventListener("topfood-active-order-updated", handleActiveOrderUpdate);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener("topfood-active-order-updated", handleActiveOrderUpdate);
    };
  }, [initialOrder?.id, config.slug, applyStatus]);

  const currentIndex = statusSteps.findIndex((s) => s.status === order?.status);
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate">
              Pedido {order?.id || initialOrder?.id}
            </h1>
            <p className="text-xs text-gray-400 truncate">
              {order?.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlobalReloadButton variant="light" />

          {/* Botão Atualizar Status no Topo */}
          <button
            id="btn-refresh-order-status-header"
            type="button"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 px-3 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-60 cursor-pointer shrink-0"
            title="Clique para buscar o status mais recente do pedido no banco D1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
            <span>{isRefreshing ? "Atualizando..." : "Atualizar Status"}</span>
          </button>
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

              <div className="mt-2 flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-2 text-xs font-bold text-gray-700 transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
                  <span>{isRefreshing ? "Atualizando..." : "Atualizar Status"}</span>
                </button>
                <span className="text-[11px] text-gray-500 font-medium">
                  Última atualização às <strong>{lastCheckTime}</strong>
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Cabeçalho do Card de Status com Botão de Atualizar e Horário da Última Checagem */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Acompanhe seu pedido</h2>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 flex-wrap">
                      <span>Última atualização às <strong className="text-gray-700 font-semibold">{lastCheckTime}</strong></span>
                      {refreshSuccess && (
                        <span className="text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                          • Atualizado agora!
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  id="btn-refresh-order-status"
                  type="button"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs disabled:opacity-70 cursor-pointer shrink-0"
                  title="Buscar status mais recente do pedido no banco D1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>{isRefreshing ? "Atualizando..." : "Atualizar Status"}</span>
                </button>
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

          {isLoadingOrderDetails && (!order?.items || order.items.length === 0) ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-gray-400">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
              <span className="text-xs font-medium">Carregando itens do pedido...</span>
            </div>
          ) : !Array.isArray(order?.items) || order.items.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl">
              Nenhum item listado neste pedido
            </div>
          ) : (
            <div className="space-y-3">
              {(order?.items || []).map((item, idx) => {
                const productName = item?.product?.name || (item as any)?.name || "Item do pedido";
                const productImage = item?.product?.image || (item as any)?.image;
                const productCategory = item?.product?.category || (item as any)?.category || "lanches";
                const selectedOptions = Array.isArray(item?.selectedOptions) ? item.selectedOptions : [];

                return (
                  <div key={item?.id || idx} className="flex gap-3">
                    <img
                      src={normalizeProductImage(productImage, productCategory, productName)}
                      alt={productName}
                      onError={(e) => handleImageError(e, productCategory, productName)}
                      className="h-14 w-14 rounded-lg object-cover bg-gray-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {item?.quantity || 1}x {productName}
                      </p>
                      {selectedOptions.length > 0 && (
                        <ul className="mt-0.5 space-y-0.5">
                          {selectedOptions.map((opt, optIdx) => (
                            <li key={opt?.id || optIdx} className="text-xs text-gray-400 truncate">
                              {opt?.name || String(opt)}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item?.notes && (
                        <p className="mt-0.5 text-xs italic text-gray-400 break-words">"{item.notes}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(order?.subtotal ?? 0, config)}</span>
            </div>
            {(order?.orderType === "delivery" || (order as any)?.delivery_type === "delivery") && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxa de entrega</span>
                <span>{formatPrice(order?.deliveryFee ?? 0, config)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800">
              <span>Total</span>
              <span>{formatPrice(order?.total ?? 0, config)}</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-700">
            {(order?.orderType === "delivery" || (order as any)?.delivery_type === "delivery") ? "Endereço de entrega" : "Retirada no balcão"}
          </h2>
          {(order?.orderType === "delivery" || (order as any)?.delivery_type === "delivery") && order?.address ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>{order.address.street}, {order.address.number}</p>
              <p>Bairro: {order.address.district}</p>
              {order.address.complement && <p>Complemento: {order.address.complement}</p>}
              {order.address.reference && <p>Referência: {order.address.reference}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {config?.name || "Loja"} — {config?.address || "Retirada no balcão"}
            </p>
          )}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">Pagamento</p>
            <p className="text-sm font-medium text-gray-700">
              {order?.paymentMethod === "pix" && "PIX"}
              {order?.paymentMethod === "card" && "Cartão na entrega"}
              {order?.paymentMethod === "cash" && `Dinheiro${order?.changeFor ? ` (troco para ${formatPrice(parseFloat(order.changeFor), config)})` : ""}`}
              {!["pix", "card", "cash"].includes(order?.paymentMethod || "") && (order?.paymentMethod || "Não informado")}
            </p>
          </div>
        </div>

        <button
          onClick={onHome}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3.5 font-bold text-gray-600 transition hover:bg-gray-50 cursor-pointer"
        >
          <Home className="h-5 w-5" />
          Voltar ao cardápio
        </button>
        <div className="h-4" />
      </div>
    </div>
  );
}
