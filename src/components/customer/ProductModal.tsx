import { useState, useMemo } from "react";
import { Minus, Plus, X, ShoppingBag, Check, Layers, AlertCircle } from "lucide-react";
import type { Product, ProductOption, AddonGroup, AddonItem } from "@/types";
import { formatPrice } from "@/utils/order";
import { useStore } from "@/context/StoreContext";
import { normalizeProductImage, handleImageError } from "@/utils/imageUtils";

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAdded: () => void;
}

export function ProductModal({ product, onClose, onAdded }: ProductModalProps) {
  const { addToCart, config, addonGroups, showToast } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);
  const [notes, setNotes] = useState("");

  // Resolve os grupos de adicionais vinculados a este produto
  const productAddonGroups: AddonGroup[] = useMemo(() => {
    // 1. Grupos já enriquecidos diretamente no produto
    if (product.addonGroups && Array.isArray(product.addonGroups) && product.addonGroups.length > 0) {
      return product.addonGroups;
    }
    // 2. Grupos vinculados pelos IDs a partir da lista global da loja
    if (product.addonGroupIds && Array.isArray(product.addonGroupIds) && product.addonGroupIds.length > 0) {
      return (addonGroups || []).filter((g) => product.addonGroupIds!.includes(g.id));
    }
    return [];
  }, [product.addonGroups, product.addonGroupIds, addonGroups]);

  // Soma de todos os adicionais e opcionais selecionados
  const optionsTotal = selectedOptions.reduce((sum, o) => sum + (o?.price || 0), 0);
  const unitPrice = (product.price || 0) + optionsTotal;
  const totalPrice = unitPrice * quantity;

  // Toggle para opcionais legados específicos do produto
  const toggleLegacyOption = (option: ProductOption) => {
    setSelectedOptions((prev) => {
      const exists = prev.find((o) => o.id === option.id);
      if (exists) return prev.filter((o) => o.id !== option.id);
      return [...prev, option];
    });
  };

  // Toggle para itens dos Grupos de Adicionais Globais
  const toggleAddonItem = (group: AddonGroup, item: AddonItem) => {
    const optionId = `addon-${group.id}-${item.id}`;
    const exists = selectedOptions.some((o) => o.id === optionId);

    if (exists) {
      setSelectedOptions((prev) => prev.filter((o) => o.id !== optionId));
    } else {
      if (group.maxSelection === 1) {
        // Escolha única (estilo rádio): substitui qualquer seleção prévia desse mesmo grupo
        setSelectedOptions((prev) => [
          ...prev.filter((o) => o.groupId !== group.id),
          {
            id: optionId,
            name: item.name,
            price: item.price || 0,
            groupId: group.id,
            groupName: group.name,
          },
        ]);
      } else {
        // Múltipla escolha: verifica limite máximo de escolhas se configurado
        const currentCountInGroup = selectedOptions.filter((o) => o.groupId === group.id).length;
        if (group.maxSelection > 0 && currentCountInGroup >= group.maxSelection) {
          showToast(
            `Você pode escolher no máximo ${group.maxSelection} ${
              group.maxSelection === 1 ? "item" : "itens"
            } em "${group.name}".`,
            "warning"
          );
          return;
        }

        setSelectedOptions((prev) => [
          ...prev,
          {
            id: optionId,
            name: item.name,
            price: item.price || 0,
            groupId: group.id,
            groupName: group.name,
          },
        ]);
      }
    }
  };

  // Validação de grupos obrigatórios
  const pendingRequiredGroups = useMemo(() => {
    return productAddonGroups.filter((group) => {
      const minRequired = group.minSelection > 0 ? group.minSelection : group.required ? 1 : 0;
      if (minRequired <= 0) return false;
      const countInGroup = selectedOptions.filter((o) => o.groupId === group.id).length;
      return countInGroup < minRequired;
    });
  }, [productAddonGroups, selectedOptions]);

  const handleAdd = () => {
    if (pendingRequiredGroups.length > 0) {
      const firstPending = pendingRequiredGroups[0];
      const minRequired = firstPending.minSelection > 0 ? firstPending.minSelection : 1;
      showToast(
        `Selecione pelo menos ${minRequired} ${
          minRequired === 1 ? "opção" : "opções"
        } em "${firstPending.name}".`,
        "warning"
      );
      return;
    }

    addToCart(product, quantity, selectedOptions, notes.trim());
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white animate-slide-up sm:rounded-3xl shadow-2xl flex flex-col">
        {/* Foto do Produto e Botão Fechar */}
        <div className="relative bg-gray-100 shrink-0">
          <img
            src={normalizeProductImage(product.image, product.category, product.name)}
            alt={product.name}
            onError={(e) => handleImageError(e, product.category, product.name)}
            className="h-52 sm:h-60 w-full object-cover rounded-t-3xl"
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Informações Principais */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
              {product.name}
            </h2>
            {product.description && (
              <p className="mt-1 text-xs sm:text-sm text-gray-600 leading-relaxed">
                {product.description}
              </p>
            )}
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xl font-black text-emerald-700">
                {formatPrice(product.price, config)}
              </span>
              <span className="text-xs text-gray-400 font-medium">Preço base</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* GRUPOS DE ADICIONAIS / COMPLEMENTOS GLOBAIS */}
          {/* ========================================================================= */}
          {productAddonGroups.length > 0 && (
            <div className="space-y-4 pt-1">
              {productAddonGroups.map((group) => {
                const minRequired = group.minSelection > 0 ? group.minSelection : group.required ? 1 : 0;
                const isRequired = minRequired > 0;
                const selectedInGroup = selectedOptions.filter((o) => o.groupId === group.id);
                const countInGroup = selectedInGroup.length;
                const isSingleChoice = group.maxSelection === 1;
                const isSatisfied = !isRequired || countInGroup >= minRequired;

                return (
                  <div
                    key={group.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isRequired && !isSatisfied
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-gray-200 bg-gray-50/40"
                    }`}
                  >
                    {/* Cabeçalho do Grupo de Adicionais */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-primary" />
                            {group.name}
                          </h3>
                        </div>
                        {group.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                        )}
                      </div>

                      {/* Tag de Regra */}
                      <span
                        className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          isRequired
                            ? isSatisfied
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {isRequired
                          ? minRequired === 1
                            ? "Obrigatório (1)"
                            : `Obrigatório (mín. ${minRequired})`
                          : "Opcional"}
                        {isSingleChoice
                          ? " • Escolha 1"
                          : group.maxSelection > 1
                          ? ` • Até ${group.maxSelection}`
                          : ""}
                      </span>
                    </div>

                    {/* Lista de Itens do Grupo */}
                    <div className="space-y-2 mt-3">
                      {group.items.map((item) => {
                        const optionId = `addon-${group.id}-${item.id}`;
                        const isChecked = selectedOptions.some((o) => o.id === optionId);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleAddonItem(group, item)}
                            className={`flex w-full items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                              isChecked
                                ? "border-primary bg-primary/10 shadow-xs"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <span className="flex items-center gap-3 min-w-0 pr-2">
                              {/* Ícone rádio (se escolha única) ou checkbox quadrado (se multi) */}
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center transition ${
                                  isSingleChoice ? "rounded-full" : "rounded-md"
                                } border-2 ${
                                  isChecked ? "border-primary bg-primary" : "border-gray-300 bg-white"
                                }`}
                              >
                                {isChecked && (
                                  isSingleChoice ? (
                                    <span className="h-2 w-2 rounded-full bg-white" />
                                  ) : (
                                    <Check className="h-3 w-3 text-white stroke-[3]" />
                                  )
                                )}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                                {item.name}
                              </span>
                            </span>

                            <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono shrink-0">
                              {item.price > 0 ? `+ ${formatPrice(item.price, config)}` : "Grátis"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPCIONAIS LEGADOS DO PRODUTO (SE HOUVER) */}
          {/* ========================================================================= */}
          {product.options && product.options.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-bold text-gray-800">Outros Opcionais</h3>
              <div className="space-y-2">
                {product.options.map((option) => {
                  const checked = !!selectedOptions.find((o) => o.id === option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleLegacyOption(option)}
                      className={`flex w-full items-center justify-between rounded-xl border-2 px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                        checked ? "border-primary bg-primary/10 shadow-xs" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0 pr-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                            checked ? "border-primary bg-primary" : "border-gray-300 bg-white"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                          {option.name}
                        </span>
                      </span>
                      {option.price > 0 && (
                        <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono shrink-0">
                          + {formatPrice(option.price, config)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Campo de Observações */}
          <div className="pt-1">
            <h3 className="mb-1.5 text-xs font-bold text-gray-700">Observações do Item</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne, caprichar no molho..."
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              rows={2}
            />
          </div>

          {/* Barra de Quantidade e Botão Adicionar */}
          <div className="pt-2 flex items-center gap-3">
            {/* Controle de Quantidade */}
            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-xs transition hover:bg-gray-100 active:scale-95 cursor-pointer"
                title="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-7 text-center font-bold text-sm text-gray-800">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-xs transition hover:bg-gray-100 active:scale-95 cursor-pointer"
                title="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Botão Adicionar à Sacola */}
            <button
              type="button"
              onClick={handleAdd}
              className="flex flex-1 items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 sm:px-5 py-3.5 font-black text-white shadow-lg shadow-orange-500/20 transition active:scale-[0.98] cursor-pointer"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <ShoppingBag className="h-4 w-4" />
                <span>Adicionar à Sacola</span>
              </span>
              <span className="text-xs sm:text-sm font-mono bg-black/15 px-2 py-0.5 rounded-lg">
                {formatPrice(totalPrice, config)}
              </span>
            </button>
          </div>

          {/* Aviso se houver grupos obrigatórios pendentes */}
          {pendingRequiredGroups.length > 0 && (
            <p className="text-[11px] text-amber-700 font-semibold text-center flex items-center justify-center gap-1.5 animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Selecione os adicionais obrigatórios para continuar</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
