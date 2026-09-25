// Serviço de Notificações Push de Alta Prioridade via Firebase Cloud Messaging (FCM)
// Projetado para acordar dispositivos móveis em tela apagada / modo standby (Android Doze & iOS APNs)

export interface MerchantPushToken {
  token: string;
  platform: "android" | "ios" | "web" | string;
  userId?: string;
  isLoggedIn: boolean;
  updatedAt: number;
}

export interface PushNotificationPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  total: number;
  itemsCount: number;
  tenantSlug: string;
  tenantName: string;
}

/**
 * Monta o payload FCM com as configurações estritas de alta prioridade solicitadas:
 * - Android: priority HIGH, channel_id 'pedidos_urgentes' (IMPORTANCE_HIGH), som ativo
 * - iOS: apns-priority 10, content-available 1, som ativo, time-sensitive (acorda o dispositivo na tela apagada)
 * - WebPush: Urgency high, requireInteraction true, padrão de vibração contínuo
 */
export function buildFcmPayload(deviceToken: string, data: PushNotificationPayload) {
  const formattedTotal = Number(data.total || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const title = "🚨 NOVO PEDIDO RECEBIDO!";
  const body = `Pedido #${data.orderNumber} • ${data.customerName} • ${formattedTotal} (${data.itemsCount} itens)`;

  return {
    message: {
      token: deviceToken,
      notification: {
        title,
        body,
      },
      data: {
        type: "NEW_ORDER",
        orderId: String(data.orderId),
        orderNumber: String(data.orderNumber),
        tenantSlug: String(data.tenantSlug),
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        url: `/admin?tab=orders&orderId=${encodeURIComponent(data.orderId)}`,
      },
      // CONFIGURAÇÃO ANDROID (Bypass do Doze Mode com tela apagada)
      android: {
        priority: "HIGH",
        ttl: "3600s",
        notification: {
          channel_id: "pedidos_urgentes", // Canal configurado no app nativo com IMPORTANCE_HIGH
          sound: "default",
          priority: "max",
          visibility: "public", // Mostra alerta detalhado mesmo na tela de bloqueio
          default_sound: true,
          default_vibrate_timings: true,
          notification_count: 1,
          tag: `order-${data.orderId}`,
        },
      },
      // CONFIGURAÇÃO iOS / APNs (Acorda o iPhone no modo standby e fura telas bloqueadas)
      apns: {
        headers: {
          "apns-priority": "10", // Prioridade 10 = Imediato (obrigatório para entrega instantânea)
          "apns-push-type": "alert",
          "apns-expiration": "0",
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: "default",
            badge: 1,
            "content-available": 1, // Acorda o app em segundo plano (Background Fetch)
            "interruption-level": "time-sensitive", // Time-Sensitive ultrapassa Focus/Não Perturbe no iOS 15+
            category: "NEW_ORDER_CATEGORY",
          },
        },
      },
      // CONFIGURAÇÃO WEB PUSH (PWA / Chrome / Safari 16.4+)
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title,
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          requireInteraction: true, // Notificação fica fixada na tela até o lojista clicar
          vibrate: [500, 150, 500, 150, 1000],
          tag: "novo-pedido",
          renotify: true,
        },
        fcm_options: {
          link: `/admin?tab=orders&orderId=${encodeURIComponent(data.orderId)}`,
        },
      },
    },
  };
}

/**
 * Envia notificação push para o lojista responsável pela loja.
 * REGRA OBRIGATÓRIA: SÓ envia se o lojista estiver atualmente logado no painel da loja
 * (possui token ativo com isLoggedIn === true no banco de dados).
 */
