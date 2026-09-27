import { useState, useEffect, useRef, useCallback } from "react";

interface UseScreenWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<boolean>;
  release: () => Promise<void>;
  toggle: () => Promise<void>;
}

/**
 * Hook para gerenciar a Screen Wake Lock API
 * Mantém a tela do dispositivo acesa continuamente (ideal para painéis de cozinha/pedidos)
 * e reativa automaticamente quando a aba volta ao foco (visibilitychange).
 */
export function useScreenWakeLock(autoRequest: boolean = true): UseScreenWakeLockReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const isEnabledRef = useRef<boolean>(autoRequest);

  // Verifica suporte no navegador
  useEffect(() => {
    const supported = typeof window !== "undefined" && "wakeLock" in navigator;
    setIsSupported(supported);
  }, []);

  // Função interna para solicitar o bloqueio de tela
  const request = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) {
      return false;
    }

    // Não solicita se a página estiver oculta (aba em segundo plano), pois o navegador rejeitará
    if (document.visibilityState !== "visible") {
      return false;
    }

    try {
      // Se já houver um wake lock ativo e não liberado, não precisa solicitar novamente
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        setIsActive(true);
        return true;
      }

      const sentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setIsActive(true);

      // Ouvinte para quando o sistema liberar o wake lock (ex: bateria crítica ou bloqueio manual)
      sentinel.addEventListener("release", () => {
        setIsActive(false);
        wakeLockRef.current = null;
      });

      return true;
    } catch (err: any) {
      console.warn("[WakeLock] Não foi possível ativar o bloqueio de tela:", err?.message || err);
      setIsActive(false);
      wakeLockRef.current = null;
      return false;
    }
  }, []);

  // Função para liberar o bloqueio de tela
  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn("[WakeLock] Erro ao liberar wake lock:", err);
      } finally {
        wakeLockRef.current = null;
        setIsActive(false);
      }
    }
  }, []);

  // Alterna manualmente
  const toggle = useCallback(async () => {
    if (isActive) {
      isEnabledRef.current = false;
      await release();
    } else {
      isEnabledRef.current = true;
      await request();
    }
  }, [isActive, release, request]);

  // Efeito principal: ativa na montagem e monitora mudanças de visibilidade
  useEffect(() => {
    if (!isSupported) return;

    isEnabledRef.current = autoRequest;

    if (autoRequest) {
      request();
    }

    // Reativa o Wake Lock automaticamente quando a aba recuperar o foco
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isEnabledRef.current) {
        await request();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Na desmontagem (quando o lojista sai da tela de pedidos), libera o Wake Lock
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release().catch(() => {});
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
      }
    };
  }, [isSupported, autoRequest, request]);

  return {
    isSupported,
    isActive,
    request,
    release,
    toggle,
  };
}
