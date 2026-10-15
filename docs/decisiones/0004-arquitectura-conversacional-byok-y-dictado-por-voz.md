# 0004: Arquitectura Conversacional, Parser Offline, BYOK y Dictado por Voz

- **Fecha**: 2026-10-15
- **Estado**: Aceptada

## Contexto y Problema
Split nació con un flujo de entrada de datos puramente basado en formularios tradicionales táctiles. Para reducir la fricción en el registro inmediato tras entrenamientos o competencias y habilitar la definición ágil de marcas y metas, se requería incorporar una interfaz conversacional inteligente accesible por texto y voz manos libres.

El desafío principal consistía en agregar estas capacidades de comprensión en lenguaje natural sin violar los pilares fundacionales de la aplicación:
1. **Soberanía y Privacidad Absoluta (Zero-Backend)**: Ninguna marca, objetivo o conversación íntima del nadador debe transitar ni almacenarse en servidores centrales propios.
2. **Capacidad 100% Offline-First**: Las funciones esenciales, como asentar una marca rápida o un objetivo al salir de la pileta, deben operar sin requerir conexión a internet ni consumo de créditos de IA.
3. **Control Total del Nadador**: El sistema nunca debe persistir registros en IndexedDB de forma ciega; toda inferencia debe revisarse y confirmarse en el dispositivo.

## Alternativas Evaluadas

1. **Alternativa A: Backend Proxy con API Keys en la Nube y Base de Datos Central**:
   - *Ventajas*: Oculta las claves de IA y permite centralizar el logging.
   - *Desventajas*: Viola la arquitectura Zero-Backend y Offline-First de Split, expone datos personales de rendimiento a servidores ajenos y genera costos operativos mensuales recurrentes.
2. **Alternativa B: Solo Parser Determinístico por Regex (sin IA generativa)**:
   - *Ventajas*: 100% offline y de complejidad reducida.
   - *Desventajas*: No permite un diálogo reflexivo sobre sensaciones complejas en el agua, recomendaciones técnicas de pasaje ni extracción semántica de relatos informales o verbales.
3. **Alternativa C: Arquitectura Híbrida: Parser Offline Local + BYOK Cliente-a-Servicio + Tarjetas de Borrador (Draft Cards) + Web Speech API**:
   - *Ventajas*: Combina un parser local inmediato por regex para comandos rápidos cotidianos (sin red ni consumo de tokens) con un cliente HTTP directo desde el navegador hacia proveedores de IA (Google Gemini, OpenAI o endpoints locales compatibles como Ollama). Las marcas y objetivos inferidos se presentan como tarjetas interactivas con cálculo de Puntos FINA en vivo antes de confirmarse en IndexedDB.
   - *Desventajas*: Requiere que el usuario ingrese su propia API Key si desea utilizar el asistente guiado avanzado.

## Decisión Adoptada
Se adopta la **Alternativa C**:
1. **Parser Local Determinístico**: Reconoce expresiones de marcas (ej. *«50 libre 26.40 en 25m»*, *«entrenamiento 200 pecho 2:25.80»*) y objetivos (ej. *«objetivo 100 libre 54.50 en 50m»*) de forma instantánea y offline, admitiendo tiempos en `mm:ss.cc` o `ss.cc`.
2. **Dictado por Voz Nativo con Web Speech API**: Integrado directamente en el cliente mediante el hook `useSpeechRecognition`, clasificando fragmentos `isFinal` y `interim` para prevenir duplicación y repetición de palabras habladas (resolución de RatingsApp #13).
3. **BYOK (Bring Your Own Key)**: Configuración en *Ajustes* y en el Chat donde las credenciales se almacenan exclusivamente en `localStorage`. Se provee soporte para Google Gemini y OpenAI / endpoints locales tipo Ollama.
4. **Optimización de Tokens y Modularización**: Se desacopla el System Prompt en `src/services/prompts/swimSystemPrompt.ts` (resolución de RatingsApp #16) y se aplica una ventana deslizante (*Sliding Window*) que limita los mensajes enviados al LLM para optimizar consumo y latencia.
5. **Tarjetas de Borrador Interactivas (`DraftMarkCard` y `DraftGoalCard`)**: Previsualización interactiva con cálculo de Puntos FINA en vivo y comparativa con el PB antes de presionar *«Confirmar y Guardar»* en IndexedDB.
6. **Navegación Ergonómica**: Pestaña `Chat` integrada en `BottomNav` (5 botones) y acceso rápido en el `Header`.

## Consecuencias y Trade-offs
- **Positivas**: Cero costos de infraestructura central, máxima privacidad, disponibilidad de registro rápido aún sin conexión a internet ni consumo de tokens, y dictado manos libres para el nadador.
- **Limitaciones**: Para el diálogo reflexivo profundo con IA, el nadador debe contar con conexión a internet y una API Key de Gemini / OpenAI (o ejecutar Ollama localmente en su máquina).

