# 0003: Infraestructura de Testing de Componentes UI y Cobertura Automatizada

- **Fecha**: 2026-10-15
- **Estado**: Aceptada

## Contexto y Problema
En versiones tempranas de **Split**, las pruebas automatizadas se limitaban a tests unitarios de funciones puras ([`calculator.ts`](file:///workspaces/Split/src/utils/calculator.ts)) y a métodos de almacenamiento ([`storage.test.ts`](file:///workspaces/Split/src/db/storage.test.ts)). Esto dejaba el 100% de la interfaz de usuario (más de 3.900 líneas de código en vistas React) sin validación automatizada. Como consecuencia, surgieron incidentes donde la interacción con los formularios en dispositivos móviles bloqueaba la persistencia o no guardaba adecuadamente los parciales y marcas.

Se requería incorporar una suite integral de testing de componentes e integración que simule la experiencia de usuario en un entorno DOM sin incurrir en la lentitud o complejidad de levantar navegadores reales en cada corrida de desarrollo y CI.

## Alternativas Evaluadas
1. **Vitest + `jsdom` + `@testing-library/react` + `@vitest/coverage-v8`**:
   - *Ventajas*: Máxima velocidad de ejecución en Node.js, integración nativa con la configuración de Vite, renderizado de componentes y simulación de eventos de usuario sin necesidad de browser externo, soporte de matchers de DOM con `@testing-library/jest-dom` y reportes de cobertura en tiempo real con V8.
   - *Desventajas*: No prueba comportamientos de renderizado pixel-perfect de canvas real ni navegación multi-pestaña de navegadores móviles, por lo que requiere mocks ligeros de librerías de canvas (`canvas-confetti`) y contenedores gráficos (`recharts` ResponsiveContainer).
2. **E2E con Playwright / Cypress**:
   - *Ventajas*: Ejecución en navegadores Chromium/WebKit reales.
   - *Desventajas*: Tiempos de ejecución significativamente más lentos en contenedores de desarrollo y workflows de CI, mayor propensión a *flakiness*, e instalación pesada de binarios de navegadores.
3. **Mantener únicamente tests unitarios puros**:
   - *Ventajas*: Cero dependencias adicionales.
   - *Desventajas*: Imposibilidad de detectar regresiones en la interfaz, validaciones de formularios y sincronización reactiva del estado local.

## Decisión Adoptada
Se adopta la **Alternativa 1 (Vitest + JSDOM + React Testing Library + V8 Coverage)**:
- Configuración de entorno `jsdom` en [`vitest.config.ts`](file:///workspaces/Split/vitest.config.ts) con setup global en [`src/test/setup.ts`](file:///workspaces/Split/src/test/setup.ts).
- Incorporación de mocks para `ResizeObserver`, `ResponsiveContainer` de Recharts y `canvas-confetti`.
- Incorporación de tests de componentes e integración para [`RegisterMarkView`](file:///workspaces/Split/src/features/register/RegisterMarkView.tsx), [`GoalsAndSettingsView`](file:///workspaces/Split/src/features/goals/GoalsAndSettingsView.tsx), [`HistoryView`](file:///workspaces/Split/src/features/history/HistoryView.tsx), [`DashboardView`](file:///workspaces/Split/src/features/dashboard/DashboardView.tsx) y [`App`](file:///workspaces/Split/src/App.tsx).
- Inclusión del comando `npm run test:coverage` y ejecución de tests con cobertura en el pipeline de GitHub Actions (`.github/workflows/deploy.yml`).

## Consecuencias y Trade-offs
- La cobertura de código del proyecto aumentó del ~24% a más del 85% de sentencias en todo `src/`.
- Cualquier cambio o refactor en los formularios de guardado, filtros de historial o actualización de perfiles y metas queda protegido contra regresiones antes de desplegar a producción.
