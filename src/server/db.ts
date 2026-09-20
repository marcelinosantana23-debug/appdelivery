import type {
  Env,
  Tenant,
  User,
  Product,
  Order,
  OrderStatus,
  TenantStatus,
  Customer,
  FinancialReportData,
  DailyRevenueItem,
  PaymentBreakdownItem,
} from "./types";
import { mockProducts } from "../data/mockData";
import { orderEvents } from "./events";

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
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
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
  // Pedidos Concluídos de Exemplo (MS Preparações & Burger Town) para Faturamento
  {
    id: "#4815",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Lucas Mendes",
    customerPhone: "(11) 98112-9900",
    orderType: "delivery",
    paymentMethod: "pix",
    address: {
      street: "Av. Paulista",
      number: "1578",
      district: "Bela Vista",
      complement: "Apto 84",
      reference: "Em frente ao MASP",
    },
    subtotal: 68.0,
    deliveryFee: 5.0,
    total: 73.0,
    status: "done",
    items: [
      {
        id: "item-p1",
        product: { id: "p1", name: "X-Burger Artesanal Duplo", price: 34.0 },
        quantity: 2,
        selectedOptions: [],
        notes: "Maionese à parte",
      },
    ],
    statusHistory: [
      { status: "received", timestamp: Date.now() - 3 * 3600000 },
      { status: "preparing", timestamp: Date.now() - 2.5 * 3600000 },
      { status: "delivering", timestamp: Date.now() - 2.2 * 3600000 },
      { status: "done", timestamp: Date.now() - 2 * 3600000 },
    ],
    createdAt: Date.now() - 3 * 3600000,
  },
  {
    id: "#4816",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Camila Rocha",
    customerPhone: "(11) 97334-1122",
    orderType: "pickup",
    paymentMethod: "card",
    subtotal: 52.0,
    deliveryFee: 0,
    total: 52.0,
    status: "done",
    items: [
      {
        id: "item-p2",
        product: { id: "p2", name: "Smash Burger Especial", price: 26.0 },
        quantity: 2,
        selectedOptions: [],
        notes: "Sem cebola",
      },
    ],
    statusHistory: [
      { status: "received", timestamp: Date.now() - 5 * 3600000 },
      { status: "preparing", timestamp: Date.now() - 4.5 * 3600000 },
      { status: "done", timestamp: Date.now() - 4 * 3600000 },
    ],
    createdAt: Date.now() - 5 * 3600000,
  },
  {
    id: "#4810",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Thiago Santos",
    customerPhone: "(11) 96554-3322",
    orderType: "delivery",
    paymentMethod: "pix",
    address: {
      street: "Rua Bela Cintra",
      number: "450",
      district: "Consolação",
      complement: "Casa 2",
      reference: "Portão cinza",
    },
    subtotal: 86.0,
    deliveryFee: 5.0,
    total: 91.0,
    status: "done",
    items: [
      {
        id: "item-p3",
        product: { id: "p1", name: "Combo Família Lanches", price: 86.0 },
        quantity: 1,
        selectedOptions: [],
        notes: "",
      },
    ],
    statusHistory: [
      { status: "received", timestamp: Date.now() - 26 * 3600000 },
      { status: "done", timestamp: Date.now() - 25 * 3600000 },
    ],
    createdAt: Date.now() - 26 * 3600000,
  },
  {
    id: "#4805",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Juliana Alves",
    customerPhone: "(11) 99871-2244",
    orderType: "delivery",
    paymentMethod: "card",
    address: {
      street: "Rua Haddock Lobo",
      number: "700",
      district: "Cerqueira César",
      complement: "Conjunto 12",
      reference: "",
    },
    subtotal: 62.0,
    deliveryFee: 5.0,
    total: 67.0,
    status: "done",
    items: [
      {
        id: "item-p4",
        product: { id: "p2", name: "Double Cheddar Bacon", price: 31.0 },
        quantity: 2,
        selectedOptions: [],
        notes: "Cheddar bem cremoso",
      },
    ],
    statusHistory: [{ status: "done", timestamp: Date.now() - 2 * 86400000 }],
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    id: "#4799",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Beatriz Lima",
    customerPhone: "(11) 97722-6611",
    orderType: "delivery",
    paymentMethod: "pix",
    subtotal: 95.0,
    deliveryFee: 5.0,
    total: 100.0,
    status: "done",
    items: [
      {
        id: "item-p5",
        product: { id: "p3", name: "Trio Especial da Casa", price: 95.0 },
        quantity: 1,
        selectedOptions: [],
        notes: "",
      },
    ],
    statusHistory: [{ status: "done", timestamp: Date.now() - 3 * 86400000 }],
    createdAt: Date.now() - 3 * 86400000,
  },
  {
    id: "#4790",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Rafael Nogueira",
    customerPhone: "(11) 98443-1234",
    orderType: "pickup",
    paymentMethod: "cash",
    changeFor: "50",
    subtotal: 44.0,
    deliveryFee: 0,
    total: 44.0,
    status: "done",
    items: [
      {
        id: "item-p6",
        product: { id: "p1", name: "Burguer Clássico", price: 22.0 },
        quantity: 2,
        selectedOptions: [],
        notes: "",
      },
    ],
    statusHistory: [{ status: "done", timestamp: Date.now() - 5 * 86400000 }],
    createdAt: Date.now() - 5 * 86400000,
  },
  {
    id: "#4782",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Patricia Gomes",
    customerPhone: "(11) 95532-9090",
    orderType: "delivery",
    paymentMethod: "pix",
    subtotal: 78.0,
    deliveryFee: 5.0,
    total: 83.0,
    status: "done",
    items: [
      {
        id: "item-p7",
        product: { id: "p1", name: "Combo MS Especial", price: 78.0 },
        quantity: 1,
        selectedOptions: [],
        notes: "",
      },
    ],
    statusHistory: [{ status: "done", timestamp: Date.now() - 7 * 86400000 }],
    createdAt: Date.now() - 7 * 86400000,
  },
  {
    id: "#4770",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Marcelo Vieira",
    customerPhone: "(11) 94411-8833",
    orderType: "delivery",
    paymentMethod: "card",
    subtotal: 110.0,
    deliveryFee: 5.0,
    total: 115.0,
    status: "done",
    items: [
      {
        id: "item-p8",
        product: { id: "p1", name: "Combo Galera 4 Lanches", price: 110.0 },
        quantity: 1,
        selectedOptions: [],
        notes: "",
      },
    ],
    statusHistory: [{ status: "done", timestamp: Date.now() - 10 * 86400000 }],
    createdAt: Date.now() - 10 * 86400000,
  },
  {
    id: "#4761",
    tenantId: "tenant-ms-preparacoes",
    customerName: "Marcos Paulo",
    customerPhone: "(11) 91122-3344",
    orderType: "delivery",
    paymentMethod: "pix",
    subtotal: 58.0,
    deliveryFee: 5.0,
    total: 63.0,
    status: "cancelled", // Este pedido cancelado NÃO deve entrar no faturamento
    items: [
      {
        id: "item-p9",
        product: { id: "p1", name: "X-Burger Artesanal", price: 29.0 },
        quantity: 2,
        selectedOptions: [],
        notes: "Cancelado pelo cliente",
      },
    ],
    statusHistory: [{ status: "cancelled", timestamp: Date.now() - 4 * 86400000 }],
    createdAt: Date.now() - 4 * 86400000,
  },
];

