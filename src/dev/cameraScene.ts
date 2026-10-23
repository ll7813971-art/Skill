import type { Game, Scene, View } from '../engine/game';
import { Camera } from '../game/camera';
import { Player } from '../game/player';
import { TileMap, TILE } from '../game/tilemap';
import { drawDebug } from './debugText';

// Prueba del sistema 5: nivel de 80 tiles con postes numerados cada 10.
const COLS = 80;
const MAP = Array.from({ length: 12 }, (_, r) => {
  if (r >= 10) return '#'.repeat(COLS);
  if (r === 7) return '.'.repeat(30) + '=====' + '.'.repeat(COLS - 35);
  return '.'.repeat(COLS);
});

export class DevCameraScene implements Scene {
  map = new TileMap(MAP);
  player = new Player(3 * TILE, 10 * TILE - 28);
  cam: Camera;

  constructor(private game: Game) {
    this.cam = new Camera(game.view, this.map.width, this.map.height);
    this.cam.snapTo(this.player);
  }

  update(dt: number): void {
    this.player.update(dt, this.game.input, this.map);
    this.cam.update(dt, this.player);
  }

  render(ctx: CanvasRenderingContext2D, view: View): void {
    ctx.save();
    this.cam.apply(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 16px sans-serif';
    for (let c = 0; c < COLS; c += 10) {
      ctx.fillRect(c * TILE, 6 * TILE, 3, 4 * TILE);
      ctx.fillText(String(c), c * TILE + 6, 6 * TILE + 16);
    }
    const [x0, x1] = this.cam.visible();
    this.map.render(ctx, x0, x1);
    this.player.render(ctx);
    ctx.restore();
    this.game.input.render(ctx);
    const p = this.player;
    drawDebug(ctx, view, [
      `cam.x=${this.cam.x.toFixed(1)} max=${(this.map.width - view.w).toFixed(1)}`,
      `jugador en pantalla x=${(p.x - this.cam.x).toFixed(0)}`,
    ]);
  }

  debug() {
    return {
      camX: this.cam.x, camY: this.cam.y, px: this.player.x, pw: this.player.w,
      mapW: this.map.width, viewW: this.game.view.w,
      buttons: this.game.input.buttons, scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
