// Service Worker para Top Food PWA
const CACHE_NAME = "topfood-pwa-v1";

// Recursos estáticos essenciais para funcionamento offline do app shell
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-maskable.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

// Instalação do Service Worker e precache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de versões antigas de cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estratégia de Fetch inteligente:
// 1. Requisições de API (/api): Network-first com fallback para cache
// 2. Navegação de páginas HTML: Network-first com fallback para /index.html offline
// 3. Recursos estáticos (imagens, CSS, JS): Stale-While-Revalidate
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora chamadas externas ou esquemas que não sejam http/https (ex: chrome-extension)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Requisições para API (/api/*)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Se for uma requisição GET com sucesso, guarda cópia no cache
          if (request.method === "GET" && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Se falhar (offline), tenta responder com cache anterior
          return caches.match(request);
        })
    );
    return;
  }

  // Navegação de páginas (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match("/index.html") || caches.match("/");
        })
    );
    return;
  }

  // Demais recursos estáticos (Stale-while-revalidate)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
