import type { View } from '../engine/game';

/** Lectura de depuración en pantalla para las escenas del nivel de pruebas. */
export function drawDebug(ctx: CanvasRenderingContext2D, view: View, lines: string[]): void {
  ctx.save();
  ctx.font = '12px monospace';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(view.w - w - 6, 6, w, lines.length * 15 + 8);
  ctx.fillStyle = '#9effa0';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, view.w - w, 11 + i * 15));
  ctx.restore();
}
