import type {
  Tenant,
  User,
  Product,
  Order,
  OrderStatus,
  TenantStatus,
  TenantCredential,
  FinancialReportData,
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

export async function fetchTenantsApi(): Promise<{ success: boolean; tenants: (Tenant & { productCount: number; orderCount: number; revenue: number })[]; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants`);
    return await res.json();
  } catch (err: any) {
    return { success: false, tenants: [], error: err.message };
  }
}

export async function fetchTenantDetailsApi(slugOrId: string): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
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
}): Promise<{ success: boolean; tenant?: Tenant; user?: User; error?: string; message?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchTenantProductsApi(slugOrId: string): Promise<{ success: boolean; products: Product[]; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/products`);
    return await res.json();
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchOrdersApi(tenantId?: string): Promise<{ success: boolean; orders: Order[]; error?: string }> {
  try {
    const url = tenantId ? `${BASE_URL}/orders?tenantId=${encodeURIComponent(tenantId)}` : `${BASE_URL}/orders`;
    const res = await fetch(url);
    return await res.json();
  } catch (err: any) {
    return { success: false, orders: [], error: err.message };
  }
}

export async function fetchTenantOrdersApi(slugOrId: string): Promise<{ success: boolean; orders: Order[]; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders`);
    return await res.json();
  } catch (err: any) {
    return { success: false, orders: [], error: err.message };
  }
}

export async function createOrderApi(
  orderData: any
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createTenantOrderApi(
  slugOrId: string,
  orderData: Omit<Order, "id" | "tenantId" | "createdAt">
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(orderData),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateOrderStatusApi(
  orderId: string,
  status: OrderStatus,
  slugOrId?: string
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const url = slugOrId
      ? `${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders/${encodeURIComponent(orderId)}/status`
      : `${BASE_URL}/orders/${encodeURIComponent(orderId)}/status`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });
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
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`${BASE_URL}/superadmin/tenants/credentials`);
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
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/credentials`);
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
      headers: { "Content-Type": "application/json" },
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
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const cleanId = encodeURIComponent(orderId);
    const url = slugOrId
      ? `${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders/${cleanId}`
      : `${BASE_URL}/orders/${cleanId}`;
    const res = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao consultar status do pedido" };
  }
}

export async function fetchOrderStatusQuickApi(
  orderId: string
): Promise<{ success: boolean; status?: OrderStatus; order?: Order; error?: string }> {
  try {
    const cleanId = encodeURIComponent(orderId.replace(/^#/, ""));
    const res = await fetch(`${BASE_URL}/orders/${cleanId}/status`, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
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

    const res = await fetch(url);
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro de conexão ao carregar relatório financeiro",
    };
  }
}


