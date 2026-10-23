import { openPage, check } from '../harness.mjs';

const T = 32;
// Reanuda el tiempo real (para que las capturas muestren animación).
const live = (p) => p.page.evaluate(() => { window.__game.game.frozen = false; });

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=ui');
  await p.freeze();
  let d = await p.step(30);
  check(r, 'arranca en el menú principal', d.scene === 'menu');
  await live(p); await p.wait(200); await p.shot('10-menu'); await p.freeze();

  // En el menú los toques no mueven nada
  await p.touch.down(1, 60, 330);
  const inp = await p.page.evaluate(() => ({ l: window.__game.game.input.left, r: window.__game.game.input.right }));
  await p.touch.up(1);
  check(r, 'en el menú los controles están desactivados', !inp.l && !inp.r);

  d = await p.tapUI('play');
  check(r, 'tocar «Jugar» empieza el nivel 1', d.scene === 'play' && d.level === 0 && d.lives === 3 && d.score === 0, `escena=${d.scene}`);
  d = await p.step(20);
  await live(p); await p.wait(150); await p.shot('10-hud'); await p.freeze();

  // Pausa
  const x0 = d.x;
  d = await p.tapUI('pause');
  check(r, 'el botón de pausa pausa el juego', d.paused);
  const R = d.controls.find((b) => b.id === 'right');
  const k = d.scale / d.dpr;
  await p.touch.down(1, R.x * k, R.y * k);
  d = await p.step(60);
  await p.touch.up(1);
  check(r, 'en pausa no avanza ni responde a los controles', d.x === x0 && d.paused, `x ${x0} -> ${d.x}`);
  await live(p); await p.wait(150); await p.shot('10-pause'); await p.freeze();
  d = await p.tapUI('resume');
  check(r, '«Continuar» reanuda la partida', !d.paused && d.scene === 'play');
  await p.touch.down(1, R.x * k, R.y * k);
  d = await p.step(30);
  await p.touch.up(1);
  check(r, 'tras reanudar los controles funcionan', d.x > x0 + 30, `x ${x0.toFixed(0)} -> ${d.x.toFixed(0)}`);

  // Pausa → menú
  await p.tapUI('pause');
  d = await p.tapUI('menu');
  check(r, '«Salir al menú» vuelve al menú', d.scene === 'menu');

  // Fin de partida → reintentar
  await p.step(30);
  d = await p.tapUI('play');
  await p.page.evaluate(() => { const s = window.__game.game.scene; s.health.lives = 1; s.run.lives = 1; });
  await p.place(25 * T, 13 * T);
  d = await p.step(100);
  check(r, 'perder la última vida muestra «Fin de la partida»', d.scene === 'gameover');
  await live(p); await p.wait(150); await p.shot('10-gameover'); await p.freeze();
  await p.step(30);
  d = await p.tapUI('retry');
  check(r, '«Reintentar» empieza de nuevo en el nivel 1 con 3 vidas', d.scene === 'play' && d.level === 0 && d.lives === 3 && d.score === 0);

  // Fin de partida → menú
  await p.page.evaluate(() => { const s = window.__game.game.scene; s.health.lives = 1; s.run.lives = 1; });
  await p.place(25 * T, 13 * T);
  await p.step(130);
  d = await p.tapUI('menu');
  check(r, 'desde fin de partida se vuelve al menú', d.scene === 'menu');
  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();

  // Victoria
  const w = await openPage(browser, '?dev=levels&n=3');
  await w.freeze();
  d = await w.debug();
  await w.place(d.flag.x - 11, d.flag.y - 28);
  d = await w.step(120);
  check(r, 'completar el nivel 3 muestra «¡Has ganado!»', d.scene === 'win');
  await live(w); await w.wait(300); await w.shot('10-win'); await w.freeze();
  d = await w.tapUI('again');
  check(r, '«Jugar otra vez» empieza en el nivel 1', d.scene === 'play' && d.level === 0 && d.score === 0);
  await w.close();

  // Vertical: aviso de girar el móvil y juego detenido
  const v = await openPage(browser, '?dev=ui&portrait=1', { viewport: { width: 390, height: 844 } });
  const s0 = await v.page.evaluate(() => window.__game.game.steps);
  await v.wait(400);
  const s1 = await v.page.evaluate(() => window.__game.game.steps);
  const blocked = await v.page.evaluate(() => window.__game.game.isBlocked());
  check(r, 'en vertical el juego se detiene y pide girar', blocked && s1 === s0, `pasos ${s0} -> ${s1}`);
  await v.shot('10-portrait');
  await v.page.setViewportSize({ width: 844, height: 390 });
  await v.wait(300);
  const s2 = await v.page.evaluate(() => window.__game.game.steps);
  check(r, 'al girar a horizontal el juego continúa', s2 > s1 + 5);
  check(r, 'sin errores en consola (victoria y vertical)', v.errors.length === 0 && w.errors.length === 0, [...v.errors, ...w.errors].join(' | '));
  await v.close();
}
