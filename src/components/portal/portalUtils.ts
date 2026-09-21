import type { Tenant, EstablishmentCategory } from "@/types";

export type { EstablishmentCategory };

export const DEFAULT_ESTABLISHMENT_CATEGORIES: EstablishmentCategory[] = [
  { id: "todos", name: "Todos", icon: "🍽️", order: 0 },
  { id: "lanchonetes", name: "Lanchonetes", icon: "🍔", order: 1 },
  { id: "pizzarias", name: "Pizzarias", icon: "🍕", order: 2 },
  { id: "sorveteiras", name: "Sorveterias", icon: "🍨", order: 3 },
  { id: "acaiterias", name: "Açaíterias", icon: "🍧", order: 4 },
  { id: "restaurantes", name: "Restaurantes", icon: "🥩", order: 5 },
];

export const ESTABLISHMENT_CATEGORIES = DEFAULT_ESTABLISHMENT_CATEGORIES;

export function normalizeCategory(businessType?: string, name?: string, tagline?: string): string {
  const combined = `${businessType || ""} ${name || ""} ${tagline || ""}`.toLowerCase();
  if (combined.includes("pizza")) return "pizzarias";
  if (combined.includes("sorvet") || combined.includes("gelat") || combined.includes("picole")) return "sorveteiras";
  if (combined.includes("acai") || combined.includes("açaí")) return "acaiterias";
  if (combined.includes("restauran") || combined.includes("grill") || combined.includes("brasa") || combined.includes("marmit") || combined.includes("executiv")) return "restaurantes";
  if (businessType && businessType.trim()) {
    return businessType.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  }
  return "lanchonetes";
}

/**
 * Associa com precisão um estabelecimento à sua respectiva Categoria (fixa ou criada dinamicamente)
 */
export function matchStoreCategory(
  tenant: Tenant,
  categories: EstablishmentCategory[]
): EstablishmentCategory {
  const bType = (tenant.businessType || "").trim().toLowerCase();

  // 1. Tentar bater exatamente pelo ID ou pelo Nome da categoria
  if (bType) {
    const directMatch = categories.find(
      (c) =>
        c.id.toLowerCase() === bType ||
        c.name.toLowerCase() === bType ||
        c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === bType.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );
    if (directMatch) return directMatch;
  }

  // 2. Tentar bater por correspondência de texto de categorias cadastradas
  for (const cat of categories) {
    if (cat.id === "todos") continue;
    const catNameLower = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const searchPool = `${tenant.businessType || ""} ${tenant.name || ""} ${tenant.tagline || ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (searchPool.includes(catNameLower)) {
      return cat;
    }
  }

  // 3. Fallbacks comuns para os tipos padrão
  const pool = `${tenant.businessType || ""} ${tenant.name || ""} ${tenant.tagline || ""}`.toLowerCase();
  if (pool.includes("pizza")) {
    const p = categories.find((c) => c.name.toLowerCase().includes("pizza") || c.id.includes("pizza"));
    if (p) return p;
  }
  if (pool.includes("sorvet") || pool.includes("gelat") || pool.includes("picole")) {
    const s = categories.find((c) => c.name.toLowerCase().includes("sorvet") || c.id.includes("sorvet"));
    if (s) return s;
  }
  if (pool.includes("acai") || pool.includes("açaí")) {
    const a = categories.find((c) => c.name.toLowerCase().includes("açaí") || c.name.toLowerCase().includes("acai") || c.id.includes("acai"));
    if (a) return a;
  }
  if (pool.includes("restauran") || pool.includes("grill") || pool.includes("marmit") || pool.includes("brasa")) {
    const r = categories.find((c) => c.name.toLowerCase().includes("restauran") || c.id.includes("restauran"));
    if (r) return r;
  }

  // 4. Default: Lanchonete ou primeira disponível
  const lanchonete = categories.find((c) => c.name.toLowerCase().includes("lancho") || c.id.includes("lancho"));
  if (lanchonete) return lanchonete;

  const firstValid = categories.find((c) => c.id !== "todos");
  return firstValid || { id: "lanchonetes", name: "Lanchonetes", icon: "🍔", order: 1 };
}
