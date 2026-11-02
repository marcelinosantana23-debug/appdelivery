/**
 * OrderHub Durable Object
 * 
 * Provides real-time synchronization, WebSocket connections, and 
 * broadcast coordination between merchant panels (AdminOrders) and
 * customer trackers (OrderTracking / FloatingOrderTracker) in Cloudflare Workers.
 */
export class OrderHub {
  state: any;
  env: any;
  sessions: Set<any>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 1. Upgrade WebSocket connections for live order updates
    if (request.headers.get("Upgrade") === "websocket") {
      const WebSocketPairClass = (globalThis as any).WebSocketPair;
      if (WebSocketPairClass) {
        const pair = new WebSocketPairClass();
        const client = pair[0];
        const server = pair[1];

        server.accept();
        this.sessions.add(server);

        server.addEventListener("message", async (event: any) => {
          try {
            const data = JSON.parse(event.data);
            this.broadcast(data, server);
          } catch (e) {
            console.warn("[OrderHub] WebSocket parse error:", e);
          }
        });

        const closeHandler = () => {
          this.sessions.delete(server);
        };
        server.addEventListener("close", closeHandler);
        server.addEventListener("error", closeHandler);

        return new Response(null, {
          status: 101,
          webSocket: client,
        } as any);
      }
    }

    // 2. HTTP POST event broadcasting
    if (request.method === "POST") {
      try {
        const body = await request.json();
        this.broadcast(body);

        // Store latest order state in DO persistent storage if available
        if (body?.orderId && this.state?.storage) {
          await this.state.storage.put(`order:${body.orderId}`, body);
        }

        return new Response(
          JSON.stringify({
            success: true,
            broadcasted: true,
            activeConnections: this.sessions.size,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err?.message || "Erro ao processar mensagem no OrderHub",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // 3. HTTP GET status / health check
    const orderId = url.searchParams.get("orderId");
    let storedData = null;
    if (orderId && this.state?.storage) {
      storedData = await this.state.storage.get(`order:${orderId}`);
    }

    return new Response(
      JSON.stringify({
        status: "active",
        hub: "OrderHub",
        connections: this.sessions.size,
        data: storedData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  broadcast(message: any, excludeSocket?: any) {
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    for (const session of this.sessions) {
      if (session !== excludeSocket) {
        try {
          session.send(payload);
        } catch {
          this.sessions.delete(session);
        }
      }
    }
  }
}
