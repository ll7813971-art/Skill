import type { View } from '../engine/game';
import type { Theme } from './levels';

// Fondo vectorial: degradado de cielo, estrellas opcionales y dos capas de
// colinas con paralaje (se mueven más despacio que la cámara).
export function drawBackground(ctx: CanvasRenderingContext2D, view: View, theme: Theme, camX: number, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, theme.skyTop);
  g.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.w, view.h);

  if (theme.stars) {
    ctx.fillStyle = '#fff';
    const span = view.w + 200;
    for (let i = 0; i < 60; i++) {
      // Posición pseudoaleatoria fija por estrella, con un paralaje mínimo.
      const x = ((i * 97) % 1000) / 1000 * span - camX * 0.05;
      const sx = ((x % span) + span) % span - 100;
      const sy = ((i * 53) % 200) + 8;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    // Luna
    ctx.fillStyle = '#fdf6c9';
    ctx.beginPath();
    ctx.arc(view.w * 0.78 - camX * 0.02, 70, 26, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Sol
    ctx.fillStyle = 'rgba(255,255,220,0.85)';
    ctx.beginPath();
    ctx.arc(view.w * 0.8 - camX * 0.02, 78, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  hills(ctx, view, camX * 0.2, view.h * 0.62, 46, 260, theme.hillsFar);
  hills(ctx, view, camX * 0.45, view.h * 0.74, 34, 180, theme.hillsNear);
}

function hills(ctx: CanvasRenderingContext2D, view: View, offset: number, base: number, amp: number, period: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, view.h);
  for (let x = 0; x <= view.w + 8; x += 8) {
    const u = (x + offset) / period;
    const y = base - amp * (0.6 * Math.sin(u * Math.PI * 2) + 0.4 * Math.sin(u * Math.PI * 4.3 + 1));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(view.w, view.h);
  ctx.closePath();
  ctx.fill();
}
