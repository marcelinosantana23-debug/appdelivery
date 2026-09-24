import type { Tenant, EstablishmentCategory } from "@/types";

export type { EstablishmentCategory };

export const DEFAULT_ESTABLISHMENT_CATEGORIES: EstablishmentCategory[] = [
  { id: "todos", name: "Todos", icon: "🍽️", order: 0 },
  { id: "acaiterias", name: "Açaíterias", icon: "🍧", order: 1 },
  { id: "lanchonetes", name: "Hambúrgueres", icon: "🍔", order: 2 },
  { id: "pizzarias", name: "Pizzarias", icon: "🍕", order: 3 },
  { id: "sorveteiras", name: "Sorveterias", icon: "🍨", order: 4 },
  { id: "japonesa", name: "Japonesa", icon: "🍣", order: 5 },
  { id: "salgados", name: "Salgados", icon: "🥟", order: 6 },
  { id: "marmitaria", name: "Marmitaria", icon: "🍱", order: 7 },
  { id: "docerias", name: "Doces", icon: "🍰", order: 8 },
  { id: "churrascaria", name: "Churrascaria", icon: "🥩", order: 9 },
  { id: "distribuidoras", name: "Bebidas", icon: "🍺", order: 10 },
];

export const ESTABLISHMENT_CATEGORIES = DEFAULT_ESTABLISHMENT_CATEGORIES;

export function normalizeCategory(businessType?: string, name?: string, tagline?: string): string {
  const combined = `${businessType || ""} ${name || ""} ${tagline || ""}`.toLowerCase();
  if (combined.includes("acai") || combined.includes("açaí")) return "acaiterias";
  if (combined.includes("burger") || combined.includes("lanche")) return "lanchonetes";
  if (combined.includes("pizza")) return "pizzarias";
  if (combined.includes("sorvet") || combined.includes("gelat") || combined.includes("picole")) return "sorveteiras";
  if (combined.includes("sushi") || combined.includes("japon") || combined.includes("temaki") || combined.includes("yakisoba")) return "japonesa";
  if (combined.includes("salgado") || combined.includes("coxinha") || combined.includes("pastel") || combined.includes("kibe")) return "salgados";
  if (combined.includes("marmit") || combined.includes("caseir") || combined.includes("executiv")) return "marmitaria";
  if (combined.includes("doce") || combined.includes("bolo") || combined.includes("confeit") || combined.includes("torta") || combined.includes("chocolate")) return "docerias";
  if (combined.includes("churrasc") || combined.includes("brasa") || combined.includes("carvao") || combined.includes("picanha") || combined.includes("costela") || combined.includes("grill")) return "churrascaria";
  if (combined.includes("bebid") || combined.includes("cervej") || combined.includes("adega") || combined.includes("distribuidor") || combined.includes("vinho")) return "distribuidoras";
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

  // 3. Fallbacks comuns para os 10 tipos padrão
  const pool = `${tenant.businessType || ""} ${tenant.name || ""} ${tenant.tagline || ""}`.toLowerCase();
  if (pool.includes("acai") || pool.includes("açaí")) {
    const a = categories.find((c) => c.name.toLowerCase().includes("açaí") || c.name.toLowerCase().includes("acai") || c.id.includes("acai"));
    if (a) return a;
  }
  if (pool.includes("sushi") || pool.includes("japon") || pool.includes("temaki") || pool.includes("sashimi") || pool.includes("yakisoba")) {
    const j = categories.find((c) => c.name.toLowerCase().includes("japon") || c.id.includes("japon"));
    if (j) return j;
  }
  if (pool.includes("salgado") || pool.includes("coxinha") || pool.includes("pastel") || pool.includes("kibe") || pool.includes("empada")) {
    const sal = categories.find((c) => c.name.toLowerCase().includes("salgado") || c.id.includes("salgado"));
    if (sal) return sal;
  }
  if (pool.includes("marmit") || pool.includes("caseir") || pool.includes("almoço")) {
    const m = categories.find((c) => c.name.toLowerCase().includes("marmit") || c.id.includes("marmit"));
    if (m) return m;
  }
  if (pool.includes("doce") || pool.includes("bolo") || pool.includes("confeit") || pool.includes("torta") || pool.includes("brigadeiro")) {
    const d = categories.find((c) => c.name.toLowerCase().includes("doce") || c.id.includes("doce"));
    if (d) return d;
  }
  if (pool.includes("churrasc") || pool.includes("brasa") || pool.includes("carvao") || pool.includes("picanha") || pool.includes("costela") || pool.includes("grill")) {
    const ch = categories.find((c) => c.name.toLowerCase().includes("churrasc") || c.id.includes("churrasc") || c.id.includes("restauran"));
    if (ch) return ch;
  }
  if (pool.includes("bebid") || pool.includes("cervej") || pool.includes("adega") || pool.includes("distribuidor") || pool.includes("vinho") || pool.includes("refrigerante")) {
    const beb = categories.find((c) => c.name.toLowerCase().includes("bebid") || c.id.includes("distribuidor") || c.id.includes("bebid"));
    if (beb) return beb;
  }
  if (pool.includes("sorvet") || pool.includes("gelat") || pool.includes("picole")) {
    const s = categories.find((c) => c.name.toLowerCase().includes("sorvet") || c.id.includes("sorvet"));
    if (s) return s;
  }
  if (pool.includes("pizza")) {
    const p = categories.find((c) => c.name.toLowerCase().includes("pizza") || c.id.includes("pizza"));
    if (p) return p;
  }
  if (pool.includes("burger") || pool.includes("hamburguer") || pool.includes("lanche") || pool.includes("batata")) {
    const l = categories.find((c) => c.name.toLowerCase().includes("lancho") || c.name.toLowerCase().includes("hamburg") || c.id.includes("lancho"));
    if (l) return l;
  }

  // 4. Default: Lanchonete ou primeira disponível
  const lanchonete = categories.find((c) => c.name.toLowerCase().includes("lancho") || c.name.toLowerCase().includes("hamburg") || c.id.includes("lancho"));
  if (lanchonete) return lanchonete;

  const firstValid = categories.find((c) => c.id !== "todos");
  return firstValid || { id: "lanchonetes", name: "Hambúrgueres", icon: "🍔", order: 2 };
}
