import { Hono } from "hono";
import { cors } from "hono/cors";
import { Database } from "./db";
import type { Env, OrderStatus, TenantStatus } from "./types";

export const api = new Hono<{ Bindings: Env }>();

// Enable CORS
api.use("*", cors());

// Helper to get Database instance using Hono's c.env
function getDb(c: any): Database {
  return new Database(c.env);
}

// ----------------- HEALTH CHECK -----------------
api.get("/health", (c) => {
  return c.json({
    status: "ok",
    runtime: "Hono Multi-tenant API",
    platform: c.env?.PLATFORM_NAME || "DeliveryHub",
    timestamp: Date.now(),
  });
});

// ----------------- AUTHENTICATION -----------------
api.post("/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, error: "E-mail e senha são obrigatórios" }, 400);
    }

    const db = getDb(c);
    const user = await db.authenticateUser(email, password);

    if (!user) {
      return c.json({ success: false, error: "Credenciais inválidas ou conta inativa" }, 401);
    }

    let tenant = null;
    if (user.role === "tenant_admin" && user.tenantId) {
      tenant = await db.getTenantByIdOrSlug(user.tenantId);
      if (tenant && tenant.status === "inactive") {
        return c.json(
          {
            success: false,
            error: "Esta lanchonete está desativada pela plataforma. Contate o suporte.",
          },
          403
        );
      }
    }

    return c.json({
      success: true,
      user,
      tenant,
      token: `auth-token-${user.id}-${Date.now()}`,
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro no login" }, 500);
  }
});

// ----------------- SUPER ADMIN CREDENTIALS UPDATE -----------------
api.put("/superadmin/credentials", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, userId } = body;

    if (!email || !password) {
      return c.json(
        { success: false, error: "Novo e-mail e nova senha são obrigatórios." },
        400
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (cleanPassword.length < 4) {
      return c.json(
        { success: false, error: "A nova senha deve possuir no mínimo 4 caracteres." },
        400
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return c.json(
        { success: false, error: "Formato de e-mail inválido. Verifique o endereço digitado." },
        400
      );
    }

    // Instantiates Database using Hono c.env (Cloudflare D1 binding via env.DB)
    const db = getDb(c);
    const updatedUser = await db.updateSuperAdminCredentials(userId, cleanEmail, cleanPassword);

    if (!updatedUser) {
      return c.json({ success: false, error: "Usuário Super Admin não encontrado." }, 404);
    }

    return c.json({
      success: true,
      message: "Credenciais do Super Admin atualizadas com sucesso no banco de dados Cloudflare D1!",
      user: updatedUser,
    });
  } catch (e: any) {
    return c.json(
      { success: false, error: e.message || "Erro ao atualizar credenciais do Super Admin." },
      500
    );
  }
});

// ----------------- PLATFORM STATS -----------------
api.get("/platform/stats", async (c) => {
  const db = getDb(c);
  const stats = await db.getPlatformStats();
  return c.json({ success: true, stats });
});

// ----------------- TENANTS MANAGEMENT -----------------
api.get("/tenants", async (c) => {
  const db = getDb(c);
  const tenants = await db.getTenants();

  // Attach products & orders count for the Super Admin overview
  const enriched = await Promise.all(
    tenants.map(async (t) => {
      const [products, orders] = await Promise.all([
        db.getProductsByTenant(t.id),
        db.getOrdersByTenant(t.id),
      ]);
      return {
        ...t,
        productCount: products.length,
        orderCount: orders.length,
        revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      };
    })
  );

  return c.json({ success: true, tenants: enriched });
});

