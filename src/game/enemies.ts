import type { Body } from './body';
import type { Player } from './player';
import type { TileMap } from './tilemap';
import { TILE } from './tilemap';

export type EnemyKind = 'walker' | 'hopper';

const GRAVITY = 1800;
const WALK_SPEED = 55;
const HOP_SPEED = 520;
const HOP_VX = 80;
// Reposo en el suelo entre saltos; con ~0,6 s en el aire da un ritmo de ~1,5 s.
const HOP_REST = 0.9;
const HOP_RANGE = 320;
const DEATH_TIME = 0.35;
export const STOMP_BOUNCE = 400;
export const STOMP_BOUNCE_HELD = 620;
export const STOMP_POINTS = 50;

export class Enemy implements Body {
  vx = 0;
  vy = 0;
  onGround = false;
  hitWall = false;
  hitCeiling = false;
  dir: 1 | -1 = -1;
  alive = true;
  deadT = 0;
  hopT: number;
  hops = 0;
  turns = 0;
  t = Math.random() * 10;
  w: number;
  h: number;
  x: number;
  y: number;

  constructor(readonly kind: EnemyKind, c: number, r: number) {
    this.w = kind === 'walker' ? 26 : 24;
    this.h = kind === 'walker' ? 20 : 22;
    this.x = c * TILE + (TILE - this.w) / 2;
    this.y = (r + 1) * TILE - this.h;
    this.hopT = HOP_REST * 0.6;
  }

  update(dt: number, map: TileMap, player: Body): void {
    this.t += dt;
    if (!this.alive) {
      this.deadT += dt;
      return;
    }
    if (this.kind === 'walker') {
      this.vx = this.dir * WALK_SPEED;
    } else if (this.onGround) {
      this.vx = 0;
      this.hopT -= dt;
      if (this.hopT <= 0) {
        const dx = player.x + player.w / 2 - (this.x + this.w / 2);
        if (Math.abs(dx) < HOP_RANGE) this.dir = dx < 0 ? -1 : 1;
        this.vx = this.dir * HOP_VX;
        this.vy = -HOP_SPEED;
        this.hopT = HOP_REST;
        this.hops++;
      }
    }
    this.vy = Math.min(this.vy + GRAVITY * dt, 800);
    const wasGround = this.onGround;
    map.moveBody(this, dt);
    if (this.hitWall) this.turn();
    // El patrullero no se tira por los bordes.
    if (this.kind === 'walker' && this.onGround && wasGround) {
      const fx = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
      if (!map.groundAt(fx, this.y + this.h + 1)) this.turn();
    }
  }

  private turn(): void {
    this.dir = this.dir > 0 ? -1 : 1;
    this.turns++;
  }

  /** Puede retirarse de la lista (animación de muerte acabada o caído). */
  gone(mapH: number): boolean {
    return (!this.alive && this.deadT > DEATH_TIME) || this.y > mapH + 64;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    if (!this.alive) {
      // Aplastado
      const k = Math.min(1, this.deadT / DEATH_TIME);
      ctx.globalAlpha = 1 - k;
      ctx.scale(1 + 0.4 * k, 0.3);
    } else if (this.kind === 'hopper') {
      const squash = this.onGround ? 1 - 0.12 * Math.max(0, 1 - this.hopT * 3) : 1.12;
      ctx.scale(2 - squash, squash);
    }
    if (this.kind === 'walker') {
      ctx.fillStyle = '#8e5bd6';
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.quadraticCurveTo(-w / 2, -h * 1.25, 0, -h);
      ctx.quadraticCurveTo(w / 2, -h * 1.25, w / 2, 0);
      ctx.closePath();
      ctx.fill();
      // Patitas que se alternan al andar
      const step = Math.sin(this.t * 12) * 2;
      ctx.fillStyle = '#5d3a94';
      ctx.fillRect(-w / 2 + 3, -3 + step * 0.5, 7, 3);
      ctx.fillRect(w / 2 - 10, -3 - step * 0.5, 7, 3);
      this.eyes(ctx, -h * 0.62, 3.4);
      // Ceño
      ctx.strokeStyle = '#1b1f3b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -h * 0.9); ctx.lineTo(-2, -h * 0.8);
      ctx.moveTo(8, -h * 0.9); ctx.lineTo(2, -h * 0.8);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3fbf9f';
      ctx.beginPath();
      ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a8f76';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.3, w * 0.32, h * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      this.eyes(ctx, -h * 0.78, 4);
    }
    ctx.restore();
  }

  private eyes(ctx: CanvasRenderingContext2D, ey: number, r: number): void {
    for (const ex of [-5, 5]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b1f3b';
      ctx.beginPath(); ctx.arc(ex + this.dir * 1.3, ey, r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export interface EnemyContact {
  stomped: Enemy[];
  /** Enemigo que ha tocado al jugador de lado o por debajo (o null). */
  hurtBy: Enemy | null;
}

export class Enemies {
  list: Enemy[];
  stomps = 0;

  constructor(map: TileMap) {
    this.list = [
      ...map.find('e').map(({ c, r }) => new Enemy('walker', c, r)),
      ...map.find('j').map(({ c, r }) => new Enemy('hopper', c, r)),
    ];
  }

  update(dt: number, map: TileMap, player: Player, jumpHeld: boolean): EnemyContact {
    const res: EnemyContact = { stomped: [], hurtBy: null };
    for (const e of this.list) {
      e.update(dt, map, player);
      if (!e.alive || !overlaps(player, e)) continue;
      // Pisotón: el jugador cae y apenas ha penetrado la parte superior.
      const pen = player.y + player.h - e.y;
      if (player.vy > 0 && pen <= Math.max(14, player.vy * dt + 6)) {
        e.alive = false;
        e.vx = e.vy = 0;
        player.y = e.y - player.h;
        player.bounce(jumpHeld ? STOMP_BOUNCE_HELD : STOMP_BOUNCE, jumpHeld);
        res.stomped.push(e);
        this.stomps++;
      } else {
        res.hurtBy = e;
      }
    }
    this.list = this.list.filter((e) => !e.gone(map.height));
    return res;
  }

  render(ctx: CanvasRenderingContext2D, x0: number, x1: number): void {
    for (const e of this.list) if (e.x + e.w >= x0 && e.x <= x1) e.render(ctx);
  }
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
