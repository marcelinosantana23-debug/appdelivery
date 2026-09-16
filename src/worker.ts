import { Hono } from "hono";
import { cors } from "hono/cors";
import api from "./server/api";
import type { Env } from "./server/types";

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
  return c.text("", 204);
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

// 3. Static assets & SPA fallback using Cloudflare Workers Static Assets binding (wrangler.toml: [assets])
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
