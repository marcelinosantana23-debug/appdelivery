import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  LogOut,
  Package,
  UtensilsCrossed,
  Settings,
  CornerUpLeft,
  Copy,
  CheckCircle2,
  Share2,
  Users,
  TrendingUp,
  QrCode,
  Store,
  Calendar,
  AlertTriangle,
  Send,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName, getSafeSlug } from "@/utils/storeFormat";
import { getOfficialStoreUrl, copyTextToClipboard } from "@/utils/url";
import { getSubscriptionInfo, generateProofWhatsAppUrl } from "@/utils/billing";
import { AdminLogin } from "./AdminLogin";
import { AdminOrders } from "./AdminOrders";
import { AdminCustomers } from "./AdminCustomers";
import { AdminMenu } from "./AdminMenu";
import { AdminSettings } from "./AdminSettings";
import { AdminFinancialReport } from "./AdminFinancialReport";
import { SuperAdminPanel } from "./SuperAdminPanel";
import { StoreQrCodePlate } from "./StoreQrCodePlate";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";
import type { Tenant } from "@/types";

interface AdminPanelProps {
  onExit: () => void;
  onGoToSuperAdmin?: () => void;
  onViewStoreFront?: (slug: string) => void;
  initialTab?: AdminTab;
}

type AdminTab = "orders" | "financial" | "customers" | "menu" | "qrcode" | "settings";

