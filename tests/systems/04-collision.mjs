import { openPage, check } from '../harness.mjs';

const T = 32;

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=collision');
  await p.freeze();
  const R = await p.button('right');
  const L = await p.button('left');
  const J = await p.button('jump');

  // Caer desde el aire y aterrizar exactamente sobre el tile
  await p.place(7 * T, 3 * T);
  let s = await p.step(60);
  check(r, 'aterriza exactamente sobre el suelo', s.onGround && s.y + s.h === 10 * T && s.vy === 0, `pies en y=${s.y + s.h}`);

  // Pared a la izquierda (tile en col 1)
  await p.touch.down(1, ...L);
  s = await p.step(90);
  await p.touch.up(1);
  check(r, 'la pared frena al jugador', s.x === 2 * T && s.wallHits > 0, `x=${s.x}`);
  await p.shot('04-collision-wall');

  // Techo encima (fila 6, cols 2-5)
  await p.place(3 * T, 10 * T - 28);
  s = await p.step(2);
  await p.touch.down(2, ...J);
  let minY = Infinity;
  for (let i = 0; i < 40; i++) { s = await p.step(1); minY = Math.min(minY, s.y); }
  await p.touch.up(2);
  check(r, 'el techo bloquea el salto', s.ceilingHits > 0 && minY === 7 * T, `cabeza mínima y=${minY}`);
  s = await p.step(60);
  check(r, 'vuelve al suelo tras chocar con el techo', s.onGround);

  // Coyote: correr hacia el hueco y saltar 3 pasos (0,05 s) después de salir del borde
  await p.place(7 * T, 10 * T - 28);
  await p.step(2);
  await p.touch.down(1, ...R);
  for (let i = 0; i < 60; i++) { s = await p.step(1); if (!s.onGround) break; }
  check(r, 'sale del borde (prueba válida)', !s.onGround && s.x > 9 * T);
  await p.step(3);
  const jb = (await p.debug()).jumps;
  await p.touch.down(2, ...J);
  s = await p.step(1);
  check(r, 'coyote: salta tras 0,05 s en el aire', s.jumps === jb + 1 && s.vy < 0);
  s = await p.step(40);
  await p.touch.up(2);
  s = await p.step(40);
  await p.touch.up(1);
  check(r, 'cruza el hueco y aterriza al otro lado', s.onGround && s.x > 13 * T, `x=${s.x.toFixed(0)}`);

  // Sin coyote pasado el margen: saltar 0,25 s después de salir del borde
  await p.place(7 * T, 10 * T - 28);
  await p.step(2);
  await p.touch.down(1, ...R);
  for (let i = 0; i < 60; i++) { s = await p.step(1); if (!s.onGround) break; }
  await p.touch.up(1);
  await p.step(15);
  const jb2 = (await p.debug()).jumps;
  await p.touch.down(2, ...J);
  s = await p.step(2);
  await p.touch.up(2);
  check(r, 'sin salto pasado el coyote (0,25 s)', s.jumps === jb2);
  s = await p.step(120);
  check(r, 'cae por el hueco y reaparece', s.onGround && s.x === 4 * T, `x=${s.x}`);

  // Plataforma atravesable (fila 7, cols 16-20): subir a través y quedarse encima
  await p.place(17 * T, 10 * T - 28);
  await p.step(2);
  await p.touch.down(2, ...J);
  s = await p.step(70);
  await p.touch.up(2);
  s = await p.step(30);
  check(r, 'atraviesa la plataforma desde abajo y queda encima', s.onGround && s.y + s.h === 7 * T, `pies en y=${s.y + s.h}`);
  await p.shot('04-collision-oneway');

  // Caminar sobre el borde de la plataforma no hace caer a través de otras
  await p.touch.down(1, ...R);
  s = await p.step(60);
  await p.touch.up(1);
  s = await p.step(60);
  check(r, 'al salir de la plataforma cae al suelo', s.onGround && s.y + s.h === 10 * T);

  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}
