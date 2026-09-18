import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { CartItem, Product, ProductOption, Order, OrderStatus, Tenant, User, UserRole, TenantStatus, TenantCredential } from "@/types";
import { defaultStoreConfig, type StoreConfig } from "@/config/store";
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
  createTenantOrderApi,
  updateOrderStatusApi,
  loginApi,
  verifyAuthSessionApi,
  updateSuperAdminCredentialsApi,
  fetchTenantCredentialsApi,
  fetchAllTenantCredentialsApi,
  updateTenantCredentialsApi,
} from "@/services/api";
import { getSafeDisplayName, getSafeSlug } from "@/components/common/StoreLogo";
import { playNewOrderChime } from "@/utils/audio";
import type { ToastMessage } from "@/components/common/Toast";

interface StoreContextValue {
  // Feedback & Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  dismissToast: (id: string) => void;

  // Multi-tenant state
  tenants: Tenant[];
  currentTenant: Tenant | null;
  config: StoreConfig;
  updateConfig: (partial: Partial<StoreConfig>) => Promise<void>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  isStoreOpen: boolean;
  toggleStore: () => void;
  isStoreActive: boolean;
  currentSlug: string;
  selectTenant: (slugOrId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
  refreshCurrentStore: () => Promise<void>;
  isLoadingStore: boolean;
  storeNotFound: boolean;

  // Product management (Tenant Admin)
  addProduct: (product: Omit<Product, "id" | "tenantId">) => Promise<Product | null>;
  editProduct: (productId: string, partial: Partial<Product>) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;

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

  // Super Admin actions
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
  }) => Promise<{ success: boolean; tenant?: Tenant; user?: User; error?: string }>;
  toggleTenantStatus: (slugOrId: string, status: TenantStatus) => Promise<boolean>;
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
  };
}

