import { openPage, check } from '../harness.mjs';

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=camera');
  await p.freeze();
  const R = await p.button('right');
  const L = await p.button('left');
  let s = await p.step(5);
  check(r, 'al inicio la cámara está en el borde izquierdo (0)', s.camX === 0);

  await p.touch.down(1, ...R);
  s = await p.step(90);
  const screenX = s.px - s.camX;
  check(r, 'la cámara sigue al correr', s.camX > 100, `cam.x=${s.camX.toFixed(0)}`);
  check(r, 'el jugador queda a la izquierda del centro (ve lo que viene)', screenX > s.viewW * 0.2 && screenX < s.viewW * 0.45, `x en pantalla=${screenX.toFixed(0)} de ${s.viewW.toFixed(0)}`);
  await p.page.evaluate(() => { window.__game.game.frozen = false; });
  await p.wait(80);
  await p.shot('05-camera-follow');
  await p.freeze();
  s = await p.step(600);
  check(r, 'al final se detiene en el borde derecho', Math.abs(s.camX - (s.mapW - s.viewW)) < 0.01, `cam.x=${s.camX.toFixed(1)}`);
  check(r, 'el jugador llega al final del mapa visible', s.px + s.pw === s.mapW);
  await p.touch.up(1);

  await p.touch.down(1, ...L);
  s = await p.step(60);
  const sx2 = s.px - s.camX;
  check(r, 'al girar a la izquierda la cámara mira hacia ese lado', sx2 > s.viewW * 0.5, `x en pantalla=${sx2.toFixed(0)}`);
  s = await p.step(900);
  await p.touch.up(1);
  check(r, 'vuelve y se detiene en el borde izquierdo', s.camX === 0);

  // Girar la pantalla con la cámara a la derecha: debe re-limitarse.
  await p.touch.down(1, ...R);
  s = await p.step(900);
  await p.touch.up(1);
  await p.page.setViewportSize({ width: 700, height: 390 });
  await p.wait(100);
  s = await p.step(2);
  check(r, 'tras cambiar el tamaño sigue dentro de los límites', s.camX <= s.mapW - s.viewW + 0.01 && s.camX >= 0, `cam.x=${s.camX.toFixed(1)} max=${(s.mapW - s.viewW).toFixed(1)}`);
  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}
