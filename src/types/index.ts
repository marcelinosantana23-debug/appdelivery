export interface ProductOption {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
  options: ProductOption[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions: ProductOption[];
  notes: string;
}

export type OrderType = "delivery" | "pickup";
export type PaymentMethod = "pix" | "card" | "cash";
export type OrderStatus = "received" | "preparing" | "delivering" | "done" | "cancelled";

export interface Order {
  id: string;
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
