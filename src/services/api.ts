import type {
  Tenant,
  User,
  Product,
  Order,
  OrderStatus,
  TenantStatus,
} from "@/types";

const BASE_URL = "/api";

export async function loginApi(email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  tenant?: Tenant | null;
  token?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Falha na conexão com o servidor" };
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

export async function fetchTenantOrdersApi(slugOrId: string): Promise<{ success: boolean; orders: Order[]; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders`);
    return await res.json();
  } catch (err: any) {
    return { success: false, orders: [], error: err.message };
  }
}

export async function createTenantOrderApi(
  slugOrId: string,
  orderData: Omit<Order, "id" | "tenantId" | "createdAt">
): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
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
  try {
    const res = await fetch(`${BASE_URL}/tenants/${encodeURIComponent(slugOrId)}/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
