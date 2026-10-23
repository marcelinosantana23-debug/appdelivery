/**
 * Top Food - Session & Navigation Controller
 * 
 * Regras estritas:
 * 1. RESET DE SESSÃO AO FECHAR O NAVEGADOR:
 *    - Iniciar na Home ('/') se acessar a raiz ou reabrir o navegador.
 *    - Não recuperar nem redirecionar automaticamente para lojas visitadas anteriormente no navegador.
 * 2. LIMPEZA DE LOJA SALVA NA WEB:
 *    - A navegação normal pela Web NÃO mantém o usuário fixo na rota da última loja visitada ao fechar e reabrir a aba/navegador.
 *    - O redirecionamento automático para uma loja específica acontece EXCLUSIVAMENTE
 *      dentro do aplicativo instalado (modo standalone/PWA) ou se o usuário acessar diretamente o link daquela loja.
 */

export const PWA_LAST_STORE_KEY = "topfood_pwa_last_store";
export const PWA_INSTALL_ROUTE_KEY = "rota_instalação_pwa";
export const PWA_INSTALL_ROUTE_KEY_FALLBACK = "rota_instalacao_pwa";
export const SESSION_STORE_KEY = "topfood_session_store_slug";
export const SESSION_ACTIVE_KEY = "topfood_session_active";

/**
 * Captura dinamicamente a rota atual (window.location.pathname) no momento exato do clique de instalação
 * e salva no localStorage na chave 'rota_instalação_pwa'.
 * NUNCA utiliza ID ou slug fixo (hardcoded) no código.
 */
export function savePWAInstallRoute(): string {
  if (typeof window === "undefined") return "/";
  try {
    const rawPath = window.location.pathname;
    const currentPath = rawPath && rawPath.trim() !== "" ? rawPath : "/";

    // Salva a chave requisitada com acento e uma versão sem acento para garantia de compatibilidade
    localStorage.setItem(PWA_INSTALL_ROUTE_KEY, currentPath);
    localStorage.setItem(PWA_INSTALL_ROUTE_KEY_FALLBACK, currentPath);

    // Se estiver na vitrine de uma loja (/loja/:slug), captura o slug dinâmico via regex
    const match = currentPath.match(/^\/loja\/([^/?#]+)/i);
    if (match && match[1]) {
      const dynamicSlug = decodeURIComponent(match[1]).toLowerCase();
      localStorage.setItem(PWA_LAST_STORE_KEY, dynamicSlug);
    } else {
      // Se clicou em instalar na Home ('/'), limpa lojas prévias para abrir sempre no Portal/Home
      localStorage.removeItem(PWA_LAST_STORE_KEY);
      localStorage.removeItem("topfood_last_store_slug");
    }

    return currentPath;
  } catch (err) {
    console.warn("Erro ao salvar rota de instalação:", err);
    return "/";
  }
}

/**
 * Obtém a rota de instalação salva no momento em que a instalação foi feita ('rota_instalação_pwa').
 */
export function getSavedPWAInstallRoute(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      localStorage.getItem(PWA_INSTALL_ROUTE_KEY) ||
      localStorage.getItem(PWA_INSTALL_ROUTE_KEY_FALLBACK) ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Detecta se a aplicação está rodando em modo aplicativo instalado (PWA standalone, fullscreen ou APK wrapper)
 */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const isStandaloneMedia =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches;

    const isIOSStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const isAndroidAppReferrer = document.referrer.includes("android-app://");

    const ua = window.navigator.userAgent || "";
    // Android WebView típico de APKs
    const isAndroidWebView =
      /wv|Android.*Version\/[0-9.]+/i.test(ua) && !/Chrome\/[0-9.]+\s+Mobile/i.test(ua);

    const search = window.location.search;
    const isExplicitStandaloneParam =
      search.includes("mode=standalone") ||
      search.includes("source=pwa") ||
      search.includes("source=apk") ||
      search.includes("utm_source=pwa");

    return Boolean(
      isStandaloneMedia ||
      isIOSStandalone ||
      isAndroidAppReferrer ||
      isAndroidWebView ||
      isExplicitStandaloneParam
    );
  } catch {
    return false;
  }
}

/**
 * Salva a loja atual respeitando rigorosamente a separação Web vs Standalone PWA.
 * - PWA instalado: persiste no localStorage para reabertura direta do app instalado.
 * - Web comum: persiste APENAS no sessionStorage para durar enquanto a aba/sessão atual estiver ativa.
 */
export function saveActiveStore(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    if (isStandaloneApp()) {
      localStorage.setItem(PWA_LAST_STORE_KEY, slug);
    } else {
      sessionStorage.setItem(SESSION_STORE_KEY, slug);
      // Garante que o localStorage da web não retenha loja salva entre fechamento do navegador
      localStorage.removeItem("topfood_last_store_slug");
      localStorage.removeItem("delivery_tenant_session");
    }
  } catch {
    // ignore
  }
}

/**
 * Limpa qualquer rastro de loja salva na web (ao voltar para a Home ou resetar sessão).
 */
export function clearWebStoreSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_STORE_KEY);
    sessionStorage.removeItem("topfood_tenant_session");
    localStorage.removeItem("topfood_last_store_slug");
    localStorage.removeItem("delivery_tenant_session");
  } catch {
    // ignore
  }
}

