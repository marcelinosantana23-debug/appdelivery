// Service Worker para Top Food PWA - Compatível com PWABuilder e Android APK
// Atende a todos os critérios de PWA (install, activate, fetch) e notificações push de pedidos

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Ignora requisições que não sejam HTTP/HTTPS (como chrome-extension://)
  if (!event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback offline para navegação de páginas HTML
      if (event.request.mode === "navigate") {
        return caches.match("/index.html") || caches.match("/");
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    })
  );
});

// =========================================================================
// RECEBIMENTO DE NOTIFICAÇÕES PUSH EM SEGUNDO PLANO / TELA APAGADA (FCM)
// =========================================================================
self.addEventListener("push", (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    data = {
      notification: {
        title: "🚨 NOVO PEDIDO RECEBIDO!",
        body: event.data ? event.data.text() : "Você tem um novo pedido aguardando aceite!",
      },
    };
  }

  const notification = data.notification || {};
  const customData = data.data || {};

  const title = notification.title || "🚨 NOVO PEDIDO RECEBIDO!";
  const options = {
    body: notification.body || "Você recebeu um novo pedido na sua lanchonete!",
    icon: notification.icon || "/icon-192.png",
    badge: notification.badge || "/icon-192.png",
    // Padrão de vibração expressivo de cozinha (vibra 500ms, pausa 150ms, vibra 500ms...)
    vibrate: [500, 150, 500, 150, 1000],
    tag: `pedido-${customData.orderId || Date.now()}`,
    renotify: true,
    requireInteraction: true, // Mantém o alerta na tela bloqueada até o lojista tocar
    silent: false,
    data: {
      url: customData.url || "/admin?tab=orders",
      orderId: customData.orderId,
      tenantSlug: customData.tenantSlug,
    },
    actions: [
      { action: "ver_pedidos", title: "Ver Pedidos" },
      { action: "abrir_painel", title: "Abrir Painel" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Ação de clique na notificação: abre ou foca no painel do lojista
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/admin?tab=orders";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Se o painel já estiver aberto em uma aba, foca nela
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          if ("navigate" in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Se não estiver aberto, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
