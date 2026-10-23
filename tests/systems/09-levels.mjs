import { openPage, check } from '../harness.mjs';
import { solveInPage } from '../solver.mjs';

const T = 32;

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=levels&n=1');

  // Estructura de cada nivel
  const info = await p.page.evaluate(() => {
    const { LEVELS, TileMap } = window.__dev;
    return LEVELS.map((L) => {
      const m = new TileMap(L.rows);
      const one = (ch) => m.find(ch);
      const onGround = ({ c, r }) => m.groundAt(c * 32 + 16, (r + 1) * 32 + 1);
      return {
        name: L.name,
        rows: L.rows.length,
        rect: L.rows.every((row) => row.length === L.rows[0].length),
        P: one('P').length, F: one('F').length,
        startCol: one('P')[0]?.c,
        startOk: one('P').every(onGround), flagOk: one('F').every(onGround),
        enemiesOk: [...one('e'), ...one('j')].every(onGround),
        enemies: one('e').length + one('j').length, hoppers: one('j').length,
        coins: one('o').length, cols: m.cols,
      };
    });
  });
  for (const L of info) {
    check(r, `${L.name}: mapa rectangular de 12 filas`, L.rows === 12 && L.rect);
    check(r, `${L.name}: un inicio y una meta, ambos sobre suelo`, L.P === 1 && L.F === 1 && L.startOk && L.flagOk);
    check(r, `${L.name}: inicio fuera de la zona de los botones (col ≥ 6)`, L.startCol >= 6);
    check(r, `${L.name}: enemigos apoyados en suelo`, L.enemiesOk, `${L.enemies} enemigos, ${L.coins} monedas, ${L.cols} columnas`);
  }
  check(r, 'dificultad creciente: más enemigos y longitud en cada nivel', info[0].enemies < info[1].enemies && info[1].enemies < info[2].enemies && info[0].cols < info[1].cols && info[1].cols < info[2].cols);
  check(r, 'el nivel 1 no tiene saltarines (introducción suave)', info[0].hoppers === 0);

  // Validación con la física real: meta y todas las monedas alcanzables
  for (let i = 0; i < info.length; i++) {
    const s = await p.page.evaluate(solveInPage, i);
    check(r, `${info[i].name}: la meta es alcanzable`, s.flagReached, `estados explorados=${s.expanded}`);
    check(r, `${info[i].name}: todas las monedas son alcanzables`, s.coins === s.coinsTotal, `${s.coins}/${s.coinsTotal} faltan=${s.missing.join(' ')}`);
  }

  // Capturas del inicio de cada nivel
  for (let n = 1; n <= 3; n++) {
    const q = await openPage(browser, `?dev=levels&n=${n}`);
    await q.wait(400);
    await q.shot(`09-level${n}`);
    check(r, `nivel ${n} carga sin errores`, q.errors.length === 0, q.errors.join(' | '));
    await q.close();
  }

  // Progresión: llegar a la meta del nivel 1 pasa al 2 conservando vidas/puntos
  await p.freeze();
  let d = await p.debug();
  check(r, 'la partida empieza en el nivel 1 con 3 vidas y 0 puntos', d.level === 0 && d.lives === 3 && d.score === 0 && d.state === 'playing');
  await p.page.evaluate(() => { window.__game.game.scene.health.lives = 2; window.__game.game.scene.run.lives = 2; });
  await p.place(d.flag.x - 40, d.flag.y - 28);
  const R = await p.page.evaluate(() => {
    const b = window.__game.game.input.buttons.find((x) => x.id === 'right');
    const k = window.__game.game.view.scale / window.__game.game.view.dpr;
    return [b.x * k, b.y * k];
  });
  await p.touch.down(1, ...R);
  d = await p.step(30);
  await p.touch.up(1);
  check(r, 'tocar la bandera completa el nivel (+100)', d.state === 'complete' && d.score === 100, `estado=${d.state} puntos=${d.score}`);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(300);
  await p.shot('09-level-complete');
  await p.freeze();
  d = await p.step(100);
  check(r, 'tras la celebración carga el nivel 2', d.level === 1 && d.state === 'playing' && d.name === 'Atardecer');
  check(r, 'conserva vidas y puntos entre niveles', d.lives === 2 && d.score === 100, `vidas=${d.lives} puntos=${d.score}`);

  // Fin de partida: con 1 vida, caer al vacío
  await p.page.evaluate(() => { const s = window.__game.game.scene; s.health.lives = 1; s.run.lives = 1; });
  await p.place(22 * T, 13 * T);
  d = await p.step(3);
  check(r, 'sin vidas el estado pasa a fin de partida', d.state === 'dead');
  d = await p.step(100);
  const log = await p.page.evaluate(() => window.__dev.flowLog);
  check(r, 'tras el fin de partida empieza una nueva en el nivel 1', d.level === 0 && d.lives === 3 && d.score === 0 && log.gameOvers === 1);

  // Victoria: completar el nivel 3
  const w = await openPage(browser, '?dev=levels&n=3');
  await w.freeze();
  d = await w.debug();
  await w.place(d.flag.x - 11, d.flag.y - 28);
  d = await w.step(2);
  check(r, 'completar el nivel 3 marca la meta', d.state === 'complete');
  d = await w.step(100);
  const log2 = await w.page.evaluate(() => window.__dev.flowLog);
  check(r, 'tras el nivel 3 cuenta una victoria', log2.wins === 1 && log2.completed.includes(2));
  check(r, 'sin errores en consola', p.errors.length === 0 && w.errors.length === 0, [...p.errors, ...w.errors].join(' | '));
  await w.close();
  await p.close();
}
