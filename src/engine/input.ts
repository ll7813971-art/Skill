import type { View } from './game';

// Entrada táctil con multitoque (Pointer Events). Zonas generosas para jugar
// sin mirar: la mitad izquierda de la pantalla controla la dirección (según a
// qué botón quede más cerca el dedo, deslizable) y la mitad derecha salta.
// El teclado (flechas/WASD + espacio) existe solo como ayuda de desarrollo.

type Zone = 'left' | 'right' | 'jump' | 'none';

export interface Button {
  id: 'left' | 'right' | 'jump';
  x: number;
  y: number;
  r: number;
}

export class Input {
  left = false;
  right = false;
  jump = false;
  /** Flanco de pulsación de salto; dura hasta el final del siguiente paso. */
  jumpPressed = false;
  jumpPresses = 0;
  /** Toques nuevos (coordenadas lógicas) para menús y botones de la interfaz. */
  taps: Array<{ x: number; y: number }> = [];
  /** Mientras es false, los toques solo cuentan como `taps` (menús). */
  controlsEnabled = true;
  buttons: Button[] = [];

  private pointers = new Map<number, { zone: Zone; x: number; y: number }>();
  private keys = new Set<string>();
  private listeners: Array<() => void> = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private view: View,
    private toLogical: (x: number, y: number) => { x: number; y: number },
  ) {
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    // Si la app pasa a segundo plano, soltar todo (evita teclas "pegadas").
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
    this.layout();
  }

  /** Avisar en la primera interacción (p. ej. para desbloquear el audio). */
  onFirstGesture(fn: () => void): void {
    this.listeners.push(fn);
  }

  layout(): void {
    const { w, h } = this.view;
    this.buttons = [
      { id: 'left', x: 66, y: h - 62, r: 40 },
      { id: 'right', x: 166, y: h - 62, r: 40 },
      { id: 'jump', x: w - 76, y: h - 66, r: 48 },
    ];
  }

  private zoneAt(x: number, y: number): Zone {
    if (!this.controlsEnabled) return 'none';
    // Dejar libre la franja superior para los botones del HUD (pausa).
    if (y < 64) return 'none';
    if (x >= this.view.w / 2) return 'jump';
    const [l, r] = this.buttons;
    return x < (l.x + r.x) / 2 ? 'left' : 'right';
  }

  private onDown(e: PointerEvent): void {
    e.preventDefault();
    for (const fn of this.listeners.splice(0)) fn();
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Algunos navegadores no permiten capturar punteros táctiles sintéticos.
    }
    const p = this.toLogical(e.clientX, e.clientY);
    this.taps.push(p);
    const zone = this.zoneAt(p.x, p.y);
    if (zone === 'jump' && !this.jump) {
      this.jumpPressed = true;
      this.jumpPresses++;
    }
    this.pointers.set(e.pointerId, { zone, ...p });
    this.recompute();
  }

  private onMove(e: PointerEvent): void {
    const ptr = this.pointers.get(e.pointerId);
    if (!ptr) return;
    const p = this.toLogical(e.clientX, e.clientY);
    ptr.x = p.x;
    ptr.y = p.y;
    // Deslizar entre izquierda y derecha cambia de dirección; el salto no se
    // reasigna al deslizar para no lanzar saltos accidentales.
    if (ptr.zone === 'left' || ptr.zone === 'right') {
      const z = this.zoneAt(p.x, Math.max(p.y, 64));
      if (z === 'left' || z === 'right') ptr.zone = z;
    }
    this.recompute();
  }

  private onUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    this.recompute();
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const k = e.code;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', 'KeyW', 'Space'].includes(k)) return;
    e.preventDefault();
    for (const fn of this.listeners.splice(0)) fn();
    const isJump = k === 'Space' || k === 'ArrowUp' || k === 'KeyW';
    if (down && isJump && !this.keys.has(k)) {
      this.jumpPressed = true;
      this.jumpPresses++;
    }
    if (down) this.keys.add(k);
    else this.keys.delete(k);
    this.recompute();
  }

  private recompute(): void {
    const zones = [...this.pointers.values()].map((p) => p.zone);
    const has = (z: Zone) => zones.includes(z);
    const k = (...c: string[]) => c.some((x) => this.keys.has(x));
    const l = has('left') || k('ArrowLeft', 'KeyA');
    const r = has('right') || k('ArrowRight', 'KeyD');
    // Ambas direcciones a la vez se anulan.
    this.left = l && !r;
    this.right = r && !l;
    this.jump = has('jump') || k('Space', 'ArrowUp', 'KeyW');
  }

  releaseAll(): void {
    this.pointers.clear();
    this.keys.clear();
    this.recompute();
  }

  get activePointers(): number {
    return this.pointers.size;
  }

  /** Llamado por el bucle tras cada paso de simulación. */
  endStep(): void {
    this.jumpPressed = false;
    this.taps.length = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.controlsEnabled) return;
    const pressed = { left: this.left, right: this.right, jump: this.jump };
    for (const b of this.buttons) {
      const on = pressed[b.id];
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = on ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.16)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)';
      ctx.stroke();
      ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      const s = b.r * 0.42;
      if (b.id === 'left') {
        ctx.moveTo(b.x - s, b.y); ctx.lineTo(b.x + s * 0.7, b.y - s); ctx.lineTo(b.x + s * 0.7, b.y + s);
      } else if (b.id === 'right') {
        ctx.moveTo(b.x + s, b.y); ctx.lineTo(b.x - s * 0.7, b.y - s); ctx.lineTo(b.x - s * 0.7, b.y + s);
      } else {
        ctx.moveTo(b.x, b.y - s); ctx.lineTo(b.x + s, b.y + s * 0.6); ctx.lineTo(b.x - s, b.y + s * 0.6);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}