const initialCustomers: Customer[] = [
  {
    id: "cust-mariana-silva",
    tenantId: "tenant-burger-town",
    name: "Mariana Silva",
    phone: "(11) 98765-4321",
    street: "Rua Augusta",
    number: "1200",
    district: "Consolação",
    complement: "Apto 42",
    reference: "Próximo ao metrô",
    totalOrders: 1,
    totalSpent: 60.0,
    lastOrderAt: Date.now() - 15 * 60000,
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now() - 15 * 60000,
  },
  {
    id: "cust-rodrigo-costa",
    tenantId: "tenant-burger-town",
    name: "Rodrigo Costa",
    phone: "(11) 97123-8899",
    totalOrders: 1,
    totalSpent: 32.0,
    lastOrderAt: Date.now() - 40 * 60000,
    createdAt: Date.now() - 20 * 86400000,
    updatedAt: Date.now() - 40 * 60000,
  },
  {
    id: "cust-fernanda-lima",
    tenantId: "tenant-pizza-bella",
    name: "Fernanda Lima",
    phone: "(11) 99112-2334",
    street: "Alameda Santos",
    number: "850",
    district: "Cerqueira César",
    complement: "Bloco B - 110",
    reference: "Portaria 24h",
    totalOrders: 1,
    totalSpent: 61.5,
    lastOrderAt: Date.now() - 8 * 60000,
    createdAt: Date.now() - 10 * 86400000,
    updatedAt: Date.now() - 8 * 60000,
  },
];

// In-memory data store for Node.js / preview runtime (with persistence)
class MemoryStore {
  tenants: Tenant[] = [...initialTenants];
  users: User[] = [...initialUsers];
  products: Product[] = [...initialProducts];
  orders: Order[] = [...initialOrders];
  customers: Customer[] = [...initialCustomers];

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
      const db = this.env.DB;

