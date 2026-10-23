import type { Body, World } from './body';

// Salto "ágil": rápido y preciso. Altura variable (soltar corta el salto),
// coyote time (saltar justo después de salir de un borde) y buffer (pulsar
// un instante antes de aterrizar también cuenta). Caída algo más pesada.
export const MOVE = {
  maxSpeed: 210,
  accelGround: 2400,
  decelGround: 2800,
  accelAir: 1600,
  gravity: 2000,
  fallGravityMul: 1.35,
  maxFall: 820,
  jumpSpeed: 670,
  jumpCut: 0.45,
  coyote: 0.09,
  buffer: 0.12,
};

export type PlayerEvent = 'jump' | 'land';

/** Lo mínimo que el jugador lee de la entrada (Input lo cumple). */
export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
}

export const NO_INPUT: PlayerInput = { left: false, right: false, jump: false, jumpPressed: false };

export class Player implements Body {
  x: number;
  y: number;
  w = 22;
  h = 28;
  vx = 0;
  vy = 0;
  onGround = false;
  hitWall = false;
  hitCeiling = false;
  facing: 1 | -1 = 1;
  coyoteT = 0;
  bufferT = 0;
  jumping = false;
  /** Eventos del último paso (para sonido y efectos). */
  events: PlayerEvent[] = [];
  /** Permite que otros sistemas (rebote al pisar enemigos) fuercen velocidad. */
  controlEnabled = true;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, input: PlayerInput, world: World): void {
    this.events.length = 0;
    const wasGround = this.onGround;
    const dir = this.controlEnabled ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (dir !== 0) this.facing = dir as 1 | -1;

    // Horizontal: aceleración hacia la velocidad objetivo.
    const target = dir * MOVE.maxSpeed;
    const accel = this.onGround
      ? dir !== 0 && Math.sign(dir) === Math.sign(this.vx || dir) ? MOVE.accelGround : MOVE.decelGround
      : MOVE.accelAir;
    // Sin control (retroceso de un golpe) se conserva la velocidad recibida.
    if (this.controlEnabled) this.vx = approach(this.vx, target, accel * dt);

    // Temporizadores de coyote y buffer.
    this.coyoteT = this.onGround ? MOVE.coyote : Math.max(0, this.coyoteT - dt);
    if (this.controlEnabled && input.jumpPressed) this.bufferT = MOVE.buffer;
    else this.bufferT = Math.max(0, this.bufferT - dt);

    if (this.bufferT > 0 && this.coyoteT > 0) {
      this.vy = -MOVE.jumpSpeed;
      this.bufferT = 0;
      this.coyoteT = 0;
      this.jumping = true;
      this.events.push('jump');
    }
    // Soltar el botón mientras sube corta el salto (altura variable).
    if (this.jumping && !input.jump && this.vy < 0) {
      this.vy *= MOVE.jumpCut;
      this.jumping = false;
    }
    if (this.vy >= 0) this.jumping = false;

    const g = this.vy > 0 ? MOVE.gravity * MOVE.fallGravityMul : MOVE.gravity;
    this.vy = Math.min(this.vy + g * dt, MOVE.maxFall);

    world.moveBody(this, dt);
    if (this.hitCeiling) this.jumping = false;
    if (this.onGround && !wasGround) this.events.push('land');
  }

  /** Impulso externo hacia arriba (p. ej. al pisar un enemigo). */
  bounce(speed: number, holdingJump: boolean): void {
    this.vy = -speed;
    this.jumping = holdingJump;
    this.onGround = false;
    this.coyoteT = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(this.facing, 1);
    // Cuerpo
    ctx.fillStyle = '#ff5a5f';
    roundRect(ctx, -w / 2, -h, w, h, 7);
    ctx.fill();
    // Barriga
    ctx.fillStyle = '#ffd1c2';
    roundRect(ctx, -w / 2 + 4, -h * 0.45, w - 8, h * 0.35, 4);
    ctx.fill();
    // Ojo mirando hacia delante
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(4, -h + 9, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1f3b';
    ctx.beginPath(); ctx.arc(5.5, -h + 9, 2, 0, Math.PI * 2); ctx.fill();
    // Pañuelo
    ctx.fillStyle = '#ffcc33';
    ctx.fillRect(-w / 2, -h + 14, w, 3);
    ctx.restore();
  }
}

export function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
