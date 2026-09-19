import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  LogOut,
  Package,
  UtensilsCrossed,
  Settings,
  Shield,
  CornerUpLeft,
  Copy,
  CheckCircle2,
  Share2,
  Users,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName, getSafeSlug } from "@/utils/storeFormat";
import { getOfficialStoreUrl, copyTextToClipboard } from "@/utils/url";
import { AdminLogin } from "./AdminLogin";
import { AdminOrders } from "./AdminOrders";
import { AdminCustomers } from "./AdminCustomers";
import { AdminMenu } from "./AdminMenu";
import { AdminSettings } from "./AdminSettings";
import { AdminFinancialReport } from "./AdminFinancialReport";
import { SuperAdminPanel } from "./SuperAdminPanel";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import type { Tenant } from "@/types";

interface AdminPanelProps {
  onExit: () => void;
  onGoToSuperAdmin?: () => void;
  initialTab?: AdminTab;
}

type AdminTab = "orders" | "financial" | "customers" | "menu" | "settings";

export function AdminPanel({ onExit, onGoToSuperAdmin, initialTab }: AdminPanelProps) {
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
    playAlertSound,
  } = useStore();

  const [tab, setTab] = useState<AdminTab>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab")?.toLowerCase();
      if (t === "financial" || t === "financeiro" || t === "faturamento") return "financial";
      if (t === "customers" || t === "clientes") return "customers";
      if (t === "menu" || t === "cardapio") return "menu";
      if (t === "settings" || t === "config") return "settings";
    }
    return "orders";
  });

  const [financialKey, setFinancialKey] = useState<number>(1);
  const [superAdminViewingStore, setSuperAdminViewingStore] = useState<Tenant | null>(null);
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);
  const lastOrderCount = useRef(orders.length);

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

  useEffect(() => {
    if (orders.length > lastOrderCount.current && soundEnabled) {
      playNotificationSound();
    }
    lastOrderCount.current = orders.length;
  }, [orders.length, soundEnabled]);

  const playNotificationSound = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const notes = [880, 1100, 880, 1100];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const start = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.13);
        osc.start(start);
        osc.stop(start + 0.15);
      });
    } catch {
      // Audio not available
    }
  };

  if (!isAdminAuthed) {
    return <AdminLogin onBack={onExit} />;
  }

  // If user is Super Admin and has not drilled down into an individual store, show the Super Admin Dashboard
  if (isSuperAdmin && !superAdminViewingStore) {
    return (
      <SuperAdminPanel
        onManageStore={(tenant) => {
          selectTenant(tenant.slug);
          setSuperAdminViewingStore(tenant);
        }}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full max-w-full overflow-x-hidden bg-slate-900 text-slate-100">
      {/* Super Admin breadcrumb banner if drilling down */}
      {isSuperAdmin && superAdminViewingStore && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 sm:px-4 py-2 text-xs w-full max-w-full overflow-x-hidden">
          <div className="flex items-center gap-2 text-amber-300 min-w-0">
            <Shield className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="truncate">
              Você está gerenciando a lanchonete:{" "}
              <strong className="text-white font-bold">{currentTenant?.name || superAdminViewingStore.name}</strong>{" "}
              <span className="hidden sm:inline">(/loja/{currentTenant?.slug || superAdminViewingStore.slug})</span>
            </span>
          </div>
          <button
            onClick={() => {
              if (onGoToSuperAdmin) {
                onGoToSuperAdmin();
              } else {
                setSuperAdminViewingStore(null);
              }
            }}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 transition text-xs shrink-0 self-end sm:self-auto"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Super Admin</span>
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-800 bg-slate-900 px-3 sm:px-4 py-2 sm:py-3 gap-2.5 sm:gap-3 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onExit}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition hover:bg-slate-700"
              title="Voltar para a vitrine"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-slate-700 text-base sm:text-xl shadow-inner">
                <StoreLogo logo={config.logo} name={config.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-xs sm:text-sm md:text-base font-bold text-white leading-tight truncate max-w-[130px] sm:max-w-none">
                    {getSafeDisplayName(config.name, "Minha Lanchonete")}
                  </h1>
                  <span className="rounded-full bg-slate-800 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-400 border border-slate-700 shrink-0">
                    {isSuperAdmin ? "Super Admin" : "Admin"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                        <span className="truncate max-w-[100px] sm:max-w-none">/loja/{getSafeSlug(config.slug, "loja")}</span>
                        <Copy className="h-3 w-3 text-slate-400 ml-0.5 hidden sm:inline" />
                      </>
                    )}
                  </button>
                  <span className="text-slate-600 hidden sm:inline">•</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[110px] sm:max-w-[180px]">
                    {currentUser?.email}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:hidden">
            <button
              onClick={() => {
                toggleSound();
                if (!soundEnabled) {
                  playAlertSound();
                }
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                soundEnabled
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-slate-800 text-slate-500"
              }`}
              title={soundEnabled ? "Som ativado" : "Som desativado"}
            >
              {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                logout();
                setSuperAdminViewingStore(null);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-red-400"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Ao vivo (3s)</span>
          </div>

          <button
            id="admin-header-financial-btn"
            onClick={() => handleTabChange("financial")}
            className={`hidden md:flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              tab === "financial"
                ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
            title="Acessar Relatório de Faturamento e Métricas Financeiras"
          >
            <TrendingUp className={`h-4 w-4 ${tab === "financial" ? "text-slate-950" : "text-emerald-400"}`} />
            <span>Financeiro</span>
          </button>

          <button
            onClick={() => {
              toggleSound();
              if (!soundEnabled) {
                playAlertSound();
              }
            }}
            className={`hidden sm:flex h-9 items-center gap-1.5 px-2.5 rounded-xl transition ${
              soundEnabled
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
            }`}
            title={soundEnabled ? "Som de novos pedidos ativado (clique para silenciar)" : "Som desativado (clique para ativar)"}
          >
            {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            <span className="text-xs font-semibold hidden md:inline">
              {soundEnabled ? "Som ativo" : "Silenciado"}
            </span>
          </button>

          <button
            onClick={toggleStore}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold transition ${
              isStoreOpen
                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isStoreOpen ? "bg-white animate-pulse" : "bg-slate-500"
              }`}
            />
            {isStoreOpen ? "Loja Aberta" : "Loja Fechada"}
          </button>

          <button
            onClick={() => {
              logout();
              setSuperAdminViewingStore(null);
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-red-500/20 hover:text-red-400"
            title="Sair da conta"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row border-b border-slate-800 bg-slate-900 w-full max-w-full overflow-x-hidden shrink-0 divide-y divide-slate-800/40 sm:divide-y-0">
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
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
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
          id="tab-btn-settings"
          active={tab === "settings"}
          onClick={() => handleTabChange("settings")}
          icon={<Settings className="h-4 w-4" />}
        >
          Configurações
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 text-slate-900 w-full max-w-full overflow-x-hidden flex flex-col">
        <ErrorBoundary fallbackTitle="Erro ao carregar conteúdo da aba">
          {tab === "orders" && <AdminOrders newOrderIds={newOrderIds} />}
          {tab === "financial" && <AdminFinancialReport key={financialKey} />}
          {tab === "customers" && <AdminCustomers />}
          {tab === "menu" && <AdminMenu />}
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
      onClick={onClick}
      className={`flex flex-row items-center justify-start sm:justify-center gap-2.5 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition w-full sm:flex-1 max-w-full overflow-x-hidden border-l-4 sm:border-l-0 sm:border-b-2 ${
        active
          ? "border-amber-500 text-white bg-slate-800/80 sm:bg-slate-800/50"
          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate flex items-center gap-1.5">{children}</span>
    </button>
  );
}
