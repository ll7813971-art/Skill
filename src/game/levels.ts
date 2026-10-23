import { LevelBuilder } from './levelBuilder';

export interface Theme {
  skyTop: string;
  skyBottom: string;
  hillsFar: string;
  hillsNear: string;
  /** Estrellas en el cielo (nivel nocturno). */
  stars?: boolean;
}

export interface LevelDef {
  name: string;
  theme: Theme;
  rows: string[];
}

// Límites del salto (ver MOVE en player.ts): sube hasta ~3,3 tiles y salta
// ~4 tiles en horizontal a máxima velocidad. Los niveles usan como mucho
// huecos de 3 tiles, subidas de 2-3 tiles y arcos de monedas de ≤ 2 tiles.
// El jugador empieza en la columna 6 o más para no quedar bajo los botones.

function pradera(): string[] {
  const b = new LevelBuilder(100);
  b.ground(0, 24).start(6).coins(10, 9, 4).walker(18);
  b.ground(27, 45).oneway(30, 7, 4).coins(30, 6, 4);
  b.block(38, 8, 2, 2).coins(38, 7, 2).walker(43);
  b.coins(25, 8).coins(26, 8); // sobre el primer hueco
  b.ground(48, 70).oneway(50, 7, 3).block(55, 5, 4, 1).coins(55, 4, 4).walker(62).walker(66);
  b.coins(46, 8, 2);
  b.ground(71, 85, 8).coins(74, 7, 4).walker(80, 7);
  b.ground(86, 99).coins(88, 9, 3).flag(95);
  return b.rows();
}

function atardecer(): string[] {
  const b = new LevelBuilder(120);
  b.ground(0, 20).start(6).coins(9, 9, 4).hopper(16);
  b.coins(21, 8, 3);
  b.ground(24, 40).block(28, 9).block(29, 8, 1, 2).block(30, 7, 1, 3).coins(30, 6).coins(31, 6).walker(35);
  b.oneway(42, 8, 3).coins(42, 7, 3); // puente sobre un foso de 5
  b.ground(46, 70).hopper(52).oneway(56, 8, 3).block(60, 6, 5, 1).coins(60, 5, 5).walker(58).hopper(67);
  b.coins(71, 8, 3);
  b.ground(74, 85).walker(78).walker(83);
  b.ground(86, 95, 8).coins(88, 7, 4).hopper(93, 7);
  b.ground(99, 119).coins(102, 9, 3).walker(108).flag(114);
  return b.rows();
}

function noche(): string[] {
  const b = new LevelBuilder(140);
  b.ground(0, 18).start(6).coins(10, 9, 3).walker(15);
  b.coins(19, 8, 3);
  b.ground(22, 28);
  b.block(30, 8, 3, 1).coins(30, 7, 3); // isla flotante sobre un foso de 5
  b.ground(34, 50).hopper(38).oneway(40, 7, 4).coins(40, 6, 4).hopper(44);
  b.block(47, 9).block(48, 8, 1, 2).block(49, 7, 1, 3).block(50, 6, 1, 4);
  b.block(51, 6, 10, 1).walker(55, 5).coins(52, 5, 2).coins(58, 5, 2); // puente alto
  b.ground(61, 80).hopper(66).walker(70).walker(75);
  b.coins(82, 8).ground(84, 86).coins(85, 9).coins(88, 8);
  b.ground(90, 110).oneway(94, 8, 3).oneway(98, 6, 3).coins(98, 5, 3).walker(103).hopper(107);
  b.coins(111, 8, 3);
  b.ground(114, 139).walker(120).hopper(126).coins(129, 9, 3).flag(134);
  return b.rows();
}

export const LEVELS: LevelDef[] = [
  {
    name: 'Pradera',
    theme: { skyTop: '#6ec6ff', skyBottom: '#d4f1ff', hillsFar: '#a8dcb4', hillsNear: '#7cc794' },
    rows: pradera(),
  },
  {
    name: 'Atardecer',
    theme: { skyTop: '#ff8a65', skyBottom: '#ffe0a3', hillsFar: '#d99a8a', hillsNear: '#b5736a' },
    rows: atardecer(),
  },
  {
    name: 'Noche',
    theme: { skyTop: '#0d1033', skyBottom: '#2f3a7a', hillsFar: '#2a2f63', hillsNear: '#1f2450', stars: true },
    rows: noche(),
  },
];
