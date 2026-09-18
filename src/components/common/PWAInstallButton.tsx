import React, { useState } from "react";
import {
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle,
  Smartphone,
  MoreVertical,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallButtonProps {
  className?: string;
  variant?: "header" | "floating" | "banner";
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = "",
  variant = "header",
}) => {
  const {
    deferredPrompt,
    setDeferredPrompt,
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
  } = usePWAInstall();

  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  // Se já estiver rodando em modo standalone (app instalado), não renderiza
  if (isInstalled) {
    return null;
  }

  // Renderiza se for instalável ou dispositivo móvel (Android / iOS)
  const shouldRender = isInstallable || isAndroid || isIOS;
  if (!shouldRender) {
    return null;
  }

  // 1. Tenta a instalação automática de 1 clique PRIMEIRO
  // 2. Fallback inteligente para tutorial de 2 passos apenas se o navegador bloquear o evento
  const handleInstallClick = async () => {
    const promptEvent =
      deferredPrompt ||
      (typeof window !== "undefined" ? window.__pwaInstallPrompt : null);

    if (promptEvent) {
      try {
        setIsPrompting(true);
        // Chama IMEDIATAMENTE o prompt nativo do navegador
        await promptEvent.prompt();
        // Aguarda a resposta do usuário
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === "accepted") {
          console.log("Usuário aceitou a instalação");
        }
        setDeferredPrompt(null);
        if (typeof window !== "undefined") {
          window.__pwaInstallPrompt = null;
        }
        setIsPrompting(false);
        // Finaliza o processo sem exibir nenhum tutorial ou instrução manual
        return;
      } catch (err) {
        console.warn("Erro ao acionar prompt automático de instalação:", err);
        setIsPrompting(false);
      }
    }

    // Fallback: somente se o deferredPrompt não estiver disponível (ex: Safari iOS, Xiaomi com restrição ou navegadores sem suporte ao evento)
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowAndroidModal(true);
    }
  };

  return (
    <>
      {variant === "header" && (
        <button
          onClick={handleInstallClick}
          disabled={isPrompting}
          className={`flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-3 py-1.5 text-xs font-bold transition shadow-sm border border-white/25 active:scale-95 cursor-pointer disabled:opacity-75 ${className}`}
          title="Instalar Top Food no seu dispositivo"
        >
          <Download className="h-3.5 w-3.5 text-amber-300" />
          <span>{isPrompting ? "Instalando..." : "Instalar App"}</span>
        </button>
      )}

      {variant === "banner" && (
        <div
          className={`rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5 shadow-sm ${className}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">
                  Instale o Top Food no celular
                </h4>
                <p className="text-[11px] text-gray-500">
                  Acesse em tela cheia com 1 toque, sem barra de navegação e muito mais rápido!
                </p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              disabled={isPrompting}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white px-3.5 py-2 text-xs font-bold shadow transition active:scale-95 cursor-pointer disabled:opacity-75"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isPrompting ? "Instalando..." : "Instalar"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Fallback inteligente Android: Modal simplificado de 2 passos */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-slate-900">
            <button
              onClick={() => setShowAndroidModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-primary mb-4">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>

            <h3 className="text-center text-lg font-black text-gray-900">
              Instalar Top Food
            </h3>
            <p className="mt-1 text-center text-xs text-gray-500">
              Adicione o aplicativo à tela inicial em 2 passos:
            </p>

            <div className="mt-5 space-y-3.5 text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {/* Passo 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-sm">
                  1
                </div>
                <div className="pt-0.5">
                  No navegador, toque no menu{" "}
                  <strong className="font-semibold text-gray-900 inline-flex items-center gap-0.5">
                    <MoreVertical className="h-3.5 w-3.5 inline text-gray-700" /> (3 pontos)
                  </strong>{" "}
                  no canto superior.
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-sm">
                  2
                </div>
                <div className="pt-0.5">
                  Toque em{" "}
                  <strong className="font-semibold text-gray-900 inline-flex items-center gap-1">
                    <Download className="h-3 w-3 inline text-primary" /> Instalar aplicativo
                  </strong>{" "}
                  (ou <em>"Adicionar à tela inicial"</em>) e confirme.
                </div>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setShowAndroidModal(false)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow hover:bg-primary-dark transition cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Entendi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback inteligente iOS / Safari: Modal simplificado de 2 passos */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-slate-900">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-primary mb-4">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>

            <h3 className="text-center text-lg font-black text-gray-900">
              Instalar no iPhone
            </h3>
            <p className="mt-1 text-center text-xs text-gray-500">
              Adicione o aplicativo à tela de início em 2 passos:
            </p>

            <div className="mt-5 space-y-3.5 text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {/* Passo 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-sm">
                  1
                </div>
                <div className="pt-0.5">
                  No Safari, toque no botão{" "}
                  <strong className="font-semibold text-gray-900 inline-flex items-center gap-1">
                    <Share className="h-3 w-3 inline text-blue-600" /> Compartilhar
                  </strong>{" "}
                  na barra inferior.
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-xs shadow-sm">
                  2
                </div>
                <div className="pt-0.5">
                  Role e toque em{" "}
                  <strong className="font-semibold text-gray-900 inline-flex items-center gap-1">
                    <PlusSquare className="h-3 w-3 inline text-slate-700" /> Adicionar à Tela de Início
                  </strong>{" "}
                  e confirme.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow hover:bg-primary-dark transition cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Entendi</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
