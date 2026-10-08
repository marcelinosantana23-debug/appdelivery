import type {
  Tenant,
  FeaturedStoreRanked,
  TopSellingProduct,
  EstablishmentCategory,
  Product,
  Category,
  AddonGroup,
  PlatformSettings,
  StoreStory,
} from "@/types";
import type { StoreConfig } from "@/config/store";

export const CACHE_KEY_HOME_DATA = "cache_home_data";
export const CACHE_STORE_PREFIX = "cache_store_";

const CACHE_KEY_TENANTS = "topfood_cache_tenants_v3";
const CACHE_KEY_FEATURED = "topfood_cache_featured_v3";
const CACHE_KEY_TOP_PRODUCTS = "topfood_cache_top_products_v3";
const CACHE_KEY_CATEGORIES = "topfood_cache_categories_v3";
const CACHE_TIMESTAMP_KEY = "topfood_cache_updated_at_v3";

export interface CachedHomeData {
  tenants: Tenant[];
  featuredStoresRanked: FeaturedStoreRanked[];
  topSellingProducts: TopSellingProduct[];
  establishmentCategories: EstablishmentCategory[];
  localities: string[];
  platformSettings?: PlatformSettings;
  activeStoriesMap?: Record<string, StoreStory[]>;
  updatedAt: number;
}

export interface CachedStoreData {
  tenant: Tenant;
  config: StoreConfig;
  products: Product[];
  categories: Category[];
  addonGroups: AddonGroup[];
  updatedAt: number;
}

/**
 * Carrega o snapshot consolidado da Home (Portal Top Food) com a chave `cache_home_data`.
 * Faz fallback automático para as chaves granulares caso seja a primeira migração.
 */
export function loadCachedHomeData(): CachedHomeData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_HOME_DATA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          tenants: Array.isArray(parsed.tenants) ? parsed.tenants : [],
          featuredStoresRanked: Array.isArray(parsed.featuredStoresRanked) ? parsed.featuredStoresRanked : [],
          topSellingProducts: Array.isArray(parsed.topSellingProducts) ? parsed.topSellingProducts : [],
          establishmentCategories: Array.isArray(parsed.establishmentCategories) ? parsed.establishmentCategories : [],
          localities: Array.isArray(parsed.localities) ? parsed.localities : [],
          platformSettings: parsed.platformSettings || undefined,
          activeStoriesMap: parsed.activeStoriesMap && typeof parsed.activeStoriesMap === "object" ? parsed.activeStoriesMap : undefined,
          updatedAt: Number(parsed.updatedAt) || Date.now(),
        };
      }
    }
  } catch {
    // ignore corrupt cache
  }
  return null;
}

/**
 * Salva ou mescla dados da Home na chave `cache_home_data` no localStorage.
 */
export function saveCachedHomeData(partial: Partial<CachedHomeData>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadCachedHomeData();
    const merged: CachedHomeData = {
      tenants: partial.tenants ?? existing?.tenants ?? loadCachedTenants(),
      featuredStoresRanked:
        partial.featuredStoresRanked ?? existing?.featuredStoresRanked ?? loadCachedFeaturedStores(),
      topSellingProducts:
        partial.topSellingProducts ?? existing?.topSellingProducts ?? loadCachedTopSellingProducts(),
      establishmentCategories:
        partial.establishmentCategories ?? existing?.establishmentCategories ?? loadCachedCategories(),
      localities: partial.localities ?? existing?.localities ?? [],
      platformSettings: partial.platformSettings ?? existing?.platformSettings,
      activeStoriesMap: partial.activeStoriesMap ?? existing?.activeStoriesMap,
      updatedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_HOME_DATA, JSON.stringify(merged));
  } catch (err) {
    console.warn("[StoreCache] Erro ao salvar cache_home_data:", err);
  }
}

/**
 * Normaliza a chave dinâmica para cache de cada loja (`cache_store_[storeSlug]`).
 */
