import { openPage, check } from '../harness.mjs';

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=movement');
  await p.freeze();
  const R = await p.button('right');
  const L = await p.button('left');
  const J = await p.button('jump');
  let s = await p.step(5);
  check(r, 'arranca apoyado en el suelo', s.onGround);
  const x0 = s.x;

  // Correr a la derecha
  await p.touch.down(1, ...R);
  s = await p.step(6);
  check(r, 'acelera rápido (≥ 200 px/s en 0,1 s)', s.vx >= 200, `vx=${s.vx}`);
  s = await p.step(30);
  check(r, 'velocidad máxima 210 px/s', Math.abs(s.vx - 210) < 0.01, `vx=${s.vx}`);
  check(r, 'se desplaza a la derecha', s.x > x0 + 100, `x ${x0.toFixed(0)} -> ${s.x.toFixed(0)}`);
  await p.touch.up(1);
  s = await p.step(6);
  check(r, 'frena en menos de 0,1 s al soltar', s.vx === 0, `vx=${s.vx}`);

  // Correr a la izquierda
  await p.touch.down(1, ...L);
  s = await p.step(20);
  check(r, 'corre a la izquierda', s.vx === -210);
  await p.touch.up(1);
  s = await p.step(10);

  // Salto largo (mantener pulsado)
  await p.touch.down(2, ...J);
  s = await p.step(2);
  check(r, 'pulsar salto despega', !s.onGround && s.vy < 0 && s.jumps === 1);
  await p.page.screenshot({ path: 'test-output/03-movement-air.png' });
  s = await p.step(60);
  await p.touch.up(2);
  s = await p.step(30);
  const high = s.lastApex;
  check(r, 'salto mantenido ≈ 3,3 tiles', high > 100 && high < 112, `${(high / 32).toFixed(2)} tiles`);

  // Salto corto (toque)
  await p.touch.down(2, ...J);
  s = await p.step(3);
  await p.touch.up(2);
  s = await p.step(60);
  const low = s.lastApex;
  check(r, 'toque corto = salto bajo (altura variable)', low > 16 && low < high * 0.5, `${(low / 32).toFixed(2)} tiles`);

  // Buffer: pulsar justo antes de aterrizar
  await p.touch.down(2, ...J);
  s = await p.step(2);
  await p.touch.up(2);
  // avanzar hasta estar cayendo a < 20 px del suelo (cae ~13 px por paso)
  for (let i = 0; i < 120; i++) {
    s = await p.step(1);
    if (s.vy > 0 && s.floorY - (s.y + s.h) < 20) break;
  }
  const gap = s.floorY - (s.y + s.h);
  check(r, 'en el aire, cayendo, al pulsar (prueba válida)', !s.onGround && s.vy > 0 && gap > 0, `a ${gap.toFixed(1)} px del suelo`);
  const jumpsBefore = s.jumps;
  await p.touch.down(2, ...J);
  s = await p.step(1);
  await p.touch.up(2);
  s = await p.step(6);
  check(r, 'buffer: el salto pulsado antes de tocar suelo se ejecuta', s.jumps === jumpsBefore + 1, `saltos ${jumpsBefore} -> ${s.jumps}`);

  // Mantener salto pulsado no repite saltos (requiere nueva pulsación)
  s = await p.step(60);
  await p.touch.down(2, ...J);
  s = await p.step(120);
  check(r, 'mantener pulsado no encadena saltos', s.jumps === jumpsBefore + 2 && s.onGround, `saltos=${s.jumps}`);
  await p.touch.up(2);

  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(100);
  await p.shot('03-movement');
  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}
