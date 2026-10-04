import type { Tenant, EstablishmentCategory } from "@/types";

export type { EstablishmentCategory };

export const DEFAULT_ESTABLISHMENT_CATEGORIES: EstablishmentCategory[] = [
  { id: "todos", name: "Todos", icon: "🍽️", order: 0 },
  { id: "acaiterias", name: "Açaíterias", icon: "🍧", order: 1 },
  { id: "hamburgueres", name: "Hambúrgueres", icon: "🍔", order: 2 },
  { id: "pizzarias", name: "Pizzarias", icon: "🍕", order: 3 },
  { id: "padarias-cafes", name: "Padarias & Cafés", icon: "🥖", order: 4 },
  { id: "churrascaria", name: "Churrascaria", icon: "🥩", order: 5 },
  { id: "japonesa", name: "Japonesa", icon: "🍣", order: 6 },
  { id: "sorveterias", name: "Sorveterias", icon: "🍨", order: 7 },
  { id: "pastelarias", name: "Pastelarias", icon: "🥟", order: 8 },
  { id: "massas-italiana", name: "Massas & Cozinha Italiana", icon: "🍝", order: 9 },
  { id: "marmitaria", name: "Marmitaria", icon: "🍱", order: 10 },
  { id: "doces", name: "Doces", icon: "🍰", order: 11 },
  { id: "salgados", name: "Salgados", icon: "🥐", order: 12 },
  { id: "bebidas", name: "Bebidas", icon: "🍺", order: 13 },
  { id: "poke-saudavel", name: "Poke & Alimentação Saudável", icon: "🥗", order: 14 },
  { id: "frango-frito", name: "Frango Frito & Porções", icon: "🍗", order: 15 },
  { id: "hot-dog", name: "Hot Dog & Lanches Rápidos", icon: "🌭", order: 16 },
  { id: "comida-mineira", name: "Comida Mineira & Feijoada", icon: "🍲", order: 17 },
  { id: "cozinha-mexicana", name: "Cozinha Mexicana & Tacos", icon: "🌮", order: 18 },
  { id: "crepes-tapiocas", name: "Crepes, Panquecas & Tapiocas", icon: "🥞", order: 19 },
];

export const ESTABLISHMENT_CATEGORIES = DEFAULT_ESTABLISHMENT_CATEGORIES;

/**
 * Converte um nome de categoria em slug semântico para identificação
 */
export function slugifyCategory(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "categoria";
}

/**
 * Retorna o ícone/emoji correspondente com base no nome da categoria
 */
