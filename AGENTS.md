# Guía para Agentes de IA — Split

## 1. Propósito y Visión del Proyecto
**Split** es una aplicación para nadadores diseñada para registrar, analizar y seguir la evolución de tiempos y parciales (*splits*), con foco inicial en la prueba de **50 metros mariposa**.

Funcionalidades principales:
- **Registro de marcas**: Fecha, pileta/sede, tamaño de pileta (ej. 25m o 50m), contexto (*carrera* o *entrenamiento*) y modalidad (*individual* o *posta*).
- **Parciales (*Splits*)**: Carga y análisis de tiempos intermedios en puntos clave de la prueba (15m, 25m, 35m, etc.).
- **Objetivos y Evolución**: Definición de tiempos objetivo, visualización de la brecha actual (qué tan cerca/lejos se está de la meta) y gráficos/historial de evolución a lo largo del tiempo.

*(Ver definiciones de dominio detalladas en [`docs/glosario.md`](docs/glosario.md))*.

## 2. Principios No Negociables
- **Validación Local Primero**: Todo cambio debe compilar y pasar las validaciones locales (linter, typecheck, tests y build) antes de dar por completada una tarea.
- **Respeto a la Privacidad**: Prohibido incluir credenciales, secretos, tokens o datos sensibles en código, issues o commits.
- **Documentación Viva**:
  - Registrar términos del dominio y entidades en [`docs/glosario.md`](docs/glosario.md) en el momento en que se definan o aclaren.
  - Documentar decisiones arquitectónicas difíciles de revertir (formato ADR ligero) en `docs/decisiones/`.

## 3. Entorno y Stack Tecnológico
- **Entorno Oficial**: Dev Container con Node.js 20 (`mcr.microsoft.com/devcontainers/javascript-node:20-bookworm`), ruta `/workspaces/Split`.
- **Bundler / Dev Server**: Vite (puerto `5173`).
- **Lenguaje y Estilos**: TypeScript + Tailwind CSS.
- **Calidad de Código**: ESLint y Prettier (formateo automático al guardar configurado en el entorno).

## 4. Comandos Habituales
*(Se activarán al inicializar `package.json`)*:
- `npm install`: Instalación de dependencias.
- `npm run dev`: Servidor de desarrollo local (Vite en puerto `5173`).
- `npm run build`: Compilación y empaquetado de producción.
- `npm run lint`: Análisis estático de código con ESLint.
- `npm test`: Ejecución de pruebas automatizadas.

## 5. Flujo de Trabajo y Control de Versiones (Git)
1. **Prohibido `git push` automático**: Nunca ejecutar `git push` sin autorización explícita y previa del usuario.
2. **Rama base de desarrollo**: `dev`.
3. **Estrategia de ramas por Issue**:
   - Todo cambio se desarrolla en una rama `issue/<n>` creada **siempre a partir de `dev`**:
     `git checkout dev && git pull origin dev && git checkout -b issue/<n>`
   - Nunca crear ramas de trabajo a partir de `master` ni de otras ramas.
4. **Integración y Promoción**:
   - Los Pull Requests de tareas (`issue/<n>`) se dirigen hacia `dev`. Al fusionarse, la rama `issue/<n>` se elimina.
   - La promoción a producción se realiza mediante Pull Request desde `dev` hacia `master`.
5. **Commits**: Mensajes claros y atómicos siguiendo *Conventional Commits* (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).

