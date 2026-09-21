import React, { useState, useEffect, useRef } from "react";
import {
  Palette,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Loader2,
  Trash2,
  Store,
  Layers,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import type { PlatformSettings } from "@/types";

interface AdminVitrineAppearanceProps {
  onViewVitrine?: () => void;
}

// Sugestões de cores modernas e atraentes para o Delivery
const COLOR_PRESETS = [
  { name: "Vermelho Top Food", hex: "#E63946", desc: "Clássico e vibrante" },
  { name: "Laranja Delivery", hex: "#FF6B00", desc: "Apetite e velocidade" },
  { name: "Âmbar Dourado", hex: "#F59E0B", desc: "Aconchegante e artesanal" },
  { name: "Verde Esmeralda", hex: "#10B981", desc: "Fresco e saudável" },
  { name: "Roxo Açaí & Doces", hex: "#8B5CF6", desc: "Moderno e gourmet" },
  { name: "Azul Real Delivery", hex: "#2563EB", desc: "Confiança e corporativo" },
  { name: "Rosa Berry & Confeitaria", hex: "#EC4899", desc: "Docerias e sobremesas" },
  { name: "Preto Dark Luxo", hex: "#1E293B", desc: "Minimalist e premium" },
];

// Sugestões de banners de alta resolução para delivery
const BANNER_PRESETS = [
  {
    title: "Burgers & Grill Artesanal",
    url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1600&auto=format&fit=crop&q=80",
  },
  {
    title: "Pizzas & Forno a Lenha",
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1600&auto=format&fit=crop&q=80",
  },
  {
    title: "Culinária Japonesa & Sushi",
    url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1600&auto=format&fit=crop&q=80",
  },
  {
    title: "Açaí, Sobremesas & Frutas",
    url: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=1600&auto=format&fit=crop&q=80",
  },
  {
    title: "Gastronomia Geral & Massas",
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=80",
  },
];

export function AdminVitrineAppearance({ onViewVitrine }: AdminVitrineAppearanceProps) {
  const { platformSettings, updatePlatformSettings } = useStore();

  const [form, setForm] = useState<PlatformSettings>({
    logoUrl: "",
    bannerUrl: "",
    heroTitle: "Top Food - O Portal do Delivery",
    heroSubtitle: "O seu portal de delivery para as melhores lanchonetes, pizzarias, açaíterias e restaurantes.",
    primaryColor: "#E63946",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza estado com as configurações salvas no Cloudflare D1/KV
  useEffect(() => {
    if (platformSettings) {
      setForm({
        logoUrl: platformSettings.logoUrl || "",
        bannerUrl: platformSettings.bannerUrl || "",
        heroTitle: platformSettings.heroTitle || "Top Food - O Portal do Delivery",
        heroSubtitle:
          platformSettings.heroSubtitle ||
          "O seu portal de delivery para as melhores lanchonetes, pizzarias, açaíterias e restaurantes.",
        primaryColor: platformSettings.primaryColor || "#E63946",
      });
    }
  }, [platformSettings]);

  // Função auxiliar para comprimir imagens locais (evita estouro de payload no D1)
  const processImageFile = (file: File, isLogo: boolean = false): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return resolve("");

        const img = new Image();
        img.onload = () => {
          const maxWidth = isLogo ? 600 : 1600;
          const maxHeight = isLogo ? 600 : 700;
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
            const mimeType = isLogo && file.type === "image/png" ? "image/png" : "image/jpeg";
            const dataUrl = canvas.toDataURL(mimeType, 0.82);
            resolve(dataUrl);
          } else {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await updatePlatformSettings(form);
      if (res.success) {
        setSuccessMessage("Aparência da vitrine salva com sucesso no Cloudflare D1/KV!");
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(res.error || "Erro ao salvar aparência no banco de dados.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao salvar aparência.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Deseja restaurar as configurações visuais padrões do Top Food?")) {
      setForm({
        logoUrl: "",
        bannerUrl: "",
        heroTitle: "Top Food - O Portal do Delivery",
        heroSubtitle: "O seu portal de delivery para as melhores lanchonetes, pizzarias, açaíterias e restaurantes.",
        primaryColor: "#E63946",
      });
    }
  };

  return (
    <div id="admin-vitrine-appearance-section" className="space-y-6">
      {/* Header da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ backgroundColor: form.primaryColor || "#E63946" }}
          >
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">Aparência da Vitrine Principal</h2>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cloudflare D1 & KV
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Personalize a logo oficial, banner de destaque, textos de boas-vindas e a cor primária global da vitrine Top Food.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onViewVitrine && (
            <button
              type="button"
              onClick={onViewVitrine}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
              <span>Ver Vitrine</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            title="Restaurar valores padrões"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Padrões</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: form.primaryColor || "#E63946" }}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alertas de Sucesso / Erro */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Grid Principal: Formulário à Esquerda + Prévia da Vitrine à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Configurações */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-5">
          {/* 1. LOGO OFICIAL DO TOP FOOD */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">1. Logomarca Oficial do Top Food</h3>
              </div>
              <span className="text-[11px] text-slate-500">Exibida no topo e cabeçalho</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL da Logomarca (ou Faça Upload de Arquivo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.logoUrl || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://exemplo.com/logo-topfood.png"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                  />
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))}
                      className="rounded-xl border border-slate-800 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-red-400 transition"
                      title="Limpar logo e usar ícone padrão"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Botão de Upload Local */}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsProcessingLogo(true);
                    try {
                      const base64 = await processImageFile(file, true);
                      setForm((prev) => ({ ...prev, logoUrl: base64 }));
                    } finally {
                      setIsProcessingLogo(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isProcessingLogo}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 py-2 px-3 text-xs font-medium text-slate-300 hover:border-amber-500 hover:text-amber-300 transition"
                >
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {isProcessingLogo ? "Comprimindo imagem..." : "Fazer Upload de Logo do Computador (PNG, SVG, JPG)"}
                  </span>
                </button>
              </div>

              {/* Pré-visualização da Logo */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-slate-400">Prévia da Logo:</span>
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-inner">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo Top Food" className="h-full w-full object-contain" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-lg font-black text-white text-base"
                      style={{ backgroundColor: form.primaryColor || "#E63946" }}
                    >
                      TF
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  {form.logoUrl ? "Logo personalizada ativa" : "Usando ícone dinâmico padrão Top Food"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. BANNER PRINCIPAL DO TOPO */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">2. Banner Principal do Topo (Capa)</h3>
              </div>
              <span className="text-[11px] text-slate-500">Fundo da seção de boas-vindas</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL da Imagem do Banner
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.bannerUrl || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, bannerUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/... ou URL direta"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                  />
                  {form.bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, bannerUrl: "" }))}
                      className="rounded-xl border border-slate-800 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-red-400 transition"
                      title="Remover banner e usar gradiente padrão"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Upload de Imagem de Banner Local */}
              <div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsProcessingBanner(true);
                    try {
                      const base64 = await processImageFile(file, false);
                      setForm((prev) => ({ ...prev, bannerUrl: base64 }));
                    } finally {
                      setIsProcessingBanner(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={isProcessingBanner}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 py-2 px-3 text-xs font-medium text-slate-300 hover:border-amber-500 hover:text-amber-300 transition"
                >
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {isProcessingBanner
                      ? "Processando banner..."
                      : "Fazer Upload de Banner do Computador (JPG/PNG)"}
                  </span>
                </button>
              </div>

              {/* Sugestões Rápidas de Banner */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Sugestões de Banners em Alta Resolução:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BANNER_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, bannerUrl: preset.url }))}
                      className={`text-left rounded-xl border p-2 text-[11px] transition ${
                        form.bannerUrl === preset.url
                          ? "border-amber-500 bg-amber-500/10 text-amber-300 font-bold"
                          : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <span className="block truncate">{preset.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. TÍTULO E SUBTÍTULO DA CAPA */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">3. Título e Mensagem de Boas-Vindas</h3>
              </div>
              <span className="text-[11px] text-slate-500">Textos em destaque na vitrine</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Título da Capa / Boas-Vindas
                </label>
                <input
                  type="text"
                  value={form.heroTitle || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, heroTitle: e.target.value }))}
                  placeholder="Ex: Top Food - O Portal do Delivery"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-white placeholder-slate-500 outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Subtítulo / Descrição da Vitrine
                </label>
                <textarea
                  rows={2}
                  value={form.heroSubtitle || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                  placeholder="Ex: O seu portal de delivery para as melhores lanchonetes..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 4. COR PRIMÁRIA GLOBAL */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">4. Cor Primária da Vitrine</h3>
              </div>
              <span className="text-[11px] text-slate-500">Botões, destaques e badges</span>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-950 p-2">
                  <input
                    type="color"
                    value={form.primaryColor || "#E63946"}
                    onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={form.primaryColor || "#E63946"}
                    onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    maxLength={7}
                    className="w-24 font-mono text-xs font-bold text-white bg-transparent outline-none uppercase"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md"
                    style={{ backgroundColor: form.primaryColor || "#E63946" }}
                  >
                    <Sparkles className="h-3 w-3" />
                    Exemplo de Botão
                  </span>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border"
                    style={{
                      borderColor: `${form.primaryColor || "#E63946"}60`,
                      backgroundColor: `${form.primaryColor || "#E63946"}20`,
                      color: form.primaryColor || "#E63946",
                    }}
                  >
                    Badge Ativo
                  </span>
                </div>
              </div>

              {/* Paleta de Cores Recomendadas */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-2">
                  Paleta Recomendada de Cores:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, primaryColor: preset.hex }))}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                        (form.primaryColor || "").toLowerCase() === preset.hex.toLowerCase()
                          ? "border-amber-400 bg-slate-800/80 shadow-md ring-1 ring-amber-400/40"
                          : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-lg shadow-xs border border-white/20"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <div className="min-w-0">
                        <span className="block text-[11px] font-semibold text-white truncate">
                          {preset.name}
                        </span>
                        <span className="block font-mono text-[9px] text-slate-400">{preset.hex}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Salvar no rodapé do formulário */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white shadow-xl transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              style={{ backgroundColor: form.primaryColor || "#E63946" }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando no Cloudflare D1/KV...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Salvar Configurações de Aparência</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Painel Lateral: Pré-visualização em Tempo Real da Vitrine */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Prévia em Tempo Real da Vitrine</h3>
              </div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                Live Preview
              </span>
            </div>

            {/* Simulação do Header do Top Food */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-inner">
              {/* Banner de Fundo */}
              <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                {form.bannerUrl ? (
                  <img
                    src={form.bannerUrl}
                    alt="Banner Top Food"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full opacity-80"
                    style={{
                      background: `linear-gradient(135deg, ${form.primaryColor || "#E63946"}dd, #1e293b)`,
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                {/* Badge Topo da Capa */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: form.primaryColor || "#E63946" }} />
                  <span>Portal Oficial Top Food</span>
                </div>
              </div>

              {/* Informações da Capa sobrepostas */}
              <div className="p-4 pt-0 -mt-10 relative z-10 space-y-3">
                <div className="flex items-end gap-3">
                  {/* Logomarca */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-900 text-2xl shadow-xl">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center font-black text-white text-lg"
                        style={{ backgroundColor: form.primaryColor || "#E63946" }}
                      >
                        TF
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-base font-extrabold text-white leading-tight drop-shadow-sm truncate">
                      {form.heroTitle || "Top Food - O Portal do Delivery"}
                    </h4>
                    <p className="text-[11px] text-slate-300 line-clamp-1">
                      {form.heroSubtitle || "O seu portal de delivery..."}
                    </p>
                  </div>
                </div>

                {/* Badges de Simulação da Vitrine */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-xs"
                    style={{ backgroundColor: form.primaryColor || "#E63946" }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>Lojas em Destaque</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    <Store className="h-2.5 w-2.5" />
                    <span>Estabelecimentos</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Explicação da persistência */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                <span>Integração em Camadas:</span>
              </div>
              <p>
                As alterações feitas aqui são salvas na rota protegida <code className="text-amber-400 font-mono">PUT /api/admin/settings</code> e servidas publicamente pela rota <code className="text-amber-400 font-mono">GET /api/settings</code>.
              </p>
              <p className="text-slate-500">
                A vitrine inicial (<code className="text-slate-400 font-mono">/</code>) carrega estes dados automaticamente e atualiza a variável CSS global <code className="text-slate-400 font-mono">--portal-primary</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
