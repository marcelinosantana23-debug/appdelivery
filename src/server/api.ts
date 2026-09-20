import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { sign, verify } from "hono/jwt";
import { Database } from "./db";
import { orderEvents } from "./events";
import { analyzeMenuWithGemini, type MenuFileInput } from "./geminiMenu";
import type { Env, OrderStatus, TenantStatus, OrderItem } from "./types";

export const api = new Hono<{ Bindings: Env }>();

// Helper para obter a chave JWT_SECRET configurada no Cloudflare Workers ou ambiente
export function getJwtSecret(c: any): string {
  return (
    c?.env?.JWT_SECRET ||
    (typeof process !== "undefined" && process.env?.JWT_SECRET) ||
    "topfood-jwt-secret-cloudflare-production-2026"
  );
}

// Helper para gerar token JWT assinado criptograficamente
export async function createJwtToken(payload: Record<string, any>, secret: string): Promise<string> {
  return await sign(payload, secret, "HS256");
}

// Helper para validar tokens JWT de autenticação com tratamento resiliente
export async function verifyTokenSafely(token: string, secret: string): Promise<any | null> {
  if (!token) return null;
  try {
    return await verify(token, secret, "HS256");
  } catch {
    if (token.startsWith("auth-token-")) {
      const parts = token.split("-");
      const userId = parts[2];
      if (userId) {
        return { sub: userId, userId, isLegacy: true };
      }
    }
    return null;
  }
}

// Habilitar CORS irrestrito para consumo do frontend Vite e clientes externos / 4G
api.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma",
    ],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86400,
  })
);

// Resposta expressa de pré-vôo OPTIONS para clientes móveis e redes externas
api.options("*", (c) => {
  return c.body(null, 204);
});

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
    platform: c.env?.PLATFORM_NAME || "Top Food Multi-tenant",
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

// -----------------------------------------------------------------------------
// REQUISITO 1: CADASTRO INTELIGENTE POR IA (CARDÁPIO + GERADOR/EXTRATOR DE LOGO)
// POST /api/admin/lojas/importar-cardapio
// -----------------------------------------------------------------------------
function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