function getInitialUrlSlug(): string {
  if (typeof window === "undefined") return "marcelino";
  const path = window.location.pathname;

  // 1. /loja/:slug
  const match = path.match(/^\/loja\/([^/?#]+)/i);
  if (match && match[1]) return decodeURIComponent(match[1]).toLowerCase();

  // 2. Hash routing fallback #/loja/:slug
  if (window.location.hash) {
    const hashMatch = window.location.hash.match(/#\/?loja\/([^/?#]+)/i);
    if (hashMatch && hashMatch[1]) return decodeURIComponent(hashMatch[1]).toLowerCase();
  }

  // 3. Query string (?loja=slug ou ?tenant=slug)
  const params = new URLSearchParams(window.location.search);
  const qSlug = params.get("loja") || params.get("tenant") || params.get("store");
  if (qSlug) return decodeURIComponent(qSlug).toLowerCase();

  // 4. Direct single-segment path /:slug (quando não for /admin, /super-admin, etc)
  if (
    path &&
    path !== "/" &&
    !path.startsWith("/admin") &&
    !path.startsWith("/superadmin") &&
    !path.startsWith("/super-admin") &&
    !path.startsWith("/api") &&
    !path.startsWith("/health")
  ) {
    const direct = path.replace(/^\/+|\/+$/g, "");
    if (direct && !direct.includes("/")) {
      return decodeURIComponent(direct).toLowerCase();
    }
  }

  // 5. Se o lojista estiver logado ou recarregando (F5) no painel /admin, recupera a loja da sessão
  try {
    const savedTenant = localStorage.getItem("delivery_tenant_session");
    if (savedTenant) {
      const parsed = JSON.parse(savedTenant);
      if (parsed?.slug) return parsed.slug;
    }
    const savedUser = localStorage.getItem("delivery_user_session");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user?.tenantId === "tenant-ms-preparacoes" || user?.email?.includes("marcelino")) {
        return "marcelino";
      }
    }
  } catch {
    // ignore
  }

  return "marcelino";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const initialSlug = getInitialUrlSlug();
  
  // Hydrate currentTenant from localStorage session ONLY if it matches the current URL slug
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    try {
      const saved = localStorage.getItem("delivery_tenant_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          (parsed.slug === initialSlug ||
            parsed.id === initialSlug ||
            (initialSlug === "ms-preparacoes" && parsed.slug === "marcelino") ||
            (initialSlug === "marcelino" && parsed.slug === "ms-preparacoes"))
        ) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // Hydrate store configuration safely
  const [config, setConfig] = useState<StoreConfig>(() => {
    try {
      const savedTenant = localStorage.getItem("delivery_tenant_session");
      if (savedTenant) {
        const parsed = JSON.parse(savedTenant);
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed.slug === initialSlug ||
            parsed.id === initialSlug ||
            (initialSlug === "ms-preparacoes" && parsed.slug === "marcelino") ||
            (initialSlug === "marcelino" && parsed.slug === "ms-preparacoes"))
        ) {
          return tenantToStoreConfig(parsed);
        }
      }
    } catch {
      // ignore
    }
    return defaultStoreConfig;
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [isLoadingStore, setIsLoadingStore] = useState<boolean>(true);
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

  // Load tenants list
  const refreshTenants = useCallback(async () => {
    const res = await fetchTenantsApi();
    if (res.success && res.tenants) {
      setTenants(res.tenants);
    }
  }, []);

  // Load current store data with strict isolation
  const loadStoreBySlug = useCallback(
    async (slug: string) => {
      setIsLoadingStore(true);
      setStoreNotFound(false);

      // Total isolation: clear products, cart, and orders immediately so no previous store data remains
      setProducts([]);
      setCart([]);
      setOrders([]);

      const tenantRes = await fetchTenantDetailsApi(slug);
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

        // Fetch ONLY this tenant's products and orders from database
        const [pRes, oRes] = await Promise.all([
          fetchTenantProductsApi(t.id),
          fetchTenantOrdersApi(t.id),
        ]);

        if (pRes.success && pRes.products) {
          setProducts(pRes.products);
        } else {
          setProducts([]);
        }

        if (oRes.success && oRes.orders) {
          setOrders(oRes.orders);
        } else {
          setOrders([]);
        }

        setIsLoadingStore(false);
      } else {
        setStoreNotFound(true);
        setCurrentTenant(null);
        setIsLoadingStore(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    refreshTenants();
    loadStoreBySlug(currentSlug);
  }, [currentSlug, refreshTenants, loadStoreBySlug]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const slug = getInitialUrlSlug();
      setCurrentSlug(slug);
      loadStoreBySlug(slug);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadStoreBySlug]);

  const selectTenant = useCallback(
    async (slugOrId: string) => {
      setCurrentSlug(slugOrId);
      setCart([]); // Clear cart when switching store

      // Update URL without reload
      if (typeof window !== "undefined") {
        const newPath = `/loja/${slugOrId}`;
        window.history.pushState({ path: newPath }, "", newPath);
      }

      await loadStoreBySlug(slugOrId);
    },
    [loadStoreBySlug]
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
      const res = await updateSuperAdminCredentialsApi({
        email,
        password,
        userId: currentUser?.id,
      });

      if (res.success && res.user) {
        setCurrentUser(res.user);
        try {
          sessionStorage.setItem("topfood_admin_session", JSON.stringify(res.user));
        } catch (e) {
          console.warn("Could not save updated session to sessionStorage", e);
        }
        return { success: true, message: res.message };
      }
      return { success: false, error: res.error || "Erro ao atualizar credenciais" };
    },
    [currentUser?.id]
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
      setConfig((prev) => {
        const next = { ...prev, ...partial };
        applyThemeColors(next);
        return next;
      });
      if (currentTenant) {
        const updated = await updateTenantApi(currentTenant.id, partial);
        if (updated.success && updated.tenant) {
          setCurrentTenant(updated.tenant);
          setTenants((prev) =>
            prev.map((t) => (t.id === updated.tenant!.id ? updated.tenant! : t))
          );
        }
      }
    },
    [currentTenant]
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

  // ---------------- PRODUCT MANAGEMENT ----------------
  const addProduct = useCallback(
    async (productData: Omit<Product, "id" | "tenantId">): Promise<Product | null> => {
      if (!currentTenant) return null;
      try {
        const res = await createTenantProductApi(currentTenant.id, productData);
        if (res.success && res.product) {
          setProducts((prev) => [res.product!, ...prev]);
          showToast("Produto cadastrado com sucesso!", "success");
          return res.product;
        }
      } catch (e) {
        console.warn("Erro ao criar produto:", e);
        showToast("Falha ao salvar produto no banco.", "error");
      }
      return null;
    },
    [currentTenant, showToast]
  );

  const editProduct = useCallback(
    async (productId: string, partial: Partial<Product>) => {
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
        await updateTenantProductApi(currentTenant.id, productId, partial);
      } catch (e) {
        console.warn("Erro ao persistir edição de produto:", e);
      }
    },
    [currentTenant, showToast]
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

  const clearCart = useCallback(() => setCart([]), []);

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

        showToast("Pedido confirmado com sucesso!", "success");
        return finalOrder;
      } catch (err: any) {
        console.warn("Erro ao registrar pedido no backend:", err);
        // Fallback local seguro
        setOrders((prev) => [order, ...prev]);
        setNewOrderIds((prev) => [order.id, ...prev]);
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
      setOrders((prev) =>
        prev.map((o) => {
          if (
            o.id === orderId ||
            o.id === `#${orderId}` ||
            o.id.replace(/^#/, "") === orderId.replace(/^#/, "")
          ) {
            return {
              ...o,
              status,
              statusHistory: [...(o.statusHistory || []), { status, timestamp: Date.now() }],
            };
          }
          return o;
        })
      );

      // 2. Se for o pedido ativo do cliente no localStorage, sincroniza na hora
      try {
        const activeId = localStorage.getItem("topfood_active_order_id");
        if (
          activeId &&
          (activeId === orderId || activeId.replace(/^#/, "") === orderId.replace(/^#/, ""))
        ) {
          localStorage.setItem("topfood_active_order_status", status);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("topfood-active-order-updated", {
                detail: { orderId, status },
              })
            );
          }
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

  // ---------------- ESCUTA DE PEDIDOS EM TEMPO REAL (D1/KV + POLLING A CADA 3s + SSE) ----------------
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

    // Polling contínuo e automático a cada 3 segundos (GET /api/orders?tenantId=...)
    const syncOrders = async () => {
      try {
        const res = await fetchOrdersApi(tenantParam);
        if (!isMounted) return;

        if (res.success && res.orders) {
          const incoming: Order[] = res.orders;
          const prevIds = knownOrderIdsRef.current;

          // Se já conhecíamos pedidos anteriores e novos foram recebidos (ex: cliente fez pedido na vitrine)
          if (prevIds.size > 0) {
            const newlyArrived = incoming.filter((o) => !prevIds.has(o.id));
            if (newlyArrived.length > 0) {
              if (soundEnabled) {
                playNewOrderChime();
              }
              const freshIds = newlyArrived.map((o) => o.id);
              setNewOrderIds((prev) => Array.from(new Set([...freshIds, ...prev])));

              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("new-delivery-order-received", {
                    detail: { orders: newlyArrived },
                  })
                );
              }
            }
          }

          // Atualiza o estado global dos pedidos no React
          setOrders(incoming);
          knownOrderIdsRef.current = new Set(incoming.map((o) => o.id));

          // Sincroniza pedido ativo no localStorage caso seu status tenha mudado
          try {
            const activeId = localStorage.getItem("topfood_active_order_id");
            if (activeId) {
              const matched = incoming.find(
                (o) =>
                  o.id === activeId ||
                  o.id === `#${activeId}` ||
                  o.id.replace(/^#/, "") === activeId.replace(/^#/, "")
              );
              if (matched) {
                const prevStatus = localStorage.getItem("topfood_active_order_status");
                if (prevStatus !== matched.status) {
                  localStorage.setItem("topfood_active_order_status", matched.status);
                  localStorage.setItem("topfood_active_order_data", JSON.stringify(matched));
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("topfood-active-order-updated", {
                        detail: { orderId: matched.id, status: matched.status, order: matched },
                      })
                    );
                  }
                }
              }
            }
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn("Aviso no polling de pedidos (a cada 3s):", err);
      }
    };

    // Executa uma sincronização inicial de pedidos na montagem
    syncOrders();
    // Removido o polling contínuo de 3s para evitar requisições de rede em segundo plano;
    // a atualização em tempo real é mantida via Server-Sent Events (SSE) abaixo.

    // Canal Server-Sent Events (SSE) para atualização push quando suportado
    let eventSource: EventSource | null = null;
    if (typeof EventSource !== "undefined" && currentTenant?.id) {
      try {
        eventSource = new EventSource(`/api/tenants/${currentTenant.id}/orders/stream`);
        eventSource.addEventListener("orders", (e) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            if (data?.orders && Array.isArray(data.orders)) {
              const incoming: Order[] = data.orders;
              const prevIds = knownOrderIdsRef.current;
              if (prevIds.size > 0) {
                const newlyArrived = incoming.filter((o) => !prevIds.has(o.id));
                if (newlyArrived.length > 0) {
                  if (soundEnabled) {
                    playNewOrderChime();
                  }
                  const freshIds = newlyArrived.map((o) => o.id);
                  setNewOrderIds((prev) => Array.from(new Set([...freshIds, ...prev])));
                }
              }
              setOrders(incoming);
              knownOrderIdsRef.current = new Set(incoming.map((o) => o.id));
            }
          } catch (err) {
            console.warn("SSE parse error:", err);
          }
        });
      } catch (err) {
        console.warn("SSE not available:", err);
      }
    }

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentTenant?.id, currentTenant?.slug, currentSlug, soundEnabled]);

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
    }) => {
      const res = await createTenantApi(data);
      if (res.success && res.tenant) {
        await refreshTenants();
      }
      return res;
    },
    [refreshTenants]
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

  const deleteTenant = useCallback(
    async (slugOrId: string) => {
      const res = await deleteTenantApi(slugOrId);
      if (res.success) {
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
  const isSuperAdmin = currentUser?.role === "super_admin";

  return (
    <StoreContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        tenants,
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
        storeNotFound,
        addProduct,
        editProduct,
        removeProduct,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        orders,
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
        toggleTenantStatus,
        deleteTenant,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
