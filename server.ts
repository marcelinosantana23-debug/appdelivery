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

      const buffer = await response.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err: unknown) {
      console.error("API error:", err);
      const msg = err instanceof Error ? err.message : "Internal Server Error";
      res.status(500).json({ error: msg });
    }
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
    app.get("{*all}", (req, res, next) => {
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