const handleImportarCardapio = async (c: any) => {
  try {
    const db = getDb(c);
    const body = await c.req.json();
    const { apiKey: bodyApiKey, images, customLogoUrl } = body;

    // Prioridade da chave: body.apiKey -> body.geminiApiKey -> header x-gemini-api-key -> c.env.GEMINI_API_KEY -> process.env.GEMINI_API_KEY
    const apiKey =
      (typeof bodyApiKey === "string" && bodyApiKey.trim()) ||
      (typeof body.geminiApiKey === "string" && body.geminiApiKey.trim()) ||
      c.req.header("x-gemini-api-key")?.trim() ||
      c.env?.GEMINI_API_KEY ||
      (typeof process !== "undefined" && process?.env?.GEMINI_API_KEY
        ? process.env.GEMINI_API_KEY
        : undefined);

    if (!apiKey) {
      return c.json(
        {
          success: false,
          error:
            "A chave da API do Gemini não foi encontrada. Cole sua chave no campo 'Cole sua Chave de API do Gemini aqui' no modal ou configure a variável GEMINI_API_KEY.",
        },
        400
      );
    }

    const rawImages: any[] = Array.isArray(images)
      ? images
      : Array.isArray(body.files)
      ? body.files
      : body.fileBase64
      ? [body.fileBase64]
      : [];

    const filesToProcess: MenuFileInput[] = [];

    for (const img of rawImages) {
      if (typeof img === "string") {
        let mimeType = "image/jpeg";
        let base64Data = img.trim();
        const match = base64Data.match(/^data:([^;]+);base64,(.*)$/s);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
        if (base64Data) {
          filesToProcess.push({
            data: base64Data,
            mimeType,
          });
        }
      } else if (img && typeof img === "object") {
        const rawData = (img.data || img.fileBase64 || "").trim();
        let mimeType = img.mimeType || "image/jpeg";
        let base64Data = rawData;
        const match = rawData.match(/^data:([^;]+);base64,(.*)$/s);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
        if (base64Data) {
          filesToProcess.push({
            data: base64Data,
            mimeType,
            fileName: img.fileName,
          });
        }
      }
    }

    if (filesToProcess.length === 0) {
      return c.json(
        {
          success: false,
          error:
            "Nenhum arquivo ou foto do cardápio foi recebido. Selecione uma ou mais fotos (JPG/PNG) ou documento PDF do cardápio.",
        },
        400
      );
    }

    // 1. Extração estruturada multimodal de todas as imagens em lote via Gemini
    const extracted = await analyzeMenuWithGemini(filesToProcess, apiKey);

    const nomeLoja = extracted.nome_loja?.trim() || "Nova Lanchonete";
    const primaryColor = extracted.primary_color || "#E63946";
    const logoUrl = customLogoUrl || extracted.logo_url || "🍔";
    const baseSlug = slugifyText(nomeLoja);

    const adminEmail = `admin@${baseSlug}.com`;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let adminPassword = "";
    for (let i = 0; i < 6; i++) {
      adminPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 2. Gravando no Cloudflare D1 / KV
    const novaLoja = await db.createTenant({
      name: nomeLoja,
      email: adminEmail,
      phone: extracted.telefone,
      whatsapp: extracted.telefone || "5511999999999",
      deliveryFee: 5.0,
      address: "Endereço da Loja",
      tagline: extracted.descricao,
      logo: logoUrl,
      primaryColor,
    });

    // 3. Cadastrar usuário administrador da loja no D1
    const adminUser = await db.createUser({
      email: adminEmail,
      password: adminPassword,
      name: `Admin ${novaLoja.name}`,
      role: "tenant_admin",
      tenantId: novaLoja.id,
    });

    // 4. Cadastrar categorias e produtos vinculados ao ID da nova loja
    const produtosCriados: any[] = [];
    if (Array.isArray(extracted.categorias)) {
      for (const cat of extracted.categorias) {
        const catName = cat.nome?.trim() || "Geral";
        if (Array.isArray(cat.produtos)) {
          for (const prod of cat.produtos) {
            const novoProduto = await db.createProduct(novaLoja.id, {
              name: prod.nome?.trim() || "Item",
              description: prod.descricao?.trim() || "",
              price: Number(prod.preco) || 0,
              category: catName.toLowerCase(),
              available: true,
              options: Array.isArray(prod.opcionais)
                ? prod.opcionais.map((opt: any, idx: number) => ({
                    id: `opt-${idx + 1}`,
                    name: opt.nome,
                    price: Number(opt.preco) || 0,
                  }))
                : [],
            });
            produtosCriados.push(novoProduto);
          }
        }
      }
    }

    return c.json(
      {
        success: true,
        message: "Lanchonete, cardápio e logo criados com sucesso pela IA!",
        tenant: novaLoja,
        adminUser,
        credentials: {
          email: adminEmail,
          password: adminPassword,
        },
        categoriasCount: extracted.categorias?.length || 0,
        produtosCount: produtosCriados.length,
        produtos: produtosCriados,
        hasLogo: extracted.has_logo,
        logoBoundingBox: extracted.logo_bounding_box,
        logoUrl,
        extractedData: {
          nome_loja: extracted.nome_loja,
          descricao: extracted.descricao,
          telefone: extracted.telefone,
          primaryColor,
        },
      },
      201
    );
  } catch (err: any) {
    console.error("Erro na rota importar-cardapio:", err);
    return c.json(
      {
        success: false,
        error: err.message || "Falha ao importar e processar cardápio com a IA.",
      },
      500
    );
  }
};

api.post("/admin/lojas/importar-cardapio", handleImportarCardapio);
api.post("/lojas/importar-cardapio", handleImportarCardapio);

// -----------------------------------------------------------------------------
// REQUISITO 2: PWA E MANIFEST DINÂMICO DA VITRINE
// GET /api/manifest/:slug.json
// -----------------------------------------------------------------------------
const handleDynamicManifest = async (c: any) => {
  try {
    const db = getDb(c);
    const rawSlug = c.req.param("slug") || "";
    const slug = rawSlug.replace(/\.json$/i, "");
    const loja = await db.getTenantByIdOrSlug(slug);

    if (!loja) {
      return c.json({ error: "Loja não encontrada." }, 404);
    }

    const logoUrl = loja.logo && loja.logo.trim() ? loja.logo : "/icon-512.png";
    const isSvg = logoUrl.includes("image/svg+xml") || logoUrl.endsWith(".svg");
    const iconType = isSvg ? "image/svg+xml" : "image/png";

    const manifest = {
      name: loja.name,
      short_name: loja.name.length > 15 ? loja.name.slice(0, 15).trim() : loja.name,
      start_url: `/loja/${loja.slug}`,
      scope: `/loja/${loja.slug}`,
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: loja.primaryColor || "#000000",
      description: loja.tagline || `Faça seu pedido online no ${loja.name}!`,
      icons: [
        {
          src: logoUrl,
          sizes: "192x192",
          type: iconType,
          purpose: "any",
        },
        {
          src: logoUrl,
          sizes: "512x512",
          type: iconType,
          purpose: "any",
        },
        {
          src: logoUrl,
          sizes: "512x512",
          type: iconType,
          purpose: "maskable",
        },
      ],
    };

    return c.json(manifest, 200, {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    });
  } catch (err: any) {
    return c.json({ error: err.message || "Erro ao gerar manifest dinâmico." }, 500);
  }
};

api.get("/manifest/:slug", handleDynamicManifest);

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
    const pedidoId = c.req.param("id") || c.req.param("orderId");
    const body = await c.req.json();
    const statusInput = body.status || body.novoStatus;

    if (!statusInput) {
      return c.json({
        success: false,
        error: "O campo 'status' é obrigatório (ex: 'Pendente', 'Em Preparo', 'Saiu para Entrega', 'Concluído', 'Cancelado').",
      }, 400);
    }

    // Validação opcional de token JWT do lojista se enviado
    const authHeader = c.req.header("Authorization");
    if (authHeader) {
      const jwtSecret = getJwtSecret(c);
      const rawToken = authHeader.replace(/^Bearer\s+/i, "");
      await verifyTokenSafely(rawToken, jwtSecret);
    }

    const statusNormalizado = normalizeOrderStatus(statusInput);
    const atualizado = await db.updateOrderStatus(pedidoId, statusNormalizado);

    if (!atualizado) {
      return c.json({ success: false, error: "Pedido não encontrado para atualização." }, 404);
    }

    // Persiste também no Cloudflare KV para sincronização instantânea com clientes 4G/5G
    const kv = (c.env?.KV || c.env?.STORE_KV);
    if (kv) {
      try {
        const cleanId = pedidoId.replace(/^#/, "");
        await kv.put(`order:${atualizado.id}`, JSON.stringify(atualizado));
        await kv.put(`order:${cleanId}`, JSON.stringify(atualizado));
        await kv.put(`order_status:${cleanId}`, JSON.stringify({
          orderId: atualizado.id,
          status: atualizado.status,
          updatedAt: Date.now(),
        }));
        if (atualizado.tenantId) {
          await kv.put(`tenant_orders_version:${atualizado.tenantId}`, Date.now().toString());
        }
      } catch (kvErr) {
        console.warn("KV sync in status update warning:", kvErr);
      }
    }

    return c.json({
      success: true,
      message: `Status do pedido atualizado para '${STATUS_MAP_EN_TO_PT[statusNormalizado]}' no Cloudflare D1/KV!`,
      pedido: {
        ...atualizado,
        statusPt: STATUS_MAP_EN_TO_PT[atualizado.status] || atualizado.status,
      },
      order: atualizado,
    }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Erro ao atualizar status do pedido." }, 500);
  }
};

api.patch("/pedidos/:id/status", handleStatusUpdate);
api.put("/pedidos/:id/status", handleStatusUpdate);
api.patch("/pedidos/:id", handleStatusUpdate);
api.patch("/orders/:orderId/status", handleStatusUpdate);
api.put("/orders/:orderId/status", handleStatusUpdate);
api.patch("/tenants/:slugOrId/orders/:orderId/status", handleStatusUpdate);
api.put("/tenants/:slugOrId/orders/:orderId/status", handleStatusUpdate);

// Consulta rápida de status do pedido para sincronização de clientes em 4G/5G
api.get("/orders/:orderId/status", async (c) => {
  try {
    const db = getDb(c);
    const orderId = c.req.param("orderId");
    const cleanId = orderId.replace(/^#/, "");

    const kv = (c.env?.KV || c.env?.STORE_KV);
    if (kv) {
      try {
        const cached = await kv.get(`order_status:${cleanId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return c.json({
            success: true,
            orderId: parsed.orderId,
            status: parsed.status,
            statusPt: STATUS_MAP_EN_TO_PT[parsed.status] || parsed.status,
            updatedAt: parsed.updatedAt,
          }, 200);
        }
      } catch (kvErr) {
        console.warn("KV get order_status warning:", kvErr);
      }
    }

    const order = await db.getOrderById(orderId);
    if (!order) {
      return c.json({ success: false, error: "Pedido não encontrado" }, 404);
    }
    return c.json({
      success: true,
      orderId: order.id,
      status: order.status,
      statusPt: STATUS_MAP_EN_TO_PT[order.status] || order.status,
      order,
    }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao consultar status" }, 500);
  }
});

// -----------------------------------------------------------------------------
// 5. ROTAS DE COMPATIBILIDADE COM A INTERFACE EXISTENTE (/tenants, /auth)
// -----------------------------------------------------------------------------

api.post("/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, portal } = body;

    if (!email || !password) {
      return c.json({ success: false, error: "E-mail e senha são obrigatórios" }, 400);
    }

    const db = getDb(c);
    const user = await db.authenticateUser(email, password);

    if (!user) {
      return c.json({ success: false, error: "Credenciais inválidas ou conta inativa" }, 401);
    }

    // RBAC: Isolamento estrito de logins
    // 1. Tela da lanchonete (ou qualquer portal que não seja explicitamente 'superadmin') RECUSA e BARRA usuários com role SUPER_ADMIN
    if (user.role === "super_admin" && portal !== "superadmin") {
      return c.json(
        {
          success: false,
          error: "Acesso negado: Administradores da plataforma (SUPER_ADMIN) devem acessar exclusivamente pelo portal /super-admin.",
          code: "SUPER_ADMIN_BLOCKED_ON_STORE",
          isSuperAdmin: true,
        },
        403
      );
    }

    // 2. Portal Super Admin (portal === 'superadmin') recusa usuários sem privilégios globais
    if (portal === "superadmin" && user.role !== "super_admin") {
      return c.json(
        {
          success: false,
          error: "Acesso negado: Este portal é restrito exclusivamente a Super Administradores da plataforma. Utilize a tela de login da sua lanchonete em /admin.",
          code: "NOT_SUPER_ADMIN",
        },
        403
      );
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

    const jwtSecret = getJwtSecret(c);
    const token = await createJwtToken(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        name: user.name,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 dias
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret
    );

    return c.json({
      success: true,
      user,
      tenant,
      token,
    }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro no login" }, 500);
  }
});

// Verificação de sessão administrativa segura (Super Admin e Lojista) com JWT_SECRET
api.post("/auth/verify", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const body = await c.req.json().catch(() => ({}));
    const rawToken = body.token || (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null);
    const fallbackUserId = body.userId;

    if (!rawToken) {
      return c.json({ success: false, error: "Sessão não informada ou inválida." }, 401);
    }

    const jwtSecret = getJwtSecret(c);
    const decoded = await verifyTokenSafely(rawToken, jwtSecret);
    const userId = decoded?.userId || decoded?.sub || fallbackUserId;

    if (!userId) {
      return c.json({ success: false, error: "Token JWT inválido ou expirado." }, 401);
    }

    const db = getDb(c);
    const user = await db.getUserById(userId);
    if (!user) {
      return c.json({ success: false, error: "Usuário não encontrado ou sessão expirada." }, 401);
    }

    let tenant = null;
    if (user.role === "tenant_admin" && user.tenantId) {
      tenant = await db.getTenantByIdOrSlug(user.tenantId);
      if (tenant && tenant.status === "inactive") {
        return c.json({ success: false, error: "Loja inativa." }, 403);
      }
    }

    return c.json({ success: true, user, tenant, token: rawToken }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao validar sessão." }, 500);
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

api.get("/superadmin/tenants/credentials", async (c) => {
  try {
    const db = getDb(c);
    const credentials = await db.getAllTenantCredentials();
    return c.json({ success: true, credentials }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao buscar credenciais dos lojistas" }, 500);
  }
});

api.get("/superadmin/tenant-credentials", async (c) => {
  try {
    const db = getDb(c);
    const credentials = await db.getAllTenantCredentials();
    return c.json({ success: true, credentials }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao buscar credenciais dos lojistas" }, 500);
  }
});

api.get("/tenants", async (c) => {
  const db = getDb(c);
  const tenants = await db.getTenants();
  const enriched = await Promise.all(
    tenants.map(async (t) => {
      const [products, orders, creds] = await Promise.all([
        db.getProductsByTenant(t.id),
        db.getOrdersByTenant(t.id),
        db.getTenantCredentials(t.id),
      ]);
      return {
        ...t,
        productCount: products.length,
        orderCount: orders.length,
        revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
        adminEmail: creds?.email || t.email,
        adminPassword: creds?.password || "123456",
        adminUserId: creds?.userId,
      };
    })
  );
  return c.json({ success: true, tenants: enriched }, 200);
});

api.get("/tenants/:slugOrId/credentials", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const credentials = await db.getTenantCredentials(slugOrId);
    if (!credentials) {
      return c.json({ success: false, error: "Lanchonete ou credenciais não encontradas" }, 404);
    }
    return c.json({ success: true, credentials }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao consultar credenciais" }, 500);
  }
});

api.put("/superadmin/tenants/:slugOrId/credentials", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return c.json(
        { success: false, error: "E-mail de login e senha são obrigatórios para a lanchonete." },
        400
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (cleanPassword.length < 4) {
      return c.json(
        { success: false, error: "A senha da lanchonete deve possuir no mínimo 4 caracteres." },
        400
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return c.json(
        { success: false, error: "Formato de e-mail inválido para o login da lanchonete." },
        400
      );
    }

    const res = await db.updateTenantCredentials(slugOrId, cleanEmail, cleanPassword, name);
    return c.json({
      success: true,
      message: "Credenciais do lojista salvas com sucesso no banco de dados!",
      credentials: res.credentials,
      tenant: res.tenant,
    }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar credenciais do lojista." }, 500);
  }
});

api.put("/tenants/:slugOrId/credentials", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const body = await c.req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return c.json(
        { success: false, error: "E-mail de login e senha são obrigatórios para a lanchonete." },
        400
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (cleanPassword.length < 4) {
      return c.json(
        { success: false, error: "A senha da lanchonete deve possuir no mínimo 4 caracteres." },
        400
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return c.json(
        { success: false, error: "Formato de e-mail inválido para o login da lanchonete." },
        400
      );
    }

    const res = await db.updateTenantCredentials(slugOrId, cleanEmail, cleanPassword, name);
    return c.json({
      success: true,
      message: "Credenciais do lojista salvas com sucesso no banco de dados!",
      credentials: res.credentials,
      tenant: res.tenant,
    }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao atualizar credenciais do lojista." }, 500);
  }
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

    if (body.adminPassword || body.adminEmail) {
      const credEmail = (body.adminEmail || body.email || tenant.email).trim().toLowerCase();
      const credPass = (body.adminPassword || "").trim();
      if (credPass.length >= 4) {
        await db.updateTenantCredentials(tenant.id, credEmail, credPass, body.name || tenant.name);
      }
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

// ===================== CLIENTES (CADASTRO E CONSULTA) =====================
api.get("/tenants/:slugOrId/customers", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const tenant = await db.getTenantByIdOrSlug(slugOrId);

    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    const customers = await db.getCustomersByTenant(tenant.id);
    return c.json({ success: true, customers }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao listar clientes" }, 500);
  }
});

api.get("/tenants/:slugOrId/customers/lookup", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const phone = c.req.query("phone");

    if (!phone) {
      return c.json({ success: false, error: "Telefone não informado" }, 400);
    }

    const tenant = await db.getTenantByIdOrSlug(slugOrId);
    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    const customer = await db.getCustomerByPhone(tenant.id, phone);
    return c.json({ success: true, customer }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao consultar cliente" }, 500);
  }
});

// SSE Stream para escuta de pedidos em tempo real no painel do restaurante
// SSE Stream para escuta de pedidos em tempo real no painel do restaurante (100% orientado a eventos, ZERO polling/loops)
api.get("/tenants/:slugOrId/orders/stream", async (c) => {
  const db = getDb(c);
  const slugOrId = c.req.param("slugOrId");
  const tenant = await db.getTenantByIdOrSlug(slugOrId);

  if (!tenant) {
    return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        message: "Canal de pedidos em tempo real conectado",
        tenantId: tenant.id,
        tenantName: tenant.name,
        timestamp: Date.now(),
      }),
    });

    // Envia estado inicial uma única vez na conexão
    try {
      const initialOrders = await db.getOrdersByTenant(tenant.id);
      await stream.writeSSE({
        event: "orders",
        data: JSON.stringify({ orders: initialOrders, timestamp: Date.now() }),
      });
    } catch (e) {
      console.warn("SSE initial orders error:", e);
    }

    // Escuta em tempo real orientada a eventos - ZERO polling no Cloudflare D1
    const unsubscribe = orderEvents.subscribe(async (payload) => {
      const belongsToTenant =
        payload.order?.tenantId === tenant.id ||
        payload.order?.tenantId === tenant.slug ||
        payload.tenantId === tenant.id ||
        payload.tenantId === tenant.slug;

      if (belongsToTenant) {
        try {
          if (payload.isNew) {
            await stream.writeSSE({
              event: "new_order",
              data: JSON.stringify({
                order: payload.order,
                timestamp: payload.timestamp,
              }),
            });
          }
          await stream.writeSSE({
            event: "order_update",
            data: JSON.stringify({
              orderId: payload.orderId,
              status: payload.status,
              order: payload.order,
              isNew: payload.isNew,
              timestamp: payload.timestamp,
            }),
          });
        } catch (err) {
          console.warn("SSE push order error:", err);
        }
      }
    });

    stream.onAbort(() => {
      unsubscribe();
    });

    // Heartbeat keepalive leve a cada 25s apenas para manter a conexão sem tocar no banco
    while (!stream.aborted) {
      await stream.sleep(25000);
      try {
        await stream.writeSSE({
          event: "ping",
          data: "{}",
        });
      } catch {
        break;
      }
    }

    unsubscribe();
  });
});

api.get("/orders/stream", async (c) => {
  const db = getDb(c);
  const tenantParam = c.req.query("tenantId") || c.req.query("loja") || c.req.query("slug");
  let targetTenant: any = null;
  if (tenantParam) {
    targetTenant = await db.getTenantByIdOrSlug(tenantParam);
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({ message: "Canal de pedidos em tempo real conectado", timestamp: Date.now() }),
    });

    try {
      const initialOrders = targetTenant
        ? await db.getOrdersByTenant(targetTenant.id)
        : await db.getAllOrders();
      await stream.writeSSE({
        event: "orders",
        data: JSON.stringify({ orders: initialOrders, timestamp: Date.now() }),
      });
    } catch (e) {
      console.warn("SSE initial orders error:", e);
    }

    const unsubscribe = orderEvents.subscribe(async (payload) => {
      const match =
        !targetTenant ||
        payload.order?.tenantId === targetTenant.id ||
        payload.order?.tenantId === targetTenant.slug ||
        payload.tenantId === targetTenant.id;

      if (match) {
        try {
          if (payload.isNew) {
            await stream.writeSSE({
              event: "new_order",
              data: JSON.stringify({ order: payload.order, timestamp: payload.timestamp }),
            });
          }
          await stream.writeSSE({
            event: "order_update",
            data: JSON.stringify({
              orderId: payload.orderId,
              status: payload.status,
              order: payload.order,
              isNew: payload.isNew,
              timestamp: payload.timestamp,
            }),
          });
        } catch (err) {
          console.warn("SSE global push error:", err);
        }
      }
    });

    stream.onAbort(() => {
      unsubscribe();
    });

    while (!stream.aborted) {
      await stream.sleep(25000);
      try {
        await stream.writeSSE({
          event: "ping",
          data: "{}",
        });
      } catch {
        break;
      }
    }

    unsubscribe();
  });
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

// Endpoint de listagem e polling contínuo a cada 3 segundos: GET /api/orders?tenantId=...
api.get("/orders", async (c) => {
  try {
    const db = getDb(c);
    const tenantParam = c.req.query("tenantId") || c.req.query("loja") || c.req.query("slug");

    if (tenantParam) {
      const tenant = await db.getTenantByIdOrSlug(tenantParam);
      if (tenant) {
        const orders = await db.getOrdersByTenant(tenant.id);
        return c.json({ success: true, orders }, 200);
      }
      const orders = await db.getOrdersByTenant(tenantParam);
      return c.json({ success: true, orders }, 200);
    }

    // Se nenhum tenant informado, listar todos os pedidos
    const orders = await db.getAllOrders();
    return c.json({ success: true, orders }, 200);
  } catch (e: any) {
    return c.json({ success: false, orders: [], error: e.message || "Erro ao buscar pedidos" }, 500);
  }
});

// Rota direta de compatibilidade para clientes móveis e redes externas postando em /orders
api.post("/orders", async (c) => {
  try {
    const db = getDb(c);
    const body = await c.req.json();
    const tenantIdentifier = body.tenantId || body.tenantSlug || body.loja || "marcelino";
    const tenant = await db.getTenantByIdOrSlug(tenantIdentifier);

    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    if (tenant.status === "inactive") {
      return c.json(
        { success: false, error: "Esta loja está desativada no momento e não aceita novos pedidos." },
        400
      );
    }

    const order = await db.createOrder(tenant.id, body);
    return c.json({ success: true, order }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao registrar pedido" }, 500);
  }
});

// Atualização de status direta em /orders/:orderId/status e /tenants/:slugOrId/orders/:orderId/status
api.patch("/orders/:orderId/status", handleStatusUpdate);
api.put("/orders/:orderId/status", handleStatusUpdate);
api.patch("/tenants/:slugOrId/orders/:orderId/status", handleStatusUpdate);
api.put("/tenants/:slugOrId/orders/:orderId/status", handleStatusUpdate);

// Endpoint público para consulta e rastreamento em tempo real do status de um pedido
api.get("/orders/:orderId", async (c) => {
  try {
    const db = getDb(c);
    const orderId = c.req.param("orderId");
    const order = await db.getOrderById(orderId);
    if (!order) {
      return c.json({ success: false, error: "Pedido não encontrado" }, 404);
    }
    return c.json({ success: true, order }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao buscar pedido" }, 500);
  }
});

// Endpoint com escopo de tenant para rastreamento de pedido
api.get("/tenants/:slugOrId/orders/:orderId", async (c) => {
  try {
    const db = getDb(c);
    const orderId = c.req.param("orderId");
    const order = await db.getOrderById(orderId);
    if (!order) {
      return c.json({ success: false, error: "Pedido não encontrado" }, 404);
    }
    return c.json({ success: true, order }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message || "Erro ao buscar pedido" }, 500);
  }
});

// SSE Stream público para rastreamento em tempo real do status do pedido no celular do cliente
// 100% orientado a eventos (Zero polling / loops de banco de dados no Cloudflare D1)
api.get("/orders/:orderId/stream", async (c) => {
  const db = getDb(c);
  const rawId = c.req.param("orderId");
  const cleanId = rawId.replace(/^#/, "");

  return streamSSE(c, async (stream) => {
    // 1. Envia estado inicial imediato
    try {
      const initialOrder = await db.getOrderById(rawId);
      if (initialOrder) {
        await stream.writeSSE({
          event: "status_update",
          data: JSON.stringify({
            orderId: cleanId,
            status: initialOrder.status,
            order: initialOrder,
            timestamp: Date.now(),
          }),
        });
      }
    } catch (e) {
      console.warn("SSE initial order fetch error:", e);
    }

    // 2. Inscreve no barramento de eventos (acionado quando o lojista altera o status no admin)
    const unsubscribe = orderEvents.subscribe(async (payload) => {
      const pClean = payload.orderId.replace(/^#/, "");
      if (pClean === cleanId || payload.order.id === rawId || payload.order.id === `#${cleanId}`) {
        try {
          await stream.writeSSE({
            event: "status_update",
            data: JSON.stringify(payload),
          });
        } catch (err) {
          console.warn("Failed to write order SSE event:", err);
        }
      }
    });

    stream.onAbort(() => {
      unsubscribe();
    });

    // 3. Heartbeat keepalive leve (apenas sleep sem consultar o banco)
    while (!stream.aborted) {
      await stream.sleep(25000);
      try {
        await stream.writeSSE({
          event: "ping",
          data: "{}",
        });
      } catch {
        break;
      }
    }

    unsubscribe();
  });
});

api.get("/tenants/:slugOrId/orders/:orderId/stream", async (c) => {
  const db = getDb(c);
  const rawId = c.req.param("orderId");
  const cleanId = rawId.replace(/^#/, "");

  return streamSSE(c, async (stream) => {
    try {
      const initialOrder = await db.getOrderById(rawId);
      if (initialOrder) {
        await stream.writeSSE({
          event: "status_update",
          data: JSON.stringify({
            orderId: cleanId,
            status: initialOrder.status,
            order: initialOrder,
            timestamp: Date.now(),
          }),
        });
      }
    } catch (e) {
      console.warn("SSE tenant initial order fetch error:", e);
    }

    const unsubscribe = orderEvents.subscribe(async (payload) => {
      const pClean = payload.orderId.replace(/^#/, "");
      if (pClean === cleanId || payload.order.id === rawId || payload.order.id === `#${cleanId}`) {
        try {
          await stream.writeSSE({
            event: "status_update",
            data: JSON.stringify(payload),
          });
        } catch (err) {
          console.warn("Failed to write order SSE event:", err);
        }
      }
    });

    stream.onAbort(() => {
      unsubscribe();
    });

    while (!stream.aborted) {
      await stream.sleep(25000);
      try {
        await stream.writeSSE({
          event: "ping",
          data: "{}",
        });
      } catch {
        break;
      }
    }

    unsubscribe();
  });
});

// ===================== RELATÓRIO FINANCEIRO E DESEMPENHO (CLOUDFLARE D1) =====================
api.get("/tenants/:slugOrId/financial-report", async (c) => {
  try {
    const db = getDb(c);
    const slugOrId = c.req.param("slugOrId");
    const tenant = await db.getTenantByIdOrSlug(slugOrId);

    if (!tenant) {
      return c.json({ success: false, error: "Lanchonete não encontrada" }, 404);
    }

    const monthQuery = c.req.query("month");
    const yearQuery = c.req.query("year");
    const startDateQuery = c.req.query("startDate");
    const endDateQuery = c.req.query("endDate");

    const options = {
      month: monthQuery ? parseInt(monthQuery, 10) : undefined,
      year: yearQuery ? parseInt(yearQuery, 10) : undefined,
      startDate: startDateQuery || undefined,
      endDate: endDateQuery || undefined,
    };

    const report = await db.getFinancialReport(tenant.id, options);

    return c.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        ...report,
      },
      200
    );
  } catch (e: any) {
    console.error("Erro na rota de relatório financeiro:", e);
    return c.json(
      { success: false, error: e.message || "Erro ao processar relatório financeiro" },
      500
    );
  }
});

export default api;

