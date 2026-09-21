import { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Pencil,
  Pause,
  Play,
  Trash2,
  X,
  Search,
  Upload,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertTriangle,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Tag,
  Check,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { categories as defaultMockCategories } from "@/data/mockData";
import { fetchTenantCategoriesApi } from "@/services/api";
import { formatPrice } from "@/utils/order";
import {
  normalizeProductImage,
  getCategoryFallbackImage,
  handleImageError,
} from "@/utils/imageUtils";
import type { Category, Product, ProductOption } from "@/types";

export function AdminMenu() {
  const {
    products,
    config,
    addProduct,
    editProduct,
    removeProduct,
    reorderProducts,
    storeCategories,
    createCategory,
    currentTenant,
    currentSlug,
  } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  // Estado centralizado para as categorias carregadas da API / banco de dados
  const [categories, setCategories] = useState<Category[]>(() => {
    if (storeCategories && storeCategories.length > 0) {
      return storeCategories;
    }
    return defaultMockCategories;
  });

  // Estado da categoria ativa selecionada (padrão 'todos')
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");

  // Criação inline rápida de categoria na barra horizontal
  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState("");

  // Estados de Drag & Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const tenantId = currentTenant?.id || currentTenant?.slug || currentSlug || "marcelino";

  // Busca do backend/API no carregamento da tela (useEffect)
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const res = await fetchTenantCategoriesApi(tenantId);
        if (isMounted && res.success && res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.warn("[AdminMenu] Erro ao carregar categorias do backend:", err);
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, [tenantId]);

  // Sincroniza dinamicamente se o StoreContext atualizar storeCategories
  useEffect(() => {
    if (storeCategories && storeCategories.length > 0) {
      setCategories((prev) => {
        const map = new Map<string, Category>();
        prev.forEach((c) => map.set(c.id.toLowerCase(), c));
        storeCategories.forEach((c) => map.set(c.id.toLowerCase(), c));
        return Array.from(map.values());
      });
    }
  }, [storeCategories]);

  // Lista consolidada de categorias cadastradas no banco de dados/API
  const allCategories = useMemo(() => {
    const map = new Map<string, Category>();

    // 1. Categorias salvas no estado local (banco de dados/API)
    categories.forEach((c) => {
      if (c && c.id) map.set(c.id.toLowerCase(), c);
    });

    // 2. Categorias presentes no contexto global
    (storeCategories || []).forEach((c) => {
      if (c && c.id && !map.has(c.id.toLowerCase())) {
        map.set(c.id.toLowerCase(), c);
      }
    });

    // 3. Categorias presentes nos produtos para garantir exibição completa
    products.forEach((p) => {
      const catKey = (p.category || "").toLowerCase();
      if (catKey && !map.has(catKey)) {
        map.set(catKey, {
          id: p.category,
          name: p.category.charAt(0).toUpperCase() + p.category.slice(1).replace(/-/g, " "),
          icon: "🍽️",
        });
      }
    });

    return Array.from(map.values());
  }, [categories, storeCategories, products]);

  // Filtragem dinâmica instantânea
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q);

      const isTodos = selectedCategory === "todos" || selectedCategory === "all";
      const matchesCat =
        isTodos ||
        (p.category || "").toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [products, search, selectedCategory]);

  const handleSave = async (product: Product, newCategoryName?: string) => {
    let finalCategory = product.category;
    if (newCategoryName && newCategoryName.trim()) {
      const created = await createCategory(newCategoryName.trim());
      if (created) {
        finalCategory = created.id;
        // Adiciona imediatamente à lista do menu superior sem recarregar
        setCategories((prev) => {
          if (prev.some((c) => c.id.toLowerCase() === created.id.toLowerCase())) {
            return prev;
          }
          return [...prev, created];
        });
        setSelectedCategory(created.id);
      }
    }

    const isExisting = products.some((p) => p.id === product.id);
    if (isExisting) {
      await editProduct(product.id, {
        ...product,
        category: finalCategory,
        newCategoryName: newCategoryName?.trim(),
      });
    } else {
      const { id: _id, tenantId: _tenantId, ...rest } = product;
      await addProduct({
        ...rest,
        category: finalCategory,
        newCategoryName: newCategoryName?.trim(),
      });
    }

    // Se o produto foi cadastrado em uma nova categoria, garante que ela apareça no menu
    if (finalCategory) {
      setCategories((prev) => {
        if (prev.some((c) => c.id.toLowerCase() === finalCategory.toLowerCase())) {
          return prev;
        }
        return [
          ...prev,
          {
            id: finalCategory,
            name:
              newCategoryName?.trim() ||
              finalCategory.charAt(0).toUpperCase() + finalCategory.slice(1).replace(/-/g, " "),
            icon: "🍽️",
          },
        ];
      });
    }

    setShowForm(false);
    setEditing(null);
  };

  const handleCreateCategoryInline = async () => {
    if (!inlineCategoryName.trim()) return;
    const name = inlineCategoryName.trim();
    const created = await createCategory(name);
    if (created) {
      setCategories((prev) => {
        if (prev.some((c) => c.id.toLowerCase() === created.id.toLowerCase())) {
          return prev;
        }
        return [...prev, created];
      });
      setSelectedCategory(created.id);
    }
    setInlineCategoryName("");
    setIsAddingCategoryInline(false);
  };

  const handleDelete = async (id: string) => {
    await removeProduct(id);
  };

  const toggleAvailable = async (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p) {
      await editProduct(id, { available: !p.available });
    }
  };

  // Reordenação de produtos: Subir / Descer
  const handleMoveUp = async (productId: string) => {
    const filteredIdx = filtered.findIndex((p) => p.id === productId);
    if (filteredIdx <= 0) return;
    const prevProduct = filtered[filteredIdx - 1];

    const currentOrder = [...products];
    const srcIdx = currentOrder.findIndex((p) => p.id === productId);
    const targetIdx = currentOrder.findIndex((p) => p.id === prevProduct.id);

    if (srcIdx === -1 || targetIdx === -1) return;

    const temp = currentOrder[srcIdx];
    currentOrder[srcIdx] = currentOrder[targetIdx];
    currentOrder[targetIdx] = temp;

    await reorderProducts(currentOrder.map((p) => p.id));
  };

  const handleMoveDown = async (productId: string) => {
    const filteredIdx = filtered.findIndex((p) => p.id === productId);
    if (filteredIdx < 0 || filteredIdx >= filtered.length - 1) return;
    const nextProduct = filtered[filteredIdx + 1];

    const currentOrder = [...products];
    const srcIdx = currentOrder.findIndex((p) => p.id === productId);
    const targetIdx = currentOrder.findIndex((p) => p.id === nextProduct.id);

    if (srcIdx === -1 || targetIdx === -1) return;

    const temp = currentOrder[srcIdx];
    currentOrder[srcIdx] = currentOrder[targetIdx];
    currentOrder[targetIdx] = temp;

    await reorderProducts(currentOrder.map((p) => p.id));
  };

  // Reordenação via Arrastar e Soltar (Drag & Drop)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const currentOrder = [...products];
    const srcIdx = currentOrder.findIndex((p) => p.id === draggedId);
    const targetIdx = currentOrder.findIndex((p) => p.id === targetId);

    if (srcIdx === -1 || targetIdx === -1) {
      setDraggedId(null);
      return;
    }

    const [draggedItem] = currentOrder.splice(srcIdx, 1);
    currentOrder.splice(targetIdx, 0, draggedItem);
    setDraggedId(null);

    await reorderProducts(currentOrder.map((p) => p.id));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-3 sm:p-6 space-y-4 flex flex-col flex-1 pb-16">
      {/* Barra de busca e botão de novo produto */}
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, descrição ou categoria..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 transition shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Novo</span>
        </button>
      </div>

      {/* Menu Superior de Categorias Dinâmicas (Scroll Horizontal) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1 shrink-0">
        {/* Opção fixa "Todos" no início da lista */}
        <button
          type="button"
          onClick={() => setSelectedCategory("todos")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 border cursor-pointer ${
            selectedCategory === "todos" || selectedCategory === "all"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Todos ({products.length})
        </button>

        {/* Categorias dinâmicas carregadas do banco de dados/API */}
        {allCategories.map((cat) => {
          const count = products.filter(
            (p) => (p.category || "").toLowerCase() === cat.id.toLowerCase()
          ).length;
          const isSelected =
            selectedCategory.toLowerCase() === cat.id.toLowerCase();

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{cat.icon || "🍽️"}</span>
              <span>{cat.name}</span>
              <span
                className={`text-[10px] font-semibold ${
                  isSelected ? "opacity-90 text-amber-300" : "opacity-75 text-slate-500"
                }`}
              >
                ({count})
              </span>
            </button>
          );
        })}

        {/* Botão rápido para adicionar nova categoria diretamente pelo menu horizontal */}
        {!isAddingCategoryInline ? (
          <button
            type="button"
            onClick={() => setIsAddingCategoryInline(true)}
            className="rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 border border-dashed border-amber-400 text-amber-700 bg-amber-50/60 hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
            title="Criar nova categoria"
          >
            <Plus className="h-3.5 w-3.5 text-amber-600" />
            <span>+ Categoria</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0 bg-amber-50 border border-amber-300 rounded-full px-2 py-0.5 animate-fadeIn">
            <input
              type="text"
              value={inlineCategoryName}
              onChange={(e) => setInlineCategoryName(e.target.value)}
              placeholder="Nome da categoria..."
              className="w-32 sm:w-40 text-xs px-2.5 py-1 bg-white border border-amber-300 rounded-full outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-800"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCategoryInline();
                if (e.key === "Escape") {
                  setIsAddingCategoryInline(false);
                  setInlineCategoryName("");
                }
              }}
            />
            <button
              type="button"
              onClick={handleCreateCategoryInline}
              className="p-1 text-xs font-bold bg-amber-500 text-slate-950 rounded-full hover:bg-amber-600 cursor-pointer"
              title="Salvar categoria"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingCategoryInline(false);
                setInlineCategoryName("");
              }}
              className="p-1 text-xs text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Barra de Informação da Ordem dos Produtos */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
        <span className="flex items-center gap-1.5 font-medium text-slate-600">
          <ArrowUpDown className="h-3.5 w-3.5 text-amber-500" />
          <span>Arraste ou use as setas para definir a ordem no cardápio</span>
        </span>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
          {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
        </span>
      </div>

      {/* Lista de Produtos: Cards expansíveis com altura adequada e suporte a Reordenação */}
      <div className="space-y-2.5 sm:space-y-3 w-full">
        {filtered.map((product, index) => {
          const cat = allCategories.find((c) => c.id === product.category);
          const isFirst = index === 0;
          const isLast = index === filtered.length - 1;
          const isDragging = draggedId === product.id;
          const isOver = dragOverId === product.id;

          return (
            <div
              key={product.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, product.id)}
              onDragOver={(e) => handleDragOver(e, product.id)}
              onDragLeave={() => { if (dragOverId === product.id) setDragOverId(null); }}
              onDrop={(e) => handleDrop(e, product.id)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center justify-between p-2.5 sm:p-4 gap-2 sm:gap-3 rounded-2xl bg-white border shadow-xs hover:shadow-sm min-h-[72px] sm:min-h-[80px] h-auto w-full transition-all shrink-0 ${
                isDragging
                  ? "opacity-40 scale-[0.99] border-amber-400 ring-2 ring-amber-300/60 bg-amber-50/30"
                  : isOver
                  ? "border-amber-500 ring-2 ring-amber-400 bg-amber-50/50"
                  : "border-slate-200/80 hover:border-slate-300"
              } ${
                !product.available ? "opacity-60 bg-slate-50/90 border-dashed border-slate-300" : ""
              }`}
            >
              {/* Controles de Reordenação: Grip e Setas Subir/Descer */}
              <div className="flex flex-col sm:flex-row items-center gap-0.5 shrink-0 text-slate-400">
                <div
                  className="p-1 cursor-grab active:cursor-grabbing hover:text-slate-700 select-none"
                  title="Clique e arraste para mudar a ordem no cardápio"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex flex-col sm:flex-row gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(product.id)}
                    disabled={isFirst}
                    className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                    title="Subir posição no cardápio"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(product.id)}
                    disabled={isLast}
                    className="p-1 rounded-md hover:bg-slate-100 hover:text-slate-800 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                    title="Descer posição no cardápio"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Foto do Produto à Esquerda */}
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 flex items-center justify-center">
                <img
                  src={normalizeProductImage(product.image, product.category, product.name)}
                  alt={product.name}
                  onError={(e) => handleImageError(e, product.category, product.name)}
                  className="h-full w-full object-cover pointer-events-none"
                />
                {!product.available && (
                  <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                    <span className="rounded bg-red-600 px-1 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wider">
                      Pausado
                    </span>
                  </div>
                )}
              </div>

              {/* Informações no Centro: Nome, Categoria/Descrição e Preço */}
              <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                    {product.name}
                  </h3>
                  {!product.available && (
                    <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 shrink-0">
                      Pausado
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  {product.description || (cat ? `${cat.icon || ""} ${cat.name}` : "Sem descrição")}
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {formatPrice(product.price, config)}
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                    {cat?.name || product.category}
                  </span>
                </div>
              </div>

              {/* Ações à Direita: Pausar, Editar e Excluir */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {/* Pausar / Reativar */}
                <button
                  type="button"
                  onClick={() => toggleAvailable(product.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition cursor-pointer ${
                    product.available
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95"
                  }`}
                  title={product.available ? "Pausar vendas deste produto" : "Reativar produto no cardápio"}
                >
                  {product.available ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>

                {/* Editar */}
                <button
                  type="button"
                  onClick={() => { setEditing(product); setShowForm(true); }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 hover:text-blue-700 active:scale-95 cursor-pointer"
                  title="Editar produto"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                {/* Excluir */}
                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 hover:text-red-700 active:scale-95 cursor-pointer"
                  title="Excluir produto do cardápio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estado vazio quando não encontrar produtos */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-700">Nenhum produto encontrado</p>
          <p className="text-xs text-slate-400 mt-1">
            {search
              ? `Nenhum resultado para "${search}".`
              : selectedCategory !== "todos" && selectedCategory !== "all"
              ? "Nenhum produto nesta categoria."
              : "Clique em 'Novo' para cadastrar produtos no cardápio."}
          </p>
          {(search || (selectedCategory !== "todos" && selectedCategory !== "all")) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSelectedCategory("todos"); }}
              className="mt-3 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          availableCategories={allCategories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  availableCategories,
  onSave,
  onClose,
}: {
  product: Product | null;
  availableCategories: { id: string; name: string; icon?: string }[];
  onSave: (p: Product, newCategoryName?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price.toString() || "");
  const [image, setImage] = useState(
    product?.image
      ? normalizeProductImage(product.image, product.category, product.name)
      : ""
  );
  const [category, setCategory] = useState(product?.category || (availableCategories[0]?.id || "lanches"));
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [available, setAvailable] = useState(product?.available ?? true);
  const [options, setOptions] = useState<ProductOption[]>(product?.options || []);
  const [newOptName, setNewOptName] = useState("");
  const [newOptPrice, setNewOptPrice] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { config, showToast } = useStore();

  const handleGenerateAiPhoto = async () => {
    if (!name.trim()) {
      showToast("Digite o nome do produto primeiro para gerar a foto com IA.", "warning");
      return;
    }

    setIsGeneratingAiImage(true);
    setImageError(false);
    setIsImageLoading(true);

    try {
      const savedKey =
        (typeof window !== "undefined" ? localStorage.getItem("topfood_gemini_api_key") || "" : "") ||
        config.geminiApiKey ||
        "";

      const res = await fetch("/api/produtos/gerar-foto-ia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedKey ? { "x-gemini-api-key": savedKey } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim(),
          apiKey: savedKey,
        }),
      });

      const data = await res.json();
      const rawUrl = data.imageUrl || data.photoUrl || data.image;

      if (data.success && rawUrl) {
        const cleanUrl = normalizeProductImage(rawUrl, category, name);
        setImage(cleanUrl);
        setIsImageLoading(true);
        setImageError(false);
        showToast("Foto vinculada ao produto!", "success");
      } else {
        setIsImageLoading(false);
        showToast(data.error || "Não foi possível gerar a foto com IA.", "error");
      }
    } catch (err: any) {
      console.error("[AdminMenu] Erro ao gerar foto com IA:", err);
      setIsImageLoading(false);
      showToast("Erro na comunicação ao gerar foto com IA.", "error");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setIsImageLoading(true);
    setImageError(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsProcessingImage(false);
        setIsImageLoading(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setImage(dataUrl);
        } else {
          setImage(normalizeProductImage(result, category, name));
        }
        setIsProcessingImage(false);
        setIsImageLoading(false);
        setImageError(false);
      };
      img.onerror = () => {
        setImage(normalizeProductImage(result, category, name));
        setIsProcessingImage(false);
        setIsImageLoading(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setIsImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const addOption = () => {
    if (!newOptName.trim()) return;
    setOptions((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: newOptName.trim(),
        price: parseFloat(newOptPrice) || 0,
      },
    ]);
    setNewOptName("");
    setNewOptPrice("");
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const handleSave = () => {
    if (!name.trim() || !price.trim()) return;
    if (isCreatingNewCategory && !newCategoryName.trim()) {
      showToast("Digite o nome da nova categoria antes de salvar o produto.", "warning");
      return;
    }

    const targetCategory = isCreatingNewCategory
      ? newCategoryName.trim().toLowerCase().replace(/\s+/g, "-")
      : category;

    const finalImage = image.trim()
      ? normalizeProductImage(image.trim(), targetCategory, name)
      : getCategoryFallbackImage(targetCategory, name);

    onSave(
      {
        id: product?.id || `p-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        image: finalImage,
        category: targetCategory,
        available,
        options,
      },
      isCreatingNewCategory ? newCategoryName.trim() : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-gray-800">
            {product ? "Editar produto" : "Novo produto"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Ex: Cheese Bacon Especial"
            />
          </Field>
          <Field label="Descrição">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input resize-none"
              rows={2}
              placeholder="Descrição do produto"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-input"
                type="number"
                placeholder="0.00"
              />
            </Field>
            <Field label="Categoria">
              <select
                value={isCreatingNewCategory ? "__new__" : category}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setIsCreatingNewCategory(true);
                  } else {
                    setIsCreatingNewCategory(false);
                    setCategory(e.target.value);
                  }
                }}
                className="form-input"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}{c.name}
                  </option>
                ))}
                <option value="__new__" className="font-bold text-amber-600 bg-amber-50">
                  + Criar nova categoria...
                </option>
              </select>
            </Field>
          </div>

          {/* Campo dinâmico quando o lojista seleciona '+ Criar nova categoria...' */}
          {isCreatingNewCategory && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-amber-600" />
                  Nome da Nova Categoria
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNewCategory(false);
                    setNewCategoryName("");
                    setCategory(availableCategories[0]?.id || "lanches");
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Açaí Especial, Sobremesas, Bebidas..."
                className="w-full rounded-xl border border-amber-300 bg-white py-2 px-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                autoFocus
              />
              <p className="text-[11px] text-amber-800/80">
                Esta nova categoria será salva na tabela de categorias no banco de dados e vinculada ao produto.
              </p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Foto do produto
              </label>
              <span className="text-[11px] text-gray-400">
                Gere com IA ou selecione da galeria
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Botão Gerar Foto com IA */}
              <button
                type="button"
                onClick={handleGenerateAiPhoto}
                disabled={isGeneratingAiImage || isProcessingImage}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 px-3.5 text-xs font-bold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Gera foto realista e profissional para o item baseado no nome via Gemini"
              >
                {isGeneratingAiImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Gerando Foto com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-200 animate-pulse" />
                    <span>Gerar Foto com IA</span>
                  </>
                )}
              </button>

              {/* Botão Selecionar da Galeria */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage || isGeneratingAiImage}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 px-3.5 text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Upload className="h-4 w-4 text-gray-500" />
                <span>{isProcessingImage ? "Processando..." : "Selecionar da galeria"}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />

            {/* Estado de Carregamento Ativo (Skeleton / Spinner) enquanto a IA gera */}
            {isGeneratingAiImage && (
              <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 animate-pulse">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-amber-200/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                    <span>Gerando foto realista com IA...</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-amber-700">
                    Otimizando apresentação gastronômica, texturas e cores.
                  </p>
                </div>
              </div>
            )}

            {/* Prévia da foto escolhida */}
            {!isGeneratingAiImage && image && (
              <div className="mt-2.5 flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2.5">
                <div className="flex items-center gap-3">
                  {/* Container da Imagem com Skeleton / Spinner durante download */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
                    {isImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 z-10">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                      </div>
                    )}
                    <img
                      key={image}
                      src={image}
                      alt="Prévia do produto"
                      onLoad={() => {
                        setIsImageLoading(false);
                        setImageError(false);
                      }}
                      onError={(e) => {
                        console.error("[AdminMenu] Falha ao carregar imagem do produto:", image, e);
                        setIsImageLoading(false);
                        setImageError(true);
                      }}
                      className={`h-full w-full object-cover transition-opacity duration-200 ${
                        isImageLoading ? "opacity-0" : "opacity-100"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {imageError ? (
                      <div>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span>Falha ao carregar imagem</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                          A URL não pôde ser renderizada no navegador.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Foto vinculada ao produto</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                          {image.includes("pollinations.ai")
                            ? "Foto realista gerada por IA"
                            : image.startsWith("data:")
                            ? "Foto enviada da galeria"
                            : "Foto do produto ativa"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleGenerateAiPhoto}
                      disabled={isGeneratingAiImage}
                      className="flex h-8 px-2 items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition border border-amber-200"
                      title="Gerar outra opção com IA"
                    >
                      <Sparkles className="h-3 w-3 text-amber-600" />
                      <span>Outra</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImage("");
                        setImageError(false);
                        setIsImageLoading(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition"
                      title="Remover foto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Opção de recuperação caso a URL falhe */}
                {imageError && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200 text-xs">
                    <span className="text-[11px] text-gray-500">Usar foto profissional da categoria:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const fallback = getCategoryFallbackImage(category, name);
                        setImage(fallback);
                        setImageError(false);
                        setIsImageLoading(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                    >
                      Aplicar foto reserva
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-primary)]"
            />
            <span className="text-sm text-gray-700">Disponível para venda</span>
          </label>

          {/* Options */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Opcionais / Adicionais</label>
            <div className="space-y-2">
              {options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="flex-1 text-sm text-gray-700">{opt.name}</span>
                  <span className="text-xs text-gray-400">
                    {opt.price > 0 ? `+ ${formatPrice(opt.price, config)}` : "Grátis"}
                  </span>
                  <button
                    onClick={() => removeOption(opt.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newOptName}
                onChange={(e) => setNewOptName(e.target.value)}
                className="form-input flex-1"
                placeholder="Nome do opcional"
              />
              <input
                value={newOptPrice}
                onChange={(e) => setNewOptPrice(e.target.value)}
                className="form-input w-24"
                type="number"
                placeholder="Preço"
              />
              <button
                onClick={addOption}
                className="flex items-center justify-center rounded-lg bg-gray-100 px-3 text-gray-600 hover:bg-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-xl bg-primary py-3.5 font-bold text-white transition hover:bg-primary-dark"
          >
            Salvar produto
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}
