import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { PortalHeader } from "./PortalHeader";
import { EstablishmentCategories } from "./EstablishmentCategories";
import {
  matchStoreCategory,
  matchStoreSearch,
  scoreProductSearchMatch,
  extractDynamicCategories,
  slugifyCategory,
  doesCategoryMatch,
} from "./portalUtils";
import { FeaturedStoresCarousel } from "./FeaturedStoresCarousel";
import { FavoriteStoresCarousel } from "./FavoriteStoresCarousel";
import { TopSellingProductsCarousel } from "./TopSellingProductsCarousel";
import { CategoryStoreSection } from "./CategoryStoreSection";
import { StoreCard } from "./StoreCard";
import { PortalStoriesBar } from "./PortalStoriesBar";
import { PortalCarouselSkeleton, PortalStoreListSkeleton } from "./PortalSkeleton";
import type { EstablishmentCategory, Tenant, TopSellingProduct, Product } from "@/types";
import { Store, SearchX, Search, X, ChevronLeft, ChevronRight, Flame, ShoppingBag, ArrowRight, UtensilsCrossed } from "lucide-react";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { getSafeDisplayName, getSafeSlug, isImageLogoUrl, formatCurrency } from "@/utils/storeFormat";

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
    marketplaceCatalog,
    establishmentCategories,
    selectedLocality,
    isLoadingTenants,
    isLoadingPortal,
    resetToPortalTheme,
    platformSettings,
    refreshTenants,
    refreshMarketplaceCatalog,
    refreshEstablishmentCategories,
    refreshLocalities,
    refreshPlatformSettings,
    refreshActiveStories,
    addToCart,
    showToast,
  } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handlePortalPullRefresh = async () => {
    await Promise.all([
      refreshTenants(),
      refreshMarketplaceCatalog(),
      refreshEstablishmentCategories(),
      refreshLocalities(),
      refreshPlatformSettings(),
      refreshActiveStories(),
    ]);
  };

  // 1. RESET DE TEMA NO PORTAL PRINCIPAL (HOME):
  // Ao montar a página do Portal TopFood, restaura obrigatoriamente as cores primárias padrão do aplicativo (vermelho/tema original do TopFood)
  useEffect(() => {
    resetToPortalTheme();
    if (typeof document !== "undefined") {
      document.title = platformSettings?.heroTitle || "Top Food - O Portal do Delivery";
    }
  }, [resetToPortalTheme, platformSettings?.heroTitle]);

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

  // Catálogo unificado de produtos de todas as lojas ativas (da API de catálogo + mais vendidos), filtrado por localidade e categoria
  const unifiedCatalogProducts = useMemo<TopSellingProduct[]>(() => {
    const activeTenantsById = new Map<string, Tenant>();
    const activeTenantsBySlug = new Map<string, Tenant>();
    categoryFilteredStores.forEach((t) => {
      if (t.id) activeTenantsById.set(t.id, t);
      if (t.slug) activeTenantsBySlug.set(t.slug.toLowerCase(), t);
    });

    const map = new Map<string, TopSellingProduct>();

    const sourceList = [
      ...(marketplaceCatalog || []),
      ...(topSellingProducts || []),
    ];

    sourceList.forEach((item) => {
      if (!item || item.available === false) return;
      const store =
        activeTenantsById.get(item.tenantId) ||
        (item.tenantSlug ? activeTenantsBySlug.get(item.tenantSlug.toLowerCase()) : undefined);

      if (!store) return;

      const key = `${store.id || store.slug}_${item.productId || item.id || item.name.toLowerCase()}`;
      const existing = map.get(key);
      if (!existing || (item.totalSold || 0) > (existing.totalSold || 0)) {
        map.set(key, {
          ...item,
          tenantId: store.id || item.tenantId,
          tenantName: store.name || item.tenantName,
          tenantSlug: store.slug || item.tenantSlug,
          tenantLogo: store.logo || item.tenantLogo,
          tenantPrimaryColor: store.primaryColor || item.tenantPrimaryColor,
          tenantIsOpen: store.isOpen !== undefined ? store.isOpen : item.tenantIsOpen,
          deliveryTime: store.deliveryTime || item.deliveryTime,
          deliveryFee: store.deliveryFee !== undefined ? store.deliveryFee : item.deliveryFee,
          location: store.location || store.localidade || item.location,
          localidade: store.localidade || store.location || item.localidade,
        });
      }
    });

    return Array.from(map.values());
  }, [marketplaceCatalog, topSellingProducts, categoryFilteredStores]);

  // 1. FILTRAGEM PRECISA DE ITENS E ORDENAÇÃO POR MAIS PEDIDOS:
  // Varre o nome/categoria/descrição real dos produtos e ordena priorizando os itens mais vendidos (Mais Pedidos) no topo
  const matchingProducts = useMemo<TopSellingProduct[]>(() => {
    const q = searchQuery.trim();
    if (!q) return [];

    const scored: { product: TopSellingProduct; matchScore: number }[] = [];

    unifiedCatalogProducts.forEach((prod) => {
      const score = scoreProductSearchMatch(prod, q);
      if (score > 0) {
        scored.push({ product: prod, matchScore: score });
      }
    });

    scored.sort((a, b) => {
      // Prioriza correspondência no nome do produto (ex: "X Tudo" no nome antes de apenas na descrição)
      const aNameMatch = a.matchScore >= 650 ? 1 : 0;
      const bNameMatch = b.matchScore >= 650 ? 1 : 0;
      if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;

      // Ordena de forma decrescente pelos Mais Pedidos (totalSold / vendas reais)
      const aSold = a.product.totalSold || 0;
      const bSold = b.product.totalSold || 0;
      if (bSold !== aSold) return bSold - aSold;

      // Em seguida, itens marcados como populares no cardápio
      const aPop = a.product.popular ? 1 : 0;
      const bPop = b.product.popular ? 1 : 0;
      if (bPop !== aPop) return bPop - aPop;

      // Por fim, maior score de precisão textual
      return b.matchScore - a.matchScore;
    });

    return scored.map((s) => s.product);
  }, [unifiedCatalogProducts, searchQuery]);

  // Conjunto de lojas que possuem itens correspondentes ao termo pesquisado
  const storeIdsWithMatchingProducts = useMemo(() => {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    matchingProducts.forEach((p) => {
      if (p.tenantId) ids.add(p.tenantId);
      if (p.tenantSlug) slugs.add(p.tenantSlug.toLowerCase());
    });
    return { ids, slugs };
  }, [matchingProducts]);

  // 2. Agrupamento completo de todas as categorias e todas as 20 lojas (sem ocultar nenhuma loja)
  const groupedTenants = useMemo(() => {
    const groupsMap = new Map<string, { category: EstablishmentCategory; stores: Tenant[] }>();

    // Inicializa os grupos na ordem das categorias extraídas
    dynamicCategories.forEach((cat) => {
      groupsMap.set(cat.id.toLowerCase(), { category: cat, stores: [] });
    });

    // Mapeia e agrupa CADA UMA das 20 lojas na sua respectiva categoria
    lojas.forEach((tenant) => {
      const hasProd =
        storeIdsWithMatchingProducts.ids.has(tenant.id) ||
        (tenant.slug ? storeIdsWithMatchingProducts.slugs.has(tenant.slug.toLowerCase()) : false);

      if (searchQuery.trim() && !matchStoreSearch(tenant, searchQuery, dynamicCategories, hasProd)) {
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
  }, [dynamicCategories, lojas, searchQuery, storeIdsWithMatchingProducts]);

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

  // Lojas filtradas pela busca global: exibe APENAS estabelecimentos que vendem o item pesquisado
  // ou cujo próprio nome/categoria corresponda exatamente ao termo pesquisado (evitando cafeterias sem o item),
  // ordenadas pela popularidade/vendas dos produtos encontrados
  const matchingStores = useMemo(() => {
    if (!searchQuery.trim()) return [];

    // Mapa do maior volume de vendas do item pesquisado por loja para ordenar as lojas mais relevantes no topo
    const storeBestSales = new Map<string, number>();
    matchingProducts.forEach((p) => {
      const key = p.tenantId || p.tenantSlug;
      const currentBest = storeBestSales.get(key) || 0;
      if ((p.totalSold || 0) >= currentBest) {
        storeBestSales.set(key, p.totalSold || 0);
      }
    });

    return categoryFilteredStores
      .filter((tenant) => {
        const hasProd =
          storeIdsWithMatchingProducts.ids.has(tenant.id) ||
          (tenant.slug ? storeIdsWithMatchingProducts.slugs.has(tenant.slug.toLowerCase()) : false);
        return matchStoreSearch(tenant, searchQuery, dynamicCategories, hasProd);
      })
      .sort((a, b) => {
        const aHasProd =
          storeIdsWithMatchingProducts.ids.has(a.id) ||
          (a.slug ? storeIdsWithMatchingProducts.slugs.has(a.slug.toLowerCase()) : false)
            ? 1
            : 0;
        const bHasProd =
          storeIdsWithMatchingProducts.ids.has(b.id) ||
          (b.slug ? storeIdsWithMatchingProducts.slugs.has(b.slug.toLowerCase()) : false)
            ? 1
            : 0;
        if (bHasProd !== aHasProd) return bHasProd - aHasProd;

        const aSales = storeBestSales.get(a.id) ?? storeBestSales.get(a.slug) ?? 0;
        const bSales = storeBestSales.get(b.id) ?? storeBestSales.get(b.slug) ?? 0;
        if (bSales !== aSales) return bSales - aSales;

        return (b.completedOrdersCount || 0) - (a.completedOrdersCount || 0);
      });
  }, [categoryFilteredStores, searchQuery, dynamicCategories, storeIdsWithMatchingProducts, matchingProducts]);

  // Handler para clicar em "Pedir / Adicionar" ou abrir o item direto na lanchonete
  const handleSelectSearchResultProduct = (item: TopSellingProduct, addDirectly: boolean = false) => {
    const slug = getSafeSlug(item.tenantSlug, item.tenantId);
    if (!slug) return;

    if (addDirectly) {
      const productToAdd: Product = {
        id: item.productId || item.id,
        tenantId: item.tenantId,
        name: item.name,
        description: item.description || "",
        price: item.price,
        image: item.image || "",
        category: item.category || "lanches",
        available: true,
        popular: item.popular,
        options: item.options || [],
        addonGroupIds: item.addonGroupIds || [],
      };

      // Salva no carrinho da loja de destino antes de navegar para que o item já esteja no carrinho ao abrir a loja
      try {
        const cartKey = `topfood_cart_${slug.toLowerCase()}`;
        const existingRaw = localStorage.getItem(cartKey);
        const existingCart = existingRaw ? JSON.parse(existingRaw) : [];
        const safeCart = Array.isArray(existingCart) ? existingCart : [];
        const existingIdx = safeCart.findIndex(
          (ci: any) => ci?.product?.id === productToAdd.id && (!ci.selectedOptions || ci.selectedOptions.length === 0)
        );
        if (existingIdx >= 0) {
          safeCart[existingIdx].quantity = (safeCart[existingIdx].quantity || 1) + 1;
        } else {
          safeCart.push({
            id: `${productToAdd.id}-${Date.now()}`,
            product: productToAdd,
            quantity: 1,
            selectedOptions: [],
            notes: "",
          });
        }
        const serialized = JSON.stringify(safeCart);
        localStorage.setItem(cartKey, serialized);
        sessionStorage.setItem(cartKey, serialized);
        localStorage.setItem("topfood_cart_items", serialized);
        sessionStorage.setItem("topfood_cart_items", serialized);
      } catch {
        // fallback
        addToCart(productToAdd, 1, [], "");
      }

      showToast(`"${item.name}" adicionado ao carrinho de ${getSafeDisplayName(item.tenantName, "Lanchonete")}!`, "success");
    }

    onSelectStore(slug);
  };

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
    <PullToRefresh onRefresh={handlePortalPullRefresh}>
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
        {/* Seção de Lojas Favoritas no Topo do Portal */}
        {!searchQuery && !isFirstLoad && (
          <FavoriteStoresCarousel
            tenants={activeTenants}
            onSelectStore={onSelectStore}
          />
        )}

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
          <div className="mt-4 sm:mt-6 space-y-8">
            {/* Banner Informativo de Status da Busca */}
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/5 p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>Resultados para:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-extrabold">&ldquo;{searchQuery}&rdquo;</span>
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {matchingProducts.length}{" "}
                      {matchingProducts.length === 1 ? "item encontrado no cardápio" : "itens encontrados nos cardápios"}{" "}
                      • {matchingStores.length}{" "}
                      {matchingStores.length === 1 ? "estabelecimento" : "estabelecimentos"}
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

            {matchingProducts.length > 0 || matchingStores.length > 0 ? (
              <>
                {/* SEÇÃO 1: PRODUTOS / LANCHES ENCONTRADOS (ORDENADOS PELOS MAIS PEDIDOS) */}
                {matchingProducts.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 dark:bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 border border-orange-500/20">
                            <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                            Ordenado por Mais Pedidos
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5">
                            <UtensilsCrossed className="h-4 w-4 text-primary" />
                            <span>Itens encontrados nos cardápios ({matchingProducts.length})</span>
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Clique no item para abrir a lanchonete ou adicione direto ao carrinho
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {matchingProducts.map((item, idx) => {
                        const storeName = getSafeDisplayName(item.tenantName, "Lanchonete");
                        const logoIsImg = isImageLogoUrl(item.tenantLogo);
                        const isTopSeller = (item.totalSold || 0) > 0 || item.popular;
                        const isOpen = item.tenantIsOpen !== false;

                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            onClick={() => handleSelectSearchResultProduct(item, false)}
                            className="group relative flex flex-col justify-between rounded-2xl border border-gray-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs hover:shadow-md hover:border-primary/40 dark:hover:border-primary/40 transition-all cursor-pointer overflow-hidden"
                          >
                            {/* Linha Superior: Dados do Produto + Imagem */}
                            <div className="flex items-start gap-3.5">
                              {/* Foto do Produto */}
                              <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-100 dark:border-slate-800">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    loading="lazy"
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-2xl">
                                    🍔
                                  </div>
                                )}

                                {/* Badge Ranking / Mais Pedido */}
                                {idx < 3 && isTopSeller && (
                                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md bg-gradient-to-r from-orange-600 to-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                                    🔥 #{idx + 1}
                                  </span>
                                )}
                              </div>

                              {/* Detalhes do Produto */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                    {item.name}
                                  </h4>
                                </div>

                                {item.description && (
                                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}

                                {/* Badges de Popularidade e Preço */}
                                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(item.price)}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    {(item.totalSold || 0) > 0 ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 dark:bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                        <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                                        {item.totalSold} {item.totalSold === 1 ? "pedido" : "pedidos"}
                                      </span>
                                    ) : item.popular ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        ⭐ Mais Pedido
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Rodapé do Card: Lanchonete onde é vendido + Botões de Ação */}
                            <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                              {/* Identificação da Lanchonete */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                                  style={
                                    item.tenantPrimaryColor
                                      ? { borderColor: `${item.tenantPrimaryColor}40` }
                                      : undefined
                                  }
                                >
                                  {logoIsImg ? (
                                    <img
                                      src={item.tenantLogo}
                                      alt={storeName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>{item.tenantLogo || "🏪"}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                      {storeName}
                                    </span>
                                    <span
                                      className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                                        isOpen ? "bg-emerald-500" : "bg-red-500"
                                      }`}
                                      title={isOpen ? "Aberta agora" : "Fechada"}
                                    />
                                  </div>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                    {item.deliveryTime || "30-45 min"} •{" "}
                                    {item.deliveryFee === 0
                                      ? "Entrega grátis"
                                      : item.deliveryFee
                                      ? `Entrega ${formatCurrency(item.deliveryFee)}`
                                      : "Ver loja"}
                                  </p>
                                </div>
                              </div>

                              {/* Botões: Adicionar ao Carrinho ou Ir para Loja */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectSearchResultProduct(item, true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl bg-primary hover:bg-primary-dark px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition cursor-pointer"
                                  title={`Adicionar ${item.name} ao carrinho e abrir ${storeName}`}
                                >
                                  <ShoppingBag className="h-3.5 w-3.5" />
                                  <span>Adicionar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectSearchResultProduct(item, false);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-200 transition cursor-pointer"
                                  title={`Abrir cardápio de ${storeName}`}
                                >
                                  <span>Ver loja</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* SEÇÃO 2: ESTABELECIMENTOS QUE POSSUEM O ITEM OU CORRESPONDEM À BUSCA */}
                {matchingStores.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Store className="h-5 w-5 text-primary shrink-0" />
                        <span>
                          Estabelecimentos com &ldquo;{searchQuery}&rdquo; ({matchingStores.length})
                        </span>
                      </h3>
                    </div>
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
                  </section>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3.5 border border-amber-500/20">
                  <SearchX className="h-7 w-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Nenhum produto ou loja encontrado para &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  Não encontramos lanches ou estabelecimentos com esse termo nos cardápios. Tente pesquisar por <strong className="text-gray-700 dark:text-gray-300">&ldquo;X-Tudo&rdquo;</strong>, <strong className="text-gray-700 dark:text-gray-300">&ldquo;Smash&rdquo;</strong>, <strong className="text-gray-700 dark:text-gray-300">&ldquo;Pizza&rdquo;</strong> ou <strong className="text-gray-700 dark:text-gray-300">&ldquo;Açaí&rdquo;</strong>.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchQuery("X-Tudo")}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    🍔 X-Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("Smash")}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    🥓 Smash Burger
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
    </PullToRefresh>
  );
}
