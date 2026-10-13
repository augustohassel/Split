# 0001: Arquitectura Base Offline-First y Stack Tecnológico (Basado en RatingsApp)

- **Fecha**: 2026-10-13
- **Estado**: Aceptada

## Contexto y Problema
**Split** requiere ser una aplicación rápida, instalable en dispositivos móviles (*mobile-first*) y plenamente funcional en natatorios o clubes donde la conectividad a internet suele ser limitada o nula. Además, se busca mantener consistencia tecnológica y operativa con el ecosistema del autor (**`RatingsApp`**) sin incurrir en costos ni mantenimiento de servidores backend para la versión inicial `0.1.0`.

## Alternativas Evaluadas
1. **Arquitectura Zero-Backend / Offline-First PWA con IndexedDB (Dexie.js) — Base `RatingsApp`**:
   - *Ventajas*: Privacidad total de los datos en el dispositivo, latencia cero al cargar marcas/parciales y calcular Puntos FINA (tablas de tiempos base embebidas), instalación nativa como PWA en iOS/Android, y reutilización directa del stack probado en `RatingsApp` (React 18, TypeScript, Vite 6, Tailwind CSS 3, Dexie.js, Recharts, Vitest y despliegue en GitHub Pages).
   - *Desventajas*: Los datos residen en el dispositivo local, por lo que requiere ofrecer funciones de exportación e importación (JSON/CSV) para respaldo y migración entre dispositivos.
2. **Aplicación Cliente-Servidor con Backend / Base de Datos en la Nube**:
   - *Ventajas*: Sincronización multi-dispositivo automática mediante cuentas de usuario.
   - *Desventajas*: Mayor complejidad de infraestructura, necesidad de autenticación, dependencia de conexión a internet o lógica compleja de sincronización offline/online.
3. **SPA con `localStorage` plano**:
   - *Ventajas*: Implementación trivial sin librerías de base de datos.
   - *Desventajas*: Límite de almacenamiento reducido, consultas e indexación ineficientes para filtrar series históricas por prueba, pileta, contexto y modalidad.

## Decisión Adoptada
Se adopta la **Alternativa 1 (Arquitectura Zero-Backend / Offline-First PWA basada en `RatingsApp`)**, utilizando:
- **Runtime & Bundler**: Node.js 20 LTS + Vite 6 + TypeScript (Strict mode).
- **UI & Estilos**: React 18 + Tailwind CSS 3 + `lucide-react` + `canvas-confetti`.
- **Persistencia Local**: IndexedDB mediante `dexie` y `dexie-react-hooks`, complementada con exportación e importación en formatos JSON y CSV.
- **Visualización**: `recharts` para curvas de evolución de tiempos, parciales y brecha hacia objetivos.
- **PWA**: `vite-plugin-pwa` con Service Worker y manifiesto standalone, embebiendo las tablas oficiales de Tiempos Base de World Aquatics (FINA) para cálculo 100% offline.
- **Testing**: `vitest` para pruebas unitarias de motores de cálculo (parciales, Puntos FINA, detección de PB y brechas de objetivos).

## Consecuencias y Trade-offs
- El proyecto se inicializa y estructura siguiendo la convención modular de `RatingsApp` (`src/types`, `src/utils`, `src/db`, `src/components`, `src/features`).
- Se incluye desde la versión `0.1.0` un módulo de Respaldo y Restauración (JSON/CSV) en la sección de Ajustes para garantizar la portabilidad de los datos del nadador.

