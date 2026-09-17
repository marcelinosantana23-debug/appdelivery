import type {
  Env,
  Tenant,
  User,
  Product,
  Order,
  OrderStatus,
  TenantStatus,
} from "./types";
import { mockProducts } from "../data/mockData";

// Seed data para demonstração e inicialização
const initialTenants: Tenant[] = [
  {
    id: "tenant-ms-preparacoes",
    name: "MS Preparações",
    slug: "marcelino",
    email: "marcelinosantana23@gmail.com",
    phone: "11999999999",
    whatsapp: "5511999999999",
    pixKey: "marcelinosantana23@gmail.com",
    pixKeyType: "email",
    deliveryFee: 5.0,
    address: "Rua das Preparações, 100 - Centro",
    hours: "18:00 - 23:30",
    tagline: "O melhor sabor e lanches artesanais preparados na hora",
    announcement: "🔥 Bem-vindo à MS Preparações! Peça pelo WhatsApp ou direto no cardápio.",
    logo: "🍔",
    bannerImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#E63946",
    secondaryColor: "#1E293B",
    primaryDark: "#C1121F",
    primaryLight: "#F77F00",
    accentColor: "#FCBF49",
    themeMode: "light",
    menuLayout: "list",
    showFeaturedCarousel: true,
    status: "active",
    isOpen: true,
    createdAt: Date.now() - 5 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: "tenant-burger-town",
    name: "Burger Town",
    slug: "burger-town",
    email: "admin@burgertown.com",
    phone: "11999999999",
    whatsapp: "5511999999999",
    pixKey: "contato@burgertown.com.br",
    pixKeyType: "email",
    deliveryFee: 6.0,
    address: "Rua das Chamas, 420 - Centro",
    hours: "18:00 - 23:30",
    tagline: "Hambúrgueres artesanais na chama",
    announcement: "Entrega grátis para pedidos acima de R$ 50,00!",
    logo: "🍔",
    bannerImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#E63946",
    secondaryColor: "#1E293B",
    primaryDark: "#C1121F",
    primaryLight: "#F77F00",
    accentColor: "#FCBF49",
    themeMode: "light",
    menuLayout: "list",
    showFeaturedCarousel: true,
    status: "active",
    isOpen: true,
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: "tenant-pizza-bella",
    name: "Pizza Bella",
    slug: "pizza-bella",
    email: "admin@pizzabella.com",
    phone: "11988888888",
    whatsapp: "5511988888888",
    pixKey: "pedidos@pizzabella.com.br",
    pixKeyType: "email",
    deliveryFee: 7.5,
    address: "Av. Paulista, 1500 - Bela Vista",
    hours: "18:30 - 00:00",
    tagline: "Pizzas no forno a lenha com massa fermentada",
    logo: "🍕",
    bannerImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#059669",
    primaryDark: "#047857",
    primaryLight: "#10B981",
    accentColor: "#F59E0B",
    status: "active",
    isOpen: true,
    createdAt: Date.now() - 15 * 86400000,
    updatedAt: Date.now(),
  },
];

const initialUsers: User[] = [
  {
    id: "user-superadmin",
    email: "superadmin@plataforma.com",
    password: "admin123",
    name: "Diretor da Plataforma",
    role: "super_admin",
    tenantId: null,
    status: "active",
    createdAt: Date.now() - 60 * 86400000,
  },
  {
    id: "user-burgertown",
    email: "admin@burgertown.com",
    password: "123456",
    name: "Carlos Burguer",
    role: "tenant_admin",
    tenantId: "tenant-burger-town",
    status: "active",
    createdAt: Date.now() - 30 * 86400000,
  },
  {
    id: "user-burgertown-legacy",
    email: "admin@loja.com",
    password: "123456",
    name: "Gerente Burger Town",
    role: "tenant_admin",
    tenantId: "tenant-burger-town",
    status: "active",
    createdAt: Date.now() - 30 * 86400000,
  },
  {
    id: "user-pizzabella",
    email: "admin@pizzabella.com",
    password: "123456",
    name: "Luigi Pizza",
    role: "tenant_admin",
    tenantId: "tenant-pizza-bella",
    status: "active",
    createdAt: Date.now() - 15 * 86400000,
  },
  {
    id: "user-marcelino",
    email: "marcelinosantana23@gmail.com",
    password: "admin",
    name: "Marcelino Santana (MS Preparações)",
    role: "tenant_admin",
    tenantId: "tenant-ms-preparacoes",
    status: "active",
    createdAt: Date.now() - 5 * 86400000,
  },
];

