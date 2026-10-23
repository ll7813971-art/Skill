// Validador de niveles: búsqueda en anchura sobre las acciones del jugador
// usando la física REAL del juego (Player + TileMap expuestos en window.__dev).
// Ignora a los enemigos (se pueden pisar o esquivar). Se ejecuta en la página.
export function solveInPage(levelIdx) {
  const { LEVELS, Player, TileMap } = window.__dev;
  const T = 32;
  const map = new TileMap(LEVELS[levelIdx].rows);
  const start = map.find('P')[0];
  const flag = map.find('F')[0];
  const fb = { x: flag.c * T + T / 2 - 10, y: (flag.r + 1) * T - 4 * T, w: 20, h: 4 * T };
  const coins = map.find('o').map(({ c, r }) => ({ x: c * T + 16, y: r * T + 16, key: `${c},${r}` }));
  const got = new Set();
  const FIELDS = ['x', 'y', 'vx', 'vy', 'onGround', 'coyoteT', 'bufferT', 'jumping', 'facing'];
  const p = new Player(start.c * T + 5, (start.r + 1) * T - 28);
  const idle = { left: false, right: false, jump: false, jumpPressed: false };
  for (let i = 0; i < 10; i++) p.update(1 / 60, idle, map);
  const snap = () => FIELDS.map((f) => p[f]);
  const load = (s) => FIELDS.forEach((f, i) => { p[f] = s[i]; });
  const key = () => `${Math.round(p.x / 4)},${Math.round(p.y / 4)},${Math.round(p.vy / 50)},${Math.round(p.vx / 70)},${p.onGround ? 1 : 0}`;
  const hitsFlag = () => p.x < fb.x + fb.w && p.x + p.w > fb.x && p.y < fb.y + fb.h && p.y + p.h > fb.y;
  const STEPS = 10;
  // jump: 0 nada, 1 toque (3 pasos), 2 pulsar y mantener, 3 seguir manteniendo
  const actions = [];
  for (const dir of [1, -1, 0]) for (const jump of [0, 1, 2, 3]) actions.push({ dir, jump });
  // Montículo de máximos por x: primero los estados más avanzados.
  const heap = [];
  const push = (s) => {
    heap.push(s);
    let i = heap.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (heap[j][0] >= heap[i][0]) break;
      [heap[i], heap[j]] = [heap[j], heap[i]];
      i = j;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] > heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] > heap[m][0]) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };
  const seen = new Set([key()]);
  push(snap());
  let flagReached = false;
  let expanded = 0;
  while (heap.length && expanded < 300000) {
    const s = pop();
    expanded++;
    for (const a of actions) {
      load(s);
      let dead = false;
      for (let i = 0; i < STEPS; i++) {
        const inp = {
          left: a.dir < 0,
          right: a.dir > 0,
          jump: a.jump === 2 || a.jump === 3 || (a.jump === 1 && i < 3),
          jumpPressed: (a.jump === 1 || a.jump === 2) && i === 0,
        };
        p.update(1 / 60, inp, map);
        if (p.y > map.height) { dead = true; break; }
        for (const c of coins) {
          if (got.has(c.key)) continue;
          const nx = Math.max(p.x, Math.min(c.x, p.x + p.w));
          const ny = Math.max(p.y, Math.min(c.y, p.y + p.h));
          if ((nx - c.x) ** 2 + (ny - c.y) ** 2 < 121) got.add(c.key);
        }
        if (hitsFlag()) flagReached = true;
      }
      if (dead) continue;
      const k = key();
      if (!seen.has(k)) { seen.add(k); push(snap()); }
    }
    if (flagReached && got.size === coins.length) break;
  }
  return {
    flagReached,
    coins: got.size,
    coinsTotal: coins.length,
    missing: coins.filter((c) => !got.has(c.key)).map((c) => c.key),
    expanded,
  };
}
