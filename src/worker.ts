import { Hono } from "hono";
import { cors } from "hono/cors";
import api from "./server/api";
import type { Env } from "./server/types";
import { SW_SCRIPT_CONTENT, MANIFEST_JSON_CONTENT } from "./server/pwaAssets";
import { injectStorePwaMetaTags } from "./server/pwaMeta";

// Main Cloudflare Workers application
const app = new Hono<{ Bindings: Env }>();

// Habilitar CORS irrestrito globalmente para todas as rotas (incluindo redes externas e 4G)
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma",
    ],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86400,
  })
);

app.options("*", (c) => {
  return c.body(null, 204);
});

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

// 3. PWA Service Worker route with explicit headers required by Android Chrome
app.get("/sw.js", async (c) => {
  const assets = c.env?.ASSETS;
  if (assets && typeof assets.fetch === "function") {
    try {
      const res = await assets.fetch(c.req.raw);
      if (res.status === 200) {
        const headers = new Headers(res.headers);
        headers.set("Content-Type", "application/javascript; charset=utf-8");
        headers.set("Service-Worker-Allowed", "/");
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return new Response(res.body, { status: 200, headers });
      }
    } catch (err) {
      console.warn("Worker ASSETS error fetching /sw.js:", err);
    }
  }

  return new Response(SW_SCRIPT_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});

// 4. PWA Web App Manifest route with strict manifest Content-Type
app.get("/manifest.json", async (c) => {
  const assets = c.env?.ASSETS;
  if (assets && typeof assets.fetch === "function") {
    try {
      const res = await assets.fetch(c.req.raw);
      if (res.status === 200) {
        const headers = new Headers(res.headers);
        headers.set("Content-Type", "application/manifest+json; charset=utf-8");
        headers.set("Cache-Control", "public, max-age=3600");
        return new Response(res.body, { status: 200, headers });
      }
    } catch (err) {
      console.warn("Worker ASSETS error fetching /manifest.json:", err);
    }
  }

  return new Response(MANIFEST_JSON_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

// 4.1. Redirecionamento de manifest dinâmico por vitrine
app.get("/manifest/:slug", (c) => {
  const slug = c.req.param("slug");
  return c.redirect(`/api/manifest/${slug}`);
});

// 4.2. Injeção de metatags PWA dinâmicas na rota de vitrine /loja/:slug
app.get("/loja/:slug*", async (c, next) => {
  const rawSlug = c.req.param("slug") || "";
  const slug = rawSlug.includes("/") ? rawSlug.split("/")[0] : rawSlug;
  const assets = c.env?.ASSETS;

  if (assets && typeof assets.fetch === "function" && slug) {
    try {
      const { Database } = await import("./server/db");
      const db = new Database(c.env);
      const loja = await db.getTenantByIdOrSlug(slug);

      if (loja) {
        const indexUrl = new URL("/index.html", c.req.url);
        const indexRes = await assets.fetch(new Request(indexUrl.toString(), c.req.raw));

        if (indexRes.status === 200) {
          const rawHtml = await indexRes.text();
          const html = injectStorePwaMetaTags(rawHtml, loja);

          const headers = new Headers(indexRes.headers);
          headers.set("Content-Type", "text/html; charset=utf-8");
          return new Response(html, { status: 200, headers });
        }
      }
    } catch (err) {
      console.warn("Worker error processing /loja/:slug HTML:", err);
    }
  }

  return next();
});

// 5. Static assets & SPA fallback using Cloudflare Workers Static Assets binding (wrangler.toml: [assets])
app.get("*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api") || path === "/health") {
    return next();
  }

  // Cloudflare Workers Static Assets binding (wrangler.toml: [assets] com binding = "ASSETS")
  const assets = c.env?.ASSETS;
  if (assets && typeof assets.fetch === "function") {
    try {
      // O binding ASSETS com not_found_handling = "single-page-application"
      // serve automaticamente os arquivos estáticos (/assets/*, favicon, etc.)
      // e faz o fallback de rotas SPA (/admin, /loja/*) para /index.html sem loop de redirecionamento.
      const res = await assets.fetch(c.req.raw);
      if (res.status === 404 && path !== "/index.html") {
        const indexUrl = new URL("/index.html", c.req.url);
        return await assets.fetch(new Request(indexUrl.toString(), c.req.raw));
      }
      return res;
    } catch (err) {
      console.warn("Assets fetch error in Cloudflare Worker:", err);
    }
  }

  return next();
});

export default app;
