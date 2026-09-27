// Embedded PWA static content fallback for Cloudflare Workers when ASSETS binding is unavailable
export const MANIFEST_JSON_CONTENT = JSON.stringify({
  id: "/",
  name: "Top Food - Delivery",
  short_name: "Top Food",
  description: "Cardápio digital e plataforma completa de delivery Top Food.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#ffffff",
  theme_color: "#dc2626",
  categories: ["food", "shopping", "lifestyle"],
  icons: [
    {
      src: "/icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icon-maskable.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "maskable",
    },
    {
      src: "/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
  shortcuts: [
    {
      name: "Ver Cardápio",
      short_name: "Cardápio",
      description: "Acessar cardápio completo de lanches e combos",
      url: "/",
      icons: [{ src: "/icon-192.png", sizes: "192x192" }],
    },
  ],
});

export const SW_SCRIPT_CONTENT = `// Service Worker para Top Food PWA - Compatível com PWABuilder e Android APK
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.mode === "navigate") {
        return caches.match("/index.html") || caches.match("/");
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    })
  );
});

// Suporte a Push Notifications em segundo plano / tela apagada
self.addEventListener("push", (event) => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { notification: { title: "🚨 NOVO PEDIDO RECEBIDO!", body: event.data ? event.data.text() : "" } };
  }
  const notification = data.notification || {};
  const customData = data.data || {};
  const title = notification.title || "🚨 NOVO PEDIDO RECEBIDO!";
  const options = {
    body: notification.body || "Você recebeu um novo pedido na sua lanchonete!",
    icon: notification.icon || "/icon-192.png",
    badge: notification.badge || "/icon-192.png",
    vibrate: [500, 150, 500, 150, 1000],
    tag: \`pedido-\${customData.orderId || Date.now()}\`,
    renotify: true,
    requireInteraction: true,
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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin?tab=orders";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          if ("navigate" in client && targetUrl) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
`;