const initialProducts: Product[] = [
  // MS Preparações products (Lanchonete MS Preparações)
  {
    id: "msp-1",
    tenantId: "tenant-ms-preparacoes",
    name: "X-Salada Especial MS",
    description: "Pão brioche selado na manteiga, hambúrguer artesanal 160g, queijo prato derretido, alface americana, tomate fresco e maionese verde da casa.",
    price: 26.9,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    category: "lanches",
    available: true,
    options: [
      { id: "extra-bacon", name: "Bacon crocante extra", price: 4.5 },
      { id: "extra-queijo", name: "Queijo duplo", price: 4.0 },
      { id: "molho-especial", name: "Molho especial extra", price: 2.5 },
    ],
  },
  {
    id: "msp-2",
    tenantId: "tenant-ms-preparacoes",
    name: "Smash Burger Duplo Bacon",
    description: "Dois smash burgers de 90g ultra crocantes, muito queijo cheddar cremoso derretido, fatias de bacon e cebola caramelizada.",
    price: 31.9,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80",
    category: "lanches",
    available: true,
    options: [
      { id: "extra-hamburguer", name: "Hambúrguer extra smash", price: 7.0 },
      { id: "extra-cheddar", name: "Cheddar cremoso extra", price: 3.5 },
    ],
  },
  {
    id: "msp-3",
    tenantId: "tenant-ms-preparacoes",
    name: "X-Tudo Campeão MS",
    description: "O mais completo: pão artesanal, hambúrguer 180g, presunto, queijo, ovo frito na chapa, bacon, alface, tomate, milho e batata palha.",
    price: 34.9,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
    category: "lanches",
    available: true,
    options: [],
  },
  {
    id: "msp-4",
    tenantId: "tenant-ms-preparacoes",
    name: "Batata Frita Crocante Rústica",
    description: "Porção de batatas selecionadas com tempero secreto da casa e alecrim, servidas com maionese artesanal.",
    price: 18.0,
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80",
    category: "porções",
    available: true,
    options: [
      { id: "cheddar-bacon", name: "Com Cheddar e Farofa de Bacon", price: 6.0 },
    ],
  },
  {
    id: "msp-5",
    tenantId: "tenant-ms-preparacoes",
    name: "Refrigerante Gelado Lata 350ml",
    description: "Coca-Cola, Guaraná Antarctica ou Sprite super gelados.",
    price: 6.0,
    image: "https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "bebidas",
    available: true,
    options: [
      { id: "coca-original", name: "Coca-Cola Original", price: 0 },
      { id: "coca-zero", name: "Coca-Cola Zero", price: 0 },
      { id: "guarana", name: "Guaraná Antarctica", price: 0 },
    ],
  },
  // Burger Town products
  ...mockProducts.map((p) => ({
    ...p,
    tenantId: "tenant-burger-town",
  })),
  // Pizza Bella products
  {
    id: "pizza-1",
    tenantId: "tenant-pizza-bella",
    name: "Pizza Margherita Especial",
    description: "Molho de tomate pelado italiano, mozzarella de búfala, manjericão fresco e azeite trufado.",
    price: 49.9,
    image: "https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "pizzas",
    available: true,
    options: [
      { id: "borda-catupiry", name: "Borda recheada com Catupiry", price: 8.0 },
      { id: "borda-cheddar", name: "Borda recheada com Cheddar", price: 8.0 },
      { id: "massa-fina", name: "Massa fininha e crocante", price: 0 },
    ],
  },
  {
    id: "pizza-2",
    tenantId: "tenant-pizza-bella",
    name: "Pizza Calabresa Artesanal",
    description: "Calabresa artesanal defumada fatiada, cebola roxa marinada e azeitonas pretas chilenas.",
    price: 46.0,
    image: "https://images.pexels.com/photos/2619967/pexels-photo-2619967.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "pizzas",
    available: true,
    options: [
      { id: "borda-catupiry", name: "Borda recheada com Catupiry", price: 8.0 },
      { id: "extra-queijo", name: "Queijo extra", price: 6.0 },
    ],
  },
  {
    id: "pizza-3",
    tenantId: "tenant-pizza-bella",
    name: "Pizza Quatro Queijos Nobres",
    description: "Mozzarella especial, gorgonzola doce, provolone curado e catupiry original.",
    price: 54.0,
    image: "https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "pizzas",
    available: true,
    options: [
      { id: "borda-catupiry", name: "Borda recheada com Catupiry", price: 8.0 },
    ],
  },
  {
    id: "pizza-drink-1",
    tenantId: "tenant-pizza-bella",
    name: "Refrigerante Lata 350ml",
    description: "Coca-cola, Guaraná Antarctica ou Sprite gelados.",
    price: 6.5,
    image: "https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=600",
    category: "bebidas",
    available: true,
    options: [
      { id: "coca", name: "Coca-Cola Original", price: 0 },
      { id: "coca-zero", name: "Coca-Cola Zero", price: 0 },
      { id: "guarana", name: "Guaraná Antarctica", price: 0 },
    ],
  },
];

const initialOrders: Order[] = [
  {
    id: "#4821",
    tenantId: "tenant-burger-town",
    customerName: "Mariana Silva",
    customerPhone: "(11) 98765-4321",
    orderType: "delivery",
    paymentMethod: "pix",
    address: {
      street: "Rua Augusta",
      number: "1200",
      district: "Consolação",
      complement: "Apto 42",
      reference: "Próximo ao metrô",
    },
    subtotal: 54.0,
    deliveryFee: 6.0,
    total: 60.0,
    status: "received",
    items: [
      {
        id: "item-1",
        product: {
          id: "p1",
          name: "Classic Burger",
          price: 22.0,
        },
        quantity: 1,
        selectedOptions: [{ id: "extra-bacon", name: "Bacon extra", price: 4.0 }],
        notes: "Sem picles por favor",
      },
      {
        id: "item-2",
        product: {
          id: "p2",
          name: "Double Cheese Bacon",
          price: 32.0,
        },
        quantity: 1,
        selectedOptions: [],
        notes: "",
      },
    ],
    statusHistory: [{ status: "received", timestamp: Date.now() - 15 * 60000 }],
    createdAt: Date.now() - 15 * 60000,
  },
  {
    id: "#4820",
    tenantId: "tenant-burger-town",
    customerName: "Rodrigo Costa",
    customerPhone: "(11) 97123-8899",
    orderType: "pickup",
    paymentMethod: "card",
    subtotal: 32.0,
    deliveryFee: 0,
    total: 32.0,
    status: "preparing",
    items: [
      {
        id: "item-3",
        product: {
          id: "p2",
          name: "Double Cheese Bacon",
          price: 32.0,
        },
        quantity: 1,
        selectedOptions: [],
        notes: "Bem passado",
      },
    ],
    statusHistory: [
      { status: "received", timestamp: Date.now() - 40 * 60000 },
      { status: "preparing", timestamp: Date.now() - 25 * 60000 },
    ],
    createdAt: Date.now() - 40 * 60000,
  },
  {
    id: "#8910",
    tenantId: "tenant-pizza-bella",
    customerName: "Fernanda Lima",
    customerPhone: "(11) 99112-2334",
    orderType: "delivery",
    paymentMethod: "pix",
    address: {
      street: "Alameda Santos",
      number: "850",
      district: "Cerqueira César",
      complement: "Bloco B - 110",
      reference: "Portaria 24h",
    },
    subtotal: 54.0,
    deliveryFee: 7.5,
    total: 61.5,
    status: "received",
    items: [
      {
        id: "item-4",
        product: {
          id: "pizza-3",
          name: "Pizza Quatro Queijos Nobres",
          price: 54.0,
        },
        quantity: 1,
        selectedOptions: [{ id: "borda-catupiry", name: "Borda recheada com Catupiry", price: 8.0 }],
        notes: "Massa bem assada",
      },
    ],
    statusHistory: [{ status: "received", timestamp: Date.now() - 8 * 60000 }],
    createdAt: Date.now() - 8 * 60000,
  },
];

