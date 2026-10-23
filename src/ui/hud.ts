import type { View } from '../engine/game';
import type { PlayScene } from '../game/playScene';
import { START_LIVES } from '../game/health';
import { coinIcon, heart, text, type UIButton } from './ui';

export const PAUSE_BUTTON = (view: View): UIButton => ({ id: 'pause', label: '', x: view.w - 34, y: 30, w: 40, h: 40 });

export function drawHud(ctx: CanvasRenderingContext2D, view: View, s: PlayScene): void {
  // Vidas
  for (let i = 0; i < Math.max(START_LIVES, s.run.lives); i++) heart(ctx, 22 + i * 26, 24, 22, i < s.run.lives);
  // Monedas del nivel
  coinIcon(ctx, 112, 24, 9);
  text(ctx, `${s.coins.collected}/${s.coins.total}`, 126, 25, 18, '#fff', 'left');
  // Puntuación
  text(ctx, `${s.run.score}`.padStart(5, '0'), view.w - 70, 26, 20, '#fff', 'right');
  // Botón de pausa
  const b = PAUSE_BUTTON(view);
  ctx.beginPath();
  ctx.arc(b.x, b.y, 18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(b.x - 6, b.y - 7, 4, 14);
  ctx.fillRect(b.x + 2, b.y - 7, 4, 14);

  // Cartel del nivel al empezar
  if (s.t < 2.2 && !s.paused) {
    const a = Math.min(1, (2.2 - s.t) / 0.5);
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, `Nivel ${s.run.level + 1}`, view.w / 2, view.h * 0.3, 20, '#ffe08a');
    text(ctx, s.def.name, view.w / 2, view.h * 0.3 + 30, 34);
    ctx.restore();
  }
  if (s.state === 'complete') {
    text(ctx, '¡Nivel completado!', view.w / 2, view.h * 0.32, 34, '#ffe08a');
  }
}
