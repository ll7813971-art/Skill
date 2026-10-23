import type { Game, Scene, View } from '../engine/game';
import { Player } from '../game/player';
import { TileMap, TILE } from '../game/tilemap';
import { drawDebug } from './debugText';

// Prueba del sistema 4: suelo, pared, techo, hueco y plataforma atravesable.
const MAP = [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..====....................',
  '................-----.....',
  '.#........................',
  '.#........................',
  '##########...#############',
  '##########...#############',
];

export class DevCollisionScene implements Scene {
  map = new TileMap(MAP);
  player: Player;
  private jumps = 0;
  private wallHits = 0;
  private ceilingHits = 0;

  constructor(private game: Game) {
    this.player = new Player(4 * TILE, 10 * TILE - 28);
  }

  update(dt: number): void {
    const p = this.player;
    p.update(dt, this.game.input, this.map);
    if (p.events.includes('jump')) this.jumps++;
    if (p.hitWall) this.wallHits++;
    if (p.hitCeiling) this.ceilingHits++;
    if (p.y > this.map.height + 64) {
      p.x = 4 * TILE;
      p.y = 10 * TILE - 28;
      p.vx = p.vy = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D, view: View): void {
    this.map.render(ctx, 0, view.w);
    this.player.render(ctx);
    this.game.input.render(ctx);
    const p = this.player;
    drawDebug(ctx, view, [
      `x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} suelo=${p.onGround}`,
      `vx=${p.vx.toFixed(0)} vy=${p.vy.toFixed(0)} coyote=${p.coyoteT.toFixed(2)}`,
      `pared=${this.wallHits} techo=${this.ceilingHits} saltos=${this.jumps}`,
    ]);
  }

  debug() {
    const p = this.player;
    return {
      x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, onGround: p.onGround,
      jumps: this.jumps, wallHits: this.wallHits, ceilingHits: this.ceilingHits,
      buttons: this.game.input.buttons, scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
