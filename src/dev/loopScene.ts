import type { Game, Scene, View } from '../engine/game';
import { drawDebug } from './debugText';

// Prueba del sistema 1: el bucle avanza a paso fijo y el canvas se escala.
export class DevLoopScene implements Scene {
  private t = 0;
  private x = 0;
  constructor(private game: Game) {}
  update(dt: number): void {
    this.t += dt;
    this.x = (this.x + 120 * dt) % this.game.view.w;
  }
  render(ctx: CanvasRenderingContext2D, view: View): void {
    ctx.strokeStyle = '#2c335e';
    for (let gx = 0; gx < view.w; gx += 32) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, view.h); ctx.stroke();
    }
    for (let gy = 0; gy < view.h; gy += 32) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(view.w, gy); ctx.stroke();
    }
    ctx.fillStyle = '#ffcc33';
    ctx.fillRect(this.x, view.h / 2 - 16, 32, 32);
    drawDebug(ctx, view, [
      `t=${this.t.toFixed(2)}s steps=${this.game.steps}`,
      `view=${view.w.toFixed(0)}x${view.h} scale=${view.scale.toFixed(2)}`,
    ]);
  }
  debug() {
    return { t: this.t, x: this.x, view: { ...this.game.view } };
  }
}
