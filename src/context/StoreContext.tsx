import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { CartItem, Product, ProductOption, Category, EstablishmentCategory, Order, OrderStatus, Tenant, User, UserRole, TenantStatus, TenantCredential, PlatformSettings, TopSellingProduct, FeaturedStoreRanked, StoreStory, AddonGroup } from "@/types";
import { defaultStoreConfig, type StoreConfig } from "@/config/store";
import { categories as defaultMockCategories } from "@/data/mockData";
import {
  loadCachedHomeData,
  saveCachedHomeData,
  loadCachedStoreData,
  saveCachedStoreData,
  loadCachedTenants,
  saveCachedTenants,
  loadCachedFeaturedStores,
  saveCachedFeaturedStores,
  loadCachedTopProducts,
  saveCachedTopProducts,
  loadCachedCategories,
  saveCachedCategories,
  haveTenantsChanged,
  haveStoresRankedChanged,
  haveProductsChanged,
  preloadStoreImages,
  removeCachedTenant,
} from "@/utils/storeCache";
import {
  fetchTenantsApi,
  fetchTenantDetailsApi,
  fetchTenantProductsApi,
  fetchTenantOrdersApi,
  fetchOrdersApi,
  createTenantApi,
  updateTenantApi,
  updateTenantStatusApi,
  deleteTenantApi,
  createTenantProductApi,
  updateTenantProductApi,
  deleteTenantProductApi,
  reorderTenantProductsApi,
  fetchTenantCategoriesApi,
  createTenantCategoryApi,
  fetchTenantAddonGroupsApi,
  createTenantAddonGroupApi,
  updateTenantAddonGroupApi,
  deleteTenantAddonGroupApi,
  createTenantOrderApi,
  updateOrderStatusApi,
  loginApi,
  verifyAuthSessionApi,
  updateSuperAdminCredentialsApi,
  fetchTenantCredentialsApi,
  fetchAllTenantCredentialsApi,
  updateTenantCredentialsApi,
  fetchEstablishmentCategoriesApi,
  createEstablishmentCategoryApi,
  deleteEstablishmentCategoryApi,
  getPlatformSettingsApi,
  updatePlatformSettingsApi,
  updateTenantFeaturedApi,
  fetchFeaturedStoresRankedApi,
  fetchTopSellingProductsApi,
  fetchAllActiveStoriesApi,
  activateTenantSubscriptionApi,
  confirmTenantPaymentApi,
  updateTenantMonthlyFeeApi,
  fetchLocalitiesApi,
} from "@/services/api";
import { StoreStoriesModal } from "@/components/common/StoreStoriesModal";
import { getSafeDisplayName, getSafeSlug } from "@/utils/storeFormat";
import { playNewOrderChime } from "@/utils/audio";
import {
  broadcastNewOrder,
  broadcastOrderUpdate,
  subscribeOrderBroadcast,
} from "@/utils/ordersChannel";
import { updateActiveOrderStatus } from "@/utils/orderStorage";
import type { ToastMessage } from "@/components/common/Toast";

interface StoreContextValue {
  // Feedback & Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  dismissToast: (id: string) => void;

  // Multi-tenant state
  tenants: Tenant[];
  featuredStoresRanked: FeaturedStoreRanked[];
  topSellingProducts: TopSellingProduct[];
  refreshFeaturedStoresRanked: () => Promise<void>;
  refreshTopSellingProducts: () => Promise<void>;
  currentTenant: Tenant | null;
  config: StoreConfig;
  updateConfig: (partial: Partial<StoreConfig>) => Promise<void>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  isStoreOpen: boolean;
  toggleStore: () => void;
  isStoreActive: boolean;
  currentSlug: string;
  selectTenant: (slugOrId: string, preloadedTenant?: Tenant) => Promise<void>;
  refreshTenants: () => Promise<void>;
  refreshCurrentStore: () => Promise<void>;
  isLoadingStore: boolean;
  isLoadingTenants: boolean;
  isLoadingPortal: boolean;
  isRevalidatingTenants: boolean;
  storeNotFound: boolean;

  // Product, Category & Addons management (Tenant Admin)
  addProduct: (product: Omit<Product, "id" | "tenantId"> & { newCategoryName?: string }) => Promise<Product | null>;
  editProduct: (productId: string, partial: Partial<Product> & { newCategoryName?: string }) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  reorderProducts: (orderedIds: string[]) => Promise<boolean>;
  storeCategories: Category[];
  createCategory: (name: string, icon?: string) => Promise<Category | null>;
  refreshCategories: () => Promise<void>;
  addonGroups: AddonGroup[];
  refreshAddonGroups: () => Promise<void>;
  createAddonGroup: (group: Omit<AddonGroup, "id" | "tenantId">) => Promise<AddonGroup | null>;
  updateAddonGroup: (groupId: string, partial: Partial<AddonGroup>) => Promise<AddonGroup | null>;
  deleteAddonGroup: (groupId: string) => Promise<boolean>;

  // Customer Shopping cart
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, selectedOptions: ProductOption[], notes: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;

