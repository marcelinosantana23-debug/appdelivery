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
  logo: string;
  bannerImage?: string;
  primaryColor: string;
  primaryDark: string;
  primaryLight: string;
  accentColor: string;
  status: TenantStatus;
  isOpen: boolean;
  createdAt: number;
  updatedAt: number;
  productCount?: number;
  orderCount?: number;
  revenue?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
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

