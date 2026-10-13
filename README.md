# Split 🏊‍♂️⏱️

> **Aplicación Mobile-First y Offline-First (PWA) para nadadores: registro de marcas, parciales (_splits_), Puntos FINA y evolución hacia tus objetivos con 100% privacidad local.**

**Split** está pensada para usarse directamente desde el celular en el borde de la pileta o después de cada torneo. Te permite registrar tus tiempos totales y parciales intermedios en las **18 pruebas oficiales de natación**, calcular al instante tus **Puntos FINA (World Aquatics)** y analizar en qué tramo de la carrera (`0-15m`, `15-25m`, `25-35m`, `35-50m` o vueltas de `25m`/`50m`) estás ganando o perdiendo centésimas.

---

## 👋 Guía Rápida: ¿Cómo empezar a usar Split por primera vez?

Si recién abrís la aplicación por primera vez, seguí estos **4 pasos en menos de un minuto**:

### Paso 1: Configurá tu Perfil FINA (Hombre / Mujer y Pileta habitual)

1. Tocá el botón con tu nombre arriba a la derecha (o andá a **Objetivos → Perfil FINA**).
2. Elegí tu **Género Deportivo (_Hombre_ o _Mujer_)** y tu **Pileta Habitual (`25m` Corta o `50m` Olímpica)**. Esto ajusta automáticamente las tablas oficiales de _World Aquatics_ para tus Puntos FINA.
3. Marcá con una estrella ⭐ tus **Pruebas Favoritas** (_50m Mariposa_ ya viene preseleccionada por defecto) y tocá **Guardar**.

> 💡 _¿Querés chusmear los gráficos y tablas antes de cargar tus tiempos reales?_
> En la pantalla de inicio (**Dashboard**) o en **Objetivos → Datos** podés tocar **"Cargar datos de demostración"** para explorar la app con marcas de ejemplo y luego limpiarlas con un clic desde **"Borrar marcas y objetivos"**.

### Paso 2: Registrá tu primera Marca (con o sin Parciales)

1. Tocá **Registrar** en la barra inferior.
2. Elegí la prueba (ej. _50m Mariposa_) y escribí tu **Tiempo Total** (podés escribir `26.45`, `26,45` o `1:02.40`). Verás calcularse en vivo tus **Puntos FINA** y si lograste un nuevo récord personal (`PB`).
3. Elegí si fue en **🏆 Carrera / Torneo** o en **🏊 Entrenamiento**, y si el tiempo fue **Electrónico** o **Manual**.
4. _(Opcional)_ Cargá los **Parciales Acumulados** (en `50m`: tu paso a los `15m`, `25m`, `35m` y `50m`; en distancias mayores: cada `25m`, `50m` o `100m`). La app calcula sola cuánto tardaste en cada tramo y te permite anotar **brazadas y ondas subacuáticas**.
5. Elegí tu **Sensación en el agua (1 a 5)**, agregá cualquier nota técnica y tocá **Registrar Marca**.

### Paso 3: Definí tus Objetivos (`25m` y `50m`)

1. Andá a la pestaña **Objetivos**.
2. Elegí la prueba, el tamaño de pileta (`25m` o `50m`) y el **Tiempo Meta** al que apuntás.
3. La app te mostrará cuántas centésimas o segundos te faltan desde tu **PB de Carrera** y desde tu **PB de Entrenamiento**, además de cuántos Puntos FINA equivale esa meta.

### Paso 4: Analizá tu Evolución y Compará tus Parciales

1. Andá a la pestaña **Evolución**.
2. Mirá la **Curva de Tiempo Total** a lo largo de la temporada (con tu objetivo marcado como línea meta) o cambiá a **Tramos Parciales** para comparar en barras tu `PB de Carrera` vs. tu `PB de Entrenamiento` vs. tu `Objetivo`.

---

## ✨ Características Principales

- **🏊 Catálogo Completo (18 Pruebas Oficiales)**:
  - _Mariposa, Espalda y Pecho_: `50m`, `100m`, `200m`.
  - _Libre (Crol)_: `50m`, `100m`, `200m`, `400m`, `800m`, `1500m`.
  - _Combinado Individual (Medley)_: `100m` (exclusivo pileta de `25m`), `200m`, `400m`.
