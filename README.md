# Saltarín

Juego de plataformas 2D para **móvil** hecho con HTML5 Canvas, TypeScript y
Web Audio, sin imágenes ni archivos de sonido: todo se dibuja y se sintetiza
por código.

- 3 niveles (Pradera, Atardecer y Noche) con dificultad creciente y bandera de meta
- Controles táctiles con multitoque: mitad izquierda para moverse (◀ ▶, se puede
  deslizar el dedo) y mitad derecha para saltar (mantén pulsado para saltar
  más alto)
- Salto ágil con altura variable, coyote time y buffer de salto
- Monedas, dos tipos de enemigos (patrullero y saltarín: písalos desde arriba),
  3 vidas, puntuación
- Menú, pausa, fin de partida, victoria, aviso para girar el móvil
- Efectos de sonido sintetizados, partículas, sacudida de cámara y vibración

## Jugar

```bash
npm install
npm run dev        # http://127.0.0.1:5173 (para el móvil: npx vite --host)
npm run build      # versión de producción en dist/ (servible desde cualquier carpeta)
```

## Pruebas

```bash
npm run dev                # en una terminal
npm test                   # 176 comprobaciones en Chromium con emulación móvil y toques reales
npm test -- enemies        # solo un sistema
npm run playtest           # partida completa automática: menú → 3 niveles → victoria
```

Cada sistema tiene una escena aislada en el nivel de pruebas: abre `?dev` para
ver el índice (`?dev=movement`, `?dev=enemies`, `?dev=levels&n=2`...).

## Documentación del proyecto

- `GAME_SPEC.md`: qué juego es (la especificación)
- `SYSTEMS.md`: sistemas, orden de construcción y registro de pruebas
- `PLAYTEST.md`: resultado de la partida completa y ajustes de diseño
- `.claude/skills/game-dev/`: la skill que guió el desarrollo
