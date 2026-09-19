import type { Order } from "../types";

export interface OrderBroadcastMessage {
  type: "NEW_ORDER" | "ORDER_UPDATE";
  order: Order;
  tenantId?: string;
  timestamp: number;
}

const BROADCAST_CHANNEL_NAME = "topfood_orders_broadcast_channel";
const LOCAL_EVENT_NAME = "topfood-order-broadcast-event";
const STORAGE_KEY = "topfood_latest_order_broadcast";

/**
 * Dispara instantaneamente a mensagem de novo pedido via BroadcastChannel,
 * CustomEvent local e storage cross-tab para o painel do lojista.
 */
export function broadcastNewOrder(order: Order): void {
  if (!order) return;
  const message: OrderBroadcastMessage = {
    type: "NEW_ORDER",
    order,
    tenantId: order.tenantId,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel (comunicação instantânea inter-abas do navegador)
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage(message);
      bc.close();
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }
  }

  // 2. CustomEvent local (comunicação instantânea dentro do mesmo contexto/aba/iframe)
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(LOCAL_EVENT_NAME, {
          detail: message,
        })
      );
    } catch {
      // ignore
    }

    // 3. Storage cross-tab fallback
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    } catch {
      // ignore
    }
  }
}

/**
 * Dispara atualização de status de pedido em tempo real.
 */
export function broadcastOrderUpdate(order: Order): void {
  if (!order) return;
  const message: OrderBroadcastMessage = {
    type: "ORDER_UPDATE",
    order,
    tenantId: order.tenantId,
    timestamp: Date.now(),
  };

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage(message);
      bc.close();
    } catch {
      // ignore
    }
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(LOCAL_EVENT_NAME, {
          detail: message,
        })
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
    } catch {
      // ignore
    }
  }
}

/**
 * Escutador de eventos em tempo real para o painel do lojista.
 * Ouve via BroadcastChannel, CustomEvent local e Storage event.
 */
export function subscribeOrderBroadcast(
  onMessage: (message: OrderBroadcastMessage) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // 1. Escuta via BroadcastChannel
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event: MessageEvent<OrderBroadcastMessage>) => {
        if (event.data && (event.data.type === "NEW_ORDER" || event.data.type === "ORDER_UPDATE")) {
          onMessage(event.data);
        }
      };
    } catch (err) {
      console.warn("BroadcastChannel subscribe error:", err);
    }
  }

  // 2. Escuta via CustomEvent local
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<OrderBroadcastMessage>;
    if (custom.detail) {
      onMessage(custom.detail);
    }
  };
  window.addEventListener(LOCAL_EVENT_NAME, handleLocalEvent);

  // 3. Escuta via Storage Event (cross-tab fallback)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed: OrderBroadcastMessage = JSON.parse(e.newValue);
        if (parsed?.order) {
          onMessage(parsed);
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    if (bc) {
      bc.close();
    }
    window.removeEventListener(LOCAL_EVENT_NAME, handleLocalEvent);
    window.removeEventListener("storage", handleStorage);
  };
}
