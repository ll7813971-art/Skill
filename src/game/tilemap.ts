import type { Body, World } from './body';

export const TILE = 32;

// '#' tierra con césped, '=' ladrillo, '-' plataforma atravesable desde abajo.
// Cualquier otro carácter es vacío para la colisión (los niveles lo usan para
// marcar entidades: jugador, monedas, enemigos, meta, pinchos...).
const SOLID = new Set(['#', '=']);
const ONE_WAY = '-';
const EPS = 0.001;

export class TileMap implements World {
  readonly rows: string[];
  readonly cols: number;
  readonly width: number;
  readonly height: number;

  constructor(rows: string[]) {
    this.cols = Math.max(...rows.map((r) => r.length));
    this.rows = rows.map((r) => r.padEnd(this.cols, '.'));
    this.width = this.cols * TILE;
    this.height = this.rows.length * TILE;
  }

  at(c: number, r: number): string {
    if (c < 0 || c >= this.cols) return '#'; // los laterales del mapa son pared
    if (r < 0 || r >= this.rows.length) return '.'; // arriba y abajo, vacío
    return this.rows[r][c];
  }

  isSolid(c: number, r: number): boolean {
    return SOLID.has(this.at(c, r));
  }

  /** Posiciones (en tiles) de un carácter marcador del mapa. */
  find(ch: string): Array<{ c: number; r: number }> {
    const out: Array<{ c: number; r: number }> = [];
    this.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === ch) out.push({ c, r });
    });
    return out;
  }

  moveBody(b: Body, dt: number): void {
    b.hitWall = b.hitCeiling = false;

    // Eje X
    b.x += b.vx * dt;
    const r0 = Math.floor(b.y / TILE);
    const r1 = Math.floor((b.y + b.h - EPS) / TILE);
    if (b.vx > 0) {
      const c = Math.floor((b.x + b.w - EPS) / TILE);
      for (let r = r0; r <= r1; r++) {
        if (this.isSolid(c, r)) {
          b.x = c * TILE - b.w;
          b.vx = 0;
          b.hitWall = true;
          break;
        }
      }
    } else if (b.vx < 0) {
      const c = Math.floor(b.x / TILE);
      for (let r = r0; r <= r1; r++) {
        if (this.isSolid(c, r)) {
          b.x = (c + 1) * TILE;
          b.vx = 0;
          b.hitWall = true;
          break;
        }
      }
    }

    // Eje Y
    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    b.onGround = false;
    const c0 = Math.floor(b.x / TILE);
    const c1 = Math.floor((b.x + b.w - EPS) / TILE);
    if (b.vy > 0) {
      const r = Math.floor((b.y + b.h - EPS) / TILE);
      for (let c = c0; c <= c1; c++) {
        const t = this.at(c, r);
        const top = r * TILE;
        // Las plataformas atravesables solo frenan si veníamos de encima.
        if (SOLID.has(t) || (t === ONE_WAY && prevBottom <= top + EPS)) {
          b.y = top - b.h;
          b.vy = 0;
          b.onGround = true;
          break;
        }
      }
    } else if (b.vy < 0) {
      const r = Math.floor(b.y / TILE);
      for (let c = c0; c <= c1; c++) {
        if (this.isSolid(c, r)) {
          b.y = (r + 1) * TILE;
          b.vy = 0;
          b.hitCeiling = true;
          break;
        }
      }
    }
  }

  /** ¿Hay suelo justo bajo el cuerpo? (útil para la IA de los enemigos). */
  groundAt(x: number, y: number): boolean {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    const t = this.at(c, r);
    return SOLID.has(t) || t === ONE_WAY;
  }

  /** Dibuja solo las columnas visibles [x0, x1]. */
  render(ctx: CanvasRenderingContext2D, x0: number, x1: number): void {
    const cStart = Math.max(0, Math.floor(x0 / TILE));
    const cEnd = Math.min(this.cols - 1, Math.floor(x1 / TILE));
    for (let r = 0; r < this.rows.length; r++) {
      for (let c = cStart; c <= cEnd; c++) {
        const t = this.rows[r][c];
        const x = c * TILE;
        const y = r * TILE;
        if (t === '#') {
          ctx.fillStyle = '#8a5a3b';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#7a4e33';
          ctx.fillRect(x + 6, y + 12, 6, 5);
          ctx.fillRect(x + 20, y + 22, 5, 4);
          if (!this.isSolid(c, r - 1)) {
            ctx.fillStyle = '#4cc46a';
            ctx.fillRect(x, y, TILE, 8);
            ctx.fillStyle = '#3aa457';
            ctx.fillRect(x, y + 8, TILE, 2);
          }
        } else if (t === '=') {
          ctx.fillStyle = '#d9773a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#b85f2a';
          ctx.fillRect(x, y + 15, TILE, 2);
          ctx.fillRect(x + 15, y, 2, 15);
          ctx.fillRect(x + 7, y + 17, 2, 15);
          ctx.fillRect(x + 23, y + 17, 2, 15);
          ctx.strokeStyle = '#8f4519';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else if (t === ONE_WAY) {
          ctx.fillStyle = '#c9a36b';
          ctx.fillRect(x, y, TILE, 9);
          ctx.fillStyle = '#9c7a4a';
          ctx.fillRect(x, y + 9, TILE, 3);
          ctx.fillRect(x + 4, y + 12, 3, 6);
          ctx.fillRect(x + TILE - 7, y + 12, 3, 6);
        }
      }
    }
  }
}
