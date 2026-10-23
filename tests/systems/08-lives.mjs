import { openPage, check } from '../harness.mjs';

const T = 32;

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=lives');
  await p.freeze();
  const R = await p.button('right');
  let s = await p.step(2);
  check(r, 'empieza con 3 vidas', s.lives === 3 && !s.dead);

  // Caer al hueco (cols 12-15) corriendo hacia la derecha
  await p.touch.down(1, ...R);
  for (let i = 0; i < 200; i++) { s = await p.step(1); if (s.log.includes('fall')) break; }
  await p.touch.up(1);
  check(r, 'caer al vacío quita una vida', s.lives === 2 && s.log[0] === 'fall', `vidas=${s.lives} eventos=${s.log}`);
  check(r, 'reaparece en suelo seguro antes del hueco', s.x + s.w <= 12 * T && s.x >= 6 * T, `x=${s.x.toFixed(0)}`);
  s = await p.step(20);
  check(r, 'tras reaparecer está apoyado en el suelo', s.onGround && s.y + s.h === 10 * T);

  // Golpe de enemigo: al otro lado del hueco
  await p.step(80); // fin de la invulnerabilidad
  // Llevar al enemigo lejos del hueco para probar el retroceso en suelo firme.
  await p.page.evaluate((x) => { window.__game.game.scene.enemies.list[0].x = x; }, 24 * T);
  s = await p.step(1);
  let e = s.enemies[0];
  await p.place(e.x - s.w + 4, e.y + e.h - 28);
  s = await p.step(1);
  check(r, 'tocar un enemigo quita una vida', s.lives === 1 && s.log.at(-1) === 'hurt', `vidas=${s.lives}`);
  check(r, 'el golpe empuja al jugador hacia atrás y bloquea el control', s.vx < 0 && s.vy < 0 && !s.control, `vx=${s.vx.toFixed(0)} vy=${s.vy.toFixed(0)}`);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(120);
  await p.shot('08-lives-hurt');
  await p.freeze();

  // Invulnerable: otro contacto inmediato no quita vida
  s = await p.debug();
  e = s.enemies[0];
  await p.place(e.x - s.w + 4, e.y + e.h - 28);
  s = await p.step(1);
  check(r, 'invulnerable tras el golpe (no pierde otra vida)', s.lives === 1 && s.invulnT > 0);
  s = await p.step(30);
  check(r, 'recupera el control tras el retroceso', s.control);

  // Pasada la invulnerabilidad, último golpe = fin de partida
  await p.place(e.x - 200, 10 * T - 28);
  s = await p.step(100);
  check(r, 'la invulnerabilidad dura 1,5 s', s.invulnT === 0);
  e = s.enemies[0];
  await p.place(e.x - s.w + 4, e.y + e.h - 28);
  s = await p.step(1);
  check(r, 'sin vidas → fin de partida', s.lives === 0 && s.dead && s.log.at(-1) === 'dead', `eventos=${s.log}`);
  s = await p.step(60);
  check(r, 'tras el fin no se pierden más vidas ni hay eventos nuevos', s.lives === 0 && s.log.length === 4, `eventos=${s.log}`);

  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();

  // Golpe junto al borde derecho del hueco (cols 12-15): el jugador está en la
  // col 16 con el enemigo a su derecha; el retroceso no debe tirarlo al vacío.
  const q = await openPage(browser, '?dev=lives');
  await q.freeze();
  await q.place(16 * T + 1, 10 * T - 28);
  await q.page.evaluate((x) => {
    Object.assign(window.__game.game.scene.enemies.list[0], { x, dir: -1 });
  }, 16 * T + 14);
  s = await q.step(1);
  check(r, 'golpe junto al hueco: pierde una vida', s.lives === 2 && s.log.at(-1) === 'hurt', `eventos=${s.log}`);
  s = await q.step(90);
  check(r, 'golpe junto al hueco: el retroceso no lo tira al vacío', !s.log.includes('fall') && s.lives === 2, `eventos=${s.log} x=${s.x.toFixed(0)}`);
  check(r, 'sin errores en consola (borde)', q.errors.length === 0, q.errors.join(' | '));
  await q.close();
}
