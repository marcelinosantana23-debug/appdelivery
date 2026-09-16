import type { OrderStatus } from "@/types";

export interface StoredActiveOrder {
  orderId: string;
  tenantSlug?: string;
  storeName?: string;
  total?: number;
  status?: OrderStatus;
  timestamp: number;
}

const STORAGE_KEY = "topfood_active_order_id";
const DATA_STORAGE_KEY = "topfood_active_order_data";

export function saveActiveOrder(
  orderId: string,
  tenantSlug?: string,
  extra?: { storeName?: string; total?: number; status?: OrderStatus }
): void {
  try {
    if (!orderId) return;
    localStorage.setItem(STORAGE_KEY, orderId);

    const data: StoredActiveOrder = {
      orderId,
      tenantSlug,
      storeName: extra?.storeName,
      total: extra?.total,
      status: extra?.status || "received",
      timestamp: Date.now(),
    };
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save active order to localStorage:", err);
  }
}

export function getActiveOrderId(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export function getActiveOrderData(): StoredActiveOrder | null {
  try {
    const orderId = getActiveOrderId();
    if (!orderId) return null;

    const rawData = localStorage.getItem(DATA_STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData) as StoredActiveOrder;
      if (parsed && parsed.orderId) {
        return parsed;
      }
    }

    return {
      orderId,
      timestamp: Date.now(),
      status: "received",
    };
  } catch {
    return null;
  }
}

export function updateActiveOrderStatus(status: OrderStatus): void {
  try {
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
  } catch (err) {
    console.warn("Failed to clear active order from localStorage:", err);
  }
}
