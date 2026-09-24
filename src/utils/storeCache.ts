import type { Tenant, FeaturedStoreRanked, TopSellingProduct, EstablishmentCategory } from "@/types";

const CACHE_KEY_TENANTS = "topfood_cache_tenants_v2";
const CACHE_KEY_FEATURED = "topfood_cache_featured_v2";
const CACHE_KEY_TOP_PRODUCTS = "topfood_cache_top_products_v2";
const CACHE_KEY_CATEGORIES = "topfood_cache_categories_v2";
const CACHE_TIMESTAMP_KEY = "topfood_cache_updated_at_v2";

/**
 * Carrega a lista de lojas salva no cache do navegador (localStorage)
 * Retorna imediatamente para renderização instantânea (0ms de bloqueio)
 */
export function loadCachedTenants(): Tenant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY_TENANTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // localStorage corrompido ou indisponível
  }
  return [];
}

/**
 * Salva a lista de lojas atualizada no cache local
 */
export function saveCachedTenants(tenants: Tenant[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_TENANTS, JSON.stringify(tenants));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {
    console.warn("[StoreCache] Quota de localStorage excedida ou indisponível:", err);
  }
}

/**
 * Carrega lojas em destaque salvas no cache
 */
export function loadCachedFeaturedStores(): FeaturedStoreRanked[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY_FEATURED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveCachedFeaturedStores(stores: FeaturedStoreRanked[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_FEATURED, JSON.stringify(stores));
  } catch {
    // ignore
  }
}

/**
 * Carrega produtos mais vendidos salvos no cache
 */
export function loadCachedTopSellingProducts(): TopSellingProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY_TOP_PRODUCTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveCachedTopSellingProducts(products: TopSellingProduct[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_TOP_PRODUCTS, JSON.stringify(products));
  } catch {
    // ignore
  }
}

export const loadCachedTopProducts = loadCachedTopSellingProducts;
export const saveCachedTopProducts = saveCachedTopSellingProducts;

/**
 * Carrega categorias do portal salvas no cache
 */
export function loadCachedCategories(): EstablishmentCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY_CATEGORIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveCachedCategories(categories: EstablishmentCategory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch {
    // ignore
  }
}

/**
 * Compara se a lista de lojas realmente sofreu alterações de dados, status ou ordem
 * Evita disparar re-renderizações desnecessárias durante o background fetch
 */
export function haveTenantsChanged(prev: Tenant[], next: Tenant[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (
      p.id !== n.id ||
      p.slug !== n.slug ||
      p.name !== n.name ||
      p.status !== n.status ||
      p.isFeatured !== n.isFeatured ||
      p.priorityOrder !== n.priorityOrder ||
      p.logo !== n.logo ||
      p.bannerImage !== n.bannerImage ||
      p.businessType !== n.businessType ||
      p.category !== n.category ||
      p.deliveryFee !== n.deliveryFee ||
      p.rating !== n.rating ||
      p.isOpen !== n.isOpen ||
      p.completedOrdersCount !== n.completedOrdersCount
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Compara alterações nas lojas em destaque ranqueadas
 */
export function haveStoresRankedChanged(
  prev: FeaturedStoreRanked[],
  next: FeaturedStoreRanked[]
): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (
      p.id !== n.id ||
      p.slug !== n.slug ||
      p.name !== n.name ||
      p.rank !== n.rank ||
      p.completedOrdersCount !== n.completedOrdersCount ||
      p.isFeatured !== n.isFeatured ||
      p.logo !== n.logo ||
      p.bannerImage !== n.bannerImage
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Pré-carrega de forma assíncrona as imagens de capa e logotipos das lojas
 * no cache de memória/HTTP do navegador em momentos de ociosidade (idle)
 */
export function preloadStoreImages(tenants: Tenant[]): void {
  if (typeof window === "undefined") return;

  const run = () => {
    const urls = new Set<string>();
    // Prioriza as 15 primeiras lojas visíveis
    for (const t of tenants.slice(0, 15)) {
      if (
        t.logo &&
        typeof t.logo === "string" &&
        !t.logo.startsWith("data:") &&
        (t.logo.startsWith("http://") || t.logo.startsWith("https://") || t.logo.startsWith("/"))
      ) {
        urls.add(t.logo);
      }
      if (
        t.bannerImage &&
        typeof t.bannerImage === "string" &&
        !t.bannerImage.startsWith("data:") &&
        (t.bannerImage.startsWith("http://") || t.bannerImage.startsWith("https://") || t.bannerImage.startsWith("/"))
      ) {
        urls.add(t.bannerImage);
      }
    }

    urls.forEach((url) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    });
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 1500 });
  } else {
    setTimeout(run, 150);
  }
}
