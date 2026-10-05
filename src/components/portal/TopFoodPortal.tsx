import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { PortalHeader } from "./PortalHeader";
import { EstablishmentCategories } from "./EstablishmentCategories";
import {
  matchStoreCategory,
  matchStoreSearch,
  extractDynamicCategories,
  slugifyCategory,
  doesCategoryMatch,
} from "./portalUtils";
import { FeaturedStoresCarousel } from "./FeaturedStoresCarousel";
import { TopSellingProductsCarousel } from "./TopSellingProductsCarousel";
import { CategoryStoreSection } from "./CategoryStoreSection";
import { StoreCard } from "./StoreCard";
import { PortalStoriesBar } from "./PortalStoriesBar";
import { PortalCarouselSkeleton, PortalStoreListSkeleton } from "./PortalSkeleton";
import type { EstablishmentCategory, Tenant } from "@/types";
import { Store, SearchX, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
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
    featuredStoresRanked,
    topSellingProducts,
    establishmentCategories,
    selectedLocality,
    isLoadingTenants,
    isLoadingPortal,
  } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isAllLocations = useMemo(() => {
    if (!selectedLocality) return true;
    const norm = selectedLocality.trim().toLowerCase();
    return (
      norm === "" ||
      norm === "todas" ||
      norm === "todas as localidades" ||
      norm === "todas as regiões" ||
      norm === "todas as regioes" ||
      norm === "todos" ||
      norm === "all"
    );
  }, [selectedLocality]);

  const matchesSelectedLocation = (loc?: string) => {
    if (isAllLocations) return true;
    return (loc || "Gargaú").trim().toLowerCase() === selectedLocality.trim().toLowerCase();
  };

  // FONTE DE DADOS REATIVA POR LOCALIDADE:
  // Unifica o array de lojas ativas e filtra pela localidade selecionada (ou mostra todas se "Todas as Localidades").
  const lojas = useMemo<Tenant[]>(() => {
    const map = new Map<string, Tenant>();

    (tenants || []).forEach((t) => {
      if (t.status !== "inactive" && matchesSelectedLocation(t.location || t.localidade)) {
        map.set(t.id || t.slug, t);
      }
    });

    (featuredStoresRanked || []).forEach((s) => {
      if (s.status !== "inactive" && matchesSelectedLocation(s.location || s.localidade)) {
        const key = s.id || s.slug;
        const existing = map.get(key);
        map.set(key, existing ? { ...s, ...existing } : s);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const aFeat = a.isFeatured ? 1 : 0;
      const bFeat = b.isFeatured ? 1 : 0;
      if (aFeat !== bFeat) return bFeat - aFeat;
      const aPri = a.priorityOrder || 0;
      const bPri = b.priorityOrder || 0;
      if (aPri !== bPri) return bPri - aPri;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenants, featuredStoresRanked, selectedLocality, isAllLocations]);

  // Filtra também os produtos mais vendidos pelas lojas da localidade selecionada
  const locationFilteredTopProducts = useMemo(() => {
    if (isAllLocations) return topSellingProducts;
    const activeIds = new Set(lojas.map((l) => l.id));
    const activeSlugs = new Set(lojas.map((l) => l.slug));
    return (topSellingProducts || []).filter(
      (p) =>
        matchesSelectedLocation(p.location || p.localidade) &&
        (activeIds.has(p.tenantId) || (p.tenantSlug && activeSlugs.has(p.tenantSlug)) || Boolean(p.location || p.localidade))
    );
  }, [topSellingProducts, lojas, isAllLocations]);

  const activeTenants = lojas;

  // Exibe skeleton screens leves apenas no primeiro acesso do usuário (quando o cache local estiver vazio)
  const isFirstLoad = (isLoadingTenants || isLoadingPortal) && lojas.length === 0;

  // 1. Extração dinâmica de TODAS as categorias únicas atribuídas às 20 lojas ativas no banco de dados (sem truncamento)
  const dynamicCategories = useMemo<EstablishmentCategory[]>(() => {
    return extractDynamicCategories(lojas, establishmentCategories || []);
  }, [lojas, establishmentCategories]);

  // 2. Agrupamento completo de todas as categorias e todas as 20 lojas (sem ocultar nenhuma loja)
  const groupedTenants = useMemo(() => {
    const groupsMap = new Map<string, { category: EstablishmentCategory; stores: Tenant[] }>();

    // Inicializa os grupos na ordem das categorias extraídas
    dynamicCategories.forEach((cat) => {
      groupsMap.set(cat.id.toLowerCase(), { category: cat, stores: [] });
    });

    // Mapeia e agrupa CADA UMA das 20 lojas na sua respectiva categoria
    lojas.forEach((tenant) => {
      if (searchQuery.trim() && !matchStoreSearch(tenant, searchQuery, dynamicCategories)) {
        return;
      }

      const matched = matchStoreCategory(tenant, dynamicCategories);
      // Localiza o grupo correspondente ou cria dinamicamente para garantir que nenhuma das 20 lojas fique de fora
      let targetGroup =
        groupsMap.get(matched.id.toLowerCase()) ||
        Array.from(groupsMap.values()).find(
          (g) =>
            doesCategoryMatch(g.category, matched.id, tenant.businessType) ||
            doesCategoryMatch(g.category, matched.name, tenant.businessType)
        );

      if (!targetGroup) {
        targetGroup = { category: matched, stores: [] };
        groupsMap.set(matched.id.toLowerCase(), targetGroup);
      }

      if (!targetGroup.stores.some((s) => (s.id || s.slug) === (tenant.id || tenant.slug))) {
        targetGroup.stores.push(tenant);
      }
    });

    return Array.from(groupsMap.values()).filter((g) => g.stores.length > 0);
  }, [dynamicCategories, lojas, searchQuery]);

  // Lojas filtradas pela categoria selecionada no topo
  const categoryFilteredStores = useMemo(() => {
    if (!selectedCategory || selectedCategory === "todos") {
      return lojas;
    }
    return lojas.filter((tenant) => {
      const matched = matchStoreCategory(tenant, dynamicCategories);
      return doesCategoryMatch(matched, selectedCategory, tenant.businessType);
    });
  }, [lojas, selectedCategory, dynamicCategories]);

  // Se a categoria selecionada ficar vazia (0 lojas) após uma alteração de categoria no SuperAdmin,
  // volta automaticamente para "todos" para nunca exibir uma categoria vazia.
  useEffect(() => {
    if (
      selectedCategory &&
      selectedCategory !== "todos" &&
      lojas.length > 0 &&
      categoryFilteredStores.length === 0
    ) {
      setSelectedCategory("todos");
    }
  }, [selectedCategory, lojas.length, categoryFilteredStores.length]);

  // Lojas filtradas pela busca global (nome, categoria ou culinária) e pela categoria selecionada
  const matchingStores = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return categoryFilteredStores.filter((tenant) =>
      matchStoreSearch(tenant, searchQuery, dynamicCategories)
    );
  }, [categoryFilteredStores, searchQuery, dynamicCategories]);

  // Filtra as seções exibidas caso o usuário tenha clicado em uma categoria específica no topo
  const displayedGroups = useMemo(() => {
    if (!selectedCategory || selectedCategory === "todos") {
      return groupedTenants;
    }
    const filteredGroups = groupedTenants.filter(
      (g) =>
        doesCategoryMatch(g.category, selectedCategory) ||
        g.category.id.toLowerCase() === selectedCategory.toLowerCase() ||
        g.category.name.toLowerCase() === selectedCategory.toLowerCase() ||
        slugifyCategory(g.category.name) === slugifyCategory(selectedCategory)
    );

    if (filteredGroups.length > 0) {
      return filteredGroups;
    }

    if (categoryFilteredStores.length > 0) {
      const catObj = dynamicCategories.find((c) => doesCategoryMatch(c, selectedCategory)) || {
        id: slugifyCategory(selectedCategory),
        name: selectedCategory,
        icon: "🍽️",
        order: 99,
      };
      return [{ category: catObj, stores: categoryFilteredStores }];
    }

    return [];
  }, [groupedTenants, selectedCategory, categoryFilteredStores, dynamicCategories]);

  // Categoria ativa resolvida para exibição de título
  const activeCategoryObj = useMemo(() => {
    if (!selectedCategory || selectedCategory === "todos") return null;
    return (
      dynamicCategories.find(
        (c) =>
          doesCategoryMatch(c, selectedCategory) ||
          c.id.toLowerCase() === selectedCategory.toLowerCase() ||
          c.name.toLowerCase() === selectedCategory.toLowerCase() ||
          slugifyCategory(c.name) === slugifyCategory(selectedCategory)
      ) || null
    );
  }, [dynamicCategories, selectedCategory]);

  // Subtítulo dinâmico: soma de todas as lojas cadastradas (20 lojas parceiras disponíveis no Top Food)
  // ou o total da categoria quando uma categoria específica estiver filtrada
  const totalAvailableStores = useMemo(() => {
    if (searchQuery.trim()) {
      return matchingStores.length;
    }
    if (selectedCategory !== "todos") {
      return categoryFilteredStores.length;
    }
    return lojas.length;
  }, [searchQuery, matchingStores, selectedCategory, categoryFilteredStores, lojas]);

  // Contador geral dinâmico de lojas parceiras cadastradas no sistema
  const partnerStoresCount = lojas.length;

  // Referência para rolagem horizontal do carrossel de blocos de categorias
  const categoriesCarouselRef = useRef<HTMLDivElement>(null);
  // Referência para rolagem suave até a seção expandida abaixo quando o usuário clica em uma categoria
  const expandedSectionRef = useRef<HTMLDivElement>(null);

  const scrollCategoriesCarousel = (direction: "left" | "right") => {
    if (categoriesCarouselRef.current) {
      const scrollAmount = direction === "left" ? -230 : 230;
      categoriesCarouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Grupo ativo para a seção expandida abaixo do carrossel
  const expandedCategoryGroup = useMemo(() => {
    if (groupedTenants.length === 0) return null;
    if (!selectedCategory || selectedCategory === "todos") {
      return null;
    }
    const found = groupedTenants.find(
      (g) =>
        doesCategoryMatch(g.category, selectedCategory) ||
        g.category.id.toLowerCase() === selectedCategory.toLowerCase() ||
        g.category.name.toLowerCase() === selectedCategory.toLowerCase() ||
        slugifyCategory(g.category.name) === slugifyCategory(selectedCategory)
    );
    if (found) return found;
    if (categoryFilteredStores.length > 0 && activeCategoryObj) {
      return { category: activeCategoryObj, stores: categoryFilteredStores };
    }
    return null;
  }, [groupedTenants, selectedCategory, categoryFilteredStores, activeCategoryObj]);

  const handleCategoryClickFromBlock = (catId: string) => {
    setSelectedCategory((prev) => (prev.toLowerCase() === catId.toLowerCase() ? "todos" : catId));
    setTimeout(() => {
      expandedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      {/* Header Oficial do Portal Top Food */}
      <PortalHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onStoreAdminClick={onStoreAdminClick}
        totalStores={partnerStoresCount}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Barra de Categorias de Estabelecimentos (Scroll Horizontal dinâmico) */}
      <EstablishmentCategories
        activeCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
        }}
        tenants={activeTenants}
        customCategories={dynamicCategories}
      />

      {/* Conteúdo Principal do Marketplace */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 pt-4 sm:pt-6 pb-12">
        {/* Barra de Stories das Lojas (Ao Vivo / 24 Horas) */}
        {!searchQuery && (
          <PortalStoriesBar tenants={activeTenants} />
        )}

        {/* Carrosséis do Topo da Vitrine Principal */}
        {!searchQuery && (
          <>
            {isFirstLoad ? (
              <div className="space-y-6">
                <PortalCarouselSkeleton title="Mais Pedidos" badge="🔥 Ranking Geral" icon="🔥" />
                <PortalCarouselSkeleton title="Lojas em Destaque" badge="⭐ Top Destaques" />
              </div>
            ) : (
              <>
                {/* Carrossel 1: Mais Pedidos (Ranking Geral de lanches mais vendidos na localidade ativa) */}
                <TopSellingProductsCarousel
                  products={locationFilteredTopProducts}
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
                      {selectedCategory !== "todos" && ` na categoria "${activeCategoryObj?.name || selectedCategory}"`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("todos");
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
                      setSelectedCategory("todos");
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
          /* MODO 2: NAVEGAÇÃO POR CATEGORIAS E CARROSSEL MULTI-EIXO (HORIZONTAL + VERTICAL 1 LOJA POR VEZ) */
          <>
            {/* Título Principal da Seção + Controles do Carrossel Horizontal de Categorias */}
            <div className="mt-8 mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary shrink-0" />
                  <span className="truncate">Estabelecimentos por Categoria</span>
                </h2>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isFirstLoad ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3.5 w-24 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
                      <span className="text-gray-400 dark:text-gray-500 text-[11px]">Buscando estabelecimentos...</span>
                    </span>
                  ) : (
                    <>
                      {`${lojas.length} ${
                        lojas.length === 1
                          ? "loja parceira disponível"
                          : "lojas parceiras disponíveis"
                      } no Top Food`}
                      {groupedTenants.length > 1 && (
                        <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                          {" "}• Clique em uma categoria para expandir todas as lojas abaixo
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Setas de navegação horizontal entre os blocos de categoria */}
              {!isFirstLoad && groupedTenants.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => scrollCategoriesCarousel("left")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-2xs transition cursor-pointer"
                    aria-label="Rolar categorias para a esquerda"
                    title="Categorias anteriores"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCategoriesCarousel("right")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 shadow-2xs transition cursor-pointer"
                    aria-label="Rolar categorias para a direita"
                    title="Próximas categorias"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* CARROSSEL MULTI-EIXO: Eixo Horizontal (Blocos de Categorias) + Eixo Vertical Interno (1 Loja por Vez com Snap-Y Mandatory) */}
            {isFirstLoad ? (
              <PortalStoreListSkeleton />
            ) : groupedTenants.length > 0 ? (
              <>
                <div
                  ref={categoriesCarouselRef}
                  className="flex items-start gap-3.5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth overscroll-x-contain"
                >
                  {groupedTenants.map((group) => {
                    const isSelectedCat =
                      selectedCategory !== "todos" &&
                      (doesCategoryMatch(group.category, selectedCategory) ||
                        group.category.id.toLowerCase() === selectedCategory.toLowerCase() ||
                        slugifyCategory(group.category.name) === slugifyCategory(selectedCategory));

                    return (
                      <CategoryStoreSection
                        key={group.category.id}
                        category={group.category}
                        tenants={group.stores}
                        onSelectStore={onSelectStore}
                        onFilterByCategory={handleCategoryClickFromBlock}
                        isFocused={isSelectedCat}
                      />
                    );
                  })}
                </div>

                {/* SEÇÃO EXPANDIDA ABAIXO DO CARROSSEL QUANDO UMA CATEGORIA É CLICADA/SELECIONADA */}
                {expandedCategoryGroup && (
                  <div
                    ref={expandedSectionRef}
                    id={`expanded-category-${expandedCategoryGroup.category.id}`}
                    className="mt-8 pt-6 border-t border-gray-200/80 dark:border-slate-800 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20 text-2xl border border-primary/25">
                          <span>{expandedCategoryGroup.category.icon || "🍽️"}</span>
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                            <span>Todas as lojas de {expandedCategoryGroup.category.name}</span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary text-white">
                              {expandedCategoryGroup.stores.length}{" "}
                              {expandedCategoryGroup.stores.length === 1 ? "loja" : "lojas"}
                            </span>
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Exibindo todos os estabelecimentos cadastrados na categoria{" "}
                            <strong className="text-gray-700 dark:text-gray-300">
                              {expandedCategoryGroup.category.name}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCategory("todos")}
                        className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5 text-gray-500" />
                        <span>Fechar categoria</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {expandedCategoryGroup.stores.map((store) => (
                        <StoreCard
                          key={`expanded-${store.id || store.slug}`}
                          tenant={store}
                          variant="grid"
                          onSelectStore={onSelectStore}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 mb-3">
                  <SearchX className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  Nenhum estabelecimento encontrado
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Não encontramos lojas correspondentes nesta categoria ou busca. Clique abaixo para ver todas as lojas e categorias.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("todos");
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
