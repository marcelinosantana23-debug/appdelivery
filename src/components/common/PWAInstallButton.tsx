/**
 * Top Food Delivery - Componente Oficial do Botão de Instalação PWA / APK
 * Suporte a APK dinâmico de loja (/${idDaLoja}.apk) com fallback seguro para /top-food.apk
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
  storeId?: string;
  storeSlug?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = "",
  variant = "header",
  label,
  storeName: propStoreName,
  storeId: propStoreId,
  storeSlug: propStoreSlug,
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

  // 1 & 2. Identifica se está navegando na vitrine de um lojista e extrai ID e Nome
  const getStoreInfo = (): { isStore: boolean; storeName: string; storeId: string } => {
    if (typeof window === "undefined") {
      return { isStore: false, storeName: "", storeId: "" };
    }

    const path = window.location.pathname;
    const lowerPath = path.toLowerCase();
    const cleanPath = lowerPath.replace(/\/+$/, "");

    // Rotas gerais que NÃO pertencem a uma loja específica (Portal e Painéis Administrativos)
    const isPortalRoute =
      cleanPath === "" ||
      cleanPath === "/" ||
      cleanPath === "/portal" ||
      cleanPath === "/topfood";

    const isAdminRoute =
      lowerPath.startsWith("/admin") ||
      lowerPath.startsWith("/painel") ||
      lowerPath.startsWith("/superadmin") ||
      lowerPath.startsWith("/super-admin") ||
      lowerPath.startsWith("/api") ||
      lowerPath.startsWith("/health");

    // Extrai o slug/ID da loja a partir do caminho /loja/:slug ou /:slug
    let extractedSlug = "";
    const match = path.match(/^\/loja\/([^/?#]+)/i);
    if (match && match[1]) {
      extractedSlug = decodeURIComponent(match[1]).toLowerCase().trim();
    } else {
      const firstSegment = path.replace(/^\/+|\/+$/g, "").split("/")[0];
      if (
        firstSegment &&
        !["admin", "painel", "superadmin", "super-admin", "api", "health", "portal", "topfood", "carrinho", "checkout", "rastreio"].includes(firstSegment.toLowerCase())
      ) {
        extractedSlug = decodeURIComponent(firstSegment).toLowerCase().trim();
      }
    }

    const lojaAtual = currentTenant || config;
    const resolvedId =
      propStoreSlug ||
      propStoreId ||
      extractedSlug ||
      (lojaAtual?.slug && lojaAtual.slug !== "topfood" ? lojaAtual.slug.trim() : "") ||
      (lojaAtual?.id && lojaAtual.id !== "topfood" ? lojaAtual.id.trim() : "");

    const detectedName =
      (propStoreName && propStoreName.trim()) ||
      (lojaAtual?.name && lojaAtual.name !== "Top Food" ? lojaAtual.name.trim() : "") ||
      "";

    if (!isPortalRoute && !isAdminRoute && (resolvedId || detectedName)) {
      return {
        isStore: true,
        storeName: detectedName || resolvedId,
        storeId: resolvedId,
      };
    }

    return { isStore: false, storeName: "", storeId: "" };
  };

  const { isStore, storeName, storeId: idDaLoja } = getStoreInfo();
  const nomeDaLoja = isStore ? storeName : "";

  // 1. ARQUIVO DE DOWNLOAD ÚNICO: Aponta SEMPRE para o APK principal da raiz: /top-food.apk
  const APK_HREF = "/top-food.apk";
  const APK_DOWNLOAD_NAME = "top-food.apk";

  // Função auxiliar para disparar o download nativo via elemento <a> invisível
  const triggerApkDownload = (apkUrl: string = APK_HREF, fileName: string = APK_DOWNLOAD_NAME) => {
    setIsPrompting(true);
    const link = document.createElement("a");
    // Garante que a barra '/' inicial esteja sempre presente
    link.href = apkUrl.startsWith("/") ? apkUrl : `/${apkUrl}`;
    link.setAttribute("download", fileName);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch (_err) {
        // ignore
      }
      setIsPrompting(false);
    }, 1500);
  };

  // 2. SALVAMENTO DA ROTA/LOJA (No clique do botão "Instalar")
  const handleInstallClick = (e?: React.MouseEvent) => {
    if (typeof window !== "undefined") {
      try {
        const path = window.location.pathname;
        const cleanPath = path.toLowerCase().replace(/\/+$/, "");
        const isPortalHome =
          cleanPath === "" ||
          cleanPath === "/" ||
          cleanPath === "/portal" ||
          cleanPath === "/topfood";

        const match = path.match(/^\/loja\/([^/?#]+)/i);
        const params = { id: match ? decodeURIComponent(match[1]).trim() : undefined };
        const lojaAtual = currentTenant || config;

        // Regra solicitada:
        // const idDaLoja = lojaAtual?.slug || lojaAtual?.id || params?.id;
        const targetId =
          propStoreSlug ||
          propStoreId ||
          idDaLoja ||
          lojaAtual?.slug ||
          lojaAtual?.id ||
          params?.id;

        if (
          !isPortalHome &&
          targetId &&
          targetId !== "undefined" &&
          targetId !== "null" &&
          targetId !== "topfood" &&
          !["admin", "painel", "superadmin", "super-admin", "api", "health", "portal", "topfood"].includes(targetId.toLowerCase())
        ) {
          // Se o usuário clicar em "Instalar" DENTRO de uma loja específica:
          // salva o ID/slug dessa loja no localStorage
          console.log("[Top Food] Salvando loja_salva no localStorage:", targetId);
          localStorage.setItem("loja_salva", targetId);
          localStorage.setItem("topfood_last_store_slug", targetId);
          localStorage.setItem("topfood_saved_store_route", `/loja/${targetId}`);
          sessionStorage.removeItem("topfood_explicit_portal_nav");
        } else if (isPortalHome) {
          // Se o usuário clicar em "Instalar" na TELA INICIAL (Home do Top Food):
          // limpe qualquer loja salva
          console.log("[Top Food] Limpando loja_salva no localStorage (tela inicial)");
          localStorage.setItem("loja_salva", "");
          localStorage.removeItem("topfood_saved_store_route");
          localStorage.removeItem("topfood_last_store_slug");
        }
      } catch (err) {
        console.warn("Erro ao salvar loja_salva no localStorage:", err);
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

    // Dispara o download imediato do arquivo único /top-food.apk
    if (e) {
      e.preventDefault();
    }
    triggerApkDownload(APK_HREF, APK_DOWNLOAD_NAME);
  };

  return (
    <>
      {/* 1. Botão de Cabeçalho / Navbar */}
      {variant === "header" && (
        <a
          id="btn-pwa-install-header"
          href={APK_HREF}
          download={APK_DOWNLOAD_NAME}
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
              href={APK_HREF}
              download={APK_DOWNLOAD_NAME}
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
                  href={APK_HREF}
                  download={APK_DOWNLOAD_NAME}
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>
                    {isPrompting ? "Baixando..." : "Baixar top-food.apk"}
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
                        href={APK_HREF}
                        download={APK_DOWNLOAD_NAME}
                        onClick={handleInstallClick}
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
