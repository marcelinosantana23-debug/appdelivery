import { useState, useRef, useEffect } from "react";
import {
  Save,
  Check,
  Palette,
  Store as StoreIcon,
  DollarSign,
  Clock,
  MapPin,
  QrCode,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Copy,
  ExternalLink,
  Share2,
  Bike,
  User,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { getOfficialStoreUrl, copyTextToClipboard } from "@/utils/url";
import { StoreQrCodePlate } from "./StoreQrCodePlate";
import { AdminStoriesSection } from "./AdminStoriesSection";
import { StoreStoriesModal } from "@/components/common/StoreStoriesModal";
import type { StoreStory } from "@/types";
import type { PixKeyType } from "@/config/store";

const PRESET_COLORS = [
  { name: "Vermelho", primary: "#E63946", dark: "#C1121F", light: "#F77F00", accent: "#FCBF49" },
  { name: "Verde", primary: "#2A9D8F", dark: "#1B6B61", light: "#52B788", accent: "#95D5B2" },
  { name: "Azul", primary: "#0077B6", dark: "#005F8A", light: "#00B4D8", accent: "#90E0EF" },
  { name: "Laranja", primary: "#F77F00", dark: "#D66400", light: "#FCBF49", accent: "#EAE2B7" },
  { name: "Roxo", primary: "#7209B7", dark: "#560088", light: "#B5179E", accent: "#F72585" },
  { name: "Marrom", primary: "#7F5539", dark: "#5C3D24", light: "#B08968", accent: "#DDB892" },
  { name: "Rosa", primary: "#E63946", dark: "#B5174F", light: "#F72585", accent: "#FFB3C6" },
  { name: "Preto", primary: "#2B2D42", dark: "#1A1B2E", light: "#5C6378", accent: "#8D99AE" },
];

const PIX_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "phone", label: "Celular" },
  { value: "email", label: "E-mail" },
  { value: "random", label: "Aleatória" },
];