      // 1. Criação das tabelas principais com todos os campos necessários
      const tableQueries = [
        `CREATE TABLE IF NOT EXISTS tenants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL DEFAULT '',
          phone TEXT DEFAULT '',
          whatsapp TEXT NOT NULL DEFAULT '',
          pix_key TEXT DEFAULT '',
          pix_key_type TEXT DEFAULT 'email',
          delivery_fee REAL DEFAULT 5.0,
          min_order REAL DEFAULT 0,
          estimated_time TEXT DEFAULT '30-45 min',
          address TEXT DEFAULT 'Centro',
          hours TEXT DEFAULT '18:00 - 23:30',
          tagline TEXT DEFAULT '',
          announcement TEXT DEFAULT '',
          logo TEXT DEFAULT '🍔',
          banner TEXT DEFAULT '',
          banner_image TEXT DEFAULT '',
          primary_color TEXT DEFAULT '#E63946',
          secondary_color TEXT DEFAULT '#1E293B',
          primary_dark TEXT DEFAULT '#C1121F',
          primary_light TEXT DEFAULT '#F77F00',
          accent_color TEXT DEFAULT '#FCBF49',
          status TEXT DEFAULT 'active',
          is_open INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'tenant_admin',
          tenant_id TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category TEXT NOT NULL DEFAULT 'lanches',
          image TEXT NOT NULL DEFAULT '',
          available INTEGER NOT NULL DEFAULT 1,
          options_json TEXT DEFAULT '[]',
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          order_type TEXT NOT NULL DEFAULT 'delivery',
          payment_method TEXT NOT NULL DEFAULT 'pix',
          address_json TEXT DEFAULT '{}',
          change_for TEXT,
          subtotal REAL NOT NULL,
          delivery_fee REAL NOT NULL,
          total REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'received',
          items_json TEXT NOT NULL DEFAULT '[]',
          status_history_json TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          address_street TEXT,
          address_number TEXT,
          address_district TEXT,
          address_complement TEXT,
          address_reference TEXT,
          total_orders INTEGER DEFAULT 1,
          total_spent REAL DEFAULT 0,
          last_order_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`
      ];

      for (const query of tableQueries) {
        try {
          await db.prepare(query).run();
        } catch (e) {
          console.warn("D1 create table warning:", e);
        }
      }

      // 2. Migração segura de colunas para tabelas já existentes no D1 (evita erro de coluna ausente)
      const alterQueries = [
        "ALTER TABLE tenants ADD COLUMN email TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN phone TEXT DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN whatsapp TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN pix_key TEXT DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN pix_key_type TEXT DEFAULT 'email'",
        "ALTER TABLE tenants ADD COLUMN delivery_fee REAL DEFAULT 5.0",
        "ALTER TABLE tenants ADD COLUMN min_order REAL DEFAULT 0",
        "ALTER TABLE tenants ADD COLUMN estimated_time TEXT DEFAULT '30-45 min'",
        "ALTER TABLE tenants ADD COLUMN address TEXT DEFAULT 'Centro'",
        "ALTER TABLE tenants ADD COLUMN hours TEXT DEFAULT '18:00 - 23:30'",
        "ALTER TABLE tenants ADD COLUMN tagline TEXT DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN announcement TEXT DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN logo TEXT DEFAULT '🍔'",
        "ALTER TABLE tenants ADD COLUMN banner TEXT DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN banner_image TEXT DEFAULT ''",
        "ALTER TABLE tenants ADD COLUMN primary_color TEXT DEFAULT '#E63946'",
        "ALTER TABLE tenants ADD COLUMN secondary_color TEXT DEFAULT '#1E293B'",
        "ALTER TABLE tenants ADD COLUMN primary_dark TEXT DEFAULT '#C1121F'",
        "ALTER TABLE tenants ADD COLUMN primary_light TEXT DEFAULT '#F77F00'",
        "ALTER TABLE tenants ADD COLUMN accent_color TEXT DEFAULT '#FCBF49'",
        "ALTER TABLE tenants ADD COLUMN status TEXT DEFAULT 'active'",
        "ALTER TABLE tenants ADD COLUMN is_open INTEGER DEFAULT 1",
        "ALTER TABLE tenants ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE tenants ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE products ADD COLUMN options_json TEXT DEFAULT '[]'",
        "ALTER TABLE products ADD COLUMN available INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE users ADD COLUMN tenant_id TEXT",
        "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'"
      ];

      for (const alter of alterQueries) {
        try {
          await db.prepare(alter).run();
        } catch {
          // Coluna já existe no D1, ignorar
        }
      }

      // 3. Índices de performance
      const indexQueries = [
        "CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id)"
      ];

      for (const idx of indexQueries) {
        try {
          await db.prepare(idx).run();
        } catch {
          // Ignorar se já existir
        }
      }

      // 4. Se a tabela tenants do D1 estiver vazia, sincroniza dados de inicialização
      try {
        const countRes = await db.prepare("SELECT count(*) as total FROM tenants").first<{ total: number }>();
        if (!countRes || Number(countRes.total) === 0) {
          for (const t of initialTenants) {
            await this.insertTenantRow(t);
          }
          for (const u of initialUsers) {
            await this.insertUserRow(u);
          }
          for (const p of initialProducts) {
            await this.insertProductRow(p);
          }
        }
      } catch (e) {
        console.warn("D1 seed initial check warning:", e);
      }

