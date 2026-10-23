import type { Game } from '../engine/game';
import { GameOverScene, MenuScene, WinScene } from '../ui/screens';
import { START_LIVES } from './health';
import { LEVELS } from './levels';
import { PlayScene, type PlayHooks, type RunState } from './playScene';

/** Registro de la sesión, para las pruebas. */
export interface FlowLog {
  completed: number[];
  gameOvers: number;
  wins: number;
}

export const flowLog: FlowLog = { completed: [], gameOvers: 0, wins: 0 };

type Extra = Pick<PlayHooks, 'sfx'>;

// Flujo: menú → niveles 1..3 (conservando vidas y puntos) → victoria, o
// fin de partida si se acaban las vidas. Desde la pausa se vuelve al menú.
export function showMenu(game: Game, extra: Extra = {}): void {
  game.setScene(
    new MenuScene(game, {
      play: () => {
        enterFullscreen();
        startRun(game, 0, extra);
      },
    }),
  );
}

export function startRun(game: Game, level = 0, extra: Extra = {}): void {
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
            game.setScene(
              new WinScene(game, run.score, run.lives, {
                again: () => startRun(game, 0, extra),
                menu: () => showMenu(game, extra),
              }),
            );
          }
        },
        onGameOver: () => {
          flowLog.gameOvers++;
          game.setScene(
            new GameOverScene(game, run.score, {
              retry: () => startRun(game, 0, extra),
              menu: () => showMenu(game, extra),
            }),
          );
        },
        onMenu: () => showMenu(game, extra),
      }),
    );
  };
  play();
}

/** Pantalla completa y horizontal, si el navegador lo permite (gesto del usuario). */
function enterFullscreen(): void {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' })
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
        .catch(() => {});
    }
  } catch {
    // Sin pantalla completa (p. ej. iOS Safari): el juego funciona igual.
  }
}