// In-memory data store for Node.js / preview runtime (with persistence)
class MemoryStore {
  tenants: Tenant[] = [...initialTenants];
  users: User[] = [...initialUsers];
  products: Product[] = [...initialProducts];
  orders: Order[] = [...initialOrders];

  // Helper to slugify
  slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  }
}

// Global store singleton for Node.js / Hono
const globalStore = new MemoryStore();

/**
 * Data Access Layer for Multi-tenancy
 * Uses env.DB (Cloudflare D1) if configured, or falls back seamlessly to memory store
 */
export class Database {
  private env?: Env;

  constructor(env?: Env) {
    this.env = env;
  }

  private static tablesInitialized = false;

  private async ensureTables(): Promise<void> {
    if (Database.tablesInitialized || !this.env?.DB) return;
    try {
      await this.env.DB.batch([
        this.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            logo TEXT,
            banner TEXT,
            primary_color TEXT,
            secondary_color TEXT,
            delivery_fee REAL,
            min_order REAL,
            estimated_time TEXT,
            whatsapp TEXT,
            phone TEXT,
            instagram TEXT,
            address TEXT,
            status TEXT DEFAULT 'active',
            is_open INTEGER DEFAULT 1,
            created_at INTEGER
          )
        `),
        this.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            image TEXT,
            available INTEGER DEFAULT 1,
            options_json TEXT,
            created_at INTEGER
          )
        `),
        this.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            order_type TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            address_json TEXT,
            change_for TEXT,
            subtotal REAL NOT NULL,
            delivery_fee REAL NOT NULL,
            total REAL NOT NULL,
            status TEXT NOT NULL,
            items_json TEXT NOT NULL,
            status_history_json TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )
        `),
      ]);
      Database.tablesInitialized = true;
    } catch (e) {
      console.warn("D1 ensureTables warning:", e);
    }
  }

  private getKv() {
    return this.env?.KV || this.env?.STORE_KV;
  }

  // ===================== TENANTS =====================

  async getTenants(): Promise<Tenant[]> {
    if (this.env?.DB) {
      try {
        const res = await this.env.DB.prepare(
          "SELECT * FROM tenants ORDER BY created_at DESC"
        ).all<any>();
        if (res.results && res.results.length > 0) {
          return res.results.map((r: any) => this.mapTenantRow(r));
        }
      } catch (e) {
        console.warn("D1 query failed, using memory store:", e);
      }
    }
    return [...globalStore.tenants];
  }

  async getTenantByIdOrSlug(idOrSlug: string): Promise<Tenant | null> {
    if (!idOrSlug) return null;
    const clean = idOrSlug.trim().toLowerCase();

    // 1. Tentar obter do Cloudflare KV para resposta ultra rápida
    const kv = this.getKv();
    if (kv) {
      try {
        const cached = await kv.get(`tenant:${clean}`);
        if (cached) {
          return JSON.parse(cached) as Tenant;
        }
      } catch (e) {
        console.warn("KV getTenant error:", e);
      }
    }

    // 2. Consultar banco de dados D1 (Cloudflare Workers SQL)
    const altSlug =
      clean === "ms-preparacoes"
        ? "marcelino"
        : clean === "marcelino"
        ? "ms-preparacoes"
        : clean;

    if (this.env?.DB) {
      try {
        const row = await this.env.DB.prepare(
          "SELECT * FROM tenants WHERE id = ? OR LOWER(slug) = ? OR LOWER(slug) = ? LIMIT 1"
        )
          .bind(clean, clean, altSlug)
          .first<any>();
        if (row) {
          const tenant = this.mapTenantRow(row);
          if (kv) {
            try {
              await kv.put(`tenant:${tenant.id}`, JSON.stringify(tenant));
              await kv.put(`tenant:${tenant.slug.toLowerCase()}`, JSON.stringify(tenant));
            } catch (e) {
              console.warn("KV sync tenant error:", e);
            }
          }
          return tenant;
        }
      } catch (e) {
        console.warn("D1 getTenantByIdOrSlug error:", e);
      }
    }

    // 3. Fallback em memória
    const found = globalStore.tenants.find(
      (t) =>
        t.id === idOrSlug ||
        t.slug.toLowerCase() === clean ||
        ((clean === "ms-preparacoes" || clean === "marcelino") &&
          (t.id === "tenant-ms-preparacoes" || t.slug === "marcelino" || t.slug === "ms-preparacoes"))
    );

    if (found && kv) {
      try {
        await kv.put(`tenant:${found.id}`, JSON.stringify(found));
        await kv.put(`tenant:${found.slug.toLowerCase()}`, JSON.stringify(found));
      } catch (e) {
        console.warn("KV sync fallback tenant error:", e);
      }
    }

    return found || null;
  }

  async createTenant(data: {
    name: string;
    slug?: string;
    email: string;
    phone?: string;
    whatsapp: string;
    pixKey?: string;
    pixKeyType?: Tenant["pixKeyType"];
    deliveryFee?: number;
    address?: string;
    primaryColor?: string;
  }): Promise<Tenant> {
    const slug = data.slug
      ? globalStore.slugify(data.slug)
      : globalStore.slugify(data.name);

    // Ensure unique slug
    let finalSlug = slug;
    let counter = 1;
    while (globalStore.tenants.some((t) => t.slug === finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }

    const tenantId = `tenant-${finalSlug}`;
    const newTenant: Tenant = {
      id: tenantId,
      name: data.name.trim(),
      slug: finalSlug,
      email: data.email.trim().toLowerCase(),
      phone: data.phone || "",
      whatsapp: data.whatsapp.replace(/\D/g, "") || "5511999999999",
      pixKey: data.pixKey?.trim() || data.email.trim().toLowerCase(),
      pixKeyType: data.pixKeyType || "email",
      deliveryFee: data.deliveryFee ?? 5.0,
      address: data.address?.trim() || "Endereço da Loja",
      hours: "18:00 - 23:30",
      tagline: `Cardápio Online - ${data.name}`,
      logo: "🏪",
      bannerImage: data.bannerImage || "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
      primaryColor: data.primaryColor || "#E63946",
      primaryDark: "#C1121F",
      primaryLight: "#F77F00",
      accentColor: "#FCBF49",
      status: "active",
      isOpen: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO tenants (
            id, name, slug, email, phone, whatsapp, pix_key, pix_key_type,
            delivery_fee, address, hours, tagline, logo, primary_color,
            primary_dark, primary_light, accent_color, status, is_open,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newTenant.id,
            newTenant.name,
            newTenant.slug,
            newTenant.email,
            newTenant.phone || "",
            newTenant.whatsapp,
            newTenant.pixKey,
            newTenant.pixKeyType,
            newTenant.deliveryFee,
            newTenant.address,
            newTenant.hours,
            newTenant.tagline,
            newTenant.logo,
            newTenant.primaryColor,
            newTenant.primaryDark,
            newTenant.primaryLight,
            newTenant.accentColor,
            newTenant.status,
            newTenant.isOpen ? 1 : 0,
            newTenant.createdAt,
            newTenant.updatedAt
          )
          .run();
      } catch (e) {
        console.warn("D1 createTenant error:", e);
      }
    }

    globalStore.tenants.unshift(newTenant);
    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put(`tenant:${newTenant.id}`, JSON.stringify(newTenant));
        await kv.put(`tenant:${newTenant.slug.toLowerCase()}`, JSON.stringify(newTenant));
      } catch (e) {
        console.warn("KV put tenant error:", e);
      }
    }
    return newTenant;
  }

  async updateTenant(id: string, partial: Partial<Tenant>): Promise<Tenant | null> {
    const tenant = await this.getTenantByIdOrSlug(id);
    if (!tenant) return null;

    const updated: Tenant = {
      ...tenant,
      ...partial,
      updatedAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `UPDATE tenants SET 
            name = ?, whatsapp = ?, pix_key = ?, pix_key_type = ?, 
            delivery_fee = ?, address = ?, hours = ?, tagline = ?, 
            logo = ?, banner_image = ?, primary_color = ?, primary_dark = ?, primary_light = ?, 
            accent_color = ?, status = ?, is_open = ?, updated_at = ?
          WHERE id = ?`
        )
          .bind(
            updated.name,
            updated.whatsapp,
            updated.pixKey,
            updated.pixKeyType,
            updated.deliveryFee,
            updated.address,
            updated.hours,
            updated.tagline,
            updated.logo,
            updated.bannerImage || "",
            updated.primaryColor,
            updated.primaryDark,
            updated.primaryLight,
            updated.accentColor,
            updated.status,
            updated.isOpen ? 1 : 0,
            updated.updatedAt,
            tenant.id
          )
          .run();
      } catch {
        // Fallback in case D1 table does not have banner_image column yet
        try {
          await this.env.DB.prepare(
            `UPDATE tenants SET 
              name = ?, whatsapp = ?, pix_key = ?, pix_key_type = ?, 
              delivery_fee = ?, address = ?, hours = ?, tagline = ?, 
              logo = ?, primary_color = ?, primary_dark = ?, primary_light = ?, 
              accent_color = ?, status = ?, is_open = ?, updated_at = ?
            WHERE id = ?`
          )
            .bind(
              updated.name,
              updated.whatsapp,
              updated.pixKey,
              updated.pixKeyType,
              updated.deliveryFee,
              updated.address,
              updated.hours,
              updated.tagline,
              updated.logo,
              updated.primaryColor,
              updated.primaryDark,
              updated.primaryLight,
              updated.accentColor,
              updated.status,
              updated.isOpen ? 1 : 0,
              updated.updatedAt,
              tenant.id
            )
            .run();
        } catch (e2) {
          console.warn("D1 updateTenant error:", e2);
        }
      }
    }

    const idx = globalStore.tenants.findIndex((t) => t.id === tenant.id);
    if (idx >= 0) {
      globalStore.tenants[idx] = updated;
    }
    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put(`tenant:${updated.id}`, JSON.stringify(updated));
        await kv.put(`tenant:${updated.slug.toLowerCase()}`, JSON.stringify(updated));
      } catch (e) {
        console.warn("KV update tenant error:", e);
      }
    }
    return updated;
  }

  async setTenantStatus(id: string, status: TenantStatus): Promise<Tenant | null> {
    return this.updateTenant(id, { status });
  }

  async deleteTenant(id: string): Promise<boolean> {
    const tenant = await this.getTenantByIdOrSlug(id);
    if (!tenant) return false;

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(tenant.id).run();
      } catch (e) {
        console.warn("D1 deleteTenant error:", e);
      }
    }

    const kv = this.getKv();
    if (kv) {
      try {
        await kv.delete(`tenant:${tenant.id}`);
        await kv.delete(`tenant:${tenant.slug.toLowerCase()}`);
      } catch (e) {
        console.warn("KV delete tenant error:", e);
      }
    }

    globalStore.tenants = globalStore.tenants.filter((t) => t.id !== tenant.id);
    globalStore.products = globalStore.products.filter((p) => p.tenantId !== tenant.id);
    globalStore.orders = globalStore.orders.filter((o) => o.tenantId !== tenant.id);
    globalStore.users = globalStore.users.filter((u) => u.tenantId !== tenant.id);
    return true;
  }

  // ===================== USERS & AUTH =====================

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();

    if (this.env?.DB) {
      try {
        const row = await this.env.DB.prepare(
          "SELECT * FROM users WHERE LOWER(email) = ? AND password = ? AND status = 'active' LIMIT 1"
        )
          .bind(cleanEmail, password)
          .first<any>();
        if (row) return this.mapUserRow(row);
      } catch (e) {
        console.warn("D1 authenticateUser error:", e);
      }
    }

    const user = globalStore.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail &&
        u.password === password &&
        u.status === "active"
    );

    if (!user) return null;
    // Omit password from return object
    const { password: _, ...safeUser } = user;
    return safeUser as User;
  }

  async getUserById(userId: string): Promise<User | null> {
    if (this.env?.DB) {
      try {
        const row = await this.env.DB.prepare(
          "SELECT * FROM users WHERE id = ? AND status = 'active' LIMIT 1"
        )
          .bind(userId)
          .first<any>();
        if (row) return this.mapUserRow(row);
      } catch (e) {
        console.warn("D1 getUserById error:", e);
      }
    }

    const user = globalStore.users.find(
      (u) => u.id === userId && u.status === "active"
    );
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser as User;
  }

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role: "super_admin" | "tenant_admin";
    tenantId?: string | null;
  }): Promise<User> {
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newUser: User = {
      id: userId,
      email: data.email.trim().toLowerCase(),
      password: data.password,
      name: data.name.trim(),
      role: data.role,
      tenantId: data.tenantId || null,
      status: "active",
      createdAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO users (id, email, password, name, role, tenant_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newUser.id,
            newUser.email,
            newUser.password,
            newUser.name,
            newUser.role,
            newUser.tenantId,
            newUser.status,
            newUser.createdAt
          )
          .run();
      } catch (e) {
        console.warn("D1 createUser error:", e);
      }
    }

    globalStore.users.push(newUser);
    const { password: _, ...safeUser } = newUser;
    return safeUser as User;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return globalStore.users
      .filter((u) => u.tenantId === tenantId)
      .map(({ password: _, ...rest }) => rest as User);
  }

  async getTenantCredentials(tenantIdOrSlug: string): Promise<{
    userId: string;
    email: string;
    password?: string;
    name: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
  } | null> {
    const tenant = await this.getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) return null;

    let user: any = null;

    if (this.env?.DB) {
      try {
        const row = await this.env.DB.prepare(
          "SELECT id, email, password, name, tenant_id FROM users WHERE tenant_id = ? AND role = 'tenant_admin' LIMIT 1"
        )
          .bind(tenant.id)
          .first<any>();
        if (row) {
          user = {
            id: row.id,
            email: row.email,
            password: row.password,
            name: row.name,
            tenantId: row.tenant_id,
          };
        }
      } catch (e) {
        console.warn("D1 getTenantCredentials error:", e);
      }
    }

    if (!user) {
      user = globalStore.users.find(
        (u) => u.tenantId === tenant.id && u.role === "tenant_admin"
      );
    }

    if (!user && tenant.email) {
      user = globalStore.users.find(
        (u) => u.email.toLowerCase() === tenant.email.toLowerCase()
      );
    }

    const email = user?.email || tenant.email || `admin@${tenant.slug}.com`;
    const password = user?.password || "123456";
    const userId = user?.id || `user-${tenant.id}`;
    const name = user?.name || `Admin ${tenant.name}`;

    return {
      userId,
      email,
      password,
      name,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    };
  }

  async getAllTenantCredentials(): Promise<
    Array<{
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
      userId: string;
      email: string;
      password?: string;
      name: string;
      status: TenantStatus;
    }>
  > {
    const tenants = await this.getTenants();
    const list = [];
    for (const t of tenants) {
      const creds = await this.getTenantCredentials(t.id);
      if (creds) {
        list.push({
          tenantId: t.id,
          tenantName: t.name,
          tenantSlug: t.slug,
          userId: creds.userId,
          email: creds.email,
          password: creds.password || "123456",
          name: creds.name,
          status: t.status,
        });
      }
    }
    return list;
  }

  async updateTenantCredentials(
    tenantIdOrSlug: string,
    email: string,
    password: string,
    name?: string
  ): Promise<{
    success: boolean;
    user: User;
    tenant: Tenant;
    credentials: {
      userId: string;
      email: string;
      password?: string;
      name: string;
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
    };
  }> {
    const tenant = await this.getTenantByIdOrSlug(tenantIdOrSlug);
    if (!tenant) {
      throw new Error("Lanchonete não encontrada.");
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Atualização persistente no Cloudflare D1
    if (this.env?.DB) {
      try {
        const existing = await this.env.DB.prepare(
          "SELECT id FROM users WHERE tenant_id = ? AND role = 'tenant_admin' LIMIT 1"
        )
          .bind(tenant.id)
          .first<any>();

        if (existing) {
          await this.env.DB.prepare(
            "UPDATE users SET email = ?, password = ?, name = COALESCE(?, name) WHERE id = ?"
          )
            .bind(cleanEmail, cleanPassword, name || null, existing.id)
            .run();
        } else {
          const newUserId = `user-${tenant.id}-${Date.now()}`;
          await this.env.DB.prepare(
            `INSERT INTO users (id, email, password, name, role, tenant_id, status, created_at)
             VALUES (?, ?, ?, ?, 'tenant_admin', ?, 'active', ?)`
          )
            .bind(
              newUserId,
              cleanEmail,
              cleanPassword,
              name || `Admin ${tenant.name}`,
              tenant.id,
              Date.now()
            )
            .run();
        }

        // Também atualiza o e-mail cadastrado na tabela de tenants
        await this.env.DB.prepare(
          "UPDATE tenants SET email = ?, updated_at = ? WHERE id = ?"
        )
          .bind(cleanEmail, Date.now(), tenant.id)
          .run();
      } catch (e) {
        console.warn("D1 updateTenantCredentials error:", e);
      }
    }

    // 2. Limpeza de cache no Cloudflare KV
    const kv = this.getKv();
    if (kv) {
      try {
        await kv.delete(`tenant:${tenant.id}`);
        await kv.delete(`tenant:${tenant.slug.toLowerCase()}`);
      } catch (e) {
        console.warn("KV delete cache error:", e);
      }
    }

    // 3. Sincronização imediata na memória (MemoryStore)
    let user = globalStore.users.find(
      (u) => u.tenantId === tenant.id && u.role === "tenant_admin"
    );

    if (user) {
      user.email = cleanEmail;
      user.password = cleanPassword;
      if (name) user.name = name;
    } else {
      user = {
        id: `user-${tenant.id}-${Date.now()}`,
        email: cleanEmail,
        password: cleanPassword,
        name: name || `Admin ${tenant.name}`,
        role: "tenant_admin",
        tenantId: tenant.id,
        status: "active",
        createdAt: Date.now(),
      };
      globalStore.users.push(user);
    }

    const memTenant = globalStore.tenants.find((t) => t.id === tenant.id);
    if (memTenant) {
      memTenant.email = cleanEmail;
      memTenant.updatedAt = Date.now();
      if (kv) {
        try {
          await kv.put(`tenant:${memTenant.id}`, JSON.stringify(memTenant));
          await kv.put(`tenant:${memTenant.slug.toLowerCase()}`, JSON.stringify(memTenant));
        } catch (err) {
          console.warn("KV put updated tenant error:", err);
        }
      }
    }

    const { password: _, ...safeUser } = user;
    return {
      success: true,
      user: safeUser as User,
      tenant: memTenant || tenant,
      credentials: {
        userId: user.id,
        email: cleanEmail,
        password: cleanPassword,
        name: user.name,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      },
    };
  }

  async updateSuperAdminCredentials(
    userId: string | null | undefined,
    email: string,
    password: string
  ): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Cloudflare D1 integration via env.DB
    if (this.env?.DB) {
      try {
        let query = "UPDATE users SET email = ?, password = ? WHERE role = 'super_admin'";
        const binds: unknown[] = [cleanEmail, password];

        if (userId) {
          query += " AND id = ?";
          binds.push(userId);
        }

        await this.env.DB.prepare(query).bind(...binds).run();

        // Retrieve the updated user record from D1
        const row = await this.env.DB.prepare(
          "SELECT * FROM users WHERE role = 'super_admin' AND LOWER(email) = ? LIMIT 1"
        )
          .bind(cleanEmail)
          .first<any>();

        if (row) {
          // Keep in-memory store in sync
          const memoryUser =
            globalStore.users.find(
              (u) => u.role === "super_admin" && (userId ? u.id === userId : true)
            ) || globalStore.users.find((u) => u.role === "super_admin");

          if (memoryUser) {
            memoryUser.email = cleanEmail;
            memoryUser.password = password;
          }

          return this.mapUserRow(row);
        }
      } catch (e) {
        console.warn("D1 updateSuperAdminCredentials error:", e);
      }
    }

    // 2. Fallback memory store update
    let user = globalStore.users.find(
      (u) => u.role === "super_admin" && (userId ? u.id === userId : true)
    );

    if (!user) {
      user = globalStore.users.find((u) => u.role === "super_admin");
    }

    if (!user) {
      const newUser: User = {
        id: userId || "user-superadmin",
        email: cleanEmail,
        password: password,
        name: "Diretor da Plataforma",
        role: "super_admin",
        tenantId: null,
        status: "active",
        createdAt: Date.now(),
      };
      globalStore.users.push(newUser);
      const { password: _, ...safeUser } = newUser;
      return safeUser as User;
    }

    user.email = cleanEmail;
    user.password = password;
    const { password: _, ...safeUser } = user;
    return safeUser as User;
  }

  // ===================== PRODUCTS =====================

  async getProductsByTenant(tenantId: string): Promise<Product[]> {
    if (this.env?.DB) {
      try {
        const res = await this.env.DB.prepare(
          "SELECT * FROM products WHERE tenant_id = ? ORDER BY created_at DESC"
        )
          .bind(tenantId)
          .all<any>();
        if (res.results && res.results.length > 0) {
          return res.results.map((r: any) => this.mapProductRow(r));
        }
      } catch (e) {
        console.warn("D1 getProducts error:", e);
      }
    }

    return globalStore.products.filter((p) => p.tenantId === tenantId);
  }

  async createProduct(tenantId: string, product: Omit<Product, "id" | "tenantId">): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      createdAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO products (id, tenant_id, name, description, price, category, image, available, options_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newProduct.id,
            newProduct.tenantId,
            newProduct.name,
            newProduct.description,
            newProduct.price,
            newProduct.category,
            newProduct.image,
            newProduct.available ? 1 : 0,
            JSON.stringify(newProduct.options || []),
            newProduct.createdAt
          )
          .run();
      } catch (e) {
        console.warn("D1 createProduct error:", e);
      }
    }

    globalStore.products.unshift(newProduct);
    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put(`product:${newProduct.id}`, JSON.stringify(newProduct));
        await kv.delete(`products:${tenantId}`);
      } catch (e) {
        console.warn("KV product error:", e);
      }
    }
    return newProduct;
  }

  async updateProduct(productId: string, partial: Partial<Product>): Promise<Product | null> {
    let existing = globalStore.products.find((p) => p.id === productId);

    if (!existing && this.env?.DB) {
      try {
        await this.ensureTables();
        const row = await this.env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1")
          .bind(productId)
          .first<any>();
        if (row) {
          existing = this.mapProductRow(row);
          globalStore.products.push(existing);
        }
      } catch (e) {
        console.warn("D1 get product for update error:", e);
      }
    }

    if (!existing) return null;

    const updated = { ...existing, ...partial };
    const idx = globalStore.products.findIndex((p) => p.id === productId);
    if (idx >= 0) {
      globalStore.products[idx] = updated;
    } else {
      globalStore.products.push(updated);
    }

    if (this.env?.DB) {
      try {
        await this.ensureTables();
        await this.env.DB.prepare(
          `UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, available = ?, options_json = ? WHERE id = ?`
        )
          .bind(
            updated.name,
            updated.description,
            updated.price,
            updated.category,
            updated.image,
            updated.available ? 1 : 0,
            JSON.stringify(updated.options || []),
            productId
          )
          .run();
      } catch (e) {
        console.warn("D1 updateProduct error:", e);
      }
    }

    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put(`product:${updated.id}`, JSON.stringify(updated));
        if (updated.tenantId) {
          await kv.delete(`products:${updated.tenantId}`);
        }
      } catch (e) {
        console.warn("KV sync product error:", e);
      }
    }

    return updated;
  }

  async deleteProduct(productId: string): Promise<boolean> {
    const existing = globalStore.products.find((p) => p.id === productId);
    globalStore.products = globalStore.products.filter((p) => p.id !== productId);
    if (this.env?.DB) {
      try {
        await this.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
      } catch (e) {
        console.warn("D1 deleteProduct error:", e);
      }
    }
    const kv = this.getKv();
    if (kv) {
      try {
        await kv.delete(`product:${productId}`);
        if (existing?.tenantId) {
          await kv.delete(`products:${existing.tenantId}`);
        }
      } catch (e) {
        console.warn("KV delete product error:", e);
      }
    }
    return true;
  }

  // ===================== ORDERS =====================

  async getOrdersByTenant(tenantId: string): Promise<Order[]> {
    if (this.env?.DB) {
      try {
        await this.ensureTables();
        const res = await this.env.DB.prepare(
          "SELECT * FROM orders WHERE tenant_id = ? ORDER BY created_at DESC"
        )
          .bind(tenantId)
          .all<any>();
        if (res.results && res.results.length > 0) {
          return res.results.map((r: any) => this.mapOrderRow(r));
        }
      } catch (e) {
        console.warn("D1 getOrders error:", e);
      }
    }

    return globalStore.orders.filter((o) => o.tenantId === tenantId);
  }

  async getAllOrders(): Promise<Order[]> {
    if (this.env?.DB) {
      try {
        await this.ensureTables();
        const res = await this.env.DB.prepare(
          "SELECT * FROM orders ORDER BY created_at DESC"
        ).all<any>();
        if (res.results && res.results.length > 0) {
          return res.results.map((r: any) => this.mapOrderRow(r));
        }
      } catch (e) {
        console.warn("D1 getAllOrders error:", e);
      }
    }

    return [...globalStore.orders];
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    if (!orderId) return null;
    const cleanId = orderId.startsWith("#") ? orderId : `#${orderId}`;
    const rawId = orderId.replace(/^#/, "");

    // 1. D1 Database query
    if (this.env?.DB) {
      try {
        await this.ensureTables();
        const row = await this.env.DB.prepare(
          "SELECT * FROM orders WHERE id = ? OR id = ? OR id = ? LIMIT 1"
        )
          .bind(orderId, cleanId, rawId)
          .first<any>();
        if (row) {
          return this.mapOrderRow(row);
        }
      } catch (e) {
        console.warn("D1 getOrderById error:", e);
      }
    }

    // 2. Cloudflare KV cache query
    const kv = this.getKv();
    if (kv) {
      try {
        const cached = await kv.get(`order:${cleanId}`) || await kv.get(`order:${rawId}`);
        if (cached) return JSON.parse(cached) as Order;
      } catch (e) {
        console.warn("KV get order error:", e);
      }
    }

    // 3. Fallback memory query
    const found = globalStore.orders.find(
      (o) => o.id === orderId || o.id === cleanId || o.id === rawId
    );
    return found || null;
  }

  async createOrder(tenantId: string, orderData: Omit<Order, "id" | "tenantId" | "createdAt">): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId,
      createdAt: Date.now(),
      statusHistory: [{ status: orderData.status, timestamp: Date.now() }],
    };

