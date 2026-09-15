import { Hono } from "hono";
import api from "./server/api";
import type { Env } from "./server/types";

// Main Cloudflare Workers application
const app = new Hono<{ Bindings: Env }>();

// 1. Mount all /api routes FIRST
app.route("/api", api);

// 2. Health check route specifically
app.get("/health", (c) => {
  return c.json({
    name: "Top Food Delivery API",
    platform: "Cloudflare Workers",
    status: "online",
    docs: "/api/health",
  });
});

// 3. Fallback SPA Middleware: Qualquer rota GET que não seja /api/* serve o index.html principal
app.get("*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api") || path === "/health") {
    return next();
  }

  // A. Cloudflare Workers Static Assets binding (wrangler.toml: [assets])
  const assets = (c.env as any)?.ASSETS;
  if (assets && typeof assets.fetch === "function") {
    try {
      const assetRes = await assets.fetch(c.req.raw);
      // Se encontrou arquivo estático físico (.js, .css, imagens, etc.), retorna diretamente
      if (assetRes.status !== 404) {
        return assetRes;
      }
      // Fallback SPA: Ao atualizar a página (F5) em rotas como /admin, /super-admin ou /loja/:slug, serve o index.html
      const indexReq = new Request(new URL("/index.html", c.req.url).toString(), c.req.raw);
      return await assets.fetch(indexReq);
    } catch (err) {
      console.warn("Assets fetch error, falling back to html:", err);
    }
  }

  // B. Fallback HTML se o binding ASSETS não estiver presente
  return c.html(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Top Food - Plataforma Multi-tenant de Delivery</title>
    <meta name="description" content="Sistema multi-lojas Top Food com vitrines dinâmicas no Cloudflare D1/KV, painel do lojista com pedidos em tempo real, RBAC isolado e Super Admin." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
});

export default app;
