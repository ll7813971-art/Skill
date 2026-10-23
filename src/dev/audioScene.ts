import type { Game, Scene, View } from '../engine/game';
import { SYNTHS, type Sound, type SoundName } from '../engine/audio';
import { drawButton, hitButton, text, type UIButton } from '../ui/ui';
import { drawDebug } from './debugText';

// Prueba del sistema 11: un botón por sonido.
export class DevAudioScene implements Scene {
  constructor(private game: Game, private sound: Sound) {
    game.input.controlsEnabled = false;
  }
  buttons(view: View): UIButton[] {
    const names = Object.keys(SYNTHS) as SoundName[];
    return names.map((n, i) => ({
      id: n, label: n, w: 150, h: 46,
      x: view.w / 2 + ((i % 5) - 2) * 160, y: 150 + Math.floor(i / 5) * 70,
    }));
  }
  update(): void {
    const id = hitButton(this.buttons(this.game.view), this.game.input.taps);
    if (id) this.sound.play(id as SoundName);
  }
  render(ctx: CanvasRenderingContext2D, view: View): void {
    text(ctx, 'Toca para escuchar cada sonido', view.w / 2, 70, 22);
    for (const b of this.buttons(view)) drawButton(ctx, b);
    drawDebug(ctx, view, [
      `audio=${this.sound.ctx?.state ?? 'sin crear'} silencio=${this.sound.muted}`,
      `últimos=${this.sound.played.slice(-4).join(',')}`,
    ]);
  }
  debug() {
    return {
      scene: 'audio', state: this.sound.ctx?.state ?? null, played: [...this.sound.played],
      buttons: this.buttons(this.game.view), scale: this.game.view.scale, dpr: this.game.view.dpr,
    };
  }
}
