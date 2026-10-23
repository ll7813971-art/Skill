import { openPage, check } from '../harness.mjs';

const T = 32;

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=coins');
  await p.freeze();
  const R = await p.button('right');
  const L = await p.button('left');
  const J = await p.button('jump');
  let s = await p.step(2);
  check(r, '11 monedas en el mapa, ninguna recogida', s.total === 11 && s.collected === 0);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(300);
  await p.shot('06-coins-before');
  await p.freeze();

  // Correr por el suelo: recoge las 6 monedas a ras de suelo
  await p.touch.down(1, ...R);
  for (let i = 0; i < 200; i++) { s = await p.step(1); if (s.x > 15 * T) break; }
  await p.touch.up(1);
  check(r, 'recoge las 6 monedas del suelo al pasar', s.collected === 6 && s.score === 60, `monedas=${s.collected} puntos=${s.score}`);

  // Volver atrás: no se recuentan
  await p.touch.down(1, ...L);
  s = await p.step(60);
  await p.touch.up(1);
  check(r, 'las monedas recogidas no se vuelven a contar', s.collected === 6 && s.score === 60);

  // Salto real con toques a través del arco: recoge monedas en el aire
  await p.place(21 * T, 10 * T - 28);
  await p.step(2);
  await p.touch.down(1, ...R);
  for (let i = 0; i < 60; i++) { s = await p.step(1); if (s.x >= 760) break; }
  await p.touch.down(2, ...J);
  s = await p.step(8);
  await p.touch.up(2);
  s = await p.step(70);
  await p.touch.up(1);
  const aerial = s.collected - 6;
  check(r, 'un salto real a través del arco recoge monedas aéreas', aerial >= 3, `${aerial} de 5`);

  // Recogida en el aire, determinista: jugador cayendo sobre cada moneda restante
  const left = await p.page.evaluate(() => window.__game.game.scene.coins.list.filter((c) => !c.taken).map((c) => [c.x, c.y]));
  let ok = true;
  for (const [cx, cy] of left) {
    await p.place(cx - 11, cy - 30);
    const before = (await p.debug()).collected;
    s = await p.step(1);
    if (s.onGround || s.collected !== before + 1) ok = false;
  }
  check(r, 'cada moneda restante se recoge al tocarla en el aire', ok && s.collected === 11, `monedas=${s.collected}/11`);
  check(r, 'puntuación = 10 × monedas', s.score === 110, `puntos=${s.score}`);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(100);
  await p.shot('06-coins-after');
  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}
