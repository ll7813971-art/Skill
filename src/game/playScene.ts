import type { Game, Scene, View } from '../engine/game';
import { drawBackground } from './background';
import { Camera } from './camera';
import { Coins, COIN_POINTS } from './coins';
import { Enemies, STOMP_POINTS, overlaps } from './enemies';
import { Health } from './health';
import { LEVELS, type LevelDef } from './levels';
import { NO_INPUT, Player } from './player';
import { TileMap, TILE } from './tilemap';
import { drawHud, PAUSE_BUTTON } from '../ui/hud';
import { dim, drawButton, hitButton, text, type UIButton } from '../ui/ui';

export const LEVEL_BONUS = 100;
const COMPLETE_DELAY = 1.6;
const DEAD_DELAY = 1.4;

/** Estado de la partida que se conserva entre niveles. */
export interface RunState {
  level: number; // índice en LEVELS
  lives: number;
  score: number;
}

export type Sfx = 'jump' | 'land' | 'coin' | 'stomp' | 'hurt' | 'fall' | 'complete' | 'dead';

export interface PlayHooks {
  onComplete(): void;
  onGameOver(): void;
  onMenu?(): void;
  sfx?(name: Sfx): void;
}

export type PlayState = 'playing' | 'complete' | 'dead';

export class PlayScene implements Scene {
  readonly def: LevelDef;
  readonly map: TileMap;
  readonly coins: Coins;
  readonly enemies: Enemies;
  readonly player: Player;
  readonly health: Health;
  readonly cam: Camera;
  readonly flag: { x: number; y: number };
  state: PlayState = 'playing';
  t = 0;
  private stateT = 0;
  paused = false;

  constructor(private game: Game, readonly run: RunState, private hooks: PlayHooks) {
    this.def = LEVELS[run.level];
    this.map = new TileMap(this.def.rows);
    this.coins = new Coins(this.map);
    this.enemies = new Enemies(this.map);
    const start = this.map.find('P')[0];
    const flag = this.map.find('F')[0];
    if (!start || !flag) throw new Error(`Nivel ${this.def.name}: falta P o F`);
    this.player = new Player(start.c * TILE + (TILE - 22) / 2, (start.r + 1) * TILE - 28);
    this.flag = { x: flag.c * TILE + TILE / 2, y: (flag.r + 1) * TILE };
    this.health = new Health(run.lives, { x: this.player.x, y: this.player.y });
    this.cam = new Camera(game.view, this.map.width, this.map.height);
    this.cam.snapTo(this.player);
    game.input.controlsEnabled = true;
    // Pausar solo si la app pasa a segundo plano (llamada, cambio de app...).
    this.onHidden = () => {
      if (document.hidden && this.state === 'playing') this.setPaused(true);
    };
    document.addEventListener('visibilitychange', this.onHidden);
  }

  private onHidden: () => void;

  leave(): void {
    document.removeEventListener('visibilitychange', this.onHidden);
  }

  setPaused(on: boolean): void {
    this.paused = on;
    this.game.input.releaseAll();
    this.game.input.controlsEnabled = !on;
  }

  pauseButtons(view: View): UIButton[] {
    return [
      { id: 'resume', label: 'Continuar', x: view.w / 2, y: view.h * 0.5, w: 220, h: 56, primary: true },
      { id: 'menu', label: 'Salir al menú', x: view.w / 2, y: view.h * 0.5 + 72, w: 220, h: 56 },
    ];
  }

  private sfx(n: Sfx): void {
    this.hooks.sfx?.(n);
  }

  /** Caja de la meta: el mástil y un poco a cada lado. */
  get flagBox() {
    return { x: this.flag.x - 10, y: this.flag.y - 4 * TILE, w: 20, h: 4 * TILE };
  }

