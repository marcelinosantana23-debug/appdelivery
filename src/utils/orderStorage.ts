import type { OrderStatus, OrderType } from "@/types";

export interface StoredActiveOrder {
  orderId: string;
  tenantSlug?: string;
  storeName?: string;
  total?: number;
  status?: OrderStatus;
  orderType?: OrderType;
  timestamp: number;
}

const STORAGE_KEY = "topfood_active_order_id";
const DATA_STORAGE_KEY = "topfood_active_order_data";

export function saveActiveOrder(
  orderId: string,
  tenantSlug?: string,
  extra?: { storeName?: string; total?: number; status?: OrderStatus; orderType?: OrderType }
): void {
  try {
    if (!orderId) return;

    // Se o pedido já for finalizado ou cancelado, não salva como ativo
    if (extra?.status === "done" || extra?.status === "cancelled") {
      clearActiveOrder();
      return;
    }

    localStorage.setItem(STORAGE_KEY, orderId);

    const data: StoredActiveOrder = {
      orderId,
      tenantSlug,
      storeName: extra?.storeName,
      total: extra?.total,
      status: extra?.status || "received",
      orderType: extra?.orderType || "delivery",
      timestamp: Date.now(),
    };
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save active order to localStorage:", err);
  }
}

export function getActiveOrderId(currentTenantSlug?: string): string | null {
  try {
    const data = getActiveOrderData(currentTenantSlug);
    return data ? data.orderId : null;
  } catch {
    return null;
  }
}

export function getActiveOrderData(currentTenantSlug?: string): StoredActiveOrder | null {
  try {
    const rawId = localStorage.getItem(STORAGE_KEY);
    const rawData = localStorage.getItem(DATA_STORAGE_KEY);

    if (!rawId || !rawData) {
      return null;
    }

    const parsed = JSON.parse(rawData) as StoredActiveOrder;
    if (!parsed || !parsed.orderId) {
      clearActiveOrder();
      return null;
    }

    // Regra 1: Pedidos encerrados (done ou cancelled) NUNCA devem ter banner ativo
    if (parsed.status === "done" || parsed.status === "cancelled") {
      clearActiveOrder();
      return null;
    }

    // Regra 2: Pedidos com mais de 24 horas expiram automaticamente
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - (parsed.timestamp || 0) > ONE_DAY_MS) {
      clearActiveOrder();
      return null;
    }

    // Regra 3: Se um tenantSlug for especificado, garantir isolamento multi-tenant
    if (currentTenantSlug && parsed.tenantSlug) {
      const cleanCurrent = currentTenantSlug.trim().toLowerCase();
      const cleanStored = parsed.tenantSlug.trim().toLowerCase();
      if (cleanCurrent !== cleanStored) {
        // Pedido pertence a outra loja, não exibir nesta
        return null;
      }
    }

    return parsed;
  } catch {
    clearActiveOrder();
    return null;
  }
}

export function updateActiveOrderStatus(status: OrderStatus): void {
  try {
    if (status === "done" || status === "cancelled") {
      clearActiveOrder();
      return;
    }

    const current = getActiveOrderData();
    if (current) {
      current.status = status;
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
}

export function clearActiveOrder(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DATA_STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("topfood-active-order-cleared"));
    }
  } catch (err) {
    console.warn("Failed to clear active order from localStorage:", err);
  }
}
