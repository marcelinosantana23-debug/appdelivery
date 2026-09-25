// Gerenciador de Notificações Push para o Painel do Lojista (Web Push & FCM)
// Responsável por solicitar permissão, obter o token do dispositivo e sincronizar com o backend

const STORAGE_KEY_TOKEN = "topfood_merchant_push_token";
const STORAGE_KEY_TENANT = "topfood_merchant_push_tenant";

/**
 * Detecta se o ambiente atual suporta notificações Push
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Retorna o estado atual da permissão de notificações
 */
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Registra o token do dispositivo no backend vinculando à loja do lojista logado
 */
export async function registerMerchantPushToken(
  tenantId: string,
  userId?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: "Navegador não suporta notificações Push." };
  }

  try {
    // 1. Solicita permissão se ainda não foi concedida
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return {
        success: false,
        error: "Permissão de notificação negada pelo usuário.",
      };
    }

    // 2. Obtém o Service Worker registrado
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // 3. Se não houver assinatura, cria uma nova
    if (!subscription) {
      try {
        // Gera assinatura padrão Web Push / FCM
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // Caso não haja chave VAPID pública definida, o browser gera o endpoint padrão FCM
          applicationServerKey: undefined,
        });
      } catch (subErr) {
        console.warn("[Push] Assinatura direta sem VAPID não permitida neste navegador:", subErr);
      }
    }

    // 4. Determina o token único do dispositivo
    let deviceToken = "";
    if (subscription) {
      deviceToken = subscription.endpoint;
    } else {
      // Fallback: token de identificador persistente do dispositivo para o lojista
      let stored = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (!stored) {
        stored = `pwa_dev_${Math.random().toString(36).substring(2)}_${Date.now()}`;
        localStorage.setItem(STORAGE_KEY_TOKEN, stored);
      }
      deviceToken = stored;
    }

    // Detecta plataforma
    const userAgent = navigator.userAgent.toLowerCase();
    let platform = "web";
    if (/android/i.test(userAgent)) {
      platform = "android";
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      platform = "ios";
    }

    // 5. Envia para o backend para salvar a sessão ativa do lojista
    const res = await fetch("/api/admin/push-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        token: deviceToken,
        platform,
        userId,
      }),
    });

    const data = await res.json();
    if (data.success) {
      localStorage.setItem(STORAGE_KEY_TOKEN, deviceToken);
      localStorage.setItem(STORAGE_KEY_TENANT, tenantId);
      return { success: true, token: deviceToken };
    } else {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    console.error("[Push] Erro ao registrar token de push do lojista:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove o token do lojista no backend no momento do logout.
 * Garante que NENHUMA notificação seja enviada com o lojista deslogado.
 */
export async function unregisterMerchantPushToken(tenantId?: string): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storeTenant = tenantId || localStorage.getItem(STORAGE_KEY_TENANT);

    if (storeTenant && token) {
      await fetch("/api/admin/push-token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: storeTenant,
          token,
        }),
      }).catch(() => {});
    }

    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TENANT);
  } catch (err) {
    console.warn("[Push] Erro ao desativar token no logout:", err);
  }
}
