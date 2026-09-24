// Web Audio API notification sound generator for real-time delivery orders
// Generates attention-grabbing alerts and chimes without requiring external MP3 assets
// Fully optimized for mobile browsers (Safari iOS and Chrome Android) with autoplay unlock

let sharedAudioCtx: AudioContext | null = null;
type UnlockListener = (unlocked: boolean) => void;
const unlockListeners = new Set<UnlockListener>();

function notifyUnlockListeners(unlocked: boolean) {
  unlockListeners.forEach((listener) => {
    try {
      listener(unlocked);
    } catch {
      // ignore
    }
  });
}

/**
 * Cria ou obtém a instância compartilhada do AudioContext.
 * Trata estados 'suspended' e 'closed' com compatibilidade webkitAudioContext.
 */
export function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtxClass();
      if (sharedAudioCtx.state === "running") {
        notifyUnlockListeners(true);
      }
    }
    if (sharedAudioCtx.state === "suspended" || (sharedAudioCtx.state as any) === "interrupted") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn("Web Audio API não suportada ou bloqueada:", err);
    return null;
  }
}

/**
 * Verifica se o contexto de áudio já está ativo e pronto para reprodução sem restrições.
 */
export function isAudioUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sharedAudioCtx && sharedAudioCtx.state === "running");
}

/**
 * Permite que componentes React assinem alterações no estado de desbloqueio do áudio.
 */
export function subscribeAudioUnlock(listener: UnlockListener): () => void {
  unlockListeners.add(listener);
  // Notifica imediatamente com o estado atual
  listener(isAudioUnlocked());
  return () => {
    unlockListeners.delete(listener);
  };
}

/**
 * Desbloqueia ativamente o AudioContext em dispositivos móveis (Safari iOS e Chrome Android).
 * Deve ser chamado durante ou imediatamente após um evento de toque/clique do usuário.
 * Reproduz um buffer silencioso para iniciar a pipeline de áudio de hardware do iOS.
 */
export async function unlockAudioContext(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === "suspended" || (ctx.state as any) === "interrupted") {
      await ctx.resume().catch(() => {});
    }

    // Toca um micropulso silencioso para forçar a liberação no iOS WebKit
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    const isRunning = ctx.state === "running";
    notifyUnlockListeners(isRunning);
    return isRunning;
  } catch (err) {
    console.warn("Não foi possível desbloquear o AudioContext:", err);
    return false;
  }
}

/**
 * Dispara um bip suave e instantâneo (0.08s) quando o usuário
 * desbloqueia/ativa o áudio manualmente, dando feedback acústico imediato.
 */
export function playAudioActivatedConfirmation(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, now); // C6
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // ignore
  }
}

/**
 * Registra listeners globais automáticos para desbloquear o áudio
 * na primeiríssima interação (toque/clique) do usuário na página.
 */
let autoUnlockSetup = false;
export function setupGlobalAutoUnlock(): void {
  if (typeof window === "undefined" || autoUnlockSetup) return;
  autoUnlockSetup = true;

  const handleFirstInteraction = async () => {
    const unlocked = await unlockAudioContext();
    if (unlocked) {
      window.removeEventListener("touchstart", handleFirstInteraction, true);
      window.removeEventListener("touchend", handleFirstInteraction, true);
      window.removeEventListener("click", handleFirstInteraction, true);
      window.removeEventListener("pointerdown", handleFirstInteraction, true);
    }
  };

  window.addEventListener("touchstart", handleFirstInteraction, { capture: true, passive: true });
  window.addEventListener("touchend", handleFirstInteraction, { capture: true, passive: true });
  window.addEventListener("click", handleFirstInteraction, { capture: true, passive: true });
  window.addEventListener("pointerdown", handleFirstInteraction, { capture: true, passive: true });
}

// Inicializa automaticamente no carregamento do script no cliente
if (typeof window !== "undefined") {
  setupGlobalAutoUnlock();
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
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

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

let lastCustomerConfirmTime = 0;

/**
 * 1. Efeito sonoro curto de confirmação ("tricks" sonoro agradável) para o fluxo do cliente.
 * Toca exatamente quando o cliente clica para finalizar / enviar o pedido.
 * Utiliza Web Audio API nativa com harmônicos brilhantes de confirmação (sem arquivos externos).
 */
export function playOrderSubmissionConfirmationSound(): void {
  const nowMs = Date.now();
  if (nowMs - lastCustomerConfirmTime < 300) {
    return;
  }
  lastCustomerConfirmTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Aproveita a interação do usuário para desbloquear a pipeline
    unlockAudioContext().catch(() => {});

    const now = ctx.currentTime;

    // Três tons harmônicos ascendentes rápidos ("tricks" brilhante de confirmação e satisfação)
    const tones = [
      { freq: 880, start: 0.0, duration: 0.08, gain: 0.28 },     // A5
      { freq: 1318.51, start: 0.06, duration: 0.14, gain: 0.35 }, // E6
      { freq: 1760.0, start: 0.12, duration: 0.20, gain: 0.3 },   // A6
    ];

    tones.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });
  } catch (err) {
    console.warn("Não foi possível tocar o som de confirmação do pedido:", err);
  }
}

let lastPendingAlarmTime = 0;

/**
 * 2. Alarme sonoro para pedidos pendentes no Painel do Lojista.
 * Começa a tocar assim que chega um novo pedido e se repete automaticamente a cada 5 segundos
 * até que o lojista clique no botão para aceitar o pedido.
 * Utiliza Web Audio API nativa com sequência de bipes marcantes e bem audíveis no celular.
 */
export function playPendingOrderAlarm(): void {
  if (!isStoreAdminRoute()) {
    return;
  }

  const nowMs = Date.now();
  if (nowMs - lastPendingAlarmTime < 1000) {
    return;
  }
  lastPendingAlarmTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Sequência rítmica e expressiva de alerta de pedido (duplo bip ascendente de cozinha)
    // Pulso 1: G5 (784Hz) -> C6 (1046.5Hz)
    // Pulso 2: G5 (784Hz) -> E6 (1318.5Hz)
    const notes = [
      { freq: 783.99, start: 0.0, duration: 0.13, gain: 0.4 },
      { freq: 1046.5, start: 0.10, duration: 0.22, gain: 0.5 },
      { freq: 783.99, start: 0.30, duration: 0.13, gain: 0.4 },
      { freq: 1318.51, start: 0.40, duration: 0.30, gain: 0.55 },
    ];

    notes.forEach(({ freq, start, duration, gain }) => {
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
    console.warn("Não foi possível tocar o alarme de pedido pendente:", err);
  }
}

let lastStatusChimeTime = 0;

/**
 * Toca um efeito sonoro suave e agradável (chime/pop "tricks") quando o status do pedido avança
 * na tela de acompanhamento do cliente.
 * Recria nós dinamicamente para garantir reprodução imediata mesmo em navegadores móveis (Safari/Chrome).
 */
export function playOrderStatusUpdateChime(_status?: string): void {
  const nowMs = Date.now();
  if (nowMs - lastStatusChimeTime < 250) {
    return;
  }
  lastStatusChimeTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Sequência suave e alegre de 3 notas ascendentes ("tricks" suave: G5 -> C6 -> E6)
    const tones = [
      { freq: 783.99, start: 0.0, duration: 0.10, gain: 0.28 },  // G5
      { freq: 1046.50, start: 0.07, duration: 0.14, gain: 0.32 }, // C6
      { freq: 1318.51, start: 0.13, duration: 0.28, gain: 0.38 }, // E6
    ];

    tones.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.015);
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

