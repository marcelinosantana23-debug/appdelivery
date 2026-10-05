import { Search, Sparkles, Store, UtensilsCrossed, ShieldCheck, MessageCircle, X } from "lucide-react";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";
import { LocalitySelector } from "@/components/portal/LocalitySelector";
import { useStore } from "@/context/StoreContext";

const POPULAR_SEARCH_CHIPS = [
  { label: "Hambúrgueres", icon: "🍔", term: "Hambúrguer", categoryId: "hamburgueres" },
  { label: "Pizzarias", icon: "🍕", term: "Pizza", categoryId: "pizzarias" },
  { label: "Açaí", icon: "🍧", term: "Açaí", categoryId: "acaiterias" },
  { label: "Japonesa", icon: "🍣", term: "Japonesa", categoryId: "japonesa" },
  { label: "Padarias", icon: "🥖", term: "Padaria", categoryId: "padarias-cafes" },
  { label: "Sorvetes", icon: "🍨", term: "Sorvete", categoryId: "sorveterias" },
  { label: "Churrasco", icon: "🥩", term: "Churrasco", categoryId: "churrascaria" },
  { label: "Doces", icon: "🍰", term: "Doces", categoryId: "doces" },
];

interface PortalHeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onStoreAdminClick?: () => void;
  totalStores?: number;
  selectedCategory?: string;
  onSelectCategory?: (catId: string) => void;
}

