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

export function isAppStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://")
    );
  } catch {
    return false;
  }
}

function getDeviceState() {
  if (typeof window === "undefined") {
    return {
      isIOS: false,
      isAndroid: false,
      isXiaomi: false,
      isDesktop: false,
      isStandalone: false,
    };
  }
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOSDevice =
    (/iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
      (userAgent.includes("macintosh") && navigator.maxTouchPoints > 1)) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  const isAndroidDevice = /android/.test(userAgent);
  const isXiaomiDevice = /miuibrowser|xiaomi|redmi|poco/i.test(userAgent);
  const isDesktopDevice = !isIOSDevice && !isAndroidDevice;
  const isStandalone = isAppStandalone();

  return {
    isIOS: isIOSDevice,
    isAndroid: isAndroidDevice,
    isXiaomi: isXiaomiDevice,
    isDesktop: isDesktopDevice,
    isStandalone,
  };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== "undefined" && window.__pwaInstallPrompt) {
      return window.__pwaInstallPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(() => getDeviceState().isStandalone);
  const [isIOS, setIsIOS] = useState(() => getDeviceState().isIOS);
  const [isAndroid, setIsAndroid] = useState(() => getDeviceState().isAndroid);
  const [isXiaomi, setIsXiaomi] = useState(() => getDeviceState().isXiaomi);
  const [isDesktop, setIsDesktop] = useState(() => getDeviceState().isDesktop);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const device = getDeviceState();
    setIsInstalled(device.isStandalone);
    setIsIOS(device.isIOS);
    setIsAndroid(device.isAndroid);
    setIsXiaomi(device.isXiaomi);
    setIsDesktop(device.isDesktop);

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
