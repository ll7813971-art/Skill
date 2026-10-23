import type { Game, Scene, View } from '../engine/game';
import { drawDebug } from './debugText';

// Prueba del sistema 2: botones táctiles en pantalla con multitoque.
export class DevInputScene implements Scene {
  private taps = 0;
  constructor(private game: Game) {}
  update(): void {
    this.taps += this.game.input.taps.length;
  }
  render(ctx: CanvasRenderingContext2D, view: View): void {
    const i = this.game.input;
    i.render(ctx);
    drawDebug(ctx, view, [
      `izq=${i.left} der=${i.right} salto=${i.jump}`,
      `dedos=${i.activePointers} saltos=${i.jumpPresses} toques=${this.taps}`,
    ]);
  }
  debug() {
    const i = this.game.input;
    return {
      left: i.left, right: i.right, jump: i.jump, pointers: i.activePointers,
      jumpPresses: i.jumpPresses, taps: this.taps, buttons: i.buttons,
      scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
