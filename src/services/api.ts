import type {
  Tenant,
  User,
  Product,
  Category,
  EstablishmentCategory,
  Order,
  OrderStatus,
  TenantStatus,
  TenantCredential,
  FinancialReportData,
  PlatformSettings,
  TopSellingProduct,
  FeaturedStoreRanked,
  StoreStory,
  AddonGroup,
} from "@/types";

const BASE_URL = "/api";

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem("topfood_auth_token") ||
    localStorage.getItem("topfood_auth_token") ||
    null
  );
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function loginApi(
  email: string,
  password: string,
  portal?: "store" | "superadmin"
): Promise<{
  success: boolean;
  user?: User;
  tenant?: Tenant | null;
  token?: string;
  error?: string;
  code?: string;
  isSuperAdmin?: boolean;
}> {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, portal }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Falha na conexão com o servidor" };
  }
}

export async function verifyAuthSessionApi(
  token: string,
  userId: string
): Promise<{
  success: boolean;
  user?: User;
  tenant?: Tenant | null;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token, userId }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro de conexão" };
  }
}

export async function fetchTenantsApi(location?: string): Promise<{
  success: boolean;
  tenants: (Tenant & { productCount: number; orderCount: number; revenue: number })[];
  error?: string;
}> {
  try {
    const timestamp = Date.now();
    const locQuery =
      location && location.trim() ? `&location=${encodeURIComponent(location.trim())}` : "";
    const res = await fetch(`${BASE_URL}/tenants?_t=${timestamp}${locQuery}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, tenants: [], error: err.message };
  }
}

export async function fetchTenantDetailsApi(slugOrId: string): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  try {
    const timestamp = Date.now();
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}?_t=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchLocalitiesApi(): Promise<{
  success: boolean;
  localities: string[];
  locations?: string[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/locations?_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    const data = await res.json();
    if (data.success && (Array.isArray(data.localities) || Array.isArray(data.locations))) {
      const rawList: string[] = Array.isArray(data.localities)
        ? data.localities
        : (data.locations || []).filter((l: string) => l !== "Todas as Localidades");
      return {
        success: true,
        localities: rawList,
        locations: data.locations || ["Todas as Localidades", ...rawList],
      };
    }
    return { success: false, localities: [], error: data.error };
  } catch (err: any) {
    return { success: false, localities: [], error: err.message };
  }
}

export async function createTenantApi(data: {
  name: string;
  slug?: string;
  email: string;
  password: string;
  whatsapp?: string;
  pixKey?: string;
  pixKeyType?: Tenant["pixKeyType"];
  deliveryFee?: number;
  address?: string;
  primaryColor?: string;
  bannerImage?: string;
  businessType?: string;
  isFeatured?: boolean;
  priorityOrder?: number;
  localidade?: string;
}): Promise<{ success: boolean; tenant?: Tenant; user?: User; error?: string; message?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTenantApi(
  slugOrId: string,
  partial: Partial<Tenant>
): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(partial),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTenantStatusApi(
  slugOrId: string,
  status: TenantStatus
): Promise<{ success: boolean; tenant?: Tenant; error?: string; message?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTenantMonthlyFeeApi(
  slugOrId: string,
  monthlyFee: number
): Promise<{ success: boolean; tenant?: Tenant; monthlyFee?: number; message?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/monthly-fee`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ monthlyFee }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function activateTenantSubscriptionApi(
  slugOrId: string,
  billingDay?: number
): Promise<{ success: boolean; tenant?: Tenant; billingDay?: number; nextDueDate?: number; message?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/activate-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ billingDay }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function confirmTenantPaymentApi(
  slugOrId: string
): Promise<{ success: boolean; tenant?: Tenant; billingDay?: number; paymentAt?: number; nextDueDate?: number; message?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cancelTenantSubscriptionApi(
  slugOrId: string
): Promise<{ success: boolean; tenant?: Tenant; message?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/cancel-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTenantApi(slugOrId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchTenantProductsApi(slugOrId: string): Promise<{ success: boolean; products: Product[]; error?: string }> {
  try {
    const timestamp = Date.now();
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/products?_t=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    if (!res.ok) {
      return { success: false, products: [], error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    let prods: Product[] = Array.isArray(data.products)
      ? data.products
      : Array.isArray(data.produtos)
      ? data.produtos
      : [];

    // Fallback caso a rota retorne vazio: tenta a rota em português /lojas/:slug/produtos
    if ((!prods || prods.length === 0) && slugOrId) {
      try {
        const altRes = await fetch(`${BASE_URL}/lojas/${encodeURIComponent(slugOrId)}/produtos?_t=${timestamp}`, {
          cache: "no-store",
        });
        if (altRes.ok) {
          const altData = await altRes.json();
          const altProds = Array.isArray(altData.products)
            ? altData.products
            : Array.isArray(altData.produtos)
            ? altData.produtos
            : [];
          if (altProds && altProds.length > 0) {
            prods = altProds;
          }
        }
      } catch {
        // ignore
      }
    }

    return { success: data.success !== false, products: prods };
  } catch (err: any) {
    return { success: false, products: [], error: err.message };
  }
}

export async function createTenantProductApi(
  slugOrId: string,
  product: Omit<Product, "id" | "tenantId">
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(product),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTenantProductApi(
  slugOrId: string,
  productId: string,
  partial: Partial<Product>
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(partial),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTenantProductApi(
  slugOrId: string,
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/products/${productId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reorderTenantProductsApi(
  slugOrId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/products/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ orderedIds }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchTenantCategoriesApi(
  slugOrId: string
): Promise<{ success: boolean; categories: Category[]; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/categories`);
    const data = await res.json();
    return { success: true, categories: data.categories || data.categorias || [] };
  } catch (err: any) {
    return { success: false, categories: [], error: err.message };
  }
}

export async function createTenantCategoryApi(
  slugOrId: string,
  category: { name: string; icon?: string }
): Promise<{ success: boolean; category?: Category; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(category),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ===================== GRUPOS DE ADICIONAIS / COMPLEMENTOS =====================

export async function fetchTenantAddonGroupsApi(
  slugOrId: string
): Promise<{ success: boolean; addonGroups: AddonGroup[]; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/addons`);
    const data = await res.json();
    return { success: true, addonGroups: data.addonGroups || data.grupos || [] };
  } catch (err: any) {
    return { success: false, addonGroups: [], error: err.message };
  }
}

export async function createTenantAddonGroupApi(
  slugOrId: string,
  group: Omit<AddonGroup, "id" | "tenantId">
): Promise<{ success: boolean; addonGroup?: AddonGroup; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/addons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(group),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTenantAddonGroupApi(
  slugOrId: string,
  groupId: string,
  partial: Partial<AddonGroup>
): Promise<{ success: boolean; addonGroup?: AddonGroup; error?: string }> {
  try {
    const res = await fetch(
      `${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/addons/${encodeURIComponent(groupId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(partial),
      }
    );
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTenantAddonGroupApi(
  slugOrId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/addons/${encodeURIComponent(groupId)}`,
      {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      }
    );
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchMerchantOrdersApi(
  storeId?: string
): Promise<{ success: boolean; orders: Order[]; pedidos?: Order[]; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const clean = storeId && typeof storeId === "string" ? encodeURIComponent(storeId.trim()) : "";
    const query = clean
      ? `?store_id=${clean}&loja_id=${clean}&tenantId=${clean}&_t=${Date.now()}`
      : `?_t=${Date.now()}`;
    const url = `${BASE_URL}/pedidos/loja${query}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        ...getAuthHeaders(),
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return {
        success: false,
        orders: [],
        pedidos: [],
        error: errData?.error || `Erro (${res.status}) ao buscar pedidos da loja.`,
      };
    }
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data.orders)
      ? data.orders
      : Array.isArray(data.pedidos)
      ? data.pedidos
      : Array.isArray(data)
      ? data
      : [];
    return { success: true, orders: list, pedidos: list };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      orders: [],
      pedidos: [],
      error: isTimeout
        ? "Tempo limite esgotado ao buscar pedidos da loja. Verifique sua conexão e tente novamente."
        : err?.message || "Erro de conexão ao buscar pedidos da loja.",
    };
  }
}

export async function fetchOrdersApi(
  tenantId?: string
): Promise<{ success: boolean; orders: Order[]; pedidos?: Order[]; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const authHeaders = getAuthHeaders();
    let url = `${BASE_URL}/orders?_t=${Date.now()}`;
    if (tenantId && tenantId.trim()) {
      const clean = encodeURIComponent(tenantId.trim());
      url = `${BASE_URL}/pedidos/loja?store_id=${clean}&loja_id=${clean}&tenantId=${clean}&_t=${Date.now()}`;
    }

    let res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        ...authHeaders,
      },
    });

    // Fallback de compatibilidade caso a rota /pedidos/loja retorne 404
    if (!res.ok && res.status === 404 && tenantId && tenantId.trim()) {
      const fallbackUrl = `${BASE_URL}/orders?tenantId=${encodeURIComponent(tenantId.trim())}&_t=${Date.now()}`;
      res = await fetch(fallbackUrl, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          ...authHeaders,
        },
      });
    }

    clearTimeout(timeoutId);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return { success: false, orders: [], pedidos: [], error: errData?.error || `Erro do servidor (${res.status}) ao buscar pedidos.` };
    }
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data.orders)
      ? data.orders
      : Array.isArray(data.pedidos)
      ? data.pedidos
      : Array.isArray(data)
      ? data
      : [];
    return { success: true, orders: list, pedidos: list };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      orders: [],
      pedidos: [],
      error: isTimeout
        ? "Tempo limite esgotado ao buscar pedidos. Verifique sua conexão e tente novamente."
        : (err?.message || "Erro de conexão ao buscar pedidos."),
    };
  }
}

export async function fetchTenantOrdersApi(
  slugOrId: string
): Promise<{ success: boolean; orders: Order[]; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders`, {
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      return { success: false, orders: [], error: errData?.error || `Erro do servidor (${res.status}) ao buscar pedidos.` };
    }
    const data = await res.json();
    const list = Array.isArray(data.orders) ? data.orders : (Array.isArray(data.pedidos) ? data.pedidos : []);
    return { success: true, orders: list };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      orders: [],
      error: isTimeout
        ? "Tempo limite esgotado ao buscar pedidos. Verifique sua conexão e tente novamente."
        : (err?.message || "Erro de conexão ao buscar pedidos."),
    };
  }
}

export async function createOrderApi(
  orderData: any,
  idempotencyKey?: string
): Promise<{ success: boolean; order?: Order; orderId?: string; duplicated?: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  const rawKey =
    idempotencyKey ||
    (orderData as any).idempotency_key ||
    (orderData as any).idempotencyKey ||
    (orderData as any).cart_id ||
    (orderData as any).cartId;
  const cleanKey = rawKey && typeof rawKey === "string" ? rawKey.trim() : undefined;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    };
    if (cleanKey) {
      try {
        const headerVal = cleanKey.replace(/[^a-zA-Z0-9_-]/g, "");
        if (headerVal) {
          headers["X-Idempotency-Key"] = headerVal;
        }
      } catch (_e) {
        void _e;
      }
    }

    const payload = {
      ...orderData,
      idempotency_key: cleanKey,
      idempotencyKey: cleanKey,
      cart_id: cleanKey,
    };

    const res = await fetch(`${BASE_URL}/pedidos`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `Erro ao registrar pedido (${res.status})` };
    }
    const returnedOrder = data.order || data.pedido || (data.orderId ? ({ id: data.orderId, ...orderData } as any) : undefined);
    return {
      success: true,
      order: returnedOrder,
      orderId: data.orderId || returnedOrder?.id,
      duplicated: Boolean(data.duplicated),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      error: isTimeout
        ? "Tempo limite esgotado ao enviar pedido. O servidor demorou para responder. Verifique sua conexão e tente novamente."
        : (err?.message || "Falha na conexão com o servidor ao registrar pedido."),
    };
  }
}

export async function createTenantOrderApi(
  slugOrId: string,
  orderData: Omit<Order, "id" | "tenantId" | "createdAt">,
  idempotencyKey?: string
): Promise<{ success: boolean; order?: Order; orderId?: string; duplicated?: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  const rawKey =
    idempotencyKey ||
    (orderData as any).idempotency_key ||
    (orderData as any).idempotencyKey ||
    (orderData as any).cart_id ||
    (orderData as any).cartId;
  const cleanKey = rawKey && typeof rawKey === "string" ? rawKey.trim() : undefined;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    };
    if (cleanKey) {
      try {
        const headerVal = cleanKey.replace(/[^a-zA-Z0-9_-]/g, "");
        if (headerVal) {
          headers["X-Idempotency-Key"] = headerVal;
        }
      } catch (_e) {
        void _e;
      }
    }

    const payload = {
      ...orderData,
      lojaSlug: slugOrId,
      slug: slugOrId,
      tenantId: slugOrId,
      idempotency_key: cleanKey,
      idempotencyKey: cleanKey,
      cart_id: cleanKey,
    };

    // 1. Tenta POST /api/pedidos com cabeçalho e payload de idempotência
    let res = await fetch(`${BASE_URL}/pedidos`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // Fallback caso a rota /pedidos retorne 404 em algum ambiente
    if (res.status === 404) {
      res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || `Erro ao registrar pedido (${res.status})` };
    }

    const returnedOrder = data.order || data.pedido || (data.orderId ? ({ id: data.orderId, ...orderData } as any) : undefined);
    return {
      success: true,
      order: returnedOrder,
      orderId: data.orderId || returnedOrder?.id,
      duplicated: Boolean(data.duplicated),
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    return {
      success: false,
      error: isTimeout
        ? "Tempo limite esgotado ao enviar pedido. O servidor demorou para responder. Verifique sua conexão e tente novamente."
        : (err?.message || "Falha na conexão com o servidor ao registrar pedido."),
    };
  }
}

export async function updateOrderStatusApi(
  orderId: string,
  status: OrderStatus | string,
  slugOrId?: string
): Promise<{ success: boolean; status?: string; order?: Order; error?: string }> {
  try {
    const cleanId = String(orderId).trim().replace(/^#/, "");
    const url = slugOrId
      ? `${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders/${encodeURIComponent(cleanId)}/status`
      : `${BASE_URL}/orders/${encodeURIComponent(cleanId)}/status`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status, novoStatus: status }),
    });

    if (!res.ok) {
      // Fallback para rota direta /pedidos/:id/status
      const fallbackRes = await fetch(`${BASE_URL}/pedidos/${encodeURIComponent(cleanId)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status, novoStatus: status }),
      });
      return await fallbackRes.json();
    }

    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTenantOrderStatusApi(
  slugOrId: string,
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; order?: Order; error?: string }> {
  return updateOrderStatusApi(orderId, status, slugOrId);
}

export async function fetchPlatformStatsApi() {
  try {
    const res = await fetch(`${BASE_URL}/platform/stats`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSuperAdminCredentialsApi(data: {
  email: string;
  password: string;
  userId?: string;
}): Promise<{
  success: boolean;
  message?: string;
  user?: User;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/superadmin/credentials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao conectar ao servidor" };
  }
}

export async function fetchAllTenantCredentialsApi(): Promise<{
  success: boolean;
  credentials: TenantCredential[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/superadmin/tenants/credentials`, {
      headers: { ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, credentials: [], error: err.message || "Erro ao buscar credenciais" };
  }
}

export async function fetchTenantCredentialsApi(slugOrId: string): Promise<{
  success: boolean;
  credentials?: TenantCredential;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/credentials`, {
      headers: { ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao buscar credenciais da loja" };
  }
}

export async function updateTenantCredentialsApi(
  slugOrId: string,
  data: {
    email: string;
    password: string;
    name?: string;
  }
): Promise<{
  success: boolean;
  message?: string;
  credentials?: TenantCredential;
  tenant?: Tenant;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/superadmin/tenants/${encodeURIComponent(slugOrId)}/credentials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao salvar credenciais da loja" };
  }
}

export async function fetchOrderDetailsApi(
  orderId: string,
  slugOrId?: string
): Promise<{ success: boolean; order?: Order; status?: OrderStatus; error?: string }> {
  try {
    const rawId = String(orderId || "").trim();
    if (!rawId) {
      return { success: false, error: "ID do pedido não informado" };
    }
    const cleanId = rawId.replace(/^#/, "");
    const timestamp = Date.now();
    const antiCacheHeaders = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    // 1. Tenta consulta direta individualizada em /api/orders/:orderId
    const primaryUrl = `${BASE_URL}/orders/${encodeURIComponent(cleanId)}?_t=${timestamp}`;
    let res = await fetch(primaryUrl, {
      method: "GET",
      cache: "no-store",
      headers: antiCacheHeaders,
    });

    // 2. Fallback para /api/pedidos/:id
    if (!res.ok && res.status === 404) {
      const fallbackUrl = `${BASE_URL}/pedidos/${encodeURIComponent(cleanId)}?_t=${timestamp}`;
      res = await fetch(fallbackUrl, {
        method: "GET",
        cache: "no-store",
        headers: antiCacheHeaders,
      });
    }

    // 3. Fallback com slug da loja /api/tenants/:slug/orders/:id se fornecido
    if (!res.ok && res.status === 404 && slugOrId) {
      const tenantUrl = `${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders/${encodeURIComponent(cleanId)}?_t=${timestamp}`;
      res = await fetch(tenantUrl, {
        method: "GET",
        cache: "no-store",
        headers: antiCacheHeaders,
      });
    }

    if (!res.ok) {
      return { success: false, error: `Pedido #${cleanId} não encontrado no banco de dados.` };
    }

    const data = await res.json();
    const resolvedOrder = data.order || data.pedido;
    if (resolvedOrder) {
      return {
        success: true,
        order: resolvedOrder,
        status: data.status || resolvedOrder.status,
      };
    }
    return { success: false, error: data.error || "Dados do pedido indisponíveis." };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro de conexão ao consultar status do pedido." };
  }
}

export async function fetchOrderStatusQuickApi(
  orderId: string
): Promise<{ success: boolean; status?: OrderStatus; order?: Order; error?: string }> {
  try {
    const rawId = String(orderId || "").trim();
    if (!rawId) return { success: false, error: "ID não informado" };
    const cleanId = rawId.replace(/^#/, "");
    const timestamp = Date.now();
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(cleanId)}/status?_t=${timestamp}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchTenantFinancialReportApi(
  slugOrId: string,
  params?: {
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{
  success: boolean;
  tenant?: { id: string; name: string; slug: string };
  period?: FinancialReportData["period"];
  metrics?: FinancialReportData["metrics"];
  dailyRevenue?: FinancialReportData["dailyRevenue"];
  paymentBreakdown?: FinancialReportData["paymentBreakdown"];
  orders?: Order[];
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.month) query.set("month", String(params.month));
    if (params?.year) query.set("year", String(params.year));
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);

    const queryString = query.toString();
    const url = `${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/financial-report${
      queryString ? `?${queryString}` : ""
    }`;

    const res = await fetch(url, {
      headers: { ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro de conexão ao carregar relatório financeiro",
    };
  }
}

export async function fetchEstablishmentCategoriesApi(location?: string): Promise<{
  success: boolean;
  categories?: EstablishmentCategory[];
  error?: string;
}> {
  try {
    const locQuery =
      location && location.trim() ? `?location=${encodeURIComponent(location.trim())}` : "";
    const res = await fetch(`${BASE_URL}/establishment-categories${locQuery}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createEstablishmentCategoryApi(data: {
  name: string;
  icon?: string;
  order?: number;
}): Promise<{
  success: boolean;
  category?: EstablishmentCategory;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/establishment-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteEstablishmentCategoryApi(
  id: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/establishment-categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ===================== APARÊNCIA DA VITRINE E LOJAS EM DESTAQUE =====================

export async function getPlatformSettingsApi(): Promise<{
  success: boolean;
  settings?: PlatformSettings;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/settings?_t=${Date.now()}`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePlatformSettingsApi(
  settings: Partial<PlatformSettings>,
  extraAuth?: { userId?: string; email?: string; password?: string; userRole?: string }
): Promise<{
  success: boolean;
  settings?: PlatformSettings;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/admin/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Role": "super_admin",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        ...settings,
        userRole: "super_admin",
        ...(extraAuth || {}),
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTenantFeaturedApi(
  slugOrId: string,
  isFeatured: boolean,
  priorityOrder?: number
): Promise<{
  success: boolean;
  tenant?: Tenant;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/featured`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Role": "super_admin",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        isFeatured,
        priorityOrder: priorityOrder !== undefined ? priorityOrder : 0,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchFeaturedStoresRankedApi(location?: string): Promise<{
  success: boolean;
  stores?: FeaturedStoreRanked[];
  error?: string;
}> {
  try {
    const timestamp = Date.now();
    const locQuery =
      location && location.trim() ? `&location=${encodeURIComponent(location.trim())}` : "";
    const res = await fetch(`${BASE_URL}/featured-stores?_t=${timestamp}${locQuery}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchTopSellingProductsApi(
  limit: number = 10,
  days: number = 30,
  location?: string
): Promise<{
  success: boolean;
  products?: TopSellingProduct[];
  error?: string;
}> {
  try {
    const timestamp = Date.now();
    const locQuery =
      location && location.trim() ? `&location=${encodeURIComponent(location.trim())}` : "";
    const res = await fetch(
      `${BASE_URL}/top-selling-products?limit=${limit}&days=${days}&_t=${timestamp}${locQuery}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchMarketplaceCatalogApi(location?: string): Promise<{
  success: boolean;
  products?: TopSellingProduct[];
  error?: string;
}> {
  try {
    const timestamp = Date.now();
    const locQuery =
      location && location.trim() ? `&location=${encodeURIComponent(location.trim())}` : "";
    const res = await fetch(`${BASE_URL}/products/catalog?_t=${timestamp}${locQuery}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// STORE STORIES API (APENAS FOTOS - EXPIRAÇÃO 24H)
// ==========================================

export async function fetchStoreStoriesApi(tenantIdOrSlug: string): Promise<{
  success: boolean;
  stories?: StoreStory[];
  error?: string;
}> {
  try {
    const timestamp = Date.now();
    const res = await fetch(`${BASE_URL}/stories?slug=${encodeURIComponent(tenantIdOrSlug)}&_t=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao carregar stories" };
  }
}

export async function fetchAllActiveStoriesApi(): Promise<{
  success: boolean;
  storiesByTenant?: Record<string, StoreStory[]>;
  error?: string;
}> {
  try {
    const timestamp = Date.now();
    const res = await fetch(`${BASE_URL}/stories/active?_t=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao carregar stories ativos" };
  }
}

export async function createStoreStoryApi(data: {
  tenantId?: string;
  slug?: string;
  mediaUrl: string;
  mediaType: "image";
  caption?: string;
}): Promise<{
  success: boolean;
  story?: StoreStory;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/stories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao publicar story" };
  }
}

export async function deleteStoreStoryApi(
  id: string,
  tenantId?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    const res = await fetch(`${BASE_URL}/stories/${encodeURIComponent(id)}${query}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao remover story" };
  }
}


