import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bell, BellOff, LogOut, Package, UtensilsCrossed, Settings } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { AdminLogin } from "./AdminLogin";
import { AdminOrders } from "./AdminOrders";
import { AdminMenu } from "./AdminMenu";
import { AdminSettings } from "./AdminSettings";

interface AdminPanelProps {
  onExit: () => void;
}

type AdminTab = "orders" | "menu" | "settings";

export function AdminPanel({ onExit }: AdminPanelProps) {
  const { isAdminAuthed, logout, isStoreOpen, toggleStore, orders, newOrderIds, config } = useStore();
  const [tab, setTab] = useState<AdminTab>("orders");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastOrderCount = useRef(orders.length);

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
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.logo}</span>
            <h1 className="text-base font-bold text-white">Painel Administrativo</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              soundEnabled ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"
            }`}
            title={soundEnabled ? "Som ativo" : "Som mudo"}
          >
            {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleStore}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
              isStoreOpen
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isStoreOpen ? "bg-white animate-pulse" : "bg-gray-400"}`} />
            {isStoreOpen ? "Aberta" : "Fechada"}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-red-500/20 hover:text-red-400"
            title="Sair do painel"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")} icon={<Package className="h-4 w-4" />}>
          Pedidos
          {activeOrders > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-white">
              {activeOrders}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "menu"} onClick={() => setTab("menu")} icon={<UtensilsCrossed className="h-4 w-4" />}>
          Cardápio
        </TabButton>
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings className="h-4 w-4" />}>
          Configurações
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {tab === "orders" && <AdminOrders newOrderIds={newOrderIds} />}
        {tab === "menu" && <AdminMenu />}
        {tab === "settings" && <AdminSettings />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-bold transition ${
        active
          ? "border-b-2 border-primary text-white"
          : "text-gray-500 hover:text-gray-300"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
