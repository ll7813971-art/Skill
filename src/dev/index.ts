import type { Game, Scene } from '../engine/game';
import { DevLoopScene } from './loopScene';
import { DevInputScene } from './inputScene';
import { DevMovementScene } from './movementScene';
import { DevCollisionScene } from './collisionScene';
import { DevCameraScene } from './cameraScene';

// Nivel de pruebas: una escena aislada por sistema, accesible con ?dev=<id>.
// Añadir un sistema = añadir una entrada aquí.
export const devScenes: Record<string, { label: string; make: (g: Game) => Scene }> = {
  loop: { label: '1. Bucle y escalado del canvas', make: (g) => new DevLoopScene(g) },
  input: { label: '2. Entrada táctil', make: (g) => new DevInputScene(g) },
  movement: { label: '3. Movimiento y salto', make: (g) => new DevMovementScene(g) },
  collision: { label: '4. Colisión con tiles', make: (g) => new DevCollisionScene(g) },
  camera: { label: '5. Cámara', make: (g) => new DevCameraScene(g) },
};

export function showDevIndex(): void {
  document.body.innerHTML = '';
  document.body.style.cssText =
    'background:#1b1f3b;color:#fff;font:16px sans-serif;padding:16px;overflow:auto;touch-action:auto';
  const h = document.createElement('h1');
  h.textContent = 'Nivel de pruebas';
  document.body.append(h);
  const ul = document.createElement('ul');
  for (const [id, { label }] of Object.entries(devScenes)) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `?dev=${id}`;
    a.textContent = label;
    a.style.cssText = 'color:#ffcc33;line-height:2.2';
    li.append(a);
    ul.append(li);
  }
  document.body.append(ul);
}
