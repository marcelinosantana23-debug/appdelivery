import { Hono } from "hono";
import { cors } from "hono/cors";
import { Database } from "./db";
import type { Env, OrderStatus, TenantStatus, OrderItem } from "./types";

export const api = new Hono<{ Bindings: Env }>();

// Habilitar CORS para consumo do frontend Vite e clientes externos
api.use("*", cors());

// Helper para instanciar a camada de banco de dados diretamente com o objeto env da requisição Cloudflare Workers
function getDb(c: any): Database {
  return new Database(c.env);
}

// Mapeamento de status amigáveis para pedidos (Português <-> Inglês)
export const STATUS_MAP_PT_TO_EN: Record<string, OrderStatus> = {
  "Pendente": "received",
  "pendente": "received",
  "recebido": "received",
  "Recebido": "received",
  "Em Preparo": "preparing",
  "em preparo": "preparing",
  "preparando": "preparing",
  "Saiu para Entrega": "delivering",
  "saiu para entrega": "delivering",
  "em entrega": "delivering",
  "Concluído": "done",
  "concluido": "done",
  "finalizado": "done",
  "Cancelado": "cancelled",
  "cancelado": "cancelled",
};

export const STATUS_MAP_EN_TO_PT: Record<OrderStatus, string> = {
  received: "Pendente",
  preparing: "Em Preparo",
  delivering: "Saiu para Entrega",
  done: "Concluído",
  cancelled: "Cancelado",
};

export function normalizeOrderStatus(statusInput: string): OrderStatus {
  if (!statusInput) return "received";
  const mapped = STATUS_MAP_PT_TO_EN[statusInput.trim()];
  if (mapped) return mapped;
  if (["received", "preparing", "delivering", "done", "cancelled"].includes(statusInput.toLowerCase())) {
    return statusInput.toLowerCase() as OrderStatus;
  }
  return "received";
}

// -----------------------------------------------------------------------------
// 1. HEALTH CHECK & STATUS DOS RECURSOS CLOUDFLARE (D1 & KV)
// -----------------------------------------------------------------------------

api.get("/health", (c) => {
  const hasD1 = Boolean(c.env?.DB);
  const hasKV = Boolean(c.env?.KV || c.env?.STORE_KV);

  return c.json({
    status: "ok",
    runtime: "Cloudflare Workers / Hono",
    platform: c.env?.PLATFORM_NAME || "DeliveryHub Multi-tenant",
    cloudflare: {
      d1Database: hasD1 ? "Conectado (c.env.DB)" : "Modo desenvolvimento local em memória",
      kvStorage: hasKV ? "Conectado (c.env.KV / c.env.STORE_KV)" : "Modo desenvolvimento local em memória",
    },
    timestamp: Date.now(),
  }, 200);
});

api.get("/cloudflare/status", (c) => {
  const hasD1 = Boolean(c.env?.DB);
  const hasKV = Boolean(c.env?.KV || c.env?.STORE_KV);

  return c.json({
    success: true,
    environment: c.env?.ENVIRONMENT || "development",
    bindings: {
      d1: hasD1,
      kv: hasKV,
    },
    message: hasD1 && hasKV
      ? "Cloudflare D1 e KV operando em produção via bindings do Cloudflare Workers."
      : "Operando em modo de desenvolvimento local com persistência resiliente.",
  }, 200);
});

// -----------------------------------------------------------------------------
// 2. GESTÃO DE LOJAS (Criação e Leitura no D1 / KV)
// -----------------------------------------------------------------------------