// CREATE NEW TENANT + USER ACCOUNT (Super Admin)
api.post("/tenants", async (c) => {
  try {
    const body = await c.req.json();
    const { name, slug, email, password, whatsapp, pixKey, pixKeyType, deliveryFee, address, primaryColor } = body;

    if (!name || !email || !password) {
      return c.json(
        { success: false, error: "Nome da loja, e-mail e senha do cliente são obrigatórios" },
        400
      );
    }

    const db = getDb(c);

    // 1. Create clean/virgin tenant instance
    const tenant = await db.createTenant({
      name,
      slug,
      email,
      whatsapp: whatsapp || "5511999999999",
      pixKey: pixKey || email,
      pixKeyType: pixKeyType || "email",
      deliveryFee: Number(deliveryFee) || 5.0,
      address: address || "Centro",
      primaryColor: primaryColor || "#E63946",
    });

    // 2. Create tenant admin user account
    const user = await db.createUser({
      email,
      password,
      name: `Admin ${name}`,
      role: "tenant_admin",
      tenantId: tenant.id,
    });

    return c.json({
      success: true,
      message: "Lanchonete e conta criadas com sucesso!",
      tenant,
      user,
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao criar lanchonete" }, 500);
  }
});

// GET TENANT DETAILS BY ID OR SLUG
api.get("/tenants/:slugOrId", async (c) => {
  const db = getDb(c);
  const slugOrId = c.req.param("slugOrId");
  const tenant = await db.getTenantByIdOrSlug(slugOrId);

  if (!tenant) {
    return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
  }

  return c.json({ success: true, tenant });
});

// UPDATE TENANT SETTINGS
api.put("/tenants/:slugOrId", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const body = await c.req.json();

    const tenant = await db.getTenantByIdOrSlug(slugOrId);
    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    const updated = await db.updateTenant(tenant.id, body);
    return c.json({ success: true, tenant: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar" }, 500);
  }
});

// ACTIVATE / DEACTIVATE TENANT
api.patch("/tenants/:slugOrId/status", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const body = await c.req.json();
    const status: TenantStatus = body.status;

    if (!["active", "inactive"].includes(status)) {
      return c.json({ success: false, error: "Status inválido (use 'active' ou 'inactive')" }, 400);
    }

    const tenant = await db.getTenantByIdOrSlug(slugOrId);
    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    const updated = await db.setTenantStatus(tenant.id, status);
    return c.json({
      success: true,
      message: `Lanchonete ${status === "active" ? "ativada" : "desativada"} com sucesso`,
      tenant: updated,
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar status" }, 500);
  }
});

// DELETE TENANT
api.delete("/tenants/:slugOrId", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const tenant = await db.getTenantByIdOrSlug(slugOrId);

    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    await db.deleteTenant(tenant.id);
    return c.json({ success: true, message: "Lanchonete removida com sucesso" });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao excluir" }, 500);
  }
});

// ----------------- PRODUCTS FOR TENANT -----------------
api.get("/tenants/:slugOrId/products", async (c) => {
  const db = getDb(c);
  const slugOrId = c.req.param("slugOrId");
  const tenant = await db.getTenantByIdOrSlug(slugOrId);

  if (!tenant) {
    return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
  }

  const products = await db.getProductsByTenant(tenant.id);
  return c.json({ success: true, products });
});

api.post("/tenants/:slugOrId/products", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const tenant = await db.getTenantByIdOrSlug(slugOrId);

    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    const body = await c.req.json();
    const product = await db.createProduct(tenant.id, body);
    return c.json({ success: true, product });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao adicionar produto" }, 500);
  }
});

api.put("/tenants/:slugOrId/products/:productId", async (c) => {
  try {
    const db = getDb(c);
    const productId = c.req.param("productId");
    const body = await c.req.json();

    const product = await db.updateProduct(productId, body);
    if (!product) {
      return c.json({ success: false, error: "Produto não encontrado" }, 404);
    }
    return c.json({ success: true, product });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar produto" }, 500);
  }
});

api.delete("/tenants/:slugOrId/products/:productId", async (c) => {
  try {
    const db = getDb(c);
    const productId = c.req.param("productId");
    await db.deleteProduct(productId);
    return c.json({ success: true, message: "Produto removido" });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao remover produto" }, 500);
  }
});

// ----------------- ORDERS FOR TENANT -----------------
api.get("/tenants/:slugOrId/orders", async (c) => {
  const db = getDb(c);
  const slugOrId = c.req.param("slugOrId");
  const tenant = await db.getTenantByIdOrSlug(slugOrId);

  if (!tenant) {
    return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
  }

  const orders = await db.getOrdersByTenant(tenant.id);
  return c.json({ success: true, orders });
});

api.post("/tenants/:slugOrId/orders", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const tenant = await db.getTenantByIdOrSlug(slugOrId);

    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    if (tenant.status === "inactive") {
      return c.json(
        { success: false, error: "Esta loja está desativada no momento e não aceita novos pedidos." },
        400
      );
    }

    const body = await c.req.json();
    const order = await db.createOrder(tenant.id, body);
    return c.json({ success: true, order });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao criar pedido" }, 500);
  }
});

api.patch("/tenants/:slugOrId/orders/:orderId/status", async (c) => {
  try {
    const db = getDb(c);
    const orderId = c.req.param("orderId");
    const body = await c.req.json();
    const status: OrderStatus = body.status;

    const updated = await db.updateOrderStatus(orderId, status);
    if (!updated) {
      return c.json({ success: false, error: "Pedido não encontrado" }, 404);
    }
    return c.json({ success: true, order: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar pedido" }, 500);
  }
});

export default api;
