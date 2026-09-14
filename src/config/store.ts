export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

export interface StoreConfig {
  id?: string;
  slug?: string;
  name: string;
  tagline: string;
  announcement?: string;
  logo: string;
  bannerImage?: string;
  whatsapp: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  deliveryFee: number;
  currency: string;
  address: string;
  hours: string;
  primaryColor: string;
  secondaryColor?: string;
  primaryDark: string;
  primaryLight: string;
  accentColor: string;
  themeMode?: "light" | "dark";
  menuLayout?: "list" | "grid";
  showFeaturedCarousel?: boolean;
  status?: "active" | "inactive";
  isOpen?: boolean;
}

export const defaultStoreConfig: StoreConfig = {
  id: "tenant-burger-town",
  slug: "burger-town",
  name: "Burger Town",
  tagline: "Hambúrgueres artesanais na chama",
  announcement: "Entrega grátis para pedidos acima de R$ 50,00!",
  logo: "🍔",
  bannerImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  whatsapp: "5511999999999",
  pixKey: "contato@burgertown.com.br",
  pixKeyType: "email",
  deliveryFee: 6.0,
  currency: "R$",
  address: "Rua das Chamas, 420 - Centro",
  hours: "18:00 - 23:30",
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
};

export const SUPER_ADMIN_CREDENTIALS = {
  email: "superadmin@plataforma.com",
  password: "admin123",
};

export const ADMIN_CREDENTIALS = {
  email: "admin@loja.com",
  password: "123456",
};

