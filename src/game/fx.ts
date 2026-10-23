// Efectos visuales ligeros: partículas y textos flotantes, con límite fijo
// para no degradar el rendimiento en móviles.
const MAX_PARTICLES = 220;

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string; gravity: number;
}

interface FloatText {
  x: number; y: number; text: string; life: number; color: string;
}

export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  spawned = 0;

  burst(x: number, y: number, n: number, color: string, speed = 120, gravity = 400, size = 3, life = 0.5): void {
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      const l = life * (0.6 + Math.random() * 0.4);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, size, color, gravity });
      this.spawned++;
    }
  }

  /** Polvo a ras de suelo (salto y aterrizaje). */
  dust(x: number, y: number, n = 6): void {
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const dir = i % 2 === 0 ? -1 : 1;
      const l = 0.3 + Math.random() * 0.15;
      this.particles.push({
        x: x + dir * Math.random() * 6, y: y - 2,
        vx: dir * (40 + Math.random() * 60), vy: -20 - Math.random() * 40,
        life: l, max: l, size: 3 + Math.random() * 2, color: 'rgba(240,235,220,0.9)', gravity: 60,
      });
      this.spawned++;
    }
  }

  float(x: number, y: number, text: string, color = '#fff'): void {
    this.texts.push({ x, y, text, life: 0.8, color });
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 40 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + 0.5 * (p.life / p.max));
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2.5);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillText(t.text, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

/** Vibración corta en móviles que la admiten (Android); en iOS no hace nada. */
export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Sin vibración disponible.
  }
}