export function AdminPanel({ onExit, onGoToSuperAdmin, onViewStoreFront, initialTab }: AdminPanelProps) {
  const {
    isAdminAuthed,
    isSuperAdmin,
    currentUser,
    logout,
    isStoreOpen,
    toggleStore,
    orders,
    newOrderIds,
    config,
    currentTenant,
    selectTenant,
    tenants,
    soundEnabled,
    toggleSound,
    platformSettings,
    refreshOrders,
    refreshCurrentStore,
    showToast,
    refreshCategories,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab")?.toLowerCase();
      if (t === "financial" || t === "financeiro" || t === "faturamento") return "financial";
      if (t === "customers" || t === "clientes") return "customers";
      if (t === "menu" || t === "cardapio") return "menu";
      if (t === "qrcode" || t === "qr" || t === "placa") return "qrcode";
      if (t === "settings" || t === "config") return "settings";
    }
    return "orders";
  });

  const [financialKey, setFinancialKey] = useState<number>(1);
  const [superAdminViewingStore, setSuperAdminViewingStore] = useState<Tenant | null>(() => currentTenant || null);
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Sincroniza o tenant visualizado com o currentTenant do contexto
  useEffect(() => {
    if (currentTenant) {
      setSuperAdminViewingStore(currentTenant);
    }
  }, [currentTenant]);

  // Garante que o navegador exibe estritamente a URL /painel enquanto o lojista está no painel
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname.toLowerCase();
      if (!p.startsWith("/painel") && !p.startsWith("/admin")) {
        window.history.replaceState({ view: "admin", tab }, "", "/painel");
      }
    }
  }, [tab]);

  // Função disparada ao clicar no botão "Atualizar" no painel do lojista:
  // Reexecuta as funções de busca na API (pedidos, dados da loja) sem alterar a rota nem recarregar a página
  const handleRefreshPanelData = async () => {
    if (isRefreshingData) return;
    setIsRefreshingData(true);
    try {
      // 1. Assegura que o navegador mantém a URL do painel
      if (typeof window !== "undefined") {
        const p = window.location.pathname.toLowerCase();
        if (!p.startsWith("/painel") && !p.startsWith("/admin")) {
          window.history.replaceState({ view: "admin", tab }, "", "/painel");
        }
      }

      // 2. Busca dados frescos da API em paralelo sem qualquer redirecionamento
      await Promise.all([
        refreshOrders(),
        refreshCurrentStore ? refreshCurrentStore() : Promise.resolve(),
      ]);

      if (tab === "financial") {
        setFinancialKey((k) => k + 1);
      } else if (tab === "menu") {
        await refreshCategories();
      }

      showToast("Pedidos e dados atualizados com sucesso!", "success");
    } catch (err) {
      console.warn("Erro ao atualizar dados do painel:", err);
      showToast("Erro ao sincronizar dados. Tente novamente.", "error");
    } finally {
      setTimeout(() => setIsRefreshingData(false), 300);
    }
  };

  // Informações de Mensalidade e Vencimento Recorrente
  const merchantTenant = superAdminViewingStore || currentTenant;
  const subInfo = merchantTenant ? getSubscriptionInfo(merchantTenant) : null;
  const adminPixKey = platformSettings?.adminPixKey || "topfood.financeiro@pix.com";
  const adminWhatsApp = platformSettings?.adminWhatsapp || "5511999999999";

  const handleCopyPix = async () => {
    const success = await copyTextToClipboard(adminPixKey);
    if (success) {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const proofWhatsAppUrl = merchantTenant
    ? generateProofWhatsAppUrl({
        adminWhatsapp: adminWhatsApp,
        adminPixKey: adminPixKey,
        tenantName: merchantTenant.name,
        tenantSlug: merchantTenant.slug,
        billingDay: subInfo?.billingDay || 10,
        monthlyFee: subInfo?.monthlyFee || 49.9,
      })
    : "#";

  const handleTabChange = (newTab: AdminTab) => {
    setTab(newTab);
    if (newTab === "financial") {
      setFinancialKey((k) => k + 1);
    }
  };

  // Enforce that a store admin only manages their own store
  useEffect(() => {
    if (currentUser?.role === "tenant_admin" && currentUser.tenantId) {
      if (!currentTenant || currentTenant.id !== currentUser.tenantId) {
        const myTenant = tenants.find((t) => t.id === currentUser.tenantId);
        if (myTenant) {
          selectTenant(myTenant.slug);
        }
      }
    }
  }, [currentUser, currentTenant, tenants, selectTenant]);

  const activeOrders = orders.filter(
    (o) => o.status !== "done" && o.status !== "cancelled"
  ).length;

  // Web Audio chime nítido e exclusivo para notificação de novos pedidos no painel do lojista
  const playNotificationSound = useCallback(() => {
    // Verificação estrita: o som de novos pedidos SÓ SEJA REPRODUZIDO se a rota for o Painel do Lojista
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      if (!path.includes("/admin") && !path.includes("/painel")) {
        return;
      }
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // Toque harmônico e expressivo: 3 tons ascendentes nítidos (A5 -> C#6 -> E6)
      const notes = [
        { freq: 880, start: 0.0, duration: 0.22, gain: 0.4 },
        { freq: 1108.73, start: 0.16, duration: 0.25, gain: 0.45 },
        { freq: 1318.51, start: 0.34, duration: 0.45, gain: 0.5 },
      ];

      notes.forEach(({ freq, start, duration, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        gainNode.gain.setValueAtTime(0.001, now + start);
        gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    } catch {
      // Audio não disponível ou bloqueado pelo navegador
    }
  }, []);

  // Evita disparar múltiplos alertas no mesmo instante (throttle de 2 segundos)
  const lastSoundTimeRef = useRef<number>(0);
  const triggerNotificationSound = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundTimeRef.current < 2000) return;
    lastSoundTimeRef.current = now;
    playNotificationSound();
  }, [playNotificationSound]);

  // Conjunto de IDs de pedidos já conhecidos pelo painel para não tocar som indevidamente na carga inicial
  const knownAdminOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialAdminMountRef = useRef<boolean>(true);
  const ordersRef = useRef(orders);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Inicializa o conjunto de IDs conhecidos com os pedidos atuais
  useEffect(() => {
    if (orders.length > 0 && isInitialAdminMountRef.current) {
      orders.forEach((o) => {
        if (o.id) {
          knownAdminOrderIdsRef.current.add(o.id);
          knownAdminOrderIdsRef.current.add(o.id.replace(/^#/, ""));
        }
      });
      isInitialAdminMountRef.current = false;
    }
  }, [orders]);

  // INTERVALO DE 5 SEGUNDOS (5000ms):
  // Restrito EXCLUSIVAMENTE ao painel do lojista (AdminPanel.tsx) para buscar novos pedidos
  // e tocar o som de notificação quando detectado novo pedido.
  // Limpa o setInterval (clearInterval) ao sair da tela do lojista.
  useEffect(() => {
    if (!isAdminAuthed) return;

    // Garante que os pedidos já existentes estão registrados antes de iniciar o polling
    ordersRef.current.forEach((o) => {
      if (o.id) {
        knownAdminOrderIdsRef.current.add(o.id);
        knownAdminOrderIdsRef.current.add(o.id.replace(/^#/, ""));
      }
    });

    let isMounted = true;

    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const freshOrders = await refreshOrders();
        if (!isMounted || !freshOrders || !Array.isArray(freshOrders)) return;

        // Detecta se há algum pedido verdadeiramente novo que não existia no painel
        const hasNewOrder = freshOrders.some((o) => {
          if (!o.id) return false;
          const cleanId = o.id.replace(/^#/, "");
          return !knownAdminOrderIdsRef.current.has(o.id) && !knownAdminOrderIdsRef.current.has(cleanId);
        });

        if (hasNewOrder && soundEnabled) {
          triggerNotificationSound();
        }

        freshOrders.forEach((o) => {
          if (o.id) {
            knownAdminOrderIdsRef.current.add(o.id);
            knownAdminOrderIdsRef.current.add(o.id.replace(/^#/, ""));
          }
        });
      } catch {
        // Falha temporária de conexão ignorada silenciosamente
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isAdminAuthed, refreshOrders, soundEnabled, triggerNotificationSound]);

  // Sincronização em tempo real (SSE / Broadcast): se a lista `orders` receber um novo pedido no painel
  useEffect(() => {
    if (!isAdminAuthed || isInitialAdminMountRef.current) return;

    const hasNewOrder = orders.some((o) => {
      if (!o.id) return false;
      const cleanId = o.id.replace(/^#/, "");
      return !knownAdminOrderIdsRef.current.has(o.id) && !knownAdminOrderIdsRef.current.has(cleanId);
    });

    if (hasNewOrder && soundEnabled) {
      triggerNotificationSound();
    }

    orders.forEach((o) => {
      if (o.id) {
        knownAdminOrderIdsRef.current.add(o.id);
        knownAdminOrderIdsRef.current.add(o.id.replace(/^#/, ""));
      }
    });
  }, [orders, soundEnabled, isAdminAuthed, triggerNotificationSound]);

  if (!isAdminAuthed) {
    return <AdminLogin onBack={onExit} />;
  }

  // If user is Super Admin and has not selected any store at all, fallback to Super Admin Dashboard
  if (isSuperAdmin && !merchantTenant) {
    return (
      <SuperAdminPanel
        onManageStore={async (tenant) => {
          await selectTenant(tenant.slug, tenant);
          setSuperAdminViewingStore(tenant);
        }}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full max-w-full overflow-x-hidden bg-slate-900 text-slate-100">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 gap-2.5 sm:gap-3 w-full shrink-0">
        {/* Left: Voltar + Botão Ver Vitrine + Logo + Nome da Loja + Link */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
          {/* Seta Voltar (navegação para o portal / tela anterior) */}
          <button
            onClick={onExit}
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            title="Voltar para o portal"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Botão Ver Vitrine da Loja (navegação interna na mesma aba) */}
          <button
            type="button"
            onClick={() => {
              const cleanSlug = getSafeSlug(config.slug, "loja");
              selectTenant(cleanSlug);
              if (onViewStoreFront) {
                onViewStoreFront(cleanSlug);
              } else if (typeof window !== "undefined") {
                // Atualiza o histórico HTML5 e carrega na mesma aba
                window.history.pushState({ view: "menu", slug: cleanSlug }, "", `/loja/${cleanSlug}`);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }
            }}
            className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-emerald-500/15 border border-amber-500/30 hover:border-amber-400 hover:bg-slate-800 text-amber-300 hover:text-amber-200 px-2 sm:px-2.5 text-xs font-semibold shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
            title="Ver a vitrine pública da loja"
          >
            <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">Ver Vitrine</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-slate-700 text-base sm:text-xl shadow-inner">
              <StoreLogo logo={config.logo} name={config.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-white leading-tight break-words">
                  {getSafeDisplayName(config.name, "Minha Lanchonete")}
                </h1>
                <span className="hidden sm:inline-block rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 border border-slate-700 shrink-0">
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <button
                  type="button"
                  onClick={async () => {
                    const storeUrl = getOfficialStoreUrl(config.slug);
                    const success = await copyTextToClipboard(storeUrl);
                    if (success) {
                      setCopiedStoreLink(true);
                      setTimeout(() => setCopiedStoreLink(false), 2500);
                    }
                  }}
                  className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] text-amber-400 hover:text-amber-300 transition shrink-0"
                  title="Clique para copiar o link oficial do cardápio"
                >
                  {copiedStoreLink ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3 w-3" />
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">/loja/{getSafeSlug(config.slug, "loja")}</span>
                      <Copy className="h-3 w-3 text-slate-400 ml-0.5 hidden sm:inline" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Status "Loja Aberta" + Ponto Verde + Sininho + Recarga Redonda + Sair */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">
          {/* Botão Atualizar compacto (apenas ícone redondo sem texto) */}
          <GlobalReloadButton
            variant="dark"
            showLabel={false}
            title="Atualizar pedidos e dados (permanece no painel)"
            onReload={handleRefreshPanelData}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
          />

          {/* Status "Loja Aberta" com ponto verde */}
          <button
            id="admin-header-store-status-btn"
            type="button"
            onClick={toggleStore}
            className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold transition shrink-0 border ${
              isStoreOpen
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
            title={isStoreOpen ? "Loja aberta para pedidos (clique para fechar)" : "Loja fechada (clique para abrir)"}
          >
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                isStoreOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="whitespace-nowrap">{isStoreOpen ? "Loja Aberta" : "Loja Fechada"}</span>
          </button>

          {/* Sininho (Som) */}
          <button
            id="admin-header-sound-btn"
            type="button"
            onClick={() => {
              toggleSound();
              if (!soundEnabled) {
                triggerNotificationSound();
              }
            }}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition shrink-0 ${
              soundEnabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
            }`}
            title={soundEnabled ? "Som de novos pedidos ativado (clique para silenciar)" : "Som desativado (clique para ativar)"}
          >
            {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>

          {/* Voltar ao Super Admin (se aplicável) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setSuperAdminViewingStore(null);
                if (onGoToSuperAdmin) {
                  onGoToSuperAdmin();
                } else {
                  onExit();
                }
              }}
              className="hidden sm:flex items-center gap-1 rounded-xl bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition shrink-0"
              title="Voltar ao Super Admin"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
              <span>Super Admin</span>
            </button>
          )}

          {/* Sair */}
          <button
            id="admin-header-logout-btn"
            type="button"
            onClick={() => {
              logout();
              setSuperAdminViewingStore(null);
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-red-500/20 hover:text-red-400 shrink-0"
            title="Sair da conta"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Barra de navegação horizontal no topo (logo abaixo do cabeçalho) */}
      <nav
        id="store-admin-tabs-nav"
        aria-label="Navegação da loja"
        className="shrink-0 border-b border-slate-800 bg-slate-900 w-full z-20"
      >
        <div className="flex flex-row items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 w-full overflow-x-auto scrollbar-none whitespace-nowrap">
          <TabButton
            id="tab-btn-orders"
            active={tab === "orders"}
            onClick={() => handleTabChange("orders")}
            icon={<Package className="h-4 w-4" />}
          >
            Pedidos
            {activeOrders > 0 && (
              <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {activeOrders}
              </span>
            )}
          </TabButton>
          <TabButton
            id="tab-btn-financial"
            active={tab === "financial"}
            onClick={() => handleTabChange("financial")}
            icon={<TrendingUp className={`h-4 w-4 ${tab === "financial" ? "text-amber-400" : "text-emerald-400"}`} />}
          >
            Financeiro
          </TabButton>
          <TabButton
            id="tab-btn-customers"
            active={tab === "customers"}
            onClick={() => handleTabChange("customers")}
            icon={<Users className="h-4 w-4" />}
          >
            Clientes
          </TabButton>
          <TabButton
            id="tab-btn-menu"
            active={tab === "menu"}
            onClick={() => handleTabChange("menu")}
            icon={<UtensilsCrossed className="h-4 w-4" />}
          >
            Cardápio
          </TabButton>
          <TabButton
            id="tab-btn-qrcode"
            active={tab === "qrcode"}
            onClick={() => handleTabChange("qrcode")}
            icon={<QrCode className="h-4 w-4 text-amber-400" />}
          >
            QR Code & Placa
          </TabButton>
          <TabButton
            id="tab-btn-settings"
            active={tab === "settings"}
            onClick={() => handleTabChange("settings")}
            icon={<Settings className="h-4 w-4" />}
          >
            Configurações
          </TabButton>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 text-slate-900 w-full max-w-full overflow-x-hidden flex flex-col">
        {/* Topo do Painel do Lojista: Mensagem Dinâmica de Mensalidade */}
        {subInfo && (
          <div>
            {subInfo.status === "demo" || subInfo.status === "cancelled" ? (
              <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-bold">
                    {subInfo.status === "cancelled"
                      ? "Assinatura Cancelada / Modo Demonstração"
                      : "Modo Demonstração / Aguardando Ativação"}
                  </span>
                  <span className="hidden sm:inline text-amber-800">
                    • Seu cardápio e pedidos continuam funcionando em modo demonstração.
                  </span>
                </div>
                <span className="text-[11px] font-semibold bg-amber-200/80 border border-amber-300 text-amber-950 px-2.5 py-0.5 rounded-full shrink-0">
                  {subInfo.status === "cancelled" ? "Assinatura Cancelada" : "Aguardando Ativação"}
                </span>
              </div>
            ) : (
              <div
                className={`border-b px-4 py-2 flex items-center justify-between gap-3 text-xs ${
                  subInfo.isOverdue
                    ? "bg-red-50 border-red-200 text-red-900"
                    : subInfo.isDueSoon
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar
                    className={`h-3.5 w-3.5 shrink-0 ${
                      subInfo.isOverdue
                        ? "text-red-600"
                        : subInfo.isDueSoon
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  />
                  <span className="font-medium">
                    {subInfo.isOverdue || subInfo.isDueSoon ? (
                      <>
                        Sua mensalidade vence todo dia{" "}
                        <strong className="font-black text-slate-900">{subInfo.billingDay}</strong> •{" "}
                        <strong
                          className={
                            subInfo.isOverdue
                              ? "text-red-700 font-bold"
                              : subInfo.isDueToday
                              ? "text-amber-700 font-bold"
                              : "text-amber-800 font-bold"
                          }
                        >
                          {subInfo.isOverdue
                            ? `Vencida há ${Math.abs(subInfo.daysRemaining || 0)} dias`
                            : subInfo.isDueToday
                            ? "Vence hoje!"
                            : `Faltam ${subInfo.daysRemaining} dias`}
                        </strong>
                      </>
                    ) : (
                      <>
                        Plano Ativo • Vence todo dia{" "}
                        <strong className="font-black text-slate-900">{subInfo.billingDay}</strong> •{" "}
                        Próximo vencimento:{" "}
                        <strong className="text-slate-900 font-bold">{subInfo.dueDateFormatted}</strong>{" "}
                        (Faltam {subInfo.daysRemaining} dias)
                      </>
                    )}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    subInfo.isOverdue
                      ? "bg-red-100 border-red-300 text-red-800"
                      : subInfo.isDueToday
                      ? "bg-amber-100 border-amber-300 text-amber-800 animate-pulse"
                      : subInfo.isDueSoon
                      ? "bg-amber-100 border-amber-300 text-amber-800"
                      : "bg-emerald-100 border-emerald-300 text-emerald-800"
                  }`}
                >
                  {subInfo.isOverdue
                    ? "Vencida"
                    : subInfo.isDueToday
                    ? "Vence Hoje"
                    : subInfo.isDueSoon
                    ? `Faltam ${subInfo.daysRemaining}d`
                    : "Plano Ativo"}
                </span>
              </div>
            )}

            {/* Card com Chave PIX e WhatsApp se faltar <= 5 dias ou estiver vencido */}
            {subInfo.status !== "demo" && subInfo.status !== "cancelled" && (subInfo.isDueSoon || subInfo.isOverdue) && (
              <div
                className={`mx-3 sm:mx-6 mt-3 sm:mt-4 p-4 rounded-2xl border shadow-sm ${
                  subInfo.isOverdue
                    ? "bg-red-50 border-red-200 text-red-950"
                    : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        subInfo.isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base">
                          {subInfo.isOverdue
                            ? `Atenção: Sua mensalidade venceu no dia ${subInfo.billingDay}`
                            : subInfo.isDueToday
                            ? `Lembrete: Sua mensalidade vence hoje (dia ${subInfo.billingDay})`
                            : `Lembrete: Sua mensalidade vence em ${subInfo.daysRemaining} dias (todo dia ${subInfo.billingDay})`}
                        </h4>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                            subInfo.isOverdue
                              ? "bg-red-200 border-red-300 text-red-950 font-mono"
                              : "bg-amber-200 border-amber-300 text-amber-950 font-mono"
                          }`}
                        >
                          Valor da Mensalidade: R$ {(subInfo.monthlyFee || 49.9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {subInfo.isOverdue
                          ? "Para manter sua loja online e ativa na rede sem interrupções, realize o pagamento via PIX e envie o comprovante para o nosso WhatsApp."
                          : "Garanta a continuidade das suas vendas online sem interrupção. Copie a chave PIX abaixo e envie o comprovante pelo WhatsApp."}
                      </p>
                    </div>
                  </div>

                  {/* Chave PIX e Botão WhatsApp */}
                  <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 shrink-0 self-start md:self-center">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs shadow-inner min-w-0">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        PIX:
                      </span>
                      <span
                        className="font-mono text-slate-800 font-semibold truncate select-all"
                        title={adminPixKey}
                      >
                        {adminPixKey}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-semibold transition shrink-0 border border-slate-200"
                        title="Copiar Chave Pix"
                      >
                        {copiedPix ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Chave Pix Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                            <span>Copiar Chave Pix</span>
                          </>
                        )}
                      </button>
                    </div>

                    <a
                      href={proofWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap active:scale-[0.98]"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Enviar Comprovante no WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <ErrorBoundary fallbackTitle="Erro ao carregar conteúdo da aba">
          {tab === "orders" && <AdminOrders newOrderIds={newOrderIds} />}
          {tab === "financial" && <AdminFinancialReport key={financialKey} />}
          {tab === "customers" && <AdminCustomers />}
          {tab === "menu" && <AdminMenu />}
          {tab === "qrcode" && <StoreQrCodePlate />}
          {tab === "settings" && <AdminSettings />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function TabButton({
  id,
  active,
  onClick,
  icon,
  children,
}: {
  id?: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`flex flex-row items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 border ${
        active
          ? "border-amber-500/50 bg-amber-500/15 text-amber-400 shadow-sm"
          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap flex items-center gap-1.5">{children}</span>
    </button>
  );
}