export function AdminSettings() {
  const { config, updateConfig, isStoreOpen, toggleStore, orders, showToast, deleteTenant, logout } = useStore();

  const [form, setForm] = useState({
    name: config.name,
    bannerImage: config.bannerImage || "",
    whatsapp: config.whatsapp,
    motoboyPhone: config.motoboyPhone || "",
    motoboyName: config.motoboyName || "",
    pixKey: config.pixKey,
    pixKeyType: config.pixKeyType,
    deliveryFee: config.deliveryFee.toString(),
    deliveryTime: config.deliveryTime || "30-45 min",
    address: config.address,
    hours: config.hours,
    primaryColor: config.primaryColor,
    primaryDark: config.primaryDark,
    primaryLight: config.primaryLight,
    accentColor: config.accentColor,
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingMotoboy, setIsSavingMotoboy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrPlateModalOpen, setIsQrPlateModalOpen] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const [storiesModalOpen, setStoriesModalOpen] = useState(false);
  const [storiesToPreview, setStoriesToPreview] = useState<StoreStory[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza formulário sempre que as configurações do restaurante forem carregadas do banco de dados D1
  useEffect(() => {
    setForm({
      name: config.name,
      bannerImage: config.bannerImage || "",
      whatsapp: config.whatsapp,
      motoboyPhone: config.motoboyPhone || "",
      motoboyName: config.motoboyName || "",
      pixKey: config.pixKey,
      pixKeyType: config.pixKeyType,
      deliveryFee: config.deliveryFee.toString(),
      deliveryTime: config.deliveryTime || "30-45 min",
      address: config.address,
      hours: config.hours,
      primaryColor: config.primaryColor,
      primaryDark: config.primaryDark,
      primaryLight: config.primaryLight,
      accentColor: config.accentColor,
    });
  }, [
    config.id,
    config.slug,
    config.name,
    config.whatsapp,
    config.motoboyPhone,
    config.motoboyName,
    config.pixKey,
    config.pixKeyType,
    config.deliveryFee,
    config.deliveryTime,
    config.address,
    config.hours,
    config.primaryColor,
    config.primaryDark,
    config.primaryLight,
    config.accentColor,
    config.bannerImage,
  ]);

  const stats = {
    total: orders.length,
    active: orders.filter((o) => o.status !== "done" && o.status !== "cancelled").length,
    done: orders.filter((o) => o.status === "done").length,
    revenue: orders.filter((o) => o.status === "done").reduce((sum, o) => sum + o.total, 0),
  };

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingBanner(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsProcessingBanner(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 720;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
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
          set("bannerImage", dataUrl);
        } else {
          set("bannerImage", result);
        }
        setIsProcessingBanner(false);
      };
      img.onerror = () => {
        set("bannerImage", result);
        setIsProcessingBanner(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setIsProcessingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig({
        name: form.name.trim(),
        bannerImage: form.bannerImage,
        whatsapp: form.whatsapp.trim(),
        motoboyPhone: form.motoboyPhone.trim(),
        motoboyName: form.motoboyName.trim(),
        pixKey: form.pixKey.trim(),
        pixKeyType: form.pixKeyType,
        deliveryFee: parseFloat(form.deliveryFee) || 0,
        deliveryTime: form.deliveryTime.trim(),
        address: form.address.trim(),
        hours: form.hours.trim(),
        primaryColor: form.primaryColor,
        primaryDark: form.primaryDark,
        primaryLight: form.primaryLight,
        accentColor: form.accentColor,
      });
      setSaved(true);
      showToast("Configurações e dados do Motoboy Fixo salvos com sucesso!", "success");
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      showToast(err?.message || "Erro ao salvar configurações", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePermanentStore = async () => {
    const targetIdOrSlug = config.id || config.slug;
    if (!targetIdOrSlug) return;
    setIsDeletingStore(true);
    try {
      const ok = await deleteTenant(targetIdOrSlug);
      if (ok) {
        showToast("Loja excluída definitivamente com sucesso!", "success");
        logout();
        setShowDeleteModal(false);
        setTimeout(() => {
          window.location.href = "/";
        }, 300);
      } else {
        showToast("Não foi possível excluir a loja.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Erro ao excluir loja.", "error");
    } finally {
      setIsDeletingStore(false);
    }
  };

  const handleSaveMotoboy = async () => {
    setIsSavingMotoboy(true);
    try {
      await updateConfig({
        motoboyPhone: form.motoboyPhone.trim(),
        motoboyName: form.motoboyName.trim(),
      });
      showToast("Dados do Motoboy Fixo gravados no banco de dados!", "success");
    } catch (err: any) {
      showToast(err?.message || "Erro ao salvar dados do motoboy", "error");
    } finally {
      setIsSavingMotoboy(false);
    }
  };

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setForm((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      primaryDark: preset.dark,
      primaryLight: preset.light,
      accentColor: preset.accent,
    }));
    setSaved(false);
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-3 sm:p-4 space-y-4 sm:space-y-5 flex flex-col max-w-full overflow-x-hidden">
      {/* Store status toggle */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700">Status da Loja</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {isStoreOpen ? "Recebendo pedidos normalmente" : "Clientes não podem finalizar pedidos"}
            </p>
          </div>
          <button
            onClick={toggleStore}
            className={`relative h-10 w-16 rounded-full transition-colors ${
              isStoreOpen ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform ${
                isStoreOpen ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-gray-700">Estatísticas</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total de pedidos" value={stats.total.toString()} />
          <StatCard label="Pedidos ativos" value={stats.active.toString()} />
          <StatCard label="Finalizados" value={stats.done.toString()} />
          <StatCard
            label="Faturamento"
            value={`${config.currency} ${stats.revenue.toFixed(2).replace(".", ",")}`}
          />
        </div>
      </div>

      {/* Link Oficial do Cardápio para os Clientes */}
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-bold text-gray-800">Link Oficial da Vitrine (Clientes)</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
            Cloudflare Workers
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Envie este link para seus clientes no WhatsApp e redes sociais para que eles façam pedidos diretamente no seu cardápio:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 truncate rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 font-mono text-xs text-gray-800 shadow-sm select-all">
            {getOfficialStoreUrl(config.slug)}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const url = getOfficialStoreUrl(config.slug);
                const ok = await copyTextToClipboard(url);
                if (ok) {
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                copiedLink
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-white active:scale-95"
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <a
              href={getOfficialStoreUrl(config.slug)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
              title="Abrir vitrine em nova aba"
            >
              <ExternalLink className="h-4 w-4 text-gray-500" />
              <span className="hidden sm:inline">Ver Loja</span>
            </a>
          </div>
        </div>
      </div>

      {/* Card QR Code & Placa de Divulgação */}
      <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">QR Code & Placa de Divulgação</h2>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-500/40">
                Imprimir
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Gere o QR Code exclusivo da sua loja, personalize a frase e imprima placas profissionais para mesas ou balcão (A4).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsQrPlateModalOpen(true)}
          className="shrink-0 flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/25 transition active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
        >
          <QrCode className="h-4 w-4" />
          <span>Abrir Gerador de Placa</span>
        </button>
      </div>

      {/* Stories / Status da Loja (APENAS FOTOS - EXPIRAÇÃO 24H - MÁX 3) */}
      <AdminStoriesSection
        tenantId={config.id}
        slug={config.slug}
        onPreviewStories={(st) => {
          setStoriesToPreview(st);
          setStoriesModalOpen(true);
        }}
      />

      {/* Editable store settings form */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-gray-700">Informações da Lanchonete</h2>
        </div>

        <div className="space-y-4">
          {/* Foto da Lanchonete / Banner da Vitrine */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>Foto da Lanchonete / Banner da Vitrine</span>
              </label>
              <span className="text-[11px] text-gray-400">Formato capa delivery</span>
            </div>

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />

            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isProcessingBanner}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-3 px-4 text-sm font-semibold text-gray-700 transition hover:border-primary hover:bg-orange-50/40 hover:text-primary active:scale-[0.99] disabled:opacity-50"
            >
              <Upload className="h-4 w-4 text-primary" />
              <span>
                {isProcessingBanner
                  ? "Processando banner..."
                  : form.bannerImage
                  ? "Trocar foto da lanchonete / banner"
                  : "Selecionar foto da lanchonete / banner da vitrine"}
              </span>
            </button>

            {/* Pré-visualização do Banner */}
            {form.bannerImage ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="relative aspect-[16/6] w-full overflow-hidden bg-slate-900 sm:aspect-[21/7]">
                  <img
                    src={form.bannerImage}
                    alt="Pré-visualização do Banner da Vitrine"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

                  {/* Mock da marca sobreposta como na vitrine */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2.5 text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl backdrop-blur-md border border-white/30">
                      {config.logo || "🏪"}
                    </div>
                    <div>
                      <span className="block font-bold text-sm leading-tight drop-shadow-md">
                        {form.name || config.name}
                      </span>
                      <span className="text-[10px] text-white/80 font-medium">Pré-visualização na vitrine</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      set("bannerImage", "");
                      if (bannerInputRef.current) bannerInputRef.current.value = "";
                    }}
                    className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-md hover:bg-red-600 transition"
                    title="Remover banner"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 text-xs text-gray-600 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Banner carregado com sucesso</span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {form.bannerImage.startsWith("data:") ? "Foto selecionada da galeria" : "Imagem ativa"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-center text-xs text-gray-400">
                Sem banner personalizado. A vitrine exibirá a paleta de cores temática.
              </p>
            )}
          </div>

          <FormField label="Nome da Lanchonete" icon={<StoreIcon className="h-4 w-4" />}>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="form-input"
              placeholder="Nome do estabelecimento"
            />
          </FormField>

          <FormField label="WhatsApp (com DDD, apenas números)" icon={<MessageCircle className="h-4 w-4" />}>
            <input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              className="form-input"
              placeholder="5511999999999"
            />
            <p className="mt-1 text-xs text-gray-400">Para onde os pedidos serão enviados.</p>
          </FormField>

          {/* Seção Destacada: Motoboy Fixo / Entregador Oficial da Loja */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Bike className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                    Motoboy Fixo (Entregador Padrão da Loja)
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Ao receber pedidos de entrega, despache rota GPS e dados com 1 clique direto para ele.
                  </p>
                </div>
              </div>
              {form.motoboyPhone.trim() ? (
                <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                  ✓ Configurado
                </span>
              ) : (
                <span className="rounded-full bg-amber-200/80 text-amber-900 px-2.5 py-0.5 text-[11px] font-bold">
                  Não cadastrado
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-amber-700" />
                  <span>Nome do Motoboy Fixo</span>
                </label>
                <input
                  id="settings-motoboy-name"
                  value={form.motoboyName}
                  onChange={(e) => set("motoboyName", e.target.value)}
                  className="form-input bg-white border-amber-200 focus:border-amber-500"
                  placeholder="Ex: Carlos (Entregador)"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-amber-700" />
                  <span>WhatsApp do Motoboy (com DDD)</span>
                </label>
                <input
                  id="settings-motoboy-phone"
                  value={form.motoboyPhone}
                  onChange={(e) => set("motoboyPhone", e.target.value)}
                  className="form-input bg-white border-amber-200 focus:border-amber-500"
                  placeholder="Ex: 5522999998888 ou 22999998888"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-amber-200/80">
              <p className="text-[11px] text-amber-900 leading-relaxed flex-1">
                💡 <strong>Persistência Garantida:</strong> Os dados ficam salvos permanentemente no banco de dados da loja. Se o entregador faltar, você poderá trocar de motoboy ou usar um sobressalente diretamente no card do pedido.
              </p>
              <button
                type="button"
                id="btn-save-motoboy-settings"
                onClick={handleSaveMotoboy}
                disabled={isSavingMotoboy}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2.5 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                title="Salvar imediatamente os dados do motoboy fixo no banco de dados"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingMotoboy ? "Salvando no D1..." : "Salvar Motoboy Fixo"}</span>
              </button>
            </div>
          </div>

          <FormField label="Chave PIX" icon={<QrCode className="h-4 w-4" />}>
            <div className="flex gap-2">
              <select
                value={form.pixKeyType}
                onChange={(e) => set("pixKeyType", e.target.value)}
                className="form-input w-32 shrink-0"
              >
                {PIX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                value={form.pixKey}
                onChange={(e) => set("pixKey", e.target.value)}
                className="form-input"
                placeholder="Chave PIX"
              />
            </div>
          </FormField>

          <FormField label="Taxa de Entrega (R$)" icon={<DollarSign className="h-4 w-4" />}>
            <input
              value={form.deliveryFee}
              onChange={(e) => set("deliveryFee", e.target.value)}
              className="form-input"
              type="number"
              step="0.50"
              placeholder="6.00"
            />
          </FormField>

          <FormField label="Tempo Estimado de Entrega" icon={<Clock className="h-4 w-4" />}>
            <input
              value={form.deliveryTime}
              onChange={(e) => set("deliveryTime", e.target.value)}
              className="form-input"
              placeholder="Ex: 30-45 min"
            />
          </FormField>

          <FormField label="Endereço do Estabelecimento" icon={<MapPin className="h-4 w-4" />}>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="form-input"
              placeholder="Rua, número - bairro"
            />
          </FormField>

          <FormField label="Horário de Funcionamento" icon={<Clock className="h-4 w-4" />}>
            <input
              value={form.hours}
              onChange={(e) => set("hours", e.target.value)}
              className="form-input"
              placeholder="18:00 - 23:30"
            />
          </FormField>
        </div>
      </div>

      {/* Color customization */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-gray-700">Cores do Tema</h2>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs text-gray-400">Escolha um tema pronto:</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition ${
                  form.primaryColor === preset.primary
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="h-8 w-full rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.light} 100%)` }}
                />
                <span className="text-xs text-gray-500">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <ColorInput label="Primária" value={form.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorInput label="Escura" value={form.primaryDark} onChange={(v) => set("primaryDark", v)} />
          <ColorInput label="Clara" value={form.primaryLight} onChange={(v) => set("primaryLight", v)} />
          <ColorInput label="Destaque" value={form.accentColor} onChange={(v) => set("accentColor", v)} />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-75 cursor-pointer ${
          saved ? "bg-green-500" : "bg-primary hover:bg-primary-dark"
        }`}
      >
        {isSaving ? (
          <>
            <Save className="h-5 w-5 animate-spin" />
            Salvando no banco de dados...
          </>
        ) : saved ? (
          <>
            <Check className="h-5 w-5" />
            Configurações salvas!
          </>
        ) : (
          <>
            <Save className="h-5 w-5" />
            Salvar configurações
          </>
        )}
      </button>

      <p className="pb-4 text-center text-xs text-gray-400">
        As alterações são salvas automaticamente no navegador e aplicadas na hora.
      </p>

      {/* Zona de Perigo / Exclusão Permanente da Loja Demonstrativa */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-5 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <h2 className="text-sm font-bold">Zona de Perigo — Exclusão Definitiva da Loja</h2>
        </div>
        <p className="text-xs text-red-700/80 dark:text-red-300/80 mb-4 leading-relaxed">
          Deseja remover esta loja demonstrativa da plataforma? A exclusão é definitiva: o estabelecimento, categorias, cardápio, produtos, grupos de adicionais e Stories associados serão permanentemente eliminados do banco de dados (Cloudflare D1 / KV / Seed) e nunca mais reaparecerão ao recarregar ou reiniciar.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmText("");
            setShowDeleteModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-3 text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Excluir Esta Loja Definitivamente
        </button>
      </div>

      {/* Modal QR Code & Placa de Divulgação */}
      {isQrPlateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
            <StoreQrCodePlate
              onClose={() => setIsQrPlateModalOpen(false)}
              isModal
            />
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização de Stories */}
      {storiesModalOpen && (
        <StoreStoriesModal
          isOpen={storiesModalOpen}
          onClose={() => setStoriesModalOpen(false)}
          stories={storiesToPreview}
          tenant={config}
        />
      )}

      {/* Modal de Confirmação de Exclusão Definitiva */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-950/50">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Excluir Loja Definitivamente?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
              Você está prestes a excluir <strong className="text-red-600 dark:text-red-400">{config.name}</strong> e todos os seus produtos, categorias e stories. Digite <strong className="font-mono text-red-600">EXCLUIR</strong> ou o nome da loja para confirmar:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Digite EXCLUIR para confirmar"
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingStore}
                className="rounded-xl border border-gray-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePermanentStore}
                disabled={
                  isDeletingStore ||
                  (deleteConfirmText.trim().toUpperCase() !== "EXCLUIR" &&
                    deleteConfirmText.trim().toLowerCase() !== config.name.trim().toLowerCase() &&
                    deleteConfirmText.trim().toLowerCase() !== (config.slug || "").trim().toLowerCase())
                }
                className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                {isDeletingStore ? (
                  <>
                    <Save className="h-3.5 w-3.5 animate-spin" />
                    Excluindo do banco...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Confirmar Exclusão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border-2 border-gray-200"
        />
      </div>
      <p className="mt-1 text-center text-xs text-gray-300 font-mono">{value}</p>
    </div>
  );
}