      Database.tablesInitialized = true;
    } catch (e) {
      console.warn("D1 ensureTables warning:", e);
    }
  }

  private async insertTenantRow(t: Tenant): Promise<void> {
    if (!this.env?.DB) return;
    try {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO tenants (
          id, name, slug, email, phone, whatsapp, pix_key, pix_key_type,
          delivery_fee, min_order, estimated_time, address, hours, tagline,
          announcement, logo, banner, banner_image, primary_color, secondary_color,
          primary_dark, primary_light, accent_color, status, is_open,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          t.id,
          t.name,
          t.slug,
          t.email,
          t.phone || "",
          t.whatsapp,
          t.pixKey,
          t.pixKeyType,
          t.deliveryFee,
          0,
          "30-45 min",
          t.address,
          t.hours,
          t.tagline,
          t.announcement || "",
          t.logo,
          t.bannerImage || "",
          t.bannerImage || "",
          t.primaryColor,
          t.secondaryColor || "#1E293B",
          t.primaryDark,
          t.primaryLight,
          t.accentColor,
          t.status,
          t.isOpen ? 1 : 0,
          t.createdAt,
          t.updatedAt
        )
        .run();
    } catch {
      // ignore
    }
  }

  private async insertUserRow(u: User): Promise<void> {
    if (!this.env?.DB) return;
    try {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO users (id, email, password, name, role, tenant_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          u.id,
          u.email,
          u.password || "123456",
          u.name,
          u.role,
          u.tenantId || null,
          u.status,
          u.createdAt
        )
        .run();
    } catch {
      // ignore
    }
  }

  private async insertProductRow(p: Product): Promise<void> {
    if (!this.env?.DB) return;
    try {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO products (id, tenant_id, name, description, price, category, image, available, options_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          p.id,
          p.tenantId,
          p.name,
          p.description || "",
          p.price,
          p.category,
          p.image || "",
          p.available ? 1 : 0,
          JSON.stringify(p.options || []),
          p.createdAt
        )
        .run();
    } catch {
      // ignore
    }
  }

  private getKv() {
    return this.env?.KV || this.env?.STORE_KV;
  }

  // ===================== TENANTS =====================

  async getTenants(): Promise<Tenant[]> {
    await this.ensureTables();
    if (this.env?.DB) {
      try {
        const res = await this.env.DB.prepare(
          "SELECT * FROM tenants ORDER BY created_at DESC"
        ).all<any>();
        if (res.results && res.results.length > 0) {
          const d1Tenants = res.results.map((r: any) => this.mapTenantRow(r));
          // Sincroniza store em memória para manter consistência
          for (const dt of d1Tenants) {
            const idx = globalStore.tenants.findIndex((t) => t.id === dt.id || t.slug === dt.slug);
            if (idx >= 0) {
              globalStore.tenants[idx] = dt;
            } else {
              globalStore.tenants.push(dt);
            }
          }
          return d1Tenants;
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
    bannerImage?: string;
    logo?: string;
    tagline?: string;
    description?: string;
  }): Promise<Tenant> {
    const slug = data.slug
      ? globalStore.slugify(data.slug)
      : globalStore.slugify(data.name);

    // Ensure unique slug in memory and in Cloudflare D1
    let finalSlug = slug;
    let counter = 1;
    while (globalStore.tenants.some((t) => t.slug === finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }

    await this.ensureTables();

    if (this.env?.DB) {
      try {
        const existingInD1 = await this.env.DB.prepare(
          "SELECT id FROM tenants WHERE LOWER(slug) = ? LIMIT 1"
        )
          .bind(finalSlug.toLowerCase())
          .first<any>();
        if (existingInD1) {
          finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
        }
      } catch {
        // ignore
      }
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
      tagline: data.tagline || data.description || `Cardápio Online - ${data.name}`,
      logo: data.logo || "🍔",
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

    // GRAVAÇÃO OBRIGATÓRIA E DIRETA NO CLOUDFLARE D1
    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO tenants (
            id, name, slug, email, phone, whatsapp, pix_key, pix_key_type,
            delivery_fee, min_order, estimated_time, address, hours, tagline,
            announcement, logo, banner, banner_image, primary_color, secondary_color,
            primary_dark, primary_light, accent_color, status, is_open,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            0,
            "30-45 min",
            newTenant.address,
            newTenant.hours,
            newTenant.tagline,
            newTenant.announcement || "",
            newTenant.logo,
            newTenant.bannerImage || "",
            newTenant.bannerImage || "",
            newTenant.primaryColor,
            newTenant.secondaryColor || "#1E293B",
            newTenant.primaryDark,
            newTenant.primaryLight,
            newTenant.accentColor,
            newTenant.status,
            newTenant.isOpen ? 1 : 0,
            newTenant.createdAt,
            newTenant.updatedAt
          )
          .run();

        console.log(`[D1 SUCCESS] Tenant ${newTenant.id} (${newTenant.name}) gravado diretamente no Cloudflare D1!`);
      } catch (err: any) {
        console.error("[CRITICAL D1 ERROR] Falha no insert completo do tenant no D1:", err);
        // Fallback resiliente com colunas essenciais
        try {
          await this.env.DB.prepare(
            `INSERT OR REPLACE INTO tenants (
              id, name, slug, email, phone, whatsapp, pix_key,
              delivery_fee, address, hours, tagline, logo,
              primary_color, status, is_open, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              newTenant.id,
              newTenant.name,
              newTenant.slug,
              newTenant.email,
              newTenant.phone || "",
              newTenant.whatsapp,
              newTenant.pixKey,
              newTenant.deliveryFee,
              newTenant.address,
              newTenant.hours,
              newTenant.tagline,
              newTenant.logo,
              newTenant.primaryColor,
              newTenant.status,
              newTenant.isOpen ? 1 : 0,
              newTenant.createdAt,
              newTenant.updatedAt
            )
            .run();
          console.log(`[D1 FALLBACK SUCCESS] Tenant ${newTenant.id} gravado no D1 via fallback.`);
        } catch (err2: any) {
          console.error("[FATAL D1 INSERT ERROR]:", err2);
          throw new Error(`Falha crítica de persistência no Cloudflare D1: ${err.message || err2.message}`);
        }
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
        await this.env.DB.prepare("DELETE FROM products WHERE tenant_id = ?").bind(tenant.id).run();
        await this.env.DB.prepare("DELETE FROM orders WHERE tenant_id = ?").bind(tenant.id).run();
        await this.env.DB.prepare("DELETE FROM users WHERE tenant_id = ?").bind(tenant.id).run();
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
    await this.ensureTables();

    // Resolver tenant para obter ID exato e slug correspondente
    const tenant = await this.getTenantByIdOrSlug(tenantId);
    const resolvedId = tenant ? tenant.id : tenantId;
    const resolvedSlug = tenant ? tenant.slug : tenantId;

    if (this.env?.DB) {
      try {
        const res = await this.env.DB.prepare(
          "SELECT * FROM products WHERE tenant_id = ? OR tenant_id = ? ORDER BY created_at DESC"
        )
          .bind(resolvedId, resolvedSlug)
          .all<any>();
        if (res.results && res.results.length > 0) {
          return res.results.map((r: any) => this.mapProductRow(r));
        }
      } catch (e) {
        console.warn("D1 getProducts error:", e);
      }
    }

    const memTenant = globalStore.tenants.find((t) => t.id === tenantId || t.slug === tenantId);
    const memId = memTenant ? memTenant.id : resolvedId;
    const memSlug = memTenant ? memTenant.slug : resolvedSlug;

    return globalStore.products.filter(
      (p) => p.tenantId === memId || p.tenantId === memSlug
    );
  }

  async createProduct(tenantId: string, product: Omit<Product, "id" | "tenantId">): Promise<Product> {
    await this.ensureTables();
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      available: product.available !== undefined ? Boolean(product.available) : true,
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
            newProduct.image || "",
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

    // Auto-cadastro e persistência automática de cliente vinculado à loja
    try {
      await this.saveOrUpdateCustomerFromOrder(tenantId, newOrder);
    } catch (custErr) {
      console.warn("Auto-register customer error:", custErr);
    }

    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put(`order:${newOrder.id}`, JSON.stringify(newOrder));
      } catch (e) {
        console.warn("KV put order error:", e);
      }
    }

    // Emite evento em tempo real para os lojistas conectados instantaneamente
    try {
      orderEvents.emit(newOrder, true);
    } catch (e) {
      console.warn("Error emitting new order event:", e);
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

    // 5. Emite evento em tempo real para os clientes conectados
    try {
      orderEvents.emit(order);
    } catch (e) {
      console.warn("Error emitting order event:", e);
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

  // ===================== RELATÓRIO FINANCEIRO (D1 / MEMÓRIA) =====================

  async getFinancialReport(
    tenantId: string,
    options?: {
      month?: number;
      year?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<FinancialReportData> {
    const now = new Date();
    const targetYear = options?.year ? Number(options.year) : now.getFullYear();
    const targetMonth = options?.month ? Number(options.month) : now.getMonth() + 1;

    const monthNamesPt = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const daysOfWeekPt = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    let periodStartMs: number;
    let periodEndMs: number;
    let formattedStartDate: string;
    let formattedEndDate: string;
    let isCustomRange = false;

    if (options?.startDate && options?.endDate) {
      isCustomRange = true;
      formattedStartDate = options.startDate;
      formattedEndDate = options.endDate;
      periodStartMs = new Date(`${options.startDate}T00:00:00.000`).getTime();
      periodEndMs = new Date(`${options.endDate}T23:59:59.999`).getTime();
    } else {
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const startD = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
      const endD = new Date(targetYear, targetMonth - 1, daysInMonth, 23, 59, 59, 999);
      periodStartMs = startD.getTime();
      periodEndMs = endD.getTime();
      const mStr = String(targetMonth).padStart(2, "0");
      formattedStartDate = `${targetYear}-${mStr}-01`;
      formattedEndDate = `${targetYear}-${mStr}-${String(daysInMonth).padStart(2, "0")}`;
    }

    // Limites do dia de hoje (00:00 às 23:59:59.999)
    const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const todayEndMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const isCompletedStatus = (status: string) => {
      if (!status) return false;
      const s = status.trim().toLowerCase();
      return (
        s === "done" ||
        s === "concluido" ||
        s === "concluído" ||
        s === "entregue" ||
        s === "finalizado"
      );
    };

    let periodCompletedOrders: Order[] = [];
    let todayCompletedOrdersList: Order[] = [];

    // 1. Tenta recuperar do Cloudflare D1
    if (this.env?.DB) {
      try {
        await this.ensureTables();
        const periodRes = await this.env.DB.prepare(`
          SELECT * FROM orders
          WHERE tenant_id = ?
            AND status IN ('done', 'Concluído', 'concluido', 'Entregue', 'entregue', 'finalizado')
            AND created_at >= ? AND created_at <= ?
          ORDER BY created_at DESC
        `)
          .bind(tenantId, periodStartMs, periodEndMs)
          .all<any>();

        if (periodRes.results && periodRes.results.length > 0) {
          periodCompletedOrders = periodRes.results.map((r: any) => this.mapOrderRow(r));
        }

        const todayRes = await this.env.DB.prepare(`
          SELECT * FROM orders
          WHERE tenant_id = ?
            AND status IN ('done', 'Concluído', 'concluido', 'Entregue', 'entregue', 'finalizado')
            AND created_at >= ? AND created_at <= ?
          ORDER BY created_at DESC
        `)
          .bind(tenantId, todayStartMs, todayEndMs)
          .all<any>();

        if (todayRes.results && todayRes.results.length > 0) {
          todayCompletedOrdersList = todayRes.results.map((r: any) => this.mapOrderRow(r));
        }
      } catch (e) {
        console.warn("D1 getFinancialReport error:", e);
      }
    }

    // 2. Fallback em memória (Store global)
    if (periodCompletedOrders.length === 0) {
      const tenantOrders = globalStore.orders.filter(
        (o) =>
          o.tenantId === tenantId ||
          (tenantId === "marcelino" && o.tenantId === "tenant-ms-preparacoes") ||
          (tenantId === "tenant-ms-preparacoes" && o.tenantId === "marcelino")
      );
      periodCompletedOrders = tenantOrders.filter(
        (o) => isCompletedStatus(o.status) && o.createdAt >= periodStartMs && o.createdAt <= periodEndMs
      );
      todayCompletedOrdersList = tenantOrders.filter(
        (o) => isCompletedStatus(o.status) && o.createdAt >= todayStartMs && o.createdAt <= todayEndMs
      );
    } else if (todayCompletedOrdersList.length === 0) {
      const tenantOrders = globalStore.orders.filter(
        (o) =>
          o.tenantId === tenantId ||
          (tenantId === "marcelino" && o.tenantId === "tenant-ms-preparacoes") ||
          (tenantId === "tenant-ms-preparacoes" && o.tenantId === "marcelino")
      );
      todayCompletedOrdersList = tenantOrders.filter(
        (o) => isCompletedStatus(o.status) && o.createdAt >= todayStartMs && o.createdAt <= todayEndMs
      );
    }

    // Ordenar pedidos do período por data decrescente (mais recentes primeiro)
    periodCompletedOrders.sort((a, b) => b.createdAt - a.createdAt);

    // Cálculos de métricas principais solicitadas
    const monthRevenue = periodCompletedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const monthCompletedOrders = periodCompletedOrders.length;
    const averageTicket = monthCompletedOrders > 0 ? monthRevenue / monthCompletedOrders : 0;

    const todayRevenue = todayCompletedOrdersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const todayCompletedOrders = todayCompletedOrdersList.length;

    let deliveredCount = 0;
    let pickupCount = 0;
    let deliveryFeeTotal = 0;

    periodCompletedOrders.forEach((o) => {
      if (o.orderType === "delivery" || (o as any).delivery_type === "delivery") {
        deliveredCount++;
        deliveryFeeTotal += Number(o.deliveryFee) || 0;
      } else {
        pickupCount++;
      }
    });

    // Mapeamento diário para gráfico de rendimento
    const dailyMap = new Map<string, { revenue: number; count: number; dateObj: Date }>();

    if (isCustomRange) {
      const cur = new Date(periodStartMs);
      const end = new Date(periodEndMs);
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        const key = `${y}-${m}-${d}`;
        dailyMap.set(key, { revenue: 0, count: 0, dateObj: new Date(cur) });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = String(day).padStart(2, "0");
        const mStr = String(targetMonth).padStart(2, "0");
        const key = `${targetYear}-${mStr}-${dStr}`;
        const dateObj = new Date(targetYear, targetMonth - 1, day, 12, 0, 0);
        dailyMap.set(key, { revenue: 0, count: 0, dateObj });
      }
    }

    // Acumula os pedidos nos seus respectivos dias
    periodCompletedOrders.forEach((o) => {
      const oDate = new Date(o.createdAt);
      const y = oDate.getFullYear();
      const m = String(oDate.getMonth() + 1).padStart(2, "0");
      const d = String(oDate.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;

      const existing = dailyMap.get(key);
      if (existing) {
        existing.revenue += Number(o.total) || 0;
        existing.count += 1;
      } else {
        dailyMap.set(key, { revenue: Number(o.total) || 0, count: 1, dateObj: oDate });
      }
    });

    const dailyRevenue: DailyRevenueItem[] = Array.from(dailyMap.entries()).map(([dateStr, item]) => {
      const dayNum = item.dateObj.getDate();
      const dayOfWeekStr = daysOfWeekPt[item.dateObj.getDay()] || "";
      return {
        day: dayNum,
        date: dateStr,
        dayOfWeek: dayOfWeekStr,
        revenue: Math.round(item.revenue * 100) / 100,
        ordersCount: item.count,
      };
    });

    // Detalhamento por método de pagamento
    const paymentMap: Record<string, { total: number; count: number }> = {
      pix: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      cash: { total: 0, count: 0 },
    };

    periodCompletedOrders.forEach((o) => {
      const method = (o.paymentMethod || "pix").toLowerCase();
      if (!paymentMap[method]) {
        paymentMap[method] = { total: 0, count: 0 };
      }
      paymentMap[method].total += Number(o.total) || 0;
      paymentMap[method].count += 1;
    });

    const paymentLabels: Record<string, string> = {
      pix: "PIX",
      card: "Cartão (Crédito/Débito)",
      cash: "Dinheiro em Espécie",
    };

    const paymentBreakdown: PaymentBreakdownItem[] = Object.entries(paymentMap)
      .filter(([_, val]) => val.count > 0)
      .map(([method, val]) => ({
        method,
        label: paymentLabels[method] || method.toUpperCase(),
        total: Math.round(val.total * 100) / 100,
        count: val.count,
        percent: monthRevenue > 0 ? Math.round((val.total / monthRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      period: {
        month: targetMonth,
        year: targetYear,
        monthName: monthNamesPt[targetMonth - 1] || `Mês ${targetMonth}`,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      },
      metrics: {
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        monthRevenue: Math.round(monthRevenue * 100) / 100,
        monthCompletedOrders,
        averageTicket: Math.round(averageTicket * 100) / 100,
        todayCompletedOrders,
        deliveredCount,
        pickupCount,
        deliveryFeeTotal: Math.round(deliveryFeeTotal * 100) / 100,
      },
      dailyRevenue,
      paymentBreakdown,
      orders: periodCompletedOrders,
    };
  }

  // Row mappers for D1 SQL
  private mapTenantRow(row: any): Tenant {
    return {
      id: row.id,
      name: row.name || "Estabelecimento",
      slug: row.slug || row.id,
      email: row.email || "",
      phone: row.phone || "",
      whatsapp: row.whatsapp || "5511999999999",
      pixKey: row.pix_key || row.email || "",
      pixKeyType: row.pix_key_type || "email",
      deliveryFee: Number(row.delivery_fee) || 0,
      address: row.address || "Centro",
      hours: row.hours || "18:00 - 23:30",
      tagline: row.tagline || "",
      announcement: row.announcement || "",
      logo: row.logo || "🍔",
      bannerImage: row.banner_image || row.cover_image || row.banner || "",
      primaryColor: row.primary_color || "#E63946",
      secondaryColor: row.secondary_color || row.primary_dark || "#1E293B",
      primaryDark: row.primary_dark || "#C1121F",
      primaryLight: row.primary_light || "#F77F00",
      accentColor: row.accent_color || "#FCBF49",
      themeMode: row.theme_mode === "dark" ? "dark" : "light",
      menuLayout: row.menu_layout === "grid" ? "grid" : "list",
      showFeaturedCarousel: row.show_featured_carousel !== undefined ? Boolean(row.show_featured_carousel) : true,
      status: (row.status === "inactive" ? "inactive" : "active") as TenantStatus,
      isOpen: Boolean(row.is_open !== undefined ? row.is_open : 1),
      createdAt: Number(row.created_at) || Date.now(),
      updatedAt: Number(row.updated_at) || Date.now(),
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
    const isAvail =
      row.available !== undefined && row.available !== null
        ? row.available === 1 ||
          row.available === true ||
          row.available === "1" ||
          row.available === "true" ||
          row.available === "active"
        : true;

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description || "",
      price: Number(row.price) || 0,
      category: row.category || "geral",
      image: row.image || "",
      available: isAvail,
      options: this.safeJsonParse(row.options_json, []),
      createdAt: Number(row.created_at) || Date.now(),
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

  // ===================== CUSTOMERS =====================

  private mapCustomerRow(row: any): Customer {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      phone: row.phone,
      street: row.address_street || undefined,
      number: row.address_number || undefined,
      district: row.address_district || undefined,
      complement: row.address_complement || undefined,
      reference: row.address_reference || undefined,
      totalOrders: Number(row.total_orders || 1),
      totalSpent: Number(row.total_spent || 0),
      lastOrderAt: Number(row.last_order_at || row.created_at || Date.now()),
      createdAt: Number(row.created_at || Date.now()),
      updatedAt: Number(row.updated_at || Date.now()),
    };
  }

  async getCustomersByTenant(tenantId: string): Promise<Customer[]> {
    if (!tenantId) return [];

    // 1. D1 Database
    if (this.env?.DB) {
      try {
        await this.ensureTables();
        const res = await this.env.DB.prepare(
          "SELECT * FROM customers WHERE tenant_id = ? ORDER BY last_order_at DESC"
        )
          .bind(tenantId)
          .all<any>();

        if (res.results && res.results.length > 0) {
          return res.results.map((r) => this.mapCustomerRow(r));
        }
      } catch (e) {
        console.warn("D1 getCustomersByTenant error:", e);
      }
    }

    // 2. Fallback memory store
    return globalStore.customers
      .filter((c) => c.tenantId === tenantId)
      .sort((a, b) => b.lastOrderAt - a.lastOrderAt);
  }

  async getCustomerByPhone(tenantId: string, phone: string): Promise<Customer | null> {
    if (!tenantId || !phone) return null;
    const cleanDigits = phone.replace(/\D/g, "");

    // 1. D1 Database
    if (this.env?.DB) {
      try {
        await this.ensureTables();
        const res = await this.env.DB.prepare(
          `SELECT * FROM customers 
           WHERE tenant_id = ? 
             AND (phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ?)
           LIMIT 1`
        )
          .bind(tenantId, phone, cleanDigits)
          .first<any>();

        if (res) {
          return this.mapCustomerRow(res);
        }
      } catch (e) {
        console.warn("D1 getCustomerByPhone error:", e);
      }
    }

    // 2. Fallback memory store
    const found = globalStore.customers.find((c) => {
      if (c.tenantId !== tenantId) return false;
      const cDigits = c.phone.replace(/\D/g, "");
      return c.phone === phone || (cleanDigits.length >= 8 && cDigits === cleanDigits);
    });

    return found || null;
  }

  async saveOrUpdateCustomerFromOrder(tenantId: string, order: Order): Promise<Customer> {
    const name = (order.customerName || "Cliente").trim();
    const phone = (order.customerPhone || "").trim();
    const cleanDigits = phone.replace(/\D/g, "");
    const street = order.address?.street?.trim() || "";
    const number = order.address?.number?.trim() || "";
    const district = order.address?.district?.trim() || "";
    const complement = order.address?.complement?.trim() || "";
    const reference = order.address?.reference?.trim() || "";
    const total = order.total || 0;
    const now = Date.now();

    // 1. Verifica se já existe cliente cadastrado para este telefone na loja
    const existing = await this.getCustomerByPhone(tenantId, phone);

    if (existing) {
      // Atualiza os dados do cliente recorrente
      const updatedTotalOrders = (existing.totalOrders || 1) + 1;
      const updatedTotalSpent = (existing.totalSpent || 0) + total;
      const updatedName = name || existing.name;
      const updatedStreet = street || existing.street;
      const updatedNumber = number || existing.number;
      const updatedDistrict = district || existing.district;
      const updatedComplement = complement || existing.complement;
      const updatedReference = reference || existing.reference;

      if (this.env?.DB) {
        try {
          await this.ensureTables();
          await this.env.DB.prepare(
            `UPDATE customers SET
              name = ?,
              address_street = ?,
              address_number = ?,
              address_district = ?,
              address_complement = ?,
              address_reference = ?,
              total_orders = ?,
              total_spent = ?,
              last_order_at = ?,
              updated_at = ?
            WHERE id = ?`
          )
            .bind(
              updatedName,
              updatedStreet || null,
              updatedNumber || null,
              updatedDistrict || null,
              updatedComplement || null,
              updatedReference || null,
              updatedTotalOrders,
              updatedTotalSpent,
              now,
              now,
              existing.id
            )
            .run();
        } catch (e) {
          console.warn("D1 update customer error:", e);
        }
      }

      // Atualiza memória
      existing.name = updatedName;
      existing.street = updatedStreet;
      existing.number = updatedNumber;
      existing.district = updatedDistrict;
      existing.complement = updatedComplement;
      existing.reference = updatedReference;
      existing.totalOrders = updatedTotalOrders;
      existing.totalSpent = updatedTotalSpent;
      existing.lastOrderAt = now;
      existing.updatedAt = now;

      // Atualiza KV se disponível
      const kv = this.getKv();
      if (kv && cleanDigits) {
        try {
          await kv.put(`customer:${tenantId}:${cleanDigits}`, JSON.stringify(existing));
        } catch (e) {
          console.warn("KV put customer error:", e);
        }
      }

      return existing;
    }

    // 2. Se não existir, cadastra novo cliente na loja
    const newCustomer: Customer = {
      id: `cust-${now}-${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId,
      name,
      phone,
      street: street || undefined,
      number: number || undefined,
      district: district || undefined,
      complement: complement || undefined,
      reference: reference || undefined,
      totalOrders: 1,
      totalSpent: total,
      lastOrderAt: now,
      createdAt: now,
      updatedAt: now,
    };

    if (this.env?.DB) {
      try {
        await this.ensureTables();
        await this.env.DB.prepare(
          `INSERT INTO customers (
            id, tenant_id, name, phone, address_street, address_number,
            address_district, address_complement, address_reference,
            total_orders, total_spent, last_order_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newCustomer.id,
            newCustomer.tenantId,
            newCustomer.name,
            newCustomer.phone,
            newCustomer.street || null,
            newCustomer.number || null,
            newCustomer.district || null,
            newCustomer.complement || null,
            newCustomer.reference || null,
            newCustomer.totalOrders,
            newCustomer.totalSpent,
            newCustomer.lastOrderAt,
            newCustomer.createdAt,
            newCustomer.updatedAt
          )
          .run();
      } catch (e) {
        console.warn("D1 insert customer error:", e);
      }
    }

    globalStore.customers.unshift(newCustomer);

    const kv = this.getKv();
    if (kv && cleanDigits) {
      try {
        await kv.put(`customer:${tenantId}:${cleanDigits}`, JSON.stringify(newCustomer));
      } catch (e) {
        console.warn("KV put customer error:", e);
      }
    }

    return newCustomer;
  }
}