  update(dt: number): void {
    const input = this.game.input;
    if (this.paused) {
      const id = hitButton(this.pauseButtons(this.game.view), input.taps);
      if (id === 'resume') this.setPaused(false);
      else if (id === 'menu') this.hooks.onMenu?.();
      return;
    }
    if (this.state === 'playing' && hitButton([PAUSE_BUTTON(this.game.view)], input.taps)) {
      this.setPaused(true);
      return;
    }
    this.t += dt;
    const p = this.player;

    if (this.state === 'playing') {
      p.update(dt, input, this.map);
      if (p.events.includes('jump')) this.sfx('jump');
      if (p.events.includes('land')) this.sfx('land');

      const res = this.enemies.update(dt, this.map, p, input.jump);
      for (let i = 0; i < res.stomped.length; i++) {
        this.run.score += STOMP_POINTS;
        this.sfx('stomp');
      }
      this.health.update(dt, p, this.map, res.hurtBy);
      this.run.lives = this.health.lives;
      for (const ev of this.health.events) if (ev !== 'dead') this.sfx(ev);

      for (let i = this.coins.update(dt, p).length; i > 0; i--) {
        this.run.score += COIN_POINTS;
        this.sfx('coin');
      }

      if (this.health.dead) {
        this.state = 'dead';
        this.stateT = 0;
        this.sfx('dead');
      } else if (overlaps(p, this.flagBox)) {
        this.state = 'complete';
        this.stateT = 0;
        this.run.score += LEVEL_BONUS;
        this.sfx('complete');
      }
    } else {
      this.stateT += dt;
      if (this.state === 'complete') {
        p.update(dt, NO_INPUT, this.map);
        this.enemies.update(dt, this.map, p, false);
        if (this.stateT >= COMPLETE_DELAY) this.hooks.onComplete();
      } else if (this.stateT >= DEAD_DELAY) {
        this.hooks.onGameOver();
      }
    }
    this.cam.update(dt, p);
  }

  render(ctx: CanvasRenderingContext2D, view: View): void {
    drawBackground(ctx, view, this.def.theme, this.cam.x, this.t);
    ctx.save();
    this.cam.apply(ctx);
    const [x0, x1] = this.cam.visible();
    this.map.render(ctx, x0, x1);
    this.drawFlag(ctx);
    this.coins.render(ctx, x0, x1);
    this.enemies.render(ctx, x0, x1);
    if (this.state !== 'dead' && this.health.visible(this.t)) this.player.render(ctx);
    ctx.restore();
    this.game.input.render(ctx);
    drawHud(ctx, view, this);
    if (this.paused) {
      dim(ctx, view);
      text(ctx, 'Pausa', view.w / 2, view.h * 0.28, 44);
      for (const b of this.pauseButtons(view)) drawButton(ctx, b);
    }
  }

  private drawFlag(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.flag;
    const top = y - 4 * TILE;
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(x - 2, top, 4, 4 * TILE);
    ctx.beginPath();
    ctx.arc(x, top, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcc33';
    ctx.fill();
    // Bandera ondeando; se vuelve verde al completar el nivel.
    const fy = top + 8;
    ctx.fillStyle = this.state === 'complete' ? '#4cc46a' : '#ff5a5f';
    ctx.beginPath();
    ctx.moveTo(x + 2, fy);
    for (let i = 0; i <= 8; i++) {
      const fx = x + 2 + i * 4;
      ctx.lineTo(fx, fy + Math.sin(this.t * 6 + i * 0.8) * 2);
    }
    for (let i = 8; i >= 0; i--) {
      const fx = x + 2 + i * 4;
      ctx.lineTo(fx, fy + 22 - (8 - i) * 1.2 + Math.sin(this.t * 6 + i * 0.8) * 2);
    }
    ctx.closePath();
    ctx.fill();
    // Base
    ctx.fillStyle = '#9aa0b5';
    ctx.fillRect(x - 8, y - 6, 16, 6);
  }

  debug() {
    const p = this.player;
    return {
      scene: 'play', paused: this.paused, buttons: this.paused ? this.pauseButtons(this.game.view) : [PAUSE_BUTTON(this.game.view)],
      controls: this.game.input.buttons, scale: this.game.view.scale, dpr: this.game.view.dpr,
      state: this.state, level: this.run.level, name: this.def.name, lives: this.run.lives, score: this.run.score,
      coins: this.coins.collected, coinsTotal: this.coins.total, enemies: this.enemies.list.length,
      x: p.x, y: p.y, w: p.w, h: p.h, onGround: p.onGround, flag: this.flag, mapW: this.map.width,
    };
  }
}
