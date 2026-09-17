import { useState, useRef, useEffect, useCallback } from "react";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { Header } from "@/components/customer/Header";
import { CategoryNav } from "@/components/customer/CategoryNav";
import { MenuList } from "@/components/customer/MenuList";
import { ProductModal } from "@/components/customer/ProductModal";
import { FloatingCart } from "@/components/customer/FloatingCart";
import { FloatingOrderTracker } from "@/components/customer/FloatingOrderTracker";
import { CartDrawer } from "@/components/customer/CartDrawer";
import { Checkout } from "@/components/customer/Checkout";
import { OrderTracking } from "@/components/customer/OrderTracking";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { SuperAdminPanel } from "@/components/admin/SuperAdminPanel";
import { SuperAdminLogin } from "@/components/admin/SuperAdminLogin";
import { StoreAdminLogin } from "@/components/admin/StoreAdminLogin";
import { ToastContainer } from "@/components/common/Toast";
import type { Product, Order } from "@/types";

type View = "menu" | "checkout" | "tracking" | "admin" | "superadmin";

interface CustomerAppProps {
  onStoreAdminClick: () => void;
  onSuperAdminClick: () => void;
}

function CustomerApp({ onStoreAdminClick, onSuperAdminClick }: CustomerAppProps) {
  const {
    products,
    isStoreOpen,
    isStoreActive,
    config,
    isLoadingStore,
    storeNotFound,
    cartCount,
  } = useStore();
  const [activeCategory, setActiveCategory] = useState("lanches");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerView, setCustomerView] = useState<"menu" | "checkout" | "tracking">("menu");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const catId = entry.target.id.replace("cat-", "");
            setActiveCategory(catId);
          }
        });
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    products.forEach((p) => {
      const el = document.getElementById(`cat-${p.category}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [products]);

  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
    const el = document.getElementById(`cat-${id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (isLoadingStore) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <div>
            <h3 className="font-bold text-gray-800 text-base">Carregando cardápio...</h3>
            <p className="text-xs text-gray-500 mt-1">Buscando dados isolados da loja no D1/KV</p>
          </div>
        </div>
      </div>
    );
  }

  if (storeNotFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6 text-center">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-2xl">
            🍔
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Lanchonete Não Encontrada</h2>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            O endereço acessado não corresponde a nenhuma vitrine ativa ou o link está indisponível.
          </p>

          <div className="mt-6">
            <p className="text-xs text-gray-400">
              Por favor, confira o link fornecido pelo estabelecimento para acessar o cardápio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (customerView === "checkout") {
    return (
      <Checkout
        onClose={() => setCustomerView("menu")}
        onOrderPlaced={(order) => {
          setTrackedOrder(order);
          setCustomerView("tracking");
        }}
      />
    );
  }

  if (customerView === "tracking" && trackedOrder) {
    return (
      <OrderTracking
        order={trackedOrder}
        onBack={() => setCustomerView("menu")}
        onHome={() => setCustomerView("menu")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 pb-24 transition-colors">
      <Header
        onStoreAdminClick={onStoreAdminClick}
        onSuperAdminClick={onSuperAdminClick}
      />
      <CategoryNav activeCategory={activeCategory} onCategoryClick={handleCategoryClick} />

      {!isStoreActive ? (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className="rounded-xl bg-red-50 border border-red-300 px-4 py-3 text-center text-sm font-semibold text-red-700">
            {config.name} está temporariamente desativada pela plataforma. Pedidos estão suspensos.
          </div>
        </div>
      ) : !isStoreOpen ? (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center text-sm text-amber-700">
            {config.name} está fechado no momento. Você pode navegar pelo cardápio, mas não é possível finalizar pedidos.
          </div>
        </div>
      ) : null}

      <MenuList products={products} onProductClick={setSelectedProduct} />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdded={() => {
            setSelectedProduct(null);
            setCartOpen(true);
          }}
        />
      )}

      <FloatingCart onClick={() => setCartOpen(true)} />

      {/* Card/Banner Flutuante de Rastreio de Pedido em Tempo Real */}
      <FloatingOrderTracker
        currentTenantSlug={config.slug}
        hasFloatingCart={cartCount > 0}
        onOpenOrder={(order) => {
          setTrackedOrder(order);
          setCustomerView("tracking");
        }}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCustomerView("checkout");
        }}
      />

      {/* Rodapé institucional com identidade isolada da vitrine */}
      <footer className="mt-16 border-t border-gray-200/60 dark:border-slate-800/60 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
        <div className="mx-auto max-w-2xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{config.name}</span>
            <span>•</span>
            <span>Cardápio Digital Oficial</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onStoreAdminClick}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition text-[11px] underline"
            >
              Área do Lojista
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AppContent() {
  const {
    isSuperAdmin,
    isAdminAuthed,
    selectTenant,
    currentTenant,
    config,
    toasts,
    dismissToast,
  } = useStore();

  const getInitialView = (): View => {
    if (typeof window === "undefined") return "menu";
    const path = window.location.pathname.toLowerCase();

    // SEPARAÇÃO CRÍTICA DE ROTAS:
    // Apenas rotas administrativas explícitas podem ativar as telas de login administrativo.
    // Todas as outras URLs (ex: /loja/:slug, /, /?store=...) abrem estritamente no MODO CLIENTE.
    if (
      path === "/super-admin" ||
      path === "/superadmin" ||
      path.startsWith("/super-admin/") ||
      path.startsWith("/superadmin/")
    ) {
      return "superadmin";
    }

    if (path === "/admin" || path.startsWith("/admin/")) {
      return "admin";
    }

    return "menu";
  };

  const [view, setView] = useState<View>(getInitialView);

  // Sync with browser URL history using standard HTML5 History API
  const navigateTo = useCallback(
    (targetView: View, targetSlug?: string) => {
      if (typeof window !== "undefined") {
        try {
          if (targetView === "superadmin") {
            window.history.pushState({ view: "superadmin" }, "", "/super-admin");
          } else if (targetView === "admin") {
            window.history.pushState({ view: "admin" }, "", "/admin");
          } else {
            const slug = targetSlug || currentTenant?.slug || config.slug || "marcelino";
            window.history.pushState({ view: "menu", slug }, "", `/loja/${slug}`);
          }
        } catch (err) {
          console.warn("History pushState error:", err);
        }
      }
      setView(targetView);
    },
    [currentTenant?.slug, config.slug]
  );

  // Listen for browser back/forward navigation (HTML5 popstate event)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const path = window.location.pathname.toLowerCase();

      if (
        path === "/super-admin" ||
        path === "/superadmin" ||
        path.startsWith("/super-admin/") ||
        path.startsWith("/superadmin/")
      ) {
        setView("superadmin");
      } else if (path === "/admin" || path.startsWith("/admin/")) {
        setView("admin");
      } else {
        setView("menu");
        // Se a rota for /loja/:slug, sincronizar com o tenant correspondente
        const match = window.location.pathname.match(/^\/loja\/([^/?#]+)/i);
        if (match && match[1]) {
          selectTenant(decodeURIComponent(match[1]).toLowerCase());
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectTenant]);

  const renderMainView = () => {
    // 1. SUPER ADMIN VIEW
    if (view === "superadmin") {
      // If not authenticated as Super Admin, show the dedicated restricted login screen
      if (!isSuperAdmin) {
        return (
          <SuperAdminLogin
            onBack={() => navigateTo("menu")}
            onSuccess={() => setView("superadmin")}
          />
        );
      }

      // Authenticated Super Admin Dashboard
      return (
        <SuperAdminPanel
          onManageStore={(tenant) => {
            selectTenant(tenant.slug);
            navigateTo("admin");
          }}
          onViewStoreFront={(tenant) => {
            selectTenant(tenant.slug);
            navigateTo("menu");
          }}
          onExit={() => navigateTo("menu")}
        />
      );
    }

    // 2. STORE ADMIN VIEW
    if (view === "admin") {
      // If not authenticated, show the store admin login screen
      if (!isAdminAuthed) {
        return (
          <StoreAdminLogin
            onBack={() => navigateTo("menu")}
            onSuccess={() => setView("admin")}
            onGoToSuperAdmin={() => navigateTo("superadmin")}
          />
        );
      }

      // Authenticated Store Admin Panel (locked to their tenant if role === tenant_admin)
      return (
        <AdminPanel
          onExit={() => navigateTo("menu")}
          onGoToSuperAdmin={isSuperAdmin ? () => navigateTo("superadmin") : undefined}
        />
      );
    }

    // 3. DEFAULT CUSTOMER STORE VIEW
    return (
      <CustomerApp
        onStoreAdminClick={() => navigateTo("admin")}
        onSuperAdminClick={() => navigateTo("superadmin")}
      />
    );
  };

  return (
    <>
      {renderMainView()}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
