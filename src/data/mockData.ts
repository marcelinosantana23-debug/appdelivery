import type { Category, Product } from "@/types";
import { extraProducts } from "@/server/seedData";

export const categories: Category[] = [
  { id: "lanches", name: "Lanches", icon: "🍔" },
  { id: "hotdogs", name: "Hot Dogs", icon: "🌭" },
  { id: "pizzas", name: "Pizzas", icon: "🍕" },
  { id: "acai", name: "Açaí & Sorvetes", icon: "🍧" },
  { id: "bebidas", name: "Bebidas", icon: "🥤" },
  { id: "combos", name: "Combos", icon: "🍟" },
  { id: "porcoes", name: "Porções", icon: "🍗" },
  { id: "sobremesas", name: "Sobremesas", icon: "🍰" },
];

export const mockProducts: Product[] = extraProducts.filter(
  (p) => p.tenantId === "tenant-central-dos-lanches"
);

