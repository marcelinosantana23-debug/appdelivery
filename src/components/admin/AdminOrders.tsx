import { useState } from "react";
import { Check, X, Bike, ChefHat, Package, CheckCircle2, Clock, Phone, MapPin, ShoppingBag } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice } from "@/utils/order";
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
  const { orders, updateOrderStatus, clearNewOrderFlag } = useStore();
  const [filter, setFilter] = useState<"active" | "all">("active");

  const filtered = filter === "active"
    ? orders.filter((o) => o.status !== "done" && o.status !== "cancelled")
    : orders;

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex gap-2">
        <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>
          Ativos ({orders.filter((o) => o.status !== "done" && o.status !== "cancelled").length})
        </FilterButton>
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          Todos ({orders.length})
        </FilterButton>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
          <Package className="h-16 w-16" strokeWidth={1} />
          <p className="font-medium">Nenhum pedido {filter === "active" ? "ativo" : ""} no momento</p>
          <p className="text-sm">Os novos pedidos aparecerão aqui em tempo real</p>
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
          />
        ))
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
}: {
  order: Order;
  isNew: boolean;
  onView: () => void;
  onAdvance: (id: string) => void;
  onCancel: (id: string) => void;
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
      return "Aceitar e Produzir";
    }
    if (order.status === "preparing") {
      return isPickup ? "Marcar como 'Pronto no Balcão'" : "Marcar como 'Saiu para Entrega'";
    }
    if (order.status === "delivering") {
      return isPickup ? "Marcar como 'Retirado'" : "Marcar como 'Entregue'";
    }
    return "Avançar Status";
  };

  return (
    <div
      className={`rounded-2xl bg-white shadow-sm transition-all ${
        isNew ? "ring-2 ring-primary animate-bounce-soft" : ""
      }`}
      onClick={onView}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">{order.id}</span>
          {isNew && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
              NOVO!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {timeAgo}min atrás
          </span>
          {statusInfo && (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white ${statusInfo.color}`}
            >
              <statusInfo.icon className="h-3 w-3" />
              {statusInfo.label}
            </span>
          )}
          {isCancelled && (
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
              Cancelado
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-bold">{order.customerName}</span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Phone className="h-3 w-3" />
            {order.customerPhone}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span className={`rounded px-2 py-0.5 font-medium ${
            order.orderType === "delivery" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
          }`}>
            {order.orderType === "delivery" ? "🛵 Entrega" : "🏪 Retirada"}
          </span>
          <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
            {order.paymentMethod === "pix" && "PIX"}
            {order.paymentMethod === "card" && "Cartão"}
            {order.paymentMethod === "cash" && "Dinheiro"}
          </span>
        </div>

        {order.orderType === "delivery" && order.address && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              {order.address.street}, {order.address.number} — {order.address.district}
              {order.address.reference && ` (${order.address.reference})`}
            </span>
          </div>
        )}

        {/* Items */}
        <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50 p-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                <span className="font-bold">{item.quantity}x</span> {item.product.name}
                {item.selectedOptions.length > 0 && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({item.selectedOptions.map((o) => o.name).join(", ")})
                  </span>
                )}
                {item.notes && <span className="block text-xs italic text-gray-400">📝 {item.notes}</span>}
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
        <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
          {canAdvance && (
            <button
              id={`advance-order-${order.id.replace(/[^a-zA-Z0-9_-]/g, "")}`}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(order.id);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-600 active:scale-95 cursor-pointer"
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-primary text-white" : "bg-white text-gray-500 shadow-sm"
      }`}
    >
      {children}
    </button>
  );
}
