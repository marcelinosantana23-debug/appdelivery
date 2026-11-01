/**
 * OrderHub - Durable Object que funciona como barramento SSE em tempo real.
 *
 * POR QUE EXISTE:
 * No Cloudflare Workers cada requisição pode ser atendida por um isolate diferente.
 * Um Set de listeners em memória (events.ts) só enxerga conexões do MESMO isolate, então
 * o PATCH do lojista nunca alcançava o SSE aberto no celular do cliente.
 * Um Durable Object é uma instância única e global por "sala" (uma sala por loja):
 * todos os isolates publicam e assinam nela, garantindo entrega instantânea.
 *
 * Rotas internas (chamadas apenas pelo Worker):
 *   POST /publish    -> corpo = JSON do evento; repassa a todos os assinantes
 *   GET  /subscribe  -> abre stream SSE (text/event-stream) com os eventos da sala
 */

interface Subscriber {
  writer: WritableStreamDefaultWriter<Uint8Array>;
}

const encoder = new TextEncoder();

export class OrderHub {
  private subscribers = new Set<Subscriber>();

  // `state` e `env` são exigidos pelo runtime, mas este hub só mantém conexões em memória.
  constructor(_state?: unknown, _env?: unknown) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/publish" && request.method === "POST") {
      const body = await request.text();
      this.broadcast(body);
      return new Response("ok", { status: 200 });
    }

    if (url.pathname === "/subscribe") {
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const sub: Subscriber = { writer: writable.getWriter() };
      this.subscribers.add(sub);

      // Remove o assinante assim que o Worker/cliente desconectar
      sub.writer.closed.catch(() => {}).finally(() => this.subscribers.delete(sub));

      // Primeiro byte imediato: abre o stream sem esperar o primeiro evento
      sub.writer.write(encoder.encode(": connected\n\n")).catch(() => this.subscribers.delete(sub));

      return new Response(readable, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  private broadcast(json: string): void {
    // JSON.stringify nunca gera quebra de linha crua, então uma linha "data:" basta
    const chunk = encoder.encode(`data: ${json}\n\n`);
    for (const sub of this.subscribers) {
      sub.writer.write(chunk).catch(() => this.subscribers.delete(sub));
    }
  }
}
