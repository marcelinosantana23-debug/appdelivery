import type {
  Env,
  Tenant,
  User,
  Product,
  Category,
  EstablishmentCategory,
  Order,
  OrderStatus,
  TenantStatus,
  Customer,
  FinancialReportData,
  DailyRevenueItem,
  PaymentBreakdownItem,
  PlatformSettings,
  TopSellingProduct,
  FeaturedStoreRanked,
  StoreStory,
} from "./types";
import { mockProducts } from "../data/mockData";
import { orderEvents } from "./events";

// Seed data para demonstração e inicialização
const initialTenants: Tenant[] = [
  {
    id: "tenant-ms-preparacoes",
    name: "MS Preparações",
    slug: "ms-preparacoes",
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
    isFeatured: true,
    priorityOrder: 10,
    businessType: "Lanchonetes",
    rating: 4.9,
    ratingCount: 184,
    status: "active",
    isOpen: true,
    subscriptionStatus: "demo",
    monthlyFee: 49.9,
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
    bannerImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#E63946",
    secondaryColor: "#1E293B",
    primaryDark: "#C1121F",
    primaryLight: "#F77F00",
    accentColor: "#FCBF49",
    themeMode: "light",
    menuLayout: "list",
    showFeaturedCarousel: true,
    isFeatured: true,
    priorityOrder: 5,
    businessType: "Lanchonetes",
    rating: 4.8,
    ratingCount: 126,
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
    announcement: "🍕 Tradicionais pizzas no forno a lenha e bordas recheadas!",
    logo: "🍕",
    bannerImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#059669",
    secondaryColor: "#0F172A",
    primaryDark: "#047857",
    primaryLight: "#10B981",
    accentColor: "#F59E0B",
    businessType: "Pizzarias",
    rating: 4.9,
    ratingCount: 215,
    status: "active",
    isOpen: true,
    createdAt: Date.now() - 15 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: "tenant-sorvetes-imperial",
    name: "Sorvetes & Gelatos Imperial",
    slug: "sorvetes-imperial",
    email: "contato@sorvetesimperial.com.br",
    phone: "11977777777",
    whatsapp: "5511977777777",
    pixKey: "contato@sorvetesimperial.com.br",
    pixKeyType: "email",
    deliveryFee: 4.0,
    address: "Rua das Palmeiras, 350 - Jardins",
    hours: "13:00 - 22:30",
    tagline: "Gelatos italianos autênticos, picolés artesanais e taças premium",
    announcement: "🍦 Mais de 30 sabores artesanais e taças montadas na hora!",
    logo: "🍨",
    bannerImage: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#0284C7",
    secondaryColor: "#0F172A",
    primaryDark: "#0369A1",
    primaryLight: "#38BDF8",
    accentColor: "#F59E0B",
    themeMode: "light",
    menuLayout: "list",
    showFeaturedCarousel: true,
    businessType: "Sorveteiras",
    rating: 4.9,
    ratingCount: 98,
    status: "active",
    isOpen: true,
    createdAt: Date.now() - 10 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: "tenant-acai-do-vale",
    name: "Açaí do Vale & Cia",
    slug: "acai-do-vale",
    email: "pedidos@acaidovale.com.br",
    phone: "11966666666",
    whatsapp: "5511966666666",
    pixKey: "pedidos@acaidovale.com.br",
    pixKeyType: "email",
    deliveryFee: 5.0,
    address: "Av. Brasil, 890 - Centro",
    hours: "12:00 - 23:00",
    tagline: "Açaí puro do Pará batido na hora, cremes e acompanhamentos",
    announcement: "🍧 Monte sua tigela ou copo com frutas frescas e complementos à vontade!",
    logo: "🍧",
    bannerImage: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#7E22CE",
    secondaryColor: "#1E1B4B",
    primaryDark: "#6B21A8",
    primaryLight: "#A855F7",
    accentColor: "#EAB308",
    themeMode: "light",
    menuLayout: "list",
    showFeaturedCarousel: true,
    businessType: "Açaíterias",
    rating: 4.9,
    ratingCount: 167,
    status: "active",
    isOpen: true,
    createdAt: Date.now() - 8 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: "tenant-sabor-e-brasa",
    name: "Sabor & Brasa Grill",
    slug: "sabor-e-brasa",
    email: "contato@saborebrasa.com.br",
    phone: "11955555555",
    whatsapp: "5511955555555",
    pixKey: "contato@saborebrasa.com.br",
    pixKeyType: "email",
    deliveryFee: 7.0,
    address: "Rua do Comércio, 1200 - Centro",
    hours: "11:00 - 22:30",
    tagline: "Cortes nobres na brasa, marmitex gourmet e refeições executivas",
    announcement: "🥩 Almoço executivo e cortes nobres preparados na churrasqueira a carvão!",
    logo: "🥩",
    bannerImage: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    primaryColor: "#B91C1C",
    secondaryColor: "#18181B",
    primaryDark: "#991B1B",
    primaryLight: "#EF4444",
    accentColor: "#F59E0B",
    themeMode: "light",
    menuLayout: "list",
    showFeaturedCarousel: true,
    businessType: "Restaurantes",
    rating: 4.8,
    ratingCount: 312,
    status: "active",
    isOpen: true,
    createdAt: Date.now() - 20 * 86400000,
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
  // Sorvetes & Gelatos Imperial
  {
    id: "gelato-1",
    tenantId: "tenant-sorvetes-imperial",
    name: "Pote Gelato Artesanal 500ml",
    description: "Gelato italiano super cremoso batido diariamente. Escolha até 2 sabores incríveis.",
    price: 38.0,
    image: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80",
    category: "sobremesas",
    available: true,
    options: [
      { id: "sabor-pistache", name: "Pistache Siciliano", price: 0 },
      { id: "sabor-ninho", name: "Ninho Trufado com Nutella", price: 0 },
      { id: "sabor-morango", name: "Morango Silvestre", price: 0 },
    ],
  },
  {
    id: "gelato-2",
    tenantId: "tenant-sorvetes-imperial",
    name: "Taça Suprema Ferrero & Nutella",
    description: "Camadas generosas de gelato de baunilha, Nutella pura, bombons Ferrero Rocher e castanhas picadas.",
    price: 32.5,
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    category: "sobremesas",
    available: true,
    options: [
      { id: "extra-nutella", name: "Dose extra de Nutella", price: 5.0 },
    ],
  },
  // Açaí do Vale & Cia
  {
    id: "acai-1",
    tenantId: "tenant-acai-do-vale",
    name: "Tigela Tradicional Açaí 500ml",
    description: "Açaí puro premium batido na consistência perfeita, acompanha banana fresca fatiada, leite condensado e granola crocante.",
    price: 24.9,
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80",
    category: "acai",
    available: true,
    options: [
      { id: "leite-ninho", name: "Leite Ninho em pó", price: 3.5 },
      { id: "morango-fresco", name: "Morangos frescos", price: 4.0 },
      { id: "pacoca", name: "Paçoca rolha triturada", price: 2.5 },
    ],
  },
  {
    id: "acai-2",
    tenantId: "tenant-acai-do-vale",
    name: "Barca Especial Açaí Turbinado 750ml",
    description: "Açaí cremoso com morango, banana, kiwi, confetes, brigadeiro de panela e calda especial à escolha.",
    price: 42.0,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    category: "acai",
    available: true,
    options: [
      { id: "nutella-barca", name: "Nutella na barca", price: 6.0 },
    ],
  },
  // Sabor & Brasa Grill
  {
    id: "grill-1",
    tenantId: "tenant-sabor-e-brasa",
    name: "Picanha na Brasa com Fritas e Arroz",
    description: "Corte nobre de picanha maturada grelhada na brasa (350g in natura), arroz branco soltinho, feijão tropeiro e fritas crocantes.",
    price: 59.9,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    category: "pratos",
    available: true,
    options: [
      { id: "ponto-carne-mal", name: "Ponto: Mal passada", price: 0 },
      { id: "ponto-carne-ao-ponto", name: "Ponto: Ao ponto", price: 0 },
      { id: "ponto-carne-bem", name: "Ponto: Bem passada", price: 0 },
      { id: "vinagrete-extra", name: "Porção de vinagrete da casa", price: 5.0 },
    ],
  },
  {
    id: "grill-2",
    tenantId: "tenant-sabor-e-brasa",
    name: "Marmitex Executivo Bife Ancho",
    description: "Bife ancho grelhado, arroz, feijão caseiro temperado, farofa crocante e salada mista.",
    price: 36.0,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
    category: "pratos",
    available: true,
    options: [],
  },
].map((p, idx) => ({
  ...p,
  position: p.position ?? p.ordem ?? idx,
  ordem: p.position ?? p.ordem ?? idx,
}));

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
        product: { id: "msp-1", name: "X-Salada Especial MS", price: 26.9, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" },
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
        product: { id: "msp-2", name: "Smash Burger Duplo Bacon", price: 31.9, image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80" },
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
        product: { id: "msp-3", name: "X-Tudo Campeão MS", price: 34.9, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80" },
        quantity: 2,
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
        product: { id: "msp-2", name: "Smash Burger Duplo Bacon", price: 31.9, image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80" },
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
        product: { id: "msp-3", name: "X-Tudo Campeão MS", price: 34.9, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80" },
        quantity: 2,
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
        product: { id: "msp-4", name: "Batata Frita Crocante Rústica", price: 18.0, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80" },
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
        product: { id: "msp-1", name: "X-Salada Especial MS", price: 26.9, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" },
        quantity: 2,
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
        product: { id: "msp-3", name: "X-Tudo Campeão MS", price: 34.9, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80" },
        quantity: 3,
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
        product: { id: "msp-1", name: "X-Salada Especial MS", price: 26.9, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" },
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

export const defaultCategories: Category[] = [
  { id: "lanches", name: "Lanches", icon: "🍔", order: 1, order_index: 1 },
  { id: "combos", name: "Combos", icon: "🍟", order: 2, order_index: 2 },
  { id: "porcoes", name: "Porções", icon: "🍗", order: 3, order_index: 3 },
  { id: "bebidas", name: "Bebidas", icon: "🥤", order: 4, order_index: 4 },
  { id: "sobremesas", name: "Sobremesas", icon: "🍰", order: 5, order_index: 5 },
  { id: "pizzas", name: "Pizzas", icon: "🍕", order: 6, order_index: 6 },
  { id: "pasteis", name: "Pastéis", icon: "🥟", order: 7, order_index: 7 },
  { id: "acai", name: "Açaí", icon: "🍧", order: 8, order_index: 8 },
];

export const defaultEstablishmentCategories: EstablishmentCategory[] = [
  { id: "lanchonetes", name: "Lanchonetes", icon: "🍔", order: 1, order_index: 1, active: true },
  { id: "pizzarias", name: "Pizzarias", icon: "🍕", order: 2, order_index: 2, active: true },
  { id: "sorveteiras", name: "Sorveteiras", icon: "🍨", order: 3, order_index: 3, active: true },
  { id: "acaiterias", name: "Açaíterias", icon: "🍧", order: 4, order_index: 4, active: true },
  { id: "restaurantes", name: "Restaurantes", icon: "🥩", order: 5, order_index: 5, active: true },
  { id: "docerias", name: "Docerias", icon: "🍰", order: 6, order_index: 6, active: true },
  { id: "distribuidoras", name: "Distribuidoras", icon: "🍺", order: 7, order_index: 7, active: true },
];

export const defaultPlatformSettings: PlatformSettings = {
  logoUrl: "",
  bannerUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
  heroTitle: "Top Food - O Portal do Delivery",
  heroSubtitle: "O seu portal de delivery para as melhores lanchonetes, pizzarias, açaíterias e restaurantes.",
  primaryColor: "#E63946",
  geminiApiKey: typeof process !== "undefined" && process?.env?.GEMINI_API_KEY ? process.env.GEMINI_API_KEY : "",
  adminPixKey: "topfood.financeiro@pix.com",
  adminPixType: "email",
  adminWhatsapp: "5511999999999",
  defaultMonthlyFee: 49.9,
  updatedAt: Date.now(),
};

// Seed de stories ativos iniciais para teste imediato (válidos por 24h)
export const initialStories: StoreStory[] = [
  {
    id: "story-ms-1",
    tenantId: "tenant-ms-preparacoes",
    mediaUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1080&q=80",
    mediaType: "image",
    caption: "🍔 Hambúrguer Artesanal quentinho na chapa! Peça o seu agora.",
    createdAt: Date.now() - 2 * 3600000,
    expiresAt: Date.now() + 22 * 3600000,
  },
  {
    id: "story-ms-2",
    tenantId: "tenant-ms-preparacoes",
    mediaUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1080&q=80",
    mediaType: "image",
    caption: "🍟 Porção de batatas rústicas douradas com tempero especial da casa!",
    createdAt: Date.now() - 1 * 3600000,
    expiresAt: Date.now() + 23 * 3600000,
  },
  {
    id: "story-burger-1",
    tenantId: "tenant-burger-town",
    mediaUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1080&q=80",
    mediaType: "image",
    caption: "🔥 Super combo com entrega grátis hoje! Não perca.",
    createdAt: Date.now() - 3 * 3600000,
    expiresAt: Date.now() + 21 * 3600000,
  },
];

export interface OrderItemRecord {
  id: string;
  orderId: string;
  tenantId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  optionsJson?: string;
  createdAt: number;
}

function extractOrderItemsFromOrders(orders: Order[]): OrderItemRecord[] {
  const list: OrderItemRecord[] = [];
  for (const ord of orders) {
    if (!ord.items || !Array.isArray(ord.items)) continue;
    for (const it of ord.items) {
      list.push({
        id: it.id || `oi-${ord.id}-${list.length + 1}`,
        orderId: ord.id,
        tenantId: ord.tenantId || "tenant-ms-preparacoes",
        productId: it.product?.id || `p-${list.length + 1}`,
        name: it.product?.name || "Lanche Especial",
        price: Number(it.product?.price) || 0,
        quantity: Number(it.quantity) || 1,
        image: it.product?.image || "",
        optionsJson: JSON.stringify(it.selectedOptions || []),
        createdAt: ord.createdAt || Date.now(),
      });
    }
  }
  return list;
}

// In-memory data store for Node.js / preview runtime (with persistence)
class MemoryStore {
  tenants: Tenant[] = [...initialTenants];
  users: User[] = [...initialUsers];
  products: Product[] = [...initialProducts];
  categories: Category[] = [...defaultCategories];
  establishmentCategories: EstablishmentCategory[] = [...defaultEstablishmentCategories];
  orders: Order[] = [...initialOrders];
  orderItems: OrderItemRecord[] = extractOrderItemsFromOrders(initialOrders);
  customers: Customer[] = [...initialCustomers];
  platformSettings: PlatformSettings = { ...defaultPlatformSettings };
  stories: StoreStory[] = [...initialStories];

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
          subscription_status TEXT DEFAULT 'demo',
          billing_day INTEGER,
          last_payment_at INTEGER,
          monthly_fee REAL DEFAULT 49.90,
          is_open INTEGER DEFAULT 1,
          is_featured INTEGER DEFAULT 0,
          priority_order INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS platform_settings (
          id TEXT PRIMARY KEY,
          settings_json TEXT NOT NULL,
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
          position INTEGER DEFAULT 0,
          ordem INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          name TEXT NOT NULL,
          icon TEXT DEFAULT '🍽️',
          order_index INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS establishment_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT '🍽️',
          order_index INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          order_type TEXT NOT NULL DEFAULT 'delivery',
          payment_method TEXT NOT NULL DEFAULT 'pix',
          card_type TEXT,
          payment_details TEXT,
          pix_receipt_url TEXT,
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
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          image TEXT DEFAULT '',
          options_json TEXT DEFAULT '[]',
          created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS store_stories (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          media_url TEXT NOT NULL,
          media_type TEXT NOT NULL DEFAULT 'image',
          caption TEXT,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
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
        "ALTER TABLE products ADD COLUMN position INTEGER DEFAULT 0",
        "ALTER TABLE products ADD COLUMN ordem INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN tenant_id TEXT",
        "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'",
        "ALTER TABLE tenants ADD COLUMN business_type TEXT DEFAULT 'Lanchonetes'",
        "ALTER TABLE tenants ADD COLUMN is_featured INTEGER DEFAULT 0",
        "ALTER TABLE tenants ADD COLUMN priority_order INTEGER DEFAULT 0",
        "ALTER TABLE establishment_categories ADD COLUMN order_index INTEGER DEFAULT 0",
        "ALTER TABLE establishment_categories ADD COLUMN active INTEGER DEFAULT 1",
        "ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT 'demo'",
        "ALTER TABLE tenants ADD COLUMN billing_day INTEGER",
        "ALTER TABLE tenants ADD COLUMN last_payment_at INTEGER",
        "ALTER TABLE tenants ADD COLUMN monthly_fee REAL DEFAULT 49.90",
        "ALTER TABLE orders ADD COLUMN pix_receipt_url TEXT",
        "ALTER TABLE orders ADD COLUMN card_type TEXT",
        "ALTER TABLE orders ADD COLUMN payment_details TEXT"
      ];

      for (const alter of alterQueries) {
        try {
          await db.prepare(alter).run();
        } catch {
          // Coluna já existe no D1, ignorar
        }
      }

      // 3. Índices de performance e Views
      const indexQueries = [
        "CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)",
        "CREATE INDEX IF NOT EXISTS idx_tenants_featured ON tenants(is_featured, priority_order)",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_establishment_categories_order ON establishment_categories(order_index)",
        "CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON order_items(tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)",
        "CREATE VIEW IF NOT EXISTS stores AS SELECT * FROM tenants"
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

        // Seed establishment categories se estiver vazia
        const catCountRes = await db.prepare("SELECT count(*) as total FROM establishment_categories").first<{ total: number }>();
        if (!catCountRes || Number(catCountRes.total) === 0) {
          for (const ec of defaultEstablishmentCategories) {
            await this.insertEstablishmentCategoryRow(ec);
          }
        }

        // 5. Seed de pedidos e order_items se estiver vazia
        try {
          const ordCountRes = await db.prepare("SELECT count(*) as total FROM orders").first<{ total: number }>();
          if (!ordCountRes || Number(ordCountRes.total) === 0) {
            for (const ord of initialOrders) {
              await this.insertOrderRow(ord);
            }
          }

          const oiCountRes = await db.prepare("SELECT count(*) as total FROM order_items").first<{ total: number }>();
          if (!oiCountRes || Number(oiCountRes.total) === 0) {
            const ordersRes = await db.prepare("SELECT id, tenant_id, items_json, created_at FROM orders").all<{ id: string; tenant_id: string; items_json: string; created_at: number }>();
            if (ordersRes?.results && ordersRes.results.length > 0) {
              for (const ord of ordersRes.results) {
                try {
                  const items = JSON.parse(ord.items_json || "[]");
                  for (const it of items) {
                    const oiId = it.id || `oi-${ord.id}-${Math.random().toString(36).substring(2, 7)}`;
                    const pId = it.product?.id || `p-${Math.random().toString(36).substring(2, 7)}`;
                    const pName = it.product?.name || "Lanche Especial";
                    const pPrice = Number(it.product?.price) || 0;
                    const pImg = it.product?.image || "";
                    const pQty = Number(it.quantity) || 1;
                    const optJson = JSON.stringify(it.selectedOptions || []);
                    await db.prepare(
                      `INSERT OR IGNORE INTO order_items (
                        id, order_id, tenant_id, product_id, name, price, quantity, image, options_json, created_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    ).bind(oiId, ord.id, ord.tenant_id, pId, pName, pPrice, pQty, pImg, optJson, ord.created_at || Date.now()).run();
                  }
                } catch {
                  // Ignore item insertion error during initial backfill
                }
              }
            }
          }
        } catch (backfillErr) {
          console.warn("orders/order_items backfill notice:", backfillErr);
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
          is_featured, priority_order,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          t.isFeatured ? 1 : 0,
          t.priorityOrder || 0,
          t.createdAt,
          t.updatedAt
        )
        .run();
    } catch {
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

  private async insertEstablishmentCategoryRow(ec: EstablishmentCategory): Promise<void> {
    if (!this.env?.DB) return;
    try {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO establishment_categories (id, name, icon, order_index, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          ec.id,
          ec.name,
          ec.icon || "🍽️",
          ec.order ?? ec.order_index ?? 0,
          ec.active !== false ? 1 : 0,
          ec.createdAt || Date.now()
        )
        .run();
    } catch {
      // ignore
    }
  }

  private async insertOrderRow(o: Order): Promise<void> {
    if (!this.env?.DB) return;
    try {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO orders (
          id, tenant_id, customer_name, customer_phone, order_type, payment_method,
          card_type, payment_details, pix_receipt_url,
          address_json, change_for, subtotal, delivery_fee, total, status,
          items_json, status_history_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          o.id,
          o.tenantId,
          o.customerName,
          o.customerPhone,
          o.orderType,
          o.paymentMethod,
          o.cardType || null,
          o.paymentDetails || null,
          o.pixReceiptUrl || o.pix_receipt_url || null,
          JSON.stringify(o.address || {}),
          o.changeFor || "",
          o.subtotal,
          o.deliveryFee,
          o.total,
          o.status,
          JSON.stringify(o.items || []),
          JSON.stringify(o.statusHistory || []),
          o.createdAt
        )
        .run();

      if (o.items && o.items.length > 0) {
        for (const it of o.items) {
          const oiId = it.id || `oi-${o.id}-${Math.random().toString(36).substring(2, 7)}`;
          const pId = it.product?.id || `p-${Math.random().toString(36).substring(2, 7)}`;
          const pName = it.product?.name || "Lanche Especial";
          const pPrice = Number(it.product?.price) || 0;
          const pImg = it.product?.image || "";
          const pQty = Number(it.quantity) || 1;
          const optJson = JSON.stringify(it.selectedOptions || []);
          await this.env.DB.prepare(
            `INSERT OR IGNORE INTO order_items (
              id, order_id, tenant_id, product_id, name, price, quantity, image, options_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              oiId,
              o.id,
              o.tenantId,
              pId,
              pName,
              pPrice,
              pQty,
              pImg,
              optJson,
              o.createdAt || Date.now()
            )
            .run();
        }
      }
    } catch (e) {
      console.warn("D1 insertOrderRow warning:", e);
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
        let res: any;
        try {
          res = await this.env.DB.prepare(
            "SELECT * FROM tenants ORDER BY is_featured DESC, priority_order DESC, created_at DESC"
          ).all<any>();
        } catch {
          res = await this.env.DB.prepare(
            "SELECT * FROM tenants ORDER BY created_at DESC"
          ).all<any>();
        }
        if (res.results && res.results.length > 0) {
          const d1Tenants = res.results.map((r: any) => this.mapTenantRow(r));
          d1Tenants.sort((a: Tenant, b: Tenant) => {
            const aFeat = Boolean(a.isFeatured);
            const bFeat = Boolean(b.isFeatured);
            if (aFeat && !bFeat) return -1;
            if (!aFeat && bFeat) return 1;
            if (aFeat && bFeat) {
              const aOrder = Number(a.priorityOrder) || 0;
              const bOrder = Number(b.priorityOrder) || 0;
              if (aOrder !== bOrder) return bOrder - aOrder;
            }
            return (b.createdAt || 0) - (a.createdAt || 0);
          });
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
    const memTenants = [...globalStore.tenants];
    memTenants.sort((a, b) => {
      const aFeat = Boolean(a.isFeatured);
      const bFeat = Boolean(b.isFeatured);
      if (aFeat && !bFeat) return -1;
      if (!aFeat && bFeat) return 1;
      if (aFeat && bFeat) {
        const aOrder = Number(a.priorityOrder) || 0;
        const bOrder = Number(b.priorityOrder) || 0;
        if (aOrder !== bOrder) return bOrder - aOrder;
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return memTenants;
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

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.getTenantByIdOrSlug(slug);
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
    businessType?: string;
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
      businessType: data.businessType?.trim() || "Lanchonetes",
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
            primary_dark, primary_light, accent_color, business_type, status, is_open,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            newTenant.businessType || "Lanchonetes",
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
              primary_color, business_type, status, is_open, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
              newTenant.businessType || "Lanchonetes",
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

    const isFeaturedVal = partial.isFeatured !== undefined
      ? Boolean(partial.isFeatured)
      : ((partial as any).is_featured !== undefined
          ? Boolean((partial as any).is_featured)
          : (tenant.isFeatured ?? false));

    const priorityOrderVal = partial.priorityOrder !== undefined
      ? Number(partial.priorityOrder)
      : ((partial as any).priority_order !== undefined
          ? Number((partial as any).priority_order)
          : (tenant.priorityOrder ?? 0));

    const subscriptionStatusVal =
      partial.subscriptionStatus ||
      (partial as any).subscription_status ||
      tenant.subscriptionStatus ||
      "demo";

    const billingDayVal =
      partial.billingDay !== undefined
        ? (partial.billingDay !== null ? Number(partial.billingDay) : undefined)
        : ((partial as any).billing_day !== undefined
            ? ((partial as any).billing_day !== null ? Number((partial as any).billing_day) : undefined)
            : tenant.billingDay);

    const lastPaymentAtVal =
      partial.lastPaymentAt !== undefined
        ? (partial.lastPaymentAt !== null ? Number(partial.lastPaymentAt) : undefined)
        : ((partial as any).last_payment_at !== undefined
            ? ((partial as any).last_payment_at !== null ? Number((partial as any).last_payment_at) : undefined)
            : tenant.lastPaymentAt);

    const monthlyFeeVal =
      partial.monthlyFee !== undefined
        ? Number(partial.monthlyFee)
        : ((partial as any).monthly_fee !== undefined
            ? Number((partial as any).monthly_fee)
            : (tenant.monthlyFee || 49.9));

    const updated: Tenant = {
      ...tenant,
      ...partial,
      isFeatured: isFeaturedVal,
      priorityOrder: priorityOrderVal,
      subscriptionStatus: subscriptionStatusVal,
      billingDay: billingDayVal,
      lastPaymentAt: lastPaymentAtVal,
      monthlyFee: monthlyFeeVal,
      updatedAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `UPDATE tenants SET 
            name = ?, whatsapp = ?, pix_key = ?, pix_key_type = ?, 
            delivery_fee = ?, address = ?, hours = ?, tagline = ?, 
            logo = ?, banner_image = ?, primary_color = ?, primary_dark = ?, primary_light = ?, 
            accent_color = ?, business_type = ?, status = ?, is_open = ?,
            is_featured = ?, priority_order = ?,
            subscription_status = ?, billing_day = ?, last_payment_at = ?, monthly_fee = ?,
            updated_at = ?
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
            updated.businessType || "Lanchonetes",
            updated.status,
            updated.isOpen ? 1 : 0,
            updated.isFeatured ? 1 : 0,
            updated.priorityOrder || 0,
            updated.subscriptionStatus || "demo",
            updated.billingDay !== undefined ? updated.billingDay : null,
            updated.lastPaymentAt !== undefined ? updated.lastPaymentAt : null,
            updated.monthlyFee || 49.9,
            updated.updatedAt,
            tenant.id
          )
          .run();
      } catch {
        // Fallback in case D1 table schema migration is in progress
        try {
          await this.env.DB.prepare(
            `UPDATE tenants SET 
              name = ?, whatsapp = ?, pix_key = ?, pix_key_type = ?, 
              delivery_fee = ?, address = ?, hours = ?, tagline = ?, 
              logo = ?, primary_color = ?, primary_dark = ?, primary_light = ?, 
              accent_color = ?, business_type = ?, status = ?, is_open = ?, updated_at = ?
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
              updated.businessType || "Lanchonetes",
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

  async activateSubscription(
    idOrSlug: string,
    customBillingDay?: number
  ): Promise<{ success: boolean; tenant: Tenant; billingDay: number }> {
    const tenant = await this.getTenantByIdOrSlug(idOrSlug);
    if (!tenant) {
      throw new Error("Lanchonete não encontrada.");
    }

    // Captura automática do dia atual (1 a 31) ou usa customizado se fornecido
    const now = new Date();
    const billingDay =
      customBillingDay && customBillingDay >= 1 && customBillingDay <= 31
        ? customBillingDay
        : now.getDate();

    const timestamp = now.getTime();

    const updated = await this.updateTenant(tenant.id, {
      subscriptionStatus: "active",
      billingDay,
      lastPaymentAt: timestamp,
      status: "active",
    });

    if (!updated) {
      throw new Error("Falha ao salvar ativação da mensalidade.");
    }

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          "UPDATE tenants SET subscription_status = 'active', billing_day = ?, last_payment_at = ?, status = 'active', updated_at = ? WHERE id = ?"
        )
          .bind(billingDay, timestamp, timestamp, tenant.id)
          .run();
      } catch (e) {
        console.warn("D1 direct activateSubscription warning:", e);
      }
    }

    return { success: true, tenant: updated, billingDay };
  }

  async confirmMonthlyPayment(
    idOrSlug: string
  ): Promise<{ success: boolean; tenant: Tenant; billingDay: number; paymentAt: number }> {
    const tenant = await this.getTenantByIdOrSlug(idOrSlug);
    if (!tenant) {
      throw new Error("Lanchonete não encontrada.");
    }

    const timestamp = Date.now();
    // Preserva o billing_day original já salvo; se não houver, adota o dia de hoje
    const originalBillingDay = tenant.billingDay || new Date().getDate();

    const updated = await this.updateTenant(tenant.id, {
      subscriptionStatus: "active",
      billingDay: originalBillingDay,
      lastPaymentAt: timestamp,
      status: "active",
    });

    if (!updated) {
      throw new Error("Falha ao confirmar pagamento da mensalidade.");
    }

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          "UPDATE tenants SET subscription_status = 'active', last_payment_at = ?, status = 'active', updated_at = ? WHERE id = ?"
        )
          .bind(timestamp, timestamp, tenant.id)
          .run();
      } catch (e) {
        console.warn("D1 direct confirmMonthlyPayment warning:", e);
      }
    }

    return {
      success: true,
      tenant: updated,
      billingDay: originalBillingDay,
      paymentAt: timestamp,
    };
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

  // ===================== ESTABLISHMENT CATEGORIES =====================

  async getEstablishmentCategories(): Promise<EstablishmentCategory[]> {
    await this.ensureTables();
    let d1Categories: EstablishmentCategory[] = [];

    if (this.env?.DB) {
      try {
        const res = await this.env.DB.prepare(
          "SELECT * FROM establishment_categories WHERE active = 1 ORDER BY order_index ASC, created_at ASC"
        ).all<any>();
        if (res.results && res.results.length > 0) {
          d1Categories = res.results.map((r: any) => ({
            id: r.id,
            name: r.name,
            icon: r.icon || "🍽️",
            order: Number(r.order_index) || 0,
            order_index: Number(r.order_index) || 0,
            active: r.active !== 0,
            createdAt: Number(r.created_at) || Date.now(),
          }));
        }
      } catch (e) {
        console.warn("D1 getEstablishmentCategories error:", e);
      }
    }

    // Merge default, memory and D1 categories
    const combinedMap = new Map<string, EstablishmentCategory>();

    defaultEstablishmentCategories.forEach((cat) => {
      combinedMap.set(cat.id.toLowerCase(), { ...cat });
    });

    (globalStore.establishmentCategories || []).forEach((cat) => {
      combinedMap.set(cat.id.toLowerCase(), { ...cat });
    });

    d1Categories.forEach((cat) => {
      combinedMap.set(cat.id.toLowerCase(), { ...cat });
    });

    return Array.from(combinedMap.values()).sort(
      (a, b) => (a.order ?? a.order_index ?? 0) - (b.order ?? b.order_index ?? 0)
    );
  }

  async createEstablishmentCategory(data: {
    name: string;
    icon?: string;
    order?: number;
  }): Promise<EstablishmentCategory> {
    await this.ensureTables();
    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new Error("O nome da categoria não pode ser vazio.");
    }

    const id = globalStore.slugify(cleanName);
    const existingList = await this.getEstablishmentCategories();
    const existing = existingList.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() || c.id === id
    );
    if (existing) {
      return existing;
    }

    const maxOrder = existingList.reduce((max, c) => Math.max(max, c.order ?? 0), 0);
    const newCat: EstablishmentCategory = {
      id,
      name: cleanName,
      icon: data.icon?.trim() || "🍽️",
      order: data.order !== undefined ? Number(data.order) : maxOrder + 1,
      order_index: data.order !== undefined ? Number(data.order) : maxOrder + 1,
      active: true,
      createdAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO establishment_categories (id, name, icon, order_index, active, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newCat.id,
            newCat.name,
            newCat.icon,
            newCat.order,
            newCat.active ? 1 : 0,
            newCat.createdAt
          )
          .run();
      } catch (err: any) {
        console.error("D1 createEstablishmentCategory error:", err);
      }
    }

    globalStore.establishmentCategories = (globalStore.establishmentCategories || []).filter(
      (c) => c.id !== newCat.id
    );
    globalStore.establishmentCategories.push(newCat);

    return newCat;
  }

  async deleteEstablishmentCategory(id: string): Promise<boolean> {
    await this.ensureTables();
    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          "DELETE FROM establishment_categories WHERE id = ?"
        ).bind(id).run();
      } catch (e) {
        console.warn("D1 deleteEstablishmentCategory error:", e);
      }
    }

    globalStore.establishmentCategories = (globalStore.establishmentCategories || []).filter(
      (c) => c.id !== id
    );
    return true;
  }

  // ===================== PLATFORM APPEARANCE & SETTINGS (CLOUDFLARE D1 / KV) =====================

  async getPlatformSettings(): Promise<PlatformSettings> {
    const kv = this.getKv();
    if (kv) {
      try {
        const cached = await kv.get("platform:settings");
        if (cached) {
          const parsed = JSON.parse(cached) as PlatformSettings;
          return { ...defaultPlatformSettings, ...parsed };
        }
      } catch (e) {
        console.warn("KV getPlatformSettings error:", e);
      }
    }

    await this.ensureTables();
    if (this.env?.DB) {
      try {
        const row = await this.env.DB.prepare(
          "SELECT settings_json FROM platform_settings WHERE id = 'main' LIMIT 1"
        ).first<{ settings_json: string }>();
        if (row?.settings_json) {
          const parsed = JSON.parse(row.settings_json) as PlatformSettings;
          const merged = { ...defaultPlatformSettings, ...parsed };
          globalStore.platformSettings = merged;
          if (kv) {
            try {
              await kv.put("platform:settings", JSON.stringify(merged));
            } catch (err) {
              console.warn("KV put platform:settings error:", err);
            }
          }
          return merged;
        }
      } catch (e) {
        console.warn("D1 getPlatformSettings error:", e);
      }
    }

    return { ...globalStore.platformSettings };
  }

  async updatePlatformSettings(partial: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const current = await this.getPlatformSettings();
    const updated: PlatformSettings = {
      ...current,
      ...partial,
      updatedAt: Date.now(),
    };

    globalStore.platformSettings = updated;

    await this.ensureTables();
    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO platform_settings (id, settings_json, updated_at) 
           VALUES ('main', ?, ?)
           ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at`
        )
          .bind(JSON.stringify(updated), updated.updatedAt || Date.now())
          .run();
      } catch (e) {
        console.warn("D1 updatePlatformSettings error:", e);
      }
    }

    const kv = this.getKv();
    if (kv) {
      try {
        await kv.put("platform:settings", JSON.stringify(updated));
      } catch (e) {
        console.warn("KV updatePlatformSettings error:", e);
      }
    }

    return updated;
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

  async verifyUser(email: string, password: string): Promise<User | null> {
    return this.authenticateUser(email, password);
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
          "SELECT * FROM products WHERE tenant_id = ? OR tenant_id = ? ORDER BY COALESCE(position, ordem, 0) ASC, created_at DESC"
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

    return globalStore.products
      .filter((p) => p.tenantId === memId || p.tenantId === memSlug)
      .sort((a, b) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0));
  }

  async createProduct(tenantId: string, product: Omit<Product, "id" | "tenantId">): Promise<Product> {
    await this.ensureTables();
    const currentProducts = await this.getProductsByTenant(tenantId);
    const maxPosition = currentProducts.reduce(
      (max, p) => Math.max(max, p.position ?? p.ordem ?? 0),
      -1
    );
    const assignedPosition = product.position ?? product.ordem ?? maxPosition + 1;

    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId,
      available: product.available !== undefined ? Boolean(product.available) : true,
      position: assignedPosition,
      ordem: assignedPosition,
      createdAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO products (id, tenant_id, name, description, price, category, image, available, options_json, position, ordem, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            newProduct.position ?? 0,
            newProduct.ordem ?? 0,
            newProduct.createdAt
          )
          .run();
      } catch (e) {
        console.warn("D1 createProduct error:", e);
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
        } catch {
          /* ignore */
          void 0;
        }
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
          `UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, available = ?, options_json = ?, position = ?, ordem = ? WHERE id = ?`
        )
          .bind(
            updated.name,
            updated.description,
            updated.price,
            updated.category,
            updated.image,
            updated.available ? 1 : 0,
            JSON.stringify(updated.options || []),
            updated.position ?? updated.ordem ?? 0,
            updated.ordem ?? updated.position ?? 0,
            productId
          )
          .run();
      } catch (e) {
        console.warn("D1 updateProduct error with position, trying legacy:", e);
        try {
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
        } catch {
          /* ignore */
          void 0;
        }
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

  async reorderProducts(tenantId: string, orderedIds: string[]): Promise<boolean> {
    await this.ensureTables();
    const tenant = await this.getTenantByIdOrSlug(tenantId);
    const resolvedId = tenant ? tenant.id : tenantId;
    const resolvedSlug = tenant ? tenant.slug : tenantId;

    for (let i = 0; i < orderedIds.length; i++) {
      const prodId = orderedIds[i];
      // Atualiza memória
      const prod = globalStore.products.find((p) => p.id === prodId);
      if (prod) {
        prod.position = i;
        prod.ordem = i;
        prod.order = i;
      }
      // Atualiza Cloudflare D1
      if (this.env?.DB) {
        try {
          await this.env.DB.prepare(
            "UPDATE products SET position = ?, ordem = ? WHERE id = ?"
          )
            .bind(i, i, prodId)
            .run();
        } catch (e) {
          console.warn("D1 reorderProduct error:", e);
        }
      }
    }

    // Invalida cache do KV
    const kv = this.getKv();
    if (kv) {
      try {
        await kv.delete(`products:${resolvedId}`);
        await kv.delete(`products:${resolvedSlug}`);
      } catch (e) {
        console.warn("KV invalidate products error:", e);
      }
    }

    return true;
  }

  // ===================== CATEGORIES =====================

  async getCategoriesByTenant(tenantId: string): Promise<Category[]> {
    await this.ensureTables();
    const tenant = await this.getTenantByIdOrSlug(tenantId);
    const resolvedId = tenant ? tenant.id : tenantId;
    const resolvedSlug = tenant ? tenant.slug : tenantId;

    let d1Categories: Category[] = [];
    if (this.env?.DB) {
      try {
        const res = await this.env.DB.prepare(
          "SELECT * FROM categories WHERE tenant_id = ? OR tenant_id = ? OR tenant_id IS NULL OR tenant_id = '' ORDER BY order_index ASC, created_at ASC"
        )
          .bind(resolvedId, resolvedSlug)
          .all<any>();
        if (res.results && res.results.length > 0) {
          d1Categories = res.results.map((r: any) => ({
            id: r.id,
            tenantId: r.tenant_id,
            name: r.name,
            icon: r.icon || "🍽️",
            order: Number(r.order_index) || 0,
            order_index: Number(r.order_index) || 0,
            createdAt: Number(r.created_at) || Date.now(),
          }));
        }
      } catch (e) {
        console.warn("D1 getCategories error:", e);
      }
    }

    // Combinar categorias em memória e categorias padrões
    const memCategories = globalStore.categories || [];
    const tenantMemCats = memCategories.filter(
      (c: Category) => !c.tenantId || c.tenantId === resolvedId || c.tenantId === resolvedSlug
    );

    const combinedMap = new Map<string, Category>();

    // 1. Categorias padrões
    defaultCategories.forEach((dc) => {
      combinedMap.set(dc.id.toLowerCase(), { ...dc });
    });

    // 2. Categorias do memory store
    tenantMemCats.forEach((mc: Category) => {
      combinedMap.set(mc.id.toLowerCase(), { ...mc });
    });

    // 3. Categorias vindas do banco de dados D1
    d1Categories.forEach((dc: Category) => {
      combinedMap.set(dc.id.toLowerCase(), { ...dc });
    });

    // 4. Categorias referenciadas em produtos existentes
    const products = await this.getProductsByTenant(tenantId);
    products.forEach((p) => {
      if (p.category && !combinedMap.has(p.category.toLowerCase())) {
        combinedMap.set(p.category.toLowerCase(), {
          id: p.category.toLowerCase(),
          name: p.category.charAt(0).toUpperCase() + p.category.slice(1),
          icon: "🍽️",
          tenantId: resolvedId,
          order: 99,
          createdAt: Date.now(),
        });
      }
    });

    return Array.from(combinedMap.values()).sort(
      (a, b) => (a.order ?? a.order_index ?? 0) - (b.order ?? b.order_index ?? 0)
    );
  }

  async createCategory(
    tenantId: string,
    data: { name: string; icon?: string }
  ): Promise<Category> {
    await this.ensureTables();
    const tenant = await this.getTenantByIdOrSlug(tenantId);
    const resolvedId = tenant ? tenant.id : tenantId;
    const cleanName = data.name.trim();

    if (!cleanName) {
      throw new Error("O nome da categoria não pode ser vazio.");
    }

    // Verificar se já existe categoria com o mesmo nome (evitando duplicatas se já existir)
    const existingList = await this.getCategoriesByTenant(tenantId);
    const existing = existingList.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      return existing;
    }

    // Gerar ID seguro
    const slugBase = globalStore.slugify(cleanName) || `cat-${Date.now()}`;
    const id = existingList.some((c) => c.id === slugBase)
      ? `${slugBase}-${Date.now().toString(36).slice(-4)}`
      : slugBase;

    const newCategory: Category = {
      id,
      tenantId: resolvedId,
      name: cleanName,
      icon: data.icon || "🍽️",
      order: existingList.length + 1,
      order_index: existingList.length + 1,
      createdAt: Date.now(),
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO categories (id, tenant_id, name, icon, order_index, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newCategory.id,
            newCategory.tenantId,
            newCategory.name,
            newCategory.icon,
            newCategory.order_index,
            newCategory.createdAt
          )
          .run();
      } catch (e) {
        console.warn("D1 createCategory error:", e);
      }
    }

    if (!globalStore.categories) {
      globalStore.categories = [...defaultCategories];
    }
    globalStore.categories.push(newCategory);

    return newCategory;
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
    const rawCardType = (orderData as any).cardType || (orderData as any).card_type || undefined;
    const rawPaymentDetails = (orderData as any).paymentDetails || (orderData as any).payment_details || undefined;
    const rawReceipt = (orderData as any).pixReceiptUrl || (orderData as any).pix_receipt_url || (orderData as any).receipt || undefined;

    const newOrder: Order = {
      ...orderData,
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      tenantId,
      cardType: rawCardType,
      paymentDetails: rawPaymentDetails,
      pixReceiptUrl: rawReceipt,
      pix_receipt_url: rawReceipt,
      createdAt: Date.now(),
      statusHistory: [{ status: orderData.status, timestamp: Date.now() }],
    };

    if (this.env?.DB) {
      try {
        await this.ensureTables();
        await this.env.DB.prepare(
          `INSERT INTO orders (
            id, tenant_id, customer_name, customer_phone, order_type, payment_method,
            card_type, payment_details, pix_receipt_url,
            address_json, change_for, subtotal, delivery_fee, total, status,
            items_json, status_history_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newOrder.id,
            newOrder.tenantId,
            newOrder.customerName,
            newOrder.customerPhone,
            newOrder.orderType,
            newOrder.paymentMethod,
            newOrder.cardType || null,
            newOrder.paymentDetails || null,
            newOrder.pixReceiptUrl || newOrder.pix_receipt_url || null,
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

        if (newOrder.items && newOrder.items.length > 0) {
          for (const item of newOrder.items) {
            try {
              const oiId = item.id || `oi-${newOrder.id}-${Math.random().toString(36).substring(2, 7)}`;
              const pId = item.product?.id || `p-${Math.random().toString(36).substring(2, 7)}`;
              const pName = item.product?.name || "Lanche";
              const pPrice = Number(item.product?.price) || 0;
              const pImg = item.product?.image || "";
              const pQty = Number(item.quantity) || 1;
              const optJson = JSON.stringify(item.selectedOptions || []);
              await this.env.DB.prepare(
                `INSERT INTO order_items (
                  id, order_id, tenant_id, product_id, name, price, quantity, image, options_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
                .bind(
                  oiId,
                  newOrder.id,
                  newOrder.tenantId,
                  pId,
                  pName,
                  pPrice,
                  pQty,
                  pImg,
                  optJson,
                  newOrder.createdAt
                )
                .run();
            } catch (itemErr) {
              console.warn("D1 createOrder insert order_item error:", itemErr);
            }
          }
        }
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
      isFeatured: row.is_featured !== undefined ? Boolean(row.is_featured) : Boolean(row.isFeatured || false),
      priorityOrder: Number(row.priority_order !== undefined ? row.priority_order : (row.priorityOrder || 0)),
      businessType: row.business_type || row.category || "Lanchonetes",
      rating: Number(row.rating) || 4.9,
      ratingCount: Number(row.rating_count) || 120,
      status: (row.status === "inactive" ? "inactive" : "active") as TenantStatus,
      subscriptionStatus: (row.subscription_status || "demo") as any,
      billingDay:
        row.billing_day !== undefined && row.billing_day !== null && row.billing_day !== ""
          ? Number(row.billing_day)
          : undefined,
      lastPaymentAt:
        row.last_payment_at !== undefined && row.last_payment_at !== null && row.last_payment_at !== ""
          ? Number(row.last_payment_at)
          : undefined,
      monthlyFee:
        row.monthly_fee !== undefined && row.monthly_fee !== null && row.monthly_fee !== ""
          ? Number(row.monthly_fee)
          : 49.9,
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

    const position = Number(row.position ?? row.ordem ?? row.order_index ?? 0);

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
      position,
      ordem: position,
      order: position,
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
      cardType: row.card_type || undefined,
      paymentDetails: row.payment_details || undefined,
      pixReceiptUrl: row.pix_receipt_url || undefined,
      pix_receipt_url: row.pix_receipt_url || undefined,
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

  // ===================== CARROSSÉIS DA HOME (HISTÓRICO DE VENDAS D1) =====================

  /**
   * Carrossel 1: Lojas em Destaque
   * Regra: Apenas lojas com is_featured = true.
   * Consulta no D1 contando os pedidos concluídos de cada loja (COUNT(orders.id)).
   * A loja patrocinada com MAIOR número de vendas ocupa AUTOMATICAMENTE a 1ª posição (#1).
   */
  async getFeaturedStoresRanked(): Promise<FeaturedStoreRanked[]> {
    await this.ensureTables();

    if (this.env?.DB) {
      try {
        const query = `
          SELECT 
            t.*,
            COALESCE(ord_stat.completed_count, 0) as completed_orders_count,
            COALESCE(ord_stat.total_count, 0) as sales_count
          FROM tenants t
          LEFT JOIN (
            SELECT 
              tenant_id,
              COUNT(CASE WHEN status IN ('done', 'Concluído', 'concluido', 'Entregue', 'entregue', 'finalizado') THEN 1 END) as completed_count,
              COUNT(id) as total_count
            FROM orders
            WHERE status != 'cancelled'
            GROUP BY tenant_id
          ) ord_stat ON ord_stat.tenant_id = t.id
          WHERE (t.is_featured = 1 OR t.is_featured = true) AND t.status != 'inactive'
          ORDER BY 
            completed_orders_count DESC, 
            sales_count DESC, 
            t.priority_order DESC, 
            t.created_at DESC
        `;
        const res = await this.env.DB.prepare(query).all<any>();
        if (res.results && res.results.length > 0) {
          return res.results.map((r: any, idx: number) => {
            const tenant = this.mapTenantRow(r);
            const completedOrdersCount = Number(r.completed_orders_count) || 0;
            const salesCount = Number(r.sales_count) || 0;
            return {
              ...tenant,
              completedOrdersCount,
              salesCount,
              rank: idx + 1,
            };
          });
        }
      } catch (e) {
        console.warn("D1 getFeaturedStoresRanked query warning, falling back to memory:", e);
      }
    }

    // Fallback em memória a partir de globalStore
    const featuredTenants = globalStore.tenants.filter(
      (t) => Boolean(t.isFeatured) && t.status !== "inactive"
    );

    const ranked = featuredTenants.map((t) => {
      const storeOrders = globalStore.orders.filter((o) => o.tenantId === t.id);
      const completedOrders = storeOrders.filter(
        (o) =>
          o.status === "done" ||
          o.status === "Concluído" ||
          o.status === "concluido" ||
          o.status === "Entregue" ||
          o.status === "entregue" ||
          o.status === "finalizado"
      );
      const nonCancelledOrders = storeOrders.filter((o) => o.status !== "cancelled");
      return {
        ...t,
        completedOrdersCount: completedOrders.length,
        salesCount: nonCancelledOrders.length,
        rank: 0,
      };
    });

    // Ordenação: MAIOR número de pedidos concluídos ocupa AUTOMATICAMENTE o 1º lugar
    ranked.sort((a, b) => {
      if (b.completedOrdersCount !== a.completedOrdersCount) {
        return b.completedOrdersCount - a.completedOrdersCount;
      }
      if (b.salesCount !== a.salesCount) {
        return b.salesCount - a.salesCount;
      }
      const aPri = a.priorityOrder || 0;
      const bPri = b.priorityOrder || 0;
      if (aPri !== bPri) return bPri - aPri;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return ranked.map((store, index) => ({
      ...store,
      rank: index + 1,
    }));
  }

  /**
   * Carrossel 2: Mais Pedidos
   * Regra: Cards dos lanches/produtos individuais mais vendidos de TODAS as lojas do app.
   * Consulta no D1 contando os itens nos pedidos (order_items com SUM(quantity)).
   * O lanche com maior volume de pedidos da semana/mês ocupa AUTOMATICAMENTE a 1ª posição.
   */
  async getTopSellingProducts(limit = 10, daysWindow = 30): Promise<TopSellingProduct[]> {
    await this.ensureTables();

    if (this.env?.DB) {
      try {
        const cutoffTimestamp = Date.now() - daysWindow * 86400000;

        // 1. Tenta buscar filtrando pela janela de tempo (semana/mês)
        let query = `
          SELECT 
            oi.tenant_id as tenantId,
            oi.product_id as productId,
            MAX(oi.name) as name,
            MAX(oi.price) as price,
            COALESCE(NULLIF(MAX(p.image), ''), NULLIF(MAX(oi.image), ''), '') as image,
            COALESCE(MAX(p.description), '') as description,
            MAX(t.name) as tenantName,
            MAX(t.slug) as tenantSlug,
            MAX(t.logo) as tenantLogo,
            MAX(t.primary_color) as tenantPrimaryColor,
            SUM(oi.quantity) as totalSold
          FROM order_items oi
          JOIN tenants t ON t.id = oi.tenant_id
          LEFT JOIN products p ON (p.id = oi.product_id AND p.tenant_id = oi.tenant_id)
          JOIN orders o ON o.id = oi.order_id
          WHERE t.status != 'inactive'
            AND o.status != 'cancelled'
            AND oi.created_at >= ?
          GROUP BY oi.tenant_id, oi.product_id
          ORDER BY totalSold DESC, name ASC
          LIMIT ?
        `;
        let res = await this.env.DB.prepare(query).bind(cutoffTimestamp, limit).all<any>();

        // Se retornar menos de 2 produtos na janela recente, consulta todo o histórico de order_items
        if (!res.results || res.results.length < 2) {
          query = `
            SELECT 
              oi.tenant_id as tenantId,
              oi.product_id as productId,
              MAX(oi.name) as name,
              MAX(oi.price) as price,
              COALESCE(NULLIF(MAX(p.image), ''), NULLIF(MAX(oi.image), ''), '') as image,
              COALESCE(MAX(p.description), '') as description,
              MAX(t.name) as tenantName,
              MAX(t.slug) as tenantSlug,
              MAX(t.logo) as tenantLogo,
              MAX(t.primary_color) as tenantPrimaryColor,
              SUM(oi.quantity) as totalSold
            FROM order_items oi
            JOIN tenants t ON t.id = oi.tenant_id
            LEFT JOIN products p ON (p.id = oi.product_id AND p.tenant_id = oi.tenant_id)
            JOIN orders o ON o.id = oi.order_id
            WHERE t.status != 'inactive'
              AND o.status != 'cancelled'
            GROUP BY oi.tenant_id, oi.product_id
            ORDER BY totalSold DESC, name ASC
            LIMIT ?
          `;
          res = await this.env.DB.prepare(query).bind(limit).all<any>();
        }

        if (res.results && res.results.length > 0) {
          return res.results.map((r: any, idx: number) => {
            const safeSlug = String(r.name || "item")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            return {
              id: `top-${idx + 1}-${r.tenantId}-${r.productId}-${safeSlug}`,
              productId: r.productId,
              name: r.name,
              price: Number(r.price) || 0,
              image: r.image || "",
              description: r.description || "",
              tenantId: r.tenantId,
              tenantName: r.tenantName,
              tenantSlug: r.tenantSlug,
              tenantLogo: r.tenantLogo || "🍔",
              tenantPrimaryColor: r.tenantPrimaryColor || "#E63946",
              totalSold: Number(r.totalSold) || 0,
              rank: idx + 1,
            };
          });
        }
      } catch (e) {
        console.warn("D1 getTopSellingProducts warning, falling back to memory:", e);
      }
    }

    // Fallback em memória agregando order.items
    const salesMap = new Map<
      string,
      {
        productId: string;
        name: string;
        price: number;
        image: string;
        description: string;
        tenantId: string;
        tenantName: string;
        tenantSlug: string;
        tenantLogo: string;
        tenantPrimaryColor: string;
        totalSold: number;
      }
    >();

    const validOrders = globalStore.orders.filter((o) => o.status !== "cancelled");
    for (const order of validOrders) {
      const tenant = globalStore.tenants.find((t) => t.id === order.tenantId && t.status !== "inactive");
      if (!tenant) continue;

      for (const item of order.items || []) {
        const pId = item.product?.id || `p-${Math.random().toString(36).substring(2, 6)}`;
        // Agrupa por loja e produto para consolidar o total vendido de forma única
        const key = `${tenant.id}__${pId}`;
        const existing = salesMap.get(key);
        const qty = Number(item.quantity) || 1;

        const matchingProduct =
          globalStore.products.find((p) => p.id === pId && p.tenantId === tenant.id) ||
          globalStore.products.find((p) => p.id === pId);
        const img = item.product?.image || matchingProduct?.image || "";
        const desc = matchingProduct?.description || item.notes || "";

        if (existing) {
          existing.totalSold += qty;
          if (!existing.image && img) existing.image = img;
        } else {
          salesMap.set(key, {
            productId: pId,
            name: matchingProduct?.name || item.product?.name || "Lanche Especial",
            price: Number(matchingProduct?.price ?? item.product?.price) || 0,
            image: img,
            description: desc,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            tenantLogo: tenant.logo || "🍔",
            tenantPrimaryColor: tenant.primaryColor || "#E63946",
            totalSold: qty,
          });
        }
      }
    }

    const sorted = Array.from(salesMap.values()).sort((a, b) => b.totalSold - a.totalSold);
    return sorted.slice(0, limit).map((prod, idx) => {
      const safeSlug = String(prod.name || "item")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return {
        id: `top-${idx + 1}-${prod.tenantId}-${prod.productId}-${safeSlug}`,
        ...prod,
        rank: idx + 1,
      };
    });
  }

  // ==========================================
  // STORIES DA LOJA (APENAS FOTOS - EXPIRAÇÃO 24H - MÁX 3)
  // ==========================================

  async getStoreStories(tenantIdOrSlug: string, onlyActive = true): Promise<StoreStory[]> {
    await this.ensureTables();
    const now = Date.now();

    let targetTenantId = tenantIdOrSlug;
    const tenant = await this.getTenantByIdOrSlug(tenantIdOrSlug);
    if (tenant) {
      targetTenantId = tenant.id;
    }

    if (this.env?.DB) {
      try {
        let query = "SELECT * FROM store_stories WHERE tenant_id = ?";
        const params: any[] = [targetTenantId];
        if (onlyActive) {
          query += " AND expires_at > ?";
          params.push(now);
        }
        query += " ORDER BY created_at ASC";

        const { results } = await this.env.DB.prepare(query).bind(...params).all<any>();
        if (results && Array.isArray(results)) {
          return results.map((r) => ({
            id: String(r.id),
            tenantId: String(r.tenant_id),
            mediaUrl: String(r.media_url),
            mediaType: "image",
            caption: r.caption ? String(r.caption) : undefined,
            createdAt: Number(r.created_at),
            expiresAt: Number(r.expires_at),
          }));
        }
      } catch (err) {
        console.warn("D1 getStoreStories error, using memory fallback:", err);
      }
    }

    return globalStore.stories
      .filter((s) => s.tenantId === targetTenantId && (!onlyActive || s.expiresAt > now))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async getAllActiveStoriesGrouped(): Promise<Record<string, StoreStory[]>> {
    await this.ensureTables();
    const now = Date.now();
    const map: Record<string, StoreStory[]> = {};

    if (this.env?.DB) {
      try {
        const query = "SELECT * FROM store_stories WHERE expires_at > ? ORDER BY created_at ASC";
        const { results } = await this.env.DB.prepare(query).bind(now).all<any>();
        if (results && Array.isArray(results)) {
          for (const r of results) {
            const tId = String(r.tenant_id);
            if (!map[tId]) map[tId] = [];
            if (map[tId].length < 3) {
              map[tId].push({
                id: String(r.id),
                tenantId: tId,
                mediaUrl: String(r.media_url),
                mediaType: "image",
                caption: r.caption ? String(r.caption) : undefined,
                createdAt: Number(r.created_at),
                expiresAt: Number(r.expires_at),
              });
            }
          }
          return map;
        }
      } catch (err) {
        console.warn("D1 getAllActiveStoriesGrouped warning:", err);
      }
    }

    for (const story of globalStore.stories) {
      if (story.expiresAt > now) {
        if (!map[story.tenantId]) map[story.tenantId] = [];
        if (map[story.tenantId].length < 3) {
          map[story.tenantId].push(story);
        }
      }
    }
    return map;
  }

  async createStoreStory(data: {
    tenantId: string;
    mediaUrl: string;
    mediaType?: string;
    caption?: string;
  }): Promise<StoreStory> {
    await this.ensureTables();

    // 1. Regra: APENAS FOTOS (JPG, PNG, WEBP). Bloqueie envio de vídeos.
    const mediaType = data.mediaType || "image";
    if (mediaType !== "image") {
      throw new Error("Apenas fotos (JPG, PNG, WEBP) são permitidas nos stories. Envio de vídeos está bloqueado.");
    }
    const url = String(data.mediaUrl || "").trim();
    if (!url) {
      throw new Error("A imagem do story é obrigatória.");
    }
    const isVideo = url.startsWith("data:video") || /\.(mp4|mov|avi|webm|mkv)(\?.*)?$/i.test(url);
    if (isVideo) {
      throw new Error("Formato não suportado. A funcionalidade aceita apenas fotos (JPG, PNG, WEBP). Vídeos estão bloqueados.");
    }

    // 2. Regra: Limite de no máximo 3 fotos ativas por loja simultaneamente.
    let targetTenantId = data.tenantId;
    const tenant = await this.getTenantByIdOrSlug(data.tenantId);
    if (tenant) {
      targetTenantId = tenant.id;
    }

    const activeStories = await this.getStoreStories(targetTenantId, true);
    if (activeStories.length >= 3) {
      throw new Error("Limite atingido: a loja já possui 3 stories ativos. Apague um story antigo para publicar um novo.");
    }

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 horas

    const newStory: StoreStory = {
      id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      tenantId: targetTenantId,
      mediaUrl: url,
      mediaType: "image",
      caption: data.caption ? String(data.caption).trim() : undefined,
      createdAt: now,
      expiresAt: expiresAt,
    };

    if (this.env?.DB) {
      try {
        await this.env.DB.prepare(
          `INSERT INTO store_stories (id, tenant_id, media_url, media_type, caption, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newStory.id,
            newStory.tenantId,
            newStory.mediaUrl,
            newStory.mediaType,
            newStory.caption || null,
            newStory.createdAt,
            newStory.expiresAt
          )
          .run();
      } catch (err) {
        console.warn("D1 insert store_stories error:", err);
      }
    }

    globalStore.stories.push(newStory);
    return newStory;
  }

  async deleteStoreStory(id: string, tenantId?: string): Promise<boolean> {
    await this.ensureTables();

    if (this.env?.DB) {
      try {
        let query = "DELETE FROM store_stories WHERE id = ?";
        const params: any[] = [id];
        if (tenantId) {
          query += " AND tenant_id = ?";
          params.push(tenantId);
        }
        await this.env.DB.prepare(query).bind(...params).run();
      } catch (err) {
        console.warn("D1 delete store_stories error:", err);
      }
    }

    const initialLen = globalStore.stories.length;
    globalStore.stories = globalStore.stories.filter((s) => {
      if (s.id !== id) return true;
      if (tenantId && s.tenantId !== tenantId) return true;
      return false;
    });

    return globalStore.stories.length < initialLen;
  }
}
