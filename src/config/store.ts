export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

export interface StoreConfig {
  name: string;
  tagline: string;
  logo: string;
  whatsapp: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  deliveryFee: number;
  currency: string;
  address: string;
  hours: string;
  primaryColor: string;
  primaryDark: string;
  primaryLight: string;
  accentColor: string;
}

export const defaultStoreConfig: StoreConfig = {
  name: "Burger Town",
  tagline: "Hambúrgueres artesanais na chama",
  logo: "🍔",
  whatsapp: "5511999999999",
  pixKey: "contato@burgertown.com.br",
  pixKeyType: "email",
  deliveryFee: 6.0,
  currency: "R$",
  address: "Rua das Chamas, 420 - Centro",
  hours: "18:00 - 23:30",
  primaryColor: "#E63946",
  primaryDark: "#C1121F",
  primaryLight: "#F77F00",
  accentColor: "#FCBF49",
};

export const ADMIN_CREDENTIALS = {
  email: "admin@loja.com",
  password: "123456",
};
