// Partida completa automática con toques reales: menú → 3 niveles → victoria.
// El "jugador" replanifica cada segundo con la física real del juego, sin ver
// a los enemigos (puede perder vidas, como un jugador humano).
// Uso: node tests/playtest.mjs   (con `npm run dev` en marcha)
import { launch, openPage, OUT } from './harness.mjs';
import { planInPage } from './solver.mjs';
import { writeFileSync } from 'node:fs';

const browser = await launch();
const p = await openPage(browser, '?dev=ui');
await p.freeze();
await p.step(30);
const report = { levels: [], errors: [], result: null };

const btn = async () => p.page.evaluate(() => {
  const g = window.__game.game;
  const k = g.view.scale / g.view.dpr;
  const at = (id) => { const b = g.input.buttons.find((x) => x.id === id); return [b.x * k, b.y * k]; };
  return { left: at('left'), right: at('right'), jump: at('jump') };
});

let d = await p.tapUI('play');
const B = await btn();
let held = { dir: 0, jump: false };
const setDir = async (dir) => {
  if (dir === held.dir) return;
  if (held.dir !== 0) await p.touch.up(1);
  if (dir !== 0) await p.touch.down(1, ...(dir > 0 ? B.right : B.left));
  held.dir = dir;
};
const setJump = async (on) => {
  if (on === held.jump) return;
  if (on) await p.touch.down(2, ...B.jump);
  else await p.touch.up(2);
  held.jump = on;
};
// Ejecuta una acción del plan con toques reales: 10 pasos de simulación.
const act = async (a) => {
  await setDir(a.dir);
  if (a.jump === 1 || a.jump === 2) { await setJump(false); await setJump(true); }
  if (a.jump === 0) await setJump(false);
  for (let i = 0; i < 10; i++) {
    if (a.jump === 1 && i === 3) await setJump(false);
    const hit = await p.page.evaluate(() => {
      const sc = window.__game.game.scene;
      const before = sc.player ? { x: sc.player.x, y: sc.player.y, vx: sc.player.vx, vy: sc.player.vy, onGround: sc.player.onGround } : null;
      const near = sc.enemies?.list.filter((e) => e.alive).map((e) => ({ kind: e.kind, x: Math.round(e.x), y: Math.round(e.y), vx: e.vx, vy: Math.round(e.vy) }))
        .filter((e) => before && Math.abs(e.x - before.x) < 80);
      const lives = sc.run?.lives;
      window.__game.game.advance(1);
      const ev = sc.health?.events ?? [];
      return ev.includes('hurt') ? { before, near, lives } : null;
    });
    if (hit) (report.hurtDetails ??= []).push(hit);
  }
};

let level = -1, levelStart = 0, steps = 0, shotN = 0;
for (let guard = 0; guard < 4000; guard++) {
  d = await p.debug();
  if (d.scene !== 'play') break;
  if (d.level !== level) {
    if (level >= 0) report.levels[level].steps = steps - levelStart;
    level = d.level;
    levelStart = steps;
    report.levels[level] = { name: d.name, livesStart: d.lives, replans: 0, hurts: 0 };
    await p.page.evaluate(() => { window.__game.game.frozen = false; });
    await p.wait(400);
    await p.shot(`playtest-level${level + 1}-start`);
    await p.freeze();
  }
  if (d.state !== 'playing') {
    await setDir(0); await setJump(false);
    await p.step(10); steps += 10;
    continue;
  }
  // Primero intentar un plan que esquive a los enemigos; si no existe (un
  // enemigo bloquea el paso), aceptar uno que los ignore.
  let plan = await p.page.evaluate(planInPage, [60000, true]);
  let kind = 'esquiva';
  // Sin plan seguro: esperar un momento (como haría una persona) y reintentar.
  for (let w = 0; !plan && w < 2; w++) {
    await setDir(0); await setJump(false);
    await p.step(20); steps += 20;
    plan = await p.page.evaluate(planInPage, [60000, true]);
    kind = 'espera';
  }
  if (!plan) { plan = await p.page.evaluate(planInPage, [150000, false]); kind = 'ignora'; }
  (report.levels[level].plans ??= []).push(`${kind}@${Math.round(d.x / 32)}`);
  report.levels[level].replans++;
  if (!plan) { report.result = `sin plan en ${d.name} x=${d.x.toFixed(0)}`; break; }
  const livesBefore = d.lives;
  for (const a of plan.slice(0, 6)) { await act(a); steps += 10; }
  d = await p.debug();
  if (d.scene === 'play' && d.lives < livesBefore) {
    report.levels[level].hurts += livesBefore - d.lives;
    (report.levels[level].hurtAt ??= []).push(Math.round(d.x / 32));
  }
  if (steps % 600 < 60) {
    await p.page.evaluate(() => { window.__game.game.frozen = false; });
    await p.wait(30);
    await p.shot(`playtest-${String(++shotN).padStart(2, '0')}`);
    await p.freeze();
  }
}
await setDir(0); await setJump(false);
d = await p.debug();
if (level >= 0 && report.levels[level].steps === undefined) report.levels[level].steps = steps - levelStart;
const log = await p.page.evaluate(() => window.__dev.flowLog);
report.result ??= d.scene;
report.flowLog = log;
report.final = await p.page.evaluate(() => window.__game.game.scene.score ?? null);
report.played = await p.page.evaluate(() => [...new Set(window.__game.game.sound.played)]);
report.errors = p.errors;
await p.page.evaluate(() => { window.__game.game.frozen = false; });
await p.wait(400);
await p.shot('playtest-final');
writeFileSync(`${OUT}playtest.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(report.result === 'win' && report.errors.length === 0 ? 0 : 1);
