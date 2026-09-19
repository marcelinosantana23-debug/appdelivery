import { useState, useRef } from "react";
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
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { categories } from "@/data/mockData";
import { formatPrice } from "@/utils/order";
import type { Product, ProductOption } from "@/types";

export function AdminMenu() {
  const { products, config, addProduct, editProduct, removeProduct } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (product: Product) => {
    const isExisting = products.some((p) => p.id === product.id);
    if (isExisting) {
      await editProduct(product.id, product);
    } else {
      const { id: _id, tenantId: _tenantId, ...rest } = product;
      await addProduct(rest);
    }
    setShowForm(false);
    setEditing(null);
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

  return (
    <div className="mx-auto w-full max-w-4xl p-3 sm:p-4 space-y-4 flex flex-col max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-full overflow-x-hidden">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark shrink-0"
        >
          <Plus className="h-4 w-4" />
          Novo
        </button>
      </div>

      {filtered.map((product) => (
        <div
          key={product.id}
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm w-full max-w-full overflow-x-hidden ${
            !product.available ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0 flex-1">
            <img
              src={product.image}
              alt={product.name}
              className="h-14 w-14 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-800 text-sm truncate">{product.name}</h3>
                {!product.available && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600 shrink-0">
                    Pausado
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">
                {categories.find((c) => c.id === product.category)?.name} · {formatPrice(product.price, config)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
            <button
              onClick={() => toggleAvailable(product.id)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                product.available
                  ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  : "bg-green-100 text-green-600 hover:bg-green-200"
              }`}
              title={product.available ? "Pausar" : "Reativar"}
            >
              {product.available ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => { setEditing(product); setShowForm(true); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition hover:bg-blue-200"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(product.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <ProductForm
          product={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  onSave,
  onClose,
}: {
  product: Product | null;
  onSave: (p: Product) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price.toString() || "");
  const [image, setImage] = useState(product?.image || "");
  const [category, setCategory] = useState(product?.category || "lanches");
  const [available, setAvailable] = useState(product?.available ?? true);
  const [options, setOptions] = useState<ProductOption[]>(product?.options || []);
  const [newOptName, setNewOptName] = useState("");
  const [newOptPrice, setNewOptPrice] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { config } = useStore();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsProcessingImage(false);
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          setImage(dataUrl);
        } else {
          setImage(result);
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setImage(result);
        setIsProcessingImage(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
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
    onSave({
      id: product?.id || `p-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      image: image.trim() || "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600",
      category,
      available,
      options,
    });
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Foto do produto
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-3.5 px-4 text-sm font-semibold text-gray-700 transition hover:border-primary hover:bg-orange-50/50 hover:text-primary active:scale-[0.99] disabled:opacity-50"
            >
              <Upload className="h-4 w-4 text-primary" />
              <span>{isProcessingImage ? "Processando foto..." : "Selecionar foto da galeria"}</span>
            </button>

            {/* Prévia da foto escolhida */}
            {image && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2.5">
                <img
                  src={image}
                  alt="Prévia do produto"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover border border-gray-200 bg-white shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Foto carregada com sucesso</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                    {image.startsWith("data:") ? "Foto selecionada da galeria" : "Imagem cadastrada"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImage("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition"
                  title="Remover foto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
