import { openPage, check } from '../harness.mjs';

export async function run(browser, r) {
  const p = await openPage(browser, '?dev=input');
  const d0 = await p.debug();
  const k = d0.scale / d0.dpr; // lógico -> CSS
  const at = (id) => {
    const b = d0.buttons.find((x) => x.id === id);
    return [b.x * k, b.y * k];
  };
  const [lx, ly] = at('left');
  const [rx, ry] = at('right');
  const [jx, jy] = at('jump');
  const st = async () => {
    await p.wait(50);
    return p.debug();
  };

  await p.touch.down(1, lx, ly);
  let s = await st();
  check(r, 'dedo en botón izquierdo → izquierda', s.left && !s.right && !s.jump);
  await p.shot('02-input-left');

  await p.touch.move(1, rx, ry);
  s = await st();
  check(r, 'deslizar a la derecha cambia de dirección', s.right && !s.left);

  await p.touch.down(2, jx, jy);
  s = await st();
  check(r, 'segundo dedo salta mientras se mueve (multitoque)', s.right && s.jump && s.pointers === 2 && s.jumpPresses === 1);
  await p.shot('02-input-multitouch');

  await p.touch.up(2);
  s = await st();
  check(r, 'soltar salto mantiene la dirección', s.right && !s.jump && s.pointers === 1);

  await p.touch.up(1);
  s = await st();
  check(r, 'soltar todo deja la entrada en reposo', !s.left && !s.right && !s.jump && s.pointers === 0);

  // Zona generosa: un toque lejos del botón de salto, en la mitad derecha.
  await p.touch.down(3, 844 * 0.6, 200);
  s = await st();
  check(r, 'la mitad derecha completa cuenta como salto', s.jump && s.jumpPresses === 2);
  await p.touch.up(3);

  // Franja superior reservada para el HUD: es un toque, no un control.
  await p.touch.tap(800, 15);
  s = await st();
  check(r, 'franja superior no activa controles pero registra toque', !s.jump && s.jumpPresses === 2 && s.taps >= 4, `taps=${s.taps}`);

  check(r, 'sin errores en consola', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}
