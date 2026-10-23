// Efectos de sonido sintetizados con Web Audio (sin archivos). Cada sonido es
// una función (ctx, destino, t0) para poder renderizarlo también en un
// OfflineAudioContext (así las pruebas comprueban que produce señal).

export type SoundName =
  | 'jump' | 'land' | 'coin' | 'stomp' | 'hurt' | 'fall' | 'complete' | 'dead' | 'click';

type Synth = (ctx: BaseAudioContext, out: AudioNode, t: number) => number; // devuelve la duración

function tone(
  ctx: BaseAudioContext, out: AudioNode, t: number, type: OscillatorType,
  f0: number, f1: number, dur: number, vol: number,
): void {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(ctx: BaseAudioContext, out: AudioNode, t: number, dur: number, vol: number, freq: number): void {
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

export const SYNTHS: Record<SoundName, Synth> = {
  jump: (c, o, t) => (tone(c, o, t, 'square', 280, 620, 0.14, 0.12), 0.14),
  land: (c, o, t) => (noise(c, o, t, 0.06, 0.25, 900), 0.06),
  coin: (c, o, t) => {
    tone(c, o, t, 'triangle', 988, 988, 0.07, 0.25);
    tone(c, o, t + 0.07, 'triangle', 1319, 1319, 0.16, 0.25);
    return 0.23;
  },
  stomp: (c, o, t) => {
    tone(c, o, t, 'square', 420, 90, 0.16, 0.16);
    noise(c, o, t, 0.08, 0.3, 1500);
    return 0.16;
  },
  hurt: (c, o, t) => (tone(c, o, t, 'sawtooth', 520, 140, 0.3, 0.16), 0.3),
  fall: (c, o, t) => (tone(c, o, t, 'triangle', 700, 80, 0.55, 0.22), 0.55),
  complete: (c, o, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, o, t + i * 0.1, 'square', f, f, 0.18, 0.1));
    tone(c, o, t + 0.4, 'triangle', 1047, 1047, 0.4, 0.2);
    return 0.8;
  },
  dead: (c, o, t) => {
    [392, 330, 262].forEach((f, i) => tone(c, o, t + i * 0.18, 'triangle', f, f * 0.97, 0.22, 0.22));
    tone(c, o, t + 0.54, 'sawtooth', 196, 98, 0.5, 0.12);
    return 1.05;
  },
  click: (c, o, t) => (tone(c, o, t, 'sine', 660, 880, 0.06, 0.18), 0.06),
};

const MUTE_KEY = 'saltarin.muted';

export class Sound {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last = new Map<SoundName, number>();
  muted: boolean;
  /** Registro de sonidos reproducidos (para pruebas y depuración). */
  played: SoundName[] = [];

  constructor() {
    let m = false;
    try {
      m = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // Sin almacenamiento (modo privado): sonido activado por defecto.
    }
    this.muted = m;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.ctx?.resume().catch(() => {});
    });
  }

  /** Debe llamarse dentro de un gesto del usuario (requisito de iOS/Android). */
  unlock(): void {
    if (this.ctx?.state === 'running') return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8;
        this.master.connect(this.ctx.destination);
      }
      void this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null; // sin audio, el juego sigue funcionando
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      // Ignorar: la preferencia solo dura esta sesión.
    }
  }

  play = (name: SoundName): void => {
    this.played.push(name);
    if (this.played.length > 200) this.played.splice(0, 100);
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running') return;
    // Evitar que un sonido se apile consigo mismo en el mismo instante.
    const now = ctx.currentTime;
    if (now - (this.last.get(name) ?? -1) < 0.05) return;
    this.last.set(name, now);
    SYNTHS[name](ctx, this.master, now + 0.005);
  };
}
