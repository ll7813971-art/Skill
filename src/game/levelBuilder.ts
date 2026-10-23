// Constructor de niveles: genera las filas ASCII del TileMap a partir de
// operaciones legibles. Filas: 0 = arriba, 11 = abajo; el suelo normal tiene
// su superficie en la fila 10.
export const ROWS = 12;
export const GROUND = 10;

export class LevelBuilder {
  private g: string[][];

  constructor(readonly cols: number) {
    this.g = Array.from({ length: ROWS }, () => Array(cols).fill('.'));
  }

  private set(c: number, r: number, ch: string): this {
    if (c < 0 || c >= this.cols || r < 0 || r >= ROWS) throw new Error(`Fuera del nivel: ${c},${r}`);
    this.g[r][c] = ch;
    return this;
  }

  /** Suelo de tierra en las columnas [from, to], con la superficie en `top`. */
  ground(from: number, to: number, top = GROUND): this {
    for (let c = from; c <= to; c++) for (let r = top; r < ROWS; r++) this.set(c, r, '#');
    return this;
  }

  /** Bloque de ladrillo de w×h con la esquina superior izquierda en (c, r). */
  block(c: number, r: number, w = 1, h = 1): this {
    for (let x = c; x < c + w; x++) for (let y = r; y < r + h; y++) this.set(x, y, '=');
    return this;
  }

  /** Plataforma atravesable desde abajo. */
  oneway(c: number, r: number, w: number): this {
    for (let x = c; x < c + w; x++) this.set(x, r, '-');
    return this;
  }

  /** Fila de n monedas. */
  coins(c: number, r: number, n = 1): this {
    for (let x = c; x < c + n; x++) this.set(x, r, 'o');
    return this;
  }

  walker(c: number, r = GROUND - 1): this {
    return this.set(c, r, 'e');
  }

  hopper(c: number, r = GROUND - 1): this {
    return this.set(c, r, 'j');
  }

  start(c: number, r = GROUND - 1): this {
    return this.set(c, r, 'P');
  }

  flag(c: number, r = GROUND - 1): this {
    return this.set(c, r, 'F');
  }

  rows(): string[] {
    return this.g.map((r) => r.join(''));
  }
}
