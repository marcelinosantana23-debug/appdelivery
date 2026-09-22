import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  Store,
  Sparkles,
  Smartphone,
  FileDown,
  X,
  Maximize2,
  RefreshCw,
  Info,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName, getSafeSlug } from "@/utils/storeFormat";
import { OFFICIAL_WORKERS_BASE, copyTextToClipboard } from "@/utils/url";
import type { Tenant } from "@/types";

interface StoreQrCodePlateProps {
  tenant?: Tenant | null;
  onClose?: () => void;
  isModal?: boolean;
  isSuperAdmin?: boolean;
}

const DEFAULT_PHRASE = "Escaneie aqui para ver o cardápio e fazer seu pedido";

const PRESET_PHRASES = [
  { label: "Padrão", text: "Escaneie aqui para ver o cardápio e fazer seu pedido" },
  { label: "Para Mesas", text: "Aponte a câmera do celular, escolha seus itens e faça seu pedido na mesa!" },
  { label: "Balcão / Retirada", text: "Peça pelo celular e retire seu lanche direto no balcão sem filas!" },
  { label: "Delivery / Em Casa", text: "Salve nosso cardápio no seu celular e peça direto pelo Top Food!" },
];

export function StoreQrCodePlate({
  tenant: propTenant,
  onClose,
  isModal = false,
  isSuperAdmin = false,
}: StoreQrCodePlateProps) {
  const { currentTenant, config, tenants } = useStore();

  // Se for superadmin, permite selecionar qualquer lanchonete.
  const [selectedTenantId, setSelectedTenantId] = useState<string>(() => {
    if (propTenant?.id) return propTenant.id;
    if (currentTenant?.id) return currentTenant.id;
    return tenants[0]?.id || "";
  });

  useEffect(() => {
    if (propTenant?.id) {
      setSelectedTenantId(propTenant.id);
    }
  }, [propTenant?.id]);

  // Se NÃO for Super Admin (painel do lojista), usa DIRETAMENTE e AUTOMATICAMENTE os dados da loja logada
  const activeTenant: Tenant | null = isSuperAdmin
    ? (tenants.find((t) => t.id === selectedTenantId) ||
       propTenant ||
       currentTenant ||
       (config?.slug ? ({ ...config, id: config.slug } as unknown as Tenant) : null))
    : (currentTenant || (config?.slug ? ({ ...config, id: config.slug } as unknown as Tenant) : null) || propTenant);

  const storeName = getSafeDisplayName(
    !isSuperAdmin ? (currentTenant?.name || config.name) : (activeTenant?.name || config.name),
    "Minha Lanchonete"
  );
  const storeSlug = getSafeSlug(
    !isSuperAdmin ? (currentTenant?.slug || config.slug) : (activeTenant?.slug || config.slug),
    "loja"
  );
  const storeLogo = !isSuperAdmin ? (currentTenant?.logo || config.logo) : (activeTenant?.logo || config.logo);
  const storeAddress = !isSuperAdmin ? (currentTenant?.address || config.address) : (activeTenant?.address || config.address);
  const storeWhatsapp = !isSuperAdmin ? (currentTenant?.whatsapp || config.whatsapp) : (activeTenant?.whatsapp || config.whatsapp);
  const storePrimaryColor = !isSuperAdmin
    ? (currentTenant?.primaryColor || config.primaryColor || "#E63946")
    : (activeTenant?.primaryColor || config.primaryColor || "#E63946");

  // URL Target configuration
  const [urlMode, setUrlMode] = useState<"workers" | "current">("workers");
  const [tableNumber, setTableNumber] = useState<string>("");
  const [customPhrase, setCustomPhrase] = useState<string>(DEFAULT_PHRASE);
  const [plateFormat, setPlateFormat] = useState<"a4" | "table">("a4");
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  const platePreviewRef = useRef<HTMLDivElement>(null);

  // Computa a URL final que será codificada no QR Code
  const baseUrl =
    urlMode === "workers"
      ? `${OFFICIAL_WORKERS_BASE}/loja/${storeSlug}`
      : typeof window !== "undefined"
      ? `${window.location.origin}/loja/${storeSlug}`
      : `${OFFICIAL_WORKERS_BASE}/loja/${storeSlug}`;

  const finalUrl = tableNumber.trim()
    ? `${baseUrl}?mesa=${encodeURIComponent(tableNumber.trim())}`
    : baseUrl;

  // Gera o QR Code dinamicamente com resolução de alta definição
  useEffect(() => {
    let isCancelled = false;
    setIsGeneratingQr(true);

    QRCode.toDataURL(finalUrl, {
      width: 1024,
      margin: 1.5,
      color: {
        dark: "#0F172A", // Slate 900 de alto contraste
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H", // Alta redundância (suporta arranhões e dobras)
    })
      .then((url) => {
        if (!isCancelled) {
          setQrCodeDataUrl(url);
          setIsGeneratingQr(false);
        }
      })
      .catch((err) => {
        console.error("Erro ao gerar QR Code:", err);
        if (!isCancelled) {
          setIsGeneratingQr(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [finalUrl]);

  // Ação: Copiar Link da Loja
  const handleCopyLink = async () => {
    const success = await copyTextToClipboard(finalUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Ação: Baixar apenas o arquivo de imagem do QR Code (PNG)
  const handleDownloadQrOnly = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    const suffix = tableNumber ? `-mesa-${tableNumber}` : "";
    a.download = `qrcode-topfood-${storeSlug}${suffix}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Ação: Disparar Impressão da Placa Estilizada
  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleExecuteBrowserPrint = () => {
    window.print();
  };

  // Ação: Renderizar e Baixar a Placa Completa em PNG usando Canvas nativo
  const handleDownloadFullPlateImage = async () => {
    if (!qrCodeDataUrl) return;
    setIsDownloadingImage(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 1200;
      const height = plateFormat === "a4" ? 1700 : 1300;
      canvas.width = width;
      canvas.height = height;

      // Fundo branco
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      // Borda elegante
      ctx.lineWidth = 14;
      ctx.strokeStyle = storePrimaryColor || "#E63946";
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // Moldura interna suave
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#E2E8F0";
      ctx.strokeRect(48, 48, width - 96, height - 96);

      // Top Food Tag
      ctx.fillStyle = "#0F172A";
      ctx.font = "900 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TOP FOOD DELIVERY", width / 2, 130);

      ctx.fillStyle = "#64748B";
      ctx.font = "600 22px sans-serif";
      ctx.fillText("CARDÁPIO DIGITAL & PEDIDOS ONLINE", width / 2, 170);

      // Divisor
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 180, 205);
      ctx.lineTo(width / 2 + 180, 205);
      ctx.stroke();

      // Nome do Estabelecimento
      ctx.fillStyle = storePrimaryColor || "#E63946";
      ctx.font = "900 48px sans-serif";
      ctx.fillText(storeName.toUpperCase(), width / 2, 280);

      if (tableNumber.trim()) {
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 30px sans-serif";
        ctx.fillText(`MESA ${tableNumber.trim()}`, width / 2, 335);
      }

      // Frase Personalizada
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 34px sans-serif";
      const words = customPhrase.split(" ");
      let line = "";
      let y = tableNumber.trim() ? 400 : 360;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 900 && n > 0) {
          ctx.fillText(line, width / 2, y);
          line = words[n] + " ";
          y += 46;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, width / 2, y);

      // QR Code Image
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrCodeDataUrl;
      });

      const qrSize = plateFormat === "a4" ? 540 : 480;
      const qrX = (width - qrSize) / 2;
      const qrY = y + 45;

      // Fundo branco do QR com borda arredondada
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 24;
      ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
      ctx.shadowBlur = 0;

      ctx.lineWidth = 4;
      ctx.strokeStyle = "#E2E8F0";
      ctx.strokeRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Instrução passo a passo abaixo do QR
      const instructY = qrY + qrSize + 80;
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("1. Abra a câmera do celular   •   2. Aponte para o QR Code   •   3. Peça e aproveite!", width / 2, instructY);

      // Link da loja
      ctx.fillStyle = "#64748B";
      ctx.font = "600 22px monospace";
      ctx.fillText(finalUrl, width / 2, instructY + 45);

      // Rodapé
      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 18px sans-serif";
      ctx.fillText("Peça sem filas com a tecnologia Top Food Delivery", width / 2, height - 70);

      const downloadUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `placa-divulgacao-${storeSlug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Erro ao gerar imagem da placa:", err);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50 min-h-full">
      {/* Top Banner / Breadcrumb se estiver como modal */}
      {isModal && (
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 py-3.5 backdrop-blur-md gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/30">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                QR Code & Placa de Divulgação
              </h2>
              <p className="text-xs text-slate-500">
                Gere e imprima materiais de mesa e balcão para <strong>{storeName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de lanchonete ativo APENAS quando acessado pelo Super Admin */}
            {isSuperAdmin && tenants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Lanchonete:</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (/loja/{t.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 flex-1">
        {/* Header se renderizado como aba normal */}
        {!isModal && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/30 shadow-xs">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    QR Code & Placa de Divulgação
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Gere o QR Code dinâmico do cardápio e imprima a placa personalizada para mesas, totens ou balcão.
                  </p>
                </div>
              </div>
            </div>

            {/* Seletor de lanchonete: ativo APENAS quando acessado pela área do Super Admin */}
            {isSuperAdmin && tenants.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Lanchonete:</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (/loja/{t.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Layout em 2 Colunas: Configurações na esquerda, Preview na direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* COLUNA ESQUERDA: CONTROLES E OPÇÕES */}
          <div className="lg:col-span-6 space-y-5">
            {/* CARD 1: URL DE DESTINO DO QR CODE */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    URL da Vitrine da Loja
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                  Sempre Atualizado
                </span>
              </div>

              {/* Opção de Domínio */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Origem do Link:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrlMode("workers")}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      urlMode === "workers"
                        ? "border-amber-500 bg-amber-500/10 text-amber-950 font-bold shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-bold truncate">Cloudflare Workers</span>
                      <span className="block text-[10px] text-slate-400 font-mono truncate">top-food.msapp.workers.dev</span>
                    </div>
                    {urlMode === "workers" && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrlMode("current")}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      urlMode === "current"
                        ? "border-amber-500 bg-amber-500/10 text-amber-950 font-bold shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-bold truncate">Domínio Atual</span>
                      <span className="block text-[10px] text-slate-400 font-mono truncate">
                        {typeof window !== "undefined" ? window.location.host : "atual"}
                      </span>
                    </div>
                    {urlMode === "current" && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                  </button>
                </div>
              </div>

              {/* Caixa da URL Gerada + Botão Copiar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Link Codificado no QR Code:
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                  <input
                    type="text"
                    readOnly
                    value={finalUrl}
                    className="flex-1 bg-transparent font-mono text-slate-700 text-xs outline-none select-all truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
                      copiedLink
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={finalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-600 transition"
                    title="Testar link no navegador"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Identificador de Mesa Opcional */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Número / Identificador da Mesa (Opcional):
                  </label>
                  {tableNumber && (
                    <button
                      type="button"
                      onClick={() => setTableNumber("")}
                      className="text-[11px] text-red-500 hover:underline cursor-pointer"
                    >
                      Remover mesa
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Ex: 01, 14, VIP, Balcão 2"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-400 italic shrink-0">
                    Útil para imprimir placas individuais
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: FRASE PERSONALIZADA DA PLACA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Frase da Placa de Divulgação
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomPhrase(DEFAULT_PHRASE)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Restaurar padrão
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Texto Principal em Destaque:
                </label>
                <textarea
                  rows={3}
                  value={customPhrase}
                  onChange={(e) => setCustomPhrase(e.target.value)}
                  placeholder="Digite a frase para seus clientes..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Sugestões Rápidas de Frase */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-slate-400">
                  Sugestões Rápidas (clique para aplicar):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_PHRASES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCustomPhrase(preset.text)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer border ${
                        customPhrase === preset.text
                          ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 3: FORMATO DA PLACA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Modelo de Apresentação
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlateFormat("a4")}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 transition cursor-pointer text-center ${
                    plateFormat === "a4"
                      ? "border-amber-500 bg-amber-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex h-10 w-8 items-center justify-center rounded border-2 border-slate-400 bg-white shadow-2xs">
                    <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Folha A4 Completa</span>
                    <span className="block text-[10px] text-slate-400">Totem, Parede ou Porta</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPlateFormat("table")}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 transition cursor-pointer text-center ${
                    plateFormat === "table"
                      ? "border-amber-500 bg-amber-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex h-8 w-10 items-center justify-center rounded border-2 border-slate-400 bg-white shadow-2xs">
                    <div className="h-4 w-4 bg-slate-900 rounded-2xs" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Display de Mesa</span>
                    <span className="block text-[10px] text-slate-400">Acrílico 10x15 ou 15x20</span>
                  </div>
                </button>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO PRINCIPAIS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Botão 1: Copiar Link */}
              <button
                type="button"
                id="btn-copy-store-link"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 cursor-pointer"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? "Link Copiado!" : "Copiar Link"}</span>
              </button>

              {/* Botão 2: Baixar QR Code (PNG) */}
              <button
                type="button"
                id="btn-download-qr-png"
                onClick={handleDownloadQrOnly}
                disabled={isGeneratingQr || !qrCodeDataUrl}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Baixar apenas o arquivo PNG do QR Code em alta resolução"
              >
                <Download className="h-4 w-4 text-amber-600" />
                <span>Baixar QR Code (PNG)</span>
              </button>

              {/* Botão 3: Imprimir Placa */}
              <button
                type="button"
                id="btn-print-plate"
                onClick={handlePrint}
                disabled={isGeneratingQr || !qrCodeDataUrl}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 px-4 text-xs font-black text-slate-950 shadow-md shadow-amber-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer sm:col-span-1"
                title="Abrir visualização de impressão pronta para papel A4/display"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Placa</span>
              </button>
            </div>

            {/* Botão Secundário: Baixar Placa Completa Renderizada em PNG */}
            <div className="pt-1">
              <button
                type="button"
                id="btn-download-full-plate-png"
                onClick={handleDownloadFullPlateImage}
                disabled={isDownloadingImage || !qrCodeDataUrl}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 px-4 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Gera uma imagem de alta qualidade com a placa inteira para enviar para gráfica"
              >
                {isDownloadingImage ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Gerando imagem da placa...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5 text-amber-400" />
                    <span>Baixar Placa Completa (PNG Alta Resolução)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* COLUNA DIREITA: PREVIEW DA PLACA EM TEMPO REAL */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                Pré-visualização da Placa Impressa:
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {plateFormat === "a4" ? "Formato A4 Proporcional" : "Formato Display de Mesa"}
              </span>
            </div>

            {/* Canvas Estilizado da Placa */}
            <div className="w-full flex justify-center overflow-hidden py-2">
              <div
                ref={platePreviewRef}
                className={`w-full max-w-[420px] rounded-3xl bg-white shadow-xl border-4 transition-all duration-300 relative flex flex-col items-center text-center p-6 sm:p-8 select-none ${
                  plateFormat === "a4" ? "aspect-[1/1.414]" : "aspect-[1/1.2]"
                }`}
                style={{
                  borderColor: storePrimaryColor,
                }}
              >
                {/* Moldura Interna de Luxo */}
                <div className="absolute inset-2.5 sm:inset-3 rounded-2xl border border-slate-200 pointer-events-none" />

                {/* Top Branding */}
                <div className="space-y-0.5 pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black tracking-widest uppercase text-slate-900">
                    <span className="text-amber-500 font-black">TOP FOOD</span> DELIVERY
                  </span>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                    Cardápio Digital & Pedidos Online
                  </p>
                </div>

                <div className="my-2 sm:my-3 w-16 h-0.5 bg-slate-200 rounded-full" />

                {/* Identificação da Loja: Logo + Nome */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white flex items-center justify-center">
                    <StoreLogo logo={storeLogo} name={storeName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h4
                      className="text-base sm:text-xl font-black tracking-tight uppercase leading-tight line-clamp-2"
                      style={{ color: storePrimaryColor }}
                    >
                      {storeName}
                    </h4>
                    {tableNumber.trim() && (
                      <span className="inline-block mt-1 rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-[10px] font-black tracking-wide">
                        MESA {tableNumber.trim().toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Frase Personalizada */}
                <div className="px-2 my-2 min-h-[44px] flex items-center justify-center">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                    {customPhrase}
                  </p>
                </div>

                {/* Box Central com o QR Code */}
                <div className="my-auto py-2">
                  <div className="relative rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-md flex items-center justify-center group">
                    {isGeneratingQr ? (
                      <div className="h-44 w-44 sm:h-52 sm:w-52 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
                        <span className="text-[11px] font-medium">Gerando QR Code...</span>
                      </div>
                    ) : qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt={`QR Code ${storeName}`}
                        className="h-44 w-44 sm:h-52 sm:w-52 object-contain"
                      />
                    ) : null}

                    {/* Selo no Canto do QR Code */}
                    <div className="absolute -bottom-2.5 bg-slate-900 text-white rounded-full px-2.5 py-0.5 text-[9px] font-bold flex items-center gap-1 shadow-xs">
                      <Smartphone className="h-3 w-3 text-amber-400" />
                      <span>Câmera do Celular</span>
                    </div>
                  </div>
                </div>

                {/* Instrução Passo a Passo */}
                <div className="mt-auto pt-2 space-y-1">
                  <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-bold text-slate-700">
                    <span>1. Abra a câmera</span>
                    <span className="text-slate-300">•</span>
                    <span>2. Aponte</span>
                    <span className="text-slate-300">•</span>
                    <span>3. Peça</span>
                  </div>

                  {/* URL Impressa */}
                  <p className="font-mono text-[9px] text-slate-400 truncate max-w-[280px]">
                    {finalUrl}
                  </p>

                  <p className="text-[8px] text-slate-300 uppercase tracking-widest pt-1">
                    Powered by Top Food
                  </p>
                </div>
              </div>
            </div>

            {/* Dica de Utilização */}
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-900 w-full max-w-[420px]">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Dica do Lojista:</strong> Imprima em papel cartão ou papel fotográfico A4 e insira em um display de acrílico nas mesas do seu estabelecimento para agilizar o atendimento!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL DE IMPRESSÃO ESTILIZADA PRONTA PARA FOLHA A4
          ======================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
            {/* Header com Ações de Impressão (Oculto na Impressora) */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50 print:hidden shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Visualização de Impressão (A4)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pronta para impressoras laser/jato de tinta ou exportação em PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteBrowserPrint}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-black text-slate-950 shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir Agora</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition cursor-pointer"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo da Folha A4 Estilizada */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
              <div
                id="printable-plate-area"
                className="w-full max-w-[620px] bg-white rounded-3xl p-8 sm:p-10 shadow-lg border-8 flex flex-col items-center text-center relative print:shadow-none print:border-8 print:max-w-none print:w-full print:h-screen print:rounded-none"
                style={{
                  borderColor: storePrimaryColor,
                }}
              >
                {/* Linha decorativa interna */}
                <div className="absolute inset-3 sm:inset-4 rounded-2xl border-2 border-slate-200 pointer-events-none" />

                {/* Top Food Brand */}
                <div className="space-y-1 pt-2">
                  <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-black tracking-widest uppercase text-slate-900">
                    <span className="text-amber-500">TOP FOOD</span> DELIVERY
                  </span>
                  <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                    Cardápio Digital & Pedidos Online
                  </p>
                </div>

                <div className="my-4 w-24 h-1 bg-slate-200 rounded-full" />

                {/* Store Branding */}
                <div className="flex flex-col items-center gap-2 mb-3">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-white flex items-center justify-center">
                    <StoreLogo logo={storeLogo} name={storeName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <h2
                      className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight mt-1"
                      style={{ color: storePrimaryColor }}
                    >
                      {storeName}
                    </h2>
                    {tableNumber.trim() && (
                      <span className="inline-block mt-1.5 rounded-full bg-slate-900 text-white px-4 py-1 text-xs sm:text-sm font-black tracking-wider">
                        MESA {tableNumber.trim().toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Frase Personalizada em Destaque */}
                <div className="px-4 my-3 max-w-lg">
                  <p className="text-base sm:text-xl font-bold text-slate-800 leading-snug">
                    {customPhrase}
                  </p>
                </div>

                {/* QR Code Grande e Centralizado em Alta Definição */}
                <div className="my-4">
                  <div className="rounded-3xl border-4 border-slate-200 bg-white p-4 shadow-xl flex items-center justify-center">
                    {qrCodeDataUrl && (
                      <img
                        src={qrCodeDataUrl}
                        alt={`QR Code ${storeName}`}
                        className="h-64 w-64 sm:h-72 sm:w-72 object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Passo a Passo */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                    <span className="flex items-center gap-1">
                      <Smartphone className="h-4 w-4 text-amber-500" />
                      1. Abra a câmera do seu celular
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>2. Aponte para o QR Code</span>
                    <span className="text-slate-300">•</span>
                    <span>3. Monte seu pedido</span>
                  </div>

                  <p className="font-mono text-xs text-slate-500 truncate max-w-md pt-1 select-all">
                    {finalUrl}
                  </p>

                  {(storeAddress || storeWhatsapp) && (
                    <div className="text-[11px] text-slate-400 pt-2 flex flex-wrap items-center justify-center gap-3">
                      {storeAddress && <span>📍 {storeAddress}</span>}
                      {storeWhatsapp && <span>📱 WhatsApp: {storeWhatsapp}</span>}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-300 uppercase tracking-widest pt-2 font-semibold">
                    Tecnologia Top Food Delivery • Todos os direitos reservados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Print Stylesheet for seamless printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-plate-area, #printable-plate-area * {
            visibility: visible;
          }
          #printable-plate-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 2.5cm;
            border-width: 12px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
