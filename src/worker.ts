import { Hono } from "hono";
import api from "./server/api";
import type { Env } from "./server/types";

// Main Cloudflare Workers application
const app = new Hono<{ Bindings: Env }>();

// Mount all /api routes
app.route("/api", api);

// Health check on root
app.get("/", (c) => {
  return c.json({
    name: "Multi-tenant Delivery API",
    platform: "Cloudflare Workers",
    status: "online",
    docs: "/api/health",
  });
});

export default app;
