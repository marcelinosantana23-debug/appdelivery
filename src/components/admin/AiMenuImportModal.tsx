import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  ExternalLink,
  Store,
  Layers,
  ShoppingBag,
  Phone,
  Lock,
  Mail,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  Smartphone,
  Check,
  Plus,
  Trash2,
  Key,
  MessageSquare,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import type { Tenant, Product } from "@/types";
import { copyTextToClipboard, getStoreUrl } from "@/utils/url";

interface AiMenuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tenant: Tenant) => void;
}

type ImportStep = "idle" | "uploading" | "analyzing" | "extracting_logo" | "creating_store" | "done";

interface FileItem {
  id: string;
  file: File;
  previewUrl: string | null;
  isImage: boolean;
  name: string;
  size: number;
}

export const AiMenuImportModal: React.FC<AiMenuImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const { platformSettings, updatePlatformSettings } = useStore();

  // Chave da API do Gemini obtida da configuração global do Super Admin ou localStorage
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return (
        platformSettings?.geminiApiKey ||
        (typeof window !== "undefined" ? localStorage.getItem("topfood_gemini_api_key") || "" : "") ||
        ""
      );
    } catch {
      return platformSettings?.geminiApiKey || "";
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keySavedFeedback, setKeySavedFeedback] = useState(false);

  // Sincroniza se platformSettings for atualizado ou carregado
  useEffect(() => {
    if (platformSettings?.geminiApiKey && !geminiApiKey) {
      setGeminiApiKey(platformSettings.geminiApiKey);
    }
  }, [platformSettings?.geminiApiKey, geminiApiKey]);

  const handleApiKeyChange = async (value: string) => {
    setGeminiApiKey(value);
    const trimmed = value.trim();
    try {
      if (trimmed) {
        localStorage.setItem("topfood_gemini_api_key", trimmed);
        setKeySavedFeedback(true);
        setTimeout(() => setKeySavedFeedback(false), 2500);
      } else {
        localStorage.removeItem("topfood_gemini_api_key");
      }
      // Sincroniza diretamente na configuração global do Super Admin
      await updatePlatformSettings({ geminiApiKey: trimmed });
    } catch (e) {
      console.warn("Falha ao salvar no localStorage/settings", e);
    }
  };

  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [step, setStep] = useState<ImportStep>("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const [importResult, setImportResult] = useState<{
    tenant: Tenant;
    credentials: { email: string; password?: string };
    produtosCount: number;
    categoriasCount: number;
    produtos?: Product[];
    logoUrl?: string;
    hasLogo?: boolean;
    extractedData?: {
      nome_loja: string;
      descricao: string;
      telefone: string;
      primaryColor?: string;
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelect = (selectedFiles: FileList | File[]) => {
    setErrorMessage("");
    const incoming = Array.from(selectedFiles);
    if (incoming.length === 0) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "application/pdf",
    ];

    const newItems: FileItem[] = [];
    const errors: string[] = [];

    for (const f of incoming) {
      const isValid =
        validTypes.includes(f.type) || f.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i);
      if (!isValid) {
        errors.push(`"${f.name}": Formato inválido. Aceitos: JPG, PNG, WEBP ou PDF.`);
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        errors.push(`"${f.name}": Arquivo muito grande (máximo 25MB).`);
        continue;
      }

      const isImg =
        f.type.startsWith("image/") || f.name.match(/\.(jpg|jpeg|png|webp)$/i) !== null;
      const previewUrl = isImg ? URL.createObjectURL(f) : null;

      newItems.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file: f,
        previewUrl,
        isImage: isImg,
        name: f.name,
        size: f.size,
      });
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(" "));
    }

    if (newItems.length > 0) {
      setFileItems((prev) => [...prev, ...newItems]);
    }
  };

  const handleRemoveFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFileItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearFiles = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    fileItems.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setFileItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleStartImport = async () => {
    if (fileItems.length === 0) {
      setErrorMessage("Selecione pelo menos uma foto ou documento PDF do cardápio para continuar.");
      return;
    }

    const activeKey =
      geminiApiKey.trim() ||
      (platformSettings?.geminiApiKey || "").trim() ||
      (typeof window !== "undefined" ? localStorage.getItem("topfood_gemini_api_key") || "" : "");

    if (!activeKey) {
      setErrorMessage(
        "⚠️ Chave GEMINI_API_KEY necessária: Nenhuma chave global do Gemini está configurada. Por favor, cole a sua chave de API do Gemini no campo abaixo para habilitar o processamento por IA."
      );
      setIsEditingKey(true);
      setTimeout(() => {
        const el = document.getElementById("gemini-api-key-input");
        if (el) el.focus();
      }, 100);
      return;
    }

    setErrorMessage("");
    setStep("uploading");
    setProgressMsg(
      fileItems.length > 1
        ? `Enviando ${fileItems.length} fotos do cardápio...`
        : "Enviando arquivo do cardápio..."
    );

    // Timer simulando feedback visual dos passos do pipeline
    const timer1 = setTimeout(() => {
      setStep("analyzing");
      setProgressMsg(
        fileItems.length > 1
          ? `Analisando ${fileItems.length} fotos em conjunto com Gemini Multimodal...`
          : "Analisando cardápio com Gemini Multimodal..."
      );
    }, 1200);

    const timer2 = setTimeout(() => {
      setStep("extracting_logo");
      setProgressMsg("Unificando categorias e gerando/extraindo logotipo exclusivo...");
    }, 3800);

    const timer3 = setTimeout(() => {
      setStep("creating_store");
      setProgressMsg("Gravando lanchonete, produtos e vitrine no Cloudflare D1...");
    }, 6500);

    try {
      // Converte todas as fotos selecionadas para Base64 usando FileReader
      const images = await Promise.all(
        fileItems.map(
          (item) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (err) => reject(err);
              reader.readAsDataURL(item.file);
            })
        )
      );

      const trimmedKey = activeKey.trim();

      const response = await fetch("/api/admin/lojas/importar-cardapio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(trimmedKey ? { "x-gemini-api-key": trimmedKey } : {}),
        },
        body: JSON.stringify({
          apiKey: trimmedKey || undefined,
          images,
          additionalPrompt: additionalPrompt.trim() || undefined,
        }),
      });

      const data = await response.json();

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Não foi possível processar o cardápio com a IA.");
      }

      setStep("done");
      setImportResult(data);
      onSuccess(data.tenant);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setStep("idle");

      let msg = err.message || "";
      const lower = msg.toLowerCase();
      if (
        lower.includes("503") ||
        lower.includes("429") ||
        lower.includes("high demand") ||
        lower.includes("alta demanda") ||
        lower.includes("unavailable") ||
        lower.includes("resource_exhausted") ||
        lower.includes("overloaded")
      ) {
        msg =
          "Os servidores do Gemini estão com alta demanda temporária. Por favor, aguarde alguns segundos e clique em Gerar novamente.";
      } else if (!msg) {
        msg =
          "Erro ao processar o cardápio. Verifique se as fotos estão nítidas e se a chave GEMINI_API_KEY está configurada.";
      }

      setErrorMessage(msg);
    }
  };

  const resetForm = () => {
    handleClearFiles();
    setAdditionalPrompt("");
    setStep("idle");
    setProgressMsg("");
    setErrorMessage("");
    setImportResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-violet-900/60 via-purple-900/40 to-slate-900 p-5 sm:p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-amber-500 text-white shadow-lg shadow-purple-500/25">
                <Sparkles className="h-6 w-6 text-amber-200 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  Cadastro Inteligente por IA
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Gemini Multimodal
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Envie uma ou mais fotos do cardápio físico (frente, verso, páginas) ou PDF para criar a loja por IA
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-red-300 mb-0.5">Erro no processamento:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* ESTADO 1: FORMULÁRIO DE UPLOAD */}
          {step === "idle" && (
            <div className="space-y-4">
              {/* Campo da Chave de API do Gemini (Super Admin Global) */}
              <div className="rounded-2xl border border-violet-500/30 bg-violet-950/25 p-4 space-y-3 transition">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-violet-200">
                      Chave Global de IA (Google Gemini)
                    </span>
                    {keySavedFeedback ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <Check className="h-3 w-3" /> Salva no sistema!
                      </span>
                    ) : geminiApiKey ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> Ativa no Super Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertCircle className="h-3 w-3" /> Chave Não Configurada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {geminiApiKey && (
                      <button
                        type="button"
                        onClick={() => setIsEditingKey(!isEditingKey)}
                        className="text-[11px] text-violet-300 hover:text-white underline font-medium"
                      >
                        {isEditingKey ? "Ocultar Campo" : "Alterar Chave"}
                      </button>
                    )}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium flex items-center gap-1"
                    >
                      <span>Obter chave no Google AI Studio</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {!geminiApiKey && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Atenção:</strong> Nenhuma chave do Gemini está configurada. Cole sua chave <strong>GEMINI_API_KEY</strong> abaixo para processar o cardápio e salvar nas configurações globais do sistema.
                    </span>
                  </div>
                )}

                {(isEditingKey || !geminiApiKey) && (
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <input
                        id="gemini-api-key-input"
                        type={showApiKey ? "text" : "password"}
                        value={geminiApiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        placeholder="Cole sua Chave de API do Gemini aqui (AIzaSy...)"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 pr-20 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono transition"
                      />
                      <div className="absolute right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                          title={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {geminiApiKey && (
                          <button
                            type="button"
                            onClick={() => handleApiKeyChange("")}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                            title="Limpar chave"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      🔒 Ao salvar aqui, a chave é gravada nas configurações globais do Super Admin e sincronizada com o sistema.
                    </p>
                  </div>
                )}
              </div>

              {/* Dropzone & Preview list */}
              {fileItems.length === 0 ? (
                /* Dropzone inicial para seleção */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-6 sm:p-8 cursor-pointer transition text-center ${
                    isDragOver
                      ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
                      : "border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-800/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelect(e.target.files);
                      }
                    }}
                  />

                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600/30 to-amber-500/30 text-amber-300 border border-amber-500/30 shadow-md">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Arraste e solte fotos do cardápio aqui ou clique para selecionar
                      </p>
                      <p className="text-xs text-amber-300/90 font-medium mt-1">
                        📸 Selecione <span className="underline font-bold">múltiplas fotos</span> (Páginas 1, 2, 3...) de uma vez só!
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Formatos aceitos: Imagens (JPG, PNG, WEBP) ou Documento PDF (até 25MB cada)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Lista e grid com miniaturas de todas as fotos selecionadas */
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 items-center px-2.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        {fileItems.length} {fileItems.length === 1 ? "foto selecionada" : "fotos selecionadas"}
                      </span>
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        (A IA analisará todas as fotos em conjunto)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-white bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 px-3 py-1.5 rounded-xl transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar mais fotos
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFiles}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                        title="Limpar todas as fotos"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelect(e.target.files);
                      }
                    }}
                  />

                  {/* Grid de fotos selecionadas com miniaturas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
                    {fileItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-md hover:border-slate-600 transition flex flex-col justify-between"
                      >
                        {/* Tag de Página */}
                        <div className="absolute top-3 left-3 z-10 rounded-lg bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-sm border border-white/10">
                          Pág. {index + 1}
                        </div>

                        {/* Botão Remover Foto */}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFile(item.id, e)}
                          className="absolute top-3 right-3 z-10 rounded-full bg-red-600 hover:bg-red-500 p-1 text-white shadow-md transition"
                          title="Remover esta foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                        {/* Miniatura ou Ícone */}
                        <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-slate-400 gap-1">
                              <FileText className="h-8 w-8 text-red-400" />
                              <span className="text-[10px] uppercase font-bold text-slate-500">PDF</span>
                            </div>
                          )}
                        </div>

                        {/* Nome e Tamanho */}
                        <div className="mt-2 text-left">
                          <p className="text-[11px] font-medium text-slate-200 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(item.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Botão de Adicionar Mais Fotos dentro do Grid */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-36 sm:h-full min-h-[140px] rounded-2xl border-2 border-dashed border-slate-700 hover:border-violet-500 bg-slate-950/40 hover:bg-violet-500/10 transition flex flex-col items-center justify-center p-3 text-center gap-2 group"
                    >
                      <div className="h-9 w-9 rounded-xl bg-slate-800 group-hover:bg-violet-600/30 text-slate-400 group-hover:text-violet-300 flex items-center justify-center transition border border-slate-700">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                        + Foto
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Campo de Instruções Adicionais (Prompt Personalizado) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
                    Instruções adicionais para a IA (opcional)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Personalize regras de extração</span>
                </label>
                <textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  rows={2}
                  placeholder="Ex: Ajuste os preços das bebidas, ignore a página 3, etc."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none transition resize-none"
                />
              </div>

              {/* Informações explicativas do recurso */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs mb-1">
                    <Zap className="h-4 w-4 shrink-0" />
                    1. Cardápio Completo
                  </div>
                  <p className="text-[11px] text-slate-400">
                    A IA lê nomes, descrições, preços e adicionais de todas as páginas enviadas.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    2. Logo & Marca
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Extrai o logo existente ou gera uma nova logo vetorial moderna adaptada para a loja.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                    <Smartphone className="h-4 w-4 shrink-0" />
                    3. PWA Dinâmico
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Cria automaticamente o manifest e ícones com a marca da lanchonete para o cliente instalar.
                  </p>
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartImport}
                  disabled={fileItems.length === 0}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-lg transition ${
                    fileItems.length > 0
                      ? "bg-gradient-to-r from-violet-600 via-purple-600 to-amber-500 text-white shadow-purple-600/30 hover:brightness-110 active:scale-95"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  Importar e Criar Loja por IA {fileItems.length > 0 && `(${fileItems.length} ${fileItems.length === 1 ? "foto" : "fotos"})`}
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 2: PROCESSANDO EM TEMPO REAL */}
          {step !== "idle" && step !== "done" && (
            <div className="py-8 sm:py-12 flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-amber-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-base sm:text-lg font-bold text-white">Processando com Inteligência Artificial</h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium">{progressMsg}</p>
                <p className="text-[11px] text-slate-500">
                  O Gemini está estruturando os itens, calculando preços e preparando a vitrine no Cloudflare D1.
                </p>
              </div>

              {/* Steps checklist */}
              <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 text-left text-xs">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Upload e conversão de mídia</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    step === "analyzing" || step === "extracting_logo" || step === "creating_store"
                      ? "text-emerald-400"
                      : "text-slate-500"
                  }`}
                >
                  {step === "uploading" ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                  <span>Análise visual com Gemini Multimodal</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    step === "extracting_logo" || step === "creating_store"
                      ? "text-emerald-400"
                      : step === "analyzing"
                      ? "text-amber-400 font-medium"
                      : "text-slate-500"
                  }`}
                >
                  {step === "analyzing" ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                  ) : step === "extracting_logo" || step === "creating_store" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-700" />
                  )}
                  <span>Extração / Geração de logotipo vetorial</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    step === "creating_store" ? "text-amber-400 font-medium" : "text-slate-500"
                  }`}
                >
                  {step === "creating_store" ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-700" />
                  )}
                  <span>Persistência no Cloudflare D1 e PWA dinâmico</span>
                </div>
              </div>
            </div>
          )}

          {/* ESTADO 3: SUCESSO COMPLETO */}
          {step === "done" && importResult && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">Lanchonete Criada com Sucesso pela IA!</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Cardápio extraído, logo gerada e vitrine PWA já publicada no Cloudflare D1.
                </p>
              </div>

              {/* Loja & Logo Gerada */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-900 flex items-center justify-center p-1 shadow-lg shadow-amber-500/10">
                  {importResult.logoUrl ? (
                    <img
                      src={importResult.logoUrl}
                      alt={importResult.tenant.name}
                      className="h-full w-full object-contain rounded-xl"
                    />
                  ) : (
                    <Store className="h-8 w-8 text-amber-400" />
                  )}
                </div>

                <div className="min-w-0 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-base font-bold text-white truncate">{importResult.tenant.name}</h4>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      Vitrine Ativa
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {importResult.tenant.tagline || importResult.extractedData?.descricao}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-slate-300">
                    <span className="flex items-center gap-1 text-amber-400">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <strong>{importResult.produtosCount}</strong> produtos
                    </span>
                    <span className="flex items-center gap-1 text-violet-400">
                      <Layers className="h-3.5 w-3.5" />
                      <strong>{importResult.categoriasCount}</strong> categorias
                    </span>
                    {importResult.tenant.whatsapp && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="h-3.5 w-3.5" />
                        {importResult.tenant.whatsapp}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Link da Vitrine Dinâmica */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                  Link da Vitrine (PWA Personalizado com a Marca da Loja):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getStoreUrl(importResult.tenant.slug)}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      copyTextToClipboard(getStoreUrl(importResult.tenant.slug));
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedLink ? "Copiado" : "Copiar Link"}
                  </button>
                  <a
                    href={getStoreUrl(importResult.tenant.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-bold text-slate-950 transition shadow-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir Vitrine
                  </a>
                </div>
              </div>

              {/* Credenciais de Acesso do Lojista */}
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <Lock className="h-4 w-4 text-amber-400" />
                    Credenciais Geradas para o Lojista Acessar o Painel:
                  </div>
                  <button
                    onClick={() => {
                      const textToCopy = `Acesso ao Painel Top Food:\nLoja: ${importResult.tenant.name}\nE-mail: ${importResult.credentials.email}\nSenha: ${importResult.credentials.password}\nLink: ${window.location.origin}/admin`;
                      copyTextToClipboard(textToCopy);
                      setCopiedCreds(true);
                      setTimeout(() => setCopiedCreds(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition"
                  >
                    {copiedCreds ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedCreds ? "Copiado!" : "Copiar Credenciais"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                      <Mail className="h-3 w-3 text-slate-500" />
                      E-mail do Administrador:
                    </span>
                    <p className="font-mono text-white font-medium break-all">{importResult.credentials.email}</p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Lock className="h-3 w-3 text-slate-500" />
                        Senha de Acesso:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="font-mono text-amber-300 font-bold text-sm">
                      {showPassword ? importResult.credentials.password : "••••••••"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Final */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  Importar Outro Cardápio
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:brightness-110 transition"
                >
                  Concluir e Voltar ao Painel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
