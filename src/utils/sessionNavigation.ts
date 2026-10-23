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
export const SESSION_STORE_KEY = "topfood_session_store_slug";
export const SESSION_ACTIVE_KEY = "topfood_session_active";

/**
 * Detecta se a aplicação está rodando em modo aplicativo instalado (PWA standalone, fullscreen ou TWA)
 */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://")
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
 * 1. No PWA instalado na raiz: se houver loja salva no app, redireciona para a vitrine.
 * 2. Na Web comum:
 *    - Se for nova sessão (sessionStorage vazio) e acessou raiz ou reabriu navegador -> força Home ('/').
 *    - Remove resíduos de lojas do localStorage para evitar recuperação indevida.
 *    - Apenas permite abrir vitrine se o usuário acessou explicitamente o link direto (/loja/:slug ou ?loja=).
 */
export function processSessionNavigation(): {
  isNewSession: boolean;
  isStandalone: boolean;
  shouldForceHome: boolean;
  pwaRedirectSlug: string | null;
} {
  if (typeof window === "undefined") {
    return {
      isNewSession: false,
      isStandalone: false,
      shouldForceHome: false,
      pwaRedirectSlug: null,
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

  // Se estiver em modo Standalone / PWA Instalado
  if (isStandalone) {
    sessionStorage.setItem(SESSION_ACTIVE_KEY, "true");
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
        };
      }
    }
    return {
      isNewSession,
      isStandalone: true,
      shouldForceHome: false,
      pwaRedirectSlug: null,
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
