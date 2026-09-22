import { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { PortalHeader } from "./PortalHeader";
import { EstablishmentCategories } from "./EstablishmentCategories";
import { DEFAULT_ESTABLISHMENT_CATEGORIES, matchStoreCategory } from "./portalUtils";
import { FeaturedStoresCarousel } from "./FeaturedStoresCarousel";
import { TopSellingProductsCarousel } from "./TopSellingProductsCarousel";
import { CategoryStoreSection } from "./CategoryStoreSection";
import type { EstablishmentCategory, Tenant } from "@/types";
import { Store, SearchX } from "lucide-react";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";

interface TopFoodPortalProps {
  onSelectStore: (slug: string) => void;
  onStoreAdminClick: () => void;
  onSuperAdminClick: () => void;
}

export function TopFoodPortal({
  onSelectStore,
  onStoreAdminClick,
  onSuperAdminClick,
}: TopFoodPortalProps) {
  const { tenants, establishmentCategories } = useStore();
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Apenas lojas ativas no marketplace, com destaque/patrocinadas primeiro por prioridade decrescente
  const activeTenants = useMemo(() => {
    return (tenants || [])
      .filter((t) => t.status !== "inactive")
      .sort((a, b) => {
        const aFeat = a.isFeatured ? 1 : 0;
        const bFeat = b.isFeatured ? 1 : 0;
        if (aFeat !== bFeat) return bFeat - aFeat;
        const aPri = a.priorityOrder || 0;
        const bPri = b.priorityOrder || 0;
        if (aPri !== bPri) return bPri - aPri;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [tenants]);

  // Lista consolidada de categorias cadastradas no Cloudflare D1
  const allCategories = useMemo<EstablishmentCategory[]>(() => {
    const fromDb = establishmentCategories || [];
    const base = fromDb.length > 0 ? [...fromDb] : DEFAULT_ESTABLISHMENT_CATEGORIES.filter((c) => c.id !== "todos");
    return [...base].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [establishmentCategories]);

  // Agrupamento de estabelecimentos por categoria ativa
  const groupedTenants = useMemo(() => {
    const groups: { category: EstablishmentCategory; stores: Tenant[] }[] = [];

    allCategories.forEach((cat) => {
      const storesInCat = activeTenants.filter((tenant) => {
        const matched = matchStoreCategory(tenant, allCategories);
        if (matched.id !== cat.id) return false;

        // Se houver busca por texto
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const searchPool = `${tenant.name} ${tenant.tagline || ""} ${tenant.address || ""} ${tenant.businessType || ""} ${tenant.slug}`.toLowerCase();
          if (!searchPool.includes(query)) return false;
        }

        return true;
      });

      if (storesInCat.length > 0) {
        groups.push({ category: cat, stores: storesInCat });
      }
    });

    return groups;
  }, [allCategories, activeTenants, searchQuery]);

  // Filtra as categorias exibidas caso o usuário tenha clicado em uma categoria específica no topo
  const displayedGroups = useMemo(() => {
    if (activeCategory === "todos") {
      return groupedTenants;
    }
    return groupedTenants.filter(
      (g) =>
        g.category.id === activeCategory ||
        g.category.name.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [groupedTenants, activeCategory]);

  // Total de lojas correspondentes no filtro atual
  const totalFilteredCount = useMemo(() => {
    return displayedGroups.reduce((acc, g) => acc + g.stores.length, 0);
  }, [displayedGroups]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      {/* Header Oficial do Portal Top Food */}
      <PortalHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onStoreAdminClick={onStoreAdminClick}
        totalStores={activeTenants.length}
      />

      {/* Barra de Categorias de Estabelecimentos (Scroll Horizontal dinâmico) */}
      <EstablishmentCategories
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        tenants={activeTenants}
      />

      {/* Conteúdo Principal do Marketplace */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-12">
        {/* Carrosséis do Topo da Vitrine Principal */}
        {!searchQuery && activeCategory === "todos" && (
          <>
            {/* Carrossel 1: Lojas em Destaque (ordenado automaticamente pelo histórico de pedidos concluídos no D1) */}
            <FeaturedStoresCarousel
              tenants={activeTenants}
              onSelectStore={onSelectStore}
            />

            {/* Carrossel 2: Mais Pedidos (diretamente ABAIXO do carrossel de Lojas em Destaque) */}
            <TopSellingProductsCarousel
              onSelectStore={onSelectStore}
            />
          </>
        )}

        {/* Título Principal da Seção */}
        <div className="mt-8 mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span>
                {activeCategory === "todos"
                  ? "Estabelecimentos por Categoria"
                  : `Categoria: ${
                      allCategories.find((c) => c.id === activeCategory)?.name || activeCategory
                    }`}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalFilteredCount}{" "}
              {totalFilteredCount === 1 ? "opção disponível" : "opções disponíveis"} no Top Food
              {activeCategory !== "todos" && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("todos")}
                  className="ml-2 font-bold text-primary hover:underline cursor-pointer"
                >
                  (Mostrar todas as categorias)
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Listagem Agrupada em Carrosséis Horizontais por Categoria */}
        {displayedGroups.length > 0 ? (
          <div className="space-y-6">
            {displayedGroups.map((group) => (
              <CategoryStoreSection
                key={group.category.id}
                category={group.category}
                tenants={group.stores}
                onSelectStore={onSelectStore}
                onFilterByCategory={(catId) => setActiveCategory(catId)}
                isFocused={activeCategory === group.category.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 mb-3">
              <SearchX className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
              Nenhum estabelecimento encontrado
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Não encontramos lojas correspondentes nesta seleção. Tente buscar por outros termos ou retorne à visão geral.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("todos");
              }}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-dark transition cursor-pointer"
            >
              Ver todas as categorias
            </button>
          </div>
        )}

        {/* Banner PWA discreto */}
        <div className="mt-10">
          <PWAInstallButton variant="banner" />
        </div>
      </main>

      {/* Rodapé Institucional do Portal Top Food */}
      <footer className="mt-auto border-t border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 text-xs text-gray-500 dark:text-gray-400 transition-colors">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-black text-white">
              TF
            </div>
            <span className="font-bold text-gray-800 dark:text-gray-200">Top Food</span>
            <span>•</span>
            <span>O Portal do Delivery Multi-Lojas</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              type="button"
              onClick={onStoreAdminClick}
              className="text-gray-600 dark:text-gray-300 hover:text-primary font-medium transition cursor-pointer"
            >
              Área do Lojista
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={onSuperAdminClick}
              className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
            >
              Super Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
