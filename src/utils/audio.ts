// Web Audio API notification sound generator for real-time delivery orders
// Generates an attention-grabbing chime without requiring external MP3 assets

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn("Web Audio API not supported or blocked:", err);
    return null;
  }
}

/**
 * Verifica se a rota atual do navegador pertence ao Painel do Lojista (/admin ou /painel).
 * Garante que qualquer notificação sonora de novos pedidos seja EXCLUSIVA do lojista.
 */
export function isStoreAdminRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.toLowerCase();
  return path.includes("/admin") || path.includes("/painel");
}

/**
 * Utilitário seguro para execução de áudio (.play()).
 * Garante que nenhuma chamada a .play() seja executada na tela do cliente,
 * Checkout, Acompanhamento de Pedidos ou fora do painel do lojista.
 */
export function safePlayAudio(audio?: HTMLAudioElement | null): Promise<void> | void {
  if (!isStoreAdminRoute()) {
    return;
  }
  if (audio && typeof audio.play === "function") {
    return audio.play().catch(() => {});
  }
}

let lastNewOrderChimeTime = 0;

/**
 * Plays a clear 3-tone ascending melodic chime (A5 -> C#6 -> E6)
 * Indicates a new customer order has arrived in real-time.
 * RESTRICTED EXCLUSIVELY TO STORE ADMIN ROUTE.
 */
export function playNewOrderChime(): void {
  // O som de notificação SÓ SEJA REPRODUZIDO se a rota atual for o Painel do Lojista
  if (!isStoreAdminRoute()) {
    return;
  }

  const nowMs = Date.now();
  if (nowMs - lastNewOrderChimeTime < 400) {
    return;
  }
  lastNewOrderChimeTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Sequence of 3 melodic chime tones
    const notes = [
      { freq: 880, start: 0.0, duration: 0.22, gain: 0.4 },      // A5
      { freq: 1108.73, start: 0.16, duration: 0.25, gain: 0.45 }, // C#6
      { freq: 1318.51, start: 0.34, duration: 0.45, gain: 0.5 },  // E6
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });
  } catch (err) {
    console.warn("Could not play new order chime:", err);
  }
}

let lastStatusChimeTime = 0;

/**
 * Toca um efeito sonoro suave e agradável (chime/pop) quando o status do pedido avança.
 * Utiliza a Web Audio API nativa sem depender de arquivos externos de áudio.
 */
export function playOrderStatusUpdateChime(_status?: string): void {
  const nowMs = Date.now();
  if (nowMs - lastStatusChimeTime < 400) {
    return;
  }
  lastStatusChimeTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Sequência suave de 2 notas ascendentes (E5 -> C6) em formato de pop/chime
    const tones = [
      { freq: 659.25, start: 0.0, duration: 0.14, gain: 0.25 }, // E5
      { freq: 1046.50, start: 0.09, duration: 0.32, gain: 0.3 },  // C6
    ];

    tones.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });
  } catch (err) {
    console.warn("Não foi possível tocar o som de atualização de status:", err);
  }
}

