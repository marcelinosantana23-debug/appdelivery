import type { Order, OrderStatus } from "../types";

export interface OrderEventPayload {
  orderId: string;
  status: OrderStatus;
  order: Order;
  timestamp: number;
}

type OrderEventListener = (event: OrderEventPayload) => void;

class OrderEventManager {
  private listeners: Set<OrderEventListener> = new Set();

  subscribe(listener: OrderEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(order: Order): void {
    if (!order || !order.id) return;
    const cleanId = order.id.replace(/^#/, "");
    const payload: OrderEventPayload = {
      orderId: cleanId,
      status: order.status,
      order,
      timestamp: Date.now(),
    };

    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.warn("Order event listener error:", err);
      }
    }
  }
}

export const orderEvents = new OrderEventManager();
