import express from "express";
import path from "path";
import fs from "fs";
import workerApp from "./src/worker";
import { Database } from "./src/server/db";
import { injectStorePwaMetaTags } from "./src/server/pwaMeta";
import { isAllowedOrigin } from "./src/server/security";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS middleware for official domains and mobile app consumption
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (isAllowedOrigin(origin, process.env)) {
      res.header("Access-Control-Allow-Origin", origin || "*");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma, X-Admin-Role"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check route
  app.get("/health", (req, res) => {
    res.json({
      name: "Top Food Delivery API",
      status: "online",
      platform: "AI Studio Node.js",
      docs: "/api/health",
    });
  });

  // Increase payload limit for Base64 image uploads (banners, logos, product photos)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Handle entity too large errors gracefully
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === "entity.too.large" || err.status === 413)) {
      console.warn("PayloadTooLarge caught in express middleware:", err.message);
      return res.status(413).json({
        error: "Arquivo muito grande. O limite máximo permitido para envio é de 50MB.",
        status: 413,
      });
    }
    next(err);
  });

  // HTTP Cache-Control header middleware for images and icons
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    if (
      p.endsWith(".png") ||
      p.endsWith(".jpg") ||
      p.endsWith(".jpeg") ||
      p.endsWith(".webp") ||
      p.endsWith(".svg") ||
      p.endsWith(".ico") ||
      p.endsWith(".avif")
    ) {
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    }
    next();
  });

  // Hono API router mounted at /api
  app.use("/api", async (req, res) => {
    try {
      const host = req.get("host") || "localhost:3000";
      // Ensure url starts with /api
      const originalPath = req.originalUrl || `/api${req.url}`;
      const fullUrl = `${req.protocol}://${host}${originalPath}`;
      const headers = new Headers();
      
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, value);
          }
        }
      }

      let body: any;
      if (["GET", "HEAD"].includes(req.method)) {
        body = undefined;
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body;
      } else if (typeof req.body === "string") {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
      }

      if (body && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }

      const webRequest = new Request(fullUrl, {
        method: req.method,
        headers,
        body,
      });

      // Pass bindings environment to Cloudflare/Hono worker
      const response = await workerApp.fetch(webRequest, {
        PLATFORM_NAME: "Top Food Multi-tenant",
        ENVIRONMENT: process.env.NODE_ENV || "development",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        JWT_SECRET: process.env.JWT_SECRET || "topfood-jwt-secret",
      });

      res.status(response.status);
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      // Se a resposta for um EventStream SSE (Server-Sent Events), transmite os chunks em tempo real
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && response.body) {
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        if (typeof res.flushHeaders === "function") {
          res.flushHeaders();
        }

        const reader = response.body.getReader();
        req.on("close", () => {
          reader.cancel().catch(() => {});
        });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        } catch {
          // Conexão encerrada pelo cliente
        }
        return res.end();
      }

      const buffer = await response.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err: unknown) {
      console.error("API error:", err);
      const msg = err instanceof Error ? err.message : "Internal Server Error";
      res.status(500).json({ error: msg });
    }
  });

  // Dedicated PWA routes with strict headers for Android Chrome
  app.get("/sw.js", (req, res) => {
    const swPath = path.join(
      process.cwd(),
      process.env.NODE_ENV === "production" ? "dist" : "public",
      "sw.js"
    );
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(swPath);
  });

  app.get("/manifest.json", (req, res) => {
    const manifestPath = path.join(
      process.cwd(),
      process.env.NODE_ENV === "production" ? "dist" : "public",
      "manifest.json"
    );
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(manifestPath);
  });

  // Dynamic manifest redirect for stores: /manifest/:slug.json -> /api/manifest/:slug.json
  app.get("/manifest/:slug", (req, res) => {
    res.redirect(`/api/manifest/${req.params.slug}`);
  });

  const db = new Database();

  // Vite middleware for development
  let viteDevServer: any = null;
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Injeta metatags PWA ao acessar diretamente a URL da vitrine /loja/:slug em desenvolvimento
    app.get(["/loja/:slug", "/loja/:slug/*splat"], async (req, res, next) => {
      try {
        const rawSlug = req.params.slug || "";
        const slug = rawSlug.includes("/") ? rawSlug.split("/")[0] : rawSlug;
        if (!slug) return next();
        const loja = await db.getTenantByIdOrSlug(slug);
        if (!loja) return next();

        const indexPath = path.join(process.cwd(), "index.html");
        if (!fs.existsSync(indexPath)) return next();

        let html = fs.readFileSync(indexPath, "utf-8");
        html = await viteDevServer.transformIndexHtml(req.originalUrl, html);
        const transformedHtml = injectStorePwaMetaTags(html, loja);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(transformedHtml);
      } catch {
        next();
      }
    });

    app.use(viteDevServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Injeta metatags PWA ao acessar diretamente a URL da vitrine /loja/:slug em produção
    app.get(["/loja/:slug", "/loja/:slug/*splat"], async (req, res, next) => {
      try {
        const rawSlug = req.params.slug || "";
        const slug = rawSlug.includes("/") ? rawSlug.split("/")[0] : rawSlug;
        if (!slug) return next();
        const loja = await db.getTenantByIdOrSlug(slug);
        if (!loja) return next();

        const indexPath = path.join(distPath, "index.html");
        if (!fs.existsSync(indexPath)) return next();

        const html = fs.readFileSync(indexPath, "utf-8");
        const transformedHtml = injectStorePwaMetaTags(html, loja);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(transformedHtml);
      } catch {
        next();
      }
    });

    app.use(
      express.static(distPath, {
        maxAge: "1d",
        setHeaders: (res, filePath) => {
          if (/\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/i.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
          }
        },
      })
    );
    app.get("*all", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path === "/health") {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Express Error Handler: Never expose internal stack traces or database structures
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Express Error Handler]:", err?.stack || err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      success: false,
      error: "Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde.",
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
