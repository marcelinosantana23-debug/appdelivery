import { useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== "undefined" && window.__pwaInstallPrompt) {
      return window.__pwaInstallPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Checar se já foi capturado previamente pelo listener em index.html
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    // Detecta se a aplicação já está rodando em modo standalone (PWA instalado)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Impede o banner padrão do navegador
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent); // Guarda o evento no estado
    };

    const handlePromptReady = () => {
      if (window.__pwaInstallPrompt) {
        setDeferredPrompt(window.__pwaInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      console.log("Top Food PWA instalado com sucesso!");
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    const promptToUse = deferredPrompt || (typeof window !== "undefined" ? window.__pwaInstallPrompt : null);
    if (!promptToUse) return false;
    try {
      await promptToUse.prompt();
      const choiceResult = await promptToUse.userChoice;
      if (choiceResult && choiceResult.outcome === "accepted") {
        console.log("Usuário aceitou a instalação");
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        window.__pwaInstallPrompt = null;
      }
      return true;
    } catch (err) {
      console.warn("Erro ao acionar prompt de instalação no Android/Chrome:", err);
      return false;
    }
  };

  return {
    deferredPrompt,
    setDeferredPrompt,
    isInstallable: Boolean(deferredPrompt || (typeof window !== "undefined" && window.__pwaInstallPrompt)),
    isInstalled,
    isIOS,
    isAndroid,
    install,
  };
}
