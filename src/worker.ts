import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/cloudflare-workers";
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

// 3. Servir arquivos estáticos da pasta dist ou assets via serveStatic
app.use("/assets/*", serveStatic({ root: "./" }));
app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));
app.use("/vite.svg", serveStatic({ path: "./vite.svg" }));

// 4. Middleware de Fallback SPA: Qualquer requisição GET de rota navegável (que não seja /api/*) entrega index.html
app.get("*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api") || path === "/health") {
    return next();
  }

  // A. Cloudflare Workers Static Assets binding (wrangler.toml: [assets] com binding = "ASSETS")
  const assets = c.env?.ASSETS;
  if (assets && typeof assets.fetch === "function") {
    try {
      // Se a requisição tem extensão de arquivo (.js, .css, .png, etc.), tenta servir o asset primeiro
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(path);
      if (hasExtension) {
        const assetRes = await assets.fetch(c.req.raw);
        if (assetRes.status !== 404) {
          return assetRes;
        }
      }

      // Fallback SPA: Ao atualizar a página (F5) em rotas internas (/admin, /super-admin, /loja/:slug, /checkout, etc.),
      // entrega o index.html com HTTP 200 para que o roteador client-side renderize perfeitamente
      const indexReq = new Request(new URL("/index.html", c.req.url).toString(), c.req.raw);
      const indexRes = await assets.fetch(indexReq);
      if (indexRes.status < 400) {
        return indexRes;
      }
    } catch (err) {
      console.warn("Assets fetch error in SPA fallback:", err);
    }
  }

  return next();
});

export default app;
