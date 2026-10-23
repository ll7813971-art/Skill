# Game Spec

## Core loop
El jugador controla a un personaje que corre y salta por niveles de
plataformas con desplazamiento lateral, usando botones táctiles en pantalla
(izquierda, derecha, saltar). Recoge monedas para sumar puntos, esquiva o
pisa a los enemigos (pisarlos desde arriba los elimina; tocarlos de lado
cuesta una vida) y evita caer al vacío. Al llegar a la bandera de meta pasa
al siguiente nivel; tras el nivel 3 gana la partida. Si pierde todas las
vidas, la partida termina y puede volver a empezar desde el menú.

## Genre
Plataformas 2D ("Crea un juego de plataformas HTML5 con Canvas, controles
táctiles para móvil, enemigos, monedas, niveles y sonidos").

## Platform target
Solo móvil (táctil). Controles táctiles en pantalla, multitoque (moverse y
saltar a la vez). Orientación: horizontal (decisión técnica tomada por
Claude porque un plataformas lateral necesita ver hacia delante; en vertical
se muestra un aviso para girar el dispositivo). Sin soporte de teclado como
objetivo (puede existir solo como ayuda de desarrollo).

## Art approach
Formas vectoriales: todo dibujado por código con Canvas 2D (formas y colores
planos), sin archivos de imagen.

## Scope
Juego pequeño completo: 3 niveles con meta, 2 tipos de enemigos, vidas,
puntuación, menú y una pasada de pulido.

## Genre-specific answers
- Sensación de salto: "Ágil" — salto rápido y preciso, altura variable
  según cuánto se mantiene pulsado, y un pequeño margen (coyote time) para
  saltar justo después de salir de un borde.
- Niveles: 3 niveles con desplazamiento lateral y bandera de meta.
- Enemigos: 2 tipos — uno que patrulla de lado a lado y uno que salta.
- Monedas: coleccionables que suman puntuación.
- Sonidos: sintetizados con Web Audio (sin archivos de audio).
- Tecnología: HTML5 Canvas (pedido explícitamente).

## Explicit non-goals
- Soporte de escritorio/teclado como plataforma objetivo.
- Gráficos con imágenes o sprites externos.
- Música de fondo compleja, editor de niveles, multijugador.
