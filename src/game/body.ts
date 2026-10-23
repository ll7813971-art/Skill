// Cuerpo físico con caja de colisión (x, y = esquina superior izquierda).
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  hitWall: boolean;
  hitCeiling: boolean;
}

/** Mundo que integra la velocidad de un cuerpo y resuelve sus colisiones. */
export interface World {
  moveBody(b: Body, dt: number): void;
}

/** Mundo mínimo para pruebas: un suelo plano y dos paredes laterales. */
export class FlatWorld implements World {
  constructor(public floorY: number, public minX = 0, public maxX = Infinity) {}
  moveBody(b: Body, dt: number): void {
    b.hitWall = b.hitCeiling = false;
    b.x += b.vx * dt;
    if (b.x < this.minX) { b.x = this.minX; b.vx = 0; b.hitWall = true; }
    if (b.x + b.w > this.maxX) { b.x = this.maxX - b.w; b.vx = 0; b.hitWall = true; }
    b.y += b.vy * dt;
    b.onGround = false;
    if (b.y + b.h >= this.floorY && b.vy >= 0) {
      b.y = this.floorY - b.h;
      b.vy = 0;
      b.onGround = true;
    }
  }
}