// POST /api/lojas - Cadastra uma nova loja no Cloudflare D1 / KV com dados completos
api.post("/lojas", async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c);

    // Validação dos dados obrigatórios
    const nome = body.nome || body.name;
    const email = body.email;
    const senha = body.senha || body.password || "123456";

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return c.json({
        success: false,
        error: "O nome da loja (nome/name) é obrigatório.",
      }, 400);
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return c.json({
        success: false,
        error: "Um e-mail válido para a administração da loja é obrigatório.",
      }, 400);
    }

    const slug = body.slug ? String(body.slug).trim().toLowerCase() : undefined;
    const whatsapp = body.whatsapp ? String(body.whatsapp).replace(/\D/g, "") : "5511999999999";
    const horario = body.horario || body.hours || "18:00 - 23:30";
    const endereco = body.endereco || body.address || "Centro";
    const taxaEntrega = Number(body.taxaEntrega ?? body.deliveryFee ?? 5.0);
    const chavePix = body.chavePix || body.pixKey || email;
    const tipoChavePix = body.tipoChavePix || body.pixKeyType || "email";
    const corPrimaria = body.corPrimaria || body.primaryColor || "#E63946";
    const bannerImage = body.bannerImage || "";
    const logo = body.logo || "🍔";
    const slogan = body.slogan || body.tagline || `Lanches e porções artesanais - ${nome}`;

    // 1. Criar loja no D1 / KV
    const novaLoja = await db.createTenant({
      name: nome.trim(),
      slug,
      email: email.trim().toLowerCase(),
      whatsapp,
      pixKey: chavePix,
      pixKeyType: tipoChavePix,
      deliveryFee: isNaN(taxaEntrega) ? 5.0 : taxaEntrega,
      address: endereco,
      primaryColor: corPrimaria,
      bannerImage,
    });

    // Se houver campos adicionais de horário, logo ou slogan, atualiza
    if (horario || logo || slogan) {
      await db.updateTenant(novaLoja.id, {
        hours: horario,
        logo,
        tagline: slogan,
      });
      novaLoja.hours = horario;
      novaLoja.logo = logo;
      novaLoja.tagline = slogan;
    }

    // 2. Criar usuário administrador para o lojista
    const usuario = await db.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      name: `Admin ${nome}`,
      role: "tenant_admin",
      tenantId: novaLoja.id,
    });

    return c.json({
      success: true,
      message: "Loja cadastrada com sucesso no Cloudflare D1/KV!",
      loja: novaLoja,
      admin: usuario,
    }, 201);
  } catch (err: any) {
    return c.json({
      success: false,
      error: err.message || "Erro interno ao cadastrar loja.",
    }, 500);
  }
});