- **⏱️ Grilla Inteligente de Parciales (_Splits_) y Métricas**:
  - En pruebas de `50m`: cortes específicos de velocidad en **`15m`, `25m`, `35m` y `50m`** (desglosando salida/subacuático `0-15m`, nado `15-25m`, viraje/paso `25-35m` y cierre `35-50m`).
  - En `100m` y `200m`: cortes cada `25m` o `50m` + paso opcional por `15m`.
  - En `400m`, `800m` y `1500m`: cortes cada `50m` o `100m`.
  - Registro opcional de **conteo de brazadas (_Stroke Count_)** y **ondas subacuáticas** por tramo.
- **🏆 Separación de `PB de Carrera` y `PB de Entrenamiento`**:
  - Distingue tu **PB Oficial de Carrera** (el más importante y prioritario para rankings y objetivos) de tu **PB de Entrenamiento**, excluyendo automáticamente relevos lanzados (2° a 4° relevo de posta) para no distorsionar tus récords de largada estática.
- **🌍 Motor Offline de Puntos FINA (World Aquatics)**:
  - Tablas embebidas de Tiempos Base oficiales para pileta corta (`25m` SCM) y larga (`50m` LCM) en ramas _Hombre_ y _Mujer_, y ranking personal de pruebas para comparar qué estilo/distancia es tu punto más alto.
- **🔒 100% Privada, Offline y Portátil**:
  - Funciona sin internet en cualquier natatorio. Tus datos se guardan en tu propio dispositivo (`IndexedDB`) y podés exportarlos/importarlos en **JSON** o **CSV** (Excel / Google Sheets).

---

## 📐 Fórmula Oficial de Puntos FINA

El cálculo implementado sigue la fórmula oficial de _World Aquatics_:

$$P = \left\lfloor 1000 \times \left(\frac{B}{T}\right)^3 \right\rfloor$$

- $T$: Tiempo del nadador en segundos.
- $B$: Tiempo Base oficial vigente de _World Aquatics_ para esa prueba, género (_Hombre_ / _Mujer_) y tamaño de pileta (`25m` o `50m`).

---

## 📱 Instalación en el Celular y Manual Detallado

- 👉 **[Guía de Instalación Mobile en iPhone / Android y Respaldos (`docs/INSTALACION_MOBILE.md`)](./docs/INSTALACION_MOBILE.md)**
- 👉 **[Manual de Usuario Paso a Paso (`docs/GUIA_DE_USO.md`)](./docs/GUIA_DE_USO.md)**
- 👉 **[Glosario de Dominio de Natación (`docs/glosario.md`)](./docs/glosario.md)**
- 👉 **[Decisiones de Arquitectura (`docs/decisiones/`)](./docs/decisiones/README.md)**

---

## 🛠️ Stack Tecnológico y Desarrollo Local

- **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite 6](https://vitejs.dev/)
- **Estilos**: [Tailwind CSS 3](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
- **Persistencia Local**: [Dexie.js](https://dexie.org/) (IndexedDB)
- **Gráficos**: [Recharts](https://recharts.org/)
- **PWA**: [Vite Plugin PWA](https://vite-pwa-org.netlify.app/)
- **Calidad y Testing**: [ESLint](https://eslint.org/) + [Vitest](https://vitest.dev/)

### Comandos Habituales (Dev Container Node 20)

```bash
npm install      # Instalar dependencias
npm run dev      # Iniciar servidor de desarrollo en http://localhost:5173
npm run lint     # Ejecutar análisis estático con ESLint
npm test         # Ejecutar pruebas unitarias de motores de cálculo con Vitest
npm run build    # Compilar TypeScript y empaquetar versión de producción PWA
```

### Flujo de Despliegue y Versionado (`CI/CD`)

- Cada push o merge sobre `dev` y `master` ejecuta automáticamente `npm ci`, `npm run lint`, `npm test` y `npm run build` en GitHub Actions ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)).
- Al fusionar hacia `master`, el workflow despliega la PWA en GitHub Pages (`https://split.hasselpunk.com`) y publica automáticamente el **Tag y Release SemVer** correspondiente a la versión de `package.json`.
