import type { Game, Scene, View } from '../engine/game';
import { Camera } from '../game/camera';
import { Coins, COIN_POINTS } from '../game/coins';
import { Player } from '../game/player';
import { TileMap, TILE } from '../game/tilemap';
import { drawDebug } from './debugText';

// Prueba del sistema 6: monedas a ras de suelo y en arco (requieren saltar).
const MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '.........................ooo............',
  '........................o...o...........',
  '.....oooooo.............................',
  '########################################',
  '########################################',
];

export class DevCoinsScene implements Scene {
  map = new TileMap(MAP);
  player = new Player(2 * TILE, 10 * TILE - 28);
  coins = new Coins(this.map);
  cam: Camera;
  score = 0;

  constructor(private game: Game) {
    this.cam = new Camera(game.view, this.map.width, this.map.height);
    this.cam.snapTo(this.player);
  }

  update(dt: number): void {
    this.player.update(dt, this.game.input, this.map);
    this.score += this.coins.update(dt, this.player).length * COIN_POINTS;
    this.cam.update(dt, this.player);
  }

  render(ctx: CanvasRenderingContext2D, view: View): void {
    ctx.save();
    this.cam.apply(ctx);
    const [x0, x1] = this.cam.visible();
    this.map.render(ctx, x0, x1);
    this.coins.render(ctx, x0, x1);
    this.player.render(ctx);
    ctx.restore();
    this.game.input.render(ctx);
    drawDebug(ctx, view, [`monedas=${this.coins.collected}/${this.coins.total} puntos=${this.score}`]);
  }

  debug() {
    return {
      collected: this.coins.collected, total: this.coins.total, score: this.score,
      x: this.player.x, onGround: this.player.onGround,
      buttons: this.game.input.buttons, scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
