# Systems

Build order top to bottom. Don't reorder without a real dependency reason
— note it inline if you do.

Nota de orden: como el objetivo es solo móvil, la entrada táctil es la
entrada principal y va en el puesto 2 (antes del movimiento), no al final.

Pruebas: `npm run dev` y, en otra terminal, `npm test [sistema]`. Cada
sistema tiene su escena aislada en `?dev=<id>` (índice en `?dev`).

| # | System | Dev scene | Status | Test notes |
|---|--------|-----------|--------|------------|
| 1 | Bucle de juego y escalado del canvas | `?dev=loop` | done | FALLA: 404 de favicon.ico en consola → favicon inline. PASA: Chromium móvil 844x390 dpr3; t avanza, vista 831x384, canvas 2532x1170, ~60 pasos/s, re-escala al girar a vertical, consola limpia. |
| 2 | Entrada táctil (botones en pantalla, multitoque) | `?dev=input` | done | FALLA: al levantar un dedo seguía activo → error del arnés (CDP solo suelta los puntos listados en touchEnd); arnés corregido, juego sin cambios. PASA: toques CDP reales; izq, deslizar a der, 2º dedo salta mientras se mueve, soltar uno conserva el otro, mitad derecha entera salta, franja superior solo registra toque; botones resaltados en captura; consola limpia. |
| 3 | Movimiento del jugador (carrera, salto ágil: altura variable, coyote time, buffer) | `?dev=movement` | pending | |
| 4 | Colisión con tiles | `?dev=collision` | pending | |
| 5 | Cámara (seguimiento y límites del nivel) | `?dev=camera` | pending | |
| 6 | Monedas y puntuación | `?dev=coins` | pending | |
| 7 | Enemigos (patrullero y saltarín; pisar vs. recibir daño) | `?dev=enemies` | pending | |
| 8 | Vidas, daño, caída al vacío y reaparición | `?dev=lives` | pending | |
| 9 | Carga de niveles y meta (3 niveles, progresión) | `?dev=levels` | pending | |
| 10 | UI/HUD y pantallas (menú, fin de partida, victoria, aviso de orientación) | `?dev=ui` | pending | |
| 11 | Audio (efectos sintetizados con Web Audio) | `?dev=audio` | pending | |
| 12 | Pulido (partículas, sacudida de cámara, deformación al saltar/aterrizar) | `?dev=polish` | pending | |

Status values: `pending` / `building` / `testing` / `done`.

Test notes: one line per completed test — what was exercised, what was
observed, pass or fail. Keep failed attempts in the log too (don't erase
history), just update status once it actually passes.
