import { openPage, check } from '../harness.mjs';

const T = 32;

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=audio');
  let d = await p.debug();
  check(r, 'sin gesto del usuario no se crea el audio', d.state === null);

  // Señal real: renderizar cada sonido sin conexión y medir nivel
  const levels = await p.page.evaluate(async () => {
    const out = {};
    for (const [name, synth] of Object.entries(window.__dev.SYNTHS)) {
      const ctx = new OfflineAudioContext(1, 44100 * 1.3, 44100);
      const dur = synth(ctx, ctx.destination, 0);
      const buf = await ctx.startRendering();
      const ch = buf.getChannelData(0);
      // Nivel medido solo mientras dura el sonido (no en todo el búfer).
      const n = Math.min(ch.length, Math.ceil(dur * 44100));
      let sum = 0, peak = 0, lastLoud = 0;
      for (let i = 0; i < n; i++) {
        const v = Math.abs(ch[i]);
        sum += v * v;
        if (v > peak) peak = v;
      }
      // Fin del sonido: última muestra por encima de −40 dB respecto al pico.
      for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]) > peak * 0.01) lastLoud = i;
      out[name] = { rms: Math.sqrt(sum / n), peak, dur, tail: lastLoud / 44100 };
    }
    return out;
  });
  for (const [n, v] of Object.entries(levels)) {
    check(r, `sonido «${n}» produce señal sin saturar`, v.rms > 0.01 && v.peak > 0.05 && v.peak < 1, `rms=${v.rms.toFixed(3)} pico=${v.peak.toFixed(2)}`);
    // La envolvente decae exponencialmente hasta −67 dB en `dur`: se oye (por
    // encima de −40 dB) al menos la mitad de ese tiempo y nunca más allá.
    check(r, `sonido «${n}» audible ≥ 50 % de su duración y sin colas`, v.tail >= v.dur * 0.5 && v.tail <= v.dur + 0.05, `envolvente ${v.dur}s, audible ${v.tail.toFixed(2)}s`);
  }

  // Primer toque: desbloquea el audio y reproduce
  await p.freeze();
  d = await p.tapUI('coin');
  await p.wait(100);
  d = await p.debug();
  check(r, 'el primer toque desbloquea el audio (running)', d.state === 'running', `estado=${d.state}`);
  check(r, 'tocar un botón reproduce su sonido', d.played.at(-1) === 'coin');
  const t0 = await p.page.evaluate(() => window.__game.game.sound.ctx.currentTime);
  await p.wait(300);
  const t1 = await p.page.evaluate(() => window.__game.game.sound.ctx.currentTime);
  check(r, 'el reloj de audio avanza (el contexto está sonando)', t1 > t0 + 0.1, `${t0.toFixed(2)} -> ${t1.toFixed(2)}`);
  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();

  // En partida: los eventos del juego suenan
  const g = await openPage(browser, '?dev=levels&n=1');
  await g.freeze();
  const J = await g.page.evaluate(() => {
    const b = window.__game.game.input.buttons.find((x) => x.id === 'jump');
    const k = window.__game.game.view.scale / window.__game.game.view.dpr;
    return [b.x * k, b.y * k];
  });
  await g.touch.down(1, ...J);
  await g.step(3);
  await g.touch.up(1);
  await g.step(60);
  // moneda: colocar al jugador sobre la primera moneda (col 10, fila 9)
  await g.place(10 * T + 5, 9 * T + 2);
  await g.step(2);
  // pisotón: caer sobre el primer patrullero
  const e = await g.page.evaluate(() => { const e = window.__game.game.scene.enemies.list[0]; return { x: e.x, y: e.y }; });
  await g.place(e.x, e.y - 60);
  await g.step(30);
  // golpe y caída
  const e2 = await g.page.evaluate(() => { const e = window.__game.game.scene.enemies.list.find((x) => x.alive); return { x: e.x, y: e.y, h: e.h }; });
  await g.place(e2.x - 18, e2.y + e2.h - 28);
  await g.step(100);
  await g.place(25 * T, 13 * T);
  await g.step(5);
  const played = await g.page.evaluate(() => window.__game.game.sound.played);
  const st = await g.page.evaluate(() => window.__game.game.sound.ctx?.state);
  for (const n of ['jump', 'land', 'coin', 'stomp', 'hurt', 'fall']) {
    check(r, `en partida suena «${n}»`, played.includes(n), played.join(','));
  }
  check(r, 'el audio de la partida está activo', st === 'running');
  check(r, 'sin errores en consola (partida)', g.errors.length === 0, g.errors.join(' | '));
  await g.close();

  // Silencio desde el menú: se aplica y se recuerda al recargar
  const m = await openPage(browser, '?dev=ui');
  await m.freeze();
  await m.step(30);
  d = await m.tapUI('mute');
  const muted = await m.page.evaluate(() => ({ m: window.__game.game.sound.muted, ls: localStorage.getItem('saltarin.muted') }));
  check(r, 'el botón de sonido silencia y lo guarda', muted.m && muted.ls === '1');
  check(r, 'el botón muestra «Sonido: no»', d.buttons.find((b) => b.id === 'mute').label === 'Sonido: no');
  await m.page.reload();
  await m.page.waitForFunction(() => window.__game && window.__game.game.frames > 2);
  const again = await m.page.evaluate(() => window.__game.game.sound.muted);
  check(r, 'al recargar sigue en silencio', again);
  await m.close();
}
