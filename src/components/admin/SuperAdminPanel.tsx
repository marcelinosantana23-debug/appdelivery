import React, { useState, useEffect, useRef } from "react";
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
  Tag,
  Loader2,
  QrCode,
  Calendar,
  CreditCard,
  CheckCheck,
  Ban,
  Clock,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { updateTenantApi } from "@/services/api";
import type { Tenant, TenantStatus, EstablishmentCategory } from "@/types";
import { DEFAULT_ESTABLISHMENT_CATEGORIES } from "@/components/portal/portalUtils";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName, getSafeSlug } from "@/utils/storeFormat";
import { OFFICIAL_WORKERS_BASE, copyTextToClipboard } from "@/utils/url";
import { getSubscriptionInfo } from "@/utils/billing";
import { AiMenuImportModal } from "./AiMenuImportModal";
import { AdminVitrineAppearance } from "./AdminVitrineAppearance";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";
import { StoreQrCodePlate } from "./StoreQrCodePlate";

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
    updateTenantCredentials,
    establishmentCategories,
    createEstablishmentCategory,
    deleteEstablishmentCategory,
    refreshEstablishmentCategories,
    toggleTenantFeatured,
    activateSubscription,
    updateMonthlyFee,
    confirmMonthlyPayment,
    cancelSubscription,
    platformSettings,
    updatePlatformSettings,
  } = useStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "featured" | "demo" | "due_soon">("all");
  const [activatingTenantId, setActivatingTenantId] = useState<string | null>(null);
  const [confirmingPaymentTenantId, setConfirmingPaymentTenantId] = useState<string | null>(null);
  const [cancellingSubscriptionTenantId, setCancellingSubscriptionTenantId] = useState<string | null>(null);
  const [subscriptionFeedback, setSubscriptionFeedback] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);
  const [editingFeeTenantId, setEditingFeeTenantId] = useState<string | null>(null);
  const [editingFeeValue, setEditingFeeValue] = useState<string>("");
  const [isSavingFee, setIsSavingFee] = useState<boolean>(false);

  const handleStartEditFee = (t: Tenant) => {
    setEditingFeeTenantId(t.id);
    setEditingFeeValue(String(t.monthlyFee ?? 49.9));
  };

  const handleSaveMonthlyFee = async (tenantId: string) => {
    const cleanVal = editingFeeValue.replace(",", ".");
    const parsed = parseFloat(cleanVal);
    if (isNaN(parsed) || parsed < 0) {
      alert("Por favor, informe um valor numérico válido para a mensalidade.");
      return;
    }
    setIsSavingFee(true);
    try {
      const res = await updateMonthlyFee(tenantId, parsed);
      if (res.success) {
        setSubscriptionFeedback({
          id: tenantId,
          message: `Valor da mensalidade alterado para ${parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês no banco D1!`,
          type: "success",
        });
        setTimeout(() => setSubscriptionFeedback(null), 4000);
        setEditingFeeTenantId(null);
      } else {
        alert(res.error || "Falha ao salvar valor da mensalidade.");
      }
    } catch (e: any) {
      alert(e.message || "Erro ao salvar valor da mensalidade.");
    } finally {
      setIsSavingFee(false);
    }
  };
  const [viewMode, setViewMode] = useState<"cards" | "credentials" | "appearance">("cards");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [isAiConfigModalOpen, setIsAiConfigModalOpen] = useState(false);
  const [globalGeminiKeyInput, setGlobalGeminiKeyInput] = useState("");
  const [showGlobalGeminiKey, setShowGlobalGeminiKey] = useState(false);
  const [aiConfigSaving, setAiConfigSaving] = useState(false);
  const [aiConfigSuccess, setAiConfigSuccess] = useState("");
  const [aiConfigError, setAiConfigError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  const [selectedTenantForQrCode, setSelectedTenantForQrCode] = useState<Tenant | null>(null);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTenants();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const isGlobalAiKeyConfigured = Boolean(
    platformSettings?.geminiApiKey?.trim() ||
      (typeof window !== "undefined" && localStorage.getItem("topfood_gemini_api_key")?.trim())
  );

  const openAiConfigModal = () => {
    const key =
      platformSettings?.geminiApiKey ||
      (typeof window !== "undefined" ? localStorage.getItem("topfood_gemini_api_key") || "" : "");
    setGlobalGeminiKeyInput(key);
    setShowGlobalGeminiKey(false);
    setAiConfigSuccess("");
    setAiConfigError("");
    setIsAiConfigModalOpen(true);
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiConfigSaving(true);
    setAiConfigSuccess("");
    setAiConfigError("");
    try {
      const trimmed = globalGeminiKeyInput.trim();
      const res = await updatePlatformSettings({ geminiApiKey: trimmed });
      if (res.success) {
        if (typeof window !== "undefined") {
          if (trimmed) {
            localStorage.setItem("topfood_gemini_api_key", trimmed);
          } else {
            localStorage.removeItem("topfood_gemini_api_key");
          }
        }
        setAiConfigSuccess("Chave de API do Google Gemini salva com sucesso nas configurações globais do sistema!");
        setTimeout(() => setAiConfigSuccess(""), 4000);
      } else {
        setAiConfigError(res.error || "Erro ao salvar chave da API.");
      }
    } catch (err: any) {
      setAiConfigError(err.message || "Erro inesperado ao salvar chave da API.");
    } finally {
      setAiConfigSaving(false);
    }
  };

  // Sincronização direta com Cloudflare D1 ao montar, no foco da janela e polling periódico
  useEffect(() => {
    // 1. Atualização imediata ao entrar no Super Admin
    refreshTenants();

    // 2. Atualização ao retornar para a aba (window focus)
    const handleFocus = () => {
      refreshTenants();
    };
    window.addEventListener("focus", handleFocus);

    // 3. Polling em segundo plano a cada 20 segundos para sincronização entre múltiplos dispositivos
    const timer = setInterval(() => {
      refreshTenants();
    }, 20000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(timer);
    };
  }, [refreshTenants]);

  // State for show/hide passwords on cards or table
  const [showCardPasswords, setShowCardPasswords] = useState<Record<string, boolean>>({});

  const toggleCardPasswordVisibility = (tenantId: string) => {
    setShowCardPasswords((prev) => ({
      ...prev,
      [tenantId]: !prev[tenantId],
    }));
  };

  // State for Tenant Credentials Modal
  const [isTenantCredentialsModalOpen, setIsTenantCredentialsModalOpen] = useState(false);
  const [selectedTenantForCredentials, setSelectedTenantForCredentials] = useState<Tenant | null>(null);
  const [tenantAdminEmail, setTenantAdminEmail] = useState("");
  const [tenantAdminPassword, setTenantAdminPassword] = useState("");
  const [showTenantAdminPassword, setShowTenantAdminPassword] = useState(false);
  const [tenantCredentialsLoading, setTenantCredentialsLoading] = useState(false);
  const [tenantCredentialsError, setTenantCredentialsError] = useState("");
  const [tenantCredentialsSuccess, setTenantCredentialsSuccess] = useState("");
  const [copiedTenantCredentialsMsg, setCopiedTenantCredentialsMsg] = useState(false);

  const openTenantCredentialsModal = (tenant: Tenant) => {
    setSelectedTenantForCredentials(tenant);
    setTenantAdminEmail((tenant as any).adminEmail || tenant.email || `admin@${tenant.slug}.com`);
    setTenantAdminPassword((tenant as any).adminPassword || "123456");
    setShowTenantAdminPassword(false);
    setTenantCredentialsError("");
    setTenantCredentialsSuccess("");
    setCopiedTenantCredentialsMsg(false);
    setIsTenantCredentialsModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTenantAdminPassword(pwd);
  };

  const copyMerchantWhatsAppAccess = (tenant: Tenant, email: string, pass: string) => {
    const storeUrl = `${origin}/admin?tenant=${tenant.slug}`;
    const publicUrl = `${origin}/loja/${tenant.slug}`;
    const text = `🍔 *Acesso ao Painel da sua Loja - Top Food*\n\n` +
      `🏪 *Loja:* ${tenant.name}\n` +
      `🔗 *Painel Administrativo:* ${storeUrl}\n` +
      `👤 *Login (E-mail):* ${email}\n` +
      `🔑 *Senha:* ${pass}\n\n` +
      `📱 *Link da sua Vitrine (para clientes):* ${publicUrl}\n\n` +
      `_Guarde estas informações para gerenciar pedidos e produtos da sua loja!_`;
    copyToClipboard(text, `${tenant.slug}-whatsapp-full`);
    setCopiedTenantCredentialsMsg(true);
    setTimeout(() => setCopiedTenantCredentialsMsg(false), 3000);
  };

  const handleTenantCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForCredentials) return;

    setTenantCredentialsError("");
    setTenantCredentialsSuccess("");

    if (!tenantAdminEmail.trim() || !tenantAdminPassword.trim()) {
      setTenantCredentialsError("Login (e-mail) e senha são obrigatórios.");
      return;
    }

    if (tenantAdminPassword.trim().length < 4) {
      setTenantCredentialsError("A senha deve possuir pelo menos 4 caracteres.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantAdminEmail.trim())) {
      setTenantCredentialsError("Por favor, digite um formato de e-mail válido para o login.");
      return;
    }

    setTenantCredentialsLoading(true);
    try {
      const res = await updateTenantCredentials(
        selectedTenantForCredentials.id,
        tenantAdminEmail.trim(),
        tenantAdminPassword.trim(),
        selectedTenantForCredentials.name
      );

      if (res.success) {
        setTenantCredentialsSuccess(
          res.message || "Credenciais salvas com sucesso no banco de dados Cloudflare D1/KV! O lojista já pode acessar com os novos dados."
        );
      } else {
        setTenantCredentialsError(res.error || "Erro ao salvar credenciais no banco de dados.");
      }
    } catch (err: any) {
      setTenantCredentialsError(err.message || "Erro inesperado ao salvar.");
    } finally {
      setTenantCredentialsLoading(false);
    }
  };

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
    businessType: "Lanchonetes",
    isFeatured: false,
    priorityOrder: 0,
    monthlyFee: 49.90,
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

  // Category Modal State (Create new dynamic category or manage list)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryTargetForm, setCategoryTargetForm] = useState<"new" | "edit" | "manage">("new");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("🍽️");
  const [newCategoryOrder, setNewCategoryOrder] = useState<number>(10);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categorySuccess, setCategorySuccess] = useState("");

  // Categorias disponíveis consolidadas do banco de dados Cloudflare D1
  const availableCategories = React.useMemo<EstablishmentCategory[]>(() => {
    const fromDb = establishmentCategories || [];
    const base = fromDb.length > 0 ? [...fromDb] : DEFAULT_ESTABLISHMENT_CATEGORIES.filter((c) => c.id !== "todos");
    return [...base].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [establishmentCategories]);

  const openNewCategoryModal = (target: "new" | "edit" | "manage" = "new") => {
    setCategoryTargetForm(target);
    setNewCategoryName("");
    setNewCategoryIcon("🍽️");
    setNewCategoryOrder((availableCategories.length + 1) * 5);
    setCategoryError("");
    setCategorySuccess("");
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryError("O nome da categoria é obrigatório.");
      return;
    }

    setIsSavingCategory(true);
    setCategoryError("");
    setCategorySuccess("");

    try {
      const res = await createEstablishmentCategory(
        newCategoryName.trim(),
        newCategoryIcon.trim() || "🍽️",
        Number(newCategoryOrder) || 10
      );

      if (res.success && res.category) {
        setCategorySuccess(`Categoria "${res.category.name}" criada com sucesso no banco de dados!`);
        if (categoryTargetForm === "new") {
          setFormData((prev) => ({ ...prev, businessType: res.category!.name }));
        } else if (categoryTargetForm === "edit") {
          setConfigForm((prev) => ({ ...prev, businessType: res.category!.name }));
        }
        await refreshEstablishmentCategories();
        setTimeout(() => {
          setIsCategoryModalOpen(false);
          setCategorySuccess("");
        }, 1200);
      } else {
        setCategoryError(res.error || "Erro ao cadastrar categoria.");
      }
    } catch (err: any) {
      setCategoryError(err.message || "Erro de conexão ao salvar categoria.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${catName}" do sistema?`)) return;
    try {
      const res = await deleteEstablishmentCategory(catId);
      if (res.success) {
        setCategorySuccess(`Categoria "${catName}" excluída com sucesso!`);
        await refreshEstablishmentCategories();
        setTimeout(() => setCategorySuccess(""), 2000);
      } else {
        setCategoryError(res.error || "Erro ao excluir categoria.");
      }
    } catch (err: any) {
      setCategoryError(err.message || "Erro inesperado ao excluir.");
    }
  };

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
    adminEmail: "",
    adminPassword: "",
    businessType: "Lanchonetes",
    isFeatured: false,
    priorityOrder: 0,
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
      adminEmail: (tenant as any).adminEmail || tenant.email || `admin@${tenant.slug}.com`,
      adminPassword: (tenant as any).adminPassword || "123456",
      businessType: tenant.businessType || "Lanchonetes",
      isFeatured: Boolean(tenant.isFeatured),
      priorityOrder: Number(tenant.priorityOrder) || 0,
      monthlyFee: tenant.monthlyFee !== undefined ? tenant.monthlyFee : 49.9,
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
      // 1. Salva credenciais do lojista se informadas
      if (configForm.adminEmail.trim() || configForm.adminPassword.trim()) {
        const credEmail = configForm.adminEmail.trim() || editingTenantConfig.email;
        const credPass = configForm.adminPassword.trim() || "123456";
        if (credPass.length >= 4) {
          await updateTenantCredentials(
            editingTenantConfig.id,
            credEmail,
            credPass,
            configForm.name.trim()
          );
        }
      }

      // 2. Salva configurações da loja
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
        businessType: configForm.businessType || "Lanchonetes",
        isFeatured: Boolean(configForm.isFeatured),
        priorityOrder: Number(configForm.priorityOrder) || 0,
        monthlyFee: !isNaN(Number(configForm.monthlyFee)) ? Number(configForm.monthlyFee) : 49.9,
      });

      if (res.success) {
        await refreshTenants();
        setConfigSuccessMessage("Configurações e credenciais da loja atualizadas com sucesso no banco de dados!");
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
    const subInfo = getSubscriptionInfo(t);
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "featured"
        ? Boolean(t.isFeatured)
        : statusFilter === "demo"
        ? subInfo.status === "demo"
        : statusFilter === "due_soon"
        ? (subInfo.isDueSoon || subInfo.isOverdue)
        : t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const featuredTenantsCount = tenants.filter((t) => t.isFeatured).length;
  const demoTenantsCount = tenants.filter((t) => getSubscriptionInfo(t).status === "demo").length;
  const dueSoonTenantsCount = tenants.filter((t) => {
    const info = getSubscriptionInfo(t);
    return info.isDueSoon || info.isOverdue;
  }).length;
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
        isFeatured: Boolean(formData.isFeatured),
        priorityOrder: Number(formData.priorityOrder) || 0,
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

  const handleToggleFeatured = async (tenant: Tenant) => {
    setTogglingFeaturedId(tenant.id);
    try {
      const nextFeatured = !tenant.isFeatured;
      const res = await toggleTenantFeatured(tenant.id, nextFeatured, tenant.priorityOrder || 0);
      if (!res.success) {
        alert(res.error || "Erro ao alterar destaque da loja.");
      }
    } catch (err: any) {
      alert(err.message || "Erro inesperado ao alterar destaque.");
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  const handleStatusToggle = async (tenant: Tenant) => {
    const nextStatus: TenantStatus = tenant.status === "active" ? "inactive" : "active";
    await toggleTenantStatus(tenant.id, nextStatus);
  };

  const handleActivateSubscription = async (tenant: Tenant) => {
    const today = new Date().getDate();
    try {
      setActivatingTenantId(tenant.id);
      const res = await activateSubscription(tenant.id, today);
      if (res.success) {
        const nextDueDateStr = res.nextDueDate ? new Date(res.nextDueDate).toLocaleDateString("pt-BR") : `dia ${res.billingDay || today} do próximo mês`;
        setSubscriptionFeedback({
          id: tenant.id,
          message: `Mensalidade ativada com sucesso! Vencimento definido para todo dia ${res.billingDay || today}. Próximo vencimento em ${nextDueDateStr} (Faltam 30 dias).`,
          type: "success",
        });
        setTimeout(() => setSubscriptionFeedback(null), 6000);
      } else {
        setSubscriptionFeedback({
          id: tenant.id,
          message: res.error || "Falha ao ativar mensalidade.",
          type: "error",
        });
        setTimeout(() => setSubscriptionFeedback(null), 5000);
      }
    } catch (e: any) {
      setSubscriptionFeedback({
        id: tenant.id,
        message: e.message || "Erro ao ativar mensalidade.",
        type: "error",
      });
      setTimeout(() => setSubscriptionFeedback(null), 5000);
    } finally {
      setActivatingTenantId(null);
    }
  };

  const handleConfirmMonthlyPayment = async (tenant: Tenant) => {
    const billingDay = tenant.billingDay || new Date().getDate();
    try {
      setConfirmingPaymentTenantId(tenant.id);
      const res = await confirmMonthlyPayment(tenant.id);
      if (res.success) {
        const nextDueDateStr = res.nextDueDate ? new Date(res.nextDueDate).toLocaleDateString("pt-BR") : `dia ${res.billingDay || billingDay}`;
        setSubscriptionFeedback({
          id: tenant.id,
          message: `Pagamento confirmado com sucesso! Mensalidade renovada (+1 mês) para a loja "${tenant.name}". Próximo vencimento em ${nextDueDateStr} (todo dia ${res.billingDay || billingDay}).`,
          type: "success",
        });
        setTimeout(() => setSubscriptionFeedback(null), 6000);
      } else {
        setSubscriptionFeedback({
          id: tenant.id,
          message: res.error || "Falha ao confirmar pagamento.",
          type: "error",
        });
        setTimeout(() => setSubscriptionFeedback(null), 5000);
      }
    } catch (e: any) {
      setSubscriptionFeedback({
        id: tenant.id,
        message: e.message || "Erro ao confirmar pagamento.",
        type: "error",
      });
      setTimeout(() => setSubscriptionFeedback(null), 5000);
    } finally {
      setConfirmingPaymentTenantId(null);
    }
  };

  const handleCancelSubscription = async (tenant: Tenant) => {
    const isConfirmed = confirm(
      `Deseja realmente cancelar a assinatura da loja "${tenant.name}"?\n\n` +
      `A loja retornará ao Modo Demonstração e o ciclo atual será limpo. Quando desejar reativá-la futuramente, bastará clicar em "Ativar Mensalidade" para capturar o novo dia e iniciar uma nova contagem de 30 dias.`
    );
    if (!isConfirmed) return;

    try {
      setCancellingSubscriptionTenantId(tenant.id);
      const res = await cancelSubscription(tenant.id);
      if (res.success) {
        setSubscriptionFeedback({
          id: tenant.id,
          message: `Assinatura da loja "${tenant.name}" cancelada com sucesso! A loja voltou ao Modo Demonstração.`,
          type: "success",
        });
        setTimeout(() => setSubscriptionFeedback(null), 6000);
      } else {
        setSubscriptionFeedback({
          id: tenant.id,
          message: res.error || "Falha ao cancelar assinatura.",
          type: "error",
        });
        setTimeout(() => setSubscriptionFeedback(null), 5000);
      }
    } catch (e: any) {
      setSubscriptionFeedback({
        id: tenant.id,
        message: e.message || "Erro ao cancelar assinatura.",
        type: "error",
      });
      setTimeout(() => setSubscriptionFeedback(null), 5000);
    } finally {
      setCancellingSubscriptionTenantId(null);
    }
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
    <div className="min-h-screen w-full max-w-full box-border overflow-x-hidden bg-slate-950 text-slate-100 pb-16 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-3.5 box-border">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 text-white shadow-lg shadow-amber-500/20">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm font-bold text-white sm:text-lg truncate">Top Food Platform</h1>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-400 border border-amber-500/30 shrink-0">
                  Super Admin
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[180px] sm:max-w-none">
                  Logado como: <strong className="text-slate-200">{currentUser?.email}</strong>
                </p>
                <button
                  onClick={openCredentialsModal}
                  className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/30 transition border border-amber-500/30 shrink-0"
                  title="Clique para alterar e-mail e senha"
                >
                  Alterar dados
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-slate-700 hover:text-white active:scale-[0.98] sm:text-sm sm:px-3.5 sm:py-2"
              title="Sincronizar lojas diretamente do Cloudflare D1 em tempo real"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={() => openNewCategoryModal("manage")}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-slate-700 hover:text-white active:scale-[0.98] sm:text-sm sm:px-3.5 sm:py-2"
              title="Gerenciar Categorias de Estabelecimentos (Doceria, Distribuidora, etc.)"
            >
              <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Categorias</span>
              <span className="sm:hidden">Categorias</span>
            </button>
            <button
              onClick={openCredentialsModal}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-300 shadow-sm transition hover:bg-amber-500/25 active:scale-[0.98] sm:text-sm sm:px-3.5 sm:py-2"
              title="Alterar e-mail e senha do Super Admin"
            >
              <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Alterar E-mail / Senha</span>
              <span className="sm:hidden">Credenciais</span>
            </button>
            <button
              onClick={openAiConfigModal}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-2.5 py-1.5 text-xs font-semibold text-purple-300 shadow-sm transition hover:bg-purple-500/25 active:scale-[0.98] sm:text-sm sm:px-3.5 sm:py-2"
              title="Configuração Global da Inteligência Artificial (Google Gemini - GEMINI_API_KEY)"
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400 shrink-0" />
              <span className="hidden sm:inline">Configurar IA (Gemini)</span>
              <span className="sm:hidden">IA Global</span>
              {isGlobalAiKeyConfigured ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span className="hidden md:inline">Ativa</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 animate-pulse">
                  <AlertCircle className="h-2.5 w-2.5" />
                  <span className="hidden md:inline">Pendente</span>
                </span>
              )}
            </button>
            <button
              onClick={() => setIsAiImportModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition hover:brightness-110 active:scale-[0.98] sm:text-sm sm:px-4 sm:py-2"
              title="Cadastro Inteligente por IA (foto ou PDF do cardápio)"
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-200 shrink-0 animate-pulse" />
              <span className="hidden sm:inline">Criar Loja por IA</span>
              <span className="sm:hidden">IA Cardápio</span>
            </button>
            <button
              onClick={() => {
                setIsModalOpen(true);
                setCreatedSuccess(null);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-red-600/30 transition hover:brightness-110 sm:text-sm sm:px-4 sm:py-2"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Cadastrar Nova Lanchonete</span>
              <span className="sm:hidden">Nova Loja</span>
            </button>
            <GlobalReloadButton variant="dark" />
            <button
              onClick={onExit}
              className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white sm:px-3 sm:py-2"
            >
              Ver Vitrine
            </button>
            <button
              onClick={() => {
                logout();
                onExit();
              }}
              title="Encerrar sessão"
              className="rounded-xl border border-red-900/50 bg-red-950/40 p-1.5 sm:p-2 text-red-400 transition hover:bg-red-900/50 hover:text-red-200"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 pt-5 sm:pt-8 box-border flex flex-col max-w-full overflow-x-hidden">
        {/* Super Admin Security / Database Banner */}
        <section className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-900/60 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-inner">
                <Database className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-white sm:text-base">
                    Gestão de Acesso do Super Admin
                  </h2>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloudflare D1 Ativo
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 break-all [overflow-wrap:anywhere]">
                  E-mail atual: <strong className="text-amber-300 font-mono">{currentUser?.email}</strong>. Você pode alterar seu e-mail e senha a qualquer momento com persistência no banco de dados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCredentialsModal}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 active:scale-[0.98] shadow-md shadow-amber-500/10 w-full sm:w-auto"
            >
              <Key className="h-4 w-4 text-amber-400" />
              Alterar E-mail e Senha
            </button>
          </div>
        </section>

        {/* KPI Platform Cards */}
        <section className="grid gap-2.5 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] w-full">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Total Lojas</span>
              <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-white">{totalTenants}</span>
              <span className="text-[11px] sm:text-xs text-emerald-400 font-semibold">{activeTenants} ativas</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-amber-300">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Lojas Destaque</span>
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span className="text-xl sm:text-3xl font-black text-amber-400">{featuredTenantsCount}</span>
              <span className="text-[11px] sm:text-xs text-amber-300/80 font-semibold">patrocinadas</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Lojas Inativas</span>
              <Power className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-3xl font-black text-white">
                {totalTenants - activeTenants}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Pedidos na Rede</span>
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-3xl font-black text-white">{totalOrders}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider truncate">Volume Faturado</span>
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-3xl font-black text-emerald-400 truncate block">
                R$ {totalRevenue.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </section>

        {/* Banner de Cadastro Inteligente por IA */}
        <section className="mt-6 rounded-3xl border border-violet-500/40 bg-gradient-to-r from-violet-950/60 via-purple-950/40 to-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-purple-950/25">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-amber-500 text-white shadow-md shadow-purple-600/30">
              <Sparkles className="h-6 w-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">Cadastro Automático de Lanchonete por IA</h3>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                  NOVO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Envie uma foto ou PDF do cardápio físico. A IA do Gemini cadastra todos os produtos, gera/extrai a logo exclusiva da lanchonete e publica a vitrine com PWA dinâmico!
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiImportModalOpen(true)}
            className="shrink-0 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-purple-600/30 hover:brightness-110 active:scale-95 transition"
          >
            <Sparkles className="h-4 w-4 text-amber-200" />
            <span>Importar Cardápio por IA</span>
          </button>
        </section>

        {/* Filter and Store List Header */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">Lanchonetes e Clientes Cadastrados</h2>
            <p className="text-xs text-slate-400">
              Gerencie instâncias, aparência da vitrine, lojas em destaque patrocinadas e credenciais.
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
                onClick={() => setStatusFilter("demo")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition ${
                  statusFilter === "demo"
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Lojas em período de teste / aguardando ativação de mensalidade"
              >
                <span>🧪 Demo ({demoTenantsCount})</span>
              </button>
              {dueSoonTenantsCount > 0 && (
                <button
                  onClick={() => setStatusFilter("due_soon")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition ${
                    statusFilter === "due_soon"
                      ? "bg-red-500/25 text-red-300 border border-red-500/40"
                      : "text-amber-400 hover:text-amber-300"
                  }`}
                  title="Mensalidades vencendo em até 5 dias ou já vencidas"
                >
                  <Clock className="h-3 w-3" />
                  <span>Vencendo ({dueSoonTenantsCount})</span>
                </button>
              )}
              <button
                onClick={() => setStatusFilter("featured")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition ${
                  statusFilter === "featured"
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Filtrar apenas lojas em destaque patrocinadas"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Destaques ({featuredTenantsCount})</span>
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

            {/* View Mode Toggle: Cards vs Credenciais vs Aparência */}
            <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  viewMode === "cards" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Visualização em Cards com Vitrine e Gestão"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("credentials")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  viewMode === "credentials" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Tabela de Gerenciamento de Logins e Senhas dos Lojistas"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Logins & Senhas ({tenants.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("appearance")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  viewMode === "appearance" ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Personalizar logo, banner, título e cor primária da vitrine principal"
              >
                <Palette className="h-3.5 w-3.5" />
                <span>Aparência da Vitrine</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section: Appearance OR Cards Grid OR Credentials Table */}
        {viewMode === "appearance" ? (
          <div className="mt-6">
            <AdminVitrineAppearance onViewVitrine={onExit} />
          </div>
        ) : filteredTenants.length === 0 ? (
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
        ) : viewMode === "credentials" ? (
          /* Tabela Completa de Credenciais dos Lojistas */
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl">
            {subscriptionFeedback && (
              <div
                className={`px-4 py-3 text-xs font-bold flex items-center justify-between border-b ${
                  subscriptionFeedback.type === "success"
                    ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
                    : "bg-red-950/80 border-red-500/40 text-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{subscriptionFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubscriptionFeedback(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Credenciais de Acesso das Lanchonetes</h3>
                  <p className="text-[11px] text-slate-400">
                    Gerenciamento direto de e-mails de login, senhas, mensalidades recorrentes no Cloudflare D1/KV
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {filteredTenants.length} {filteredTenants.length === 1 ? "loja listada" : "lojas listadas"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 uppercase text-[10px] font-bold tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Lanchonete</th>
                    <th className="px-4 py-3.5">Mensalidade & Vencimento</th>
                    <th className="px-4 py-3.5">Destaque (Marketing)</th>
                    <th className="px-4 py-3.5">Vitrine Pública</th>
                    <th className="px-4 py-3.5">Login (E-mail / Usuário)</th>
                    <th className="px-4 py-3.5">Senha de Acesso</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTenants.map((t) => {
                    const isActive = t.status === "active";
                    const email = (t as any).adminEmail || t.email;
                    const pass = (t as any).adminPassword || "123456";
                    const isPassVisible = showCardPasswords[t.id];
                    const subInfo = getSubscriptionInfo(t);

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        {/* Lanchonete */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 text-xl shadow-inner"
                              style={{
                                backgroundColor: `${t.primaryColor || "#E63946"}20`,
                                color: t.primaryColor || "#E63946",
                              }}
                            >
                              <StoreLogo logo={t.logo} name={t.name} className="h-full w-full object-cover" fallbackEmoji="🍔" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">
                                {getSafeDisplayName(t.name, "Lanchonete")}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span>{t.whatsapp}</span>
                                <span className="text-slate-600">•</span>
                                <span className="font-mono text-[10px] text-amber-400/80">ID: {t.id}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Mensalidade & Vencimento Dinâmico */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            {subInfo.status === "demo" || (subInfo.status as string) === "cancelled" ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/20 whitespace-nowrap">
                                  {(subInfo.status as string) === "cancelled" ? "❌ Cancelada" : "🧪 Demo / Aguardando"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleActivateSubscription(t)}
                                  disabled={activatingTenantId === t.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-xs font-bold transition shadow-sm disabled:opacity-50 whitespace-nowrap active:scale-[0.98]"
                                  title={`Ativar mensalidade agora (captura o dia de hoje: ${new Date().getDate()})`}
                                >
                                  {activatingTenantId === t.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CreditCard className="h-3 w-3" />
                                  )}
                                  <span>Ativar Mensalidade (Capturar Dia {new Date().getDate()})</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                      subInfo.isOverdue
                                        ? "text-red-400"
                                        : subInfo.isDueSoon
                                        ? "text-amber-400"
                                        : "text-emerald-400"
                                    }`}
                                  >
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    <span>Vence em {subInfo.dueDateFormatted}</span>
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap border ${
                                      subInfo.isOverdue
                                        ? "bg-red-500/20 text-red-300 border-red-500/40"
                                        : subInfo.isDueToday
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                                        : subInfo.isDueSoon
                                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    }`}
                                  >
                                    {subInfo.isOverdue
                                      ? `Vencida (${Math.abs(subInfo.daysRemaining || 0)}d)`
                                      : subInfo.isDueToday
                                      ? "Vence Hoje!"
                                      : `Faltam ${subInfo.daysRemaining}d`}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Todo dia {subInfo.billingDay} • R$ {(subInfo.monthlyFee || 49.9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmMonthlyPayment(t)}
                                    disabled={confirmingPaymentTenantId === t.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 whitespace-nowrap shadow-sm active:scale-[0.98]"
                                    title={`Confirmar pagamento recebido via Pix e renovar +1 mês (mantém vencimento todo dia ${subInfo.billingDay})`}
                                  >
                                    {confirmingPaymentTenantId === t.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                                    ) : (
                                      <CheckCheck className="h-3 w-3 text-emerald-400" />
                                    )}
                                    <span>Confirmar Pagamento / Renovar (+1 Mês)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelSubscription(t)}
                                    disabled={cancellingSubscriptionTenantId === t.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 whitespace-nowrap shadow-sm active:scale-[0.98] ml-1.5"
                                    title="Cancelar assinatura da loja e retornar ao Modo Demonstração"
                                  >
                                    {cancellingSubscriptionTenantId === t.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-rose-400" />
                                    ) : (
                                      <Ban className="h-3 w-3 text-rose-400" />
                                    )}
                                    <span>Cancelar Assinatura</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Destaque (Marketing Pago) */}
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(t)}
                            disabled={togglingFeaturedId === t.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                              t.isFeatured
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-amber-500/30"
                            }`}
                            title="Alternar loja em destaque (patrocinada)"
                          >
                            {togglingFeaturedId === t.id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                            ) : (
                              <Sparkles className={`h-3 w-3 ${t.isFeatured ? "text-amber-400 fill-amber-400" : "text-slate-500"}`} />
                            )}
                            <span>{t.isFeatured ? "⭐ Destaque" : "Normal"}</span>
                            {t.isFeatured && (t.priorityOrder || 0) > 0 && (
                              <span className="font-mono text-[9px] bg-amber-500/30 px-1 rounded text-amber-200">
                                P{t.priorityOrder}
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Vitrine */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                              /loja/{t.slug}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${origin}/loja/${t.slug}`, `${t.slug}-tab-pub`)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title="Copiar link da vitrine"
                            >
                              {copiedKey === `${t.slug}-tab-pub` ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onViewStoreFront) onViewStoreFront(t);
                                else window.open(`/loja/${t.slug}`, "_blank");
                              }}
                              className="p-1 text-amber-400 hover:text-amber-300 transition"
                              title="Abrir vitrine da loja"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Login */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-medium text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800 select-all">
                              {email}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(email, `${t.slug}-tab-login`)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title="Copiar login do lojista"
                            >
                              {copiedKey === `${t.slug}-tab-login` ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Senha */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-amber-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 select-all min-w-[80px]">
                              {isPassVisible ? pass : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCardPasswordVisibility(t.id)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title={isPassVisible ? "Ocultar senha" : "Ver senha"}
                            >
                              {isPassVisible ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(pass, `${t.slug}-tab-pass`)}
                              className="p-1 text-slate-400 hover:text-white transition"
                              title="Copiar senha"
                            >
                              {copiedKey === `${t.slug}-tab-pass` ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleStatusToggle(t)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                            {isActive ? "Ativa" : "Pausada"}
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedTenantForQrCode(t)}
                              className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                              title="Gerar QR Code & Placa de Divulgação (Mesa e Balcão)"
                            >
                              <QrCode className="h-3.5 w-3.5 text-amber-400" />
                              <span>QR Code</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openTenantCredentialsModal(t)}
                              className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                              title="Alterar Login e Senha no Banco de Dados"
                            >
                              <Key className="h-3.5 w-3.5" />
                              <span>Alterar Senha</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => copyMerchantWhatsAppAccess(t, email, pass)}
                              className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                              title="Copiar mensagem pronta para WhatsApp"
                            >
                              {copiedKey === `${t.slug}-whatsapp-full` ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onManageStore(t)}
                              className="flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                              title="Acessar painel de administração da loja"
                            >
                              <Settings className="h-3.5 w-3.5" />
                              <span>Painel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards Grid com Box de Credenciais e Mensalidade */
          <div className="mt-6 space-y-4">
            {subscriptionFeedback && (
              <div
                className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
                  subscriptionFeedback.type === "success"
                    ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
                    : "bg-red-950/80 border-red-500/40 text-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{subscriptionFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubscriptionFeedback(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
            {filteredTenants.map((t) => {
              const isActive = t.status === "active";
              const adminLogin = (t as any).adminEmail || t.email;
              const adminPass = (t as any).adminPassword || "123456";
              const isPassVisible = showCardPasswords[t.id];
              const subInfo = getSubscriptionInfo(t);

              return (
                <div
                  key={t.id}
                  className={`relative flex flex-col justify-between rounded-2xl border transition-all w-full min-w-0 overflow-hidden box-border ${
                    isActive
                      ? "border-slate-800 bg-slate-900/60 hover:border-slate-700 shadow-sm"
                      : "border-red-950/60 bg-slate-900/30 opacity-80"
                  }`}
                >
                  {/* Top Store Info */}
                  <div className="p-3.5 sm:p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl shadow-inner border border-white/10"
                          style={{
                            backgroundColor: `${t.primaryColor || "#E63946"}20`,
                            color: t.primaryColor || "#E63946",
                          }}
                        >
                          <StoreLogo logo={t.logo} name={t.name} className="h-full w-full object-cover" fallbackEmoji="🍔" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-base leading-tight truncate">
                              {getSafeDisplayName(t.name, "Lanchonete")}
                            </h3>
                          </div>
                          <span className="text-xs text-slate-400 block truncate">/loja/{getSafeSlug(t.slug, "loja")}</span>
                        </div>
                      </div>

                      {/* Status and Featured Badges & Toggles */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          {/* Botão de Destaque / Patrocínio */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(t)}
                            disabled={togglingFeaturedId === t.id}
                            title={
                              t.isFeatured
                                ? "Loja em destaque na vitrine (Clique para remover)"
                                : "Destacar loja na vitrine (Marketing Pago)"
                            }
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition ${
                              t.isFeatured
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-amber-500/40"
                            }`}
                          >
                            {togglingFeaturedId === t.id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                            ) : (
                              <Sparkles
                                className={`h-3 w-3 ${
                                  t.isFeatured ? "text-amber-400 fill-amber-400" : "text-slate-500"
                                }`}
                              />
                            )}
                            <span>{t.isFeatured ? "Destaque" : "Destacar"}</span>
                            {t.isFeatured && (t.priorityOrder || 0) > 0 && (
                              <span className="text-[9px] font-mono bg-amber-500/30 px-1 rounded text-amber-200">
                                P{t.priorityOrder}
                              </span>
                            )}
                          </button>

                          {/* Status Badge & Toggle */}
                          <button
                            onClick={() => handleStatusToggle(t)}
                            title={isActive ? "Clique para desativar loja" : "Clique para ativar loja"}
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? "bg-emerald-400 animate-pulse" : "bg-red-500"
                              }`}
                            />
                            {isActive ? "Ativa" : "Pausada"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-400 line-clamp-1">{t.tagline}</p>

                    {/* Meta info */}
                    <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">E-mail de Contato:</span>
                        <span className="font-medium text-slate-200 truncate" title={t.email}>{t.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">WhatsApp de Pedidos:</span>
                        <span className="font-medium text-slate-200 truncate">{t.whatsapp}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 shrink-0">Chave PIX:</span>
                        <span className="font-medium text-slate-200 truncate max-w-[170px]" title={t.pixKey}>
                          {t.pixKey}
                        </span>
                      </div>
                    </div>

                    {/* Mensalidade & Faturamento Recorrente */}
                    <div className="mt-3.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                          <span>Plano & Mensalidade</span>
                        </span>

                        {editingFeeTenantId === t.id ? (
                          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-amber-500/50">
                            <span className="text-[11px] font-bold text-amber-400">R$</span>
                            <input
                              type="number"
                              step="0.10"
                              min="0"
                              autoFocus
                              value={editingFeeValue}
                              onChange={(e) => setEditingFeeValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveMonthlyFee(t.id);
                                } else if (e.key === "Escape") {
                                  setEditingFeeTenantId(null);
                                }
                              }}
                              className="w-16 px-1 py-0.5 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-amber-400"
                              title="Pressione Enter para salvar no D1 ou Esc para cancelar"
                            />
                            <button
                              type="button"
                              disabled={isSavingFee}
                              onClick={() => handleSaveMonthlyFee(t.id)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                              title="Salvar valor no banco D1"
                            >
                              {isSavingFee ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isSavingFee}
                              onClick={() => setEditingFeeTenantId(null)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              title="Cancelar edição"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                              {(subInfo.monthlyFee || 49.9).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEditFee(t)}
                              className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition"
                              title="Editar valor da mensalidade"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Feedback de Assinatura específico deste card */}
                      {subscriptionFeedback?.id === t.id && (
                        <div
                          className={`mb-2 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            subscriptionFeedback.type === "success"
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                              : "bg-red-500/15 border-red-500/30 text-red-300"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <span className="leading-tight">{subscriptionFeedback.message}</span>
                        </div>
                      )}

                      {subInfo.status === "demo" || (subInfo.status as string) === "cancelled" ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                            <span className="text-amber-300 font-semibold flex items-center gap-1.5 text-[11px]">
                              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                              {(subInfo.status as string) === "cancelled"
                                ? "Assinatura Cancelada / Modo Demonstração"
                                : "Modo Demonstração / Aguardando Ativação"}
                            </span>
                            <span className="text-[10px] text-amber-400/80 font-mono">
                              {(subInfo.status as string) === "cancelled" ? "Cancelada" : "Aguardando Ativação"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleActivateSubscription(t)}
                            disabled={activatingTenantId === t.id}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-xs font-bold transition shadow-md shadow-emerald-900/30 disabled:opacity-50 active:scale-[0.98]"
                          >
                            {activatingTenantId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CreditCard className="h-3.5 w-3.5" />
                            )}
                            <span>Ativar Mensalidade (Capturar Dia {new Date().getDate()})</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs rounded-lg p-2.5 border bg-emerald-500/10 border-emerald-500/20">
                            <div className="flex items-center gap-1.5 text-emerald-300 min-w-0">
                              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                              <span className="text-xs font-semibold">
                                Mensalidade Ativa • Vence em <strong className="text-white font-bold">{subInfo.dueDateFormatted}</strong> ({subInfo.isOverdue
                                  ? `Vencida há ${Math.abs(subInfo.daysRemaining || 0)} dias`
                                  : subInfo.isDueToday
                                  ? "Vence Hoje!"
                                  : `Faltam ${subInfo.daysRemaining} dias`})
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap self-start sm:self-auto ${
                                subInfo.isOverdue
                                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                                  : subInfo.isDueToday
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                                  : subInfo.isDueSoon
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              {subInfo.isOverdue
                                ? `Vencida (${Math.abs(subInfo.daysRemaining || 0)}d)`
                                : subInfo.isDueToday
                                ? "Vence Hoje!"
                                : `Faltam ${subInfo.daysRemaining} dias`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                            <span>Ciclo: Todo dia <strong className="text-slate-300">{subInfo.billingDay}</strong></span>
                            <span>Valor: <strong className="text-slate-300">R$ {(subInfo.monthlyFee || 49.9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmMonthlyPayment(t)}
                              disabled={confirmingPaymentTenantId === t.id}
                              className="flex-1 w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 py-2 text-xs font-bold transition disabled:opacity-50 active:scale-[0.98] shadow-sm"
                              title={`Confirmar pagamento recebido via Pix e renovar +1 mês (mantém vencimento todo dia ${subInfo.billingDay})`}
                            >
                              {confirmingPaymentTenantId === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                              ) : (
                                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                              )}
                              <span>Confirmar Pagamento / Renovar (+1 Mês)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelSubscription(t)}
                              disabled={cancellingSubscriptionTenantId === t.id}
                              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 px-3 py-2 text-xs font-bold transition disabled:opacity-50 active:scale-[0.98] shadow-sm whitespace-nowrap"
                              title="Cancelar assinatura da loja e retornar ao Modo Demonstração"
                            >
                              {cancellingSubscriptionTenantId === t.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                              ) : (
                                <Ban className="h-3.5 w-3.5 text-rose-400" />
                              )}
                              <span>Cancelar Assinatura</span>
                            </button>
                          </div>
                        </div>
                      )}
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
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 sm:p-3 space-y-3">
                      {/* a) Vitrine Pública do Cliente */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                          <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                            <Store className="h-3.5 w-3.5" /> Vitrine Pública (Cliente)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">/loja/{t.slug}</span>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-1.5">
                          <div
                            className="w-full sm:w-auto flex-1 rounded-lg border border-slate-800/90 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 select-all break-all [overflow-wrap:anywhere]"
                            title={`${origin}/loja/${t.slug}`}
                          >
                            {origin}/loja/{t.slug}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${origin}/loja/${t.slug}`, `${t.slug}-public`)}
                              className={`flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                copiedKey === `${t.slug}-public`
                                  ? "bg-emerald-500 text-white"
                                  : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                              }`}
                              title="Copiar Link da Vitrine Pública"
                            >
                              {copiedKey === `${t.slug}-public` ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 shrink-0" />
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
                              className="flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                              title="Abrir Vitrine Pública da Lanchonete"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span>Abrir Loja</span>
                            </button>
                          </div>
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
                        <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-1.5">
                          <div
                            className="w-full sm:w-auto flex-1 rounded-lg border border-slate-800/90 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 select-all break-all [overflow-wrap:anywhere]"
                            title={`${origin}/admin?tenant=${t.slug}`}
                          >
                            {origin}/admin?tenant={t.slug}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`${origin}/admin?tenant=${t.slug}`, `${t.slug}-admin`)}
                              className={`flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                copiedKey === `${t.slug}-admin`
                                  ? "bg-emerald-500 text-white"
                                  : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                              }`}
                              title="Copiar Link de Acesso ao Painel Admin"
                            >
                              {copiedKey === `${t.slug}-admin` ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 shrink-0" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onManageStore(t)}
                              className="flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/20 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30 transition"
                              title="Acessar Painel de Administração desta Loja"
                            >
                              <Settings className="h-3.5 w-3.5 shrink-0" />
                              <span>Gerenciar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* c) Credenciais de Acesso do Lojista (Login & Senha) */}
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 sm:p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <Key className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span>Acesso do Lojista (Login & Senha)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openTenantCredentialsModal(t)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline transition shrink-0"
                          title="Alterar e-mail e senha no banco de dados"
                        >
                          <span>Alterar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Login */}
                        <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 min-w-0">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Login (E-mail):
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="font-mono text-slate-200 text-xs select-all break-all [overflow-wrap:anywhere]" title={adminLogin}>
                              {adminLogin}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(adminLogin, `${t.slug}-login`)}
                              className="shrink-0 p-1 text-slate-400 hover:text-white transition"
                              title="Copiar login do lojista"
                            >
                              {copiedKey === `${t.slug}-login` ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Senha */}
                        <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 min-w-0">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Senha Atual:
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="font-mono font-medium text-amber-300 text-xs select-all break-all [overflow-wrap:anywhere]">
                              {isPassVisible ? adminPass : "••••••••"}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleCardPasswordVisibility(t.id)}
                                className="p-1 text-slate-400 hover:text-slate-200 transition"
                                title={isPassVisible ? "Ocultar senha" : "Ver senha em texto claro"}
                              >
                                {isPassVisible ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(adminPass, `${t.slug}-pass`)}
                                className="p-1 text-slate-400 hover:text-white transition"
                                title="Copiar senha do lojista"
                              >
                                {copiedKey === `${t.slug}-pass` ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Envio de Acesso WhatsApp */}
                      <button
                        type="button"
                        onClick={() => copyMerchantWhatsAppAccess(t, adminLogin, adminPass)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1.5 px-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                        title="Copiar mensagem formatada com login e senha para enviar ao lojista"
                      >
                        {copiedKey === `${t.slug}-whatsapp-full` ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Mensagem de Acesso Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copiar Acesso Formatado (WhatsApp)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => onManageStore(t)}
                        className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl bg-amber-500/15 py-2 px-2.5 sm:px-3 text-xs font-semibold text-amber-300 border border-amber-500/30 transition hover:bg-amber-500/25"
                      >
                        <Settings className="h-3.5 w-3.5 shrink-0" />
                        <span>Gerenciar Loja</span>
                      </button>

                      <button
                        onClick={() => openTenantCredentialsModal(t)}
                        className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 py-2 px-2.5 sm:px-3 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30"
                        title="Alterar Login e Senha do Lojista no Banco de Dados"
                      >
                        <Key className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>Alterar Login / Senha</span>
                      </button>

                      <button
                        onClick={() => handleOpenStoreConfig(t)}
                        className="w-full sm:w-auto justify-center flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 py-2 px-2.5 sm:px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-750 hover:text-white"
                        title="Configurações da Loja e Foto/Banner da Vitrine"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>Configurações & Banner</span>
                      </button>

                      <button
                        onClick={() => setSelectedTenantForQrCode(t)}
                        className="w-full sm:w-auto justify-center flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 py-2 px-2.5 sm:px-3 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25"
                        title="Gerar QR Code & Placa de Divulgação (Mesa e Balcão)"
                      >
                        <QrCode className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>QR Code & Placa</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(t)}
                      title="Excluir Lanchonete"
                      className="w-full sm:w-auto justify-center flex items-center gap-1 rounded-xl border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Cadastrar Nova Lanchonete */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl text-slate-100 box-border">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Cadastrar Nova Lanchonete</h3>
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
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Store className="h-4 w-4 shrink-0" /> Link da Vitrine Pública do Cliente
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Para os clientes pedirem</span>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2">
                    <div className="w-full sm:w-auto flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 select-all break-all [overflow-wrap:anywhere]">
                      {origin}/loja/{createdSuccess.tenant.slug}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `${origin}/loja/${createdSuccess.tenant.slug}`,
                            "modal-public"
                          )
                        }
                        className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
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
                        className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Abrir Loja</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* b) Link de Acesso ao Painel Admin da Loja */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                      <Settings className="h-4 w-4 shrink-0" /> Link de Acesso ao Painel Admin da Loja
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Para o lojista gerenciar</span>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2">
                    <div className="w-full sm:w-auto flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200 select-all break-all [overflow-wrap:anywhere]">
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
                      className={`flex w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
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

                {/* Credenciais de Acesso do Lojista */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-300 pb-2 border-b border-slate-800">
                    <span>Credenciais da Conta do Lojista</span>
                    <button
                      type="button"
                      onClick={() => {
                        const message = `⚙️ Dados de Acesso ao Painel do Lojista - Top Food\n🏪 Loja: ${createdSuccess.tenant.name}\n\n⚙️ Painel de Gestão da Loja:\n${origin}/admin?tenant=${createdSuccess.tenant.slug}\n\n🔑 E-mail de login: ${createdSuccess.email}\n🔒 Senha: ${createdSuccess.pass}`;
                        copyToClipboard(message, "modal-creds");
                      }}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                    >
                      {copiedKey === "modal-creds" ? "Dados Copiados!" : "Copiar Acesso p/ Lojista (WhatsApp)"}
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

                {/* Mensagem Pronta Exclusiva para Enviar aos Clientes */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="text-xs">
                    <span className="font-bold text-amber-300 block">Mensagem Pronta para Divulgar aos Clientes</span>
                    <span className="text-[11px] text-slate-400">Link 100% público da vitrine (sem senhas ou tokens)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const message = `🍔 Olá! Nosso cardápio digital oficial já está aberto! Acesse e faça seu pedido direto por aqui:\n\n${origin}/loja/${createdSuccess.tenant.slug}`;
                      copyToClipboard(message, "modal-client-msg");
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition shadow-sm"
                  >
                    {copiedKey === "modal-client-msg" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        <span>Mensagem Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar Mensagem p/ Clientes</span>
                      </>
                    )}
                  </button>
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
                        bannerImage: "",
                        businessType: "Lanchonetes",
                        isFeatured: false,
                        priorityOrder: 0,
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WhatsApp para Pedidos
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
                      Taxa de Entrega (R$)
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mensalidade (R$/mês)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={formData.monthlyFee}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, monthlyFee: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Categoria do Estabelecimento */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Tag className="h-3.5 w-3.5 text-amber-400" />
                      <span>Categoria do Estabelecimento *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => openNewCategoryModal("new")}
                      className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
                      title="Cadastrar nova categoria no banco de dados Cloudflare D1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Nova Categoria</span>
                    </button>
                  </div>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, businessType: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Define em qual carrossel e seção da vitrine principal esta loja será agrupada.
                  </p>
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

                {/* Destaque & Marketing Pago (Patrocinada) */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Destaque & Marketing Pago (Vitrine Principal)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>Destacar na Vitrine (Patrocinada)</span>
                    </label>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Ordem de Prioridade (0, 1, 2...):</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.priorityOrder}
                        onChange={(e) => setFormData((prev) => ({ ...prev, priorityOrder: Number(e.target.value) || 0 }))}
                        placeholder="0"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
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

      {/* Tenant Store Credentials Modal (Super Admin managing merchant login and password) */}
      {isTenantCredentialsModalOpen && selectedTenantForCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl my-8 box-border">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-400">
                  <Key className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg">
                    Credenciais do Lojista
                  </h3>
                  <p className="text-xs text-slate-400">
                    Gerenciamento de Login e Senha para o Painel da Loja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTenantCredentialsModalOpen(false);
                  setSelectedTenantForCredentials(null);
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Store Information Badge */}
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 text-xl shadow-inner"
                style={{
                  backgroundColor: `${selectedTenantForCredentials.primaryColor || "#E63946"}20`,
                  color: selectedTenantForCredentials.primaryColor || "#E63946",
                }}
              >
                <StoreLogo
                  logo={selectedTenantForCredentials.logo}
                  name={selectedTenantForCredentials.name}
                  className="h-full w-full object-cover"
                  fallbackEmoji="🍔"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm truncate">
                  {getSafeDisplayName(selectedTenantForCredentials.name, "Lanchonete")}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-amber-400">/loja/{selectedTenantForCredentials.slug}</span>
                  <span>•</span>
                  <span>ID: {selectedTenantForCredentials.id}</span>
                </div>
              </div>
            </div>

            {/* Cloudflare D1 Info */}
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3 flex items-start gap-2.5 text-xs text-slate-300">
              <Database className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Persistência Cloudflare D1 & KV:</span>
                <p className="text-slate-400 mt-0.5">
                  Ao salvar, os novos dados são atualizados no banco de dados e o lojista poderá entrar no painel imediatamente via <code className="text-amber-300 font-mono">/admin?tenant={selectedTenantForCredentials.slug}</code>.
                </p>
              </div>
            </div>

            {/* Success Message */}
            {tenantCredentialsSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-xs text-emerald-200">
                <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Sucesso! Credenciais Salvas</span>
                </div>
                <p>{tenantCredentialsSuccess}</p>
              </div>
            )}

            {/* Error Message */}
            {tenantCredentialsError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{tenantCredentialsError}</span>
              </div>
            )}

            <form onSubmit={handleTenantCredentialsSubmit} className="space-y-4">
              {/* Login Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Login da Loja (E-mail / Usuário de Acesso) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={tenantAdminEmail}
                    onChange={(e) => setTenantAdminEmail(e.target.value)}
                    placeholder="lojista@restaurante.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <span className="block mt-1 text-[11px] text-slate-500">
                  Este e-mail é utilizado pelo lojista para acessar o painel administrativo da lanchonete.
                </span>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Senha de Acesso da Loja *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    Gerar Senha Forte
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showTenantAdminPassword ? "text" : "password"}
                    required
                    value={tenantAdminPassword}
                    onChange={(e) => setTenantAdminPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTenantAdminPassword(!showTenantAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showTenantAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="block mt-1 text-[11px] text-slate-500">
                  Senha segura para login do gerente/lojista.
                </span>
              </div>

              {/* Botão para Copiar Acesso Completo p/ WhatsApp */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">
                      Enviar Acesso ao Lojista
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      Copia texto pronto com links, login e senha formatados
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyMerchantWhatsAppAccess(selectedTenantForCredentials, tenantAdminEmail, tenantAdminPassword)}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition shrink-0"
                  >
                    {copiedTenantCredentialsMsg ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsTenantCredentialsModalOpen(false);
                    setSelectedTenantForCredentials(null);
                  }}
                  className="w-1/3 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={tenantCredentialsLoading}
                  className="w-2/3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {tenantCredentialsLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Salvando no D1...</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5" />
                      <span>Salvar Credenciais no Banco</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Credentials Modal */}
      {isCredentialsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl my-8 box-border">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-700 bg-slate-900 p-4 sm:p-6 shadow-2xl animate-scale-in text-white my-auto box-border">
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

                  {/* Categoria do Estabelecimento */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-300 font-semibold">
                        Categoria *
                      </label>
                      <button
                        type="button"
                        onClick={() => openNewCategoryModal("edit")}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition"
                        title="Cadastrar nova categoria no banco de dados"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Nova Categoria</span>
                      </button>
                    </div>
                    <select
                      value={configForm.businessType}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, businessType: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
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
                    <label className="block text-slate-300 font-semibold mb-1">Valor da Mensalidade (R$/mês)</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={configForm.monthlyFee}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, monthlyFee: parseFloat(e.target.value) || 0 }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
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

              {/* 5. CREDENCIAIS DE LOGIN DO LOJISTA */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Key className="h-4 w-4 text-amber-400" />
                    <span>5. Credenciais de Login e Senha da Loja</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80 font-mono">D1 / KV Persistência</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Login (E-mail do Lojista)</label>
                    <input
                      type="email"
                      value={configForm.adminEmail}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                      placeholder="admin@sualoja.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-300 font-semibold">Senha de Acesso</label>
                      <button
                        type="button"
                        onClick={() => {
                          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
                          let pwd = "";
                          for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                          setConfigForm((prev) => ({ ...prev, adminPassword: pwd }));
                        }}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Gerar aleatória
                      </button>
                    </div>
                    <input
                      type="text"
                      value={configForm.adminPassword}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                      placeholder="Senha do lojista"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ao salvar, essas credenciais serão salvas imediatamente no Cloudflare D1 e o lojista poderá entrar no painel com este novo e-mail e senha.
                </p>
              </div>

              {/* 6. DESTAQUE E PATROCÍNIO (MARKETING PAGO) */}
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>6. Destaque na Vitrine & Marketing Pago</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Patrocinado</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 p-3 cursor-pointer hover:border-amber-500/50 transition">
                    <input
                      type="checkbox"
                      checked={configForm.isFeatured}
                      onChange={(e) => setConfigForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="block font-bold text-white">⭐ Ativar Loja em Destaque</span>
                      <span className="text-[11px] text-slate-400">Exibe a loja na seção VIP / Patrocinadas da vitrine</span>
                    </div>
                  </label>

                  <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                    <label className="block text-slate-300 font-semibold mb-1">
                      Ordem de Prioridade (Ex: 1 para 1º lugar)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={configForm.priorityOrder}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, priorityOrder: Number(e.target.value) || 0 }))
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Lojas com destaque ativo e prioridade aparecem primeiro na vitrine do Top Food.
                    </span>
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

      {/* Modal de Importação de Cardápio e Criação de Loja por IA */}
      <AiMenuImportModal
        isOpen={isAiImportModalOpen}
        onClose={() => {
          setIsAiImportModalOpen(false);
          refreshTenants();
        }}
        onSuccess={() => {
          refreshTenants();
        }}
      />

      {/* MODAL: Gerenciar & Cadastrar Nova Categoria de Estabelecimentos */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl text-slate-100 box-border">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Categorias de Estabelecimentos</h3>
                  <p className="text-xs text-slate-400">
                    Defina categorias para agrupar lojas em carrosséis e filtros na vitrine.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Mensagens de Feedback */}
            {categorySuccess && (
              <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{categorySuccess}</span>
              </div>
            )}

            {categoryError && (
              <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{categoryError}</span>
              </div>
            )}

            {/* Formulário: Nova Categoria */}
            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Cadastrar Nova Categoria
                </span>
                {categoryTargetForm !== "manage" && (
                  <span className="text-[10px] text-slate-400">
                    Será atribuída à loja em {categoryTargetForm === "new" ? "criação" : "edição"}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Doceria, Distribuidora, Hamburgueria..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ícone / Emoji
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="w-14 text-center rounded-xl border border-slate-700 bg-slate-900 py-1.5 text-base text-white outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-400">Emoji da vitrine</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={newCategoryOrder}
                    onChange={(e) => setNewCategoryOrder(Number(e.target.value) || 10)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Atalhos Rápidos de Emojis */}
              <div>
                <span className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Sugestões de Emojis:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["🍰", "🍺", "🍔", "🍕", "🍨", "🍧", "🥩", "🍣", "☕", "🥖", "🥤", "🥗", "🌮", "🍩", "🍫", "🍗", "🥪", "🍱", "🍇", "🛒"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCategoryIcon(emoji)}
                      className={`h-7 w-7 rounded-lg text-sm flex items-center justify-center transition ${
                        newCategoryIcon === emoji
                          ? "bg-amber-500/30 border border-amber-400 scale-110"
                          : "bg-slate-900 border border-slate-800 hover:border-slate-600"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingCategory || !newCategoryName.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Salvando no D1...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Salvar Categoria</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Listagem de Categorias Existentes */}
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Categorias Ativas ({availableCategories.length})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Sincronizado Cloudflare D1
                </span>
              </div>

              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/60 max-h-56 overflow-y-auto">
                {availableCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-900/50 transition"
                  >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base">{cat.icon}</span>
                        <div className="truncate">
                          <span className="font-semibold text-white truncate block">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ordem: {cat.order ?? 99} • slug: {cat.slug || cat.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {categoryTargetForm !== "manage" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (categoryTargetForm === "new") {
                                setFormData((prev) => ({ ...prev, businessType: cat.name }));
                              } else if (categoryTargetForm === "edit") {
                                setConfigForm((prev) => ({ ...prev, businessType: cat.name }));
                              }
                              setIsCategoryModalOpen(false);
                            }}
                            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                          >
                            Selecionar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-red-950 hover:text-red-400 transition"
                          title={`Excluir categoria "${cat.name}"`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Configuração Global da Inteligência Artificial (Google Gemini) */}
      {isAiConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-purple-500/30 bg-slate-900 p-4 sm:p-6 shadow-2xl text-slate-100 box-border">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Inteligência Artificial (Google Gemini)</h3>
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configuração global da chave GEMINI_API_KEY para toda a plataforma.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiConfigModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSaveAiConfig} className="mt-4 space-y-4">
              <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-purple-200">
                  🔒 Acesso Centralizado e Seguro:
                </p>
                <p className="text-slate-400 leading-relaxed">
                  A chave configurada aqui é gerenciada exclusivamente pelo Super Admin. Os lojistas não possuem acesso visual nem permissão para alterar esta chave.
                </p>
                <div className="pt-1 flex flex-col gap-1 text-[11px] text-purple-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Importação e leitura de cardápios físicos (fotos e PDF) via Gemini Multimodal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Geração automática de fotos realistas em alta definição para produtos</span>
                  </div>
                </div>
              </div>

              {aiConfigError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{aiConfigError}</span>
                </div>
              )}

              {aiConfigSuccess && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{aiConfigSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="global-gemini-key" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    Chave de API do Gemini (GEMINI_API_KEY)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
                  >
                    <span>Obter chave gratuita</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    id="global-gemini-key"
                    type={showGlobalGeminiKey ? "text" : "password"}
                    value={globalGeminiKeyInput}
                    onChange={(e) => setGlobalGeminiKeyInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 pr-20 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono transition"
                    placeholder="Cole aqui a chave AIzaSy..."
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowGlobalGeminiKey(!showGlobalGeminiKey)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title={showGlobalGeminiKey ? "Ocultar chave" : "Mostrar chave"}
                    >
                      {showGlobalGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {globalGeminiKeyInput && (
                      <button
                        type="button"
                        onClick={() => setGlobalGeminiKeyInput("")}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        title="Limpar chave"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  {globalGeminiKeyInput.trim()
                    ? "✓ Chave informada. Clique em 'Salvar Configuração Global' para gravar no sistema."
                    : "⚠️ Sem chave configurada, os recursos de IA solicitarão a chave antes de executar a análise."}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                {isGlobalAiKeyConfigured ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiConfigModalOpen(false);
                      setIsAiImportModalOpen(true);
                    }}
                    className="w-full sm:w-auto text-xs text-purple-300 hover:text-white flex items-center gap-1 underline"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Abrir Criar Loja por IA</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAiConfigModalOpen(false)}
                    className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={aiConfigSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {aiConfigSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Salvar Configuração Global</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de QR Code & Placa de Divulgação */}
      {selectedTenantForQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
            <StoreQrCodePlate
              tenant={selectedTenantForQrCode}
              onClose={() => setSelectedTenantForQrCode(null)}
              isModal
              isSuperAdmin
            />
          </div>
        </div>
      )}
    </div>
  );
}
