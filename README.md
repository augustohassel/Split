# Split — Marcas, Parciales (*Splits*) y Puntos FINA

**Split** es una Progressive Web App (PWA) *mobile-first* y *offline-first* diseñada para que los nadadores puedan registrar, analizar y seguir la evolución de sus tiempos y parciales (*splits*) en todas las **18 pruebas oficiales de natación de pileta**, calcular automáticamente sus **Puntos FINA (World Aquatics)** según su perfil y medir la brecha frente a sus objetivos.

---

## Características Principales (`v0.1.0`)

- **Catálogo de 18 Pruebas Oficiales**:
  - *Mariposa, Espalda y Pecho*: `50m`, `100m`, `200m`.
  - *Libre (Crol)*: `50m`, `100m`, `200m`, `400m`, `800m`, `1500m`.
  - *Combinado Individual (Medley)*: `100m` (exclusivo pileta de `25m`), `200m`, `400m`.
- **Parciales Acumulados (*Splits*) y Métricas Técnicas**:
  - Puntos de corte de `15m`, `25m`, `35m` y `50m` en pruebas de velocidad (`50m`).
  - Cortes dinámicos cada `25m`/`50m` (con paso opcional por `15m`) en `100m` y `200m`, y cada `50m`/`100m` en fondo (`400m` a `1500m`).
  - Conteo opcional de brazadas (*Stroke Count*) y ondas subacuáticas por tramo.
- **Récords Personales Separados (`PB Carrera` vs. `PB Entrenamiento`)**:
  - Priorización del **PB Oficial de Carrera** (con largada estática: *Individual* o *1er Relevo de Posta*) y seguimiento paralelo del **PB de Entrenamiento**.
- **Motor Offline de Puntos FINA (World Aquatics)**:
  - Tablas embebidas de Tiempos Base para pileta corta (`25m` SCM) y pileta larga (`50m` LCM) en ramas *Hombre* y *Mujer* ($P = \lfloor 1000 \times (B / T)^3 \rfloor$).
- **Objetivos, Evolución y Privacidad 100% Local**:
  - Persistencia en el dispositivo mediante IndexedDB (`Dexie.js`), gráficos interactivos en `Recharts` y respaldo/restauración en **JSON** y **CSV**.

---

## Comandos de Desarrollo

```bash
npm install      # Instalar dependencias
npm run dev      # Iniciar servidor local en http://localhost:5173
npm run lint     # Ejecutar análisis estático con ESLint
npm test         # Ejecutar pruebas unitarias con Vitest
npm run build    # Compilar TypeScript y generar bundle PWA de producción
```

## Documentación

- [Glosario de Dominio (`docs/glosario.md`)](docs/glosario.md)
- [Decisiones de Arquitectura (`docs/decisiones/`)](docs/decisiones/README.md)