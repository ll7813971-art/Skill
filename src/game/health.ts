import type { Body } from './body';
import type { Player } from './player';
import type { TileMap } from './tilemap';
import { TILE } from './tilemap';

export const START_LIVES = 3;
export const INVULN_TIME = 1.5;
const LOCK_TIME = 0.25;
const KNOCK_VX = 230;
const KNOCK_VY = 330;
const KNOCK_CHECK = 56; // distancia aproximada que recorre el retroceso

export type HealthEvent = 'hurt' | 'fall' | 'dead';

// Vidas y daño. Un golpe quita una vida con retroceso e invulnerabilidad
// (sin reiniciar el nivel); caer al vacío quita una vida y reaparece en el
// último punto de suelo seguro. Con 0 vidas, fin de partida.
export class Health {
  invulnT = 0;
  lockT = 0;
  dead = false;
  safe: { x: number; y: number };
  events: HealthEvent[] = [];

  constructor(public lives: number, start: { x: number; y: number }) {
    this.safe = { ...start };
  }

  get invulnerable(): boolean {
    return this.invulnT > 0;
  }

  update(dt: number, p: Player, map: TileMap, hurtBy: Body | null): void {
    this.events.length = 0;
    if (this.dead) return;
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.lockT = Math.max(0, this.lockT - dt);
    p.controlEnabled = this.lockT === 0;

    // Recordar el último punto seguro: en el suelo, con suelo firme bajo
    // ambos pies y sin estar recibiendo daño.
    if (p.onGround && !this.invulnerable) {
      const feet = p.y + p.h + 1;
      const margin = TILE * 0.5;
      if (map.groundAt(p.x - margin, feet) && map.groundAt(p.x + p.w + margin, feet)) {
        this.safe = { x: p.x, y: p.y };
      }
    }

    if (hurtBy && !this.invulnerable) {
      this.loseLife('hurt');
      if (!this.dead) {
        const away = p.x + p.w / 2 < hurtBy.x + hurtBy.w / 2 ? -1 : 1;
        // No empujar hacia un hueco: un golpe no debe costar dos vidas.
        const behind = p.x + p.w / 2 + away * KNOCK_CHECK;
        p.vx = map.groundAt(behind, p.y + p.h + 1) ? away * KNOCK_VX : 0;
        p.bounce(KNOCK_VY, false);
        this.lockT = LOCK_TIME;
        p.controlEnabled = false;
      }
    }

    if (p.y > map.height + TILE) {
      this.loseLife('fall');
      if (!this.dead) {
        p.x = this.safe.x;
        p.y = this.safe.y;
        p.vx = p.vy = 0;
      }
    }
  }

  private loseLife(cause: HealthEvent): void {
    this.lives = Math.max(0, this.lives - 1);
    this.invulnT = INVULN_TIME;
    this.events.push(cause);
    if (this.lives === 0) {
      this.dead = true;
      this.events.push('dead');
    }
  }

  /** El jugador parpadea mientras es invulnerable. */
  visible(time: number): boolean {
    return !this.invulnerable || Math.floor(time * 14) % 2 === 0;
  }
}
