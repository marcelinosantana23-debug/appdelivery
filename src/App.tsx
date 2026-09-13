import { useState, useRef, useEffect } from "react";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { Header } from "@/components/customer/Header";
import { CategoryNav } from "@/components/customer/CategoryNav";
import { MenuList } from "@/components/customer/MenuList";
import { ProductModal } from "@/components/customer/ProductModal";
import { FloatingCart } from "@/components/customer/FloatingCart";
import { CartDrawer } from "@/components/customer/CartDrawer";
import { Checkout } from "@/components/customer/Checkout";
import { OrderTracking } from "@/components/customer/OrderTracking";
import { AdminPanel } from "@/components/admin/AdminPanel";
import type { Product, Order } from "@/types";

type View = "menu" | "checkout" | "tracking" | "admin";

function CustomerApp({ onAdminClick }: { onAdminClick: () => void }) {
  const { products, isStoreOpen, config } = useStore();
  const [activeCategory, setActiveCategory] = useState("lanches");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<"menu" | "checkout" | "tracking">("menu");
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

  if (view === "checkout") {
    return (
      <Checkout
        onClose={() => setView("menu")}
        onOrderPlaced={(order) => {
          setTrackedOrder(order);
          setView("tracking");
        }}
      />
    );
  }

  if (view === "tracking" && trackedOrder) {
    return (
      <OrderTracking
        order={trackedOrder}
        onBack={() => setView("menu")}
        onHome={() => setView("menu")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header onAdminClick={onAdminClick} />
      <CategoryNav activeCategory={activeCategory} onCategoryClick={handleCategoryClick} />

      {!isStoreOpen && (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center text-sm text-red-600">
            {config.name} está fechado no momento. Você pode navegar pelo cardápio, mas não é possível finalizar pedidos.
          </div>
        </div>
      )}

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

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setView("checkout");
        }}
      />
    </div>
  );
}

function AppContent() {
  const [view, setView] = useState<View>("menu");

  if (view === "admin") {
    return <AdminPanel onExit={() => setView("menu")} />;
  }

  return <CustomerApp onAdminClick={() => setView("admin")} />;
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
