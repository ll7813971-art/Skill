import { openPage, check } from '../harness.mjs';

const T = 32;

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=polish');
  // Registrar vibraciones
  await p.page.evaluate(() => {
    window.__vib = [];
    navigator.vibrate = (ms) => { window.__vib.push(ms); return true; };
  });
  await p.freeze();
  const J = await p.page.evaluate(() => {
    const b = window.__game.game.input.buttons.find((x) => x.id === 'jump');
    const k = window.__game.game.view.scale / window.__game.game.view.dpr;
    return [b.x * k, b.y * k];
  });
  let d = await p.step(5);
  const s0 = d.spawned;

  await p.touch.down(1, ...J);
  d = await p.step(1);
  check(r, 'saltar levanta polvo', d.spawned > s0, `partículas ${s0} -> ${d.spawned}`);
  d = await p.step(8);
  await p.touch.up(1);
  d = await p.page.evaluate(() => { window.__game.game.advance(4); return window.__game.debug(); });
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(60);
  await p.shot('12-polish-jump');
  await p.freeze();
  let landed = false, squash = 0, s1 = 0;
  s1 = (await p.debug()).spawned;
  for (let i = 0; i < 60; i++) {
    d = await p.step(1);
    if (d.squash > 0) { landed = true; squash = d.squash; break; }
  }
  check(r, 'al aterrizar se aplasta y levanta polvo', landed && squash > 0 && d.spawned > s1);

  // Moneda: destello y +10 flotante
  await p.place(10 * T + 5, 9 * T + 2);
  const s2 = (await p.debug()).spawned;
  d = await p.step(1);
  check(r, 'coger una moneda crea destello y «+10»', d.spawned > s2 && d.texts >= 1);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(80);
  await p.shot('12-polish-coin');
  await p.freeze();

  // Pisotón: partículas y sacudida leve
  let e = await p.page.evaluate(() => { const e = window.__game.game.scene.enemies.list.find((x) => x.alive); return { x: e.x, y: e.y }; });
  await p.place(e.x, e.y - 60);
  let stomped = false;
  for (let i = 0; i < 40; i++) {
    d = await p.step(1);
    if (d.shake > 0) { stomped = true; break; }
  }
  check(r, 'pisar un enemigo sacude la cámara y crea partículas', stomped && d.particles > 0 && d.score >= 60);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(50);
  await p.shot('12-polish-stomp');
  await p.freeze();

  // Golpe: sacudida + vibración
  d = await p.step(60);
  e = await p.page.evaluate(() => { const e = window.__game.game.scene.enemies.list.find((x) => x.alive); return { x: e.x, y: e.y, h: e.h }; });
  await p.place(e.x - 18, e.y + e.h - 28);
  d = await p.step(1);
  const vib = await p.page.evaluate(() => window.__vib);
  check(r, 'recibir un golpe sacude la cámara y vibra', d.shake > 0 && vib.includes(60), `vibraciones=${vib}`);

  // Sin fugas: las partículas desaparecen
  d = await p.step(150);
  check(r, 'las partículas y textos se eliminan (sin fugas)', d.particles === 0 && d.texts === 0, `partículas=${d.particles} textos=${d.texts}`);

  // Límite de partículas
  const cap = await p.page.evaluate(() => {
    const fx = window.__game.game.scene.fx;
    for (let i = 0; i < 50; i++) fx.burst(100, 100, 30, '#fff');
    return fx.particles.length;
  });
  check(r, 'el número de partículas está limitado', cap <= 220, `${cap}`);

  // Rendimiento: fotogramas reales en el móvil emulado (dpr 3, 2532×1170)
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  const fps = await p.page.evaluate(async () => {
    const f0 = window.__game.game.frames;
    const s0 = window.__game.game.steps;
    await new Promise((res) => setTimeout(res, 2000));
    return { fps: (window.__game.game.frames - f0) / 2, sps: (window.__game.game.steps - s0) / 2 };
  });
  check(r, 'fluidez: ≥ 50 fotogramas/s y simulación a 60 pasos/s', fps.fps >= 50 && Math.abs(fps.sps - 60) < 3, `fps=${fps.fps} pasos/s=${fps.sps}`);
  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();

  // Plataforma de madera: patas solo en los extremos (captura del nivel 1)
  const q = await openPage(browser, '?dev=levels&n=1');
  await q.freeze();
  await q.place(29 * T, 10 * T - 28);
  await q.page.evaluate(() => { const s = window.__game.game.scene; s.cam.snapTo(s.player); window.__game.game.frozen = false; });
  await q.wait(150);
  await q.shot('12-polish-plank');
  await q.close();
}
