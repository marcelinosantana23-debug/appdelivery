import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import workerApp from "./src/worker";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        PLATFORM_NAME: "DeliveryHub Multi-tenant",
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
    app.get("{*all}", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
