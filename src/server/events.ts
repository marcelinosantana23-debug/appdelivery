import type { Order, OrderStatus } from "../types";
import type { Env } from "./types";

export interface OrderEventPayload {
  orderId: string;
  status: OrderStatus;
  order: Order;
  timestamp: number;
  tenantId?: string;
  isNew?: boolean;
}

type OrderEventListener = (event: OrderEventPayload) => void;

/** Sala global: recebe eventos de todas as lojas (usada pelo super admin). */
export const ALL_TENANTS_ROOM = "__all__";

/**
 * Barramento em memória. Só enxerga conexões do MESMO processo/isolate.
 * Usado como fallback no servidor Node (dev) quando não há Durable Object.
 */
class OrderEventManager {
  private listeners: Set<OrderEventListener> = new Set();

  subscribe(listener: OrderEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(order: Order, isNew: boolean = false): void {
    if (!order || !order.id) return;
    const payload = buildPayload(order, isNew);
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.warn("Order event listener error:", err);
      }
    }
  }

  emitPayload(payload: OrderEventPayload): void {
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

function buildPayload(order: Order, isNew: boolean): OrderEventPayload {
  return {
    orderId: order.id.replace(/^#/, ""),
    status: order.status,
    order,
    timestamp: Date.now(),
    tenantId: order.tenantId,
    isNew,
  };
}

function getRoomStub(env: Env, room: string) {
  const ns = env.ORDER_HUB!;
  return ns.get(ns.idFromName(room));
}

/**
 * Publica um evento de pedido para TODOS os assinantes, em qualquer isolate.
 * - Workers (binding ORDER_HUB): envia ao Durable Object da loja (+ sala global).
 * - Node/dev (sem binding): usa o barramento em memória.
 * Deve ser chamado com `await` logo após gravar no D1 para entrega instantânea.
 */
export async function publishOrderEvent(
  env: Env | undefined,
  order: Order,
  isNew: boolean = false
): Promise<void> {
  if (!order || !order.id) return;

  if (!env?.ORDER_HUB) {
    orderEvents.emit(order, isNew);
    return;
  }

  const payload = JSON.stringify(buildPayload(order, isNew));
  const rooms = new Set<string>([ALL_TENANTS_ROOM]);
  if (order.tenantId) rooms.add(order.tenantId);

  await Promise.all(
    [...rooms].map(async (room) => {
      try {
        await getRoomStub(env, room).fetch("https://order-hub/publish", {
          method: "POST",
          body: payload,
        });
      } catch (err) {
        console.warn(`[OrderHub] Falha ao publicar na sala ${room}:`, err);
      }
    })
  );
}

/**
 * Assina eventos de pedidos de uma sala. Retorna a função de cancelamento.
 * O filtro fino (por pedido/loja) continua sendo feito pelo chamador em `onEvent`.
 */
export async function subscribeOrderEvents(
  env: Env | undefined,
  room: string,
  onEvent: (payload: OrderEventPayload) => void | Promise<void>
): Promise<() => void> {
  if (!room) return () => {};

  // Fallback em memória (Node/dev)
  if (!env?.ORDER_HUB) {
    return orderEvents.subscribe((p) => {
      void onEvent(p);
    });
  }

  let cancelled = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const res = await getRoomStub(env, room).fetch("https://order-hub/subscribe");
  if (!res.body) {
    return () => {};
  }
  reader = res.body.getReader();

  const pump = async () => {
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (!cancelled) {
        const { done, value } = await reader!.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try {
              await onEvent(JSON.parse(line.slice(5).trim()) as OrderEventPayload);
            } catch (err) {
              console.warn("[OrderHub] Evento inválido ignorado:", err);
            }
          }
        }
      }
    } catch {
      // conexão encerrada
    }
  };
  void pump();

  return () => {
    cancelled = true;
    reader?.cancel().catch(() => {});
  };
}
