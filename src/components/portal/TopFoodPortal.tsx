import { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { PortalHeader } from "./PortalHeader";
import { EstablishmentCategories } from "./EstablishmentCategories";
import {
  matchStoreCategory,
  matchStoreSearch,
  extractDynamicCategories,
  slugifyCategory,
} from "./portalUtils";
import { FeaturedStoresCarousel } from "./FeaturedStoresCarousel";
import { TopSellingProductsCarousel } from "./TopSellingProductsCarousel";
import { CategoryStoreSection } from "./CategoryStoreSection";
import { StoreCard } from "./StoreCard";
import { PortalStoriesBar } from "./PortalStoriesBar";
import { PortalCarouselSkeleton, PortalStoreListSkeleton } from "./PortalSkeleton";
import type { EstablishmentCategory, Tenant } from "@/types";
import { Store, SearchX, Search, X } from "lucide-react";
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
  const {
    tenants,
    establishmentCategories,
    isLoadingTenants,
    isLoadingPortal,
    selectedLocality,
  } = useStore();
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Apenas lojas ativas no marketplace E cadastradas na localidade selecionada
  const activeTenants = useMemo(() => {
    const raw = (tenants || []).filter((t) => t.status !== "inactive");

    const targetLoc = (selectedLocality || "").trim().toLowerCase();
    const isAll =
      !targetLoc ||
      targetLoc === "todas" ||
      targetLoc === "todas as localidades" ||
      targetLoc === "todas as regiões" ||
      targetLoc === "todos";

    const filteredByLocality = isAll
      ? raw
      : raw.filter((t) => {
          const tLoc = (t.localidade || "").trim().toLowerCase();
          return !tLoc || tLoc === "undefined" || tLoc === targetLoc;
        });

    return filteredByLocality.sort((a, b) => {
      const aFeat = a.isFeatured ? 1 : 0;
      const bFeat = b.isFeatured ? 1 : 0;
      if (aFeat !== bFeat) return bFeat - aFeat;
      const aPri = a.priorityOrder || 0;
      const bPri = b.priorityOrder || 0;
      if (aPri !== bPri) return bPri - aPri;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [tenants, selectedLocality]);

  // Exibe skeleton screens leves apenas no primeiro acesso do usuário (quando o cache local estiver vazio)
  const isFirstLoad = (isLoadingTenants || isLoadingPortal) && activeTenants.length === 0;

  // 1. Extração dinâmica de TODAS as categorias únicas atribuídas às lojas ativas no banco de dados (D1 / KV)
  const dynamicCategories = useMemo<EstablishmentCategory[]>(() => {
    return extractDynamicCategories(activeTenants, establishmentCategories || []);
  }, [activeTenants, establishmentCategories]);

  // Agrupamento de estabelecimentos por categoria ativa
  const groupedTenants = useMemo(() => {
    const groups: { category: EstablishmentCategory; stores: Tenant[] }[] = [];

    dynamicCategories.forEach((cat) => {
      const storesInCat = activeTenants.filter((tenant) => {
        const matched = matchStoreCategory(tenant, dynamicCategories);
        const matchesCategory =
          matched.id.toLowerCase() === cat.id.toLowerCase() ||
          matched.name.toLowerCase() === cat.name.toLowerCase() ||
          slugifyCategory(matched.name) === slugifyCategory(cat.name);

        if (!matchesCategory) return false;

        // Se houver busca por texto (nome, categoria ou culinária)
        if (searchQuery.trim()) {
          if (!matchStoreSearch(tenant, searchQuery, dynamicCategories)) return false;
        }

        return true;
      });

      if (storesInCat.length > 0) {
        groups.push({ category: cat, stores: storesInCat });
      }
    });

    return groups;
  }, [dynamicCategories, activeTenants, searchQuery]);

  // Lojas filtradas pela busca global (nome, categoria ou culinária) e pela categoria ativa
  const matchingStores = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return activeTenants.filter((tenant) => {
      if (!matchStoreSearch(tenant, searchQuery, dynamicCategories)) return false;
      if (activeCategory !== "todos") {
        const cat = matchStoreCategory(tenant, dynamicCategories);
        const matchesCat =
          cat.id.toLowerCase() === activeCategory.toLowerCase() ||
          cat.name.toLowerCase() === activeCategory.toLowerCase() ||
          slugifyCategory(cat.name) === slugifyCategory(activeCategory);
        if (!matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [activeTenants, searchQuery, dynamicCategories, activeCategory]);

  // Filtra as categorias exibidas caso o usuário tenha clicado em uma categoria específica no topo
  const displayedGroups = useMemo(() => {
    if (activeCategory === "todos") {
      return groupedTenants;
    }
    return groupedTenants.filter(
      (g) =>
        g.category.id.toLowerCase() === activeCategory.toLowerCase() ||
        g.category.name.toLowerCase() === activeCategory.toLowerCase() ||
        slugifyCategory(g.category.name) === slugifyCategory(activeCategory)
    );
  }, [groupedTenants, activeCategory]);

  // Total de lojas correspondentes no filtro atual
  const totalFilteredCount = useMemo(() => {
    if (searchQuery.trim()) {
      return matchingStores.length;
    }
    return displayedGroups.reduce((acc, g) => acc + g.stores.length, 0);
  }, [searchQuery, matchingStores, displayedGroups]);

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
        customCategories={dynamicCategories}
      />

      {/* Conteúdo Principal do Marketplace */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-12">
        {/* Barra de Stories das Lojas (Ao Vivo / 24 Horas) */}
        {!searchQuery && activeCategory === "todos" && (
          <PortalStoriesBar tenants={activeTenants} />
        )}

        {/* Carrosséis do Topo da Vitrine Principal */}
        {!searchQuery && activeCategory === "todos" && (
          <>
            {isFirstLoad ? (
              <div className="space-y-6">
                <PortalCarouselSkeleton title="Mais Pedidos" badge="🔥 Ranking Geral" icon="🔥" />
                <PortalCarouselSkeleton title="Lojas em Destaque" badge="⭐ Top Destaques" />
              </div>
            ) : (
              <>
                {/* Carrossel 1: Mais Pedidos (Ranking Geral de lanches mais vendidos) */}
                <TopSellingProductsCarousel
                  onSelectStore={onSelectStore}
                />

                {/* Carrossel 2: Lojas em Destaque (diretamente ABAIXO de Mais Pedidos) */}
                <FeaturedStoresCarousel
                  tenants={activeTenants}
                  onSelectStore={onSelectStore}
                />
              </>
            )}
          </>
        )}

        {/* MODO 1: RESULTADOS DA BUSCA GLOBAL ATIVA */}
        {searchQuery.trim() ? (
          <div className="mt-4 sm:mt-6">
            {/* Banner Informativo de Status da Busca */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/5 p-4 sm:p-5 mb-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>Resultados da busca:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-extrabold">&ldquo;{searchQuery}&rdquo;</span>
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {matchingStores.length}{" "}
                      {matchingStores.length === 1 ? "loja encontrada" : "lojas encontradas"} por nome, categoria ou tipo de culinária
                      {activeCategory !== "todos" && ` na categoria "${dynamicCategories.find((c) => c.id.toLowerCase() === activeCategory.toLowerCase() || slugifyCategory(c.name) === slugifyCategory(activeCategory))?.name || activeCategory}"`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory("todos");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 text-gray-500" />
                    <span>Limpar busca</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de Lojas Correspondentes */}
            {matchingStores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchingStores.map((tenant) => (
                  <StoreCard
                    key={tenant.id || tenant.slug}
                    tenant={tenant}
                    variant="grid"
                    onSelectStore={onSelectStore}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3.5 border border-amber-500/20">
                  <SearchX className="h-7 w-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Nenhuma loja encontrada para &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  Não encontramos estabelecimentos correspondentes a essa pesquisa. Tente buscar por outro nome, categoria ou culinária como <strong className="text-gray-700 dark:text-gray-300">&ldquo;burger&rdquo;</strong>, <strong className="text-gray-700 dark:text-gray-300">&ldquo;pizza&rdquo;</strong>, <strong className="text-gray-700 dark:text-gray-300">&ldquo;açaí&rdquo;</strong> ou <strong className="text-gray-700 dark:text-gray-300">&ldquo;japonesa&rdquo;</strong>.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchQuery("Burger")}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    🍔 Hambúrgueres
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("Pizza")}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    🍕 Pizzas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("Açaí")}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    🍧 Açaí
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory("todos");
                    }}
                    className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-dark transition cursor-pointer"
                  >
                    Ver todas as lojas
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODO 2: NAVEGAÇÃO NORMAL POR CATEGORIAS E CARROSSÉIS */
          <>
            {/* Título Principal da Seção */}
            <div className="mt-8 mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  <span>
                    {activeCategory === "todos"
                      ? "Estabelecimentos por Categoria"
                      : `Categoria: ${
                          dynamicCategories.find(
                            (c) =>
                              c.id.toLowerCase() === activeCategory.toLowerCase() ||
                              c.name.toLowerCase() === activeCategory.toLowerCase() ||
                              slugifyCategory(c.name) === slugifyCategory(activeCategory)
                          )?.name || activeCategory
                        }`}
                  </span>
                </h2>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isFirstLoad ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3.5 w-24 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
                      <span className="text-gray-400 dark:text-gray-500 text-[11px]">Buscando estabelecimentos...</span>
                    </span>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Listagem Agrupada em Carrosséis Horizontais por Categoria */}
            {isFirstLoad ? (
              <PortalStoreListSkeleton />
            ) : displayedGroups.length > 0 ? (
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
                  {activeTenants.length === 0
                    ? `Nenhum estabelecimento encontrado em ${selectedLocality || "Gargaú"}`
                    : "Nenhum estabelecimento encontrado"}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {activeTenants.length === 0
                    ? `Ainda não há estabelecimentos com entrega ativa para "${selectedLocality || "Gargaú"}". Você pode alternar a localidade na barra superior do topo.`
                    : "Não encontramos lojas correspondentes nesta busca. Tente buscar por outros termos ou limpe o filtro de categorias."}
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
          </>
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
