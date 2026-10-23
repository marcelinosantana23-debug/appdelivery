/**
 * Top Food Delivery - Componente Oficial do Botão de Instalação PWA / APK
 * Atualizado para download direto: /top-food.apk com nome dinâmico da loja
 */

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

  // Contexto da loja para obter os dados do estabelecimento atual
  const storeContext = useStore();
  const config = storeContext?.config;
  const currentTenant = storeContext?.currentTenant;

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">(
    isIOS ? "ios" : isAndroid || isXiaomi ? "android" : "desktop"
  );
  const [isPrompting, setIsPrompting] = useState(false);

  // Sincroniza a aba ativa com o sistema operacional detectado
  useEffect(() => {
    if (isIOS) {
      setActiveTab("ios");
    } else if (isAndroid || isXiaomi) {
      setActiveTab("android");
    } else {
      setActiveTab("desktop");
    }
  }, [isIOS, isAndroid, isXiaomi, isDesktop]);

  // Se já estiver rodando em modo standalone (aplicativo instalado), oculta o botão
  if (isInstalled) {
    return null;
  }

  // Identifica se está navegando na vitrine de um lojista e extrai o nome
  const getStoreInfo = (): { isStore: boolean; storeName: string } => {
    if (typeof window === "undefined") {
      return { isStore: false, storeName: "" };
    }

    if (propStoreName && propStoreName.trim()) {
      return { isStore: true, storeName: propStoreName.trim() };
    }

    const path = window.location.pathname.toLowerCase();
    const cleanPath = path.replace(/\/+$/, "");

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

    const detectedName =
      (currentTenant?.name && currentTenant.name.trim()) ||
      (config?.name && config.name.trim() !== "Top Food" && config.name.trim()) ||
      "";

    if (detectedName) {
      return { isStore: true, storeName: detectedName };
    }

    return { isStore: false, storeName: "" };
  };

  const { isStore, storeName: currentStoreName } = getStoreInfo();
  const nomeDaLoja = isStore ? currentStoreName : "";

  // Manipulador de clique: salva rota no localStorage e trata iOS
  const handleInstallClick = async (e?: React.MouseEvent) => {
    // Salva a rota atual no localStorage para redirecionar ao reabrir o app
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
        console.warn("Erro ao salvar rota no localStorage:", err);
      }
    }

    // No iPhone/iOS, previne o download do APK e abre o modal explicativo do Safari
    if (isIOS) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setActiveTab("ios");
      setShowModal(true);
      return;
    }

    // Feedback visual breve durante o download nativo do arquivo
    setIsPrompting(true);
    setTimeout(() => {
      setIsPrompting(false);
    }, 1500);
  };

  return (
    <>
      {/* 1. Botão de Cabeçalho / Navbar */}
      {variant === "header" && (
        <a
          id="btn-pwa-install-header"
          href="/top-food.apk"
          download="top-food.apk"
          onClick={handleInstallClick}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition shadow-xs border border-white/25 active:scale-95 cursor-pointer whitespace-nowrap h-7 sm:h-7.5 ${className}`}
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
        </a>
      )}

      {/* 2. Banner de Instalação na Página */}
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
                  {nomeDaLoja
                    ? `Instale o aplicativo de ${nomeDaLoja}`
                    : "Instale o Top Food no seu aparelho"}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Acesse com 1 toque, em tela cheia e sem barras de navegação!
                </p>
              </div>
            </div>
            <a
              id="btn-pwa-install-banner"
              href="/top-food.apk"
              download="top-food.apk"
              onClick={handleInstallClick}
              className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isPrompting ? "Baixando..." : "Instalar App"}</span>
            </a>
          </div>
        </div>
      )}

      {/* 3. Modal Informativo para Safari no iOS */}
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
                  ? nomeDaLoja
                    ? `Adicionar ${nomeDaLoja} ao iPhone`
                    : "Instalar no iPhone (Safari)"
                  : nomeDaLoja
                  ? `Instalar ${nomeDaLoja}`
                  : "Instalar Top Food"}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {activeTab === "ios"
                  ? "Adicione o app diretamente à sua Tela de Início usando o Safari."
                  : "Adicione o aplicativo ao seu aparelho para acesso rápido e direto."}
              </p>
            </div>

            {/* Abas de Navegação de Plataforma */}
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
                <a
                  href="/top-food.apk"
                  download="top-food.apk"
                  onClick={() => {
                    if (isStore && typeof window !== "undefined") {
                      try {
                        localStorage.setItem(
                          "topfood_saved_store_route",
                          window.location.pathname + window.location.search
                        );
                      } catch (_err) {
                        // ignore
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {nomeDaLoja
                      ? `Baixar APK (${nomeDaLoja})`
                      : "Baixar top-food.apk"}
                  </span>
                </a>
                <div className="pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Dica: Ao concluir o download, abra a notificação ou a pasta "Downloads" e toque em <strong>Instalar</strong>.
                </div>
              </div>
            )}

            {/* Conteúdo: Computador / PC */}
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
                      <a
                        href="/top-food.apk"
                        download="top-food.apk"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-white transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar top-food.apk
                      </a>
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
