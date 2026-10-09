import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 68,
  maxPullDistance = 128,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const pullDistanceRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const isScrollAtAbsoluteTop = useCallback((): boolean => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    const winScrollTop =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    return winScrollTop <= 0;
  }, []);

  const hasScrollableAncestorNotAtTop = useCallback((target: EventTarget | null): boolean => {
    if (typeof window === "undefined" || !(target instanceof HTMLElement)) return false;
    let el: HTMLElement | null = target;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const isScrollableY =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        el.scrollHeight > el.clientHeight + 1;
      if (isScrollableY && el.scrollTop > 0) {
        return true;
      }
      // Se estiver dentro de um modal/drawer fixo aberto, evita puxar a página de fundo
      if (style.position === "fixed" && el.clientHeight > 200) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setIsPulling(false);
    isPullingRef.current = false;
    pullDistanceRef.current = threshold;
    setPullDistance(threshold);

    // Feedback tátil suave em dispositivos móveis compatíveis
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(12);
      } catch {
        // ignore
      }
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const safetyTimeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, 1200);
    });

    try {
      await Promise.race([Promise.resolve(onRefreshRef.current()), safetyTimeout]);
    } catch (err) {
      console.warn("[PullToRefresh] Erro ao atualizar dados:", err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [threshold]);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;

      // Só inicia o gesto quando o scroll da página estiver no topo absoluto (scrollTop === 0)
      if (!isScrollAtAbsoluteTop()) {
        startYRef.current = null;
        return;
      }

      if (hasScrollableAncestorNotAtTop(e.target)) {
        startYRef.current = null;
        return;
      }

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (startYRef.current === null || startXRef.current === null) return;
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startYRef.current;
      const deltaX = Math.abs(currentX - startXRef.current);

      // Se o scroll saiu do topo absoluto antes de puxar, cancela o gesto para não atrapalhar a rolagem normal
      if (!isScrollAtAbsoluteTop()) {
        startYRef.current = null;
        if (pullDistanceRef.current > 0) {
          pullDistanceRef.current = 0;
          setPullDistance(0);
          setIsPulling(false);
          isPullingRef.current = false;
        }
        return;
      }

      // Se o movimento for mais horizontal (ex: carrossel) do que vertical no início, ignora
      if (!isPullingRef.current && deltaX > Math.abs(deltaY) && deltaX > 8) {
        startYRef.current = null;
        return;
      }

      // Apenas puxando para baixo (deltaY > 0) no topo absoluto
      if (deltaY <= 4) {
        if (pullDistanceRef.current > 0) {
          pullDistanceRef.current = 0;
          setPullDistance(0);
          setIsPulling(false);
          isPullingRef.current = false;
        }
        return;
      }

      // Ativa estado de pull e aplica resistência elástica (rubber-band) igual a apps nativos (iFood / Instagram)
      if (!isPullingRef.current) {
        isPullingRef.current = true;
        setIsPulling(true);
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      const rawPull = Math.max(0, deltaY - 4);
      const dampedDistance = Math.min(
        maxPullDistance,
        Math.round(maxPullDistance * (1 - Math.exp(-rawPull / (maxPullDistance * 1.35))))
      );

      pullDistanceRef.current = dampedDistance;
      setPullDistance(dampedDistance);
    };

    const handleTouchEnd = () => {
      if (isRefreshingRef.current) return;
      startYRef.current = null;
      startXRef.current = null;

      if (!isPullingRef.current && pullDistanceRef.current === 0) return;

      const finalDistance = pullDistanceRef.current;
      setIsPulling(false);
      isPullingRef.current = false;

      if (finalDistance >= threshold) {
        triggerRefresh();
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [disabled, threshold, maxPullDistance, isScrollAtAbsoluteTop, hasScrollableAncestorNotAtTop, triggerRefresh]);

  const progress = Math.min(1, pullDistance / threshold);
  const isReadyToRefresh = pullDistance >= threshold;

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    progress,
    isReadyToRefresh,
    triggerRefresh,
  };
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number;
}

/**
 * Componente container de Pull-to-Refresh com física elástica fluida estilo iFood / Instagram.
 * Só ativa quando o scroll da página está no topo absoluto (scrollTop === 0).
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 68,
}: PullToRefreshProps) {
  const {
    pullDistance,
    isRefreshing,
    isPulling,
    progress,
    isReadyToRefresh,
  } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  });

  const showIndicator = pullDistance > 0 || isRefreshing;
  const indicatorTranslateY = showIndicator
    ? Math.min(pullDistance - 44, threshold - 12)
    : -56;

  return (
    <div className="relative w-full">
      {/* Indicador visual flutuante no topo (apenas ícone circular centralizado, sem texto) */}
      <div
        aria-live="polite"
        aria-busy={isRefreshing}
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center overflow-visible"
        style={{
          transform: `translate3d(0, ${indicatorTranslateY}px, 0)`,
          opacity: isRefreshing ? 1 : Math.min(1, progress * 1.25),
          transition: isPulling
            ? "opacity 80ms linear"
            : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out",
        }}
      >
        <div className="mt-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-700/90 shadow-lg shadow-black/15 dark:shadow-black/40 backdrop-blur-md">
          <RefreshCw
            className={`h-5 w-5 text-primary shrink-0 ${
              isRefreshing ? "animate-spin" : ""
            }`}
            style={
              !isRefreshing
                ? {
                    transform: `rotate(${Math.round(progress * 320)}deg) scale(${
                      0.75 + progress * 0.25
                    })`,
                    transition: isPulling ? "none" : "transform 200ms ease-out",
                  }
                : undefined
            }
          />
          {isReadyToRefresh && pullDistance > threshold + 10 && !isRefreshing ? (
            <span className="sr-only">Solte para atualizar</span>
          ) : null}
        </div>
      </div>

      {/* Conteúdo com deslocamento elástico suave ao puxar */}
      <div
        style={{
          transform:
            pullDistance > 0
              ? `translate3d(0, ${Math.round(pullDistance * 0.42)}px, 0)`
              : "none",
          transition: isPulling
            ? "none"
            : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
