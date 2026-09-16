import { useState, useRef } from "react";
import {
  Store,
  Plus,
  Search,
  ExternalLink,
  Power,
  Trash2,
  Settings,
  DollarSign,
  ShoppingBag,
  Shield,
  CheckCircle2,
  Copy,
  LogOut,
  Sparkles,
  Key,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Database,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Palette,
  Sun,
  Moon,
  LayoutGrid,
  List,
  Flame,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { updateTenantApi } from "@/services/api";
import type { Tenant, TenantStatus } from "@/types";
import { StoreLogo, getSafeDisplayName, getSafeSlug } from "@/components/common/StoreLogo";
import { OFFICIAL_WORKERS_BASE, copyTextToClipboard } from "@/utils/url";

interface SuperAdminPanelProps {
  onManageStore: (tenant: Tenant) => void;
  onExit: () => void;
  onViewStoreFront?: (tenant: Tenant) => void;
}

export function SuperAdminPanel({ onManageStore, onExit, onViewStoreFront }: SuperAdminPanelProps) {
  const {
    tenants,
    toggleTenantStatus,
    deleteTenant,
    createNewTenant,
    refreshTenants,
    logout,
    currentUser,
    updateSuperAdminCredentials,
  } = useStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // State for Super Admin Credentials Modal
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState("");
  const [credentialsSuccess, setCredentialsSuccess] = useState("");

  const openCredentialsModal = () => {
    setNewEmail(currentUser?.email || "");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setCredentialsError("");
    setCredentialsSuccess("");
    setIsCredentialsModalOpen(true);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsError("");
    setCredentialsSuccess("");

    if (!newEmail.trim() || !newPassword.trim()) {
      setCredentialsError("Por favor, preencha o novo e-mail e a nova senha.");
      return;
    }

    if (newPassword.length < 4) {
      setCredentialsError("A nova senha deve possuir pelo menos 4 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setCredentialsError("As senhas informadas não coincidem. Digite a mesma senha nos dois campos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setCredentialsError("Por favor, insira um formato de e-mail válido.");
      return;
    }

    setCredentialsLoading(true);
    try {
      const res = await updateSuperAdminCredentials(newEmail.trim(), newPassword.trim());
      if (res.success) {
        setCredentialsSuccess(
          res.message ||
            "Credenciais atualizadas com sucesso no banco de dados Cloudflare D1! Utilize o novo e-mail e senha nos próximos logins."
        );
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setCredentialsError(res.error || "Erro ao atualizar credenciais.");
      }
    } catch (err: any) {
      setCredentialsError(err.message || "Erro de conexão ao salvar no banco de dados.");
    } finally {
      setCredentialsLoading(false);
    }
  };

  // Form State for New Tenant
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    password: "",
    whatsapp: "",
    pixKey: "",
    pixKeyType: "email" as Tenant["pixKeyType"],
    deliveryFee: 5.0,
    address: "",
    primaryColor: "#E63946",
    bannerImage: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingNewBanner, setIsProcessingNewBanner] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState<{
    tenant: Tenant;
    email: string;
    pass: string;
  } | null>(null);
  const [formError, setFormError] = useState("");
  const newTenantBannerInputRef = useRef<HTMLInputElement>(null);

  // Store Config Modal State (Super Admin editing existing store)
  const [isStoreConfigModalOpen, setIsStoreConfigModalOpen] = useState(false);
  const [editingTenantConfig, setEditingTenantConfig] = useState<Tenant | null>(null);
  const [configForm, setConfigForm] = useState({
    name: "",
    logo: "",
    bannerImage: "",
    whatsapp: "",
    pixKey: "",
    pixKeyType: "email" as Tenant["pixKeyType"],
    deliveryFee: 5.0,
    address: "",
    hours: "18:00 - 23:30",
    tagline: "",
    announcement: "",
    primaryColor: "#E63946",
    secondaryColor: "#1D3557",
    themeMode: "light" as "light" | "dark",
    menuLayout: "list" as "list" | "grid",
    showFeaturedCarousel: true,
  });
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [isProcessingConfigBanner, setIsProcessingConfigBanner] = useState(false);
  const [isProcessingConfigLogo, setIsProcessingConfigLogo] = useState(false);
  const [configSuccessMessage, setConfigSuccessMessage] = useState("");
  const [configErrorMessage, setConfigErrorMessage] = useState("");
  const editConfigBannerInputRef = useRef<HTMLInputElement>(null);
  const editConfigLogoInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert and compress image file to Base64 with safe dimensions and quality
  const processImageFile = (file: File, isLogo: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return resolve("");

        const img = new Image();
        img.onload = () => {
          const maxWidth = isLogo ? 600 : 1280;
          const maxHeight = isLogo ? 600 : 720;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / maxWidth > height / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const mimeType = isLogo && file.type === "image/png" ? "image/png" : "image/jpeg";
            const dataUrl = canvas.toDataURL(mimeType, 0.82);
            resolve(dataUrl);
          } else {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleOpenStoreConfig = (tenant: Tenant) => {
    setEditingTenantConfig(tenant);
    setConfigForm({
      name: tenant.name || "",
      logo: tenant.logo || "🍔",
      bannerImage: tenant.bannerImage || "",
      whatsapp: tenant.whatsapp || "",
      pixKey: tenant.pixKey || "",
      pixKeyType: tenant.pixKeyType || "email",
      deliveryFee: tenant.deliveryFee ?? 5.0,
      address: tenant.address || "",
      hours: tenant.hours || "18:00 - 23:30",
      tagline: tenant.tagline || "",
      announcement: tenant.announcement || "",
      primaryColor: tenant.primaryColor || "#E63946",
      secondaryColor: tenant.secondaryColor || "#1D3557",
      themeMode: tenant.themeMode || "light",
      menuLayout: tenant.menuLayout || "list",
      showFeaturedCarousel: tenant.showFeaturedCarousel !== false,
    });
    setConfigSuccessMessage("");
    setConfigErrorMessage("");
    setIsStoreConfigModalOpen(true);
  };

  const handleSaveStoreConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenantConfig) return;

    setIsConfigSaving(true);
    setConfigErrorMessage("");
    setConfigSuccessMessage("");

    try {
      const res = await updateTenantApi(editingTenantConfig.id, {
        name: configForm.name.trim(),
        logo: configForm.logo,
        bannerImage: configForm.bannerImage,
        whatsapp: configForm.whatsapp.trim(),
        pixKey: configForm.pixKey.trim(),
        pixKeyType: configForm.pixKeyType,
        deliveryFee: Number(configForm.deliveryFee) || 0,
        address: configForm.address.trim(),
        hours: configForm.hours.trim(),
        tagline: configForm.tagline.trim(),
        announcement: configForm.announcement.trim(),
        primaryColor: configForm.primaryColor,
        secondaryColor: configForm.secondaryColor,
        themeMode: configForm.themeMode,
        menuLayout: configForm.menuLayout,
        showFeaturedCarousel: configForm.showFeaturedCarousel,
      });

      if (res.success) {
        await refreshTenants();
        setConfigSuccessMessage("Configurações da loja e layout atualizados com sucesso!");
        setTimeout(() => {
          setIsStoreConfigModalOpen(false);
          setEditingTenantConfig(null);
        }, 1500);
      } else {
        setConfigErrorMessage(res.error || "Erro ao salvar configurações da loja.");
      }
    } catch (err: any) {
      setConfigErrorMessage(err.message || "Erro inesperado ao salvar.");
    } finally {
      setIsConfigSaving(false);
    }
  };

  // URL Oficial de Produção no Cloudflare Workers conforme especificação
  const origin = OFFICIAL_WORKERS_BASE;

  const copyToClipboard = async (text: string, key: string) => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const totalOrders = tenants.reduce((sum, t) => sum + (t.orderCount || 0), 0);
  const totalRevenue = tenants.reduce((sum, t) => sum + (t.revenue || 0), 0);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  };

  const handleNameChange = (name: string) => {
    const baseSlug = slugify(name);
    let candidateSlug = baseSlug;
    let count = 1;
    while (tenants.some((t) => t.slug === candidateSlug)) {
      candidateSlug = `${baseSlug}-${count++}`;
    }

    setFormData((prev) => ({
      ...prev,
      name,
      slug: candidateSlug,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setFormError("Por favor, preencha o Nome da Loja, E-mail e Senha do Cliente.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createNewTenant({
        ...formData,
        pixKey: formData.pixKey || formData.email,
        whatsapp: formData.whatsapp || "5511999999999",
      });

      if (res.success && res.tenant) {
        setCreatedSuccess({
          tenant: res.tenant,
          email: formData.email,
          pass: formData.password,
        });
        await refreshTenants();
      } else {
        setFormError(res.error || "Erro ao cadastrar lanchonete.");
      }
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (tenant: Tenant) => {
    const nextStatus: TenantStatus = tenant.status === "active" ? "inactive" : "active";
    await toggleTenantStatus(tenant.id, nextStatus);
  };

  const handleDelete = async (tenant: Tenant) => {
    if (
      confirm(
        `Tem certeza que deseja excluir a loja "${tenant.name}"? Todos os produtos e pedidos desta loja serão apagados.`
      )
    ) {
      await deleteTenant(tenant.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 text-white shadow-lg shadow-amber-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white sm:text-lg">Top Food Platform</h1>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
                  Super Admin
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-400">
                  Logado como: <strong className="text-slate-200">{currentUser?.email}</strong>
                </p>
                <button
                  onClick={openCredentialsModal}
                  className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30 transition border border-amber-500/30"
                  title="Clique para alterar e-mail e senha"
                >
                  Alterar dados
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={openCredentialsModal}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 shadow-sm transition hover:bg-amber-500/25 active:scale-[0.98] sm:text-sm sm:px-3.5"
              title="Alterar e-mail e senha do Super Admin"
            >
              <Key className="h-4 w-4 text-amber-400" />
              <span className="hidden sm:inline">Alterar E-mail / Senha</span>
              <span className="sm:hidden">Credenciais</span>
            </button>
            <button
              onClick={() => {
                setIsModalOpen(true);
                setCreatedSuccess(null);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-red-600/30 transition hover:brightness-110 sm:text-sm sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Nova Lanchonete</span>
            </button>
            <button
              onClick={onExit}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              Ver Vitrine
            </button>
            <button
              onClick={() => {
                logout();
                onExit();
              }}
              title="Encerrar sessão"
              className="rounded-xl border border-red-900/50 bg-red-950/40 p-2 text-red-400 transition hover:bg-red-900/50 hover:text-red-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        {/* Super Admin Security / Database Banner */}
        <section className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-900/60 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-inner">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-white sm:text-base">
                    Gestão de Acesso do Super Admin
                  </h2>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloudflare D1 Ativo
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  E-mail atual: <strong className="text-amber-300 font-mono">{currentUser?.email}</strong>. Você pode alterar seu e-mail e senha a qualquer momento com persistência no banco de dados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCredentialsModal}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 active:scale-[0.98] shadow-md shadow-amber-500/10"
            >
              <Key className="h-4 w-4 text-amber-400" />
              Alterar E-mail e Senha
            </button>
          </div>
        </section>

        {/* KPI Platform Cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Total Lojas</span>
              <Store className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white sm:text-3xl">{totalTenants}</span>
              <span className="text-xs text-emerald-400 font-semibold">{activeTenants} ativas</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Lojas Inativas</span>
              <Power className="h-4 w-4 text-red-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white sm:text-3xl">
                {totalTenants - activeTenants}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Pedidos na Rede</span>
              <ShoppingBag className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-white sm:text-3xl">{totalOrders}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium uppercase tracking-wider">Volume Faturado</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-400 sm:text-3xl">
                R$ {totalRevenue.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </section>

        {/* Filter and Store List Header */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">Lanchonetes e Clientes Cadastrados</h2>
            <p className="text-xs text-slate-400">
              Gerencie instâncias, ative ou pause lojas e acesse o painel individual de cada cliente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, slug ou e-mail..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  statusFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Todas ({tenants.length})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  statusFilter === "active" ? "bg-emerald-950/80 text-emerald-300" : "text-slate-400 hover:text-white"
                }`}
              >
                Ativas ({activeTenants})
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                  statusFilter === "inactive" ? "bg-red-950/80 text-red-300" : "text-slate-400 hover:text-white"
                }`}
              >
                Pausadas ({totalTenants - activeTenants})
              </button>
            </div>
          </div>
        </div>

        {/* Store Cards Grid */}
        {filteredTenants.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <Store className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-3 text-sm font-semibold text-slate-300">Nenhuma lanchonete encontrada</h3>
            <p className="mt-1 text-xs text-slate-500">
              Cadastre uma nova lanchonete ou altere os termos da busca.
            </p>
            <button
              onClick={() => {
                setIsModalOpen(true);
                setCreatedSuccess(null);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Cadastrar Agora
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTenants.map((t) => {
              const isActive = t.status === "active";
              return (
                <div
                  key={t.id}
                  className={`relative flex flex-col justify-between rounded-2xl border transition-all ${
                    isActive
                      ? "border-slate-800 bg-slate-900/60 hover:border-slate-700 shadow-sm"
                      : "border-red-950/60 bg-slate-900/30 opacity-80"
                  }`}
                >
                  {/* Top Store Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-2xl shadow-inner border border-white/10"
                          style={{
                            backgroundColor: `${t.primaryColor || "#E63946"}20`,
                            color: t.primaryColor || "#E63946",
                          }}
                        >
                          <StoreLogo logo={t.logo} name={t.name} className="h-full w-full object-cover" fallbackEmoji="🍔" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-base leading-tight">
                              {getSafeDisplayName(t.name, "Lanchonete")}
                            </h3>
                          </div>
                          <span className="text-xs text-slate-400">/loja/{getSafeSlug(t.slug, "loja")}</span>
                        </div>
                      </div>

                      {/* Status Badge & Toggle */}
                      <button
                        onClick={() => handleStatusToggle(t)}
                        title={isActive ? "Clique para desativar loja" : "Clique para ativar loja"}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-emerald-400 animate-pulse" : "bg-red-500"
                          }`}
                        />
                        {isActive ? "Ativa" : "Desativada"}
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-slate-400 line-clamp-1">{t.tagline}</p>

                    {/* Meta info */}
                    <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">E-mail do Cliente:</span>
                        <span className="font-medium text-slate-200">{t.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">WhatsApp de Pedidos:</span>
                        <span className="font-medium text-slate-200">{t.whatsapp}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Chave PIX:</span>
                        <span className="font-medium text-slate-200 max-w-[170px] truncate" title={t.pixKey}>
                          {t.pixKey}
                        </span>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-950/60 p-2.5 text-center text-xs">
                      <div>
                        <span className="block text-slate-500 font-medium">Itens Cardápio</span>
                        <span className="font-bold text-white text-sm">{t.productCount ?? 0}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Total Pedidos</span>
                        <span className="font-bold text-amber-400 text-sm">{t.orderCount ?? 0}</span>
                      </div>
                    </div>

                    {/* Links Exclusivos e Isolados da Loja (Multi-tenant) */}
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-3">
                      {/* a) Vitrine Pública do Cliente */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                          <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                            <Store className="h-3.5 w-3.5" /> Vitrine Pública (Cliente)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">/loja/{t.slug}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex-1 truncate rounded-lg border border-slate-800/90 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 select-all"
                            title={`${origin}/loja/${t.slug}`}
                          >
                            {origin}/loja/{t.slug}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`${origin}/loja/${t.slug}`, `${t.slug}-public`)}
                            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                              copiedKey === `${t.slug}-public`
                                ? "bg-emerald-500 text-white"
                                : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                            }`}
                            title="Copiar Link da Vitrine Pública"
                          >
                            {copiedKey === `${t.slug}-public` ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onViewStoreFront) {
                                onViewStoreFront(t);
                              } else {
                                window.open(`/loja/${t.slug}`, "_blank");
                              }
                            }}
                            className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                            title="Abrir Vitrine Pública da Lanchonete"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Abrir Loja</span>
                          </button>
                        </div>
                      </div>

                      {/* b) Link de Acesso ao Painel Admin da Loja */}
                      <div className="border-t border-slate-800/80 pt-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                          <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                            <Settings className="h-3.5 w-3.5" /> Painel Admin da Loja
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">/admin?tenant={t.slug}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex-1 truncate rounded-lg border border-slate-800/90 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 select-all"
                            title={`${origin}/admin?tenant=${t.slug}`}
                          >
                            {origin}/admin?tenant={t.slug}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`${origin}/admin?tenant=${t.slug}`, `${t.slug}-admin`)}
                            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                              copiedKey === `${t.slug}-admin`
                                ? "bg-emerald-500 text-white"
                                : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                            }`}
                            title="Copiar Link de Acesso ao Painel Admin"
                          >
                            {copiedKey === `${t.slug}-admin` ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onManageStore(t)}
                            className="flex shrink-0 items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/20 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30 transition"
                            title="Acessar Painel de Administração desta Loja"
                          >
                            <span>Gerenciar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onManageStore(t)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 py-2 px-3 text-xs font-semibold text-amber-300 border border-amber-500/30 transition hover:bg-amber-500/25"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Gerenciar Cardápio & Pedidos</span>
                      </button>

                      <button
                        onClick={() => handleOpenStoreConfig(t)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 py-2 px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-750 hover:text-white"
                        title="Configurações da Loja e Foto/Banner da Vitrine"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                        <span>Configurações & Banner</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(t)}
                      title="Excluir Lanchonete"
                      className="flex items-center gap-1 rounded-xl border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: Cadastrar Nova Lanchonete */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Nova Lanchonete</h3>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Gera uma nova instância virgem (limpa) com banco de dados e conta exclusiva para o cliente.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {createdSuccess ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-300 shadow-sm">
                  <div className="flex items-center gap-2.5 font-bold text-base">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Lanchonete Criada com Sucesso!
                  </div>
                  <p className="mt-1 text-xs text-emerald-200/90">
                    A nova lanchonete está ativa com links exclusivos e banco de dados D1/KV isolado.
                  </p>
                </div>

                {/* a) Link da Vitrine Pública do Cliente */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Store className="h-4 w-4" /> Link da Vitrine Pública do Cliente
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Para os clientes pedirem</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 select-all">
                      {origin}/loja/{createdSuccess.tenant.slug}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${origin}/loja/${createdSuccess.tenant.slug}`,
                          "modal-public"
                        )
                      }
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        copiedKey === "modal-public"
                          ? "bg-emerald-500 text-white"
                          : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {copiedKey === "modal-public" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`/loja/${createdSuccess.tenant.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Abrir Loja</span>
                    </a>
                  </div>
                </div>

                {/* b) Link de Acesso ao Painel Admin da Loja */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                      <Settings className="h-4 w-4" /> Link de Acesso ao Painel Admin da Loja
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Para o lojista gerenciar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 select-all">
                      {origin}/admin?tenant={createdSuccess.tenant.slug}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${origin}/admin?tenant=${createdSuccess.tenant.slug}`,
                          "modal-admin"
                        )
                      }
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        copiedKey === "modal-admin"
                          ? "bg-emerald-500 text-white"
                          : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {copiedKey === "modal-admin" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Credenciais de Acesso */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-300 pb-2 border-b border-slate-800">
                    <span>Credenciais da Conta do Lojista</span>
                    <button
                      type="button"
                      onClick={() => {
                        const message = `🍔 Olá! Seu cardápio digital foi ativado na plataforma:\n\n🏪 Vitrine para seus clientes:\n${origin}/loja/${createdSuccess.tenant.slug}\n\n⚙️ Seu Painel Administrativo:\n${origin}/admin?tenant=${createdSuccess.tenant.slug}\n\n🔑 E-mail de login: ${createdSuccess.email}\n🔒 Senha: ${createdSuccess.pass}`;
                        copyToClipboard(message, "modal-creds");
                      }}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                    >
                      {copiedKey === "modal-creds" ? "Mensagem Copiada!" : "Copiar Dados de Acesso (WhatsApp)"}
                    </button>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">E-mail:</span>
                    <strong className="text-white font-mono">{createdSuccess.email}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Senha Provisória:</span>
                    <strong className="text-amber-300 font-mono">{createdSuccess.pass}</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={() => {
                      onManageStore(createdSuccess.tenant);
                      setIsModalOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white transition hover:bg-amber-500 shadow-md"
                  >
                    <Settings className="h-4 w-4" />
                    Acessar Painel desta Loja
                  </button>
                  <button
                    onClick={() => {
                      setCreatedSuccess(null);
                      setFormData({
                        name: "",
                        slug: "",
                        email: "",
                        password: "",
                        whatsapp: "",
                        pixKey: "",
                        pixKeyType: "email",
                        deliveryFee: 5.0,
                        address: "",
                        primaryColor: "#E63946",
                      });
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    Cadastrar Outra
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                {formError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/50 p-3 text-xs text-red-300">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome da Lanchonete / Restaurante *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ex: Pastelaria do Zé"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Slug da Loja (Link URL) *
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                      <span className="text-slate-500">/loja/</span>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                          }))
                        }
                        placeholder="pastelaria-do-ze"
                        className="w-full bg-transparent text-amber-400 font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Live Preview of Exclusive URLs */}
                  {formData.slug && (
                    <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5 text-xs">
                      <div className="text-[11px] font-semibold text-slate-400">
                        Pré-visualização dos Links exclusivos que serão gerados:
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-medium shrink-0">🏪 Vitrine:</span>
                        <span className="truncate font-mono text-slate-300 select-all">
                          {origin}/loja/{formData.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sky-400 font-medium shrink-0">⚙️ Admin:</span>
                        <span className="truncate font-mono text-slate-300 select-all">
                          {origin}/admin?tenant={formData.slug}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
                  <span className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Credenciais de Acesso do Cliente
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        E-mail do Dono da Loja *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="cliente@pastelaria.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Senha de Acesso do Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Ex: pastel123"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WhatsApp para Receber Pedidos
                    </label>
                    <input
                      type="text"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="Ex: 5511999998888"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Taxa de Entrega Inicial (R$)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={formData.deliveryFee}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Chave PIX da Loja</label>
                    <input
                      type="text"
                      value={formData.pixKey}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pixKey: e.target.value }))}
                      placeholder="Chave PIX (e-mail, CPF, celular...)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cor Principal</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="h-8 w-8 cursor-pointer rounded-lg border border-slate-700 bg-transparent p-0"
                      />
                      <span className="text-xs text-slate-400 font-mono">{formData.primaryColor}</span>
                    </div>
                  </div>
                </div>

                {/* Foto da Lanchonete / Banner da Vitrine */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span>Foto da Lanchonete / Banner da Vitrine</span>
                    </label>
                    <span className="text-[11px] text-slate-500">Opcional</span>
                  </div>

                  <input
                    ref={newTenantBannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsProcessingNewBanner(true);
                      try {
                        const base64 = await processImageFile(file);
                        setFormData((prev) => ({ ...prev, bannerImage: base64 }));
                      } catch {
                        // ignore error
                      } finally {
                        setIsProcessingNewBanner(false);
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => newTenantBannerInputRef.current?.click()}
                    disabled={isProcessingNewBanner}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 py-2.5 px-3 text-xs font-medium text-slate-300 hover:border-amber-500 hover:text-amber-300 transition"
                  >
                    <Upload className="h-3.5 w-3.5 text-amber-400" />
                    <span>
                      {isProcessingNewBanner
                        ? "Processando banner..."
                        : formData.bannerImage
                        ? "Trocar Foto da Lanchonete / Banner"
                        : "Selecionar Foto da Lanchonete / Banner da Vitrine"}
                    </span>
                  </button>

                  {formData.bannerImage && (
                    <div className="relative aspect-[16/6] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                      <img
                        src={formData.bannerImage}
                        alt="Banner Preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                      <div className="absolute bottom-2 left-2 text-white text-[11px] font-bold">
                        Pré-visualização da Capa da Vitrine
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, bannerImage: "" }));
                          if (newTenantBannerInputRef.current) newTenantBannerInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-red-600 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-gradient-to-r from-red-600 to-amber-600 py-3 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition hover:brightness-110 disabled:opacity-50"
                  >
                    {isSubmitting ? "Gerando Instância Virgem..." : "Criar Lanchonete e Liberar Conta"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Super Admin Credentials Modal */}
      {isCredentialsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-400">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg">
                    Alterar Acesso do Super Admin
                  </h3>
                  <p className="text-xs text-slate-400">
                    Atualização persistida no banco de dados Cloudflare D1
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCredentialsModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Cloudflare D1 Integration Badge */}
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-start gap-2.5 text-xs text-slate-300">
              <Database className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Persistência Cloudflare D1 (env.DB):</span>
                <p className="text-slate-400 mt-0.5">
                  Os novos dados serão gravados na tabela de usuários via API Hono e serão exigidos imediatamente no próximo login em <code className="text-amber-300 font-mono">/superadmin</code>.
                </p>
              </div>
            </div>

            {/* Current Email Info */}
            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3.5 py-2.5 text-xs">
              <span className="text-slate-400">E-mail atual cadastrado:</span>
              <span className="font-mono font-medium text-amber-300 select-all">
                {currentUser?.email || "superadmin@plataforma.com"}
              </span>
            </div>

            {/* Success Message */}
            {credentialsSuccess && (
              <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-xs text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Sucesso! Credenciais Salvas</span>
                </div>
                <p>{credentialsSuccess}</p>
                <div className="mt-2.5 pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-300">
                  Guarde sua nova senha em um local seguro. Caso saia do painel, faça login com as novas credenciais.
                </div>
              </div>
            )}

            {/* Error Message */}
            {credentialsError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-800 bg-red-950/50 p-3.5 text-xs text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{credentialsError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Novo E-mail do Super Admin *
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="exemplo@seudominio.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nova Senha de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Exibir
                      </>
                    )}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres (Ex: SuperSenha#2025)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmar Nova Senha *
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha exatamente igual"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCredentialsModalOpen(false)}
                  className="w-1/3 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={credentialsLoading}
                  className="w-2/3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {credentialsLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Salvando no D1...</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5" />
                      <span>Salvar Novas Credenciais</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Super Admin Store Settings & Banner Modal */}
      {isStoreConfigModalOpen && editingTenantConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-scale-in text-white my-auto">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-500/20 text-xl border border-amber-500/30">
                  <StoreLogo logo={editingTenantConfig.logo} name={editingTenantConfig.name} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Configurações da Loja</h3>
                  <p className="text-xs text-slate-400">
                    {getSafeDisplayName(editingTenantConfig.name, "Lanchonete")} • <span className="font-mono text-amber-400">/loja/{getSafeSlug(editingTenantConfig.slug, "loja")}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStoreConfigModalOpen(false);
                  setEditingTenantConfig(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {configSuccessMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{configSuccessMessage}</span>
              </div>
            )}

            {configErrorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{configErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveStoreConfig} className="space-y-5">
              {/* 1. LOGOMARCA E CAPA */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 border-b border-slate-800/80 pb-2">
                  <ImageIcon className="h-4 w-4 text-amber-400" />
                  <span>1. Logomarca e Banner da Loja</span>
                </div>

                {/* Uploads Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Logomarca */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Logomarca (Foto de Perfil)
                    </label>
                    <input
                      ref={editConfigLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsProcessingConfigLogo(true);
                        try {
                          const base64 = await processImageFile(file, true);
                          setConfigForm((prev) => ({ ...prev, logo: base64 }));
                        } catch {
                          // ignore
                        } finally {
                          setIsProcessingConfigLogo(false);
                        }
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-md">
                        {configForm.logo && (configForm.logo.startsWith("data:") || configForm.logo.startsWith("http")) ? (
                          <img src={configForm.logo} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl">{configForm.logo || "🏪"}</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => editConfigLogoInputRef.current?.click()}
                          disabled={isProcessingConfigLogo}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-500 hover:text-amber-300"
                        >
                          <Upload className="h-3.5 w-3.5 text-amber-400" />
                          <span>{isProcessingConfigLogo ? "Processando..." : "Subir Logomarca"}</span>
                        </button>
                        {configForm.logo && configForm.logo.startsWith("data:") && (
                          <button
                            type="button"
                            onClick={() => setConfigForm((prev) => ({ ...prev, logo: "🍔" }))}
                            className="text-[11px] text-red-400 hover:underline"
                          >
                            Remover imagem e usar emoji
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Banner / Capa */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Foto da Lanchonete / Banner da Vitrine
                    </label>
                    <input
                      ref={editConfigBannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsProcessingConfigBanner(true);
                        try {
                          const base64 = await processImageFile(file, false);
                          setConfigForm((prev) => ({ ...prev, bannerImage: base64 }));
                        } catch {
                          // ignore
                        } finally {
                          setIsProcessingConfigBanner(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => editConfigBannerInputRef.current?.click()}
                      disabled={isProcessingConfigBanner}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-500 hover:text-amber-300"
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-400" />
                      <span>{isProcessingConfigBanner ? "Processando..." : configForm.bannerImage ? "Trocar Banner" : "Subir Foto do Banner"}</span>
                    </button>
                  </div>
                </div>

                {/* Banner Preview */}
                {configForm.bannerImage && (
                  <div className="relative aspect-[16/6] w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                    <img
                      src={configForm.bannerImage}
                      alt="Prévia do Banner"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white/20 backdrop-blur-md border border-white/30 text-white">
                        {configForm.logo && (configForm.logo.startsWith("data:") || configForm.logo.startsWith("http")) ? (
                          <img src={configForm.logo} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <span>{configForm.logo || "🏪"}</span>
                        )}
                      </div>
                      <div>
                        <span className="block font-bold text-xs text-white leading-tight drop-shadow">
                          {configForm.name || editingTenantConfig.name}
                        </span>
                        <span className="text-[10px] text-white/80">Pré-visualização do topo da vitrine</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setConfigForm((prev) => ({ ...prev, bannerImage: "" }));
                        if (editConfigBannerInputRef.current) editConfigBannerInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-red-600 transition"
                      title="Remover banner"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 2. CORES E TEMA DA LOJA */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 border-b border-slate-800/80 pb-2">
                  <Palette className="h-4 w-4 text-amber-400" />
                  <span>2. Cores e Tema da Loja</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Cor Primária */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Cor Primária</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2">
                      <input
                        type="color"
                        value={configForm.primaryColor}
                        onChange={(e) => setConfigForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                        className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-slate-200">{configForm.primaryColor}</span>
                    </div>
                  </div>

                  {/* Cor Secundária */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Cor Secundária</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2">
                      <input
                        type="color"
                        value={configForm.secondaryColor}
                        onChange={(e) => setConfigForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                        className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-slate-200">{configForm.secondaryColor}</span>
                    </div>
                  </div>

                  {/* Modo Claro / Escuro */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">Modo de Exibição</label>
                    <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setConfigForm((prev) => ({ ...prev, themeMode: "light" }))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                          configForm.themeMode === "light"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Sun className="h-3.5 w-3.5" />
                        <span>Claro</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfigForm((prev) => ({ ...prev, themeMode: "dark" }))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                          configForm.themeMode === "dark"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Moon className="h-3.5 w-3.5" />
                        <span>Escuro</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. INFORMAÇÕES DE BOAS-VINDAS E DESTAQUES */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 border-b border-slate-800/80 pb-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>3. Informações de Boas-Vindas e Destaques</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Slogan / Frase de Impacto
                    </label>
                    <input
                      type="text"
                      value={configForm.tagline}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, tagline: e.target.value }))}
                      placeholder="Ex: O melhor hambúrguer artesanal da cidade"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Aviso da Loja / Promoção do Dia
                    </label>
                    <input
                      type="text"
                      value={configForm.announcement}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, announcement: e.target.value }))}
                      placeholder="Ex: 🛵 Entrega grátis para pedidos acima de R$ 50 hoje!"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. LAYOUT E ORGANIZAÇÃO DO CARDÁPIO */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 border-b border-slate-800/80 pb-2">
                  <LayoutGrid className="h-4 w-4 text-amber-400" />
                  <span>4. Layout e Organização do Cardápio</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Estilo de Exibição dos Produtos
                    </label>
                    <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setConfigForm((prev) => ({ ...prev, menuLayout: "list" }))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition ${
                          configForm.menuLayout === "list"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <List className="h-3.5 w-3.5" />
                        <span>Lista Detalhada</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfigForm((prev) => ({ ...prev, menuLayout: "grid" }))}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition ${
                          configForm.menuLayout === "grid"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>Grade de Cards</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 p-2.5 cursor-pointer hover:border-slate-600 transition">
                      <input
                        type="checkbox"
                        checked={configForm.showFeaturedCarousel}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, showFeaturedCarousel: e.target.checked }))
                        }
                        className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                      />
                      <div>
                        <span className="flex items-center gap-1 font-semibold text-slate-200 text-xs">
                          <Flame className="h-3.5 w-3.5 text-red-400" />
                          Carrossel de Mais Pedidos
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Exibe faixa com destaques da semana no topo do cardápio
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Informações Gerais da Loja */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <span className="block text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-2">
                  Dados Gerais & Operação
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nome da Lanchonete</label>
                    <input
                      type="text"
                      required
                      value={configForm.name}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">WhatsApp para Pedidos</label>
                    <input
                      type="text"
                      value={configForm.whatsapp}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Taxa de Entrega (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={configForm.deliveryFee}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Horário de Funcionamento</label>
                    <input
                      type="text"
                      value={configForm.hours}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, hours: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Endereço da Loja</label>
                    <input
                      type="text"
                      value={configForm.address}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Chave PIX</label>
                    <input
                      type="text"
                      value={configForm.pixKey}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, pixKey: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreConfigModalOpen(false);
                    setEditingTenantConfig(null);
                  }}
                  className="w-1/3 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isConfigSaving || isProcessingConfigBanner}
                  className="w-2/3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isConfigSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Salvando Configurações...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Salvar Configurações da Loja</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