export function getCategoryIcon(categoryName: string, existingIcon?: string): string {
  if (existingIcon && existingIcon.trim()) return existingIcon.trim();
  const name = (categoryName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (name.includes("acai")) return "🍧";
  if (name.includes("dog") || name.includes("hot dog") || name.includes("prensado")) return "🌭";
  if (name.includes("hamburg") || name.includes("burger") || name.includes("lanche")) return "🍔";
  if (name.includes("pizza")) return "🍕";
  if (name.includes("padaria") || name.includes("pao") || name.includes("cafe")) return "🥖";
  if (name.includes("poke") || name.includes("salada") || name.includes("saudavel")) return "🥗";
  if (name.includes("frango") || name.includes("balde") || name.includes("crispy")) return "🍗";
  if (name.includes("dog") || name.includes("prensado")) return "🌭";
  if (name.includes("sorvet") || name.includes("gelat") || name.includes("picole")) return "🍨";
  if (name.includes("massa") || name.includes("italian") || name.includes("macarrao") || name.includes("pasta")) return "🍝";
  if (name.includes("mineir") || name.includes("feijoad") || name.includes("fogao")) return "🍲";
  if (name.includes("pastel")) return "🥟";
  if (name.includes("mexican") || name.includes("taco") || name.includes("burrito") || name.includes("nacho")) return "🌮";
  if (name.includes("japon") || name.includes("sushi") || name.includes("temaki") || name.includes("oriental")) return "🍣";
  if (name.includes("crepe") || name.includes("tapioca") || name.includes("panqueca")) return "🥞";
  if (name.includes("salgado") || name.includes("coxinha") || name.includes("kibe") || name.includes("esfirra")) return "🥐";
  if (name.includes("marmit") || name.includes("caseir") || name.includes("almoco") || name.includes("refeicao")) return "🍱";
  if (name.includes("doce") || name.includes("bolo") || name.includes("confeit") || name.includes("torta") || name.includes("sobremesa") || name.includes("chocolate")) return "🍰";
  if (name.includes("churrasc") || name.includes("carne") || name.includes("brasa") || name.includes("espet") || name.includes("picanha") || name.includes("grill")) return "🥩";
  if (name.includes("bebid") || name.includes("cervej") || name.includes("adega") || name.includes("distribuidor") || name.includes("vinho") || name.includes("chopp")) return "🍺";
  if (name.includes("peixe") || name.includes("frutos do mar") || name.includes("camarao")) return "🦐";
  if (name.includes("arabe") || name.includes("kebab") || name.includes("shawarma")) return "🥙";
  return "🍽️";
}

/**
 * Extrai dinamicamente do banco de dados e da lista de lojas ativas
 * TODAS as categorias únicas atribuídas às lojas, sem categorias fixas
 */
export function extractDynamicCategories(
  tenants: Tenant[],
  dbCategories: EstablishmentCategory[] = []
): EstablishmentCategory[] {
  const map = new Map<string, EstablishmentCategory>();

  // 1. Incorpora categorias padrão e categorias já cadastradas no Cloudflare D1 (mantendo ícones e ordenação)
  const baseCategories =
    dbCategories && dbCategories.length > 0
      ? [...DEFAULT_ESTABLISHMENT_CATEGORIES, ...dbCategories]
      : DEFAULT_ESTABLISHMENT_CATEGORIES;

  baseCategories.forEach((c) => {
    if (c.id === "todos") return;
    const nameTrimmed = c.name.trim();
    if (!nameTrimmed) return;
    const key = slugifyCategory(nameTrimmed);
    map.set(key, {
      id: c.id || slugifyCategory(nameTrimmed),
      name: nameTrimmed,
      icon: c.icon || getCategoryIcon(nameTrimmed),
      order: c.order ?? 99,
    });
  });

  // 2. Extrai dinamicamente todas as categorias únicas atribuídas às lojas ativas
  const currentCatalog = Array.from(map.values());
  (tenants || []).forEach((tenant) => {
    if (tenant.status === "inactive") return;
    const matched = matchStoreCategory(tenant, currentCatalog);
    if (!matched || matched.id === "todos") return;

    const key = slugifyCategory(matched.name);
    if (!map.has(key)) {
      map.set(key, {
        id: matched.id || key,
        name: matched.name,
        icon: matched.icon || getCategoryIcon(matched.name),
        order: matched.order ?? 99,
      });
    }
  });

  // 3. Filtra para manter todas as categorias que possuem pelo menos 1 loja ativa associada
  const allCandidates = Array.from(map.values());
  const activeCategoriesList: EstablishmentCategory[] = [];

  allCandidates.forEach((cat) => {
    const hasStores = (tenants || []).some((t) => {
      if (t.status === "inactive") return false;
      const matched = matchStoreCategory(t, allCandidates);
      return doesCategoryMatch(matched, cat.id, t.businessType) || doesCategoryMatch(matched, cat.name, t.businessType);
    });

    if (hasStores) {
      activeCategoriesList.push(cat);
    }
  });

  // 4. Ordena por ordem configurada e por nome (sem qualquer limite de quantidade)
  activeCategoriesList.sort((a, b) => {
    if ((a.order ?? 99) !== (b.order ?? 99)) {
      return (a.order ?? 99) - (b.order ?? 99);
    }
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return activeCategoriesList;
}

export function normalizeCategory(businessType?: string, name?: string, tagline?: string): string {
  const combined = `${businessType || ""} ${name || ""} ${tagline || ""}`.toLowerCase();
  return slugifyCategory(combined.trim() || "lanchonetes");
}

export function doesCategoryMatch(
  storeCategory: EstablishmentCategory,
  targetCategoryIdOrName: string,
  rawTenantBusinessType?: string
): boolean {
  if (!targetCategoryIdOrName || targetCategoryIdOrName.toLowerCase() === "todos") {
    return true;
  }

  const targetNorm = normalizeSearchText(targetCategoryIdOrName);
  const targetSlug = slugifyCategory(targetCategoryIdOrName);

  const catIdNorm = normalizeSearchText(storeCategory.id);
  const catNameNorm = normalizeSearchText(storeCategory.name);
  const catSlug = slugifyCategory(storeCategory.name);
  const catIdSlug = slugifyCategory(storeCategory.id);
  const rawNorm = normalizeSearchText(rawTenantBusinessType);
  const rawSlug = slugifyCategory(rawTenantBusinessType || "");

  if (
    catIdNorm === targetNorm ||
    catNameNorm === targetNorm ||
    catSlug === targetSlug ||
    catIdSlug === targetSlug ||
    (rawNorm && (rawNorm === targetNorm || rawSlug === targetSlug))
  ) {
    return true;
  }

  // Correspondência parcial semântica (ex: "Padarias" -> "Padarias & Cafés", "Açaí" -> "Açaíterias", "Lanchonetes" -> "Hambúrgueres")
  if (targetNorm.length >= 3) {
    if (
      catNameNorm.includes(targetNorm) ||
      targetNorm.includes(catNameNorm) ||
      catSlug.includes(targetSlug) ||
      targetSlug.includes(catSlug) ||
      (rawNorm && (rawNorm.includes(targetNorm) || targetNorm.includes(rawNorm)))
    ) {
      return true;
    }
  }

  if (
    (targetNorm.includes("hamburg") || targetNorm.includes("lanche") || targetNorm.includes("burger")) &&
    (catNameNorm.includes("hamburg") || catNameNorm.includes("lanche") || rawNorm.includes("lanche") || rawNorm.includes("hamburg"))
  ) {
    return true;
  }

  return false;
}

/**
 * Associa com precisão um estabelecimento à sua respectiva Categoria real
 */
export function matchStoreCategory(
  tenant: Tenant,
  categories: EstablishmentCategory[] = DEFAULT_ESTABLISHMENT_CATEGORIES
): EstablishmentCategory {
  const rawType = (tenant.businessType || (tenant as any).category || "").trim();
  const bTypeLower = rawType.toLowerCase();
  const bTypeNorm = normalizeSearchText(rawType);
  const listToSearch = categories.length > 0 ? categories : DEFAULT_ESTABLISHMENT_CATEGORIES;

  // 1. Tentar bater exatamente pelo ID, pelo Nome ou por Slug nas categorias fornecidas
  if (rawType && listToSearch.length > 0) {
    const directMatch = listToSearch.find(
      (c) =>
        c.id !== "todos" &&
        (c.id.toLowerCase() === bTypeLower ||
          c.name.toLowerCase() === bTypeLower ||
          slugifyCategory(c.name) === slugifyCategory(rawType) ||
          slugifyCategory(c.id) === slugifyCategory(rawType))
    );
    if (directMatch) return directMatch;

    // 1b. Correspondência semântica (ex: "Lanchonetes" -> "Hambúrgueres", "Açaí" -> "Açaíterias", "Padarias" -> "Padarias & Cafés")
    const semanticMatch = listToSearch.find((c) => {
      if (c.id === "todos") return false;
      const cNorm = normalizeSearchText(c.name);
      if (
        (bTypeNorm.includes("lanche") || bTypeNorm.includes("hamburg") || bTypeNorm.includes("burger")) &&
        (cNorm.includes("hamburg") || cNorm.includes("lanche"))
      ) {
        return true;
      }
      return bTypeNorm.length >= 4 && (cNorm.includes(bTypeNorm) || bTypeNorm.includes(cNorm));
    });
    if (semanticMatch) return semanticMatch;
  }

  // 2. Se a categoria da loja existir, retorna ela com seu ícone dinâmico sem rebaixar para salgados/lanchonetes
  if (rawType) {
    return {
      id: slugifyCategory(rawType),
      name: rawType,
      icon: getCategoryIcon(rawType),
      order: 99,
    };
  }

  // 3. Fallback genérico se a loja não tiver categoria preenchida
  return { id: "hamburgueres", name: "Hambúrgueres", icon: "🍔", order: 2 };
}

/**
 * Normaliza textos para busca flexível, ignorando acentos, maiúsculas e pontuações
 */
export function normalizeSearchText(text?: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Filtra estabelecimentos por nome da loja, categoria ou tipo de culinária
 */
export function matchStoreSearch(
  tenant: Tenant,
  rawQuery: string,
  categories: EstablishmentCategory[] = DEFAULT_ESTABLISHMENT_CATEGORIES
): boolean {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;

  const matchedCat = matchStoreCategory(tenant, categories);
  const catName = normalizeSearchText(matchedCat?.name);
  const catId = normalizeSearchText(matchedCat?.id);

  const name = normalizeSearchText(tenant.name);
  const bType = normalizeSearchText(tenant.businessType);
  const tagline = normalizeSearchText(tenant.tagline);
  const announcement = normalizeSearchText(tenant.announcement);
  const address = normalizeSearchText(tenant.address);
  const localidade = normalizeSearchText(tenant.localidade);
  const slug = normalizeSearchText(tenant.slug);

  // Palavras-chave semânticas por tipo de culinária
  let cuisineKeywords = "";
  const combined = `${bType} ${name} ${tagline} ${catName} ${catId}`;

  if (combined.includes("burger") || combined.includes("lanche") || combined.includes("hamburg")) {
    cuisineKeywords += " hamburguer lanches artesanal burger smash batata frita combo americano x-tudo";
  }
  if (combined.includes("pizza")) {
    cuisineKeywords += " pizzaria pizzas calzone forno a lenha italiana massa brotinho fatia";
  }
  if (combined.includes("acai")) {
    cuisineKeywords += " acaiteria bowls tigela cupuacu sorvete frutas granola leite ninho smoothie vitamina";
  }
  if (combined.includes("japones") || combined.includes("sushi")) {
    cuisineKeywords += " japonesa oriental sushi sashimi temaki yakisoba hot roll niguiri uramaki salmao";
  }
  if (combined.includes("sorvet") || combined.includes("gelat")) {
    cuisineKeywords += " sorveteria gelato picole sundae milkshake sobremesas acai sobremesa cone taca";
  }
  if (combined.includes("churrasc") || combined.includes("carne")) {
    cuisineKeywords += " churrascaria churrasco carnes espetinho picanha costela grelhados brasa maminha almoço";
  }
  if (combined.includes("marmit") || combined.includes("caseir")) {
    cuisineKeywords += " marmitaria marmitex almoço comida caseira refeicao feijoada executivo prato feito comercial";
  }
  if (combined.includes("doce") || combined.includes("bolo") || combined.includes("confeit")) {
    cuisineKeywords += " doceria confeitaria doces bolos tortas brigadeiro sobremesas chocolate gourmet cafe";
  }
  if (combined.includes("salgado") || combined.includes("coxinha") || combined.includes("pastel")) {
    cuisineKeywords += " salgados pastel salgaderia coxinha kibe empada esfirra lanche fritos assados";
  }
  if (combined.includes("bebid") || combined.includes("cervej") || combined.includes("adega")) {
    cuisineKeywords += " bebidas distribuidora adega cerveja chopp refrigerante sucos agua vinho destilados gelo";
  }

  const searchPool = `${name} ${catName} ${catId} ${bType} ${tagline} ${announcement} ${address} ${localidade} ${slug} ${cuisineKeywords}`;

  // Suporte a múltiplos termos digitados pelo usuário (ex: "pizza artesanal" ou "burger batata")
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => searchPool.includes(token));
}
