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
const ALT_STORAGE_KEY = "active_order_id";
const DATA_STORAGE_KEY = "topfood_active_order_data";
const STATUS_STORAGE_KEY = "topfood_active_order_status";

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
    localStorage.setItem(ALT_STORAGE_KEY, orderId);
    if (extra?.status) {
      localStorage.setItem(STATUS_STORAGE_KEY, extra.status);
    }

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

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("topfood-active-order-updated", {
          detail: { orderId, status: data.status, orderData: data },
        })
      );
    }
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
    const rawId = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(ALT_STORAGE_KEY);
    const rawData = localStorage.getItem(DATA_STORAGE_KEY);

    if (!rawId) {
      return null;
    }

    let parsed: StoredActiveOrder | null = null;
    if (rawData) {
      try {
        parsed = JSON.parse(rawData) as StoredActiveOrder;
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      const storedStatus = (localStorage.getItem(STATUS_STORAGE_KEY) as OrderStatus) || "received";
      parsed = {
        orderId: rawId,
        status: storedStatus,
        timestamp: Date.now(),
      };
    }

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

    localStorage.setItem(STATUS_STORAGE_KEY, status);
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
    localStorage.removeItem(ALT_STORAGE_KEY);
    localStorage.removeItem(DATA_STORAGE_KEY);
    localStorage.removeItem(STATUS_STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("topfood-active-order-cleared"));
    }
  } catch (err) {
    console.warn("Failed to clear active order from localStorage:", err);
  }
}

// ==========================================
// PERSISTÊNCIA DO CLIENTE (CHECKOUT RÁPIDO)
// ==========================================
export interface StoredCustomerProfile {
  name: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  complement?: string;
  reference?: string;
  lastUpdated?: number;
}

const CUSTOMER_PROFILE_KEY = "topfood_customer_profile";

/**
 * Salva imediatamente no localStorage os dados essenciais do cliente:
 * Nome, Telefone, Endereço (Rua, Número, Bairro) e Ponto de Referência (+ complemento)
 */
export function saveCustomerProfile(profile: {
  name: string;
  phone: string;
  street?: string;
  number?: string;
  district?: string;
  complement?: string;
  reference?: string;
}): void {
  try {
    if (!profile.name && !profile.phone) return;

    const data: StoredCustomerProfile = {
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      street: profile.street?.trim() || "",
      number: profile.number?.trim() || "",
      district: profile.district?.trim() || "",
      complement: profile.complement?.trim() || "",
      reference: profile.reference?.trim() || "",
      lastUpdated: Date.now(),
    };

    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Falha ao salvar dados do cliente no localStorage:", err);
  }
}

/**
 * Recupera o perfil previamente salvo para auto-preenchimento instantâneo no checkout
 */
export function getCustomerProfile(): StoredCustomerProfile | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredCustomerProfile;
    if (!parsed || (!parsed.name && !parsed.phone)) {
      return null;
    }

    return {
      name: parsed.name || "",
      phone: parsed.phone || "",
      street: parsed.street || "",
      number: parsed.number || "",
      district: parsed.district || "",
      complement: parsed.complement || "",
      reference: parsed.reference || "",
      lastUpdated: parsed.lastUpdated,
    };
  } catch {
    return null;
  }
}

/**
 * Limpa os dados de auto-preenchimento do cliente caso ele deseje redefinir
 */
export function clearCustomerProfile(): void {
  try {
    localStorage.removeItem(CUSTOMER_PROFILE_KEY);
  } catch (err) {
    console.warn("Falha ao limpar dados do cliente:", err);
  }
}
