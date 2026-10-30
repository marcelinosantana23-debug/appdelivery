import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Clock, Bike, Package, ChefHat, XCircle, Home, ShoppingBag, RefreshCw, UtensilsCrossed } from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { formatPrice, formatTableDisplay, formatTableNumberOnly } from "@/utils/order";
import { useStore } from "@/context/StoreContext";
import { fetchOrderDetailsApi } from "@/services/api";
import { updateActiveOrderStatus, toStandardStatus, toLegacyStatus, getStatusStepIndex } from "@/utils/orderStorage";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";
import { playOrderStatusUpdateChime, unlockAudioContext } from "@/utils/audio";

interface OrderTrackingProps {
  order: Order;
  onBack: () => void;
  onHome: () => void;
}

export function OrderTracking({ order: initialOrder, onBack, onHome }: OrderTrackingProps) {
  const { config } = useStore();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [lastCheckTime, setLastCheckTime] = useState<string>(() => {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  // Referência para o status atual e rastreio de transição para disparo sonoro
  const prevStatusRef = useRef<string>(toStandardStatus(initialOrder?.status));
  const isInitialLoadRef = useRef<boolean>(true);
  const statusRef = useRef<string>(toStandardStatus(initialOrder?.status));
  statusRef.current = toStandardStatus(order?.status);

  const isDineIn =
    order?.orderType === "dine_in" ||
    (order as any)?.delivery_type === "dine_in" ||
    (order as any)?.orderType === "mesa" ||
    (order as any)?.tipo_pedido === "mesa" ||
    Boolean((order as any)?.tableNumber || (order as any)?.table_number || (order as any)?.mesa);

  const isPickup =
    order?.orderType === "pickup" ||
    order?.orderType === "takeaway" ||
    (order as any)?.delivery_type === "pickup" ||
    (order as any)?.orderType === "retirada" ||
    (order as any)?.tipo_pedido === "retirada";

  // Textos dinâmicos rigorosamente exigidos baseados no tipo_pedido:
  // - Se tipo_pedido for 'delivery' ➔ "Saiu para Entrega"
  // - Se tipo_pedido for 'retirada' ➔ "Pronto para Retirada no Balcão"
  // - Se tipo_pedido for 'mesa' ➔ "Pronto para Servir na Mesa"
  const step3Label = isDineIn
    ? "Pronto para Servir na Mesa"
    : isPickup
    ? "Pronto para Retirada no Balcão"
    : "Saiu para Entrega";

  const step3Desc = isDineIn
    ? "Pratos prontos! O garçom está servindo na sua mesa"
    : isPickup
    ? "Seu pedido está prontinho e disponível para você retirar no balcão"
    : "O motoboy retirou seu pedido e está a caminho do seu endereço";

  const step3Icon = isDineIn ? UtensilsCrossed : isPickup ? ShoppingBag : Bike;

  const statusSteps: {
    statusKey: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      statusKey: "PENDENTE",
      label: "Pedido Recebido",
      description: "Aguardando confirmação da loja",
      icon: Package,
    },
    {
      statusKey: "EM_PREPARO",
      label: "Pedido Aceito",
      description: isDineIn
        ? "Seu pedido foi aceito e está sendo preparado pelo chef"
        : isPickup
        ? "Seu pedido foi aceito e está em preparo para o balcão"
        : "Seu pedido foi aceito e está sendo preparado na cozinha",
      icon: ChefHat,
    },
    {
      statusKey: "PRONTO_OU_ENTREGA",
      label: step3Label,
      description: step3Desc,
      icon: step3Icon,
    },
    {
      statusKey: "ENTREGUE",
      label: isDineIn ? "Servido na Mesa" : isPickup ? "Pedido Retirado" : "Pedido Entregue",
      description: isDineIn
        ? "Bom apetite! Aproveite sua refeição"
        : isPickup
        ? "Pedido entregue no balcão! Obrigado pela preferência"
        : "Bom apetite! Pedido finalizado com sucesso",
      icon: CheckCircle2,
    },
  ];

  // Desbloqueia automaticamente o áudio na primeira interação do cliente na tela de rastreio
  useEffect(() => {
    const handleCustomerInteraction = async () => {
      await unlockAudioContext();
    };

    window.addEventListener("touchstart", handleCustomerInteraction, { capture: true, passive: true });
    window.addEventListener("touchend", handleCustomerInteraction, { capture: true, passive: true });
    window.addEventListener("click", handleCustomerInteraction, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", handleCustomerInteraction, true);
      window.removeEventListener("touchend", handleCustomerInteraction, true);
      window.removeEventListener("click", handleCustomerInteraction, true);
    };
  }, []);

  // Aplica atualização de status em tempo real por eventos (sem loops de polling)
  const applyStatus = useCallback((newStatus: OrderStatus | string, updatedOrder?: Order | null) => {
    const stdNew = toStandardStatus(newStatus);
    const prevStatus = prevStatusRef.current;
    if (updatedOrder) {
      setOrder({
        ...updatedOrder,
        status: stdNew as OrderStatus,
      });
    } else {
      setOrder((prev) => (prev ? { ...prev, status: stdNew as OrderStatus } : prev));
    }

    // Dispara efeito sonoro suave ("tricks") quando o status do pedido é atualizado e NÃO é o carregamento inicial
    if (stdNew !== prevStatus && !isInitialLoadRef.current) {
      playOrderStatusUpdateChime(toLegacyStatus(stdNew));
    }

    prevStatusRef.current = stdNew;
    statusRef.current = stdNew;
    updateActiveOrderStatus(stdNew as OrderStatus);
  }, []);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Busca manual sob demanda no banco ao clicar no único botão "Atualizar Status"
  // Otimizado para iOS Safari: requisição direta async/await sem timers concorrentes ou atrasos
  const handleRefreshStatus = useCallback(async () => {
    if (isRefreshing) return;

    const targetId = order?.id || initialOrder?.id || "";
    const cleanId = String(targetId).trim().replace(/^#/, "");
    if (!cleanId) return;

    setIsRefreshing(true);

    try {
      const res = await fetchOrderDetailsApi(cleanId, config.slug);
      const now = new Date();
      setLastCheckTime(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

      if (res.success && res.order) {
        applyStatus(res.order.status, res.order);
      }
      setRefreshSuccess(true);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        setRefreshSuccess(false);
      }, 2500);
    } catch (err) {
      console.warn("Erro ao buscar status mais recente no banco:", err);
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

    // Timer de segurança para liberar o áudio caso a carga da API demore
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        isInitialLoadRef.current = false;
      }
    }, 600);

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
      clearTimeout(safetyTimer);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (eventSource) {
        eventSource.close();
      }
      if (bc) {
        bc.close();
      }
      window.removeEventListener("topfood-active-order-updated", handleActiveOrderUpdate);
    };
  }, [initialOrder?.id, config.slug, applyStatus]);

  const currentIndex = getStatusStepIndex(order?.status);
  const isCancelled = toStandardStatus(order?.status) === "CANCELADO";

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
                    <div key={step.statusKey} className="flex gap-4 pb-7 last:pb-0 relative">
                      {i < statusSteps.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 h-full w-0.5 transition-colors duration-500 ${
                            i < currentIndex ? "bg-primary" : "bg-gray-200"
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                          isComplete
                            ? "bg-primary text-white shadow-xs"
                            : "bg-gray-100 text-gray-400"
                        } ${isCurrent ? "ring-4 ring-primary/20 scale-105" : ""}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm ${
                              isComplete ? "text-gray-800" : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold animate-pulse">
                              Status atual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {step.description}
                        </p>
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
          <h2 className="mb-3 text-sm font-bold text-gray-700">Itens do pedido</h2>

          {!Array.isArray(order?.items) || order.items.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl">
              Nenhum item listado neste pedido
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(order?.items || []).map((item, idx) => {
                const quantity = item?.quantity || 1;
                const productName = item?.product?.name || (item as any)?.name || "Item do pedido";
                const selectedOptions = Array.isArray(item?.selectedOptions)
                  ? item.selectedOptions
                  : Array.isArray((item as any)?.options)
                  ? (item as any)?.options
                  : [];

                const basePrice = Number(item?.product?.price ?? (item as any)?.price ?? (item as any)?.unit_price ?? 0);
                const optionsPrice = selectedOptions.reduce(
                  (acc: number, opt: any) => acc + (Number(opt?.price) || 0),
                  0
                );
                const itemTotal = (item as any)?.totalPrice ?? (item as any)?.total_price ?? ((basePrice + optionsPrice) * quantity);

                return (
                  <div key={item?.id || idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 break-words leading-snug">
                        <span className="font-bold text-gray-900 mr-1.5">{quantity}x</span>
                        {productName}
                      </p>
                      {selectedOptions.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {selectedOptions.map((opt: any, optIdx: number) => {
                            const optName = opt?.name || String(opt);
                            const optPrice = Number(opt?.price) || 0;
                            return (
                              <p key={opt?.id || optIdx} className="text-xs text-gray-500 leading-tight">
                                • {optName}{optPrice > 0 ? ` (+${formatPrice(optPrice, config)})` : ""}
                              </p>
                            );
                          })}
                        </div>
                      )}
                      {item?.notes && (
                        <p className="mt-1 text-xs italic text-gray-500 break-words leading-tight">
                          Obs: {item.notes}
                        </p>
                      )}
                    </div>
                    {itemTotal > 0 && (
                      <div className="text-right shrink-0 pt-0.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatPrice(itemTotal, config)}
                        </span>
                        {quantity > 1 && basePrice > 0 && (
                          <p className="text-[10px] text-gray-400">
                            {formatPrice(basePrice + optionsPrice, config)} un.
                          </p>
                        )}
                      </div>
                    )}
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

        {/* Delivery / Table info */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-700">
            {isDineIn ? (
              <span className="flex items-center gap-1.5 text-purple-900 font-black">
                <UtensilsCrossed className="h-4 w-4 text-purple-600" />
                CONSUMIR AQUI — {formatTableDisplay(order).toUpperCase()}
              </span>
            ) : (order?.orderType === "delivery" || (order as any)?.delivery_type === "delivery") ? (
              "Endereço de entrega"
            ) : (
              "Retirada no balcão"
            )}
          </h2>
          {isDineIn ? (
            <div className="space-y-1.5 rounded-xl bg-purple-50/70 border border-purple-200 p-3 text-xs text-purple-950">
              <p className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                <span>Mesa:</span>
                <span className="font-black text-base">{formatTableNumberOnly(order)}</span>
              </p>
              <p className="text-purple-800 text-[11px]">
                Seu pedido será levado e servido diretamente na sua mesa assim que estiver pronto!
              </p>
            </div>
          ) : (order?.orderType === "delivery" || (order as any)?.delivery_type === "delivery") && order?.address ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>{order.address.street}, {order.address.number}</p>
              <p>Bairro: {order.address.district}</p>
              {order.address.complement && <p>Complemento: {order.address.complement}</p>}
              {order.address.reference && <p>Referência: {order.address.reference}</p>}
              {(order.location_url || order.locationUrl) && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Localização GPS anexada ✓
                  </span>
                  <a
                    href={order.location_url || order.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-600 hover:text-blue-800 underline"
                  >
                    Ver no Mapa
                  </a>
                </div>
              )}
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
