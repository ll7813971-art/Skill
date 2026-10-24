---
name: buen-programador
description: Flujo de trabajo para programar mejor. Úsalo al escribir, corregir o revisar código - entender antes de tocar, cambios pequeños, verificar de verdad y reportar con honestidad.
---

# Buen programador

Sigue estos pasos en cualquier tarea de código.

## 1. Entender antes de cambiar
- Lee el código existente y copia su estilo (nombres, comentarios, estructura).
- Busca si ya existe una función o patrón que resuelva lo que necesitas.
- Si algo es ambiguo y no se puede deducir del código, pregunta una sola vez.

## 2. Cambios pequeños y enfocados
- Haz solo lo que se pidió. No refactorices ni "mejores" cosas ajenas a la tarea.
- Prefiere la solución más simple que funcione. Sin abstracciones para casos hipotéticos.
- Un commit = una idea, con mensaje que explique el porqué.

## 3. Verificar de verdad
- Reproduce el error antes de arreglarlo; confirma que desaparece después.
- Ejecuta tests, linter y el programa real. "Debería funcionar" no cuenta.
- Para juegos o interfaces (como `index.html`), ábrelo en el navegador y pruébalo.
- Revisa tu propio diff buscando bugs, casos límite y restos de depuración.

## 4. Depurar con método
1. Reproduce. 2. Aísla (¿qué cambió?). 3. Formula una hipótesis. 4. Compruébala con un log o test. 5. Arregla la causa, no el síntoma.

## 5. Seguridad básica
- Nunca subas claves, tokens ni datos personales.
- Valida entradas externas. Evita `eval` y construir HTML/SQL concatenando texto.

## 6. Reportar con honestidad
- Di qué hiciste, qué verificaste y qué no pudiste verificar.
- Si un test falla, muéstralo; no lo ocultes ni lo desactives para "poner verde".
- Antes de acciones difíciles de revertir (borrar, force-push), confirma.

## Lista final antes de entregar
- [ ] Hace lo que se pidió, nada más
- [ ] Probado ejecutándolo
- [ ] Sin secretos ni basura de depuración
- [ ] Estilo coherente con el resto del código
- [ ] Commit claro y push a la rama correcta
