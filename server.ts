import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import workerApp from "./src/worker";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global CORS middleware for all endpoints and external origins
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
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

      const body = ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body);

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path === "/health") {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
