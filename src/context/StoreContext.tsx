import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { CartItem, Product, ProductOption, Order, OrderStatus, Tenant, User, UserRole, TenantStatus } from "@/types";
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
} from "@/services/api";

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

  // Orders
  orders: Order[];
  addOrder: (order: Order) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  newOrderIds: string[];
  clearNewOrderFlag: (orderId: string) => void;

  // Auth & Roles
  currentUser: User | null;
  userRole: UserRole | null;
  isAdminAuthed: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;

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
  }) => Promise<{ success: boolean; tenant?: Tenant; user?: User; error?: string }>;
  toggleTenantStatus: (slugOrId: string, status: TenantStatus) => Promise<boolean>;
  deleteTenant: (slugOrId: string) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function applyThemeColors(config: StoreConfig) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--color-primary", config.primaryColor || "#E63946");
  document.documentElement.style.setProperty("--color-primary-dark", config.primaryDark || "#C1121F");
  document.documentElement.style.setProperty("--color-primary-light", config.primaryLight || "#F77F00");
  document.documentElement.style.setProperty("--color-accent", config.accentColor || "#FCBF49");
}

function tenantToStoreConfig(t: Tenant): StoreConfig {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    logo: t.logo || "🏪",
    whatsapp: t.whatsapp,
    pixKey: t.pixKey,
    pixKeyType: t.pixKeyType || "email",
    deliveryFee: t.deliveryFee,
    currency: "R$",
    address: t.address,
    hours: t.hours,
    primaryColor: t.primaryColor || "#E63946",
    primaryDark: t.primaryDark || "#C1121F",
    primaryLight: t.primaryLight || "#F77F00",
    accentColor: t.accentColor || "#FCBF49",
    status: t.status,
    isOpen: t.isOpen,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<StoreConfig>(defaultStoreConfig);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("delivery_user_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Extract initial slug from URL pathname (e.g. /loja/:slug) or query (?loja=slug)
  const getInitialSlug = (): string => {
    if (typeof window === "undefined") return "burger-town";
    const path = window.location.pathname;
    const match = path.match(/^\/loja\/([^/?#]+)/);
    if (match && match[1]) return match[1];

    const params = new URLSearchParams(window.location.search);
    const qSlug = params.get("loja") || params.get("tenant");
    if (qSlug) return qSlug;

    return "burger-town";
  };

  const [currentSlug, setCurrentSlug] = useState<string>(getInitialSlug);
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
    async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      const res = await loginApi(email, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        try {
          localStorage.setItem("delivery_user_session", JSON.stringify(res.user));
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
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin") && !window.location.pathname.startsWith("/superadmin")) {
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
    } catch (e) {
      console.warn("Could not remove session from localStorage", e);
    }
  }, []);

  // ---------------- STORE CONFIG & SETTINGS ----------------
  const updateConfig = useCallback(
    async (partial: Partial<StoreConfig>) => {
      setConfig((prev) => ({ ...prev, ...partial }));
      if (currentTenant) {
        const updated = await updateTenantApi(currentTenant.id, partial);
        if (updated.success && updated.tenant) {
          setCurrentTenant(updated.tenant);
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
      const tenantId = currentTenant?.id || "tenant-burger-town";
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
    [currentTenant]
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
        currentUser,
        userRole,
        isAdminAuthed,
        isSuperAdmin,
        login,
        logout,
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
