import { Clock, MapPin, Store, AlertTriangle, Bike, Sparkles, ArrowLeft } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { StoreLogo } from "@/components/common/StoreLogo";
import { getSafeDisplayName } from "@/utils/storeFormat";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { GlobalReloadButton } from "@/components/common/GlobalReloadButton";

interface HeaderProps {
  onAdminClick?: () => void;
  onStoreAdminClick?: () => void;
  onSuperAdminClick?: () => void;
  onBackToPortal?: () => void;
}

export function Header(props: HeaderProps = {}) {
  const { isStoreOpen, isStoreActive, config, getStoreActiveStories, openStoreStoriesModal } = useStore();

  const hasBanner = Boolean(config.bannerImage);
  const stories = getStoreActiveStories(config.id || config.slug);
  const hasStories = stories.length > 0;
  const latestStory = hasStories ? stories[stories.length - 1] : null;
  const storyPreviewUrl = latestStory?.mediaUrl || (latestStory as any)?.imageUrl;

  return (
    <header className="relative w-full bg-white dark:bg-slate-900 shadow-sm border-b border-gray-100 dark:border-slate-800 transition-colors">
      {/* Inactive store notification banner */}
      {!isStoreActive && (
        <div className="relative z-30 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Esta lanchonete está temporariamente desativada pela plataforma. Pedidos suspensos.</span>
        </div>
      )}

      {/* 1. FOTO DA LANCHONETE / BANNER DA VITRINE (Capa estilo iFood/Delivery) */}
      <div className="relative min-h-[190px] h-48 sm:h-56 md:h-64 w-full overflow-hidden bg-slate-900">
        {hasBanner ? (
          <img
            src={config.bannerImage}
            alt={`Banner de ${config.name}`}
            className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full bg-primary-dark"
            style={{
              background: `linear-gradient(135deg, var(--color-primary-dark, #C1121F) 0%, var(--color-primary, #E63946) 50%, var(--color-primary-light, #F77F00) 100%)`,
            }}
          />
        )}

        {/* Gradiente escuro para legibilidade perfeita dos controles e textos */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/30" />

        {/* Top Floating Toolbar - Clean customer-facing interface em UMA ÚNICA LINHA horizontal */}
        <div className="absolute inset-x-0 top-0 z-20 mx-auto max-w-4xl px-2.5 sm:px-4 pt-2.5 sm:pt-3">
          <div className="flex flex-row flex-nowrap items-center justify-between gap-1.5 sm:gap-2 w-full">
            {/* CANTO ESQUERDO: Botão "← Início" e o nome/ícone da loja */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
              {props.onBackToPortal && (
                <button
                  type="button"
                  onClick={props.onBackToPortal}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-black/45 hover:bg-black/65 px-2 py-1 text-[11px] sm:text-xs font-semibold text-white/95 backdrop-blur-md shadow-xs transition active:scale-95 cursor-pointer group h-7"
                  title="Ver todas as lojas no Top Food"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-300 transition-transform group-hover:-translate-x-0.5" />
                  <span className="hidden xs:inline">Início</span>
                </button>
              )}

              {/* Clean store badge with store name */}
              <div
                className="flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-white/95 backdrop-blur-md shadow-xs min-w-0 h-7"
                title={config.name}
              >
                <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-300 shrink-0" />
                <span className="truncate max-w-[85px] xs:max-w-[130px] sm:max-w-[220px] font-bold">
                  {config.name}
                </span>
              </div>
            </div>

            {/* MEIO: Botão de "Instalar App" em tamanho compacto/menor (some automaticamente quando instalado) */}
            <div className="flex items-center justify-center shrink-0 mx-1">
              <PWAInstallButton
                variant="header"
                className="h-7 px-2 py-1 text-[11px] sm:text-xs"
              />
            </div>

            {/* CANTO DIREITO: O botão de recarga (ícone circular 🔄 sem texto) colado logo ao lado da badge de status da loja */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
              {/* Botão de recarga circular 🔄 sem texto */}
              <GlobalReloadButton
                variant="glass"
                showLabel={false}
                className="h-7 w-7 text-white/95"
              />

              {/* Badge de status da loja fixada no extremo canto direito superior */}
              <span
                id="header-store-status-chip"
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold backdrop-blur-md border shadow-xs h-7 ${
                  !isStoreActive
                    ? "bg-red-600/90 text-white border-red-400/40"
                    : isStoreOpen
                    ? "bg-emerald-600/90 text-white border-emerald-400/40"
                    : "bg-red-600/90 text-white border-red-400/40"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    isStoreActive && isStoreOpen ? "bg-white animate-pulse" : "bg-white/80"
                  }`}
                />
                <span className="whitespace-nowrap">
                  {!isStoreActive ? "Desativada" : isStoreOpen ? "Aberto agora" : "Fechado"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INFORMAÇÕES DA LANCHONETE (Perfil estilo Delivery com avatar sobreposto) */}
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pb-4">
        <div className="relative flex items-end gap-3.5 sm:gap-4">
          {/* Logo / Foto de Perfil da Loja (com preview do story mais recente se houver stories ativos) */}
          <div className="relative z-10 -mt-10 sm:-mt-12 shrink-0">
            <div
              onClick={() => {
                if (hasStories) {
                  openStoreStoriesModal(config, stories);
                }
              }}
              className={`group relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-2xl text-4xl sm:text-5xl shadow-xl transition-transform ${
                hasStories
                  ? "p-[3px] bg-gradient-to-tr from-amber-500 via-rose-500 to-emerald-500 ring-2 ring-emerald-400 cursor-pointer hover:scale-105 active:scale-95"
                  : "border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-800"
              }`}
              title={hasStories ? "Toque para ver Stories da loja" : config.name}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[13px] bg-slate-950 flex items-center justify-center">
                {hasStories && storyPreviewUrl ? (
                  <>
                    {/* Imagem do story ativo mais recente como foto de destaque */}
                    <img
                      src={storyPreviewUrl}
                      alt={`Story de ${config.name}`}
                      className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                      loading="eager"
                    />
                    {/* Gradiente escuro suave inferior */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                    {/* Mini avatar com a logo da loja no canto inferior esquerdo */}
                    <div className="absolute bottom-1 left-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center overflow-hidden rounded-full border border-white dark:border-slate-900 bg-white dark:bg-slate-800 shadow-md">
                      <StoreLogo
                        logo={config.logo}
                        name={config.name}
                        className="h-full w-full object-cover"
                        fallbackEmoji="🏪"
                      />
                    </div>
                  </>
                ) : (
                  /* Logo / Ícone padrão da loja quando NÃO há stories ativos */
                  <StoreLogo
                    logo={config.logo}
                    name={config.name}
                    className="h-full w-full object-cover object-center"
                    fallbackEmoji="🏪"
                  />
                )}
              </div>
            </div>

            {/* Badge indicando Stories Ativos */}
            {hasStories && (
              <button
                type="button"
                onClick={() => openStoreStoriesModal(config, stories)}
                className="absolute -bottom-2 inset-x-0 mx-auto w-max z-20 flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 px-2 py-0.5 text-[10px] font-black text-white shadow-md cursor-pointer hover:scale-105 active:scale-95 transition"
              >
                <span>Story</span>
              </button>
            )}
          </div>

          {/* Nome e Tagline da Loja (100% na área clara ao lado da logo, sem encostar na borda do banner) */}
          <div className="flex-1 min-w-0 pt-3 sm:pt-4 pb-1 sm:pb-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white leading-tight break-words sm:truncate drop-shadow-xs">
              {getSafeDisplayName(config.name, "Burger Town")}
            </h1>
            {config.tagline && !config.tagline.startsWith("data:") && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium truncate mt-0.5">
                {config.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Aviso da Loja / Promoção do Dia */}
        {config.announcement && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
            <span className="flex-1 leading-snug">{config.announcement}</span>
          </div>
        )}

        {/* Badges de Status, Horário, Taxa de Entrega e Endereço */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Status Aberto/Fechado */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
              isStoreOpen && isStoreActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isStoreOpen && isStoreActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            {!isStoreActive ? "Loja Desativada" : isStoreOpen ? "Aberto agora" : "Fechado no momento"}
          </span>

          {/* Horário de Funcionamento */}
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 px-2.5 py-1 text-gray-600 dark:text-gray-300">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>{config.hours}</span>
          </span>

          {/* Taxa de Entrega */}
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 px-2.5 py-1 text-gray-600 dark:text-gray-300">
            <Bike className="h-3.5 w-3.5 text-primary" />
            <span>
              Entrega:{" "}
              {config.deliveryFee > 0
                ? `${config.currency} ${config.deliveryFee.toFixed(2).replace(".", ",")}`
                : "Grátis"}
            </span>
          </span>
        </div>

        {/* Endereço */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{config.address}</span>
        </div>
      </div>
    </header>
  );
}
