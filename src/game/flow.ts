import type { Game } from '../engine/game';
import { START_LIVES } from './health';
import { LEVELS } from './levels';
import { PlayScene, type PlayHooks, type RunState } from './playScene';

/** Resultado de la última partida, para pantallas y pruebas. */
export interface FlowLog {
  completed: number[];
  gameOvers: number;
  wins: number;
}

export const flowLog: FlowLog = { completed: [], gameOvers: 0, wins: 0 };

// Encadena los niveles: al completar uno pasa al siguiente conservando vidas y
// puntos; tras el último, victoria. (El menú y las pantallas llegan con la UI.)
export function startRun(game: Game, level = 0, extra: Partial<PlayHooks> = {}): void {
  const run: RunState = { level, lives: START_LIVES, score: 0 };
  const play = () => {
    game.setScene(
      new PlayScene(game, run, {
        ...extra,
        onComplete: () => {
          flowLog.completed.push(run.level);
          if (run.level + 1 < LEVELS.length) {
            run.level++;
            play();
          } else {
            flowLog.wins++;
            startRun(game, 0, extra);
          }
        },
        onGameOver: () => {
          flowLog.gameOvers++;
          startRun(game, 0, extra);
        },
      }),
    );
  };
  play();
}
