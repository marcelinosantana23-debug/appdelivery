export type UserRole = "super_admin" | "tenant_admin";

export type TenantStatus = "active" | "inactive";

export interface TenantCredential {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  userId: string;
  email: string;
  password?: string;
  name: string;
  status: string;
}

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  whatsapp: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  deliveryFee: number;
  address: string;
  hours: string;
  tagline: string;
  announcement?: string;
  logo: string;
  bannerImage?: string;
  primaryColor: string;
  secondaryColor?: string;
  primaryDark: string;
  primaryLight: string;
  accentColor: string;
  themeMode?: "light" | "dark";
  menuLayout?: "list" | "grid";
  showFeaturedCarousel?: boolean;
  isFeatured?: boolean;
  priorityOrder?: number;
  businessType?: string;
  rating?: number;
  ratingCount?: number;
  status: TenantStatus;
  isOpen: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlatformSettings {
  logoUrl?: string;
  bannerUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  primaryColor?: string;
  updatedAt?: number;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  tenantId?: string | null;
  status: "active" | "inactive";
  createdAt: number;
}

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  available?: boolean;
  options?: ProductOption[];
  position?: number;
  ordem?: number;
  order?: number;
  createdAt?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  tenantId?: string;
  order?: number;
  order_index?: number;
  createdAt?: number;
}

export interface EstablishmentCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  order_index?: number;
  active?: boolean;
  createdAt?: number;
}

export type OrderType = "delivery" | "pickup";
export type PaymentMethod = "pix" | "card" | "cash";
export type OrderStatus = "received" | "preparing" | "delivering" | "done" | "cancelled";

export interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    category?: string;
    description?: string;
    available?: boolean;
    options?: ProductOption[];
  };
  quantity: number;
  selectedOptions: ProductOption[];
  notes: string;
}

export interface Order {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  address?: {
    street: string;
    number: string;
    district: string;
    complement: string;
    reference: string;
  };
  changeFor?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  statusHistory: { status: OrderStatus; timestamp: number }[];
  createdAt: number;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  street?: string;
  number?: string;
  district?: string;
  complement?: string;
  reference?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: number;
  createdAt: number;
  updatedAt: number;
}

// Cloudflare Workers Bindings via env object
export interface CloudflareD1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

export interface CloudflareD1PreparedStatement {
  bind(...values: unknown[]): CloudflareD1PreparedStatement;
  all<T = unknown>(): Promise<CloudflareD1Result<T>>;
  run<T = unknown>(): Promise<CloudflareD1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
}

export interface CloudflareD1Database {
  prepare(query: string): CloudflareD1PreparedStatement;
  batch?(statements: CloudflareD1PreparedStatement[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
}

export interface CloudflareKVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  DB?: CloudflareD1Database;
  KV?: CloudflareKVNamespace;
  STORE_KV?: CloudflareKVNamespace;
  ASSETS?: { fetch: (req: Request | string) => Promise<Response> };
  __STATIC_CONTENT?: unknown;
  PLATFORM_NAME?: string;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  GEMINI_API_KEY?: string;
}

export interface FinancialMetrics {
  todayRevenue: number;
  monthRevenue: number;
  monthCompletedOrders: number;
  averageTicket: number;
  todayCompletedOrders: number;
  deliveredCount: number;
  pickupCount: number;
  deliveryFeeTotal: number;
}

export interface DailyRevenueItem {
  day: number;
  date: string;
  dayOfWeek: string;
  revenue: number;
  ordersCount: number;
}

export interface PaymentBreakdownItem {
  method: PaymentMethod | string;
  label: string;
  total: number;
  count: number;
  percent: number;
}

export interface FinancialReportData {
  period: {
    month: number;
    year: number;
    monthName: string;
    startDate: string;
    endDate: string;
  };
  metrics: FinancialMetrics;
  dailyRevenue: DailyRevenueItem[];
  paymentBreakdown: PaymentBreakdownItem[];
  orders: Order[];
}