    if (this.env?.DB) {
      try {
        await this.ensureTables();
        await this.env.DB.prepare(
          `INSERT INTO orders (
            id, tenant_id, customer_name, customer_phone, order_type, payment_method,
            address_json, change_for, subtotal, delivery_fee, total, status,
            items_json, status_history_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newOrder.id,
            newOrder.tenantId,
            newOrder.customerName,
            newOrder.customerPhone,
            newOrder.orderType,
            newOrder.paymentMethod,
            JSON.stringify(newOrder.address || {}),
            newOrder.changeFor || "",
            newOrder.subtotal,
            newOrder.deliveryFee,
            newOrder.total,
            newOrder.status,
            JSON.stringify(newOrder.items || []),
            JSON.stringify(newOrder.statusHistory || []),
            newOrder.createdAt
          )
          .run();
      } catch (e) {
        console.warn("D1 createOrder error:", e);
      }
    }

    globalStore.orders.unshift(newOrder);

    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put(`order:${newOrder.id}`, JSON.stringify(newOrder));
      } catch (e) {
        console.warn("KV put order error:", e);
      }
    }

    return newOrder;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    if (!orderId) return null;
    const cleanId = orderId.startsWith("#") ? orderId : `#${orderId}`;
    const rawId = orderId.replace(/^#/, "");

    // 1. Obtém o pedido atual do D1, KV ou memória
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    order.status = status;
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({ status, timestamp: Date.now() });

    // 2. Persiste imediatamente no Cloudflare D1
    if (this.env?.DB) {
      try {
        await this.ensureTables();
        await this.env.DB.prepare(
          "UPDATE orders SET status = ?, status_history_json = ? WHERE id = ? OR id = ? OR id = ?"
        )
          .bind(status, JSON.stringify(order.statusHistory), order.id, cleanId, rawId)
          .run();
      } catch (e) {
        console.warn("D1 updateOrderStatus error:", e);
      }
    }

    // 3. Atualiza memória global
    const memIndex = globalStore.orders.findIndex(
      (o) => o.id === order.id || o.id === cleanId || o.id === rawId
    );
    if (memIndex >= 0) {
      globalStore.orders[memIndex] = order;
    } else {
      globalStore.orders.unshift(order);
    }

    // 4. Atualiza Cloudflare KV
    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put(`order:${order.id}`, JSON.stringify(order));
        await kv.put(`order:${cleanId}`, JSON.stringify(order));
      } catch (e) {
        console.warn("KV update order error:", e);
      }
    }

    return order;
  }

  // ===================== STATS =====================

  async getPlatformStats(): Promise<{
    totalTenants: number;
    activeTenants: number;
    inactiveTenants: number;
    totalOrders: number;
    totalRevenue: number;
  }> {
    const tenants = await this.getTenants();
    const allOrders = globalStore.orders;
    const active = tenants.filter((t) => t.status === "active").length;
    const totalRev = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalTenants: tenants.length,
      activeTenants: active,
      inactiveTenants: tenants.length - active,
      totalOrders: allOrders.length,
      totalRevenue: totalRev,
    };
  }

