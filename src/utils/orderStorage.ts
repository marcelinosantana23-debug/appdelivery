import type { OrderStatus, OrderType } from "@/types";

export interface StoredActiveOrder {
  orderId: string;
  tenantSlug?: string;
  storeName?: string;
  total?: number;
  status?: OrderStatus;
  orderType?: OrderType;
  timestamp: number;
  completedAt?: number;
}

const STORAGE_KEY = "topfood_active_order_id";
const ALT_STORAGE_KEY = "active_order_id";
const DATA_STORAGE_KEY = "topfood_active_order_data";
const STATUS_STORAGE_KEY = "topfood_active_order_status";

export function toStandardStatus(raw: string | undefined | null): string {
  if (!raw) return "PENDENTE";
  const s = String(raw).toUpperCase().trim().replace(/[\s-]+/g, "_");
  if (
    s === "PENDENTE" ||
    s === "RECEIVED" ||
    s === "PENDING" ||
    s === "RECEBIDO" ||
    s === "NOVO"
  ) {
    return "PENDENTE";
  }
  if (
    s === "EM_PREPARO" ||
    s === "PREPARING" ||
    s === "EM_PRODUCAO" ||
    s === "PRODUCAO" ||
    s === "PREPARANDO" ||
    s === "CONFIRMED" ||
    s === "ACEITO" ||
    s === "PEDIDO_ACEITO"
  ) {
    return "EM_PREPARO";
  }
  if (
    s === "PRONTO" ||
    s === "READY" ||
    s === "PRONTO_BALCAO" ||
    s === "PRONTO_NO_BALCAO" ||
    s === "PRONTO_COZINHA" ||
    s === "PRONTO_MESA" ||
    s === "PRONTO_PARA_RETIRADA" ||
    s === "PRONTO_PARA_SERVIR"
  ) {
    return "PRONTO";
  }
  if (
    s === "SAIU_PARA_ENTREGA" ||
    s === "DELIVERING" ||
    s === "A_CAMINHO" ||
    s === "DISPATCHED" ||
    s === "OUT_FOR_DELIVERY" ||
    s === "EM_ENTREGA"
  ) {
    return "SAIU_PARA_ENTREGA";
  }
  if (
    s === "ENTREGUE" ||
    s === "DONE" ||
    s === "COMPLETED" ||
    s === "DELIVERED" ||
    s === "CONCLUIDO" ||
    s === "CONCLUÍDO" ||
    s === "FINALIZADO" ||
    s === "SERVIDO"
  ) {
    return "ENTREGUE";
  }
  if (s === "CANCELADO" || s === "CANCELLED" || s === "CANCELED") {
    return "CANCELADO";
  }
  return s;
}

export function toLegacyStatus(raw: string | undefined | null): OrderStatus {
  const std = toStandardStatus(raw);
  switch (std) {
    case "PENDENTE":
      return "received";
    case "EM_PREPARO":
      return "preparing";
    case "PRONTO":
    case "SAIU_PARA_ENTREGA":
      return "delivering";
    case "ENTREGUE":
      return "done";
    case "CANCELADO":
      return "cancelled";
    default:
      return "received";
  }
}

export function getStatusRank(raw: string | undefined | null): number {
  const std = toStandardStatus(raw);
  switch (std) {
    case "PENDENTE":
      return 0;
    case "EM_PREPARO":
      return 1;
    case "PRONTO":
      return 2;
    case "SAIU_PARA_ENTREGA":
      return 3;
    case "ENTREGUE":
      return 4;
    case "CANCELADO":
      return 99;
    default:
      return 0;
  }
}

export function getNextOrderStatus(
  currentStatus: string | undefined | null,
  isPickupOrDineIn: boolean = false
): string {
  const std = toStandardStatus(currentStatus);
  switch (std) {
    case "PENDENTE":
      // Ação 1 do Lojista: Aceitar Pedido
      return "EM_PREPARO";
    case "EM_PREPARO":
      // Ação 2 do Lojista: Pronto / Concluir (dinâmico pelo tipo de pedido)
      return isPickupOrDineIn ? "PRONTO" : "SAIU_PARA_ENTREGA";
    case "PRONTO":
    case "SAIU_PARA_ENTREGA":
      return "ENTREGUE";
    default:
      return "ENTREGUE";
  }
}

export function getStatusStepIndex(status: string | undefined | null): number {
  if (!status) return 0;
  const s = toStandardStatus(status);
  switch (s) {
    case "PENDENTE":
      return 0; // 1. Pedido Recebido
    case "EM_PREPARO":
      return 1; // 2. Pedido Aceito
    case "PRONTO":
    case "SAIU_PARA_ENTREGA":
      return 2; // 3. Saiu para Entrega / Pronto para Retirada no Balcão / Pronto para Servir na Mesa
    case "ENTREGUE":
      return 3; // 4. Finalizado / Entregue
    default:
      return 0;
  }
}

