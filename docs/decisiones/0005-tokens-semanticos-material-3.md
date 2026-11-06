# 0005: Tokens Semánticos Google Material 3 y Refactor Integral Bimodal

- **Fecha**: 2026-11-06
- **Estado**: Aceptada

## Contexto y Problema
En el Issue #12 se habilitó el modo claro mediante un parche de overrides globales en `src/index.css` sobre clases `slate-*` hardcodeadas (`html:not(.dark) .text-white`, `html:not(.dark) .bg-slate-900`, etc.). Esta técnica generaba deuda técnica acumulativa, fragilidad ante nuevos componentes, falta de consistencia de contraste WCAG y acoplamiento severo con la paleta Slate de Tailwind. Se requería una solución robusta, escalable y bimodal sin clases rígidas, inspirada en las decisiones probadas de diseño atómico.

## Alternativas Evaluadas

1. **Mantener y expandir los overrides de CSS (`html:not(.dark)`)**:
   - *Ventajas*: No requiere modificar la estructura de clases en los componentes existentes.
   - *Desventajas*: Alta fragilidad; cualquier clase de utilidad nueva (`slate-700`, `slate-800/80`) no cubierta por el selector queda rota en modo claro; especificidad CSS artificial e imposible de mantener a largo plazo.

2. **Duplicar todas las clases con modificador `dark:` en JSX (`bg-slate-50 dark:bg-slate-900`)**:
   - *Ventajas*: Usa la convención tradicional de Tailwind.
   - *Desventajas*: Verbosidad extrema en todos los componentes; riesgo de olvidar pares bimodal en inputs o badges; acoplamiento rígido a la paleta Slate impidiendo personalizar o calibrar temas globales.

3. **Tokens Semánticos inspirados en Google Material 3 (MD3) mapeados con Variables CSS en Tailwind**:
   - *Ventajas*: Desacoplamiento total entre rol funcional (`surface`, `surface-container`, `on-surface`, `primary-md3`) y color físico. Soporte automático para opacidad (`rgb(var(...) / <alpha>)`). Contraste garantizado por diseño (Modo Oscuro con acento cian acuático `#4fd8ec` y Modo Claro con cian profundo `#006876` cumpliendo WCAG AA > 4.5:1).
   - *Desventajas*: Requiere refactorizar los componentes existentes para sustituir clases `slate-*` rígidas por los tokens semánticos correspondientes.

## Decisión Adoptada
Se adopta la **Alternativa 3**. Se define una paleta de Tokens Semánticos en `:root` y `.dark` dentro de `src/index.css`, extendida en `tailwind.config.js`:
- **Superficies**: `surface`, `surface-container`, `surface-container-high`.
- **Textos y contrastes**: `on-surface`, `on-surface-variant`.
- **Bordes y divisores**: `outline`, `outline-variant`.
- **Acento Primario Acuático MD3**: `#006876` en claro y `#4fd8ec` en oscuro.
- **Acentos de estado**: `status-emerald`, `status-amber`, `status-rose`, `status-cyan`, `status-indigo`.
- **Anti-flicker**: Script síncrono en `<head>` de `index.html` sincronizado con `useTheme.ts`.

## Consecuencias y Trade-offs
- Se erradican por completo los overrides `html:not(.dark)` en `src/index.css`.
- Los componentes de layout, insignias y vistas se vuelven 100% agnósticos al modo activo, reaccionando automáticamente al cambiar la clase `.dark` en el elemento raíz.
- Se asegura la legibilidad de controles nativos (`<select>` y `<option>`) y gráficos SVG de Recharts en ambos modos sin depender de reglas frágiles.