  // Row mappers for D1 SQL
  private mapTenantRow(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      phone: row.phone || "",
      whatsapp: row.whatsapp,
      pixKey: row.pix_key,
      pixKeyType: row.pix_key_type || "email",
      deliveryFee: Number(row.delivery_fee) || 0,
      address: row.address,
      hours: row.hours,
      tagline: row.tagline,
      announcement: row.announcement || "",
      logo: row.logo,
      bannerImage: row.banner_image || row.cover_image || "",
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color || row.primary_dark || "#1E293B",
      primaryDark: row.primary_dark,
      primaryLight: row.primary_light,
      accentColor: row.accent_color,
      themeMode: row.theme_mode === "dark" ? "dark" : "light",
      menuLayout: row.menu_layout === "grid" ? "grid" : "list",
      showFeaturedCarousel: row.show_featured_carousel !== undefined ? Boolean(row.show_featured_carousel) : true,
      status: row.status as TenantStatus,
      isOpen: Boolean(row.is_open),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }

  private mapUserRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      tenantId: row.tenant_id,
      status: row.status,
      createdAt: Number(row.created_at),
    };
  }

  private safeJsonParse<T>(val: any, fallback: T): T {
    if (val === null || val === undefined) return fallback;
    if (typeof val === "object") return val as T;
    if (typeof val === "string") {
      try {
        return JSON.parse(val) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  private mapProductRow(row: any): Product {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      category: row.category,
      image: row.image,
      available: Boolean(row.available),
      options: this.safeJsonParse(row.options_json, []),
      createdAt: Number(row.created_at),
    };
  }

  private mapOrderRow(row: any): Order {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      orderType: row.order_type,
      paymentMethod: row.payment_method,
      address: this.safeJsonParse(row.address_json, undefined),
      changeFor: row.change_for,
      subtotal: Number(row.subtotal),
      deliveryFee: Number(row.delivery_fee),
      total: Number(row.total),
      status: row.status,
      items: this.safeJsonParse(row.items_json, []),
      statusHistory: this.safeJsonParse(row.status_history_json, []),
      createdAt: Number(row.created_at),
    };
  }
}