export function PortalHeader({
  searchQuery,
  onSearchChange,
  onStoreAdminClick,
  totalStores,
  selectedCategory = "todos",
  onSelectCategory,
}: PortalHeaderProps) {
  const { platformSettings, isLoadingTenants, tenants } = useStore();
  const activeStoresCount =
    typeof totalStores === "number" && totalStores > 0
      ? totalStores
      : (tenants || []).filter((t) => t.status !== "inactive").length;

  const bannerImg =
    platformSettings?.bannerUrl?.trim() ||
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80";
  const logoImg = platformSettings?.logoUrl?.trim() || "";
  const displayTitle =
    platformSettings?.heroTitle && platformSettings.heroTitle.trim() !== "Top Food - O Portal do Delivery"
      ? platformSettings.heroTitle.trim()
      : "Top Food";
  const heroSubtitle =
    platformSettings?.heroSubtitle?.trim() ||
    "O seu portal de delivery para as melhores lanchonetes, pizzarias, açaíterias e restaurantes.";
  const primaryColor = platformSettings?.primaryColor?.trim() || "#E63946";

  // WhatsApp para Cadastro de Lojas/Parceiros
  const partnerPhoneRaw = (
    platformSettings?.partnerWhatsapp ||
    platformSettings?.adminWhatsapp ||
    "5511999999999"
  ).replace(/\D/g, "");
  const cleanPartnerPhone = partnerPhoneRaw.startsWith("55") ? partnerPhoneRaw : `55${partnerPhoneRaw}`;
  const partnerMessage = encodeURIComponent(
    "Olá! Vi o Top Food e tenho interesse em cadastrar minha loja na plataforma."
  );
  const whatsappPartnerUrl = `https://wa.me/${cleanPartnerPhone}?text=${partnerMessage}`;

  return (
    <header className="relative w-full bg-white dark:bg-slate-900 shadow-sm border-b border-gray-100 dark:border-slate-800 transition-colors">
      {/* 1. BANNER PRINCIPAL DO PORTAL (Grande, imersivo e com efeito 3D de sobreposição) */}
      <div className="relative min-h-[220px] h-52 sm:h-60 md:h-72 w-full overflow-hidden bg-slate-900">
        {/* Imagem de Capa Marketplace */}
        <img
          src={bannerImg}
          alt={displayTitle}
          className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
        />

        {/* Gradiente escuro para legibilidade perfeita */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30" />

        {/* Barra superior flutuante em UMA ÚNICA LINHA (Lado Esquerdo + Lado Direito com space-between) */}
        <div className="absolute inset-x-0 top-0 z-30 mx-auto max-w-5xl px-2 sm:px-4 pt-2.5 sm:pt-3">
          <div className="flex flex-row flex-nowrap items-center justify-between gap-2 w-full h-8 sm:h-9">
            {/* LADO ESQUERDO: Logo Top Food + Pílula de Localidade colada ao lado */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
              {/* Logo Top Food */}
              <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-white/95 backdrop-blur-md shadow-xs shrink-0 h-7">
                <UtensilsCrossed className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap">Top Food</span>
              </div>

              {/* Pílula de Localidade (📍 Nome da Localidade ▾) */}
              <LocalitySelector />
            </div>

            {/* LADO DIREITO: Botão "Instalar" + Atualizar (🔄 circular) + Área do Lojista */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
              <PWAInstallButton
                variant="header"
                className="h-7 px-2 py-1 text-[10px] sm:text-xs"
              />
              <GlobalReloadButton
                variant="glass"
                showLabel={false}
                className="h-7 w-7 text-white/95"
              />
              {onStoreAdminClick && (
                <button
                  type="button"
                  onClick={onStoreAdminClick}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-black/45 hover:bg-black/65 px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold text-white/95 backdrop-blur-md shadow-xs transition active:scale-95 cursor-pointer h-7"
                  title="Acessar painel do lojista"
                >
                  <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-300 shrink-0" />
                  <span className="hidden xs:inline">Lojista</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INFORMAÇÕES DO PORTAL (Logo com sobreposição 3D sobre o banner e título 100% na área clara) */}
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pb-5 sm:pb-6">
        <div className="relative z-20 flex flex-col md:flex-row md:items-end md:justify-between gap-2.5 sm:gap-4">
          <div className="flex items-start sm:items-end gap-3 sm:gap-5 min-w-0 flex-1">
            {/* Logo Oficial ou Ícone do Top Food (TF) - apenas a logo tem sobreposição negativa sobre o banner */}
            <div
              id="topfood-portal-logo"
              className="relative z-20 -mt-10 sm:-mt-16 md:-mt-20 flex h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white dark:border-slate-900 shadow-2xl select-none bg-slate-950 transition-transform duration-300 hover:scale-105 hover:-translate-y-1"
              style={{
                boxShadow: `0 16px 36px -8px ${primaryColor}55, 0 4px 14px rgba(0,0,0,0.3)`,
              }}
            >
              {logoImg ? (
                <img
                  src={logoImg}
                  alt="Logo Oficial Top Food"
                  className="h-full w-full object-cover object-center"
                  onError={(e) => {
                    // Fallback se imagem quebrar
                    e.currentTarget.style.display = "none";
                    const fallback = document.getElementById("tf-logo-fallback");
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                id="tf-logo-fallback"
                className={`h-full w-full flex flex-col items-center justify-center text-white ${
                  logoImg ? "hidden" : "flex"
                }`}
                style={{
                  backgroundColor: primaryColor,
                }}
              >
                <div className="text-center font-black leading-none drop-shadow-md select-none">
                  <span className="text-2xl sm:text-3xl md:text-4xl tracking-tighter">TF</span>
                  <span className="block text-[8px] sm:text-[9px] font-extrabold tracking-widest text-amber-200 uppercase mt-0.5">
                    Delivery
                  </span>
                </div>
              </div>
            </div>

            {/* Nome da Plataforma, Tag Multi-Lojas, Botão Mobile Compacto e Descrição */}
            <div className="flex-1 min-w-0 pt-2.5 sm:pt-4 md:pt-5 pb-0.5 sm:pb-2">
              {/* Linha do Título + Botão "Cadastre sua loja aqui" compacto no mobile */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white leading-tight truncate">
                    {displayTitle}
                  </h1>
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold shadow-xs transition shrink-0"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      borderColor: `${primaryColor}40`,
                      color: primaryColor,
                    }}
                  >
                    <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">Multi-Lojas</span>
                  </span>
                </div>

                {/* Botão "Cadastre sua loja aqui" compacto no mobile ao lado do título */}
                <a
                  href={whatsappPartnerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="md:hidden inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-2.5 py-1.5 shadow-sm shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer border border-emerald-400/30 shrink-0"
                  title="Cadastre sua loja no Top Food pelo WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-100 shrink-0" />
                  <span className="whitespace-nowrap">Cadastre sua loja aqui</span>
                </a>
              </div>

              {/* Descrição com espaçamento limpo e elegante */}
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed mt-1.5 max-w-2xl">
                {heroSubtitle}
              </p>
            </div>
          </div>

          {/* Botão de Atração de Novos Parceiros ("Cadastre sua loja aqui") - Visível em telas md+ */}
          <div className="hidden md:block shrink-0 self-end mb-2">
            <a
              href={whatsappPartnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm px-4 py-2.5 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-emerald-400/30"
              title="Cadastre sua loja no Top Food pelo WhatsApp"
            >
              <MessageCircle className="h-4 w-4 text-emerald-100 shrink-0" />
              <span className="whitespace-nowrap">Cadastre sua loja aqui</span>
            </a>
          </div>
        </div>

        {/* 3. Barra de Busca Global e Contador de Lojas na MESMA LINHA (Mobile & Desktop) */}
        <div className="mt-4 sm:mt-5 space-y-2.5">
          <div className="flex flex-row items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0 group">
              <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors text-gray-400 group-focus-within:text-amber-500 dark:text-gray-500 pointer-events-none" />
              {/* Input Mobile com placeholder curto */}
              <input
                type="text"
                id="portal-search-input-mobile"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onSearchChange("");
                  }
                }}
                placeholder="Buscar lojas ou pratos..."
                className="sm:hidden w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/90 pl-9 pr-8 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all shadow-sm focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20"
              />
              {/* Input Desktop/Tablet com placeholder completo */}
              <input
                type="text"
                id="portal-search-input"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    onSearchChange("");
                  }
                }}
                placeholder="Buscar lojas por nome, categoria ou culinária (ex: burger, pizza, açaí, japonesa)..."
                className="hidden sm:block w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/90 pl-10 pr-10 py-2.5 sm:py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all shadow-sm focus:border-amber-500/80 focus:ring-2 focus:ring-amber-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 transition cursor-pointer"
                  title="Limpar busca (Esc)"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Contador de Lojas fixo e compacto à direita na mesma linha */}
            <div className="flex items-center shrink-0 rounded-xl border border-gray-200/80 dark:border-slate-700/80 bg-gray-50/90 dark:bg-slate-800/80 px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 shadow-2xs">
              <span className="flex items-center gap-1 sm:gap-1.5 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" style={{ color: primaryColor }} />
                {isLoadingTenants && activeStoresCount === 0 ? (
                  <span className="inline-block h-3.5 w-16 sm:w-20 bg-gray-200 dark:bg-slate-700 animate-pulse rounded" />
                ) : (
                  `${activeStoresCount} ${activeStoresCount === 1 ? "loja parceira" : "lojas parceiras"}`
                )}
              </span>
            </div>
          </div>

          {/* 4. Secção de Populares: rótulo "POPULARES:" sempre visível em mobile e desktop + rolagem horizontal */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0 whitespace-nowrap">
              POPULARES:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {POPULAR_SEARCH_CHIPS.map((chip) => {
                const isSelected =
                  (onSelectCategory && selectedCategory.toLowerCase() === chip.categoryId.toLowerCase()) ||
                  searchQuery.toLowerCase().trim() === chip.term.toLowerCase();
                return (
                  <button
                    key={chip.term}
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) {
                        onSearchChange("");
                        if (selectedCategory.toLowerCase() === chip.categoryId.toLowerCase()) {
                          onSelectCategory("todos");
                        } else {
                          onSelectCategory(chip.categoryId);
                        }
                      } else if (isSelected) {
                        onSearchChange("");
                      } else {
                        onSearchChange(chip.term);
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer border ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                        : "bg-gray-100/90 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300 border-gray-200/80 dark:border-slate-700/80 hover:bg-gray-200/80 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-xs">{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
