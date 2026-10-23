import React, { useState, useEffect } from "react";
import {
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle,
  Smartphone,
  MoreVertical,
  Laptop,
  Apple,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallButtonProps {
  className?: string;
  variant?: "header" | "floating" | "banner";
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = "",
  variant = "header",
  label,
}) => {
  const {
    deferredPrompt,
    setDeferredPrompt,
    isInstalled,
    setIsInstalled,
    isIOS,
    isAndroid,
    isXiaomi,
    isDesktop,
  } = usePWAInstall();

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">("android");
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

  // 1. Tenta acionar primeiramente o evento nativo beforeinstallprompt
  // 2. Se o navegador bloquear ou não suportar (Mi Browser, Safari, embedded webviews), abre o modal com instruções precisas
  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const promptEvent =
      deferredPrompt ||
      (typeof window !== "undefined" ? window.__pwaInstallPrompt : null);

    if (promptEvent && typeof promptEvent.prompt === "function") {
      try {
        setIsPrompting(true);
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === "accepted") {
          setIsInstalled(true);
          setShowModal(false);
        }
        setDeferredPrompt(null);
        if (typeof window !== "undefined") {
          window.__pwaInstallPrompt = null;
        }
        setIsPrompting(false);
        return;
      } catch (err) {
        console.warn("Instalação automática nativa não permitida ou bloqueada:", err);
        setIsPrompting(false);
      }
    }

    // Fallback inteligente: exibe o modal discreto centralizado com o passo a passo
    if (isIOS) {
      setActiveTab("ios");
    } else if (isAndroid || isXiaomi) {
      setActiveTab("android");
    } else {
      setActiveTab("desktop");
    }
    setShowModal(true);
  };

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
            <span>{isPrompting ? "Instalando..." : label}</span>
          ) : (
            <>
              <span className="hidden xs:inline">
                {isPrompting ? "Instalando..." : "Instalar App"}
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
                  Instale o Top Food no seu aparelho
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
              <span>{isPrompting ? "Instalando..." : "Instalar App"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Centralizado e Discreto com Instruções de Instalação */}
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
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Instalar Top Food
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Adicione o aplicativo à tela de início para acesso rápido e direto.
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
                <span>Android / Xiaomi</span>
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

            {/* Conteúdo: Android / Xiaomi (Chrome, Mi Browser, etc.) */}
            {activeTab === "android" && (
              <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    1
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Toque no menu do seu navegador:
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-0.5 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        <MoreVertical className="h-3 w-3 inline text-gray-700 dark:text-gray-300" /> 3 pontos (topo)
                      </span>
                      <span>ou</span>
                      <span className="inline-flex items-center gap-0.5 bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        3 traços no rodapé (Xiaomi/Mi Browser)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    2
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Procure e selecione a opção:
                    <div className="mt-1 font-bold text-primary dark:text-amber-400">
                      "Adicionar à tela de início" ou "Instalar aplicativo"
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    3
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Toque em <strong>Adicionar</strong> ou <strong>Instalar</strong>. Pronto! O ícone do Top Food estará na sua tela inicial.
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo: iPhone / iPad (Safari) */}
            {activeTab === "ios" && (
              <div className="space-y-3 bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    1
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    No Safari, toque no botão de{" "}
                    <strong className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-1">
                      <Share className="h-3.5 w-3.5 inline text-blue-500" /> Compartilhar
                    </strong>{" "}
                    na barra inferior do iPhone.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    2
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Role a lista de ações para baixo e toque em:
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
                    Toque em <strong>Adicionar</strong> no canto superior direito para confirmar.
                  </div>
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
                    Ou clique no menu do navegador <strong>(⋮ 3 pontos)</strong> &rarr; <strong>"Salvar e compartilhar"</strong> &rarr; <strong>"Instalar Top Food..."</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-xs">
                    3
                  </div>
                  <div className="pt-0.5 leading-relaxed">
                    Clique em <strong>Instalar</strong> para abrir em uma janela rápida sem barras de navegação.
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