/**
 * Normaliza qualquer variante de status de pedido (ex: português, inglês, banco D1)
 * para o enum estrito OrderStatus ("received" | "preparing" | "delivering" | "done" | "cancelled")
 */
export function normalizeOrderStatus(raw: string | undefined | null): OrderStatus {
  if (!raw) return "received";
  const s = String(raw).toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (
    s === "pending" ||
    s === "recebido" ||
    s === "received" ||
    s === "pendente" ||
    s === "novo"
  ) {
    return "received";
  }
  if (
    s === "preparing" ||
    s === "em_preparo" ||
    s === "preparo" ||
    s === "producao" ||
    s === "em_producao" ||
    s === "aceito"
  ) {
    return "preparing";
  }
  if (
    s === "delivering" ||
    s === "saiu_para_entrega" ||
    s === "a_caminho" ||
    s === "entrega" ||
    s === "pronto" ||
    s === "pronto_balcao"
  ) {
    return "delivering";
  }
  if (
    s === "completed" ||
    s === "done" ||
    s === "entregue" ||
    s === "concluido" ||
    s === "concluído" ||
    s === "finalizado"
  ) {
    return "done";
  }
  if (s === "cancelled" || s === "cancelado") {
    return "cancelled";
  }
  return (raw as OrderStatus) || "received";
}

let orderBroadcastChannel: BroadcastChannel | null = null;
export function getOrderBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    if (!orderBroadcastChannel) {
      orderBroadcastChannel = new BroadcastChannel("topfood_order_events");
    }
    return orderBroadcastChannel;
  }
  return null;
}

export function saveActiveOrder(
  orderId: string,
  tenantSlug?: string,
  extra?: { storeName?: string; total?: number; status?: OrderStatus | string; orderType?: OrderType }
): void {
  try {
    if (!orderId) return;

    const normStatus = normalizeOrderStatus(extra?.status || "received");

    // Se o pedido já for finalizado ou cancelado, não salva como ativo
    if (normStatus === "done" || normStatus === "cancelled") {
      clearActiveOrder();
      return;
    }

    localStorage.setItem(STORAGE_KEY, orderId);
    localStorage.setItem(ALT_STORAGE_KEY, orderId);
    localStorage.setItem(STATUS_STORAGE_KEY, normStatus);

    const data: StoredActiveOrder = {
      orderId,
      tenantSlug,
      storeName: extra?.storeName,
      total: extra?.total,
      status: normStatus,
      orderType: extra?.orderType || "delivery",
      timestamp: Date.now(),
    };
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("topfood-active-order-updated", {
          detail: { orderId, status: normStatus, orderData: data },
        })
      );
    }

    const bc = getOrderBroadcastChannel();
    if (bc) {
      bc.postMessage({
        type: "ACTIVE_ORDER_UPDATED",
        orderId,
        status: normStatus,
        orderData: data,
      });
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
      const storedStatus = normalizeOrderStatus(localStorage.getItem(STATUS_STORAGE_KEY));
      parsed = {
        orderId: rawId,
        status: storedStatus,
        timestamp: Date.now(),
      };
    } else {
      parsed.status = normalizeOrderStatus(parsed.status);
    }

    if (!parsed || !parsed.orderId) {
      clearActiveOrder();
      return null;
    }

    // Regra 1: Pedidos encerrados (done ou cancelled)
    // Permite uma janela de 8 segundos para a barra do cliente exibir "Entregue" antes de limpar
    if (parsed.status === "done" || parsed.status === "cancelled") {
      const completionTime = parsed.completedAt || parsed.timestamp || 0;
      if (Date.now() - completionTime > 8000) {
        clearActiveOrder();
        return null;
      }
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

export function updateActiveOrderStatus(status: OrderStatus | string): void {
  try {
    const norm = normalizeOrderStatus(status);
    localStorage.setItem(STATUS_STORAGE_KEY, norm);
    const rawData = localStorage.getItem(DATA_STORAGE_KEY);
    let orderId = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(ALT_STORAGE_KEY) || "";

    let current: StoredActiveOrder = {
      orderId,
      status: norm,
      timestamp: Date.now(),
    };

    if (rawData) {
      try {
        current = JSON.parse(rawData) as StoredActiveOrder;
        current.status = norm;
        orderId = current.orderId || orderId;
      } catch {
        // ignore
      }
    }

    if (norm === "done" || norm === "cancelled") {
      if (!current.completedAt) {
        current.completedAt = Date.now();
      }
    }

    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(current));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("topfood-active-order-updated", {
          detail: { orderId, status: norm, orderData: current },
        })
      );
    }

    const bc = getOrderBroadcastChannel();
    if (bc) {
      bc.postMessage({
        type: "ACTIVE_ORDER_UPDATED",
        orderId,
        status: norm,
        orderData: current,
      });
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
    const bc = getOrderBroadcastChannel();
    if (bc) {
      bc.postMessage({ type: "ACTIVE_ORDER_CLEARED" });
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
