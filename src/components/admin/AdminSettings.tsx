import { useState, useRef } from "react";
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
  Sparkles,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { getOfficialStoreUrl, copyTextToClipboard } from "@/utils/url";
import { StoreQrCodePlate } from "./StoreQrCodePlate";
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
  const { config, updateConfig, isStoreOpen, toggleStore, orders } = useStore();

  const [form, setForm] = useState({
    name: config.name,
    bannerImage: config.bannerImage || "",
    whatsapp: config.whatsapp,
    pixKey: config.pixKey,
    pixKeyType: config.pixKeyType,
    deliveryFee: config.deliveryFee.toString(),
    address: config.address,
    hours: config.hours,
    primaryColor: config.primaryColor,
    primaryDark: config.primaryDark,
    primaryLight: config.primaryLight,
    accentColor: config.accentColor,
    geminiApiKey:
      (typeof window !== "undefined" ? localStorage.getItem("topfood_gemini_api_key") || "" : "") ||
      config.geminiApiKey ||
      "",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrPlateModalOpen, setIsQrPlateModalOpen] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = () => {
    updateConfig({
      name: form.name.trim(),
      bannerImage: form.bannerImage,
      whatsapp: form.whatsapp.trim(),
      pixKey: form.pixKey.trim(),
      pixKeyType: form.pixKeyType,
      deliveryFee: parseFloat(form.deliveryFee) || 0,
      address: form.address.trim(),
      hours: form.hours.trim(),
      primaryColor: form.primaryColor,
      primaryDark: form.primaryDark,
      primaryLight: form.primaryLight,
      accentColor: form.accentColor,
      geminiApiKey: form.geminiApiKey.trim(),
    });
    try {
      if (form.geminiApiKey.trim()) {
        localStorage.setItem("topfood_gemini_api_key", form.geminiApiKey.trim());
      } else {
        localStorage.removeItem("topfood_gemini_api_key");
      }
    } catch (e) {
      console.warn("Falha ao salvar geminiApiKey no localStorage", e);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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

      {/* Inteligência Artificial (Gemini API) */}
      <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/50 to-indigo-50/40 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-sm font-bold text-gray-800">Inteligência Artificial (Google Gemini)</h2>
          </div>
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
            IA Gastronômica
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Sua chave de API do Gemini é utilizada para a Leitura e Importação de fotos de Cardápios e para a <strong>geração automática de fotos profissionais e realistas</strong> dos produtos cadastrados.
        </p>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-purple-600" />
              Chave de API do Gemini (GEMINI_API_KEY)
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-purple-700 hover:underline flex items-center gap-1"
            >
              <span>Obter chave gratuita no Google AI Studio</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={form.geminiApiKey}
              onChange={(e) => set("geminiApiKey", e.target.value)}
              className="form-input pr-10 font-mono text-xs"
              placeholder="AIzaSy..."
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              title={showApiKey ? "Ocultar chave" : "Mostrar chave"}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            {form.geminiApiKey
              ? "✓ Chave configurada. A geração de fotos por IA e importação de cardápios estão prontas para uso."
              : "Caso deixe em branco, o sistema utilizará a chave padrão do servidor ou geradores gastronômicos inteligentes."}
          </p>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition active:scale-[0.98] ${
          saved ? "bg-green-500" : "bg-primary hover:bg-primary-dark"
        }`}
      >
        {saved ? (
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
