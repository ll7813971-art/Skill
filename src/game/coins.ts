import type { Body } from './body';
import type { TileMap } from './tilemap';
import { TILE } from './tilemap';

export const COIN_POINTS = 10;
const R = 9; // radio de la moneda

export interface Coin {
  x: number; // centro
  y: number;
  taken: boolean;
  phase: number;
}

export class Coins {
  list: Coin[];
  collected = 0;
  private t = 0;

  constructor(map: TileMap) {
    this.list = map.find('o').map(({ c, r }, i) => ({
      x: c * TILE + TILE / 2,
      y: r * TILE + TILE / 2,
      taken: false,
      phase: i * 0.7,
    }));
  }

  get total(): number {
    return this.list.length;
  }

  /** Devuelve las monedas recogidas en este paso. */
  update(dt: number, p: Body): Coin[] {
    this.t += dt;
    const got: Coin[] = [];
    for (const c of this.list) {
      if (c.taken) continue;
      // Círculo contra caja: punto más cercano de la caja al centro.
      const nx = Math.max(p.x, Math.min(c.x, p.x + p.w));
      const ny = Math.max(p.y, Math.min(c.y, p.y + p.h));
      if ((nx - c.x) ** 2 + (ny - c.y) ** 2 < (R + 2) ** 2) {
        c.taken = true;
        this.collected++;
        got.push(c);
      }
    }
    return got;
  }

  render(ctx: CanvasRenderingContext2D, x0: number, x1: number): void {
    for (const c of this.list) {
      if (c.taken || c.x < x0 || c.x > x1) continue;
      const bob = Math.sin(this.t * 4 + c.phase) * 2.5;
      // Giro simulado estrechando el ancho.
      const sx = Math.abs(Math.cos(this.t * 3 + c.phase)) * 0.65 + 0.35;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.scale(sx, 1);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcc33';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e09a1a';
      ctx.stroke();
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(-1.5, -5, 3, 10);
      ctx.restore();
    }
  }
}