export function getStoreCacheKey(slugOrId: string): string {
  const clean = String(slugOrId || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^loja\//i, "");
  return `${CACHE_STORE_PREFIX}${clean}`;
}

/**
 * Carrega instantaneamente (0ms) os dados em cache de uma loja específica (`cache_store_[storeSlug]`).
 * REGRA ESTRITA DE VALIDAÇÃO DE CACHE:
 * - Se o cache local contiver uma lista de produtos vazia (`!Array.isArray(parsed.products) || parsed.products.length === 0`) ou inválida,
 *   o cache é considerado INVÁLIDO, é limpo do LocalStorage e a função retorna `null` para forçar a busca na API.
 */
export function loadCachedStoreData(slugOrId: string): CachedStoreData | null {
  if (typeof window === "undefined" || !slugOrId) return null;
  const clean = String(slugOrId)
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^loja\//i, "");
  if (!clean) return null;

  try {
    // 1. Busca direta por `cache_store_[storeSlug]`
    const directKey = getStoreCacheKey(clean);
    const directRaw = localStorage.getItem(directKey);
    if (directRaw) {
      const parsed = JSON.parse(directRaw);
      if (
        parsed &&
        parsed.tenant &&
        Array.isArray(parsed.products) &&
        parsed.products.length > 0
      ) {
        return {
          tenant: parsed.tenant,
          config: parsed.config,
          products: parsed.products,
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          addonGroups: Array.isArray(parsed.addonGroups) ? parsed.addonGroups : [],
          updatedAt: Number(parsed.updatedAt) || Date.now(),
        };
      } else {
        // Limpa imediatamente o cache inválido/vazio do LocalStorage
        localStorage.removeItem(directKey);
      }
    }

    // 2. Alias marcelino <-> ms-preparacoes
    if (clean === "ms-preparacoes" || clean === "marcelino") {
      const altSlug = clean === "ms-preparacoes" ? "marcelino" : "ms-preparacoes";
      const altKey = getStoreCacheKey(altSlug);
      const altRaw = localStorage.getItem(altKey);
      if (altRaw) {
        const parsed = JSON.parse(altRaw);
        if (
          parsed &&
          parsed.tenant &&
          Array.isArray(parsed.products) &&
          parsed.products.length > 0
        ) {
          return {
            tenant: parsed.tenant,
            config: parsed.config,
            products: parsed.products,
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            addonGroups: Array.isArray(parsed.addonGroups) ? parsed.addonGroups : [],
            updatedAt: Number(parsed.updatedAt) || Date.now(),
          };
        } else {
          localStorage.removeItem(altKey);
        }
      }
    }
  } catch {
    // Caso o JSON esteja corrompido, limpa a chave inválida
    try {
      localStorage.removeItem(getStoreCacheKey(clean));
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Salva os dados completos da loja em `cache_store_[storeSlug]` (e também pelo ID caso aplicável)
 * para garantir carregamento instantâneo (0ms) no próximo acesso ou abertura de APK/PWA direto na loja.
 *
 * REGRA ESTRITA DE VALIDAÇÃO:
 * - NUNCA salva no LocalStorage se `data.products` for vazio (`!Array.isArray(data.products) || data.products.length === 0`).
 * - Só salva os produtos no LocalStorage se `data.products.length > 0`.
 */
export function saveCachedStoreData(
  slugOrId: string,
  data: {
    tenant: Tenant;
    config: StoreConfig;
    products: Product[];
    categories?: Category[];
    addonGroups?: AddonGroup[];
  }
): void {
  if (typeof window === "undefined" || !slugOrId || !data.tenant) return;

  // Validação de cache vazio: NUNCA salvar no LocalStorage se products for vazio ou inválido
  if (!Array.isArray(data.products) || data.products.length === 0) {
    return;
  }

  try {
    const existing = loadCachedStoreData(slugOrId);
    const payload: CachedStoreData = {
      tenant: data.tenant,
      config: data.config,
      products: data.products,
      categories: data.categories ?? existing?.categories ?? [],
      addonGroups: data.addonGroups ?? existing?.addonGroups ?? [],
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);

    // Salva pela chave solicitada (slug da rota)
    localStorage.setItem(getStoreCacheKey(slugOrId), serialized);

    // Garante salvamento também pelo slug oficial do tenant e pelo ID
    if (data.tenant.slug && data.tenant.slug.toLowerCase() !== slugOrId.toLowerCase()) {
      localStorage.setItem(getStoreCacheKey(data.tenant.slug), serialized);
    }
    if (data.tenant.id && data.tenant.id.toLowerCase() !== slugOrId.toLowerCase()) {
      localStorage.setItem(getStoreCacheKey(data.tenant.id), serialized);
    }
  } catch (err) {
    console.warn(`[StoreCache] Erro ao salvar ${getStoreCacheKey(slugOrId)}:`, err);
  }
}

/**
 * Carrega a lista de lojas salva no cache do navegador (localStorage)
 * Retorna imediatamente para renderização instantânea (0ms de bloqueio)
 */
export function loadCachedTenants(): Tenant[] {
  if (typeof window === "undefined") return [];
  try {
    const home = loadCachedHomeData();
    if (home && Array.isArray(home.tenants) && home.tenants.length > 0) {
      return home.tenants;
    }
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
 * Salva a lista de lojas atualizada no cache local e sincroniza `cache_home_data`
 */
export function saveCachedTenants(tenants: Tenant[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY_TENANTS, JSON.stringify(tenants));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
    saveCachedHomeData({ tenants });
  } catch (err) {
    console.warn("[StoreCache] Quota de localStorage excedida ou indisponível:", err);
  }
}

/**
 * Remove uma loja específica de todos os caches do navegador
 */
export function removeCachedTenant(idOrSlug: string): void {
  if (typeof window === "undefined" || !idOrSlug) return;
  try {
    const list = loadCachedTenants();
    const filtered = list.filter((t) => t.id !== idOrSlug && t.slug !== idOrSlug);
    saveCachedTenants(filtered);

    const featured = loadCachedFeaturedStores();
    const filteredFeatured = featured.filter((s) => s.id !== idOrSlug && s.slug !== idOrSlug);
    saveCachedFeaturedStores(filteredFeatured);

    localStorage.removeItem(getStoreCacheKey(idOrSlug));
  } catch (err) {
    console.warn("[StoreCache] Erro ao remover loja do cache local:", err);
  }
}

/**
 * Carrega lojas em destaque salvas no cache
 */
export function loadCachedFeaturedStores(): FeaturedStoreRanked[] {
  if (typeof window === "undefined") return [];
  try {
    const home = loadCachedHomeData();
    if (home && Array.isArray(home.featuredStoresRanked) && home.featuredStoresRanked.length > 0) {
      return home.featuredStoresRanked;
    }
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
    saveCachedHomeData({ featuredStoresRanked: stores });
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
    const home = loadCachedHomeData();
    if (home && Array.isArray(home.topSellingProducts) && home.topSellingProducts.length > 0) {
      return home.topSellingProducts;
    }
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
    saveCachedHomeData({ topSellingProducts: products });
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
    const home = loadCachedHomeData();
    if (home && Array.isArray(home.establishmentCategories) && home.establishmentCategories.length > 0) {
      return home.establishmentCategories;
    }
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
    saveCachedHomeData({ establishmentCategories: categories });
  } catch {
    // ignore
  }
}

/**
 * Compara se a lista de produtos de uma loja sofreu alterações para evitar re-render desnecessário
 */
export function haveProductsChanged(prev: Product[], next: Product[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (
      p.id !== n.id ||
      p.name !== n.name ||
      p.price !== n.price ||
      p.description !== n.description ||
      p.image !== n.image ||
      p.category !== n.category ||
      p.available !== n.available ||
      p.popular !== n.popular ||
      JSON.stringify(p.options || []) !== JSON.stringify(n.options || []) ||
      JSON.stringify(p.addonGroupIds || []) !== JSON.stringify(n.addonGroupIds || [])
    ) {
      return true;
    }
  }
  return false;
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
