import type { View } from '../engine/game';
import { roundRect } from '../game/player';

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export interface UIButton {
  id: string;
  label: string;
  x: number; // centro
  y: number;
  w: number;
  h: number;
  primary?: boolean;
}

export function hitButton(buttons: UIButton[], taps: Array<{ x: number; y: number }>): string | null {
  for (const t of taps) {
    for (const b of buttons) {
      // Margen extra para dedos imprecisos.
      if (Math.abs(t.x - b.x) <= b.w / 2 + 8 && Math.abs(t.y - b.y) <= b.h / 2 + 8) return b.id;
    }
  }
  return null;
}

export function drawButton(ctx: CanvasRenderingContext2D, b: UIButton): void {
  ctx.save();
  roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2 + 4, b.w, b.h, 14);
  ctx.fillStyle = b.primary ? '#b8432f' : '#2a2f5a';
  ctx.fill();
  roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 14);
  ctx.fillStyle = b.primary ? '#ff6b4a' : '#454c8a';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x, b.y + 1);
  ctx.restore();
}

export function text(
  ctx: CanvasRenderingContext2D, s: string, x: number, y: number,
  size: number, color = '#fff', align: CanvasTextAlign = 'center', weight = 'bold',
): void {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  // Sombra simple para leerse sobre cualquier fondo.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillText(s, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function dim(ctx: CanvasRenderingContext2D, view: View, alpha = 0.55): void {
  ctx.fillStyle = `rgba(15,18,40,${alpha})`;
  ctx.fillRect(0, 0, view.w, view.h);
}

export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, full: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 20, s / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-10, -2, -10, -10, -5, -10);
  ctx.bezierCurveTo(-2, -10, 0, -7, 0, -5);
  ctx.bezierCurveTo(0, -7, 2, -10, 5, -10);
  ctx.bezierCurveTo(10, -10, 10, -2, 0, 6);
  ctx.closePath();
  ctx.fillStyle = full ? '#ff4d6d' : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.stroke();
  ctx.restore();
}

export function coinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcc33';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e09a1a';
  ctx.stroke();
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(x - 1.5, y - r * 0.55, 3, r * 1.1);
}

/** Aviso a pantalla completa cuando el móvil está en vertical. */
export function drawRotateHint(ctx: CanvasRenderingContext2D, view: View, t: number): void {
  ctx.fillStyle = '#1b1f3b';
  ctx.fillRect(0, 0, view.w, view.h);
  const cx = view.w / 2;
  const cy = view.h * 0.4;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2 * Math.min(1, (t % 2.4) / 1.2));
  roundRect(ctx, -22, -38, 44, 76, 8);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffcc33';
  ctx.stroke();
  ctx.fillStyle = '#ffcc33';
  ctx.fillRect(-6, 28, 12, 3);
  ctx.restore();
  // En vertical el ancho lógico es pequeño (~180): el texto se ajusta a él.
  const big = Math.min(26, view.w / 7);
  const small = Math.min(15, view.w / 12);
  text(ctx, 'Gira el móvil', cx, view.h * 0.68, big);
  text(ctx, 'Este juego se juega', cx, view.h * 0.68 + big * 1.3, small, '#c9cdf2', 'center', 'normal');
  text(ctx, 'en horizontal', cx, view.h * 0.68 + big * 1.3 + small * 1.4, small, '#c9cdf2', 'center', 'normal');
}
