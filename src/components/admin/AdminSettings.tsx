import { useState } from "react";
import { Save, Check, Palette, Store as StoreIcon, DollarSign, Clock, MapPin, QrCode, MessageCircle } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import type { PixKeyType } from "@/config/store";

const PRESET_COLORS = [
  { name: "Vermelho", primary: "#E63946", dark: "#C1121F", light: "#F77F00", accent: "#FCBF49" },
  { name: "Verde", primary: "#2A9D8F", dark: "#1B6B61", light: "#52B788", accent: "#95D5B2" },
  { name: "Azul", primary: "#0077B6", dark: "#005F8A", light: "#00B4D8", accent: "#90E0EF" },
  { name: "Laranja", primary: "#F77F00", dark: "#D66400", light: "#FCBF49", accent: "#EAE2B7" },
  { name: "Roxo", primary: "#7209B7", dark: "#560088", light: "#B5179E", accent: "#F72585" },
  { name: "Marrom", primary: "#7F5539", dark: "#5C3D24", light: "#B08968", accent: "#DDB892" },
  { name: "Rosa", primary: "#E63946", dark: "#B5174F", light: "#F72585", accent: "#FFB3C6" },
  { name: "Preto", primary: "#2B2D42", dark: "#1A1B2E", light: "#5C6378", accent: "#8D99AE" },
];

const PIX_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "phone", label: "Celular" },
  { value: "email", label: "E-mail" },
  { value: "random", label: "Aleatória" },
];

export function AdminSettings() {
  const { config, updateConfig, isStoreOpen, toggleStore, orders } = useStore();

  const [form, setForm] = useState({
    name: config.name,
    whatsapp: config.whatsapp,
    pixKey: config.pixKey,
    pixKeyType: config.pixKeyType,
    deliveryFee: config.deliveryFee.toString(),
    address: config.address,
    hours: config.hours,
    primaryColor: config.primaryColor,
    primaryDark: config.primaryDark,
    primaryLight: config.primaryLight,
    accentColor: config.accentColor,
  });
  const [saved, setSaved] = useState(false);

  const stats = {
    total: orders.length,
    active: orders.filter((o) => o.status !== "done" && o.status !== "cancelled").length,
    done: orders.filter((o) => o.status === "done").length,
    revenue: orders.filter((o) => o.status === "done").reduce((sum, o) => sum + o.total, 0),
  };

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    updateConfig({
      name: form.name.trim(),
      whatsapp: form.whatsapp.trim(),
      pixKey: form.pixKey.trim(),
      pixKeyType: form.pixKeyType,
      deliveryFee: parseFloat(form.deliveryFee) || 0,
      address: form.address.trim(),
      hours: form.hours.trim(),
      primaryColor: form.primaryColor,
      primaryDark: form.primaryDark,
      primaryLight: form.primaryLight,
      accentColor: form.accentColor,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const applyPreset = (preset: typeof PRESET_COLORS[0]) => {
    setForm((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      primaryDark: preset.dark,
      primaryLight: preset.light,
      accentColor: preset.accent,
    }));
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-5">
      {/* Store status toggle */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-700">Status da Loja</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {isStoreOpen ? "Recebendo pedidos normalmente" : "Clientes não podem finalizar pedidos"}
            </p>
          </div>
          <button
            onClick={toggleStore}
            className={`relative h-10 w-16 rounded-full transition-colors ${
              isStoreOpen ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform ${
                isStoreOpen ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-gray-700">Estatísticas</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total de pedidos" value={stats.total.toString()} />
          <StatCard label="Pedidos ativos" value={stats.active.toString()} />
          <StatCard label="Finalizados" value={stats.done.toString()} />
          <StatCard
            label="Faturamento"
            value={`${config.currency} ${stats.revenue.toFixed(2).replace(".", ",")}`}
          />
        </div>
      </div>

      {/* Editable store settings form */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <StoreIcon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-gray-700">Informações da Lanchonete</h2>
        </div>

        <div className="space-y-4">
          <FormField label="Nome da Lanchonete" icon={<StoreIcon className="h-4 w-4" />}>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="form-input"
              placeholder="Nome do estabelecimento"
            />
          </FormField>

          <FormField label="WhatsApp (com DDD, apenas números)" icon={<MessageCircle className="h-4 w-4" />}>
            <input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              className="form-input"
              placeholder="5511999999999"
            />
            <p className="mt-1 text-xs text-gray-400">Para onde os pedidos serão enviados.</p>
          </FormField>

          <FormField label="Chave PIX" icon={<QrCode className="h-4 w-4" />}>
            <div className="flex gap-2">
              <select
                value={form.pixKeyType}
                onChange={(e) => set("pixKeyType", e.target.value)}
                className="form-input w-32 shrink-0"
              >
                {PIX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                value={form.pixKey}
                onChange={(e) => set("pixKey", e.target.value)}
                className="form-input"
                placeholder="Chave PIX"
              />
            </div>
          </FormField>

          <FormField label="Taxa de Entrega (R$)" icon={<DollarSign className="h-4 w-4" />}>
            <input
              value={form.deliveryFee}
              onChange={(e) => set("deliveryFee", e.target.value)}
              className="form-input"
              type="number"
              step="0.50"
              placeholder="6.00"
            />
          </FormField>

          <FormField label="Endereço do Estabelecimento" icon={<MapPin className="h-4 w-4" />}>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="form-input"
              placeholder="Rua, número - bairro"
            />
          </FormField>

          <FormField label="Horário de Funcionamento" icon={<Clock className="h-4 w-4" />}>
            <input
              value={form.hours}
              onChange={(e) => set("hours", e.target.value)}
              className="form-input"
              placeholder="18:00 - 23:30"
            />
          </FormField>
        </div>
      </div>

      {/* Color customization */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-gray-700">Cores do Tema</h2>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs text-gray-400">Escolha um tema pronto:</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition ${
                  form.primaryColor === preset.primary
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="h-8 w-full rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.light} 100%)` }}
                />
                <span className="text-xs text-gray-500">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <ColorInput label="Primária" value={form.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorInput label="Escura" value={form.primaryDark} onChange={(v) => set("primaryDark", v)} />
          <ColorInput label="Clara" value={form.primaryLight} onChange={(v) => set("primaryLight", v)} />
          <ColorInput label="Destaque" value={form.accentColor} onChange={(v) => set("accentColor", v)} />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition active:scale-[0.98] ${
          saved ? "bg-green-500" : "bg-primary hover:bg-primary-dark"
        }`}
      >
        {saved ? (
          <>
            <Check className="h-5 w-5" />
            Configurações salvas!
          </>
        ) : (
          <>
            <Save className="h-5 w-5" />
            Salvar configurações
          </>
        )}
      </button>

      <p className="pb-4 text-center text-xs text-gray-400">
        As alterações são salvas automaticamente no navegador e aplicadas na hora.
      </p>
    </div>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border-2 border-gray-200"
        />
      </div>
      <p className="mt-1 text-center text-xs text-gray-300 font-mono">{value}</p>
    </div>
  );
}
