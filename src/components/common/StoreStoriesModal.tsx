import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Utensils, Clock } from "lucide-react";
import type { StoreStory, Tenant } from "@/types";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName } from "@/utils/storeFormat";

interface StoreStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: StoreStory[];
  tenant?: Partial<Tenant> | null;
  onGoToMenu?: (slug: string) => void;
  initialIndex?: number;
}

const STORY_DURATION_MS = 5000; // 5 segundos por foto

export function StoreStoriesModal({
  isOpen,
  onClose,
  stories,
  tenant,
  onGoToMenu,
  initialIndex = 0,
}: StoreStoriesModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const lastPauseStartRef = useRef<number | null>(null);

  // Reseta ao abrir ou trocar de loja
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(initialIndex, Math.max(0, stories.length - 1)));
      setProgress(0);
      setIsPaused(false);
      setIsImageLoaded(false);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastPauseStartRef.current = null;
    }
  }, [isOpen, initialIndex, stories]);

  const currentStory = stories[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setIsImageLoaded(false);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastPauseStartRef.current = null;
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setIsImageLoaded(false);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastPauseStartRef.current = null;
    } else {
      setProgress(0);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastPauseStartRef.current = null;
    }
  }, [currentIndex]);

  // Animação de progresso de 5 segundos
  useEffect(() => {
    if (!isOpen || !currentStory || stories.length === 0) return;

    let animationFrameId: number;

    const tick = (now: number) => {
      if (isPaused) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }

      const elapsed = now - startTimeRef.current - pausedTimeRef.current;
      const currentPct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
      setProgress(currentPct);

      if (currentPct >= 100) {
        handleNext();
      } else {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    requestRef.current = animationFrameId;

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isOpen, currentStory, currentIndex, isPaused, handleNext, stories.length]);

  // Pausa ao segurar a tela (Pointer / Touch)
  const handlePointerDown = () => {
    setIsPaused(true);
    lastPauseStartRef.current = performance.now();
  };

  const handlePointerUp = () => {
    if (lastPauseStartRef.current) {
      pausedTimeRef.current += performance.now() - lastPauseStartRef.current;
      lastPauseStartRef.current = null;
    }
    setIsPaused(false);
  };

  // Navegação por clique na lateral da tela
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Evita ação se clicou em botões como fechar ou ver cardápio
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !currentStory || stories.length === 0) return null;

  const storeName = getSafeDisplayName(tenant?.name, "Estabelecimento");
  const storeLogo = tenant?.logo || "🏪";
  const storeSlug = tenant?.slug || "";

  // Formata o tempo decorrido do story
  const formatTimeAgo = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Agora mesmo";
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "Há 1 hora";
    return `Há ${hours} horas`;
  };

  const handleGoToCardapio = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    if (onGoToMenu && storeSlug) {
      onGoToMenu(storeSlug);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 sm:bg-black/90 backdrop-blur-md select-none animate-fade-in">
      {/* Container tipo moldura de smartphone em desktop e tela cheia em mobile */}
      <div
        className="relative flex h-full w-full sm:h-[92vh] sm:max-h-[820px] sm:w-[420px] flex-col overflow-hidden sm:rounded-3xl bg-slate-950 shadow-2xl ring-1 ring-white/10"
        onClick={handleScreenClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* 1. Barras de Progresso no Topo (Segmentadas estilo Instagram) */}
        <div className="absolute top-0 inset-x-0 z-30 flex gap-1.5 p-3 sm:pt-4">
          {stories.map((s, idx) => {
            let widthPct = 0;
            if (idx < currentIndex) widthPct = 100;
            else if (idx === currentIndex) widthPct = progress;

            return (
              <div
                key={s.id || idx}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-xs"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* 2. Cabeçalho do Story (Logo, Nome da Loja, Horário e Botão Fechar) */}
        <div className="absolute top-6 sm:top-7 inset-x-0 z-30 flex items-center justify-between px-3.5 sm:px-4 py-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo da Loja com anel de status */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-emerald-400 bg-white dark:bg-slate-800 text-lg shadow-md">
              <StoreLogo logo={storeLogo} name={storeName} className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white drop-shadow truncate">
                  {storeName}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/90 text-[10px] font-black text-white px-1.5 py-0.2">
                  Story
                </span>
              </div>
              <span className="text-[11px] text-white/75 flex items-center gap-1">
                <Clock className="h-3 w-3 inline" />
                {formatTimeAgo(currentStory.createdAt)}
              </span>
            </div>
          </div>

          {/* Botão de Fechar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition active:scale-95 cursor-pointer"
            title="Fechar Stories"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3. Imagem do Story (Apenas Foto) */}
        <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
          {/* Skeleton/Placeholder enquanto carrega */}
          {!isImageLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
              <span className="text-xs font-medium">Carregando foto...</span>
            </div>
          )}

          <img
            key={currentStory.id || currentStory.mediaUrl}
            src={currentStory.mediaUrl}
            alt={currentStory.caption || `Story de ${storeName}`}
            onLoad={() => setIsImageLoaded(true)}
            className={`h-full w-full object-contain sm:object-cover transition-opacity duration-300 ${
              isImageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Indicadores de toque nas laterais (para mobile/desktop) */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-10" />
          <div className="absolute inset-y-0 right-0 w-2/3 z-10" />
        </div>

        {/* 4. Legenda do Story (se houver) */}
        {currentStory.caption && (
          <div className="absolute bottom-20 inset-x-0 z-30 px-4 py-2 pointer-events-none">
            <div className="mx-auto max-w-sm rounded-2xl bg-black/75 backdrop-blur-md px-3.5 py-2.5 border border-white/10 shadow-lg">
              <p className="text-center text-xs sm:text-sm font-medium text-white leading-snug">
                {currentStory.caption}
              </p>
            </div>
          </div>
        )}

        {/* 5. Rodapé com Botão "Ver Cardápio" */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
          <button
            type="button"
            onClick={handleGoToCardapio}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-700 hover:to-amber-600 py-3.5 px-4 font-extrabold text-sm sm:text-base text-white shadow-xl transition active:scale-[0.98] cursor-pointer"
          >
            <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Ver Cardápio da Loja</span>
          </button>
        </div>

        {/* Setas de navegação visíveis em Desktop */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition"
            title="Foto anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {currentIndex < stories.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition"
            title="Próxima foto"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
