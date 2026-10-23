// Uso: node tests/run.mjs [sistema ...]   (sin argumentos: todos)
import { readdirSync } from 'node:fs';
import { launch } from './harness.mjs';

const dir = new URL('./systems/', import.meta.url);
const all = readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort();
const wanted = process.argv.slice(2);
const files = wanted.length ? all.filter((f) => wanted.some((w) => f.includes(w))) : all;

const browser = await launch();
let failed = 0;
for (const f of files) {
  const mod = await import(new URL(f, dir));
  const results = [];
  try {
    await mod.run(browser, results);
  } catch (e) {
    results.push({ name: 'excepción', ok: false, detail: e.stack ?? String(e) });
  }
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'PASA' : 'FALLA'}  [${f}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  }
}
await browser.close();
console.log(failed ? `\n${failed} comprobación(es) fallida(s)` : '\nTodo correcto');
process.exit(failed ? 1 : 0);
