import { useState } from "react";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatPrice } from "@/utils/order";
import type { AddonGroup, AddonItem } from "@/types";

export function AdminAddons() {
  const {
    addonGroups,
    createAddonGroup,
    updateAddonGroup,
    deleteAddonGroup,
    config,
    showToast,
  } = useStore();

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<AddonGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtragem de grupos por pesquisa
  const filteredGroups = addonGroups.filter((g) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const matchName = g.name.toLowerCase().includes(term);
    const matchDesc = g.description?.toLowerCase().includes(term);
    const matchItem = g.items?.some((it) => it.name.toLowerCase().includes(term));
    return matchName || matchDesc || matchItem;
  });

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: AddonGroup) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAddonGroup(groupToDelete.id);
      setGroupToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Modelos prontos para facilitar o lojista
  const handleCreateTemplate = async (templateType: "lanches" | "acai" | "pizzas") => {
    if (templateType === "lanches") {
      await createAddonGroup({
        name: "Adicionais de Lanches",
        description: "Turbine seu hambúrguer ou lanche com nossos complementos artesanais.",
        minSelection: 0,
        maxSelection: 0,
        required: false,
        items: [
          { id: `item-${Date.now()}-1`, name: "Bacon Crocante Fatiado", price: 5.0, available: true },
          { id: `item-${Date.now()}-2`, name: "Queijo Cheddar Cremoso Extra", price: 4.5, available: true },
          { id: `item-${Date.now()}-3`, name: "Hambúrguer Artesanal Extra 150g", price: 9.0, available: true },
          { id: `item-${Date.now()}-4`, name: "Ovo Frito", price: 3.0, available: true },
          { id: `item-${Date.now()}-5`, name: "Cebola Caramelizada", price: 4.0, available: true },
        ],
      });
    } else if (templateType === "acai") {
      await createAddonGroup({
        name: "Complementos de Açaí",
        description: "Escolha seus acompanhamentos e coberturas favoritas para o açaí.",
        minSelection: 0,
        maxSelection: 0,
        required: false,
        items: [
          { id: `item-${Date.now()}-1`, name: "Leite Ninho em Pó", price: 3.5, available: true },
          { id: `item-${Date.now()}-2`, name: "Leite Condensado", price: 3.0, available: true },
          { id: `item-${Date.now()}-3`, name: "Nutella Pura", price: 6.0, available: true },
          { id: `item-${Date.now()}-4`, name: "Morango Fresco Picado", price: 4.5, available: true },
          { id: `item-${Date.now()}-5`, name: "Paçoca de Amendoim", price: 2.5, available: true },
          { id: `item-${Date.now()}-6`, name: "Granola Crocante", price: 2.5, available: true },
        ],
      });
    } else if (templateType === "pizzas") {
      await createAddonGroup({
        name: "Bordas Recheadas",
        description: "Escolha o recheio para a borda da sua pizza.",
        minSelection: 0,
        maxSelection: 1,
        required: false,
        items: [
          { id: `item-${Date.now()}-1`, name: "Borda Catupiry Original", price: 9.9, available: true },
          { id: `item-${Date.now()}-2`, name: "Borda Cheddar Cremoso", price: 8.9, available: true },
          { id: `item-${Date.now()}-3`, name: "Borda Chocolate ao Leite", price: 10.9, available: true },
        ],
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                Gerenciar Adicionais & Complementos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Crie grupos globais com preços adicionais para vincular a múltiplos produtos do seu cardápio.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Grupo de Adicionais</span>
        </button>
      </div>

      {/* Barra de Pesquisa e Sugestões Prontas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome de grupo ou item..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {addonGroups.length === 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Criar modelo pronto:
            </span>
            <button
              type="button"
              onClick={() => handleCreateTemplate("lanches")}
              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
            >
              + Lanches
            </button>
            <button
              type="button"
              onClick={() => handleCreateTemplate("acai")}
              className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
            >
              + Açaí
            </button>
            <button
              type="button"
              onClick={() => handleCreateTemplate("pizzas")}
              className="bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
            >
              + Bordas Pizza
            </button>
          </div>
        )}
      </div>

      {/* Lista de Grupos de Adicionais */}
      {addonGroups.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-100">
            <Layers className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Nenhum Grupo de Adicionais Cadastrado
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Crie grupos como <strong>"Adicionais de Lanches"</strong> (Bacon, Cheddar, Ovo) ou <strong>"Ingredientes Açaí"</strong>.
              Depois basta selecioná-los nos produtos do seu cardápio!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Primeiro Grupo</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateTemplate("lanches")}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Usar Modelo de Lanches</span>
            </button>
          </div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            Nenhum grupo encontrado com o termo "{search}".
          </p>
          <button
            onClick={() => setSearch("")}
            className="text-xs text-amber-600 font-bold hover:underline"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredGroups.map((group) => {
            const isRequired = Boolean(group.required || group.minSelection > 0);
            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400/70 p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between gap-4 relative group"
              >
                <div className="space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                          {group.name}
                        </h3>
                      </div>
                      {group.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>

                    {/* Botões de Ação do Card */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(group)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                        title="Editar grupo de adicionais"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupToDelete(group)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Badges de Regras do Grupo */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        isRequired
                          ? "bg-amber-100/90 text-amber-900 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {isRequired
                        ? `Obrigatório (mín. ${group.minSelection || 1})`
                        : "Opcional"}
                    </span>

                    <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {group.maxSelection === 1
                        ? "Escolha única (1 item)"
                        : group.maxSelection > 1
                        ? `Máximo: ${group.maxSelection} itens`
                        : "Sem limite de itens"}
                    </span>

                    <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                      {group.items?.length || 0} {group.items?.length === 1 ? "item" : "itens"}
                    </span>
                  </div>

                  {/* Lista de Itens do Grupo */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Itens do Grupo:
                    </span>
                    {!group.items || group.items.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Nenhum item cadastrado neste grupo.
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition"
                          >
                            <span className="font-medium text-slate-800 truncate mr-2">
                              {item.name}
                            </span>
                            <span className="font-bold text-emerald-700 font-mono shrink-0">
                              {item.price > 0 ? `+ ${formatPrice(item.price, config)}` : "Grátis"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Pronto para vincular nos produtos</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(group)}
                    className="text-amber-600 font-bold hover:underline cursor-pointer"
                  >
                    Gerenciar itens →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição do Grupo de Adicionais */}
      {isModalOpen && (
        <AddonGroupModal
          group={editingGroup}
          onClose={() => setIsModalOpen(false)}
          onSave={async (groupData) => {
            if (editingGroup) {
              await updateAddonGroup(editingGroup.id, groupData);
            } else {
              await createAddonGroup(groupData);
            }
            setIsModalOpen(false);
          }}
          showToast={showToast}
          config={config}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Excluir Grupo de Adicionais?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir o grupo <strong>"{groupToDelete.name}"</strong>? Ele será desvinculado dos produtos associados.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Modal de Criação / Edição de Grupo e Itens
// ----------------------------------------------------------------------------
function AddonGroupModal({
  group,
  onClose,
  onSave,
  showToast,
  config,
}: {
  group: AddonGroup | null;
  onClose: () => void;
  onSave: (data: Omit<AddonGroup, "id" | "tenantId">) => Promise<void>;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  config: any;
}) {
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [required, setRequired] = useState(Boolean(group?.required || (group?.minSelection && group.minSelection > 0)));
  const [minSelection, setMinSelection] = useState<number>(group?.minSelection ?? (group?.required ? 1 : 0));
  const [maxSelection, setMaxSelection] = useState<number>(group?.maxSelection ?? 0);

  // Lista de itens cadastrados
  const [items, setItems] = useState<AddonItem[]>(() => {
    if (group?.items && Array.isArray(group.items)) {
      return [...group.items];
    }
    return [];
  });

  // Campos para novo item inline
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Adicionar item à lista local
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) {
      showToast("Digite o nome do adicional (ex: Bacon R$ 4,00).", "warning");
      return;
    }

    const priceNum = parseFloat(newItemPrice.replace(",", ".")) || 0;
    const newItem: AddonItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newItemName.trim(),
      price: priceNum,
      available: true,
    };

    setItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("Digite o nome do grupo de adicionais.", "warning");
      return;
    }

    if (items.length === 0) {
      showToast("Adicione pelo menos 1 item com nome e preço ao grupo.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        minSelection: required ? Math.max(1, Number(minSelection) || 1) : Math.max(0, Number(minSelection) || 0),
        maxSelection: Math.max(0, Number(maxSelection) || 0),
        required,
        items,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {group ? "Editar Grupo de Adicionais" : "Novo Grupo de Adicionais"}
              </h2>
              <p className="text-xs text-slate-500">
                Defina as regras e adicione os itens com nome e valor adicional.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Nome e Descrição */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Grupo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Adicionais de Lanches, Ingredientes Açaí, Escolha a Borda..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descrição ou Instrução (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Escolha os complementos para turbinar seu lanche"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Configurações de Regra (Obrigatório / Mínimo / Máximo) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
              Regras de Escolha do Cliente
            </h4>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => {
                    setRequired(e.target.checked);
                    if (e.target.checked && minSelection === 0) {
                      setMinSelection(1);
                    }
                  }}
                  className="h-4 w-4 rounded accent-[var(--color-primary)] text-amber-600"
                />
                <span className="text-xs font-bold text-slate-800">
                  Seleção Obrigatória (o cliente deve escolher ao menos 1 item)
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mínimo de Itens
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={minSelection}
                  onChange={(e) => setMinSelection(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                  placeholder="0 = opcional"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Máximo de Itens (0 = ilimitado)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={maxSelection}
                  onChange={(e) => setMaxSelection(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                  placeholder="0 = sem limite"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              {maxSelection === 1
                ? "Dica: Com máximo 1, o cliente só poderá marcar uma opção (comportamento de escolha única)."
                : maxSelection > 1
                ? `O cliente poderá marcar no máximo ${maxSelection} opções simultaneamente.`
                : "Sem limite: O cliente poderá selecionar quantos adicionais desejar."}
            </p>
          </div>

          {/* Seção de Cadastro de Itens do Grupo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Itens / Adicionais do Grupo ({items.length})
              </label>
              <span className="text-[11px] text-slate-400">
                Pelo menos 1 item obrigatório
              </span>
            </div>

            {/* Sub-formulário para adicionar item */}
            <div className="flex flex-col sm:flex-row gap-2 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/20">
              <div className="flex-1">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  placeholder="Nome do item (ex: Bacon Crocante)"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="w-full sm:w-32">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    placeholder="4.00"
                    className="w-full pl-8 pr-2.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddItem()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Lista dos Itens Cadastrados */}
            {items.length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Nenhum item adicionado ainda. Preencha o nome e preço acima e clique em <strong>Adicionar</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-xs text-slate-800 truncate">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-emerald-600 font-mono">
                        {item.price > 0 ? `+ ${formatPrice(item.price, config)}` : "Grátis"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        title="Remover este item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? "Salvando..." : group ? "Salvar Alterações" : "Criar Grupo"}
          </button>
        </div>
      </div>
    </div>
  );
}
