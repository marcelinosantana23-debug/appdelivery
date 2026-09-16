import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { CartItem, Product, ProductOption, Order, OrderStatus, Tenant, User, UserRole, TenantStatus, TenantCredential } from "@/types";
import { defaultStoreConfig, type StoreConfig } from "@/config/store";
import {
  fetchTenantsApi,
  fetchTenantDetailsApi,
  fetchTenantProductsApi,
  fetchTenantOrdersApi,
  createTenantApi,
  updateTenantApi,
  updateTenantStatusApi,
  deleteTenantApi,
  createTenantProductApi,
  updateTenantProductApi,
  deleteTenantProductApi,
  createTenantOrderApi,
  updateTenantOrderStatusApi,
  loginApi,
  updateSuperAdminCredentialsApi,
  fetchTenantCredentialsApi,
  fetchAllTenantCredentialsApi,
  updateTenantCredentialsApi,
} from "@/services/api";
import { getSafeDisplayName, getSafeSlug } from "@/components/common/StoreLogo";
import { playNewOrderChime } from "@/utils/audio";

interface StoreContextValue {
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

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("delivery_user_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentSlug, setCurrentSlug] = useState<string>(initialSlug);
  const [isLoadingStore, setIsLoadingStore] = useState<boolean>(true);
  const [storeNotFound, setStoreNotFound] = useState<boolean>(false);

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
      const slug = getInitialSlug();
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
          localStorage.setItem("delivery_user_session", JSON.stringify(res.user));
          if (res.tenant) {
            localStorage.setItem("delivery_tenant_session", JSON.stringify(res.tenant));
          }
          if (res.token) {
            localStorage.setItem("delivery_auth_token", res.token);
          }
        } catch (e) {
          console.warn("Could not save session to localStorage", e);
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
      localStorage.removeItem("delivery_user_session");
      localStorage.removeItem("delivery_tenant_session");
      localStorage.removeItem("delivery_auth_token");
    } catch (e) {
      console.warn("Could not remove session from localStorage", e);
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
          localStorage.setItem("delivery_user_session", JSON.stringify(res.user));
        } catch (e) {
          console.warn("Could not save updated session to localStorage", e);
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
    if (currentTenant) {
      await updateTenantApi(currentTenant.id, { isOpen: nextState });
    }
  }, [config.isOpen, currentTenant]);

  // ---------------- PRODUCT MANAGEMENT ----------------
  const addProduct = useCallback(
    async (productData: Omit<Product, "id" | "tenantId">): Promise<Product | null> => {
      if (!currentTenant) return null;
      const res = await createTenantProductApi(currentTenant.id, productData);
      if (res.success && res.product) {
        setProducts((prev) => [res.product!, ...prev]);
        return res.product;
      }
      return null;
    },
    [currentTenant]
  );

  const editProduct = useCallback(
    async (productId: string, partial: Partial<Product>) => {
      if (!currentTenant) return;
      const res = await updateTenantProductApi(currentTenant.id, productId, partial);
      if (res.success && res.product) {
        setProducts((prev) => prev.map((p) => (p.id === productId ? res.product! : p)));
      }
    },
    [currentTenant]
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      if (!currentTenant) return;
      const res = await deleteTenantProductApi(currentTenant.id, productId);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    },
    [currentTenant]
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
    },
    []
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
      const res = await createTenantOrderApi(tenantId, {
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
        statusHistory: order.statusHistory,
      });

      if (res.success && res.order) {
        setOrders((prev) => [res.order!, ...prev]);
        setNewOrderIds((prev) => [res.order!.id, ...prev]);
        return res.order;
      } else {
        // Fallback local
        setOrders((prev) => [order, ...prev]);
        setNewOrderIds((prev) => [order.id, ...prev]);
        return order;
      }
    },
    [currentTenant, currentSlug]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const tenantId = currentTenant?.id || "tenant-burger-town";
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status,
                statusHistory: [...o.statusHistory, { status, timestamp: Date.now() }],
              }
            : o
        )
      );

      await updateTenantOrderStatusApi(tenantId, orderId, status);
    },
    [currentTenant]
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
    if (!currentTenant?.id) return;
    const tenantId = currentTenant.id;
    let isMounted = true;

    // Polling contínuo a cada 3 segundos garantindo sincronização no Hono/D1
    const syncOrders = async () => {
      try {
        const res = await fetchTenantOrdersApi(tenantId);
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

          setOrders(incoming);
          knownOrderIdsRef.current = new Set(incoming.map((o) => o.id));
        }
      } catch (err) {
        console.warn("Erro na sincronização de pedidos em tempo real:", err);
      }
    };

    const intervalId = setInterval(syncOrders, 3000);

    // Canal Server-Sent Events (SSE) para entrega instantânea
    let eventSource: EventSource | null = null;
    if (typeof EventSource !== "undefined") {
      try {
        eventSource = new EventSource(`/api/tenants/${tenantId}/orders/stream`);
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
      clearInterval(intervalId);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentTenant?.id, soundEnabled]);

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
