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
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import type { Product, Order } from "@/types";
import { TopFoodPortal } from "@/components/portal/TopFoodPortal";

type View = "portal" | "menu" | "checkout" | "tracking" | "admin" | "superadmin";

interface CustomerAppProps {
  onStoreAdminClick: () => void;
  onSuperAdminClick: () => void;
  onBackToPortal: () => void;
}

function CustomerApp({ onStoreAdminClick, onSuperAdminClick, onBackToPortal }: CustomerAppProps) {
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
  const isManualScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza categoria ativa com as categorias disponíveis da loja
  useEffect(() => {
    if (products.length > 0) {
      const hasActive = products.some((p) => p.category === activeCategory);
      if (!hasActive && products[0]?.category) {
        setActiveCategory(products[0].category);
      }
    }
  }, [products, activeCategory]);

  // Sincroniza metatags dinâmicas do PWA (título, apple-mobile-web-app-title, description, manifest e ícones da loja)
  useEffect(() => {
    if (!config?.name) return;

    const storeName = config.name.trim();
    const title = `${storeName} - Delivery`;
    const description = `Peça os melhores lanches em ${storeName}. Delivery rápido e prático.`;
    const logoUrl = config.logo && config.logo.trim() ? config.logo.trim() : "/icon-512.png";

    // 1. Atualiza title
    document.title = title;

    // 2. Atualiza apple-mobile-web-app-title para salvar na tela inicial com o nome da loja
    let metaAppleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!metaAppleTitle) {
      metaAppleTitle = document.createElement("meta");
      metaAppleTitle.setAttribute("name", "apple-mobile-web-app-title");
      document.head.appendChild(metaAppleTitle);
    }
    metaAppleTitle.setAttribute("content", storeName);

    // 3. Atualiza meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // 4. Atualiza link do manifest dinâmico exclusivo da loja
    if (config.slug) {
      const manifestUrl = `/api/pwa/manifest.json?slug=${encodeURIComponent(config.slug)}`;
      let linkManifest = document.querySelector('link[rel="manifest"]');
      if (!linkManifest) {
        linkManifest = document.createElement("link");
        linkManifest.setAttribute("rel", "manifest");
        document.head.appendChild(linkManifest);
      }
      linkManifest.setAttribute("href", manifestUrl);
    }

    // 5. Atualiza favicons e apple-touch-icon com a logo da lanchonete
    const linkIcon = document.querySelector('link[rel="icon"]');
    if (linkIcon) {
      linkIcon.setAttribute("href", logoUrl);
    }
    let linkAppleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!linkAppleIcon) {
      linkAppleIcon = document.createElement("link");
      linkAppleIcon.setAttribute("rel", "apple-touch-icon");
      document.head.appendChild(linkAppleIcon);
    }
    linkAppleIcon.setAttribute("href", logoUrl);
  }, [config?.name, config?.slug, config?.logo]);

  useEffect(() => {
    observerRef.current?.disconnect();

    const uniqueCategoryIds = Array.from(new Set(products.map((p) => p.category)));

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Ignora atualizações do observer se o usuário acabou de clicar em uma aba de categoria
        if (isManualScrollRef.current) return;

        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length === 0) return;

        // Dentre as seções visíveis, seleciona a mais próxima do topo de leitura
        let closest = visibleEntries[0];
        let minDistance = Infinity;

        for (const entry of visibleEntries) {
          const distance = Math.abs(entry.boundingClientRect.top - 80);
          if (distance < minDistance) {
            minDistance = distance;
            closest = entry;
          }
        }

        const catId = closest.target.id.replace("cat-", "");
        if (catId) {
          setActiveCategory((prev) => (prev !== catId ? catId : prev));
        }
      },
      {
        rootMargin: "-70px 0px -40% 0px",
        threshold: [0.1, 0.3],
      }
    );

    uniqueCategoryIds.forEach((catId) => {
      const el = document.getElementById(`cat-${catId}`);
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [products]);

  const handleCategoryClick = (id: string) => {
    setActiveCategory(id);
    isManualScrollRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrollRef.current = false;
    }, 850);

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

          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-xs text-gray-400">
              Por favor, confira o link fornecido pelo estabelecimento para acessar o cardápio.
            </p>
            <button
              type="button"
              onClick={onBackToPortal}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-dark px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              Ir para o Portal Top Food
            </button>
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
          setCustomerView("menu");
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 pb-32 sm:pb-36 transition-colors">
      <Header
        onStoreAdminClick={onStoreAdminClick}
        onSuperAdminClick={onSuperAdminClick}
        onBackToPortal={onBackToPortal}
      />
      <CategoryNav
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
        products={products}
      />

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

      {/* Card Flutuante de Acompanhamento de Pedido em Tempo Real */}
      <FloatingOrderTracker
        currentTenantSlug={config.slug}
        hasFloatingCart={cartCount > 0}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCustomerView("checkout");
        }}
      />

      {/* Banner de instalação PWA discreto (oculta automaticamente se já instalado) */}
      <div className="mx-auto max-w-2xl px-4 mt-8">
        <PWAInstallButton variant="banner" />
      </div>

      {/* Rodapé institucional com identidade isolada da vitrine */}
      <footer className="mt-12 border-t border-gray-200/60 dark:border-slate-800/60 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
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
    if (typeof window === "undefined") return "portal";
    const path = window.location.pathname.toLowerCase();

    // SEPARAÇÃO CRÍTICA DE ROTAS:
    // Apenas rotas administrativas explícitas podem ativar as telas de login administrativo.
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

    // Se houver query param explícito (?loja= ou ?store= ou ?tenant=)
    const params = new URLSearchParams(window.location.search);
    if (params.get("loja") || params.get("store") || params.get("tenant")) {
      return "menu";
    }

    // Se a rota for raiz ou /topfood ou /portal -> Home do Portal Top Food
    const clean = path.replace(/\/+$/, "");
    if (clean === "" || clean === "/" || clean === "/topfood" || clean === "/portal") {
      return "portal";
    }

    // Caso contrário, é uma rota direta de vitrine (ex: /ms-preparacoes, /loja/:slug, /burger-town)
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
          } else if (targetView === "portal") {
            window.history.pushState({ view: "portal" }, "", "/");
          } else {
            const slug = targetSlug || currentTenant?.slug || config.slug || "ms-preparacoes";
            window.history.pushState({ view: "menu", slug }, "", `/${slug}`);
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
        const clean = path.replace(/\/+$/, "");
        if (clean === "" || clean === "/" || clean === "/topfood" || clean === "/portal") {
          const params = new URLSearchParams(window.location.search);
          const qSlug = params.get("loja") || params.get("store") || params.get("tenant");
          if (qSlug) {
            selectTenant(qSlug);
            setView("menu");
          } else {
            setView("portal");
          }
        } else {
          // É uma rota de loja direta (ex: /ms-preparacoes ou /loja/:slug)
          let slug = "";
          const match = path.match(/^\/loja\/([^/?#]+)/i);
          if (match && match[1]) {
            slug = decodeURIComponent(match[1]).toLowerCase();
          } else {
            slug = path.replace(/^\/+|\/+$/g, "");
          }
          if (slug) {
            selectTenant(slug);
            setView("menu");
          }
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectTenant]);

  const renderMainView = () => {
    // 0. TOP FOOD PORTAL VIEW (Marketplace Homepage)
    if (view === "portal") {
      return (
        <TopFoodPortal
          onSelectStore={(slug) => {
            selectTenant(slug);
            navigateTo("menu", slug);
          }}
          onStoreAdminClick={() => navigateTo("admin")}
          onSuperAdminClick={() => navigateTo("superadmin")}
        />
      );
    }

    // 1. SUPER ADMIN VIEW
    if (view === "superadmin") {
      // If not authenticated as Super Admin, show the dedicated restricted login screen
      if (!isSuperAdmin) {
        return (
          <SuperAdminLogin
            onBack={() => navigateTo("portal")}
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
          onExit={() => navigateTo("portal")}
        />
      );
    }

    // 2. STORE ADMIN VIEW
    if (view === "admin") {
      // If not authenticated, show the store admin login screen
      if (!isAdminAuthed) {
        return (
          <StoreAdminLogin
            onBack={() => navigateTo("portal")}
            onSuccess={() => setView("admin")}
            onGoToSuperAdmin={() => navigateTo("superadmin")}
          />
        );
      }

      // Authenticated Store Admin Panel (locked to their tenant if role === tenant_admin)
      return (
        <AdminPanel
          onExit={() => navigateTo("portal")}
          onGoToSuperAdmin={isSuperAdmin ? () => navigateTo("superadmin") : undefined}
        />
      );
    }

    // 3. DEFAULT CUSTOMER STORE VIEW
    return (
      <CustomerApp
        onStoreAdminClick={() => navigateTo("admin")}
        onSuperAdminClick={() => navigateTo("superadmin")}
        onBackToPortal={() => navigateTo("portal")}
      />
    );
  };

  return (
    <>
      {renderMainView()}
      <OfflineIndicator />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Ocorreu um erro ao carregar o aplicativo">
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
}
