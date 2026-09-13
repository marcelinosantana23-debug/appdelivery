import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { CartItem, Product, ProductOption, Order, OrderStatus } from "@/types";
import { mockProducts } from "@/data/mockData";
import { defaultStoreConfig, ADMIN_CREDENTIALS, type StoreConfig } from "@/config/store";

interface StoreContextValue {
  config: StoreConfig;
  updateConfig: (partial: Partial<StoreConfig>) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  isStoreOpen: boolean;
  toggleStore: () => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity: number, selectedOptions: ProductOption[], notes: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  newOrderIds: string[];
  clearNewOrderFlag: (orderId: string) => void;
  isAdminAuthed: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const LS_KEYS = {
  config: "delivery_config",
  products: "delivery_products",
  orders: "delivery_orders",
  storeOpen: "delivery_store_open",
  adminAuth: "delivery_admin_auth",
};

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function saveToLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function applyThemeColors(config: StoreConfig) {
  document.documentElement.style.setProperty("--color-primary", config.primaryColor);
  document.documentElement.style.setProperty("--color-primary-dark", config.primaryDark);
  document.documentElement.style.setProperty("--color-primary-light", config.primaryLight);
  document.documentElement.style.setProperty("--color-accent", config.accentColor);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoreConfig>(() => {
    const loaded = loadFromLS<Partial<StoreConfig>>(LS_KEYS.config, {});
    return { ...defaultStoreConfig, ...loaded };
  });
  const [products, setProducts] = useState<Product[]>(() => loadFromLS(LS_KEYS.products, mockProducts));
  const [isStoreOpen, setIsStoreOpen] = useState<boolean>(() => loadFromLS(LS_KEYS.storeOpen, true));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => loadFromLS(LS_KEYS.orders, []));
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(
    () => loadFromLS(LS_KEYS.adminAuth, false)
  );

  // Persist to localStorage
  useEffect(() => saveToLS(LS_KEYS.config, config), [config]);
  useEffect(() => saveToLS(LS_KEYS.products, products), [products]);
  useEffect(() => saveToLS(LS_KEYS.storeOpen, isStoreOpen), [isStoreOpen]);
  useEffect(() => saveToLS(LS_KEYS.orders, orders), [orders]);
  useEffect(() => saveToLS(LS_KEYS.adminAuth, isAdminAuthed), [isAdminAuthed]);

  // Apply theme colors whenever config changes
  useEffect(() => applyThemeColors(config), [config]);

  const updateConfig = useCallback((partial: Partial<StoreConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const toggleStore = useCallback(() => setIsStoreOpen((prev) => !prev), []);

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
        .map((item) =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + delta } : item
        )
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
      sum +
      item.quantity * (item.product.price + item.selectedOptions.reduce((s, o) => s + o.price, 0)),
    0
  );

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setNewOrderIds((prev) => [order.id, ...prev]);
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              statusHistory: [...order.statusHistory, { status, timestamp: Date.now() }],
            }
          : order
      )
    );
  }, []);

  const clearNewOrderFlag = useCallback((orderId: string) => {
    setNewOrderIds((prev) => prev.filter((id) => id !== orderId));
  }, []);

  const login = useCallback((email: string, password: string): boolean => {
    if (email.trim().toLowerCase() === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      setIsAdminAuthed(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setIsAdminAuthed(false), []);

  return (
    <StoreContext.Provider
      value={{
        config,
        updateConfig,
        products,
        setProducts,
        isStoreOpen,
        toggleStore,
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
        isAdminAuthed,
        login,
        logout,
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