/**
 * Retorna a loja salva permitida:
 * - Em modo PWA standalone: pode vir do localStorage (PWA_LAST_STORE_KEY).
 * - Na Web: NUNCA vem do localStorage, vem estritamente do sessionStorage da aba atual.
 */
export function getSavedStoreSlug(): string {
  if (typeof window === "undefined") return "";
  try {
    if (isStandaloneApp()) {
      return (
        localStorage.getItem(PWA_LAST_STORE_KEY) ||
        localStorage.getItem("topfood_last_store_slug") ||
        ""
      );
    }
    return sessionStorage.getItem(SESSION_STORE_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Processa a navegação inicial e regras de reset de sessão ao carregar a página:
 * 1. No PWA/APK instalado: se houver 'rota_instalação_pwa' salva, redireciona dinamicamente para ela.
 * 2. Na Web comum: desconsidera rotas salvas de instalação e segue a regra padrão da web.
 */
export function processSessionNavigation(): {
  isNewSession: boolean;
  isStandalone: boolean;
  shouldForceHome: boolean;
  pwaRedirectSlug: string | null;
  pwaRedirectRoute: string | null;
} {
  if (typeof window === "undefined") {
    return {
      isNewSession: false,
      isStandalone: false,
      shouldForceHome: false,
      pwaRedirectSlug: null,
      pwaRedirectRoute: null,
    };
  }

  const isStandalone = isStandaloneApp();
  const sessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY);
  const isNewSession = !sessionActive;

  const path = window.location.pathname.toLowerCase();
  const cleanPath = path.replace(/\/+$/, "");
  const isRootPath = cleanPath === "" || cleanPath === "/" || cleanPath === "/portal" || cleanPath === "/topfood";

  const isAdminRoute =
    path.startsWith("/admin") ||
    path.startsWith("/painel") ||
    path.startsWith("/super-admin") ||
    path.startsWith("/superadmin");

  // ABERTURA INTELIGENTE DO APP: Modo Standalone / Aplicativo Instalado (PWA ou APK)
  if (isStandalone) {
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
    const savedRoute = getSavedPWAInstallRoute();

    if (savedRoute) {
      const cleanSaved = savedRoute.replace(/\/+$/, "").toLowerCase();
      // Se instalou estando na Home ('/'), salva a rota padrão e abre no Portal/Home
      if (cleanSaved === "" || cleanSaved === "/" || cleanSaved === "/portal" || cleanSaved === "/topfood") {
        return {
          isNewSession,
          isStandalone: true,
          shouldForceHome: false,
          pwaRedirectSlug: null,
          pwaRedirectRoute: "/",
        };
      }

      // Se instalou na vitrine de uma loja (/loja/:slug), captura o slug dinamicamente
      const match = savedRoute.match(/^\/loja\/([^/?#]+)/i);
      const dynamicSlug = match && match[1] ? decodeURIComponent(match[1]).toLowerCase() : null;

      return {
        isNewSession,
        isStandalone: true,
        shouldForceHome: false,
        pwaRedirectSlug: dynamicSlug,
        pwaRedirectRoute: savedRoute,
      };
    }

    // Fallback legado se apenas PWA_LAST_STORE_KEY estava presente na raiz
    if (isRootPath) {
      const pwaSlug =
        localStorage.getItem(PWA_LAST_STORE_KEY) ||
        localStorage.getItem("topfood_last_store_slug") ||
        null;
      if (pwaSlug) {
        return {
          isNewSession,
          isStandalone: true,
          shouldForceHome: false,
          pwaRedirectSlug: pwaSlug,
          pwaRedirectRoute: `/loja/${pwaSlug}`,
        };
      }
    }

    return {
      isNewSession,
      isStandalone: true,
      shouldForceHome: false,
      pwaRedirectSlug: null,
      pwaRedirectRoute: null,
    };
  }

  // NAVEGAÇÃO WEB COMUM:
  // Limpeza de segurança no localStorage web para evitar persistência indevida entre fechamentos
  try {
    localStorage.removeItem("topfood_last_store_slug");
    localStorage.removeItem("delivery_tenant_session");
  } catch {
    // ignore
  }

  // Se for rota administrativa, mantém para não quebrar login de lojista / superadmin
  if (isAdminRoute) {
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
    return {
      isNewSession,
      isStandalone: false,
      shouldForceHome: false,
      pwaRedirectSlug: null,
    };
  }

  // Se acessou a raiz na Web, SEMPRE força início na Home
  if (isRootPath) {
    clearWebStoreSession();
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
    return {
      isNewSession,
      isStandalone: false,
      shouldForceHome: true,
      pwaRedirectSlug: null,
    };
  }

  // Se for uma NOVA SESSÃO na Web (o navegador foi fechado e reaberto, ou nova aba aberta):
  if (isNewSession) {
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");

    let navType = "";
    try {
      const entries = performance.getEntriesByType("navigation");
      if (entries && entries.length > 0) {
        navType = (entries[0] as PerformanceNavigationTiming).type;
      }
    } catch {
      // ignore
    }

    const searchParams = new URLSearchParams(window.location.search);
    const hasExplicitStoreQuery = searchParams.has("loja") || searchParams.has("store") || searchParams.has("tenant");
    const hasExternalReferrer = Boolean(document.referrer && !document.referrer.includes(window.location.host));

    // Se o navegador reabriu restaurando abas (reload ou back_forward) e não há query explícita
    const isRestoredTab = navType === "reload" || navType === "back_forward";
    if (isRestoredTab && !hasExplicitStoreQuery) {
      clearWebStoreSession();
      try {
        if (window.location.pathname !== "/") {
          window.history.replaceState({ view: "portal" }, "", "/");
        }
      } catch {
        // ignore
      }
      return {
        isNewSession: true,
        isStandalone: false,
        shouldForceHome: true,
        pwaRedirectSlug: null,
      };
    }

    // Se o usuário acessou diretamente o link daquela loja (ex: /loja/:slug ou ?loja=)
    if (path.startsWith("/loja/") || hasExplicitStoreQuery || hasExternalReferrer) {
      return {
        isNewSession: true,
        isStandalone: false,
        shouldForceHome: false,
        pwaRedirectSlug: null,
      };
    }

    // Qualquer rota genérica de cliente sem link explícito ao iniciar nova sessão -> Força Home
    clearWebStoreSession();
    try {
      if (window.location.pathname !== "/") {
        window.history.replaceState({ view: "portal" }, "", "/");
      }
    } catch {
      // ignore
    }
    return {
      isNewSession: true,
      isStandalone: false,
      shouldForceHome: true,
      pwaRedirectSlug: null,
    };
  }

  // Sessão web já em andamento (navegação normal dentro do site)
  return {
    isNewSession: false,
    isStandalone: false,
    shouldForceHome: false,
    pwaRedirectSlug: null,
  };
}
