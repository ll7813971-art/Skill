# Playtest

Partida completa de principio a fin (Fase 6), en la única plataforma
declarada en `GAME_SPEC.md`: **móvil táctil en horizontal**.

## Cómo se jugó

- Navegador: Chromium emulando un móvil Android (844×390 CSS, dpr 3, 2532×1170
  píxeles físicos, `hasTouch`, `isMobile`).
- Entrada: **toques reales** enviados por CDP (`Input.dispatchTouchEvent`) sobre
  los botones en pantalla, con multitoque (un dedo para la dirección y otro
  para saltar a la vez). Se empieza en el menú tocando «Jugar».
- Jugador: `tests/playtest.mjs` (`npm run playtest`). Cada segundo planifica una
  ruta hasta la meta con la física real del juego y predice dónde estarán los
  enemigos durante ~1,5 s. Si no hay ruta segura, espera y lo vuelve a
  intentar. No predice la parábola de los saltarines (igual que un jugador
  novato).

## Resultado final

| Build | Partidas | Victorias | Errores de consola |
|---|---|---|---|
| Desarrollo (`npm run dev`) | 8 | 8 | 0 |
| Producción (`npm run build` + `vite preview`) | 3 | 3 | 0 |

Partida típica en el build de producción: Pradera 15,5 s (sin golpes), Atardecer
~21 s (1 golpe), Noche 22 s (sin golpes); victoria con 2 vidas y 890 puntos.
En la partida sonaron click, land, coin, jump, complete, hurt y stomp.

## Hallazgos y correcciones

1. **Primera partida: fin de partida en el nivel 2.** El jugador automático
   ignoraba a los enemigos, así que el dato no servía para juzgar el juego.
   Se mejoró el jugador: primero con zonas de peligro y después con la
   posición predicha de cada enemigo.
2. **El saltarín del nivel 2 te perseguía nada más empezar** (columna 16, con un
   alcance de 10 tiles, mientras aún se veía el cartel del nivel). Era injusto
   → alcance de persecución de 320 a 240 px y el saltarín pasa a la columna 18.
3. **Trampa al aterrizar en el nivel 2 (columna 74):** se perdían dos vidas
   seguidas en el mismo sitio, porque dos patrulleros recorrían el suelo hasta
   el borde del hueco y el aterrizaje era inevitable → bloque de ladrillo en la
   columna 77 que limita la patrulla a las columnas 78–85, y un patrullero
   menos.
4. **Misma trampa en el nivel 3 (columna 36):** un saltarín esperaba en la zona
   de aterrizaje del foso de 5 tiles → se quita (el de la columna 44 sigue
   cubriendo ese tramo).

Tras los cambios 2–4 se volvió a pasar el validador de niveles: la meta y
todas las monedas siguen siendo alcanzables, y la dificultad sigue creciendo
(5 / 8 / 10 enemigos).

## Sensación de juego (lo que se vio en las capturas)

- El salto ágil se lee bien: aplastamiento al aterrizar, polvo y la altura
  variable funcionan como se pidió.
- Los botones táctiles son translúcidos y no tapan al jugador: la cámara lo
  mantiene a ~1/3 de la pantalla y el inicio de cada nivel está en la
  columna ≥ 6.
- En el nivel nocturno, el fondo del botón de pausa (negro semitransparente)
  contrasta menos con el cielo, pero el icono blanco se ve bien.
- El único golpe recurrente (saltarín del nivel 2, columna 15) se considera un
  desafío legítimo: se le ve venir y se le puede pisar.

## Errores abiertos

Ninguno.

## Limitaciones conocidas (no son errores)

- **No se ha probado en un dispositivo físico** ni en Safari de iOS: en este
  entorno solo está disponible Chromium. La pantalla completa y el bloqueo de
  orientación se piden solo si el navegador los admite (en iOS Safari no
  existen para páginas, y el juego funciona igual, con el aviso de girar el
  móvil).
- **El audio se verifica por la señal, no de oído:** cada sonido se renderiza en
  un `OfflineAudioContext` y se mide su nivel; además se comprueba que el
  contexto real queda en `running` tras el primer toque.
- La vibración solo existe en Android (`navigator.vibrate`); en iOS no hace nada.
- El nivel de pruebas (`?dev`) va incluido en el build de producción. No afecta
  al juego normal y sirve para volver a verificar cualquier sistema.