  // Orders & Real-time
  orders: Order[];
  refreshOrders: () => Promise<Order[] | null>;
  refreshStoreAdminData: () => Promise<void>;
  addOrder: (order: Order) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  newOrderIds: string[];
  clearNewOrderFlag: (orderId: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  playAlertSound: () => void;

  // Auth & Roles
  currentUser: User | null;
  userRole: UserRole | null;
  isAdminAuthed: boolean;
  isSuperAdmin: boolean;
  login: (
    email: string,
    password: string,
    portal?: "store" | "superadmin"
  ) => Promise<{ success: boolean; error?: string; role?: UserRole; isSuperAdminAttempt?: boolean }>;
  logout: () => void;
  updateSuperAdminCredentials: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;

  // Localidades / Regiões
  localities: string[];
  selectedLocality: string;
  setSelectedLocality: (loc: string) => void;
  refreshLocalities: () => Promise<string[]>;

  // Super Admin actions & Establishment Categories
  establishmentCategories: EstablishmentCategory[];
  createEstablishmentCategory: (
    name: string,
    icon?: string,
    order?: number
  ) => Promise<{ success: boolean; category?: EstablishmentCategory; error?: string; message?: string }>;
  deleteEstablishmentCategory: (
    id: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshEstablishmentCategories: () => Promise<void>;
  createNewTenant: (data: {
    name: string;
    slug?: string;
    email: string;
    password: string;
    whatsapp?: string;
    pixKey?: string;
    deliveryFee?: number;
    address?: string;
    primaryColor?: string;
    bannerImage?: string;
    businessType?: string;
    isFeatured?: boolean;
    priorityOrder?: number;
    localidade?: string;
  }) => Promise<{ success: boolean; tenant?: Tenant; user?: User; error?: string }>;
  updateTenant: (
    slugOrId: string,
    data: Partial<Tenant> & { adminEmail?: string; adminPassword?: string }
  ) => Promise<{ success: boolean; tenant?: Tenant; error?: string; message?: string }>;
  toggleTenantStatus: (slugOrId: string, status: TenantStatus) => Promise<boolean>;
  activateSubscription: (
    slugOrId: string,
    billingDay?: number
  ) => Promise<{ success: boolean; tenant?: Tenant; billingDay?: number; message?: string; error?: string }>;
  updateMonthlyFee: (
    slugOrId: string,
    monthlyFee: number
  ) => Promise<{ success: boolean; tenant?: Tenant; monthlyFee?: number; message?: string; error?: string }>;
  confirmMonthlyPayment: (
    slugOrId: string
  ) => Promise<{ success: boolean; tenant?: Tenant; billingDay?: number; paymentAt?: number; message?: string; error?: string }>;
  cancelSubscription: (
    slugOrId: string
  ) => Promise<{ success: boolean; tenant?: Tenant; message?: string; error?: string }>;
  deleteTenant: (slugOrId: string) => Promise<boolean>;
  updateTenantCredentials: (
    slugOrId: string,
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; error?: string; message?: string; credentials?: TenantCredential }>;
  getTenantCredentials: (
    slugOrId: string
  ) => Promise<{ success: boolean; error?: string; credentials?: TenantCredential }>;
  getAllTenantCredentials: () => Promise<{ success: boolean; credentials?: TenantCredential[]; error?: string }>;

  // Platform settings (Vitrine & Marketing)
  platformSettings: PlatformSettings;
  refreshPlatformSettings: () => Promise<void>;
  updatePlatformSettings: (
    partial: Partial<PlatformSettings>
  ) => Promise<{ success: boolean; message?: string; error?: string; settings?: PlatformSettings }>;
  toggleTenantFeatured: (
    slugOrId: string,
    isFeatured?: boolean,
    priorityOrder?: number
  ) => Promise<{ success: boolean; error?: string }>;

  // Store Stories (APENAS FOTOS - EXPIRAÇÃO 24H - MÁX 3)
  activeStoriesMap: Record<string, StoreStory[]>;
  refreshActiveStories: () => Promise<void>;
  getStoreActiveStories: (tenantIdOrSlug: string) => StoreStory[];
  openStoreStoriesModal: (tenant: Partial<Tenant>, stories?: StoreStory[]) => void;
  closeStoreStoriesModal: () => void;
  storiesModal: {
    isOpen: boolean;
    tenant: Partial<Tenant> | null;
    stories: StoreStory[];
  };

  // Favorite Stores (persisted in localStorage)
  favoriteStoreIds: string[];
  toggleFavoriteStore: (tenantOrKey: Partial<Tenant> | string) => void;
  isFavoriteStore: (tenantOrKey: Partial<Tenant> | string) => boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function applyThemeColors(config: StoreConfig) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-primary", config.primaryColor || "#E63946");
  document.documentElement.style.setProperty("--color-primary-dark", config.primaryDark || "#C1121F");
  document.documentElement.style.setProperty("--color-primary-light", config.primaryLight || "#F77F00");
  document.documentElement.style.setProperty("--color-accent", config.accentColor || "#FCBF49");
  document.documentElement.style.setProperty("--color-secondary", config.secondaryColor || "#1E293B");

  if (config.themeMode === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function tenantToStoreConfig(t: Tenant): StoreConfig {
  return {
    id: t.id,
    slug: getSafeSlug(t.slug, "loja"),
    name: getSafeDisplayName(t.name, "Burger Town"),
    tagline: t.tagline && !t.tagline.startsWith("data:") ? t.tagline : "",
    announcement: t.announcement && !t.announcement.startsWith("data:") ? t.announcement : "",
    logo: t.logo || "🏪",
    bannerImage: t.bannerImage || "",
    whatsapp: t.whatsapp,
    pixKey: t.pixKey,
    pixKeyType: t.pixKeyType || "email",
    deliveryFee: t.deliveryFee,
    deliveryTime: t.deliveryTime || "30-45 min",
    currency: "R$",
    address: t.address,
    hours: t.hours,
    primaryColor: t.primaryColor || "#E63946",
    secondaryColor: t.secondaryColor || "#1E293B",
    primaryDark: t.primaryDark || "#C1121F",
    primaryLight: t.primaryLight || "#F77F00",
    accentColor: t.accentColor || "#FCBF49",
    themeMode: t.themeMode || "light",
    menuLayout: t.menuLayout || "list",
    showFeaturedCarousel: t.showFeaturedCarousel !== false,
    status: t.status,
    isOpen: t.isOpen,
    businessType: t.businessType || t.category || t.categoryId || (t as any).category_id || "Hambúrgueres",
    category: t.category || t.businessType || t.categoryId || (t as any).category_id || "Hambúrgueres",
    categoryId: t.categoryId || (t as any).category_id || t.businessType || t.category || "Hambúrgueres",
    localidade: t.localidade || "Gargaú",
    motoboyPhone: t.motoboyPhone || (t as any).motoboy_phone || "",
    motoboyName: t.motoboyName || (t as any).motoboy_name || "",
  };
}

const RESERVED_SLUGS = new Set([
  "admin",
  "painel",
  "superadmin",
  "super-admin",
  "portal",
  "topfood",
  "carrinho",
  "cart",
  "checkout",
  "rastreio",
  "acompanhamento",
  "tracking",
  "api",
  "health",
  "manifest",
  "sw",
  "assets",
  "favicon",
  "favicon.ico",
  "icon-192.png",
  "icon-512.png",
]);

const CART_STORAGE_PREFIX = "topfood_cart_";
const CART_GENERIC_KEY = "topfood_cart_items";

/**
 * Carrega itens do carrinho salvos no localStorage/sessionStorage.
 * Prioriza o carrinho específico da loja atual; caso não haja, tenta o carrinho geral.
 */
function loadSavedCart(storeSlug?: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    // 1. Tenta carregar carrinho específico desta lanchonete
    if (storeSlug) {
      const savedStore =
        localStorage.getItem(`${CART_STORAGE_PREFIX}${storeSlug}`) ||
        sessionStorage.getItem(`${CART_STORAGE_PREFIX}${storeSlug}`);
      if (savedStore) {
        const parsed = JSON.parse(savedStore);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    // 2. Tenta carregar do storage genérico
    const savedGeneric =
      localStorage.getItem(CART_GENERIC_KEY) ||
      sessionStorage.getItem(CART_GENERIC_KEY);
    if (savedGeneric) {
      const parsed = JSON.parse(savedGeneric);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Erro ao restaurar carrinho do storage:", err);
  }
  return [];
}

function getInitialUrlSlug(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;

  // 1. /loja/:slug (incluindo sub-rotas como /loja/:slug/carrinho, /loja/:slug/checkout, /loja/:slug/rastreio)
  const match = path.match(/^\/loja\/([^/?#]+)/i);
  if (match && match[1]) {
    const rawSlug = decodeURIComponent(match[1]).toLowerCase();
    if (!RESERVED_SLUGS.has(rawSlug)) {
      return rawSlug;
    }
  }

  // 2. Hash routing fallback #/loja/:slug
  if (window.location.hash) {
    const hashMatch = window.location.hash.match(/#\/?loja\/([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) {
      const rawSlug = decodeURIComponent(hashMatch[1]).toLowerCase();
      if (!RESERVED_SLUGS.has(rawSlug)) return rawSlug;
    }
  }

  // 3. Query string (?loja=slug ou ?tenant=slug ou ?store=slug)
  const params = new URLSearchParams(window.location.search);
  const qSlug = params.get("loja") || params.get("tenant") || params.get("store");
  if (qSlug) {
    const rawSlug = decodeURIComponent(qSlug).toLowerCase();
    if (!RESERVED_SLUGS.has(rawSlug)) return rawSlug;
  }

  // 4. Se o lojista estiver logado ou recarregando (F5) no painel /admin ou /painel, recupera a loja da sessão
  if (path.startsWith("/admin") || path.startsWith("/painel")) {
    try {
      const savedTenant =
        sessionStorage.getItem("topfood_tenant_session") ||
        localStorage.getItem("delivery_tenant_session");
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (parsed?.slug && !RESERVED_SLUGS.has(parsed.slug)) return parsed.slug;
      }
      const savedUser =
        sessionStorage.getItem("topfood_admin_session") ||
        localStorage.getItem("delivery_user_session");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user?.tenantId === "tenant-ms-preparacoes" || user?.email?.includes("marcelino")) {
          return "ms-preparacoes";
        }
      }
      const last = localStorage.getItem("topfood_last_store_slug");
      if (last && !RESERVED_SLUGS.has(last)) return last;
    } catch {
      // ignore
    }
    return "";
  }

  // 5. Rota principal do Portal Top Food (/ ou /topfood ou /portal)
  const clean = path.replace(/\/+$/, "").toLowerCase();
  if (clean === "" || clean === "/" || clean === "/topfood" || clean === "/portal") {
    return "";
  }

  // 6. Sub-rotas do cliente sem prefixo /loja/ (/carrinho, /checkout, /rastreio)
  if (
    clean === "carrinho" ||
    clean === "cart" ||
    clean === "checkout" ||
    clean === "rastreio" ||
    clean === "acompanhamento" ||
    clean === "tracking"
  ) {
    try {
      const last = localStorage.getItem("topfood_last_store_slug");
      if (last && !RESERVED_SLUGS.has(last)) return last;
      const savedTenant =
        sessionStorage.getItem("topfood_tenant_session") ||
        localStorage.getItem("delivery_tenant_session");
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (parsed?.slug && !RESERVED_SLUGS.has(parsed.slug)) return parsed.slug;
      }
    } catch {
      // ignore
    }
    return "ms-preparacoes";
  }

  // 7. Direct single-segment path /:slug (quando não for rota reservada)
  if (
    path &&
    path !== "/" &&
    !path.startsWith("/api") &&
    !path.startsWith("/health")
  ) {
    const direct = path.replace(/^\/+|\/+$/g, "");
    if (direct && !direct.includes("/") && !RESERVED_SLUGS.has(direct.toLowerCase())) {
      return decodeURIComponent(direct).toLowerCase();
    }
  }

  return "";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initialHomeCache = loadCachedHomeData();
  const [tenants, setTenants] = useState<Tenant[]>(() => initialHomeCache?.tenants?.length ? initialHomeCache.tenants : loadCachedTenants());
  const initialSlug = getInitialUrlSlug();
  const initialStoreCache = initialSlug ? loadCachedStoreData(initialSlug) : null;
  
  // Hydrate currentTenant synchronously from `cache_store_[storeSlug]` or sessionStorage / localStorage
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    if (initialStoreCache?.tenant) {
      return initialStoreCache.tenant;
    }
    try {
      const saved =
        sessionStorage.getItem("topfood_tenant_session") ||
        localStorage.getItem("delivery_tenant_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          (parsed.slug === initialSlug ||
            parsed.id === initialSlug ||
            !initialSlug ||
            (initialSlug === "ms-preparacoes" && parsed.slug === "marcelino") ||
            (initialSlug === "marcelino" && parsed.slug === "ms-preparacoes"))
        ) {
          return parsed;
        }
      }
      if (initialSlug) {
        const fromList = (initialHomeCache?.tenants || loadCachedTenants()).find(
          (t) =>
            t.slug?.toLowerCase() === initialSlug.toLowerCase() ||
            t.id?.toLowerCase() === initialSlug.toLowerCase()
        );
        if (fromList) return fromList;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Hydrate store configuration synchronously from `cache_store_[storeSlug]` (0ms load)
  const [config, setConfig] = useState<StoreConfig>(() => {
    if (initialStoreCache?.config) {
      return initialStoreCache.config;
    }
    if (initialStoreCache?.tenant) {
      return tenantToStoreConfig(initialStoreCache.tenant);
    }
    try {
      const savedTenant =
        sessionStorage.getItem("topfood_tenant_session") ||
        localStorage.getItem("delivery_tenant_session");
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed.slug === initialSlug ||
            parsed.id === initialSlug ||
            !initialSlug ||
            (initialSlug === "ms-preparacoes" && parsed.slug === "marcelino") ||
            (initialSlug === "marcelino" && parsed.slug === "ms-preparacoes"))
        ) {
          return tenantToStoreConfig(parsed);
        }
      }
      if (initialSlug) {
        const fromList = (initialHomeCache?.tenants || loadCachedTenants()).find(
          (t) =>
            t.slug?.toLowerCase() === initialSlug.toLowerCase() ||
            t.id?.toLowerCase() === initialSlug.toLowerCase()
        );
        if (fromList) return tenantToStoreConfig(fromList);
      }
    } catch {
      // ignore
    }
    return defaultStoreConfig;
  });

  // Hydrate products, categories and addonGroups synchronously from `cache_store_[storeSlug]`
  const [products, setProducts] = useState<Product[]>(() => initialStoreCache?.products || []);
  const [storeCategories, setStoreCategories] = useState<Category[]>(
    () => (initialStoreCache?.categories && initialStoreCache.categories.length > 0 ? initialStoreCache.categories : defaultMockCategories)
  );
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>(() => initialStoreCache?.addonGroups || []);
  const [orders, setOrders] = useState<Order[]>([]);
  // Inicializa o carrinho com os itens salvos para esta loja/sessão
  const [cart, setCart] = useState<CartItem[]>(() => loadSavedCart(initialSlug));
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("delivery_sound_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("delivery_sound_enabled", String(next));
      } catch {
        // Ignore localStorage error
      }
      return next;
    });
  }, []);

  const playAlertSound = useCallback(() => {
    // Verificação estrita: o som SÓ SEJA REPRODUZIDO se a rota atual for o Painel do Lojista
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      if (!path.includes("/admin") && !path.includes("/painel")) {
        return;
      }
    }
    playNewOrderChime();
  }, []);

  // Admin authentication is strictly isolated in sessionStorage (never persistent across public visits)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      // Clean up any legacy localStorage keys to eliminate unauthorized access
      localStorage.removeItem("delivery_user_session");
      localStorage.removeItem("delivery_tenant_session");
      localStorage.removeItem("delivery_auth_token");

      const saved = sessionStorage.getItem("topfood_admin_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Verify stored session token with the backend on boot
  useEffect(() => {
    const verifySession = async () => {
      try {
        const token = sessionStorage.getItem("topfood_auth_token");
        const saved = sessionStorage.getItem("topfood_admin_session");
        if (token && saved) {
          const user = JSON.parse(saved);
          const res = await verifyAuthSessionApi(token, user.id);
          if (!res.success) {
            sessionStorage.removeItem("topfood_admin_session");
            sessionStorage.removeItem("topfood_auth_token");
            sessionStorage.removeItem("topfood_tenant_session");
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn("Error verifying session with backend:", err);
      }
    };
    verifySession();
  }, []);

  const [currentSlug, setCurrentSlug] = useState<string>(initialSlug);
  // Se já existe cache local VÁLIDO (com products.length > 0) para a loja, isLoadingStore inicia como false (0ms).
  // Caso o cache local esteja vazio ou não exista, isLoadingStore inicia como true até a busca real da API concluir.
  const [isLoadingStore, setIsLoadingStore] = useState<boolean>(() => {
    if (!initialSlug) return false;
    return !(initialStoreCache && Array.isArray(initialStoreCache.products) && initialStoreCache.products.length > 0);
  });
  const [storeNotFound, setStoreNotFound] = useState<boolean>(false);

  // Sistema de notificações toast para feedback imediato e erros de rede
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning" = "info", duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type, duration }]);
    },
    []
  );

  // Apply theme whenever config changes
  useEffect(() => {
    applyThemeColors(config);
  }, [config]);

  // Load tenants list and ranked carousels with Stale-While-Revalidate local cache (`cache_home_data`)
  const [featuredStoresRanked, setFeaturedStoresRanked] = useState<FeaturedStoreRanked[]>(
    () => (initialHomeCache?.featuredStoresRanked?.length ? initialHomeCache.featuredStoresRanked : loadCachedFeaturedStores())
  );
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>(
    () => (initialHomeCache?.topSellingProducts?.length ? initialHomeCache.topSellingProducts : loadCachedTopProducts())
  );
  const [isLoadingTenants, setIsLoadingTenants] = useState<boolean>(
    () => (initialHomeCache?.tenants?.length || loadCachedTenants().length) === 0
  );
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(
    () => (initialHomeCache?.establishmentCategories?.length || loadCachedCategories().length) === 0
  );
  const [isRevalidatingTenants, setIsRevalidatingTenants] = useState<boolean>(false);
  const isLoadingPortal = isLoadingTenants || isLoadingCategories;

  // Localidades dinâmicas registradas no Cloudflare D1
  const [localities, setLocalities] = useState<string[]>(() => {
    if (initialHomeCache?.localities && initialHomeCache.localities.length > 0) {
      return initialHomeCache.localities;
    }
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("topfood_cached_localities");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return ["Gargaú", "Barra do Itabapoana", "São Francisco (Centro)"];
  });

  const [selectedLocality, setSelectedLocalityState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("topfood_selected_locality");
        if (saved && saved.trim()) return saved.trim();
      } catch {
        // ignore
      }
    }
    return "Todas as Localidades";
  });

  const refreshFeaturedStoresRanked = useCallback(
    async (locationOverride?: string) => {
      try {
        const loc = locationOverride !== undefined ? locationOverride : selectedLocality;
        const res = await fetchFeaturedStoresRankedApi(loc);
        if (res.success && res.stores) {
          setFeaturedStoresRanked((prev) => {
            if (haveStoresRankedChanged(prev, res.stores)) {
              saveCachedFeaturedStores(res.stores);
              return res.stores;
            }
            return prev;
          });
          saveCachedFeaturedStores(res.stores);
        }
      } catch {
        // ignore
      }
    },
    [selectedLocality]
  );

  const refreshTopSellingProducts = useCallback(
    async (locationOverride?: string) => {
      try {
        const loc = locationOverride !== undefined ? locationOverride : selectedLocality;
        const res = await fetchTopSellingProductsApi(10, 30, loc);
        if (res.success && res.products) {
          setTopSellingProducts((prev) => {
            const changed =
              prev.length !== res.products.length ||
              prev.some((p, i) => p.id !== res.products[i]?.id);
            if (changed) {
              saveCachedTopProducts(res.products);
              return res.products;
            }
            return prev;
          });
          saveCachedTopProducts(res.products);
        }
      } catch {
        // ignore
      }
    },
    [selectedLocality]
  );

  const refreshTenants = useCallback(
    async (locationOverride?: string) => {
      const loc = locationOverride !== undefined ? locationOverride : selectedLocality;
      const isAllLoc =
        !loc ||
        loc.trim() === "" ||
        loc.trim().toLowerCase() === "todas as localidades" ||
        loc.trim().toLowerCase() === "todas" ||
        loc.trim().toLowerCase() === "todos";

      setTenants((curr) => {
        if (curr.length === 0) {
          setIsLoadingTenants(true);
        }
        return curr;
      });
      setIsRevalidatingTenants(true);

      try {
        const [tRes, fRes, pRes] = await Promise.all([
          fetchTenantsApi(),
          fetchFeaturedStoresRankedApi(loc),
          fetchTopSellingProductsApi(10, 30, loc),
        ]);

        if (tRes.success && tRes.tenants) {
          const nextTenants = tRes.tenants;
          setTenants((prev) => {
            if (haveTenantsChanged(prev, nextTenants)) {
              saveCachedTenants(nextTenants);
              preloadStoreImages(nextTenants);
              return nextTenants;
            }
            return prev;
          });
          saveCachedTenants(nextTenants);
          preloadStoreImages(nextTenants);
        }

        if (fRes.success && fRes.stores) {
          setFeaturedStoresRanked((prev) => {
            if (haveStoresRankedChanged(prev, fRes.stores)) {
              if (isAllLoc) saveCachedFeaturedStores(fRes.stores);
              return fRes.stores;
            }
            return prev;
          });
          if (isAllLoc) saveCachedFeaturedStores(fRes.stores);
        }

        if (pRes.success && pRes.products) {
          setTopSellingProducts((prev) => {
            const changed =
              prev.length !== pRes.products.length ||
              prev.some((p, i) => p.id !== pRes.products[i]?.id);
            if (changed) {
              if (isAllLoc) saveCachedTopProducts(pRes.products);
              return pRes.products;
            }
            return prev;
          });
          if (isAllLoc) saveCachedTopProducts(pRes.products);
        }
      } catch (err) {
        console.warn("[StoreContext] Background revalidation failed, keeping local cache:", err);
      } finally {
        setIsLoadingTenants(false);
        setIsRevalidatingTenants(false);
      }
    },
    [selectedLocality]
  );

  // Categorias de estabelecimentos (Top Food Portal e Super Admin) com cache local imediato
  const [establishmentCategories, setEstablishmentCategories] = useState<EstablishmentCategory[]>(loadCachedCategories);

  const refreshEstablishmentCategories = useCallback(
    async (locationOverride?: string) => {
      const loc = locationOverride !== undefined ? locationOverride : selectedLocality;
      setEstablishmentCategories((curr) => {
        if (curr.length === 0) {
          setIsLoadingCategories(true);
        }
        return curr;
      });

      try {
        const res = await fetchEstablishmentCategoriesApi(loc);
        if (res.success && res.categories) {
          const nextCats = res.categories;
          setEstablishmentCategories((prev) => {
            const changed =
              prev.length !== nextCats.length ||
              prev.some(
                (c, i) =>
                  c.id !== nextCats[i]?.id ||
                  c.name !== nextCats[i]?.name ||
                  c.order !== nextCats[i]?.order
              );
            if (changed) {
              saveCachedCategories(nextCats);
              return nextCats;
            }
            return prev;
          });
          saveCachedCategories(nextCats);
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingCategories(false);
      }
    },
    [selectedLocality]
  );

  const createEstablishmentCategory = useCallback(
    async (name: string, icon?: string, order?: number) => {
      const res = await createEstablishmentCategoryApi({ name, icon, order });
      if (res.success && res.category) {
        await refreshEstablishmentCategories();
      }
      return res;
    },
    [refreshEstablishmentCategories]
  );

  const deleteEstablishmentCategory = useCallback(
    async (id: string) => {
      const res = await deleteEstablishmentCategoryApi(id);
      if (res.success) {
        await refreshEstablishmentCategories();
      }
      return res;
    },
    [refreshEstablishmentCategories]
  );

  const setSelectedLocality = useCallback(
    (loc: string) => {
      const trimmed = loc.trim() || "Todas as Localidades";
      setSelectedLocalityState(trimmed);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("topfood_selected_locality", trimmed);
        } catch {
          // ignore
        }
      }
      // Dispara re-fetch automático de todos os blocos da vitrine com a nova localidade
      Promise.all([
        refreshTenants(trimmed),
        refreshFeaturedStoresRanked(trimmed),
        refreshTopSellingProducts(trimmed),
        refreshEstablishmentCategories(trimmed),
      ]).catch(() => {});
    },
    [
      refreshTenants,
      refreshFeaturedStoresRanked,
      refreshTopSellingProducts,
      refreshEstablishmentCategories,
    ]
  );

  const refreshLocalities = useCallback(async (): Promise<string[]> => {
    try {
      const res = await fetchLocalitiesApi();
      if (res.success && Array.isArray(res.localities) && res.localities.length > 0) {
        setLocalities(res.localities);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("topfood_cached_localities", JSON.stringify(res.localities));
            saveCachedHomeData({ localities: res.localities });
          } catch {
            // ignore
          }
        }
        setSelectedLocalityState((current) => {
          const isAllLoc = (loc?: string | null) => {
            if (!loc) return false;
            const norm = loc.trim().toLowerCase();
            return (
              norm === "todas" ||
              norm === "todas as localidades" ||
              norm === "todas as regiões" ||
              norm === "todos"
            );
          };
          if (isAllLoc(current) || (current && res.localities.includes(current))) {
            return current;
          }
          const stored = typeof window !== "undefined" ? localStorage.getItem("topfood_selected_locality") : null;
          if (isAllLoc(stored)) {
            return "Todas as Localidades";
          }
          if (stored && res.localities.includes(stored)) {
            return stored;
          }
          const fallback = "Todas as Localidades";
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("topfood_selected_locality", fallback);
            } catch {
              // ignore
            }
          }
          return fallback;
        });
        return res.localities;
      }
    } catch (e) {
      console.warn("Erro ao buscar localidades:", e);
    }
    return [];
  }, []);

  // Platform Settings (Vitrine e Marketing) com hidratação imediata do cache_home_data
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => ({
    logoUrl: initialHomeCache?.platformSettings?.logoUrl || "",
    bannerUrl:
      initialHomeCache?.platformSettings?.bannerUrl ||
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80",
    heroTitle: initialHomeCache?.platformSettings?.heroTitle || "Top Food - O Portal do Delivery",
    heroSubtitle:
      initialHomeCache?.platformSettings?.heroSubtitle ||
      "O seu portal de delivery para as melhores lanchonetes, pizzarias, açaíterias e restaurantes.",
    primaryColor: initialHomeCache?.platformSettings?.primaryColor || "#E63946",
    partnerWhatsapp: initialHomeCache?.platformSettings?.partnerWhatsapp || "5511999999999",
    geminiApiKey: typeof window !== "undefined" ? localStorage.getItem("topfood_gemini_api_key") || "" : "",
  }));

  const refreshPlatformSettings = useCallback(async () => {
    try {
      const res = await getPlatformSettingsApi();
      if (res.success && res.settings) {
        setPlatformSettings((prev) => {
          const next = {
            ...prev,
            ...res.settings,
          };
          saveCachedHomeData({ platformSettings: next });
          return next;
        });
        if (typeof window !== "undefined" && res.settings.geminiApiKey) {
          try {
            localStorage.setItem("topfood_gemini_api_key", res.settings.geminiApiKey);
          } catch (err) {
            console.debug("Storage sync error:", err);
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar configurações da plataforma:", e);
    }
  }, []);

  const updatePlatformSettings = useCallback(
    async (partial: Partial<PlatformSettings>) => {
      try {
        if (partial.geminiApiKey !== undefined && typeof window !== "undefined") {
          try {
            if (partial.geminiApiKey.trim()) {
              localStorage.setItem("topfood_gemini_api_key", partial.geminiApiKey.trim());
            } else {
              localStorage.removeItem("topfood_gemini_api_key");
            }
          } catch (err) {
            console.debug("Storage update error:", err);
          }
        }
        const extraAuth = currentUser
          ? { userId: currentUser.id, email: currentUser.email, userRole: currentUser.role }
          : undefined;
        const res = await updatePlatformSettingsApi(partial, extraAuth);
        if (res.success && res.settings) {
          setPlatformSettings((prev) => {
            const next = {
              ...prev,
              ...res.settings,
            };
            saveCachedHomeData({ platformSettings: next });
            return next;
          });
          return { success: true, message: res.message || "Configurações salvas com sucesso!", settings: res.settings };
        }
        return { success: false, error: res.error || "Erro ao salvar configurações da vitrine." };
      } catch (err: any) {
        return { success: false, error: err.message || "Erro inesperado ao salvar configurações." };
      }
    },
    [currentUser]
  );

  const toggleTenantFeatured = useCallback(
    async (slugOrId: string, isFeatured?: boolean, priorityOrder?: number) => {
      try {
        const target = tenants.find((t) => t.id === slugOrId || t.slug === slugOrId);
        const nextFeatured = isFeatured !== undefined ? isFeatured : !(target?.isFeatured);
        const nextPriority = priorityOrder !== undefined ? priorityOrder : (target?.priorityOrder || 0);

        const res = await updateTenantFeaturedApi(slugOrId, nextFeatured, nextPriority);
        if (res.success && res.tenant) {
          await refreshTenants();
          return { success: true };
        }
        return { success: false, error: res.error || "Erro ao atualizar destaque da loja." };
      } catch (err: any) {
        return { success: false, error: err.message || "Erro inesperado ao alterar destaque." };
      }
    },
    [tenants, refreshTenants]
  );

  // Load current store data with Stale-While-Revalidate (`cache_store_[storeSlug]`) and strict tenant isolation
  const loadStoreBySlug = useCallback(
    async (slug: string) => {
      if (!slug || slug.trim() === "") {
        setIsLoadingStore(false);
        setStoreNotFound(false);
        return;
      }

      const normalizedSlug = slug.trim().toLowerCase();
      setStoreNotFound(false);
      // Restaura itens salvos no carrinho para este estabelecimento sem esvaziá-lo na recarga
      setCart(loadSavedCart(normalizedSlug));

      // 1. STALE (0ms): Verifica se existe cache local VÁLIDO (`cache_store_[storeSlug]` com `products.length > 0`).
      // Se o cache local tiver lista vazia ou inválida, `loadCachedStoreData` limpa a chave e retorna `null`.
      const cachedStore = loadCachedStoreData(normalizedSlug);
      const hasValidProductCache = Boolean(
        cachedStore?.tenant &&
          Array.isArray(cachedStore.products) &&
          cachedStore.products.length > 0
      );

      const fallbackTenantFromList = !hasValidProductCache
        ? loadCachedTenants().find(
            (t) =>
              t.slug?.toLowerCase() === normalizedSlug ||
              t.id?.toLowerCase() === normalizedSlug
          )
        : null;

      if (hasValidProductCache && cachedStore) {
        // Hidrata imediatamente (0ms) todos os dados da loja em cache pois possui produtos válidos
        setCurrentTenant(cachedStore.tenant);
        const cachedCfg = cachedStore.config || tenantToStoreConfig(cachedStore.tenant);
        setConfig(cachedCfg);
        applyThemeColors(cachedCfg);
        setProducts(cachedStore.products);
        if (cachedStore.categories && cachedStore.categories.length > 0) {
          setStoreCategories(cachedStore.categories);
        }
        if (Array.isArray(cachedStore.addonGroups)) {
          setAddonGroups(cachedStore.addonGroups);
        }
        setIsLoadingStore(false);
      } else if (fallbackTenantFromList) {
        // Temos metadados básicos da loja na lista do portal, mas sem cache de produtos válido:
        // Aplica tema/cabeçalho e mantém `isLoadingStore = true` enquanto busca obrigatoriamente os produtos da API
        setCurrentTenant(fallbackTenantFromList);
        const storeCfg = tenantToStoreConfig(fallbackTenantFromList);
        setConfig(storeCfg);
        applyThemeColors(storeCfg);
        setProducts([]);
        setIsLoadingStore(true);
      } else {
        // Sem cache válido: busca obrigatoriamente da API
        setIsLoadingStore(true);
        setProducts([]);
        setOrders([]);
      }

      // 2. REVALIDATE / FETCH OBRIGATÓRIO DA API: Busca os dados atualizados do banco de dados (Cloudflare D1)
      try {
        const tenantRes = await fetchTenantDetailsApi(normalizedSlug);
        if (tenantRes.success && tenantRes.tenant) {
          const t = tenantRes.tenant;
          setCurrentTenant(t);
          try {
            localStorage.setItem("delivery_tenant_session", JSON.stringify(t));
          } catch {
            // ignore
          }
          const storeCfg = tenantToStoreConfig(t);
          setConfig(storeCfg);
          applyThemeColors(storeCfg);

          // Busca os produtos, pedidos, categorias e adicionais reais da loja no banco de dados
          const [pRes, oRes, cRes, agRes] = await Promise.all([
            fetchTenantProductsApi(t.id),
            fetchTenantOrdersApi(t.id),
            fetchTenantCategoriesApi(t.id),
            fetchTenantAddonGroupsApi(t.id),
          ]);

          const freshCategories =
            cRes.success && cRes.categories && cRes.categories.length > 0
              ? cRes.categories
              : cachedStore?.categories || defaultMockCategories;

          if (cRes.success && cRes.categories && cRes.categories.length > 0) {
            setStoreCategories(cRes.categories);
          }

          const freshAddonGroups =
            agRes.success && Array.isArray(agRes.addonGroups)
              ? agRes.addonGroups
              : cachedStore?.addonGroups || [];

          if (agRes.success && Array.isArray(agRes.addonGroups)) {
            setAddonGroups(agRes.addonGroups);
          }

          let productFetchSucceeded = pRes.success;
          let loadedProducts = pRes.success && Array.isArray(pRes.products) ? pRes.products : [];

          // Fallback pelo slug oficial do tenant caso a busca por ID não tenha retornado itens
          if (loadedProducts.length === 0 && t.slug && t.slug !== t.id) {
            const fallbackRes = await fetchTenantProductsApi(t.slug);
            if (fallbackRes.success) {
              productFetchSucceeded = true;
              if (Array.isArray(fallbackRes.products) && fallbackRes.products.length > 0) {
                loadedProducts = fallbackRes.products;
              }
            }
          }

          // Fallback adicional pelo slug da URL se for diferente de t.id e t.slug
          if (
            loadedProducts.length === 0 &&
            normalizedSlug !== t.id.toLowerCase() &&
            normalizedSlug !== (t.slug || "").toLowerCase()
          ) {
            const slugRes = await fetchTenantProductsApi(normalizedSlug);
            if (slugRes.success && Array.isArray(slugRes.products) && slugRes.products.length > 0) {
              productFetchSucceeded = true;
              loadedProducts = slugRes.products;
            }
          }

          // Atualiza o estado de produtos se a API retornou produtos ou se a requisição teve sucesso
          if (loadedProducts.length > 0) {
            setProducts(loadedProducts);
          } else if (productFetchSucceeded && !hasValidProductCache) {
            setProducts([]);
          }

          if (oRes.success && oRes.orders) {
            setOrders(oRes.orders);
          } else {
            setOrders([]);
          }

          // 3. REGRA DE VALIDAÇÃO DE CACHE VAZIO:
          // NUNCA salva no LocalStorage se a resposta da API de produtos retornar uma array vazia ou se houver erro de requisição.
          // Só salva no LocalStorage se `loadedProducts.length > 0`.
          if (productFetchSucceeded && loadedProducts.length > 0) {
            saveCachedStoreData(normalizedSlug, {
              tenant: t,
              config: storeCfg,
              products: loadedProducts,
              categories: freshCategories,
              addonGroups: freshAddonGroups,
            });
          }

          setIsLoadingStore(false);
        } else if (!hasValidProductCache && !fallbackTenantFromList) {
          setStoreNotFound(true);
          setCurrentTenant(null);
          setIsLoadingStore(false);
        } else {
          setIsLoadingStore(false);
        }
      } catch (err) {
        console.warn(`[StoreContext] Background revalidation failed for store "${normalizedSlug}":`, err);
        setIsLoadingStore(false);
      }
    },
    []
  );

  // Initial load: executa EXATAMENTE UMA VEZ na inicialização do app (Zero polling / loops)
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;

    const cached = loadCachedTenants();
    if (cached.length > 0) {
      preloadStoreImages(cached);
    }
    refreshTenants();
    refreshEstablishmentCategories();
    refreshLocalities();
    refreshPlatformSettings();
    if (currentSlug) {
      loadStoreBySlug(currentSlug);
    } else {
      setIsLoadingStore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando a rota mudar para uma loja específica
  useEffect(() => {
    if (currentSlug) {
      loadStoreBySlug(currentSlug);
    }
  }, [currentSlug, loadStoreBySlug]);

  // Sincroniza cor primária dinâmica da vitrine quando nenhum estabelecimento com tema próprio estiver selecionado
  useEffect(() => {
    if (platformSettings.primaryColor) {
      document.documentElement.style.setProperty("--portal-primary", platformSettings.primaryColor);
      if (!currentTenant) {
        document.documentElement.style.setProperty("--color-primary", platformSettings.primaryColor);
      }
    }
  }, [platformSettings.primaryColor, currentTenant]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const slug = getInitialUrlSlug();
      setCurrentSlug(slug);
      if (slug) {
        loadStoreBySlug(slug);
      } else {
        setIsLoadingStore(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadStoreBySlug]);

  // Sincroniza continuamente o carrinho do cliente com o localStorage e sessionStorage
  useEffect(() => {
    try {
      const activeSlug = currentTenant?.slug || config?.slug || initialSlug;
      const dataStr = JSON.stringify(cart);
      if (cart.length > 0) {
        if (activeSlug) {
          localStorage.setItem(`${CART_STORAGE_PREFIX}${activeSlug}`, dataStr);
          sessionStorage.setItem(`${CART_STORAGE_PREFIX}${activeSlug}`, dataStr);
        }
        localStorage.setItem(CART_GENERIC_KEY, dataStr);
        sessionStorage.setItem(CART_GENERIC_KEY, dataStr);
      } else {
        if (activeSlug) {
          localStorage.removeItem(`${CART_STORAGE_PREFIX}${activeSlug}`);
          sessionStorage.removeItem(`${CART_STORAGE_PREFIX}${activeSlug}`);
        }
        localStorage.removeItem(CART_GENERIC_KEY);
        sessionStorage.removeItem(CART_GENERIC_KEY);
      }
    } catch (err) {
      console.warn("Erro ao salvar carrinho no storage:", err);
    }
  }, [cart, currentTenant?.slug, config?.slug, initialSlug]);

  // Salva última loja visualizada para manter a rota após refresh
  useEffect(() => {
    const slug = currentTenant?.slug || config?.slug || currentSlug;
    if (slug && !RESERVED_SLUGS.has(slug)) {
      try {
        localStorage.setItem("topfood_last_store_slug", slug);
      } catch {
        // ignore
      }
    }
  }, [currentTenant?.slug, config?.slug, currentSlug]);

  const selectTenant = useCallback(
    async (slugOrId: string, preloadedTenant?: Tenant) => {
      setCurrentSlug(slugOrId);
      try {
        localStorage.setItem("topfood_last_store_slug", slugOrId);
      } catch {
        // ignore
      }
      setCart(loadSavedCart(slugOrId));

      // 1. Verifica primeiro se existe `cache_store_[storeSlug]` VÁLIDO (com products.length > 0)
      const cachedStore = loadCachedStoreData(slugOrId);
      const hasValidProducts = Boolean(
        cachedStore && Array.isArray(cachedStore.products) && cachedStore.products.length > 0
      );

      const targetTenant =
        preloadedTenant ||
        cachedStore?.tenant ||
        tenants.find((t) => t.slug === slugOrId || t.id === slugOrId);

      if (targetTenant) {
        setCurrentTenant(targetTenant);
        const storeCfg = cachedStore?.config || tenantToStoreConfig(targetTenant);
        setConfig(storeCfg);
        applyThemeColors(storeCfg);
        if (hasValidProducts && cachedStore) {
          setProducts(cachedStore.products);
          setIsLoadingStore(false);
        } else {
          setProducts([]);
          setIsLoadingStore(true);
        }
        if (cachedStore?.categories && cachedStore.categories.length > 0) {
          setStoreCategories(cachedStore.categories);
        }
        if (cachedStore?.addonGroups) {
          setAddonGroups(cachedStore.addonGroups);
        }
        setStoreNotFound(false);
        try {
          localStorage.setItem("delivery_tenant_session", JSON.stringify(targetTenant));
        } catch {
          // ignore
        }
      } else {
        setProducts([]);
        setIsLoadingStore(true);
      }

      // Update URL without reload ONLY if not currently on an admin or super-admin route
      if (typeof window !== "undefined") {
        const path = window.location.pathname.toLowerCase();
        const isAdminRoute =
          path.startsWith("/admin") ||
          path.startsWith("/painel") ||
          path.startsWith("/super-admin") ||
          path.startsWith("/superadmin");

        if (!isAdminRoute) {
          const newPath = `/loja/${slugOrId}`;
          window.history.pushState({ path: newPath }, "", newPath);
        }
      }

      await loadStoreBySlug(slugOrId);
    },
    [tenants, loadStoreBySlug]
  );

  const refreshCurrentStore = useCallback(async () => {
    if (currentTenant?.slug) {
      await loadStoreBySlug(currentTenant.slug);
    }
  }, [currentTenant?.slug, loadStoreBySlug]);

  // ---------------- AUTH ----------------
  const login = useCallback(
    async (
      email: string,
      password: string,
      portal?: "store" | "superadmin"
    ): Promise<{
      success: boolean;
      error?: string;
      role?: UserRole;
      isSuperAdminAttempt?: boolean;
    }> => {
      const res = await loginApi(email, password, portal);

      // RBAC: Se o portal da lanchonete for usado por um Super Admin, recusa e barra
      if (
        portal === "store" &&
        (res.isSuperAdmin ||
          res.user?.role === "super_admin" ||
          res.code === "SUPER_ADMIN_BLOCKED_ON_STORE")
      ) {
        return {
          success: false,
          error:
            "Acesso negado: Administradores da plataforma (SUPER_ADMIN) devem acessar exclusivamente pelo portal /super-admin.",
          role: "super_admin",
          isSuperAdminAttempt: true,
        };
      }

      if (res.success && res.user) {
        // Validação adicional de segurança de roles
        if (portal === "store" && res.user.role === "super_admin") {
          return {
            success: false,
            error:
              "Acesso negado: Administradores da plataforma (SUPER_ADMIN) devem acessar exclusivamente pelo portal /super-admin.",
            role: "super_admin",
            isSuperAdminAttempt: true,
          };
        }

        if (portal === "superadmin" && res.user.role !== "super_admin") {
          return {
            success: false,
            error:
              "Acesso negado: Este portal é restrito exclusivamente a Super Administradores da plataforma.",
            role: res.user.role,
          };
        }

        setCurrentUser(res.user);
        try {
          // Strictly tab-isolated in sessionStorage, NEVER in localStorage
          sessionStorage.setItem("topfood_admin_session", JSON.stringify(res.user));
          if (res.tenant) {
            sessionStorage.setItem("topfood_tenant_session", JSON.stringify(res.tenant));
          }
          if (res.token) {
            sessionStorage.setItem("topfood_auth_token", res.token);
          }
          // Remove any traces from localStorage
          localStorage.removeItem("delivery_user_session");
          localStorage.removeItem("delivery_tenant_session");
          localStorage.removeItem("delivery_auth_token");
        } catch (e) {
          console.warn("Could not save session to sessionStorage", e);
        }

        // If tenant admin, switch to that tenant automatically
        if (res.user.role === "tenant_admin" && res.tenant) {
          setCurrentTenant(res.tenant);
          setCurrentSlug(res.tenant.slug);
          const storeCfg = tenantToStoreConfig(res.tenant);
          setConfig(storeCfg);
          applyThemeColors(storeCfg);
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/admin") &&
            !window.location.pathname.startsWith("/painel") &&
            !window.location.pathname.startsWith("/superadmin") &&
            !window.location.pathname.startsWith("/super-admin")
          ) {
            window.history.pushState(null, "", `/loja/${res.tenant.slug}`);
          }
          await Promise.all([
            fetchTenantProductsApi(res.tenant.id).then((p) => p.success && setProducts(p.products)),
            fetchTenantOrdersApi(res.tenant.id).then((o) => o.success && setOrders(o.orders)),
          ]);
        }
        return { success: true, role: res.user.role };
      }
      return { success: false, error: res.error || "Credenciais inválidas" };
    },
    []
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem("topfood_admin_session");
      sessionStorage.removeItem("topfood_tenant_session");
      sessionStorage.removeItem("topfood_auth_token");
      localStorage.removeItem("delivery_user_session");
      localStorage.removeItem("delivery_tenant_session");
      localStorage.removeItem("delivery_auth_token");
    } catch (e) {
      console.warn("Could not remove session from storage", e);
    }
  }, []);

  const updateSuperAdminCredentials = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string; message?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      const res = await updateSuperAdminCredentialsApi({
        email: cleanEmail,
        password,
        userId: currentUser?.id,
      });

      if (res.success) {
        // INVALIDAÇÃO IMEDIATA DE SESSÃO:
        // Define aviso e pré-preenchimento de e-mail para a tela de login
        try {
          sessionStorage.setItem(
            "superadmin_relogin_notice",
            "Credenciais atualizadas com sucesso! Sua sessão foi invalidada por segurança. Entre com seu novo e-mail e senha para validar o acesso."
          );
          sessionStorage.setItem("superadmin_relogin_email", cleanEmail);
        } catch (e) {
          console.warn("Could not save relogin notice to sessionStorage", e);
        }

        // Invalida e limpa imediatamente a sessão local (tokens, storages e currentUser)
        logout();

        return {
          success: true,
          message:
            res.message ||
            "Credenciais atualizadas com sucesso! Sua sessão foi invalidada por segurança. Faça login novamente.",
        };
      }
      return { success: false, error: res.error || "Erro ao atualizar credenciais" };
    },
    [currentUser?.id, logout]
  );

  const updateTenantCredentials = useCallback(
    async (slugOrId: string, email: string, password: string, name?: string) => {
      const res = await updateTenantCredentialsApi(slugOrId, { email, password, name });
      if (res.success) {
        await refreshTenants();
        return { success: true, message: res.message, credentials: res.credentials };
      }
      return { success: false, error: res.error || "Erro ao atualizar credenciais" };
    },
    [refreshTenants]
  );

  const getTenantCredentials = useCallback(async (slugOrId: string) => {
    return await fetchTenantCredentialsApi(slugOrId);
  }, []);

  const getAllTenantCredentials = useCallback(async () => {
    return await fetchAllTenantCredentialsApi();
  }, []);

  // ---------------- STORE CONFIG & SETTINGS ----------------
  const updateConfig = useCallback(
    async (partial: Partial<StoreConfig>) => {
      const resolvedCategory =
        partial.businessType ||
        partial.category ||
        partial.categoryId ||
        partial.category_id ||
        undefined;

      setConfig((prev) => {
        const next = {
          ...prev,
          ...partial,
          ...(resolvedCategory
            ? {
                businessType: resolvedCategory,
                category: resolvedCategory,
                categoryId: resolvedCategory,
              }
            : {}),
        };
        applyThemeColors(next);
        return next;
      });
      const targetTenantId = currentTenant?.id || config.id || config.slug;
      if (targetTenantId) {
        const payload: Partial<Tenant> = {
          ...partial,
          ...(resolvedCategory
            ? {
                businessType: resolvedCategory,
                category: resolvedCategory,
                categoryId: resolvedCategory,
                category_id: resolvedCategory,
              }
            : {}),
          ...(partial.motoboyPhone !== undefined
            ? { motoboyPhone: partial.motoboyPhone, motoboy_phone: partial.motoboyPhone }
            : {}),
          ...(partial.motoboyName !== undefined
            ? { motoboyName: partial.motoboyName, motoboy_name: partial.motoboyName }
            : {}),
        };
        const updated = await updateTenantApi(targetTenantId, payload);
        if (updated.success && updated.tenant) {
          setCurrentTenant(updated.tenant);
          setTenants((prev) => {
            const next = prev.map((t) =>
              t.id === updated.tenant!.id || t.slug === updated.tenant!.slug ? updated.tenant! : t
            );
            saveCachedTenants(next);
            return next;
          });
          setFeaturedStoresRanked((prev) => {
            const next = prev.map((s) =>
              s.id === updated.tenant!.id || s.slug === updated.tenant!.slug
                ? { ...s, ...updated.tenant! }
                : s
            );
            saveCachedFeaturedStores(next);
            return next;
          });
          try {
            sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated.tenant));
            localStorage.setItem("delivery_tenant_session", JSON.stringify(updated.tenant));
          } catch {
            // ignore
          }
          await Promise.all([
            refreshTenants(),
            refreshEstablishmentCategories(),
            refreshFeaturedStoresRanked(),
          ]);
        }
      }
    },
    [
      currentTenant,
      config.id,
      config.slug,
      refreshTenants,
      refreshEstablishmentCategories,
      refreshFeaturedStoresRanked,
    ]
  );

  const toggleStore = useCallback(async () => {
    const nextState = !config.isOpen;
    setConfig((prev) => ({ ...prev, isOpen: nextState }));
    showToast(
      nextState ? "Loja aberta para novos pedidos!" : "Loja pausada temporariamente.",
      nextState ? "success" : "info"
    );
    if (currentTenant) {
      try {
        await updateTenantApi(currentTenant.id, { isOpen: nextState });
      } catch (e) {
        console.warn("Erro ao atualizar status da loja:", e);
      }
    }
  }, [config.isOpen, currentTenant, showToast]);

  // ---------------- PRODUCT & CATEGORY MANAGEMENT ----------------
  const refreshCategories = useCallback(async () => {
    if (!currentTenant) return;
    try {
      const res = await fetchTenantCategoriesApi(currentTenant.id);
      if (res.success && res.categories && res.categories.length > 0) {
        setStoreCategories(res.categories);
      }
    } catch (e) {
      console.warn("Erro ao recarregar categorias:", e);
    }
  }, [currentTenant]);

  const createCategory = useCallback(
    async (name: string, icon = "🍽️"): Promise<Category | null> => {
      if (!currentTenant) return null;
      try {
        const res = await createTenantCategoryApi(currentTenant.id, { name, icon });
        if (res.success && res.category) {
          setStoreCategories((prev) => {
            if (prev.some((c) => c.id === res.category!.id || c.name.toLowerCase() === res.category!.name.toLowerCase())) {
              return prev;
            }
            return [...prev, res.category!];
          });
          return res.category;
        }
      } catch (e) {
        console.warn("Erro ao criar categoria:", e);
      }
      return null;
    },
    [currentTenant]
  );

  // ---------------- GRUPOS DE ADICIONAIS / COMPLEMENTOS ----------------
  const refreshAddonGroups = useCallback(async () => {
    const activeTenantId = currentTenant?.id || currentTenant?.slug || currentSlug;
    if (!activeTenantId) return;
    try {
      const res = await fetchTenantAddonGroupsApi(activeTenantId);
      if (res.success && Array.isArray(res.addonGroups)) {
        setAddonGroups(res.addonGroups);
      }
    } catch (e) {
      console.warn("Erro ao recarregar grupos de adicionais:", e);
    }
  }, [currentTenant?.id, currentTenant?.slug, currentSlug]);

  const createAddonGroup = useCallback(
    async (group: Omit<AddonGroup, "id" | "tenantId">): Promise<AddonGroup | null> => {
      const activeTenantId = currentTenant?.id || currentTenant?.slug || currentSlug;
      if (!activeTenantId) {
        showToast("Selecione uma loja para criar o grupo de adicionais.", "warning");
        return null;
      }
      try {
        const res = await createTenantAddonGroupApi(activeTenantId, group);
        if (res.success && res.addonGroup) {
          setAddonGroups((prev) => {
            const exists = prev.some((g) => g.id === res.addonGroup!.id);
            if (exists) return prev.map((g) => (g.id === res.addonGroup!.id ? res.addonGroup! : g));
            return [...prev, res.addonGroup!];
          });
          showToast(`Grupo "${res.addonGroup.name}" criado com sucesso!`, "success");
          return res.addonGroup;
        } else {
          showToast(res.error || "Erro ao salvar grupo de adicionais.", "error");
        }
      } catch (e: any) {
        console.warn("Erro ao criar grupo de adicionais:", e);
        showToast("Erro na comunicação ao salvar grupo.", "error");
      }
      return null;
    },
    [currentTenant?.id, currentTenant?.slug, currentSlug, showToast]
  );

  const updateAddonGroup = useCallback(
    async (groupId: string, partial: Partial<AddonGroup>): Promise<AddonGroup | null> => {
      const activeTenantId = currentTenant?.id || currentTenant?.slug || currentSlug;
      if (!activeTenantId) return null;
      // Atualização otimista
      setAddonGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, ...partial } : g))
      );
      try {
        const res = await updateTenantAddonGroupApi(activeTenantId, groupId, partial);
        if (res.success && res.addonGroup) {
          setAddonGroups((prev) =>
            prev.map((g) => (g.id === groupId ? res.addonGroup! : g))
          );
          showToast("Grupo de adicionais atualizado!", "success");
          return res.addonGroup;
        }
      } catch (e) {
        console.warn("Erro ao atualizar grupo de adicionais:", e);
        showToast("Falha ao sincronizar alterações do grupo.", "error");
      }
      return null;
    },
    [currentTenant?.id, currentTenant?.slug, currentSlug, showToast]
  );

  const deleteAddonGroup = useCallback(
    async (groupId: string): Promise<boolean> => {
      const activeTenantId = currentTenant?.id || currentTenant?.slug || currentSlug;
      if (!activeTenantId) return false;
      setAddonGroups((prev) => prev.filter((g) => g.id !== groupId));
      try {
        const res = await deleteTenantAddonGroupApi(activeTenantId, groupId);
        if (res.success) {
          showToast("Grupo de adicionais excluído.", "info");
          return true;
        }
      } catch (e) {
        console.warn("Erro ao excluir grupo de adicionais:", e);
        showToast("Erro ao excluir grupo de adicionais.", "error");
      }
      return false;
    },
    [currentTenant?.id, currentTenant?.slug, currentSlug, showToast]
  );

  const reorderProducts = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      setProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        const ordered: Product[] = [];
        for (const id of orderedIds) {
          const item = map.get(id);
          if (item) {
            ordered.push(item);
            map.delete(id);
          }
        }
        for (const item of map.values()) {
          ordered.push(item);
        }
        return ordered;
      });

      if (!currentTenant) return true;
      try {
        const res = await reorderTenantProductsApi(currentTenant.id, orderedIds);
        if (res.success) {
          showToast("Ordem do cardápio atualizada!", "success");
          return true;
        } else {
          showToast(res.error || "Erro ao salvar ordem dos produtos.", "error");
          return false;
        }
      } catch (e) {
        console.warn("Erro ao reordenar produtos:", e);
        showToast("Erro ao conectar com o servidor para reordenar.", "error");
        return false;
      }
    },
    [currentTenant, showToast]
  );

  const addProduct = useCallback(
    async (productData: Omit<Product, "id" | "tenantId"> & { newCategoryName?: string }): Promise<Product | null> => {
      if (!currentTenant) return null;
      try {
        const res = await createTenantProductApi(currentTenant.id, productData as any);
        if (res.success && res.product) {
          setProducts((prev) => [res.product!, ...prev]);
          if (productData.newCategoryName) {
            await refreshCategories();
          }
          showToast("Produto cadastrado com sucesso!", "success");
          return res.product;
        }
      } catch (e) {
        console.warn("Erro ao criar produto:", e);
        showToast("Falha ao salvar produto no banco.", "error");
      }
      return null;
    },
    [currentTenant, showToast, refreshCategories]
  );

  const editProduct = useCallback(
    async (productId: string, partial: Partial<Product> & { newCategoryName?: string }) => {
      // Atualização otimista imediata na interface
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...partial } : p)));

      if ("available" in partial) {
        showToast(
          partial.available ? "Produto reativado no cardápio!" : "Produto pausado temporariamente.",
          "info"
        );
      } else {
        showToast("Produto atualizado com sucesso!", "success");
      }

      if (!currentTenant) return;
      try {
        await updateTenantProductApi(currentTenant.id, productId, partial as any);
        if (partial.newCategoryName) {
          await refreshCategories();
        }
      } catch (e) {
        console.warn("Erro ao persistir edição de produto:", e);
      }
    },
    [currentTenant, showToast, refreshCategories]
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast("Produto removido do cardápio.", "info");

      if (!currentTenant) return;
      try {
        await deleteTenantProductApi(currentTenant.id, productId);
      } catch (e) {
        console.warn("Erro ao remover produto:", e);
      }
    },
    [currentTenant, showToast]
  );

  // ---------------- CART MANAGEMENT ----------------
  const addToCart = useCallback(
    (product: Product, quantity: number, selectedOptions: ProductOption[], notes: string) => {
      const cartItem: CartItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product,
        quantity,
        selectedOptions,
        notes,
      };
      setCart((prev) => [...prev, cartItem]);
      showToast(`${quantity}x ${product.name} adicionado à sacola`, "info", 2000);
    },
    [showToast]
  );

  const updateCartQuantity = useCallback((cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === cartItemId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      const activeSlug = currentTenant?.slug || config?.slug || initialSlug;
      if (activeSlug) {
        localStorage.removeItem(`${CART_STORAGE_PREFIX}${activeSlug}`);
        sessionStorage.removeItem(`${CART_STORAGE_PREFIX}${activeSlug}`);
      }
      localStorage.removeItem(CART_GENERIC_KEY);
      sessionStorage.removeItem(CART_GENERIC_KEY);
    } catch {
      // ignore
    }
  }, [currentTenant?.slug, config?.slug, initialSlug]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) =>
      sum + item.quantity * (item.product.price + item.selectedOptions.reduce((s, o) => s + o.price, 0)),
    0
  );

  // ---------------- ORDERS ----------------
  const addOrder = useCallback(
    async (order: Order): Promise<Order | null> => {
      const tenantId = currentTenant?.id || currentTenant?.slug || currentSlug || "marcelino";
      const payload = {
        tenantId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        cardType: order.cardType,
        paymentDetails: order.paymentDetails,
        pixReceiptUrl: order.pixReceiptUrl || order.pix_receipt_url,
        pix_receipt_url: order.pix_receipt_url || order.pixReceiptUrl,
        location_url: order.location_url || order.locationUrl,
        locationUrl: order.locationUrl || order.location_url,
        address: order.address,
        changeFor: order.changeFor,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        status: order.status,
        items: order.items as any,
        statusHistory: order.statusHistory || [{ status: order.status, timestamp: Date.now() }],
      };

      try {
        // Persiste imediatamente no Cloudflare D1 via API
        const res = await createTenantOrderApi(tenantId, payload);
        const finalOrder: Order = res.success && res.order ? res.order : { ...order, tenantId };

        // Atualização imediata dos estados globais do React
        setOrders((prev) => [finalOrder, ...prev.filter((o) => o.id !== finalOrder.id)]);
        setNewOrderIds((prev) => [finalOrder.id, ...prev]);

        // Grava no localStorage para permitir rastreamento em tempo real
        try {
          localStorage.setItem("topfood_active_order_id", finalOrder.id);
          localStorage.setItem("topfood_active_order_status", finalOrder.status);
          localStorage.setItem("topfood_active_order_data", JSON.stringify(finalOrder));
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("topfood-active-order-updated", {
                detail: { orderId: finalOrder.id, status: finalOrder.status, order: finalOrder },
              })
            );
          }
        } catch {
          // ignore storage issues
        }

        // Dispara instantaneamente a mensagem de novo pedido para o painel do lojista (BroadcastChannel)
        broadcastNewOrder(finalOrder);

        showToast("Pedido confirmado com sucesso!", "success");
        return finalOrder;
      } catch (err: any) {
        console.warn("Erro ao registrar pedido no backend:", err);
        // Fallback local seguro
        setOrders((prev) => [order, ...prev]);
        setNewOrderIds((prev) => [order.id, ...prev]);
        broadcastNewOrder(order);
        showToast("Pedido registrado localmente (sincronizando...)", "info");
        return order;
      }
    },
    [currentTenant, currentSlug, showToast]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const tenantId = currentTenant?.id || currentTenant?.slug || currentSlug || "marcelino";

      // 1. Atualização otimista imediata na interface React (sem travamento)
      let targetOrder: Order | null = null;
      setOrders((prev) =>
        prev.map((o) => {
          if (
            o.id === orderId ||
            o.id === `#${orderId}` ||
            o.id.replace(/^#/, "") === orderId.replace(/^#/, "")
          ) {
            const updated: Order = {
              ...o,
              status,
              statusHistory: [...(o.statusHistory || []), { status, timestamp: Date.now() }],
            };
            targetOrder = updated;
            return updated;
          }
          return o;
        })
      );

      // 2. Notifica abas locais e cliente via BroadcastChannel e CustomEvent
      try {
        if (targetOrder) {
          broadcastOrderUpdate(targetOrder);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("topfood-active-order-updated", {
              detail: { orderId, status },
            })
          );
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("topfood_order_events");
            bc.postMessage({
              type: "ORDER_STATUS_CHANGED",
              orderId,
              status,
              timestamp: Date.now(),
            });
            setTimeout(() => {
              try {
                bc.close();
              } catch (err) {
                void err;
              }
            }, 100);
          }
        }

        const activeId = localStorage.getItem("topfood_active_order_id") || localStorage.getItem("active_order_id");
        if (
          !activeId ||
          activeId === orderId ||
          activeId.replace(/^#/, "") === orderId.replace(/^#/, "")
        ) {
          updateActiveOrderStatus(status);
        }
      } catch {
        // ignore
      }

      // 3. Feedback visual imediato via Toast
      const statusLabels: Record<OrderStatus, string> = {
        received: "Recebido",
        preparing: "Em Preparo",
        delivering: "Saiu para Entrega",
        done: "Finalizado",
        cancelled: "Cancelado",
      };
      showToast(`Pedido ${orderId} atualizado para: ${statusLabels[status] || status}`, "success");

      // 4. Persiste no Cloudflare D1 e KV via API
      try {
        const res = await updateOrderStatusApi(orderId, status, tenantId);
        if (!res.success) {
          console.warn("Aviso ao persistir status:", res.error);
        }
      } catch (err) {
        console.warn("Erro de rede ao atualizar status do pedido:", err);
        showToast("Aviso: Falha temporária de rede ao sincronizar status.", "warning");
      }
    },
    [currentTenant, currentSlug, showToast]
  );

  const clearNewOrderFlag = useCallback((orderId: string) => {
    setNewOrderIds((prev) => prev.filter((id) => id !== orderId));
  }, []);

  // ---------------- ESCUTA DE PEDIDOS EM TEMPO REAL (EVENTOS SSE + BROADCASTCHANNEL - ZERO POLLING) ----------------
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (orders.length > 0 && knownOrderIdsRef.current.size === 0) {
      knownOrderIdsRef.current = new Set(orders.map((o) => o.id));
    }
  }, [orders]);

  useEffect(() => {
    const tenantParam = currentTenant?.id || currentTenant?.slug || currentSlug;
    if (!tenantParam) return;
    let isMounted = true;

    // Função de inserção imediata de novo pedido na tela com toque de som instantâneo
    const handleIncomingNewOrder = (incomingOrder: Order) => {
      if (!incomingOrder || !incomingOrder.id || !isMounted) return;

      const orderCleanId = incomingOrder.id.replace(/^#/, "");
      const isAlreadyKnown =
        knownOrderIdsRef.current.has(incomingOrder.id) ||
        knownOrderIdsRef.current.has(`#${orderCleanId}`) ||
        knownOrderIdsRef.current.has(orderCleanId);

      // Atualiza ref de IDs conhecidos
      knownOrderIdsRef.current.add(incomingOrder.id);
      knownOrderIdsRef.current.add(orderCleanId);

      // 1. Insere o pedido na tela imediatamente
      setOrders((prev) => {
        const index = prev.findIndex(
          (o) =>
            o.id === incomingOrder.id ||
            o.id.replace(/^#/, "") === orderCleanId
        );
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...incomingOrder };
          return updated;
        }
        return [incomingOrder, ...prev];
      });

      // Se é um pedido novo, registra badge visual e notifica via CustomEvent
      if (!isAlreadyKnown) {
        setNewOrderIds((prev) => Array.from(new Set([incomingOrder.id, ...prev])));

        // Notifica a aplicação/janela via CustomEvent (sem tocar áudio globalmente)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("new-delivery-order-received", {
              detail: { orders: [incomingOrder], order: incomingOrder },
            })
          );
        }
      }
    };

    // Função de atualização em tempo real de status do pedido
    const handleIncomingOrderUpdate = (updatedOrder: Order) => {
      if (!updatedOrder || !updatedOrder.id || !isMounted) return;
      const cleanId = updatedOrder.id.replace(/^#/, "");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === updatedOrder.id || o.id.replace(/^#/, "") === cleanId ? { ...o, ...updatedOrder } : o
        )
      );

      // Sincroniza pedido ativo no rastreamento do cliente
      try {
        const activeId = localStorage.getItem("topfood_active_order_id");
        if (
          activeId &&
          (activeId === updatedOrder.id || activeId.replace(/^#/, "") === cleanId)
        ) {
          localStorage.setItem("topfood_active_order_status", updatedOrder.status);
          localStorage.setItem("topfood_active_order_data", JSON.stringify(updatedOrder));
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("topfood-active-order-updated", {
                detail: { orderId: updatedOrder.id, status: updatedOrder.status, order: updatedOrder },
              })
            );
          }
        }
      } catch {
        // ignore
      }
    };

    // 1. Carga inicial de pedidos uma única vez ao montar (sem qualquer repetição periódica/polling)
    const loadInitialOrders = async () => {
      try {
        const res = await fetchOrdersApi(tenantParam);
        if (!isMounted) return;

        if (res.success && res.orders) {
          const incoming: Order[] = res.orders;
          setOrders(incoming);
          knownOrderIdsRef.current = new Set([
            ...incoming.map((o) => o.id),
            ...incoming.map((o) => o.id.replace(/^#/, "")),
          ]);
        }
      } catch (err) {
        console.warn("Aviso ao carregar pedidos iniciais:", err);
      }
    };

    loadInitialOrders();

    // 2. Escutador de Evento em Tempo Real via BroadcastChannel (comunicação instantânea cliente -> lojista)
    const unsubscribeBroadcast = subscribeOrderBroadcast((message) => {
      if (!isMounted) return;
      const targetTenantId = currentTenant?.id || currentTenant?.slug || currentSlug;
      const msgTenant = message.tenantId || message.order?.tenantId;

      // Se a mensagem pertence a esta loja (ou se ambos identificadores forem vazios/compatíveis)
      const isForThisTenant =
        !targetTenantId ||
        !msgTenant ||
        msgTenant === targetTenantId ||
        msgTenant === currentTenant?.id ||
        msgTenant === currentTenant?.slug;

      if (isForThisTenant && message.order) {
        if (message.type === "NEW_ORDER") {
          handleIncomingNewOrder(message.order);
        } else if (message.type === "ORDER_UPDATE") {
          handleIncomingOrderUpdate(message.order);
        }
      }
    });

    // 3. Escutador de Evento em Tempo Real via Server-Sent Events (SSE) (servidor -> lojista)
    let eventSource: EventSource | null = null;
    if (typeof EventSource !== "undefined") {
      try {
        const streamUrl = currentTenant?.id
          ? `/api/tenants/${currentTenant.id}/orders/stream`
          : `/api/orders/stream?tenantId=${encodeURIComponent(tenantParam)}`;

        eventSource = new EventSource(streamUrl);

        // Novo pedido disparado pelo backend via SSE
        eventSource.addEventListener("new_order", (e) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data?.order) {
              handleIncomingNewOrder(data.order);
            }
          } catch (err) {
            console.warn("SSE new_order parse error:", err);
          }
        });

        // Atualização de pedido disparada pelo backend via SSE
        eventSource.addEventListener("order_update", (e) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data?.order) {
              if (data.isNew) {
                handleIncomingNewOrder(data.order);
              } else {
                handleIncomingOrderUpdate(data.order);
              }
            }
          } catch (err) {
            console.warn("SSE order_update parse error:", err);
          }
        });

        // Carga/Sincronização de lista de pedidos via SSE
        eventSource.addEventListener("orders", (e) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data?.orders && Array.isArray(data.orders)) {
              const incoming: Order[] = data.orders;
              const prevIds = knownOrderIdsRef.current;

              if (prevIds.size > 0) {
                const newlyArrived = incoming.filter(
                  (o) => !prevIds.has(o.id) && !prevIds.has(o.id.replace(/^#/, ""))
                );
                if (newlyArrived.length > 0) {
                  newlyArrived.forEach((o) => handleIncomingNewOrder(o));
                }
              } else {
                setOrders(incoming);
                knownOrderIdsRef.current = new Set([
                  ...incoming.map((o) => o.id),
                  ...incoming.map((o) => o.id.replace(/^#/, "")),
                ]);
              }
            }
          } catch (err) {
            console.warn("SSE orders parse error:", err);
          }
        });
      } catch (err) {
        console.warn("SSE not available:", err);
      }
    }

    // 4. Sincronização ativa entre redes e dispositivos (4G/5G e Wi-Fi) diretamente no Cloudflare D1/KV
    const syncOrdersWithCloud = async () => {
      try {
        const res = await fetchOrdersApi(tenantParam);
        if (!isMounted || !res.success || !res.orders) return;

        const incoming: Order[] = res.orders;
        const prevIds = knownOrderIdsRef.current;

        if (prevIds.size > 0) {
          const newlyArrived = incoming.filter(
            (o) => !prevIds.has(o.id) && !prevIds.has(o.id.replace(/^#/, ""))
          );
          if (newlyArrived.length > 0) {
            newlyArrived.forEach((o) => handleIncomingNewOrder(o));
          }
        } else {
          setOrders(incoming);
          incoming.forEach((o) => {
            knownOrderIdsRef.current.add(o.id);
            knownOrderIdsRef.current.add(o.id.replace(/^#/, ""));
          });
        }

        // Atualiza status de pedidos caso alterados em outro dispositivo conectado ao D1
        setOrders((prev) => {
          let hasDiff = false;
          const merged = prev.map((curr) => {
            const fresh = incoming.find(
              (inc) => inc.id === curr.id || inc.id.replace(/^#/, "") === curr.id.replace(/^#/, "")
            );
            if (fresh && fresh.status !== curr.status) {
              hasDiff = true;
              return { ...curr, ...fresh };
            }
            return curr;
          });
          return hasDiff ? merged : prev;
        });
      } catch {
        // ignora erros de rede móvel temporários
      }
    };

    const handleWindowFocus = () => {
      if (currentUser && document.visibilityState === "visible") {
        syncOrdersWithCloud();
      }
    };
    document.addEventListener("visibilitychange", handleWindowFocus);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleWindowFocus);
      window.removeEventListener("focus", handleWindowFocus);
      unsubscribeBroadcast();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentTenant?.id, currentTenant?.slug, currentSlug, currentUser]);

  // Recarga manual sob demanda de pedidos via API (usada pelos botões "Atualizar" no painel do lojista)
  const refreshOrders = useCallback(async () => {
    try {
      const tenantParam = currentTenant?.id || currentTenant?.slug || currentSlug || undefined;
      const res = await fetchOrdersApi(tenantParam);
      if (res.success && res.orders) {
        setOrders(res.orders);
        res.orders.forEach((o) => {
          knownOrderIdsRef.current.add(o.id);
          knownOrderIdsRef.current.add(o.id.replace(/^#/, ""));
        });
        return res.orders;
      }
    } catch (err) {
      console.warn("Erro ao atualizar pedidos:", err);
    }
    return null;
  }, [currentTenant?.id, currentTenant?.slug, currentSlug]);

  const refreshStoreAdminData = useCallback(async () => {
    const slug = currentTenant?.slug || currentSlug;
    await Promise.all([
      refreshOrders(),
      slug ? loadStoreBySlug(slug) : Promise.resolve(),
    ]);
  }, [refreshOrders, currentTenant?.slug, currentSlug, loadStoreBySlug]);

  // ---------------- SUPER ADMIN ACTIONS ----------------
  const createNewTenant = useCallback(
    async (data: {
      name: string;
      slug?: string;
      email: string;
      password: string;
      whatsapp?: string;
      pixKey?: string;
      deliveryFee?: number;
      address?: string;
      primaryColor?: string;
      bannerImage?: string;
      businessType?: string;
      isFeatured?: boolean;
      priorityOrder?: number;
      localidade?: string;
    }) => {
      const res = await createTenantApi(data);
      if (res.success && res.tenant) {
        await Promise.all([refreshTenants(), refreshLocalities(), refreshEstablishmentCategories()]);
      }
      return res;
    },
    [refreshTenants, refreshLocalities, refreshEstablishmentCategories]
  );

  const updateTenant = useCallback(
    async (
      slugOrId: string,
      data: Partial<Tenant> & { adminEmail?: string; adminPassword?: string }
    ): Promise<{ success: boolean; tenant?: Tenant; error?: string; message?: string }> => {
      const resolvedCategory =
        data.businessType ||
        data.category ||
        data.categoryId ||
        (data as any).category_id ||
        undefined;

      const payload: Partial<Tenant> & { adminEmail?: string; adminPassword?: string } = {
        ...data,
        ...(resolvedCategory
          ? {
              businessType: resolvedCategory,
              category: resolvedCategory,
              categoryId: resolvedCategory,
              category_id: resolvedCategory,
            }
          : {}),
      };

      // 1. Atualização otimista imediata no estado global e no cache localStorage
      setTenants((prev) => {
        const next = prev.map((t) =>
          t.id === slugOrId || t.slug === slugOrId ? { ...t, ...payload, updatedAt: Date.now() } : t
        );
        saveCachedTenants(next);
        return next;
      });

      setFeaturedStoresRanked((prev) => {
        const next = prev.map((s) =>
          s.id === slugOrId || s.slug === slugOrId ? { ...s, ...payload } : s
        );
        saveCachedFeaturedStores(next);
        return next;
      });

      setCurrentTenant((prev) => {
        if (prev && (prev.id === slugOrId || prev.slug === slugOrId)) {
          const updated = { ...prev, ...payload, updatedAt: Date.now() };
          try {
            sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
            localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        }
        return prev;
      });

      // 2. Persistência no Cloudflare D1 / KV via API
      const res = await updateTenantApi(slugOrId, payload);
      if (res.success && res.tenant) {
        const savedTenant = res.tenant;
        setTenants((prev) => {
          const next = prev.map((t) =>
            t.id === savedTenant.id || t.slug === savedTenant.slug || t.id === slugOrId || t.slug === slugOrId
              ? { ...t, ...savedTenant }
              : t
          );
          saveCachedTenants(next);
          return next;
        });

        setFeaturedStoresRanked((prev) => {
          const next = prev.map((s) =>
            s.id === savedTenant.id || s.slug === savedTenant.slug || s.id === slugOrId || s.slug === slugOrId
              ? { ...s, ...savedTenant }
              : s
          );
          saveCachedFeaturedStores(next);
          return next;
        });

        setCurrentTenant((prev) => {
          if (
            prev &&
            (prev.id === savedTenant.id ||
              prev.slug === savedTenant.slug ||
              prev.id === slugOrId ||
              prev.slug === slugOrId)
          ) {
            const updated = { ...prev, ...savedTenant };
            try {
              sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
              localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          }
          return prev;
        });

        // Revalida em paralelo do banco de dados para garantir 100% de sincronia na vitrine
        await Promise.all([
          refreshTenants(),
          refreshEstablishmentCategories(),
          refreshFeaturedStoresRanked(),
          refreshLocalities(),
        ]);
      }

      return res;
    },
    [refreshTenants, refreshEstablishmentCategories, refreshFeaturedStoresRanked, refreshLocalities]
  );

  const toggleTenantStatus = useCallback(
    async (slugOrId: string, status: TenantStatus) => {
      const res = await updateTenantStatusApi(slugOrId, status);
      if (res.success) {
        await refreshTenants();
        if (currentTenant?.id === slugOrId || currentTenant?.slug === slugOrId) {
          await loadStoreBySlug(currentTenant.slug);
        }
        return true;
      }
      return false;
    },
    [refreshTenants, currentTenant, loadStoreBySlug]
  );

  const activateSubscription = useCallback(
    async (slugOrId: string, customBillingDay?: number) => {
      const now = new Date();
      const billingDay =
        customBillingDay && customBillingDay >= 1 && customBillingDay <= 31
          ? customBillingDay
          : now.getDate();

      // Próximo vencimento DEVE SER no mês seguinte no dia X (ex: se ativou em 23/09, vence em 23/10)
      const nextMonthObj = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const targetYear = nextMonthObj.getFullYear();
      const targetMonth = nextMonthObj.getMonth();
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(billingDay, daysInTargetMonth);
      const nextDueDate = new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999).getTime();

      // 1. Atualização otimista imediata na UI (Super Admin e Lojista sem F5)
      setTenants((prev) =>
        prev.map((t) =>
          t.id === slugOrId || t.slug === slugOrId
            ? {
                ...t,
                subscriptionStatus: "active" as const,
                billingDay,
                lastPaymentAt: now.getTime(),
                paidUntil: nextDueDate,
                nextDueDate,
                status: "active" as const,
              }
            : t
        )
      );

      setCurrentTenant((prev) => {
        if (prev && (prev.id === slugOrId || prev.slug === slugOrId)) {
          const updated = {
            ...prev,
            subscriptionStatus: "active" as const,
            billingDay,
            lastPaymentAt: now.getTime(),
            paidUntil: nextDueDate,
            nextDueDate,
            status: "active" as const,
          };
          try {
            sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
            localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        }
        return prev;
      });

      // 2. Persistência real no Cloudflare D1
      const res = await activateTenantSubscriptionApi(slugOrId, customBillingDay);
      if (res.success && res.tenant) {
        const resolvedBillingDay = res.billingDay || res.tenant.billingDay || billingDay;
        const resolvedNextDueDate = res.nextDueDate || res.tenant.nextDueDate || res.tenant.paidUntil || nextDueDate;
        setTenants((prev) =>
          prev.map((t) =>
            t.id === res.tenant!.id || t.slug === res.tenant!.slug
              ? {
                  ...t,
                  ...res.tenant!,
                  subscriptionStatus: "active" as const,
                  billingDay: resolvedBillingDay,
                  lastPaymentAt: res.tenant!.lastPaymentAt || now.getTime(),
                  paidUntil: resolvedNextDueDate,
                  nextDueDate: resolvedNextDueDate,
                  status: "active" as const,
                }
              : t
          )
        );
        setCurrentTenant((prev) => {
          if (prev && (prev.id === res.tenant!.id || prev.slug === res.tenant!.slug)) {
            const updated = {
              ...prev,
              ...res.tenant!,
              subscriptionStatus: "active" as const,
              billingDay: resolvedBillingDay,
              lastPaymentAt: res.tenant!.lastPaymentAt || now.getTime(),
              paidUntil: resolvedNextDueDate,
              nextDueDate: resolvedNextDueDate,
              status: "active" as const,
            };
            try {
              sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
              localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          }
          return prev;
        });
      }
      return res;
    },
    []
  );

  const updateMonthlyFee = useCallback(
    async (slugOrId: string, monthlyFee: number) => {
      // 1. Atualização otimista imediata na UI sem F5
      setTenants((prev) =>
        prev.map((t) =>
          t.id === slugOrId || t.slug === slugOrId
            ? {
                ...t,
                monthlyFee,
              }
            : t
        )
      );

      setCurrentTenant((prev) => {
        if (prev && (prev.id === slugOrId || prev.slug === slugOrId)) {
          const updated = {
            ...prev,
            monthlyFee,
          };
          try {
            sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
            localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        }
        return prev;
      });

      // 2. Persistência no Cloudflare D1
      const res = await updateTenantMonthlyFeeApi(slugOrId, monthlyFee);
      if (res.success && res.tenant) {
        const resolvedFee = res.monthlyFee !== undefined ? res.monthlyFee : monthlyFee;
        setTenants((prev) =>
          prev.map((t) =>
            t.id === res.tenant!.id || t.slug === res.tenant!.slug
              ? {
                  ...t,
                  ...res.tenant!,
                  monthlyFee: resolvedFee,
                }
              : t
          )
        );
        setCurrentTenant((prev) => {
          if (prev && (prev.id === res.tenant!.id || prev.slug === res.tenant!.slug)) {
            const updated = {
              ...prev,
              ...res.tenant!,
              monthlyFee: resolvedFee,
            };
            try {
              sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
              localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          }
          return prev;
        });
      }
      return res;
    },
    []
  );

  const confirmMonthlyPayment = useCallback(
    async (slugOrId: string) => {
      const now = new Date();
      // Otimisticamente calcula o próximo vencimento (+1 mês) para atualização instantânea
      const existingTenant = tenants.find((t) => t.id === slugOrId || t.slug === slugOrId) || currentTenant;
      const billingDay = existingTenant?.billingDay || now.getDate();
      let baseYear = now.getFullYear();
      let baseMonth = now.getMonth();
      const currentDue = existingTenant?.nextDueDate || existingTenant?.paidUntil;
      if (currentDue && currentDue > now.getTime()) {
        const d = new Date(currentDue);
        baseYear = d.getFullYear();
        baseMonth = d.getMonth();
      }
      const nextMonthDate = new Date(baseYear, baseMonth + 1, 1);
      const targetYear = nextMonthDate.getFullYear();
      const targetMonth = nextMonthDate.getMonth();
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const targetDay = Math.min(billingDay, daysInTargetMonth);
      const optimisticNextDueDate = new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999).getTime();

      // 1. Atualização otimista imediata
      setTenants((prev) =>
        prev.map((t) =>
          t.id === slugOrId || t.slug === slugOrId
            ? {
                ...t,
                subscriptionStatus: "active" as const,
                lastPaymentAt: now.getTime(),
                paidUntil: optimisticNextDueDate,
                nextDueDate: optimisticNextDueDate,
                status: "active" as const,
              }
            : t
        )
      );

      setCurrentTenant((prev) => {
        if (prev && (prev.id === slugOrId || prev.slug === slugOrId)) {
          const updated = {
            ...prev,
            subscriptionStatus: "active" as const,
            lastPaymentAt: now.getTime(),
            paidUntil: optimisticNextDueDate,
            nextDueDate: optimisticNextDueDate,
            status: "active" as const,
          };
          try {
            sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
            localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        }
        return prev;
      });

      // 2. Persistência real
      const res = await confirmTenantPaymentApi(slugOrId);
      if (res.success && res.tenant) {
        const resolvedNextDueDate = res.nextDueDate || res.tenant.nextDueDate || res.tenant.paidUntil || optimisticNextDueDate;
        setTenants((prev) =>
          prev.map((t) =>
            t.id === res.tenant!.id || t.slug === res.tenant!.slug
              ? {
                  ...t,
                  ...res.tenant!,
                  subscriptionStatus: "active" as const,
                  lastPaymentAt: res.paymentAt || res.tenant!.lastPaymentAt || now.getTime(),
                  paidUntil: resolvedNextDueDate,
                  nextDueDate: resolvedNextDueDate,
                  status: "active" as const,
                }
              : t
          )
        );
        setCurrentTenant((prev) => {
          if (prev && (prev.id === res.tenant!.id || prev.slug === res.tenant!.slug)) {
            const updated = {
              ...prev,
              ...res.tenant!,
              subscriptionStatus: "active" as const,
              lastPaymentAt: res.paymentAt || res.tenant!.lastPaymentAt || now.getTime(),
              paidUntil: resolvedNextDueDate,
              nextDueDate: resolvedNextDueDate,
              status: "active" as const,
            };
            try {
              sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
              localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          }
          return prev;
        });
      }
      return res;
    },
    [tenants, currentTenant]
  );

  const cancelSubscription = useCallback(
    async (slugOrId: string) => {
      // 1. Atualização otimista imediata na UI (Super Admin e Lojista sem recarregar tela)
      setTenants((prev) =>
        prev.map((t) =>
          t.id === slugOrId || t.slug === slugOrId
            ? {
                ...t,
                subscriptionStatus: "demo" as const,
                billingDay: undefined,
                lastPaymentAt: undefined,
                paidUntil: undefined,
                nextDueDate: undefined,
              }
            : t
        )
      );

      setCurrentTenant((prev) => {
        if (prev && (prev.id === slugOrId || prev.slug === slugOrId)) {
          const updated: Tenant = {
            ...prev,
            subscriptionStatus: "demo" as const,
            billingDay: undefined,
            lastPaymentAt: undefined,
            paidUntil: undefined,
            nextDueDate: undefined,
          };
          try {
            sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
            localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        }
        return prev;
      });

      // 2. Persistência real na API / D1
      const res = await cancelTenantSubscriptionApi(slugOrId);
      if (res.success && res.tenant) {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === res.tenant!.id || t.slug === res.tenant!.slug
              ? {
                  ...t,
                  ...res.tenant!,
                  subscriptionStatus: "demo" as const,
                  billingDay: undefined,
                  lastPaymentAt: undefined,
                  paidUntil: undefined,
                  nextDueDate: undefined,
                }
              : t
          )
        );
        setCurrentTenant((prev) => {
          if (prev && (prev.id === res.tenant!.id || prev.slug === res.tenant!.slug)) {
            const updated: Tenant = {
              ...prev,
              ...res.tenant!,
              subscriptionStatus: "demo" as const,
              billingDay: undefined,
              lastPaymentAt: undefined,
              paidUntil: undefined,
              nextDueDate: undefined,
            };
            try {
              sessionStorage.setItem("topfood_tenant_session", JSON.stringify(updated));
              localStorage.setItem("delivery_tenant_session", JSON.stringify(updated));
            } catch {
              // ignore
            }
            return updated;
          }
          return prev;
        });
      }
      return res;
    },
    []
  );

  const deleteTenant = useCallback(
    async (slugOrId: string) => {
      removeCachedTenant(slugOrId);
      const res = await deleteTenantApi(slugOrId);
      if (res.success) {
        removeCachedTenant(slugOrId);
        await refreshTenants();
        return true;
      }
      return false;
    },
    [refreshTenants]
  );

  const isStoreActive = currentTenant ? currentTenant.status === "active" : true;
  const isStoreOpen = config.isOpen ?? true;
  const userRole = currentUser?.role || null;
  const isAdminAuthed = Boolean(currentUser);
  const isSuperAdmin = Boolean(
    (currentUser &&
      (String(currentUser.role).toLowerCase() === "super_admin" ||
        String(currentUser.role).toLowerCase() === "superadmin")) ||
      (() => {
        try {
          if (typeof window === "undefined") return false;
          const saved = sessionStorage.getItem("topfood_admin_session");
          if (saved) {
            const user = JSON.parse(saved);
            const r = String(user?.role || "").toLowerCase();
            return r === "super_admin" || r === "superadmin";
          }
        } catch {
          // ignore
        }
        return false;
      })()
  );

  // ==========================================
  // STORIES DA LOJA (ESTADO GLOBAL E MODAL)
  // ==========================================
  const [activeStoriesMap, setActiveStoriesMap] = useState<Record<string, StoreStory[]>>(
    () => initialHomeCache?.activeStoriesMap || {}
  );
  const [storiesModal, setStoriesModal] = useState<{
    isOpen: boolean;
    tenant: Partial<Tenant> | null;
    stories: StoreStory[];
  }>({
    isOpen: false,
    tenant: null,
    stories: [],
  });

  const refreshActiveStories = useCallback(async () => {
    try {
      const res = await fetchAllActiveStoriesApi();
      if (res.success && res.storiesByTenant) {
        setActiveStoriesMap(res.storiesByTenant);
        saveCachedHomeData({ activeStoriesMap: res.storiesByTenant });
      }
    } catch (err) {
      console.warn("Erro ao buscar stories ativos:", err);
    }
  }, []);

  useEffect(() => {
    refreshActiveStories();
  }, [refreshActiveStories]);

  // Mantém o cache da loja ativa (cache_store_[storeSlug]) sincronizado em segundo plano APENAS quando houver produtos válidos (`products.length > 0`)
  useEffect(() => {
    const activeSlug = currentTenant?.slug || config?.slug || currentSlug;
    if (!activeSlug || !currentTenant) return;
    if (Array.isArray(products) && products.length > 0) {
      saveCachedStoreData(activeSlug, {
        tenant: currentTenant,
        config,
        products,
        categories: storeCategories,
        addonGroups,
      });
    }
  }, [currentTenant, config, products, storeCategories, addonGroups, currentSlug]);

  const getStoreActiveStories = useCallback(
    (tenantIdOrSlug: string): StoreStory[] => {
      if (!tenantIdOrSlug) return [];
      if (activeStoriesMap[tenantIdOrSlug] && activeStoriesMap[tenantIdOrSlug].length > 0) {
        return activeStoriesMap[tenantIdOrSlug];
      }
      const matched = tenants.find(
        (t) => t.slug === tenantIdOrSlug || t.id === tenantIdOrSlug
      );
      if (matched && activeStoriesMap[matched.id]) {
        return activeStoriesMap[matched.id];
      }
      return [];
    },
    [activeStoriesMap, tenants]
  );

  const openStoreStoriesModal = useCallback(
    (targetTenant: Partial<Tenant>, explicitStories?: StoreStory[]) => {
      const tenantStories =
        explicitStories ||
        (targetTenant.id ? activeStoriesMap[targetTenant.id] : undefined) ||
        (targetTenant.slug ? getStoreActiveStories(targetTenant.slug) : undefined) ||
        [];

      if (tenantStories.length > 0) {
        setStoriesModal({
          isOpen: true,
          tenant: targetTenant,
          stories: tenantStories,
        });
      }
    },
    [activeStoriesMap, getStoreActiveStories]
  );

  const closeStoreStoriesModal = useCallback(() => {
    setStoriesModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Favorite Stores persisted in localStorage
  const FAVORITE_STORES_STORAGE_KEY = "topfood_favorite_stores";
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(FAVORITE_STORES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FAVORITE_STORES_STORAGE_KEY, JSON.stringify(favoriteStoreIds));
    } catch {
      // ignore storage quota errors
    }
  }, [favoriteStoreIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FAVORITE_STORES_STORAGE_KEY) {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : [];
          if (Array.isArray(parsed)) {
            setFavoriteStoreIds(parsed.filter((item): item is string => typeof item === "string"));
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const isFavoriteStore = useCallback(
    (tenantOrKey: Partial<Tenant> | string): boolean => {
      if (!tenantOrKey) return false;
      if (typeof tenantOrKey === "string") {
        const key = tenantOrKey.trim();
        return favoriteStoreIds.includes(key);
      }
      const id = tenantOrKey.id?.trim();
      const slug = tenantOrKey.slug?.trim();
      return Boolean((id && favoriteStoreIds.includes(id)) || (slug && favoriteStoreIds.includes(slug)));
    },
    [favoriteStoreIds]
  );

  const toggleFavoriteStore = useCallback(
    (tenantOrKey: Partial<Tenant> | string) => {
      if (!tenantOrKey) return;
      const id = typeof tenantOrKey === "string" ? tenantOrKey.trim() : tenantOrKey.id?.trim();
      const slug = typeof tenantOrKey === "string" ? tenantOrKey.trim() : tenantOrKey.slug?.trim();
      const primaryKey = slug || id;
      if (!primaryKey) return;

      setFavoriteStoreIds((prev) => {
        const exists = prev.some((k) => (id && k === id) || (slug && k === slug) || k === primaryKey);
        if (exists) {
          return prev.filter((k) => k !== id && k !== slug && k !== primaryKey);
        }
        return [primaryKey, ...prev];
      });
    },
    []
  );

  return (
    <StoreContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        tenants,
        featuredStoresRanked,
        topSellingProducts,
        refreshFeaturedStoresRanked,
        refreshTopSellingProducts,
        currentTenant,
        config,
        updateConfig,
        products,
        setProducts,
        isStoreOpen,
        toggleStore,
        isStoreActive,
        currentSlug,
        selectTenant,
        refreshTenants,
        refreshCurrentStore,
        isLoadingStore,
        isLoadingTenants,
        isLoadingPortal,
        isRevalidatingTenants,
        storeNotFound,
        addProduct,
        editProduct,
        removeProduct,
        reorderProducts,
        storeCategories,
        createCategory,
        refreshCategories,
        addonGroups,
        refreshAddonGroups,
        createAddonGroup,
        updateAddonGroup,
        deleteAddonGroup,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        orders,
        refreshOrders,
        refreshStoreAdminData,
        addOrder,
        updateOrderStatus,
        newOrderIds,
        clearNewOrderFlag,
        soundEnabled,
        toggleSound,
        playAlertSound,
        currentUser,
        userRole,
        isAdminAuthed,
        isSuperAdmin,
        login,
        logout,
        updateSuperAdminCredentials,
        updateTenantCredentials,
        getTenantCredentials,
        getAllTenantCredentials,
        createNewTenant,
        updateTenant,
        toggleTenantStatus,
        activateSubscription,
        updateMonthlyFee,
        confirmMonthlyPayment,
        cancelSubscription,
        deleteTenant,
        localities,
        selectedLocality,
        setSelectedLocality,
        refreshLocalities,
        establishmentCategories,
        createEstablishmentCategory,
        deleteEstablishmentCategory,
        refreshEstablishmentCategories,
        platformSettings,
        refreshPlatformSettings,
        updatePlatformSettings,
        toggleTenantFeatured,
        activeStoriesMap,
        refreshActiveStories,
        getStoreActiveStories,
        openStoreStoriesModal,
        closeStoreStoriesModal,
        storiesModal,
        favoriteStoreIds,
        toggleFavoriteStore,
        isFavoriteStore,
      }}
    >
      {storiesModal.isOpen && (
        <StoreStoriesModal
          isOpen={storiesModal.isOpen}
          onClose={closeStoreStoriesModal}
          stories={storiesModal.stories}
          tenant={storiesModal.tenant}
          onGoToMenu={(slug) => {
            selectTenant(slug);
          }}
        />
      )}
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
