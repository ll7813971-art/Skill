import { Game } from './engine/game';
import { devScenes, showDevIndex } from './dev/index';

declare global {
  interface Window {
    __game?: { game: Game; debug: () => Record<string, unknown> };
  }
}

const params = new URLSearchParams(location.search);
const dev = params.get('dev');

if (dev === '') {
  showDevIndex();
} else {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const game = new Game(canvas);
  const entry = dev !== null ? devScenes[dev] : undefined;
  if (dev !== null && !entry) throw new Error(`Escena de pruebas desconocida: ${dev}`);
  if (entry) game.setScene(entry.make(game));
  // Gancho para las pruebas automáticas en el navegador.
  window.__game = { game, debug: () => game.scene?.debug?.() ?? {} };
  game.start();
}
