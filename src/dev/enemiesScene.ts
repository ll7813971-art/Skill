import type { Game, Scene, View } from '../engine/game';
import { Camera } from '../game/camera';
import { Enemies } from '../game/enemies';
import { Player } from '../game/player';
import { TileMap, TILE } from '../game/tilemap';
import { drawDebug } from './debugText';

// Prueba del sistema 7: patrullero sobre una plataforma con bordes,
// patrullero entre paredes y saltarín. El "daño" aquí solo se cuenta.
const MAP = [
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '..........................',
  '...........e..............',
  '........######............',
  '..........................',
  '..#....e...#.......j......',
  '##########################',
  '##########################',
];

export class DevEnemiesScene implements Scene {
  map = new TileMap(MAP);
  player = new Player(15 * TILE, 10 * TILE - 28);
  enemies = new Enemies(this.map);
  cam: Camera;
  hurts = 0;
  private hurtCooldown = 0;

  constructor(private game: Game) {
    this.cam = new Camera(game.view, this.map.width, this.map.height);
    this.cam.snapTo(this.player);
  }

  update(dt: number): void {
    const input = this.game.input;
    this.player.update(dt, input, this.map);
    const res = this.enemies.update(dt, this.map, this.player, input.jump);
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
    if (res.hurt && this.hurtCooldown === 0) {
      this.hurts++;
      this.hurtCooldown = 1;
    }
    this.cam.update(dt, this.player);
  }

  render(ctx: CanvasRenderingContext2D, view: View): void {
    ctx.save();
    this.cam.apply(ctx);
    const [x0, x1] = this.cam.visible();
    this.map.render(ctx, x0, x1);
    this.enemies.render(ctx, x0, x1);
    this.player.render(ctx);
    ctx.restore();
    this.game.input.render(ctx);
    drawDebug(ctx, view, [
      `enemigos=${this.enemies.list.length} pisotones=${this.enemies.stomps} golpes=${this.hurts}`,
    ]);
  }

  debug() {
    const p = this.player;
    return {
      enemies: this.enemies.list.map((e) => ({
        kind: e.kind, x: e.x, y: e.y, w: e.w, h: e.h, alive: e.alive, turns: e.turns, hops: e.hops, dir: e.dir, onGround: e.onGround,
      })),
      stomps: this.enemies.stomps, hurts: this.hurts,
      x: p.x, y: p.y, vy: p.vy, onGround: p.onGround,
      buttons: this.game.input.buttons, scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