// GET /api/lojas - Lista todas as lojas cadastradas
api.get("/lojas", async (c) => {
  try {
    const db = getDb(c);
    const lojas = await db.getTenants();

    const enriquecidas = await Promise.all(
      lojas.map(async (l) => {
        const [produtos, pedidos] = await Promise.all([
          db.getProductsByTenant(l.id),
          db.getOrdersByTenant(l.id),
        ]);
        return {
          ...l,
          totalProdutos: produtos.length,
          totalPedidos: pedidos.length,
          faturamento: pedidos.reduce((acc, p) => acc + (p.total || 0), 0),
        };
      })
    );

    return c.json({ success: true, lojas: enriquecidas }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao listar lojas." }, 500);
  }
});

// GET /api/lojas/:slug - Busca os dados de uma loja específica pelo slug (ex: 'marcelino')
api.get("/lojas/:slug", async (c) => {
  try {
    const db = getDb(c);
    const slug = c.req.param("slug");

    if (!slug) {
      return c.json({ success: false, error: "Slug da loja não informado." }, 400);
    }

    const loja = await db.getTenantByIdOrSlug(slug);

    if (!loja) {
      return c.json({
        success: false,
        error: `Nenhuma loja encontrada com o slug '${slug}'.`,
      }, 404);
    }

    return c.json({
      success: true,
      loja,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao buscar loja." }, 500);
  }
});

// PUT /api/lojas/:slug - Atualiza dados e configurações da loja
api.put("/lojas/:slug", async (c) => {
  try {
    const db = getDb(c);
    const slug = c.req.param("slug");
    const body = await c.req.json();

    const loja = await db.getTenantByIdOrSlug(slug);
    if (!loja) {
      return c.json({ success: false, error: "Loja não encontrada." }, 404);
    }

    // Mapear campos em português para o modelo
    const partial: any = {};
    if (body.nome || body.name) partial.name = body.nome || body.name;
    if (body.horario || body.hours) partial.hours = body.horario || body.hours;
    if (body.endereco || body.address) partial.address = body.endereco || body.address;
    if (body.whatsapp) partial.whatsapp = String(body.whatsapp).replace(/\D/g, "");
    if (body.taxaEntrega !== undefined || body.deliveryFee !== undefined) {
      partial.deliveryFee = Number(body.taxaEntrega ?? body.deliveryFee);
    }
    if (body.chavePix || body.pixKey) partial.pixKey = body.chavePix || body.pixKey;
    if (body.tipoChavePix || body.pixKeyType) partial.pixKeyType = body.tipoChavePix || body.pixKeyType;
    if (body.corPrimaria || body.primaryColor) partial.primaryColor = body.corPrimaria || body.primaryColor;
    if (body.bannerImage !== undefined) partial.bannerImage = body.bannerImage;
    if (body.logo) partial.logo = body.logo;
    if (body.slogan || body.tagline) partial.tagline = body.slogan || body.tagline;
    if (body.isOpen !== undefined) partial.isOpen = Boolean(body.isOpen);

    const atualizada = await db.updateTenant(loja.id, partial);
    return c.json({
      success: true,
      message: "Configurações da loja atualizadas com sucesso no Cloudflare D1/KV.",
      loja: atualizada,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao atualizar loja." }, 500);
  }
});

// PATCH /api/lojas/:slug/status - Ativa ou desativa a loja
api.patch("/lojas/:slug/status", async (c) => {
  try {
    const db = getDb(c);
    const slug = c.req.param("slug");
    const body = await c.req.json();
    const status: TenantStatus = body.status;

    if (!["active", "inactive"].includes(status)) {
      return c.json({
        success: false,
        error: "Status inválido. Use 'active' ou 'inactive'.",
      }, 400);
    }

    const loja = await db.getTenantByIdOrSlug(slug);
    if (!loja) {
      return c.json({ success: false, error: "Loja não encontrada." }, 404);
    }

    const atualizada = await db.setTenantStatus(loja.id, status);
    return c.json({
      success: true,
      message: `Loja ${status === "active" ? "ativada" : "desativada"} com sucesso.`,
      loja: atualizada,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao alterar status." }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. CARDÁPIO E PRODUTOS (D1 & KV)
// -----------------------------------------------------------------------------

// GET /api/lojas/:slug/produtos - Listar todos os produtos de uma loja
api.get("/lojas/:slug/produtos", async (c) => {
  try {
    const db = getDb(c);
    const slug = c.req.param("slug");
    const loja = await db.getTenantByIdOrSlug(slug);

    if (!loja) {
      return c.json({ success: false, error: "Loja não encontrada." }, 404);
    }

    const produtos = await db.getProductsByTenant(loja.id);
    return c.json({
      success: true,
      loja: { id: loja.id, nome: loja.name, slug: loja.slug },
      produtos,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao listar produtos." }, 500);
  }
});

// GET /api/lojas/:slug/categorias - Agrupamento de categorias com produtos
api.get("/lojas/:slug/categorias", async (c) => {
  try {
    const db = getDb(c);
    const slug = c.req.param("slug");
    const loja = await db.getTenantByIdOrSlug(slug);

    if (!loja) {
      return c.json({ success: false, error: "Loja não encontrada." }, 404);
    }

    const produtos = await db.getProductsByTenant(loja.id);
    const categoriasMap: Record<string, typeof produtos> = {};

    produtos.forEach((p) => {
      const cat = p.category || "Geral";
      if (!categoriasMap[cat]) {
        categoriasMap[cat] = [];
      }
      categoriasMap[cat].push(p);
    });

    const resultado = Object.entries(categoriasMap).map(([nome, itens]) => ({
      categoria: nome,
      totalItens: itens.length,
      produtos: itens,
    }));

    return c.json({ success: true, categorias: resultado }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao obter categorias." }, 500);
  }
});

// POST /api/lojas/:slug/produtos - Cadastrar novo produto na loja
api.post("/lojas/:slug/produtos", async (c) => {
  try {
    const db = getDb(c);
    const slug = c.req.param("slug");
    const loja = await db.getTenantByIdOrSlug(slug);

    if (!loja) {
      return c.json({ success: false, error: "Loja não encontrada." }, 404);
    }

    const body = await c.req.json();
    const nome = body.nome || body.name;
    const preco = Number(body.preco ?? body.price);

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return c.json({ success: false, error: "O nome do produto é obrigatório." }, 400);
    }

    if (isNaN(preco) || preco < 0) {
      return c.json({ success: false, error: "Preço do produto deve ser um número válido positivo." }, 400);
    }

    const novoProduto = await db.createProduct(loja.id, {
      name: nome.trim(),
      description: body.descricao || body.description || "",
      price: preco,
      category: body.categoria || body.category || "lanches",
      image: body.imagem || body.image || "",
      available: body.disponivel !== undefined ? Boolean(body.disponivel) : body.available !== undefined ? Boolean(body.available) : true,
      options: body.opcionais || body.options || [],
    });

    return c.json({
      success: true,
      message: "Produto cadastrado com sucesso no Cloudflare D1/KV!",
      produto: novoProduto,
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao criar produto." }, 500);
  }
});

// PUT /api/lojas/:slug/produtos/:id - Editar produto
api.put("/lojas/:slug/produtos/:id", async (c) => {
  try {
    const db = getDb(c);
    const produtoId = c.req.param("id");
    const body = await c.req.json();

    const partial: any = {};
    if (body.nome || body.name) partial.name = body.nome || body.name;
    if (body.descricao !== undefined || body.description !== undefined) {
      partial.description = body.descricao !== undefined ? body.descricao : body.description;
    }
    if (body.preco !== undefined || body.price !== undefined) {
      partial.price = Number(body.preco ?? body.price);
    }
    if (body.categoria || body.category) partial.category = body.categoria || body.category;
    if (body.imagem !== undefined || body.image !== undefined) {
      partial.image = body.imagem !== undefined ? body.imagem : body.image;
    }
    if (body.disponivel !== undefined || body.available !== undefined) {
      partial.available = Boolean(body.disponivel ?? body.available);
    }
    if (body.opcionais || body.options) partial.options = body.opcionais || body.options;

    const atualizado = await db.updateProduct(produtoId, partial);
    if (!atualizado) {
      return c.json({ success: false, error: "Produto não encontrado." }, 404);
    }

    return c.json({
      success: true,
      message: "Produto atualizado com sucesso no Cloudflare D1/KV.",
      produto: atualizado,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao atualizar produto." }, 500);
  }
});

// DELETE /api/lojas/:slug/produtos/:id - Remover produto
api.delete("/lojas/:slug/produtos/:id", async (c) => {
  try {
    const db = getDb(c);
    const produtoId = c.req.param("id");

    await db.deleteProduct(produtoId);
    return c.json({
      success: true,
      message: "Produto removido com sucesso do Cloudflare D1/KV.",
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao excluir produto." }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. FLUXO COMPLETO DE PEDIDOS (D1 & KV)
// -----------------------------------------------------------------------------

// POST /api/pedidos - Criar novo pedido no Cloudflare D1 / KV
api.post("/pedidos", async (c) => {
  try {
    const db = getDb(c);
    const body = await c.req.json();

    // 1. Identificar a loja vinculada
    const lojaRef = body.lojaSlug || body.slug || body.lojaId || body.tenantId || "marcelino";
    const loja = await db.getTenantByIdOrSlug(lojaRef);

    if (!loja) {
      return c.json({
        success: false,
        error: `Loja '${lojaRef}' não encontrada para vinculação do pedido.`,
      }, 404);
    }

    if (loja.status === "inactive") {
      return c.json({
        success: false,
        error: "Esta loja está temporariamente fechada ou inativa no sistema.",
      }, 400);
    }

    // 2. Validação dos dados do cliente
    const cliente = body.cliente || body.customerName;
    const telefone = body.telefone || body.customerPhone;
    const itens = body.itens || body.items;

    if (!cliente || typeof cliente !== "string" || !cliente.trim()) {
      return c.json({ success: false, error: "Nome do cliente é obrigatório." }, 400);
    }

    if (!telefone || typeof telefone !== "string" || !telefone.trim()) {
      return c.json({ success: false, error: "Telefone do cliente é obrigatório." }, 400);
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      return c.json({ success: false, error: "O pedido deve conter pelo menos 1 item." }, 400);
    }

    // 3. Normalização de valores e cálculos
    const tipoEntrega = body.tipoEntrega || body.orderType || "delivery";
    const formaPagamento = body.formaPagamento || body.paymentMethod || "pix";
    const endereco = body.endereco || body.address;
    const trocoPara = body.trocoPara || body.changeFor;
    const taxaEntrega = tipoEntrega === "delivery" ? Number(body.taxaEntrega ?? body.deliveryFee ?? loja.deliveryFee ?? 5.0) : 0;

    let subtotal = Number(body.subtotal);
    if (isNaN(subtotal) || subtotal <= 0) {
      subtotal = itens.reduce((sum: number, it: any) => {
        const precoItem = Number(it.product?.price ?? it.preco ?? it.price ?? 0);
        const qtd = Number(it.quantity ?? it.quantidade ?? 1);
        const opcionaisTotal = (it.selectedOptions || it.opcionais || []).reduce(
          (oSum: number, opt: any) => oSum + Number(opt.price || opt.preco || 0),
          0
        );
        return sum + (precoItem + opcionaisTotal) * qtd;
      }, 0);
    }

    const total = Number(body.total ?? (subtotal + taxaEntrega));
    const statusInicial: OrderStatus = normalizeOrderStatus(body.status || "Pendente");

    // 4. Salvar pedido no D1 e KV
    const novoPedido = await db.createOrder(loja.id, {
      customerName: cliente.trim(),
      customerPhone: telefone.trim(),
      orderType: tipoEntrega,
      paymentMethod: formaPagamento,
      address: endereco,
      changeFor: trocoPara,
      subtotal,
      deliveryFee: taxaEntrega,
      total,
      status: statusInicial,
      items: itens as OrderItem[],
      statusHistory: [{ status: statusInicial, timestamp: Date.now() }],
    });

    return c.json({
      success: true,
      message: "Pedido registrado com sucesso no Cloudflare D1/KV!",
      pedido: {
        ...novoPedido,
        statusPt: STATUS_MAP_EN_TO_PT[novoPedido.status] || "Pendente",
        loja: { id: loja.id, nome: loja.name, slug: loja.slug },
      },
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro interno ao processar pedido." }, 500);
  }
});

// GET /api/pedidos - Listar pedidos (com suporte a filtro ?loja=marcelino)
api.get("/pedidos", async (c) => {
  try {
    const db = getDb(c);
    const lojaQuery = c.req.query("loja") || c.req.query("tenantId") || "marcelino";

    const loja = await db.getTenantByIdOrSlug(lojaQuery);
    if (!loja) {
      return c.json({ success: false, error: `Loja '${lojaQuery}' não encontrada.` }, 404);
    }

    const pedidos = await db.getOrdersByTenant(loja.id);
    const pedidosFormatados = pedidos.map((p) => ({
      ...p,
      statusPt: STATUS_MAP_EN_TO_PT[p.status] || p.status,
    }));

    return c.json({
      success: true,
      loja: { id: loja.id, nome: loja.name, slug: loja.slug },
      pedidos: pedidosFormatados,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao buscar pedidos." }, 500);
  }
});

// GET /api/lojas/:slug/pedidos - Listar pedidos de uma loja específica para o painel admin
api.get("/lojas/:slug/pedidos", async (c) => {
  try {
    const db = getDb(c);
    const slug = c.req.param("slug");
    const loja = await db.getTenantByIdOrSlug(slug);

    if (!loja) {
      return c.json({ success: false, error: "Loja não encontrada." }, 404);
    }

    const pedidos = await db.getOrdersByTenant(loja.id);
    const formatados = pedidos.map((p) => ({
      ...p,
      statusPt: STATUS_MAP_EN_TO_PT[p.status] || p.status,
    }));

    return c.json({
      success: true,
      loja: { id: loja.id, nome: loja.name, slug: loja.slug },
      pedidos: formatados,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao obter pedidos da loja." }, 500);
  }
});

// GET /api/pedidos/:id - Detalhes de um pedido específico
api.get("/pedidos/:id", async (c) => {
  try {
    const db = getDb(c);
    const pedidoId = c.req.param("id");
    const pedido = await db.getOrderById(pedidoId);

    if (!pedido) {
      return c.json({ success: false, error: "Pedido não encontrado." }, 404);
    }

    return c.json({
      success: true,
      pedido: {
        ...pedido,
        statusPt: STATUS_MAP_EN_TO_PT[pedido.status] || pedido.status,
      },
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao consultar pedido." }, 500);
  }
});

// PATCH & PUT /api/pedidos/:id/status - Atualizar status do pedido no D1 / KV
const handleStatusUpdate = async (c: any) => {
  try {
    const db = getDb(c);
    const pedidoId = c.req.param("id");
    const body = await c.req.json();
    const statusInput = body.status || body.novoStatus;

    if (!statusInput) {
      return c.json({
        success: false,
        error: "O campo 'status' é obrigatório (ex: 'Pendente', 'Em Preparo', 'Saiu para Entrega', 'Concluído', 'Cancelado').",
      }, 400);
    }

    const statusNormalizado = normalizeOrderStatus(statusInput);
    const atualizado = await db.updateOrderStatus(pedidoId, statusNormalizado);

    if (!atualizado) {
      return c.json({ success: false, error: "Pedido não encontrado para atualização." }, 404);
    }

    return c.json({
      success: true,
      message: `Status do pedido atualizado para '${STATUS_MAP_EN_TO_PT[statusNormalizado]}' no Cloudflare D1/KV!`,
      pedido: {
        ...atualizado,
        statusPt: STATUS_MAP_EN_TO_PT[atualizado.status] || atualizado.status,
      },
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao atualizar status do pedido." }, 500);
  }
};

api.patch("/pedidos/:id/status", handleStatusUpdate);
api.put("/pedidos/:id/status", handleStatusUpdate);
api.patch("/pedidos/:id", handleStatusUpdate);

// -----------------------------------------------------------------------------
// 5. ROTAS DE COMPATIBILIDADE COM A INTERFACE EXISTENTE (/tenants, /auth)
// -----------------------------------------------------------------------------

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
    }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro no login" }, 500);
  }
});

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

    const db = getDb(c);
    const updatedUser = await db.updateSuperAdminCredentials(userId, cleanEmail, cleanPassword);

    if (!updatedUser) {
      return c.json({ success: false, error: "Usuário Super Admin não encontrado." }, 404);
    }

    return c.json({
      success: true,
      message: "Credenciais do Super Admin atualizadas com sucesso!",
      user: updatedUser,
    }, 200);
  } catch (e: any) {
    return c.json(
      { success: false, error: e.message || "Erro ao atualizar credenciais do Super Admin." },
      500
    );
  }
});

api.get("/platform/stats", async (c) => {
  const db = getDb(c);
  const stats = await db.getPlatformStats();
  return c.json({ success: true, stats }, 200);
});

api.get("/tenants", async (c) => {
  const db = getDb(c);
  const tenants = await db.getTenants();
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
  return c.json({ success: true, tenants: enriched }, 200);
});

api.post("/tenants", async (c) => {
  try {
    const body = await c.req.json();
    const { name, slug, email, password, whatsapp, pixKey, pixKeyType, deliveryFee, address, primaryColor, bannerImage } = body;

    if (!name || !email || !password) {
      return c.json(
        { success: false, error: "Nome da loja, e-mail e senha do cliente são obrigatórios" },
        400
      );
    }

    const db = getDb(c);
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
      bannerImage: bannerImage || "",
    });

    const user = await db.createUser({
      email,
      password,
      name: `Admin ${name}`,
      role: "tenant_admin",
      tenantId: tenant.id,
    });

    return c.json({
      success: true,
      message: "Lanchonete e conta criadas com sucesso no Cloudflare D1/KV!",
      tenant,
      user,
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao criar lanchonete" }, 500);
  }
});

api.get("/tenants/:slugOrId", async (c) => {
  const db = getDb(c);
  const slugOrId = c.req.param("slugOrId");
  const tenant = await db.getTenantByIdOrSlug(slugOrId);

  if (!tenant) {
    return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
  }
  return c.json({ success: true, tenant }, 200);
});

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
    return c.json({ success: true, tenant: updated }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar" }, 500);
  }
});

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
    }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar status" }, 500);
  }
});

api.delete("/tenants/:slugOrId", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const tenant = await db.getTenantByIdOrSlug(slugOrId);

    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    await db.deleteTenant(tenant.id);
    return c.json({ success: true, message: "Lanchonete removida com sucesso" }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao excluir" }, 500);
  }
});

api.get("/tenants/:slugOrId/products", async (c) => {
  const db = getDb(c);
  const slugOrId = c.req.param("slugOrId");
  const tenant = await db.getTenantByIdOrSlug(slugOrId);

  if (!tenant) {
    return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
  }

  const products = await db.getProductsByTenant(tenant.id);
  return c.json({ success: true, products }, 200);
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
    return c.json({ success: true, product }, 201);
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
    return c.json({ success: true, product }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar produto" }, 500);
  }
});

api.delete("/tenants/:slugOrId/products/:productId", async (c) => {
  try {
    const db = getDb(c);
    const productId = c.req.param("productId");
    await db.deleteProduct(productId);
    return c.json({ success: true, message: "Produto removido" }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao remover produto" }, 500);
  }
});

api.get("/tenants/:slugOrId/orders", async (c) => {
  const db = getDb(c);
  const slugOrId = c.req.param("slugOrId");
  const tenant = await db.getTenantByIdOrSlug(slugOrId);

  if (!tenant) {
    return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
  }

  const orders = await db.getOrdersByTenant(tenant.id);
  return c.json({ success: true, orders }, 200);
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
    return c.json({ success: true, order }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao criar pedido" }, 500);
  }
});

api.patch("/tenants/:slugOrId/orders/:orderId/status", async (c) => {
  try {
    const db = getDb(c);
    const orderId = c.req.param("orderId");
    const body = await c.req.json();
    const status: OrderStatus = normalizeOrderStatus(body.status);

    const updated = await db.updateOrderStatus(orderId, status);
    if (!updated) {
      return c.json({ success: false, error: "Pedido não encontrado" }, 404);
    }
    return c.json({ success: true, order: updated }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar pedido" }, 500);
  }
});

export default api;