export async function sendNewOrderPushNotification(
  tenantId: string,
  order: any,
  env?: any,
  getDbInstance?: () => any
): Promise<{ sent: number; failed: number; skipped?: boolean; reason?: string }> {
  try {
    let db: any = null;
    if (getDbInstance) {
      db = getDbInstance();
    }

    if (!db) {
      // Lazy load de db
      const { DatabaseAdapter } = await import("../db");
      db = new DatabaseAdapter(env);
    }

    // 1. CONDIÇÃO: Verifica se o lojista está logado (possui tokens de sessão ativos)
    const activeTokens = await db.getActiveMerchantPushTokens(tenantId);

    if (!activeTokens || activeTokens.length === 0) {
      console.log(
        `[FCM] Notificação ignorada: Lojista da loja '${tenantId}' NÃO está logado (nenhum token ativo na sessão).`
      );
      return {
        sent: 0,
        failed: 0,
        skipped: true,
        reason: "Lojista deslogado (nenhum token de notificação ativo no banco de dados)",
      };
    }

    // 2. Prepara os dados do pedido
    const cleanId = String(order.id || "").replace(/^#/, "");
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsCount = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);

    const payloadData: PushNotificationPayload = {
      orderId: cleanId,
      orderNumber: cleanId.slice(-4).toUpperCase() || cleanId,
      customerName: order.customerName || "Cliente",
      total: Number(order.total || 0),
      itemsCount: itemsCount || 1,
      tenantSlug: tenantId,
      tenantName: order.storeName || tenantId,
    };

    let sentCount = 0;
    let failedCount = 0;

    // 3. Credenciais do FCM (via variáveis de ambiente ou secrets)
    const fcmServerKey =
      env?.FCM_SERVER_KEY ||
      process.env.FCM_SERVER_KEY ||
      env?.FIREBASE_SERVER_KEY ||
      process.env.FIREBASE_SERVER_KEY;

    const fcmV1BearerToken =
      env?.FCM_V1_ACCESS_TOKEN ||
      process.env.FCM_V1_ACCESS_TOKEN;

    const fcmProjectId =
      env?.FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      "topfood-delivery";

    // 4. Dispara a notificação para cada dispositivo ativo da sessão do lojista
    for (const tokenRecord of activeTokens) {
      const token = tokenRecord.token;
      if (!token) continue;

      const fcmPayload = buildFcmPayload(token, payloadData);

      try {
        if (fcmV1BearerToken) {
          // FCM HTTP v1 API
          const v1Url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(fcmProjectId)}/messages:send`;
          const res = await fetch(v1Url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${fcmV1BearerToken}`,
            },
            body: JSON.stringify(fcmPayload),
          });

          if (res.ok) {
            sentCount++;
          } else {
            const errText = await res.text();
            console.warn(`[FCM v1] Falha ao enviar para o token ${token.slice(0, 10)}...:`, errText);
            failedCount++;
          }
        } else if (fcmServerKey) {
          // FCM Legacy API (compatível com apps híbridos / Cordova / Capacitor / React Native)
          const legacyUrl = "https://fcm.googleapis.com/fcm/send";
          const legacyPayload = {
            to: token,
            priority: "high",
            content_available: true,
            notification: {
              title: fcmPayload.message.notification.title,
              body: fcmPayload.message.notification.body,
              sound: "default",
              channel_id: "pedidos_urgentes",
              priority: "high",
            },
            data: fcmPayload.message.data,
            android: fcmPayload.message.android,
            apns: fcmPayload.message.apns,
          };

          const res = await fetch(legacyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify(legacyPayload),
          });

          if (res.ok) {
            sentCount++;
          } else {
            failedCount++;
          }
        } else {
          // Simulação / Log em ambiente sem chaves configuradas (dev)
          console.log(`[FCM Push] 🔔 Notificação enviada para dispositivo [${tokenRecord.platform}] do lojista logado:`, {
            token: `${token.slice(0, 12)}...`,
            title: fcmPayload.message.notification.title,
            body: fcmPayload.message.notification.body,
            priority: "HIGH (Android) / 10 (APNs)",
            channelId: "pedidos_urgentes",
          });
          sentCount++;
        }
      } catch (sendErr) {
        console.warn(`[FCM] Erro de rede ao disparar push para o lojista:`, sendErr);
        failedCount++;
      }
    }

    return {
      sent: sentCount,
      failed: failedCount,
      skipped: false,
    };
  } catch (err: any) {
    console.error("[FCM] Erro no processamento de push:", err);
    return {
      sent: 0,
      failed: 1,
      reason: err.message,
    };
  }
}
