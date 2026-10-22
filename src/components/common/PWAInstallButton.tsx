import React, { useState, useEffect } from "react";
import {
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle,
  Smartphone,
  Laptop,
  Apple,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useStore } from "@/context/StoreContext";

interface PWAInstallButtonProps {
  className?: string;
  variant?: "header" | "floating" | "banner";
  label?: string;
  storeName?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = "",
  variant = "header",
  label,
  storeName: propStoreName,
}) => {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    isXiaomi,
    isDesktop,
  } = usePWAInstall();

  // Acessa o contexto da loja para obter nome e slug caso esteja em uma vitrine
  const storeContext = useStore();
  const config = storeContext?.config;
  const currentTenant = storeContext?.currentTenant;

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">(
    isIOS ? "ios" : isAndroid || isXiaomi ? "android" : "desktop"
  );
  const [isPrompting, setIsPrompting] = useState(false);

  // Inicializa a aba conforme o dispositivo detectado
  useEffect(() => {
    if (isIOS) {
      setActiveTab("ios");
    } else if (isAndroid || isXiaomi) {
      setActiveTab("android");
    } else {
      setActiveTab("desktop");
    }
  }, [isIOS, isAndroid, isXiaomi, isDesktop]);

  // Se já estiver rodando em modo standalone (app instalado), não renderiza
  if (isInstalled) {
    return null;
  }

  // Detecta se o usuário está na página de uma loja/estabelecimento e obtém seu nome
  const getStoreInfo = (): { isStore: boolean; storeName: string } => {
    if (typeof window === "undefined") {
      return { isStore: false, storeName: "" };
    }

    if (propStoreName && propStoreName.trim()) {
      return { isStore: true, storeName: propStoreName.trim() };
    }

    const path = window.location.pathname.toLowerCase();
    const cleanPath = path.replace(/\/+$/, "");

    // Não é vitrine se for rota do Portal Geral ou rotas administrativas
    const isPortalRoute =
      cleanPath === "" ||
      cleanPath === "/" ||
      cleanPath === "/portal" ||
      cleanPath === "/topfood";

    const isAdminRoute =
      path.startsWith("/admin") ||
      path.startsWith("/painel") ||
      path.startsWith("/superadmin") ||
      path.startsWith("/super-admin") ||
      path.startsWith("/api");

    if (isPortalRoute || isAdminRoute) {
      return { isStore: false, storeName: "" };
    }

    // Se estiver em rota de vitrine (/loja/:slug ou /:slug)
    const detectedName =
      (currentTenant?.name && currentTenant.name.trim()) ||
      (config?.name && config.name.trim() !== "Top Food" && config.name.trim()) ||
      "";

    if (detectedName) {
      return { isStore: true, storeName: detectedName };
    }

    return { isStore: false, storeName: "" };
  };

  // Dispara o download direto do arquivo APK para Android
  const triggerApkDownload = (isStore: boolean, detectedName: string) => {
    const rawName = (isStore && detectedName ? detectedName : "").trim();
    // 3. Se estiver na página de um lojista, define o atributo download como `${nomeDaLoja} - Top Food.apk`
    const safeName = rawName.replace(/[/\\?%*:|"<>]/g, "-").trim();
    const downloadFileName = safeName ? `${safeName} - Top Food.apk` : "Top Food.apk";

    setIsPrompting(true);
    const link = document.createElement("a");
    link.href = "/top-food.apk";
    link.setAttribute("download", downloadFileName);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch {
        // ignore
      }
      setIsPrompting(false);
    }, 1200);
  };

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const { isStore, storeName: currentStoreName } = getStoreInfo();

    // 4. Salva a rota atual no localStorage ao clicar em baixar na loja para redirecionar o usuário diretamente para ela ao reabrir o app
    if (isStore && typeof window !== "undefined") {
      try {
        const currentRoute = window.location.pathname + window.location.search;
        localStorage.setItem("topfood_saved_store_route", currentRoute);
        const storeSlug = config?.slug || currentTenant?.slug || "";
        if (storeSlug) {
          localStorage.setItem("topfood_last_store_slug", storeSlug);
        }
        sessionStorage.removeItem("topfood_explicit_portal_nav");
      } catch (err) {
        console.warn("Erro ao salvar rota da loja no localStorage:", err);
      }
    }

    // 1. Se o usuário estiver no iPhone/iOS: ao clicar em instalar, abre um modal instrutivo explicando como adicionar à Tela de Início pelo Safari
    if (isIOS) {
      setActiveTab("ios");
      setShowModal(true);
      return;
    }

    // 2. Se o usuário estiver no Android (ou desktop): faz o download do arquivo '/Top Food.apk'
    triggerApkDownload(isStore, currentStoreName);
  };

  const { isStore, storeName: currentStoreName } = getStoreInfo();

  return (
    <>
      {variant === "header" && (
        <button
          id="btn-pwa-install-header"
          type="button"
          onClick={handleInstallClick}
          disabled={isPrompting}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition shadow-xs border border-white/25 active:scale-95 cursor-pointer disabled:opacity-75 whitespace-nowrap h-7 sm:h-7.5 ${className}`}
          title="Instalar Top Food no seu dispositivo"
        >
          <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-300 shrink-0" />
          {label ? (
            <span>{isPrompting ? "Baixando..." : label}</span>
          ) : (
            <>
              <span className="hidden xs:inline">
                {isPrompting ? "Baixando..." : "Instalar App"}
              </span>
              <span className="xs:hidden">
                {isPrompting ? "..." : "Instalar"}
              </span>
            </>
          )}
        </button>
      )}

      {variant === "banner" && (
        <div
          className={`rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 p-3.5 sm:p-4 shadow-sm ${className}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  {isStore && currentStoreName
                    ? `Instale o aplicativo de ${currentStoreName}`
                    : "Instale o Top Food no seu aparelho"}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Acesse com 1 toque, em tela cheia e sem barras de navegação!
                </p>
              </div>
            </div>
            <button
              id="btn-pwa-install-banner"
              type="button"
              onClick={handleInstallClick}
              disabled={isPrompting}
              className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-75"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isPrompting ? "Baixando..." : "Instalar App"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Instrutivo (com foco especial em iPhone / Safari) */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 border border-gray-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 cursor-pointer transition"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="text-center mb-4">
              <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-primary">
                {activeTab === "ios" ? (
                  <Apple className="h-6 w-6 text-primary" />
                ) : (
                  <Download className="h-6 w-6 text-primary" />
                )}
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {activeTab === "ios"
                  ? isStore && currentStoreName
                    ? `Adicionar ${currentStoreName} ao iPhone`
                    : "Instalar no iPhone (Safari)"
                  : isStore && currentStoreName
                  ? `Instalar ${currentStoreName}`
                  : "Instalar Top Food"}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {activeTab === "ios"
                  ? "Adicione o app diretamente à sua Tela de Início usando o Safari."
                  : "Adicione o aplicativo ao seu aparelho para acesso rápido e direto."}
              </p>
            </div>

            {/* Seletor de Plataforma (Android/Xiaomi, iOS, PC) */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === "android"
                    ? "bg-white dark:bg-slate-700 text-primary dark:text-amber-400 shadow-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === "ios"
                    ? "bg-white dark:bg-slate-700 text-primary dark:text-amber-400 shadow-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <Apple className="h-3.5 w-3.5" />
                <span>iPhone (iOS)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("desktop")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === "desktop"
                    ? "bg-white dark:bg-slate-700 text-primary dark:text-amber-400 shadow-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Computador</span>
              </button>
            </div>

            {/* Conteúdo: iPhone / iPad (Safari) */}
            {activeTab === "ios" && (
              <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    1
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    No <strong>Safari</strong> do iPhone, toque no botão de{" "}
                    <strong className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-1">
                      <Share className="h-3.5 w-3.5 inline text-blue-500" /> Compartilhar
                    </strong>{" "}
                    localizado na barra inferior.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    2
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Role a lista de ações para baixo e toque na opção:
                    <div className="mt-1 font-bold text-primary dark:text-amber-400 inline-flex items-center gap-1">
                      <PlusSquare className="h-3.5 w-3.5 text-primary dark:text-amber-400" /> Adicionar à Tela de Início
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    3
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Toque em <strong>Adicionar</strong> no canto superior direito. Pronto! O ícone estará salvo na tela do seu iPhone.
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo: Android (APK Download) */}
            {activeTab === "android" && (
              <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300">
                <p className="leading-relaxed">
                  No Android, você pode baixar o aplicativo diretamente em formato APK para instalar no seu aparelho:
                </p>
                <button
                  type="button"
                  onClick={() => triggerApkDownload(isStore, currentStoreName)}
                  disabled={isPrompting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {isPrompting
                      ? "Baixando..."
                      : isStore && currentStoreName
                      ? `Baixar APK (${currentStoreName})`
                      : "Baixar top-food.apk"}
                  </span>
                </button>
                <div className="pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Dica: Ao concluir o download, abra a notificação ou a pasta "Downloads" e toque em <strong>Instalar</strong>.
                </div>
              </div>
            )}

            {/* Conteúdo: Computador / PC (Chrome, Edge, etc.) */}
            {activeTab === "desktop" && (
              <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    1
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Na <strong>barra de endereço</strong> no topo do navegador (ao lado da estrela de favoritos), clique no ícone de instalar:
                    <div className="mt-1 font-bold text-primary dark:text-amber-400 inline-flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" /> Instalar Top Food
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    2
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Ou baixe o arquivo APK diretamente para o seu aparelho Android:
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => triggerApkDownload(isStore, currentStoreName)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-white transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar top-food.apk
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Fechar */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow hover:bg-primary-dark transition active:scale-98 cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Entendi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
