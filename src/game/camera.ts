import type { View } from '../engine/game';
import type { Body } from './body';

// Cámara con seguimiento suave, mirada hacia delante en la dirección de
// avance y límites del nivel. La sacudida (shake) se suma solo al dibujar.
export class Camera {
  x = 0;
  y = 0;
  shakeT = 0;
  shakeMag = 0;
  private lookAhead = 0;

  constructor(private view: View, public worldW: number, public worldH: number) {}

  snapTo(t: Body): void {
    this.lookAhead = 0;
    this.x = this.targetX(t);
    this.y = this.targetY(t);
    this.clamp();
  }

  update(dt: number, t: Body & { facing: number }): void {
    // La mirada hacia delante crece al correr, para ver lo que viene.
    const want = Math.abs(t.vx) > 40 ? t.facing * this.view.w * 0.12 : this.lookAhead;
    this.lookAhead += (want - this.lookAhead) * Math.min(1, dt * 2.5);
    const k = 1 - Math.exp(-dt * 8);
    this.x += (this.targetX(t) - this.x) * k;
    this.y += (this.targetY(t) - this.y) * k;
    this.clamp();
    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  shake(mag: number, time: number): void {
    this.shakeMag = mag;
    this.shakeT = time;
  }

  private targetX(t: Body): number {
    return t.x + t.w / 2 - this.view.w * 0.42 + this.lookAhead;
  }

  private targetY(t: Body): number {
    return t.y + t.h / 2 - this.view.h * 0.55;
  }

  clamp(): void {
    this.x = Math.max(0, Math.min(this.x, this.worldW - this.view.w));
    this.y = Math.max(0, Math.min(this.y, this.worldH - this.view.h));
    if (this.worldW < this.view.w) this.x = (this.worldW - this.view.w) / 2;
  }

  /** Aplica la transformación de la cámara (redondeada a píxel físico). */
  apply(ctx: CanvasRenderingContext2D): void {
    let sx = 0;
    let sy = 0;
    if (this.shakeT > 0) {
      sx = (Math.random() * 2 - 1) * this.shakeMag;
      sy = (Math.random() * 2 - 1) * this.shakeMag;
    }
    const s = this.view.scale;
    ctx.translate(-Math.round((this.x + sx) * s) / s, -Math.round((this.y + sy) * s) / s);
  }

  /** Rango horizontal visible, con margen, para dibujar solo lo necesario. */
  visible(): [number, number] {
    return [this.x - 64, this.x + this.view.w + 64];
  }
}
