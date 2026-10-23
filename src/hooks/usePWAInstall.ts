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

export function detectDevice() {
  if (typeof window === "undefined" || !window.navigator) {
    return {
      isIOS: false,
      isAndroid: false,
      isXiaomi: false,
      isDesktop: true,
    };
  }
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOSDevice =
    (/iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  const isAndroidDevice = /android/.test(userAgent);
  const isXiaomiDevice = /miuibrowser|xiaomi|redmi|poco/i.test(userAgent);
  const isDesktopDevice = !isIOSDevice && !isAndroidDevice;

  return {
    isIOS: isIOSDevice,
    isAndroid: isAndroidDevice,
    isXiaomi: isXiaomiDevice,
    isDesktop: isDesktopDevice,
  };
}

export function usePWAInstall() {
  const initialDevice = detectDevice();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== "undefined" && window.__pwaInstallPrompt) {
      return window.__pwaInstallPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(initialDevice.isIOS);
  const [isAndroid, setIsAndroid] = useState(initialDevice.isAndroid);
  const [isXiaomi, setIsXiaomi] = useState(initialDevice.isXiaomi);
  const [isDesktop, setIsDesktop] = useState(initialDevice.isDesktop);

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

    const {
      isIOS: isIOSDevice,
      isAndroid: isAndroidDevice,
      isXiaomi: isXiaomiDevice,
      isDesktop: isDesktopDevice,
    } = detectDevice();

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsXiaomi(isXiaomiDevice);
    setIsDesktop(isDesktopDevice);

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
    const { isAndroid: isAndroidDev, isIOS: isIOSDev } = detectDevice();

    // Em celulares Android: inicia o download direto do APK na raiz
    if (isAndroidDev) {
      if (typeof document !== "undefined") {
        const link = document.createElement("a");
        link.href = "/top-food.apk";
        link.setAttribute("download", "top-food.apk");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      }
      return false;
    }

    // Em iPhone/iPad: PWA não possui prompt nativo de instalação, orienta pelo tutorial
    if (isIOSDev) {
      return false;
    }

    // Em Computador (Desktop): mantém fluxo nativo do PWA intacto
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
      console.warn("Erro ao acionar prompt de instalação:", err);
      return false;
    }
  };

  return {
    deferredPrompt,
    setDeferredPrompt,
    isInstallable: Boolean(deferredPrompt || (typeof window !== "undefined" && window.__pwaInstallPrompt)),
    isInstalled,
    setIsInstalled,
    isIOS,
    isAndroid,
    isXiaomi,
    isDesktop,
    install,
  };
}
