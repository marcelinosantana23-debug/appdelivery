import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  Loader2,
  Info,
} from "lucide-react";
import type { StoreStory } from "@/types";
import {
  fetchStoreStoriesApi,
  createStoreStoryApi,
  deleteStoreStoryApi,
} from "@/services/api";
import { compressStoryImage, formatFileSize } from "@/utils/imageCompressor";
import { useStore } from "@/context/StoreContext";

interface AdminStoriesSectionProps {
  tenantId?: string;
  slug?: string;
  onPreviewStories?: (stories: StoreStory[]) => void;
}

export function AdminStoriesSection({
  tenantId,
  slug,
  onPreviewStories,
}: AdminStoriesSectionProps) {
  const { showToast, refreshActiveStories } = useStore();
  const addToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    showToast(msg, type);
  };
  const [stories, setStories] = useState<StoreStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estado do story sendo criado
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<number>(0);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const identifier = slug || tenantId || "";

  const loadStories = useCallback(async () => {
    if (!identifier) return;
    setLoading(true);
    try {
      const res = await fetchStoreStoriesApi(identifier);
      if (res.success && res.stories) {
        setStories(res.stories);
      }
    } catch (err) {
      console.error("Erro ao carregar stories da loja:", err);
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Manipulador de upload com compressão cliente (máx 200KB) e bloqueio estrito de vídeos
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Bloqueia vídeos na raiz
    if (file.type.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name)) {
      addToast(
        "Apenas fotos (JPG, PNG, WEBP) são permitidas nos stories. O envio de vídeos foi bloqueado!",
        "error"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      addToast("Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (stories.length >= 3) {
      addToast(
        "Você já atingiu o limite de 3 stories ativos simultâneos. Exclua um existente antes de postar.",
        "error"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsProcessingFile(true);
    try {
      // Comprime no cliente para garantir peso leve (máx 200KB)
      const compressed = await compressStoryImage(file, 200 * 1024);
      setPreviewDataUrl(compressed.dataUrl);
      setPreviewSize(compressed.sizeBytes);
      addToast(
        `Foto otimizada com sucesso! Tamanho final: ${formatFileSize(compressed.sizeBytes)} (Super leve)`,
        "success"
      );
    } catch (err: any) {
      addToast(err.message || "Erro ao processar imagem para os stories.", "error");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePublishStory = async () => {
    if (!previewDataUrl) {
      addToast("Selecione uma foto para publicar.", "error");
      return;
    }

    if (stories.length >= 3) {
      addToast("Limite máximo de 3 stories ativos simultaneamente atingido.", "error");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await createStoreStoryApi({
        tenantId,
        slug,
        mediaUrl: previewDataUrl,
        mediaType: "image",
        caption: caption.trim() || undefined,
      });

      if (res.success && res.story) {
        addToast("Story publicado com sucesso! Ficará visível por 24 horas.", "success");
        setPreviewDataUrl(null);
        setPreviewSize(0);
        setCaption("");
        await loadStories();
        refreshActiveStories();
      } else {
        addToast(res.error || "Erro ao publicar story.", "error");
      }
    } catch (err: any) {
      addToast(err.message || "Falha na conexão ao publicar story.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm("Deseja realmente apagar esta foto dos stories da loja?")) {
      return;
    }

    setDeletingId(storyId);
    try {
      const res = await deleteStoreStoryApi(storyId, tenantId);
      if (res.success) {
        addToast("Story removido com sucesso!", "success");
        setStories((prev) => prev.filter((s) => s.id !== storyId));
        refreshActiveStories();
      } else {
        addToast(res.error || "Erro ao remover story.", "error");
      }
    } catch (err: any) {
      addToast(err.message || "Erro de conexão ao remover story.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Cálculo de tempo restante para expiração de 24h
  const getRemainingHours = (expiresAt: number) => {
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return "Expirado";
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (hours === 0) return `Expira em ${minutes}m`;
    return `Expira em ${hours}h ${minutes}m`;
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 text-white shadow-xs">
              <Camera className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Stories / Status da Loja
            </h3>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] px-2.5 py-0.5 border border-emerald-300 dark:border-emerald-800">
              {stories.length}/3 ativas
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Publique fotos do dia com expiração automática de 24h. Destaca a logo da sua loja com borda vibrante na Home e no cardápio.
          </p>
        </div>

        {stories.length > 0 && onPreviewStories && (
          <button
            type="button"
            onClick={() => onPreviewStories(stories)}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span>Visualizar Stories</span>
          </button>
        )}
      </div>

      {/* Regras e Dicas Rápidas */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-900 dark:text-amber-200">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="leading-relaxed space-y-0.5">
          <p className="font-semibold">Regras de publicação dos Stories:</p>
          <p>• <strong>Apenas fotos</strong> (JPG, PNG, WEBP). Envio de vídeos está bloqueado.</p>
          <p>• <strong>Máximo de 3 fotos ativas</strong> simultaneamente por loja.</p>
          <p>• As fotos somem automaticamente após <strong>24 horas</strong> da publicação.</p>
          <p>• Compressão automática no celular antes do envio (máx 200KB) para garantir velocidade máxima.</p>
        </div>
      </div>

      {/* 1. Área de Upload de Nova Foto */}
      <div className="mt-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={stories.length >= 3 || isProcessingFile}
        />

        {previewDataUrl ? (
          /* Pré-visualização do story antes de publicar */
          <div className="rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Thumbnail com aspect ratio vertical */}
              <div className="relative h-44 w-28 shrink-0 overflow-hidden rounded-xl border border-gray-300 dark:border-slate-700 bg-black shadow-md">
                <img
                  src={previewDataUrl}
                  alt="Pré-visualização do Story"
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-mono text-white">
                  {formatFileSize(previewSize)}
                </span>
              </div>

              {/* Controles de legenda e confirmação */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Foto pronta para publicação
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {formatFileSize(previewSize)} • Super leve
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Legenda opcional (aparece sobre o story):
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ex: Hambúrguer artesanal saindo do fogo agora! 🔥"
                    maxLength={100}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-gray-900 dark:text-white outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block text-right">
                    {caption.length}/100 caracteres
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePublishStory}
                    disabled={isPublishing}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark py-2.5 px-3 text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Publicar Story (Válido 24h)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDataUrl(null);
                      setPreviewSize(0);
                      setCaption("");
                    }}
                    disabled={isPublishing}
                    className="rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : stories.length >= 3 ? (
          /* Aviso de limite de 3 fotos atingido */
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Sua loja já atingiu o limite de <strong>3 stories ativos</strong> simultaneamente. Para postar uma nova foto, exclua uma foto ativa abaixo.
            </span>
          </div>
        ) : (
          /* Botão de Upload direto da galeria ou câmera */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-primary dark:hover:border-primary bg-gray-50/70 dark:bg-slate-800/40 p-6 text-center cursor-pointer transition"
          >
            {isProcessingFile ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Otimizando e comprimindo foto...
                </span>
                <span className="text-[11px] text-gray-400">
                  Garantindo tamanho super leve abaixo de 200KB
                </span>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xs group-hover:scale-110 transition-transform">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    Adicionar foto aos Stories ({3 - stories.length} restantes)
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Toque para escolher da galeria ou tirar foto (JPG, PNG, WEBP - máx 200KB)
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 2. Lista de Stories Ativos da Loja */}
      <div className="mt-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Stories Ativos no Momento ({stories.length})
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Carregando stories da loja...</span>
          </div>
        ) : stories.length === 0 ? (
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 p-6 text-center">
            <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nenhum story ativo no momento
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Fotos publicadas aparecerão aqui e ficarão disponíveis para os clientes por 24h.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 shadow-xs"
              >
                {/* Imagem do Story com aspect vertical */}
                <div className="relative h-44 w-full overflow-hidden bg-black">
                  <img
                    src={story.mediaUrl}
                    alt={story.caption || `Story ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                  {/* Badge de número da foto */}
                  <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                    Foto {index + 1} de {stories.length}
                  </span>

                  {/* Badge de Expiração (24h) */}
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{getRemainingHours(story.expiresAt)}</span>
                  </span>

                  {/* Legenda se houver */}
                  {story.caption && (
                    <div className="absolute bottom-2 inset-x-2 pointer-events-none">
                      <p className="text-[11px] text-white line-clamp-2 drop-shadow font-medium">
                        {story.caption}
                      </p>
                    </div>
                  )}
                </div>

                {/* Botão de Excluir Story */}
                <div className="p-2.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    Postado hoje
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(story.id)}
                    disabled={deletingId === story.id}
                    className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {deletingId === story.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Apagando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3" />
                        <span>Apagar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
