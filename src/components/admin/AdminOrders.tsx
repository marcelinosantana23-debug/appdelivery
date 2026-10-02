import { useState, useRef } from "react";
import {
  Check,
  X,
  Bike,
  ChefHat,
  Package,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  ShoppingBag,
  User,
  MessageCircle,
  ExternalLink,
  Compass,
  DollarSign,
  QrCode,
  Eye,
  CreditCard,
  Download,
  FileCheck,
  RefreshCw,
  Sun,
  Send,
  Smartphone,
  AlertCircle,
  BookmarkCheck,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { formatPrice, getMotoboyWhatsAppUrl, buildMotoboyWhatsAppMessage } from "@/utils/order";
import type { Order, OrderStatus } from "@/types";

const statusFlow: { status: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { status: "received", label: "Recebido", icon: Package, color: "bg-blue-500" },
  { status: "preparing", label: "Em produção", icon: ChefHat, color: "bg-orange-500" },
  { status: "delivering", label: "Saiu p/ entrega", icon: Bike, color: "bg-purple-500" },
  { status: "done", label: "Finalizado", icon: CheckCircle2, color: "bg-green-500" },
];

const nextStatusMap: Record<string, OrderStatus> = {
  received: "preparing",
  preparing: "delivering",
  delivering: "done",
};

export function AdminOrders({ newOrderIds }: { newOrderIds: string[] }) {
  const { orders, updateOrderStatus, clearNewOrderFlag, refreshOrders, showToast } = useStore();
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<Order | null>(null);
  const [motoboyModalOrder, setMotoboyModalOrder] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const topAnchorRef = useRef<HTMLDivElement>(null);

  // Screen Wake Lock API: mantém a tela acesa continuamente exclusivamente nesta tela de pedidos
  const {
    isSupported: isWakeLockSupported,
    isActive: isWakeLockActive,
    toggle: toggleWakeLock,
  } = useScreenWakeLock(true);

  const activeOrdersCount = orders.filter((o) => o.status !== "done" && o.status !== "cancelled").length;
  const pendingOrdersCount = orders.filter((o) => o.status === "received").length;
  const allOrdersCount = orders.length;

  const filtered = filter === "active"
    ? orders.filter((o) => o.status !== "done" && o.status !== "cancelled")
    : orders;

  const handleFilterChange = (newFilter: "active" | "all") => {
    setFilter(newFilter);
    topAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (typeof window !== "undefined") {
        const p = window.location.pathname.toLowerCase();
        if (!p.startsWith("/painel") && !p.startsWith("/admin")) {
          window.history.replaceState({ view: "admin", tab: "orders" }, "", "/painel");
        }
      }
      await refreshOrders();
      showToast("Lista de pedidos atualizada com sucesso!", "success");
    } catch {
      showToast("Erro ao sincronizar pedidos", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-full">
      <div ref={topAnchorRef} />
      
      {/* Barra de Filtros FIXA / STICKY no topo da tela de pedidos */}
      <div className="sticky top-0 z-20 border-b border-gray-200/90 bg-gray-50/95 backdrop-blur-md px-3 sm:px-4 py-2.5 shadow-xs">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <button
            id="admin-orders-tab-active"
            type="button"
            onClick={() => handleFilterChange("active")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer ${
              filter === "active"
                ? "bg-slate-900 text-white ring-1 ring-slate-800"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>Ativos</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${
                filter === "active"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {activeOrdersCount}
            </span>
          </button>

          <button
            id="admin-orders-tab-all"
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer ${
              filter === "all"
                ? "bg-slate-900 text-white ring-1 ring-slate-800"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>Todos</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-black ${
                filter === "all"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {allOrdersCount}
            </span>
          </button>

          {/* Indicador Discreto: Tela Acesa (Screen Wake Lock) */}
          {isWakeLockSupported && (
            <button
              id="admin-orders-wakelock-btn"
              type="button"
              onClick={async () => {
                await toggleWakeLock();
                showToast(
                  !isWakeLockActive
                    ? "Tela Acesa ativada: o aparelho não entrará em repouso nesta tela."
                    : "Tela Acesa desativada: o aparelho seguirá o descanso de tela padrão.",
                  "info"
                );
              }}
              title={
                isWakeLockActive
                  ? "Modo Tela Acesa ativo: o aparelho não entrará em repouso enquanto você estiver na tela de pedidos. Clique para pausar."
                  : "Modo Tela Acesa pausado: clique para manter a tela sempre acesa."
              }
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition shadow-2xs cursor-pointer border ${
                isWakeLockActive
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isWakeLockActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isWakeLockActive ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
              </span>
              <Sun
                className={`h-3.5 w-3.5 shrink-0 ${
                  isWakeLockActive ? "text-amber-500" : "text-slate-400"
                }`}
              />
              <span className="whitespace-nowrap">
                {isWakeLockActive ? "Tela Acesa" : "Tela Normal"}
              </span>
            </button>
          )}

          {/* Botão Atualizar Pedidos direto na barra sticky */}
          <button
            id="admin-orders-sticky-refresh-btn"
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 shadow-xs cursor-pointer disabled:opacity-60"
            title="Atualizar lista de pedidos agora"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-600 ${
                isRefreshing ? "animate-spin text-amber-500" : ""
              }`}
            />
            <span className="hidden xs:inline">
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </span>
          </button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="mx-auto w-full max-w-4xl p-3 sm:p-4 space-y-4 flex-1">
        {/* Banner de Pedidos Pendentes Aguardando Aceite */}
        {pendingOrdersCount > 0 && (
          <div className="rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 p-3 sm:p-4 text-amber-900 animate-pulse shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-base shadow-sm">
                🔔
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-black text-amber-950">
                  {pendingOrdersCount === 1
                    ? "1 Novo Pedido Pendente Aguardando Aceite!"
                    : `${pendingOrdersCount} Novos Pedidos Pendentes Aguardando Aceite!`}
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  O alarme sonoro toca a cada 5 segundos. Clique em <strong>&quot;Aceitar Pedido&quot;</strong> no card abaixo para iniciar o preparo e parar o alarme.
                </p>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
            <Package className="h-16 w-16" strokeWidth={1} />
            <p className="font-medium text-base text-gray-600">
              Nenhum pedido {filter === "active" ? "ativo" : ""} no momento
            </p>
            <p className="text-sm text-gray-400">
              {filter === "active"
                ? "Os novos pedidos aparecerão aqui em tempo real"
                : "O histórico completo de pedidos aparecerá aqui"}
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isNew={newOrderIds.includes(order.id)}
              onView={() => clearNewOrderFlag(order.id)}
              onAdvance={(id) => updateOrderStatus(id, nextStatusMap[order.status])}
              onCancel={(id) => updateOrderStatus(id, "cancelled")}
              onViewReceipt={(order) => setViewingReceiptOrder(order)}
              onOpenMotoboy={(order) => setMotoboyModalOrder(order)}
            />
          ))
        )}
      </div>

      {/* MODAL DE VISUALIZAÇÃO DO COMPROVANTE DO PIX */}
      {viewingReceiptOrder && (
        <PixReceiptModal
          order={viewingReceiptOrder}
          onClose={() => setViewingReceiptOrder(null)}
        />
      )}

      {/* MODAL DE ENVIO RÁPIDO PARA O MOTOBOY (FIXO OU SUBSTITUTO) */}
      {motoboyModalOrder && (
        <MotoboyDispatchModal
          order={motoboyModalOrder}
          onClose={() => setMotoboyModalOrder(null)}
        />
      )}
    </div>
  );
}

function OrderCard({
  order,
  isNew,
  onView,
  onAdvance,
  onCancel,
  onViewReceipt,
  onOpenMotoboy,
}: {
  order: Order;
  isNew: boolean;
  onView: () => void;
  onAdvance: (id: string) => void;
  onCancel: (id: string) => void;
  onViewReceipt: (order: Order) => void;
  onOpenMotoboy: (order: Order) => void;
}) {
  const isPickup = order.orderType === "pickup" || (order as any).delivery_type === "pickup";
  const defaultStatusInfo = statusFlow.find((s) => s.status === order.status);
  
  // Ajuste dinâmico de badge para retirada no balcão
  const statusInfo = order.status === "delivering" && isPickup
    ? {
        status: "delivering" as OrderStatus,
        label: "Pronto no Balcão",
        icon: ShoppingBag,
        color: "bg-emerald-600",
      }
    : defaultStatusInfo;

  const isCancelled = order.status === "cancelled";
  const isDone = order.status === "done";
  const canAdvance = nextStatusMap[order.status] !== undefined;
  const { config } = useStore();

  const timeAgo = Math.floor((Date.now() - order.createdAt) / 60000);

  const getAdvanceButtonLabel = () => {
    if (order.status === "received") {
      return "Aceitar Pedido / Iniciar Preparo";
    }
    if (order.status === "preparing") {
      return isPickup ? "Marcar como 'Pronto no Balcão'" : "Enviar para Entrega";
    }
    if (order.status === "delivering") {
      return isPickup ? "Marcar como 'Retirado'" : "Marcar como 'Entregue'";
    }
    return "Avançar Status";
  };

  const receiptUrl = order.pixReceiptUrl || order.pix_receipt_url;

  return (
    <div
      onClick={onView}
      className={`rounded-2xl border bg-white shadow-sm transition ${
        isNew ? "border-primary/50 ring-2 ring-primary/20" : "border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-gray-800">{order.id}</span>
          {isNew && (
            <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              NOVO
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {timeAgo === 0 ? "Agora" : `Há ${timeAgo} min`}
          </span>
        </div>
        {statusInfo && (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white ${statusInfo.color}`}
          >
            <statusInfo.icon className="h-3 w-3" />
            {statusInfo.label}
          </span>
        )}
        {isCancelled && (
          <span className="rounded-full bg-gray-400 px-2.5 py-1 text-xs font-medium text-white">
            Cancelado
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Customer & Address Details */}
        <div className="mb-3 rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="font-bold text-slate-800 text-sm">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${order.customerPhone.replace(/\D/g, "")}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-slate-700 hover:text-slate-950 font-medium"
              >
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{order.customerPhone}</span>
              </a>
              <a
                href={`https://wa.me/55${order.customerPhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-0.5 font-bold transition text-xs"
                title="Conversar com o cliente no WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
              {order.orderType === "delivery" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMotoboy(order);
                  }}
                  className="flex items-center gap-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 font-bold transition text-xs cursor-pointer active:scale-95"
                  title="Enviar rota do GPS e dados do pedido para o WhatsApp do Motoboy"
                >
                  <Bike className="h-3.5 w-3.5 text-amber-700" />
                  <span>Motoboy</span>
                </button>
              )}
            </div>
          </div>

          {/* Endereço de Entrega Completo ou Retirada */}
          {order.orderType === "delivery" && order.address ? (
            <div className="mt-2.5 space-y-1 text-slate-700">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      {order.address.street}, Nº {order.address.number}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 ml-5">
                    <span className="font-semibold text-slate-700">Bairro:</span> {order.address.district}
                  </p>
                  {order.address.complement && (
                    <p className="text-slate-600 ml-5">
                      <span className="font-semibold text-slate-700">Complemento:</span> {order.address.complement}
                    </p>
                  )}
                  {/* Ponto de Referência em destaque */}
                  {order.address.reference ? (
                    <div className="mt-1 flex items-center gap-1 rounded-md bg-amber-100/80 border border-amber-300 px-2 py-1 text-amber-900 font-medium">
                      <Compass className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                      <span>
                        <strong className="font-bold">Ponto de Referência:</strong> {order.address.reference}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">Ponto de referência não informado</p>
                  )}
                  {/* Confirmação de Localização GPS Anexada */}
                  {(order.location_url || order.locationUrl) && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-emerald-950 text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Localização GPS anexada ao pedido</span>
                      </span>
                      <a
                        href={order.location_url || order.locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-blue-700 hover:text-blue-900 underline font-black"
                      >
                        <span>Abrir GPS</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
                {(order.location_url || order.locationUrl) ? (
                  <a
                    href={order.location_url || order.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-3 py-2 transition shadow-xs cursor-pointer active:scale-95 shrink-0"
                    title="Abrir rota e coordenadas exatas do GPS no Google Maps"
                  >
                    <MapPin className="h-3.5 w-3.5 text-white" />
                    <span>📍 Ver no Mapa</span>
                    <ExternalLink className="h-3 w-3 opacity-90" />
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${order.address.street}, ${order.address.number}, ${order.address.district}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0"
                    title="Abrir rota no Google Maps"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Maps</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 border border-blue-200 rounded-lg px-2.5 py-1.5">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              <span>Retirada no Balcão — O cliente retirará o pedido diretamente no balcão da loja.</span>
            </div>
          )}
        </div>

        {/* Modalidade e Pagamento */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-lg px-2.5 py-1 font-bold ${
              order.orderType === "delivery"
                ? "bg-orange-100 text-orange-800 border border-orange-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {order.orderType === "delivery" ? "🛵 Entrega a Domicílio" : "🏪 Retirada no Balcão"}
          </span>

          {/* TAG "PAGAMENTO PIX" COM BOTÃO "VER COMPROVANTE" */}
          {order.paymentMethod === "pix" ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-emerald-900 shadow-2xs">
              <QrCode className="h-3.5 w-3.5 text-emerald-700" />
              <span className="font-extrabold uppercase tracking-wide">Pagamento PIX</span>
              
              {receiptUrl ? (
                <button
                  type="button"
                  id={`btn-view-receipt-${order.id.replace(/[^a-zA-Z0-9_-]/g, "")}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewReceipt(order);
                  }}
                  className="ml-1 flex items-center gap-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 text-[11px] font-black transition cursor-pointer shadow-xs"
                  title="Abrir foto do comprovante do PIX"
                >
                  <Eye className="h-3 w-3" />
                  <span>Ver Comprovante</span>
                </button>
              ) : (
                <span className="ml-1 text-[10px] text-emerald-700/80 font-medium italic">
                  (Sem comprovante)
                </span>
              )}
            </div>
          ) : order.paymentMethod === "card" ? (
            <span className="rounded-lg bg-indigo-100 border border-indigo-200 px-2.5 py-1 font-bold text-indigo-900 flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
              <span>
                Cartão na Entrega (
                {order.cardType === "credit"
                  ? "Crédito"
                  : order.cardType === "debit"
                  ? "Débito"
                  : "Débito/Crédito"}
                )
              </span>
            </span>
          ) : (
            <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 font-semibold text-slate-800 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-slate-500" />
              Dinheiro
            </span>
          )}

          {order.paymentMethod === "cash" && order.changeFor && (
            <span className="rounded-lg bg-emerald-100 border border-emerald-300 px-2.5 py-1 font-bold text-emerald-800">
              💵 Troco para R$ {order.changeFor}
            </span>
          )}
        </div>

        {/* Miniatura do Comprovante PIX em destaque no card */}
        {order.paymentMethod === "pix" && receiptUrl && (
          <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 text-xs">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onViewReceipt(order);
              }}
              className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-emerald-300 bg-white cursor-pointer hover:opacity-90 relative group shadow-2xs"
              title="Clique para ampliar o comprovante"
            >
              <img
                src={receiptUrl}
                alt="Comprovante PIX"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Eye className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-emerald-950 truncate flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Comprovante PIX anexado
              </p>
              <p className="text-[11px] text-emerald-700">Clique para inspecionar e validar o comprovante</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewReceipt(order);
              }}
              className="rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 shadow-xs transition cursor-pointer shrink-0 flex items-center gap-1"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Ver Comprovante</span>
            </button>
          </div>
        )}

        {/* Items */}
        <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50 p-3">
          {(order?.items || []).map((item, idx) => (
            <div key={item?.id || idx} className="flex justify-between text-sm">
              <span className="text-gray-700">
                <span className="font-bold">{item?.quantity || 1}x</span> {item?.product?.name || (item as any)?.name || "Item"}
                {Array.isArray(item?.selectedOptions) && item.selectedOptions.length > 0 && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({item.selectedOptions.map((o) => o?.name || o).join(", ")})
                  </span>
                )}
                {item?.notes && <span className="block text-xs italic text-gray-400">📝 {item.notes}</span>}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span>{formatPrice(order.total, config)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isCancelled && !isDone && (
        <div className="flex flex-col sm:flex-row gap-2 border-t border-gray-100 px-4 py-3 w-full">
          {order.orderType === "delivery" && (
            <button
              type="button"
              id={`btn-motoboy-${order.id.replace(/[^a-zA-Z0-9_-]/g, "")}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenMotoboy(order);
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-amber-950 transition shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="Abrir opções de envio para o motoboy (Fixo ou Substituto)"
            >
              <Bike className="h-4 w-4 text-amber-700" />
              <span>🚀 Enviar para o Motoboy</span>
            </button>
          )}
          {canAdvance && (
            <button
              id={`advance-order-${order.id.replace(/[^a-zA-Z0-9_-]/g, "")}`}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(order.id);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 cursor-pointer ${
                order.status === "received"
                  ? "bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400 font-black shadow-md animate-pulse"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              <Check className="h-4 w-4" />
              {getAdvanceButtonLabel()}
            </button>
          )}
          <button
            id={`cancel-order-${order.id.replace(/[^a-zA-Z0-9_-]/g, "")}`}
            onClick={(e) => {
              e.stopPropagation();
              onCancel(order.id);
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-red-200 px-4 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50 active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * MODAL PARA VISUALIZAÇÃO DO COMPROVANTE DO PIX EM TAMANHO COMPLETO
 */
function PixReceiptModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { config } = useStore();
  const receiptUrl = order.pixReceiptUrl || order.pix_receipt_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Comprovante de Pagamento PIX
              </h3>
              <p className="text-xs text-slate-500">
                Pedido <strong>{order.id}</strong> • Cliente: <strong>{order.customerName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/80 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
            title="Fechar comprovante"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com a Imagem Completa */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-900/95 flex flex-col items-center justify-center min-h-[300px]">
          {receiptUrl ? (
            <div className="relative max-w-full rounded-xl overflow-hidden shadow-xl border border-slate-700 bg-black">
              <img
                src={receiptUrl}
                alt={`Comprovante do Pedido ${order.id}`}
                className="max-h-[60vh] w-auto max-w-full object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="text-center text-slate-400 py-12">
              <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-sm">Nenhum comprovante anexado para este pedido.</p>
            </div>
          )}
        </div>

        {/* Rodapé com Informações de Conferência */}
        <div className="border-t border-slate-200 p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="text-slate-800 font-bold flex items-center gap-1.5 justify-center sm:justify-start">
              <span>Valor do Pedido:</span>
              <span className="text-sm font-black text-emerald-600">
                {formatPrice(order.total, config)}
              </span>
            </div>
            {config.pixKey && (
              <p className="text-slate-500">
                Chave PIX da Loja: <span className="font-mono font-medium">{config.pixKey}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                download={`comprovante-${order.id}.jpg`}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-4 py-2 font-bold text-slate-700 transition"
              >
                <Download className="h-4 w-4" />
                <span>Baixar</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex flex-1 sm:flex-initial items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 font-bold transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MODAL PARA ENVIO DE ROTA GPS E DADOS DO PEDIDO PARA O MOTOBOY
 * Suporta envio direto para o Motoboy Fixo e troca rápida para Entregador Substituto (Quebra-Galho)
 */
function MotoboyDispatchModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { config, updateConfig, showToast } = useStore();
  const [substitutePhone, setSubstitutePhone] = useState("");
  const [saveAsFixed, setSaveAsFixed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fixedPhone = (config.motoboyPhone || "").trim();
  const hasFixedPhone = Boolean(fixedPhone);

  const formatDisplayPhone = (phoneStr: string) => {
    if (!phoneStr) return "";
    const raw = phoneStr.replace(/\D/g, "");
    const local = raw.startsWith("55") && raw.length > 11 ? raw.slice(2) : raw;
    if (local.length === 11) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return phoneStr;
  };

  const openWhatsAppSafe = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cleanSubstitute = substitutePhone.replace(/\D/g, "");
  const isSubstituteValid = cleanSubstitute.length >= 10;

  // 1. Disparo para o Motoboy Fixo
  const handleSendFixed = () => {
    if (!hasFixedPhone) return;
    const url = getMotoboyWhatsAppUrl(order, config, fixedPhone);
    openWhatsAppSafe(url);
    showToast("Abrindo WhatsApp com rota e dados para o Motoboy Fixo...", "success");
    onClose();
  };

  // 2. Disparo para o Entregador Substituto (Quebra-Galho)
  const handleSendSubstitute = async () => {
    if (!isSubstituteValid) {
      showToast("Digite o número do WhatsApp com DDD do entregador.", "error");
      return;
    }

    const formattedClean = cleanSubstitute.startsWith("55") ? cleanSubstitute : `55${cleanSubstitute}`;

    if (saveAsFixed) {
      setIsSaving(true);
      try {
        await updateConfig({ motoboyPhone: formattedClean });
        showToast("Novo número salvo como Motoboy Fixo da loja!", "success");
      } catch (err) {
        console.warn("Falha ao salvar motoboy fixo:", err);
      } finally {
        setIsSaving(false);
      }
    }

    const url = getMotoboyWhatsAppUrl(order, config, formattedClean);
    openWhatsAppSafe(url);
    showToast("Abrindo WhatsApp para o entregador substituto...", "success");
    onClose();
  };

  // 3. Fallback: Escolher contato no WhatsApp
  const handleSendManual = () => {
    const text = buildMotoboyWhatsAppMessage(order, config);
    const url = `https://api.whatsapp.com/send?text=${text}`;
    openWhatsAppSafe(url);
    showToast("Abrindo WhatsApp para selecionar o contato...", "info");
    onClose();
  };

  const hasGps = Boolean(order.location_url || order.locationUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-amber-300 px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black leading-tight">
                Enviar Rota para o Motoboy
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                Pedido <strong>{order.id}</strong> • Cliente: <strong>{order.customerName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 hover:bg-black/30 text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto bg-slate-50/50">
          {/* Card Resumo do Pedido & GPS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                  <span>
                    {order.address
                      ? `${order.address.street}, Nº ${order.address.number}`
                      : "Endereço não informado"}
                  </span>
                </div>
                {order.address?.district && (
                  <p className="text-slate-600 ml-5 font-medium">
                    Bairro: {order.address.district}
                  </p>
                )}
                {order.address?.reference && (
                  <p className="text-amber-800 ml-5 font-semibold bg-amber-50 rounded-md px-2 py-0.5 border border-amber-200 inline-block">
                    Ponto de ref: {order.address.reference}
                  </p>
                )}
              </div>
            </div>

            {/* Status do GPS */}
            <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
              {hasGps ? (
                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-[11px] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Localização GPS (Google Maps) anexada</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium">
                  <Compass className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Endereço por extenso (link do Maps anexado)</span>
                </div>
              )}

              <div className="font-bold text-slate-700">
                {order.paymentMethod === "pix" ? (
                  <span className="text-emerald-700 font-black">✓ PAGO VIA PIX</span>
                ) : (
                  <span className="text-slate-900">
                    Cobrar: <strong>{formatPrice(order.total, config)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* OPÇÃO 1: Motoboy Fixo (Cadastrado) */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 space-y-2.5 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-950 tracking-wider flex items-center gap-1.5">
                <Bike className="h-4 w-4 text-emerald-700" />
                <span>1. Motoboy Fixo (Cadastrado)</span>
              </span>
              {hasFixedPhone ? (
                <span className="rounded-full bg-emerald-200/80 text-emerald-900 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                  Padrão da Loja
                </span>
              ) : (
                <span className="rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
                  Não Configurado
                </span>
              )}
            </div>

            {hasFixedPhone ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-white/80 border border-emerald-200 rounded-xl px-3 py-2">
                  <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm text-slate-900">
                    {formatDisplayPhone(fixedPhone)}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-auto">Fixo</span>
                </div>

                <button
                  type="button"
                  id="btn-send-fixed-motoboy"
                  onClick={handleSendFixed}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white py-3 px-4 text-sm font-black shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <Bike className="h-4 w-4" />
                  <span>🚀 Enviar Direto para o Motoboy Fixo</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-100/70 border border-amber-300 p-2.5 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Nenhum motoboy fixo cadastrado nas configurações.</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  Preencha o campo de substituto abaixo e marque o checkbox para salvá-lo como fixo para os próximos pedidos.
                </p>
              </div>
            )}
          </div>

          {/* Divisor Visual */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              OU
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* OPÇÃO 2: Entregador Substituto (Quebra-Galho) */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-950 tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span>2. Entregador Substituto (Quebra-Galho)</span>
              </span>
              <span className="rounded-full bg-blue-200/80 text-blue-900 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                Troca Rápida
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                📱 Número do Entregador Substituto (Quebra-Galho)
              </label>
              <input
                id="input-substitute-motoboy"
                type="tel"
                value={substitutePhone}
                onChange={(e) => setSubstitutePhone(e.target.value)}
                placeholder="Ex: (22) 99999-8888 ou 22999998888"
                className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Digite o DDD e número do WhatsApp do entregador que fará esta corrida.
              </p>
            </div>

            {/* Checkbox para Salvar como Fixo */}
            <label className="flex items-start gap-2.5 rounded-xl bg-white/90 border border-blue-200 p-2.5 cursor-pointer select-none hover:bg-white transition">
              <input
                id="checkbox-save-as-fixed-motoboy"
                type="checkbox"
                checked={saveAsFixed}
                onChange={(e) => setSaveAsFixed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="text-xs text-slate-800 leading-tight">
                <span className="font-bold flex items-center gap-1">
                  <BookmarkCheck className="h-3.5 w-3.5 text-blue-600" />
                  Salvar este novo número como Motoboy Fixo?
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Atualiza automaticamente o cadastro padrão da loja nas configurações.
                </p>
              </div>
            </label>

            {/* Botão de Envio para Substituto */}
            <button
              type="button"
              id="btn-send-substitute-motoboy"
              onClick={handleSendSubstitute}
              disabled={!isSubstituteValid || isSaving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-[0.99] text-white py-3 px-4 text-sm font-black shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>
                {isSaving ? "Salvando configurações..." : "🛵 Enviar para o Entregador Substituto"}
              </span>
            </button>
          </div>

          {/* Opção Alternativa: Escolher contato da lista do WhatsApp */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleSendManual}
              className="text-xs text-slate-500 hover:text-slate-900 underline font-medium transition cursor-pointer inline-flex items-center gap-1"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>Não tem o número agora? Abrir WhatsApp e escolher contato na lista</span>
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-200 px-5 py-3 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
