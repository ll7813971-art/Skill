import type { Game, Scene, View } from '../engine/game';
import { FlatWorld } from '../game/body';
import { Player } from '../game/player';
import { drawDebug } from './debugText';

// Prueba del sistema 3: carrera y salto sobre un suelo plano.
export class DevMovementScene implements Scene {
  private world: FlatWorld;
  private player: Player;
  private apex = 0;
  private lastApex = 0;
  private jumpStartY = 0;
  private jumps = 0;

  constructor(private game: Game) {
    this.world = new FlatWorld(300, 0, game.view.w);
    this.player = new Player(120, 300 - 28);
  }

  update(dt: number): void {
    this.world.maxX = this.game.view.w;
    const p = this.player;
    const yBefore = p.y;
    p.update(dt, this.game.input, this.world);
    if (p.events.includes('jump')) {
      this.jumps++;
      this.jumpStartY = yBefore;
      this.apex = 0;
    }
    if (!p.onGround) this.apex = Math.max(this.apex, this.jumpStartY - p.y);
    if (p.events.includes('land')) this.lastApex = this.apex;
  }

  render(ctx: CanvasRenderingContext2D, view: View): void {
    ctx.fillStyle = '#3a8f5c';
    ctx.fillRect(0, this.world.floorY, view.w, view.h - this.world.floorY);
    // Marcas de altura cada tile (32 px) para leer la altura del salto.
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '10px monospace';
    for (let t = 1; t <= 5; t++) {
      const y = this.world.floorY - t * 32;
      ctx.fillRect(0, y, 14, 1);
      ctx.fillText(`${t}`, 2, y - 2);
    }
    this.player.render(ctx);
    this.game.input.render(ctx);
    const p = this.player;
    drawDebug(ctx, view, [
      `x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} suelo=${p.onGround}`,
      `vx=${p.vx.toFixed(0)} vy=${p.vy.toFixed(0)}`,
      `saltos=${this.jumps} altura=${(this.lastApex / 32).toFixed(2)} tiles`,
    ]);
  }

  debug() {
    const p = this.player;
    return {
      x: p.x, y: p.y, vx: p.vx, vy: p.vy, onGround: p.onGround, jumps: this.jumps,
      apex: this.apex, lastApex: this.lastApex, floorY: this.world.floorY, h: p.h,
      buttons: this.game.input.buttons, scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
