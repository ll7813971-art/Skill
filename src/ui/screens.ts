import type { Game, Scene, View } from '../engine/game';
import { drawBackground } from '../game/background';
import { LEVELS } from '../game/levels';
import { Player } from '../game/player';
import { dim, drawButton, hitButton, text, type UIButton } from './ui';

// Pantallas de menú, fin de partida y victoria. Se navega tocando botones.

abstract class MenuBase implements Scene {
  protected t = 0;
  abstract readonly name: string;
  constructor(protected game: Game, private actions: Record<string, () => void>) {
    game.input.controlsEnabled = false;
    game.input.releaseAll();
  }
  abstract buttons(view: View): UIButton[];
  update(dt: number): void {
    this.t += dt;
    if (this.t < 0.25) return; // evitar toques arrastrados de la pantalla anterior
    const id = hitButton(this.buttons(this.game.view), this.game.input.taps);
    if (id) {
      this.game.sound.play('click');
      this.actions[id]?.();
    }
  }
  abstract render(ctx: CanvasRenderingContext2D, view: View): void;
  debug() {
    return { scene: this.name, buttons: this.buttons(this.game.view), scale: this.game.view.scale, dpr: this.game.view.dpr };
  }
}

export class MenuScene extends MenuBase {
  readonly name = 'menu';
  private hero = new Player(0, 0);
  buttons(view: View): UIButton[] {
    return [
      { id: 'play', label: 'Jugar', x: view.w / 2, y: view.h * 0.66, w: 200, h: 56, primary: true },
      { id: 'mute', label: this.game.sound.muted ? 'Sonido: no' : 'Sonido: sí', x: view.w - 84, y: 34, w: 140, h: 40 },
    ];
  }
  render(ctx: CanvasRenderingContext2D, view: View): void {
    drawBackground(ctx, view, LEVELS[0].theme, this.t * 40, this.t);
    ctx.fillStyle = '#4cc46a';
    ctx.fillRect(0, view.h - 40, view.w, 40);
    // Protagonista saltando en la portada
    const hop = Math.abs(Math.sin(this.t * 3)) * 40;
    this.hero.x = view.w / 2 - 160;
    this.hero.y = view.h - 40 - 28 - hop;
    this.hero.render(ctx);
    text(ctx, 'Saltarín', view.w / 2, view.h * 0.24, 56, '#fff');
    text(ctx, 'Corre, salta, recoge monedas y pisa a los enemigos', view.w / 2, view.h * 0.24 + 44, 16, '#1b1f3b', 'center', '600');
    text(ctx, '◀ ▶ mover  ·  mitad derecha: saltar (mantén para saltar más)', view.w / 2, view.h * 0.46, 14, '#1b1f3b', 'center', '600');
    for (const b of this.buttons(view)) drawButton(ctx, b);
  }
}

export class GameOverScene extends MenuBase {
  readonly name = 'gameover';
  constructor(game: Game, private score: number, actions: Record<string, () => void>) {
    super(game, actions);
  }
  buttons(view: View): UIButton[] {
    return [
      { id: 'retry', label: 'Reintentar', x: view.w / 2 - 115, y: view.h * 0.66, w: 200, h: 56, primary: true },
      { id: 'menu', label: 'Menú', x: view.w / 2 + 115, y: view.h * 0.66, w: 200, h: 56 },
    ];
  }
  render(ctx: CanvasRenderingContext2D, view: View): void {
    drawBackground(ctx, view, LEVELS[2].theme, 0, this.t);
    dim(ctx, view, 0.35);
    text(ctx, 'Fin de la partida', view.w / 2, view.h * 0.28, 44, '#ff8a8a');
    text(ctx, `Puntos: ${this.score}`, view.w / 2, view.h * 0.28 + 52, 24);
    for (const b of this.buttons(view)) drawButton(ctx, b);
  }
}

export class WinScene extends MenuBase {
  readonly name = 'win';
  constructor(game: Game, private score: number, private lives: number, actions: Record<string, () => void>) {
    super(game, actions);
  }
  buttons(view: View): UIButton[] {
    return [
      { id: 'again', label: 'Jugar otra vez', x: view.w / 2 - 115, y: view.h * 0.7, w: 200, h: 56, primary: true },
      { id: 'menu', label: 'Menú', x: view.w / 2 + 115, y: view.h * 0.7, w: 200, h: 56 },
    ];
  }
  render(ctx: CanvasRenderingContext2D, view: View): void {
    drawBackground(ctx, view, LEVELS[1].theme, this.t * 30, this.t);
    // Confeti
    for (let i = 0; i < 40; i++) {
      const x = ((i * 173) % view.w) + Math.sin(this.t * 2 + i) * 10;
      const y = ((i * 89 + this.t * 90) % (view.h + 20)) - 10;
      ctx.fillStyle = ['#ff5a5f', '#ffcc33', '#4cc46a', '#6ec6ff', '#8e5bd6'][i % 5];
      ctx.fillRect(x, y, 6, 10);
    }
    text(ctx, '¡Has ganado!', view.w / 2, view.h * 0.26, 50, '#fff');
    text(ctx, `Puntos: ${this.score}   ·   Vidas restantes: ${this.lives}`, view.w / 2, view.h * 0.26 + 52, 22);
    for (const b of this.buttons(view)) drawButton(ctx, b);
  }
}
