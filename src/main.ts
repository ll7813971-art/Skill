import { Game } from './engine/game';
import { devScenes, showDevIndex } from './dev/index';
import { flowLog, showMenu } from './game/flow';
import { LEVELS } from './game/levels';
import { Player } from './game/player';
import { TileMap } from './game/tilemap';
import { SYNTHS } from './engine/audio';

declare global {
  interface Window {
    __game?: { game: Game; debug: () => Record<string, unknown> };
    __dev?: Record<string, unknown>;
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
  if (entry) {
    const scene = entry.make(game);
    if (scene) game.setScene(scene);
    // Módulos expuestos solo en modo pruebas (p. ej. para el validador de niveles).
    window.__dev = { LEVELS, Player, TileMap, flowLog, SYNTHS };
  } else {
    game.portraitBlock = true;
    showMenu(game);
  }
  // Gancho para las pruebas automáticas en el navegador.
  window.__game = { game, debug: () => game.scene?.debug?.() ?? {} };
  game.start();
}
