// Núcleo: canvas a pantalla completa, escalado a una altura lógica fija y
// bucle de paso fijo (60 Hz) para que la física sea igual en cualquier móvil.

import { Input } from './input';

export const VIEW_H = 384; // altura lógica visible (12 tiles de 32 px)
export const STEP = 1 / 60;

export interface View {
  w: number; // ancho lógico (depende de la relación de aspecto)
  h: number; // alto lógico (siempre VIEW_H)
  scale: number; // píxeles físicos por unidad lógica
  dpr: number;
}

export interface Scene {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, view: View): void;
  debug?(): Record<string, unknown>;
  leave?(): void;
}

export class Game {
  readonly ctx: CanvasRenderingContext2D;
  readonly view: View = { w: 0, h: VIEW_H, scale: 1, dpr: 1 };
  readonly input: Input;
  scene: Scene | null = null;
  frames = 0;
  /** Solo pruebas: congela la simulación; se avanza con `advance()`. */
  frozen = false;
  steps = 0;
  private last = 0;
  private acc = 0;
  private resizeListeners: Array<() => void> = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    this.input = new Input(canvas, this.view, (x, y) => this.toLogical(x, y));
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
  }

  onResize(fn: () => void): void {
    this.resizeListeners.push(fn);
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.view.dpr = dpr;
    this.view.scale = this.canvas.height / VIEW_H;
    this.view.w = this.canvas.width / this.view.scale;
    this.input?.layout();
    for (const fn of this.resizeListeners) fn();
  }

  /** Convierte coordenadas CSS (de un evento) a coordenadas lógicas. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const k = this.view.dpr / this.view.scale;
    return { x: clientX * k, y: clientY * k };
  }

  setScene(scene: Scene): void {
    this.scene?.leave?.();
    this.scene = scene;
  }

  start(): void {
    const tick = (t: number) => {
      const now = t / 1000;
      if (this.last === 0) this.last = now;
      // Limitar el salto de tiempo (pestaña en segundo plano, tirones).
      this.acc += Math.min(now - this.last, 0.25);
      this.last = now;
      if (this.frozen) this.acc = 0;
      while (this.acc >= STEP) {
        this.step();
        this.acc -= STEP;
      }
      this.render();
      this.frames++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  step(): void {
    this.scene?.update(STEP);
    this.input.endStep();
    this.steps++;
  }

  /** Solo pruebas: avanza n pasos de simulación de forma determinista. */
  advance(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  private render(): void {
    const { ctx, view } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1b1f3b';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    this.scene?.render(ctx, view);
  }
}
