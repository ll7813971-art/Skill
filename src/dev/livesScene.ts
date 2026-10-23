import type { Game, Scene, View } from '../engine/game';
import { Camera } from '../game/camera';
import { Enemies } from '../game/enemies';
import { Health, START_LIVES } from '../game/health';
import { Player } from '../game/player';
import { TileMap, TILE } from '../game/tilemap';
import { drawDebug } from './debugText';

// Prueba del sistema 8: un enemigo y un hueco para perder vidas.
const MAP = [
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '..............................',
  '.....................e........',
  '############....##############',
  '############....##############',
];

export class DevLivesScene implements Scene {
  map = new TileMap(MAP);
  player = new Player(6 * TILE, 10 * TILE - 28);
  enemies = new Enemies(this.map);
  health = new Health(START_LIVES, { x: this.player.x, y: this.player.y });
  cam: Camera;
  private t = 0;
  log: string[] = [];

  constructor(private game: Game) {
    this.cam = new Camera(game.view, this.map.width, this.map.height);
    this.cam.snapTo(this.player);
  }

  update(dt: number): void {
    this.t += dt;
    const input = this.game.input;
    if (!this.health.dead) this.player.update(dt, input, this.map);
    const res = this.enemies.update(dt, this.map, this.player, input.jump);
    this.health.update(dt, this.player, this.map, res.hurtBy);
    this.log.push(...this.health.events);
    this.cam.update(dt, this.player);
  }

  render(ctx: CanvasRenderingContext2D, view: View): void {
    ctx.save();
    this.cam.apply(ctx);
    const [x0, x1] = this.cam.visible();
    this.map.render(ctx, x0, x1);
    this.enemies.render(ctx, x0, x1);
    if (this.health.visible(this.t)) this.player.render(ctx);
    ctx.restore();
    this.game.input.render(ctx);
    const h = this.health;
    drawDebug(ctx, view, [
      `vidas=${h.lives} invuln=${h.invulnT.toFixed(2)} fin=${h.dead}`,
      `eventos=${this.log.join(',')}`,
    ]);
  }

  debug() {
    const p = this.player;
    const h = this.health;
    return {
      lives: h.lives, invulnT: h.invulnT, dead: h.dead, safe: h.safe, log: [...this.log],
      x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, onGround: p.onGround, control: p.controlEnabled,
      enemies: this.enemies.list.map((e) => ({ x: e.x, y: e.y, w: e.w, h: e.h, alive: e.alive })),
      buttons: this.game.input.buttons, scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
