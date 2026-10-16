import type { Order } from "@/types";

export interface PendingOfflineOrder {
  id: string;
  tenantId: string;
  order: Order;
  payload: any;
  queuedAt: number;
  retryCount: number;
  lastAttemptAt?: number;
  lastError?: string;
}

const OFFLINE_QUEUE_KEY = "topfood_pending_orders_queue";

/**
 * Retorna todos os pedidos pendentes armazenados na fila local
 */
export function getOfflineOrdersQueue(): PendingOfflineOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Erro ao ler fila offline de pedidos:", err);
    return [];
  }
}

/**
 * Salva um pedido na fila local com controle de tentativas e payload
 */
export function saveOrderToOfflineQueue(
  order: Order,
  tenantId: string,
  payload: any,
  errorMessage?: string
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOfflineOrdersQueue();
    const existingIndex = current.findIndex(
      (item) => item.id === order.id || item.order.id === order.id
    );

    const pendingItem: PendingOfflineOrder = {
      id: order.id,
      tenantId,
      order,
      payload,
      queuedAt: existingIndex >= 0 ? current[existingIndex].queuedAt : Date.now(),
      retryCount: existingIndex >= 0 ? current[existingIndex].retryCount + 1 : 1,
      lastAttemptAt: Date.now(),
      lastError: errorMessage || "Falha de conexão com a internet",
    };

    if (existingIndex >= 0) {
      current[existingIndex] = pendingItem;
    } else {
      current.push(pendingItem);
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn("Erro ao salvar pedido na fila offline:", err);
  }
}

/**
 * Remove um pedido da fila offline após confirmação bem-sucedida do servidor
 */
export function removeOrderFromOfflineQueue(orderId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOfflineOrdersQueue();
    const cleanId = orderId.replace(/^#/, "");
    const filtered = current.filter(
      (item) =>
        item.id !== orderId &&
        item.id.replace(/^#/, "") !== cleanId &&
        item.order.id !== orderId &&
        item.order.id.replace(/^#/, "") !== cleanId
    );
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Erro ao remover pedido da fila offline:", err);
  }
}

/**
 * Limpa toda a fila de pedidos pendentes
 */
export function clearOfflineOrdersQueue(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Verifica se existem pedidos pendentes de sincronização
 */
export function hasPendingOfflineOrders(): boolean {
  return getOfflineOrdersQueue().length > 0;
}
