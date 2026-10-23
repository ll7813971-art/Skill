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
| 3 | Movimiento del jugador (carrera, salto ágil: altura variable, coyote time, buffer) | `?dev=movement` | done | FALLA: salto mantenido 2,81 tiles (medición desde después del 1er paso + pérdida de integración) → medición corregida, jumpSpeed 650→670. FALLA: precondición de la prueba de buffer (ventana 12 px < caída por paso) → ventana 20 px. PASA (pasos deterministas + toques CDP): 210 px/s en 0,1 s, frena en 0,1 s, ambos sentidos, salto mantenido 3,33 tiles, toque 1,39 tiles, buffer pulsando a 17,8 px del suelo, mantener no encadena saltos, consola limpia. Coyote se prueba en el sistema 4 (requiere bordes). |
| 4 | Colisión con tiles | `?dev=collision` | done | FALLA: 2 comprobaciones → error de la prueba (punto de caída bajo el techo; aterrizó bien sobre él); corregido el punto. PASA: aterriza exacto sobre tile, pared frena en x=64, techo corta el salto (cabeza en y=224), coyote salta 0,05 s tras el borde y cruza el hueco, sin salto a 0,25 s, cae por el hueco, plataforma atravesable desde abajo y se queda encima, consola limpia; sin regresiones en 1-3. |
| 5 | Cámara (seguimiento y límites del nivel) | `?dev=camera` | done | PASA a la primera: mapa de 80 tiles; cámara en 0 al inicio, sigue al correr con el jugador al 32 % de la pantalla, se detiene exacto en el borde derecho (1729) e izquierdo (0), mira hacia la izquierda al girar, se re-limita tras cambiar el tamaño; sin costuras entre tiles en la captura; consola limpia. |
| 6 | Monedas y puntuación | `?dev=coins` | done | FALLA x3 (todas de la prueba, no del juego): la trayectoria de salto ajustada a mano no encajaba con el arco (la caída es más pesada que la subida y el salto máximo pasa por encima de monedas a 2,5 tiles). Prueba reescrita: salto real con toques recoge 3/5 monedas aéreas + recogida determinista en el aire de las restantes. PASA: 6 de suelo al pasar (60 pts), no recuenta, 11/11 = 110 pts, consola limpia. Nota de diseño para los niveles: arcos de monedas a ≤2 tiles o asimétricos. |
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
