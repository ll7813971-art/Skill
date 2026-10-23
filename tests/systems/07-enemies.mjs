import { openPage, check } from '../harness.mjs';

const T = 32;

// Avanza n pasos dentro de la página registrando el rango de x de cada enemigo.
const track = (p, n) =>
  p.page.evaluate((k) => {
    const g = window.__game.game;
    const sc = g.scene;
    const rng = new Map();
    for (let i = 0; i < k; i++) {
      g.advance(1);
      for (const e of sc.enemies.list) {
        const v = rng.get(e) ?? { kind: e.kind, min: Infinity, max: -Infinity, ys: new Set() };
        v.min = Math.min(v.min, e.x);
        v.max = Math.max(v.max, e.x + e.w);
        if (e.onGround) v.ys.add(Math.round(e.y));
        rng.set(e, v);
      }
    }
    return [...rng.values()].map((v) => ({ ...v, ys: [...v.ys] }));
  }, n);

const enemies = async (p) => (await p.debug()).enemies;

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=enemies');
  await p.freeze();
  await p.place(0, 10 * T - 28); // jugador aislado tras la pared izquierda
  let e0 = await enemies(p);
  check(r, '2 patrulleros y 1 saltarín', e0.filter((e) => e.kind === 'walker').length === 2 && e0.filter((e) => e.kind === 'hopper').length === 1);

  const rng = await track(p, 600); // 10 s
  const [plat, floor, hop] = rng;
  const e1 = await enemies(p);
  check(r, 'patrullero de la plataforma no se cae por los bordes', plat.min >= 8 * T && plat.max <= 14 * T && plat.ys.length === 1 && plat.ys[0] === 7 * T - 20, `x ${plat.min.toFixed(0)}–${plat.max.toFixed(0)} y=${plat.ys}`);
  check(r, 'patrullero de la plataforma da la vuelta en los bordes', e1[0].turns >= 2, `giros=${e1[0].turns}`);
  check(r, 'patrullero del suelo rebota entre las paredes', floor.min >= 3 * T && floor.max <= 11 * T && e1[1].turns >= 2, `x ${floor.min.toFixed(0)}–${floor.max.toFixed(0)} giros=${e1[1].turns}`);
  check(r, 'el saltarín salta periódicamente (~1,5 s)', e1[2].hops >= 6 && e1[2].hops <= 8, `saltos=${e1[2].hops}`);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(250);
  await p.shot('07-enemies');
  await p.freeze();

  // El saltarín salta hacia el jugador cuando está cerca
  let hop0 = (await enemies(p))[2];
  await p.place(hop0.x + 160, 10 * T - 28);
  await track(p, 200);
  let hop1 = (await enemies(p))[2];
  check(r, 'el saltarín se acerca al jugador', hop1.x > hop0.x + 40 && hop1.dir === 1, `x ${hop0.x.toFixed(0)} -> ${hop1.x.toFixed(0)}`);

  // Contacto lateral = golpe, el enemigo sigue vivo
  let d = await p.debug();
  const hurts0 = d.hurts;
  const w = d.enemies[0];
  await p.place(w.x + w.w - 6, w.y + w.h - 28);
  d = await p.step(1);
  check(r, 'tocar un enemigo de lado cuenta como golpe', d.hurts === hurts0 + 1 && d.enemies[0].alive, `golpes ${hurts0} -> ${d.hurts}`);

  // Pisotón sobre el patrullero del suelo: muere y el jugador rebota
  await p.step(70); // agotar el enfriamiento de golpes de la escena
  d = await p.debug();
  const hurts1 = d.hurts;
  let fw = d.enemies[1];
  await p.place(fw.x, fw.y - 28 - 40);
  let bounceVy = null;
  for (let i = 0; i < 30; i++) {
    d = await p.step(1);
    if (d.stomps === 1) { bounceVy = d.vy; break; }
  }
  check(r, 'caer encima de un patrullero lo elimina', d.stomps === 1 && d.enemies.some((e) => e.kind === 'walker' && !e.alive));
  check(r, 'el pisotón hace rebotar al jugador (sin mantener salto)', bounceVy !== null && Math.round(bounceVy) <= -360 && Math.round(bounceVy) > -420, `vy=${bounceVy}`);
  check(r, 'el pisotón no cuenta como golpe', d.hurts === hurts1);
  d = await p.step(30);
  check(r, 'el enemigo pisado desaparece tras la animación', d.enemies.length === 2);

  // Pisotón manteniendo el salto: rebote más alto
  await p.step(80);
  // Esperar a que el saltarín acabe de aterrizar (quieto ~0,7 s más).
  await p.page.evaluate(() => {
    const g = window.__game.game;
    const h = () => g.scene.enemies.list.find((e) => e.kind === 'hopper');
    for (let i = 0; i < 300 && !(h().onGround && h().hopT > 0.7); i++) g.advance(1);
  });
  d = await p.debug();
  const hp = d.enemies.find((e) => e.kind === 'hopper');
  const J = await p.button('jump');
  await p.place(hp.x, hp.y - 28 - 60);
  await p.touch.down(2, ...J); // pulsado en el aire: no hay suelo ni coyote
  bounceVy = null;
  for (let i = 0; i < 40; i++) {
    d = await p.step(1);
    if (d.stomps === 2) { bounceVy = d.vy; break; }
  }
  await p.touch.up(2);
  check(r, 'pisar manteniendo salto rebota más alto', bounceVy !== null && bounceVy <= -560, `vy=${bounceVy}`);

  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}
