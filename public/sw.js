// Service Worker para Top Food PWA com Cache Agressivo de Imagens e Stale-While-Revalidate
const CACHE_NAME = "topfood-pwa-v2";
const IMAGE_CACHE_NAME = "topfood-images-v2";
const MAX_IMAGE_ENTRIES = 120;

// Recursos estáticos essenciais para funcionamento offline do app shell
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-maskable.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

// Helper para limitar o tamanho do cache de imagens
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Remove os itens mais antigos
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {
    // ignore
  }
}

// Instalação do Service Worker e precache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de versões antigas de cache (preservando o cache de imagens)
self.addEventListener("activate", (event) => {
  const allowedCaches = [CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!allowedCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estratégia de Fetch inteligente:
// 1. Imagens e Logotipos: Cache-First com Stale-While-Revalidate (resposta instantânea do cache local)
// 2. Requisições de API (/api): Network-first com fallback para cache
// 3. Navegação de páginas HTML: Network-first com fallback para /index.html offline
// 4. Recursos estáticos (CSS, JS, Fonts): Stale-While-Revalidate
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora chamadas externas com protocolos desconhecidos
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Identificação de requisições de imagens (logos de lojas, capas/banners, fotos de produtos, ícones)
  const isImage =
    request.destination === "image" ||
    /\.(png|jpg|jpeg|svg|webp|gif|avif|ico)(\?.*)?$/i.test(url.pathname) ||
    url.hostname.includes("images.unsplash.com") ||
    url.hostname.includes("unsplash.com") ||
    url.hostname.includes("cloudinary.com") ||
    url.hostname.includes("imgur.com");

  // 1. TRATAMENTO DE IMAGENS E LOGOTIPOS (CACHE-FIRST / SWR)
  if (isImage && request.method === "GET") {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        // Dispara revalidação em segundo plano se já existir em cache
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              (networkResponse.status === 200 || networkResponse.type === "opaque")
            ) {
              cache.put(request, networkResponse.clone());
              trimCache(IMAGE_CACHE_NAME, MAX_IMAGE_ENTRIES);
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Se a imagem já estiver no cache, retorna imediatamente (0ms de latência)
        if (cachedResponse) {
          // background revalidation continua em paralelo
          event.waitUntil(fetchPromise);
          return cachedResponse;
        }

        // Se ainda não estava em cache, aguarda a rede
        return fetchPromise;
      })
    );
    return;
  }

  // 2. Requisições para API (/api/*)
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

  // 3. Navegação de páginas (HTML)
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

  // 4. Demais recursos estáticos (CSS, JS, Fonts) - Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === "basic")
          ) {
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
