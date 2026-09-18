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
 * Plays a clear 3-tone ascending melodic chime (A5 -> C#6 -> E6)
 * Indicates a new customer order has arrived in real-time.
 */
export function playNewOrderChime(): void {
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

/**
 * Toca um aviso sonoro agradável e curto no celular do cliente
 * disparado instantaneamente ao mudar de etapa (ex: Em Preparo, Saiu p/ Entrega, Concluído).
 */
export function playOrderStatusUpdateChime(status?: string): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    let notes = [
      { freq: 1046.5, start: 0.0, duration: 0.18, gain: 0.35 }, // C6
      { freq: 1318.51, start: 0.12, duration: 0.3, gain: 0.4 },  // E6
    ];

    if (status === "preparing") {
      // 2 tons suaves e acolhedores indicando que a cozinha iniciou a produção
      notes = [
        { freq: 698.46, start: 0.0, duration: 0.18, gain: 0.35 }, // F5
        { freq: 880.0, start: 0.12, duration: 0.32, gain: 0.4 },   // A5
      ];
    } else if (status === "delivering") {
      // 3 tons ascendentes alegres indicando que o motoboy saiu para entrega
      notes = [
        { freq: 783.99, start: 0.0, duration: 0.15, gain: 0.35 }, // G5
        { freq: 987.77, start: 0.1, duration: 0.18, gain: 0.4 },  // B5
        { freq: 1318.51, start: 0.22, duration: 0.4, gain: 0.45 }, // E6
      ];
    } else if (status === "done") {
      // Acorde triunfal de conclusão e entrega do pedido
      notes = [
        { freq: 523.25, start: 0.0, duration: 0.2, gain: 0.3 },   // C5
        { freq: 783.99, start: 0.12, duration: 0.22, gain: 0.35 }, // G5
        { freq: 1046.5, start: 0.26, duration: 0.45, gain: 0.45 }, // C6
      ];
    }

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
    console.warn("Could not play status update chime:", err);
  }
}

