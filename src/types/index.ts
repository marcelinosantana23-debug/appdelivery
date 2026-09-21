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

export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  options: ProductOption[];
  position?: number;
  ordem?: number;
  order?: number;
  createdAt?: number;
}

export type UserRole = "super_admin" | "tenant_admin";
export type TenantStatus = "active" | "inactive";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  status: "active" | "inactive";
  createdAt: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  whatsapp: string;
  pixKey: string;
  pixKeyType: "cpf" | "cnpj" | "phone" | "email" | "random";
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
  productCount?: number;
  orderCount?: number;
  revenue?: number;
}

export interface PlatformSettings {
  logoUrl?: string;
  bannerUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  primaryColor?: string;
  updatedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
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

export interface CartItem {
  id: string;
  product: {
    id: string;
    tenantId?: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category?: string;
    available?: boolean;
    options?: ProductOption[];
  };
  quantity: number;
  selectedOptions: ProductOption[];
  notes: string;
}

export type OrderItem = CartItem;

export type OrderType = "delivery" | "pickup";
export type PaymentMethod = "pix" | "card" | "cash";
export type OrderStatus = "received" | "preparing" | "delivering" | "done" | "cancelled";

export interface Order {
  id: string;
  tenantId?: string;
  items: CartItem[];
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
  customerName: string;
  customerPhone: string;
  createdAt: number;
  statusHistory: { status: OrderStatus; timestamp: number }[];
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

export interface StoredCustomerProfile {
  name: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  complement?: string;
  reference?: string;
  lastUpdated?: number;
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

export interface TopSellingProduct {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantLogo?: string;
  tenantPrimaryColor?: string;
  totalSold: number;
  rank?: number;
}

export interface FeaturedStoreRanked extends Tenant {
  completedOrdersCount: number;
  salesCount: number;
  rank: number;
}

