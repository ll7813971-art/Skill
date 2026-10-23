// Arnés de pruebas en navegador: Chromium emulando un móvil en horizontal con
// pantalla táctil. Los toques se envían por CDP (Input.dispatchTouchEvent),
// así llegan al juego como eventos táctiles reales, con multitoque.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

export const BASE = process.env.GAME_URL ?? 'http://127.0.0.1:5173/';
export const OUT = new URL('../test-output/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const MOBILE = {
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
};

export async function launch() {
  return chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
}

export async function openPage(browser, query, opts = {}) {
  const context = await browser.newContext({ ...MOBILE, ...opts });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__game && window.__game.game.steps > 2);
  const cdp = await context.newCDPSession(page);
  const active = new Map(); // id -> {x, y}
  const points = () => [...active.entries()].map(([id, p]) => ({ id, x: p.x, y: p.y }));
  const touch = {
    async down(id, x, y) {
      active.set(id, { x, y });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points() });
    },
    async move(id, x, y) {
      active.set(id, { x, y });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points() });
    },
    async up(id) {
      const p = active.get(id);
      active.delete(id);
      // Chromium libera solo los puntos que se listan en el touchEnd.
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [{ id, x: p.x, y: p.y }],
      });
    },
    async tap(x, y) {
      await touch.down(99, x, y);
      await page.waitForTimeout(60);
      await touch.up(99);
    },
  };
  return {
    page,
    errors,
    touch,
    debug: () => page.evaluate(() => window.__game.debug()),
    /** Congela la simulación para avanzar paso a paso (60 pasos = 1 s). */
    freeze: () => page.evaluate(() => { window.__game.game.frozen = true; }),
    step: (n) => page.evaluate((k) => { window.__game.game.advance(k); return window.__game.debug(); }, n),
    /** Solo pruebas: coloca al jugador de la escena (coordenadas lógicas). */
    place: (x, y) => page.evaluate(([px, py]) => {
      const pl = window.__game.game.scene.player;
      Object.assign(pl, { x: px, y: py, vx: 0, vy: 0, onGround: false, coyoteT: 0, bufferT: 0, jumping: false });
    }, [x, y]),
    /** Centro en px CSS de un botón táctil, a partir del debug de la escena. */
    async button(id) {
      const d = await page.evaluate(() => window.__game.debug());
      const b = d.buttons.find((x) => x.id === id);
      const k = d.scale / d.dpr;
      return [b.x * k, b.y * k];
    },
    wait: (ms) => page.waitForTimeout(ms),
    waitFor: (fn, arg, timeout = 5000) => page.waitForFunction(fn, arg, { timeout }),
    shot: (name) => page.screenshot({ path: `${OUT}${name}.png` }),
    close: () => context.close(),
  };
}

export function check(results, name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
}
