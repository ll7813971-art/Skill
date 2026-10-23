import { openPage, check } from '../harness.mjs';

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=loop');
  const a = await p.debug();
  await p.wait(500);
  const b = await p.debug();
  await p.shot('01-loop');
  const steps = await p.page.evaluate(() => window.__game.game.steps);
  check(r, 'el tiempo de juego avanza', b.t > a.t + 0.3, `t ${a.t.toFixed(2)} -> ${b.t.toFixed(2)}`);
  check(r, 'altura lógica fija de 384', b.view.h === 384);
  check(r, 'ancho lógico según aspecto horizontal', Math.abs(b.view.w - 384 * (844 / 390)) < 1, `w=${b.view.w}`);
  check(r, 'canvas a resolución física (dpr 3)', await p.page.evaluate(() => {
    const c = document.getElementById('game');
    return c.width === 844 * 3 && c.height === 390 * 3;
  }));
  check(r, 'paso fijo ~60 Hz', steps > 20, `steps=${steps}`);
  // Girar a vertical: debe re-escalar sin errores.
  await p.page.setViewportSize({ width: 390, height: 844 });
  await p.wait(200);
  const c = await p.debug();
  check(r, 're-escala al girar', Math.abs(c.view.w - 384 * (390 / 844)) < 1, `w=${c.view.w}`);
  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}
