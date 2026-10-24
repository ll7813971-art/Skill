# Geometry Dash — Edición HTML

Recreación de Geometry Dash en **un solo archivo**: [`index.html`](index.html).
No necesita instalar nada: ábrelo en el navegador y a jugar.

## Contenido

- **Menú de inicio** con escena animada, selección de niveles, garaje y pantalla de ayuda.
- **8 niveles** de dificultad creciente (cada uno con su música y sus colores):
  - *Primeros Pasos* (Fácil): cubo y nave.
  - *Ritmo Nocturno* (Normal): cubo, bola, gravedad invertida, OVNI y velocidad x2.
  - *Ruta Electrónica* (Difícil): cubo, onda, robot, araña y nave a velocidad x2.
  - *Salto Cósmico* (Normal, espacio): islas flotantes, carrera por el techo, nave entre asteroides.
  - *Torre Neón* (Difícil, neón): escalada con orbes, OVNI entre pisos, robot y orbes azules.
  - *Eco Digital* (Más difícil, digital): sierras giratorias, onda entre pasillos de pinchos, araña.
  - *Tormenta Polar* (Insano, nieve): de lento a x3, nave entre carámbanos, OVNI con orbes rosas.
  - *Abismo Final* (Demonio, brasas): sierras por todas partes y los 7 vehículos seguidos.
- **7 vehículos**: cubo, nave, bola, OVNI, onda, robot y araña.
- Orbes, plataformas de salto, portales de vehículo, de gravedad y de velocidad.
- **Modo práctica** con puntos de control automáticos y manuales.
- Garaje para elegir la cara del cubo y los colores (se guarda en el navegador).
- **Ajustes**: volumen de música y efectos, barra y porcentaje de progreso, partículas,
  sacudida, decoración al ritmo, calidad gráfica, puntos de control automáticos,
  mostrar hitboxes y borrar el progreso.
- Récords por nivel, música y efectos de sonido sintetizados (sin archivos externos).
- Funciona con teclado, ratón y pantalla táctil.

## Editor de niveles

Botón **Crear** del menú. Toda su interfaz está dibujada por el propio juego (sin botones ni
cuadros del navegador) y funciona con ratón, teclado y pantalla táctil.

- **Mis niveles**: crear, editar, jugar, practicar, borrar y copiar/pegar niveles como código.
- **Herramientas**: Poner (también arrastrando), Elegir y mover, Borrar arrastrando y Mover la cámara.
  Zoom, deshacer/rehacer y rejilla de 1 o ½ bloque.
- **Objetos**: bloques de cualquier tamaño, pinchos, pinchos pequeños, sierras, plataformas de salto
  y orbes de 3 colores, portales de los 7 vehículos, de gravedad y de velocidad (x0,5 a x4),
  decoración y disparadores de color.
- **Propiedades** del objeto elegido (tamaño, girar, color, vehículo, velocidad…).
- **Ajustes del nivel**: nombre (con teclado propio), música, tema visual, velocidad y color.
- **Probar** desde el principio o **desde aquí**; si llegas al final en la prueba, el nivel queda verificado.
- Sin límite de objetos ni de longitud.

Atajos: `1`–`4` herramientas, `Ctrl+Z`/`Ctrl+Y` deshacer/rehacer, flechas para mover lo elegido,
`Supr` para borrarlo, `Enter` para probar, rueda para desplazar y `Ctrl`+rueda para el zoom.
En móvil: dos dedos para mover la cámara y pellizcar para el zoom.

## Controles

| Acción | Teclas |
| --- | --- |
| Saltar / volar | `Espacio`, `↑`, `W`, clic o toque (mantén pulsado para seguir saltando) |
| Pausa | `Esc` o `P` |
| Silenciar | `M` |
| Reiniciar | `R` |
| Práctica: poner / quitar punto de control | `Z` / `X` |

## Skill para Claude Code

`.claude/skills/buen-programador/SKILL.md`: buenas prácticas de programación (entender, cambios pequeños, verificar, depurar, seguridad, reportar con honestidad). Se invoca con `/buen-programador`.
