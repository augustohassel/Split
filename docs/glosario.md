# Glosario de Dominio — Split

Este documento registra la jerga, entidades de negocio y conceptos funcionales de **Split** para mantener alineado el lenguaje del proyecto.

---

### Prueba (Carrera de Natación)

- **Definición**: Combinación de estilo (*Mariposa*, *Espalda*, *Pecho*, *Libre/Crol* y *Combinado Individual/Medley*) y distancia oficial de pileta (`50m`, `100m`, `200m`, `400m`, `800m`, `1500m`, incluyendo `100m Combinado` en pileta de 25m).
- **Alcance / Propósito**: Clasifica cada marca y objetivo dentro del catálogo completo de pruebas de natación de pileta, determinando los puntos de corte de sus parciales y el tiempo base para el cálculo de Puntos FINA.

### Perfil del Nadador

- **Definición**: Configuración personal del usuario que incluye su género deportivo (*Hombre* o *Mujer*) y datos básicos (nombre, fecha de nacimiento/categoría).
- **Alcance / Propósito**: Permite parametrizar las tablas de tiempos base oficiales para el cálculo de Puntos FINA y personalizar el seguimiento de récords personales (*PB*).

### Marca (Registro de Tiempo)

- **Definición**: Tiempo total obtenido por el nadador en una Prueba determinada, vinculado a una fecha, pileta, tamaño de pileta, contexto, modalidad, sensación y comentarios opcionales.
- **Alcance / Propósito**: Es la entidad central del sistema sobre la cual se registran los parciales, se calculan los Puntos FINA, se compara contra los objetivos y se construye la serie histórica de evolución.

### Parcial (Split)

- **Definición**: Tiempo intermedio acumulado desde la largada al alcanzar una distancia específica dentro de una prueba (por ejemplo, `15m`, `25m`, `35m` en pruebas de 50m, o cada `25m`/`50m` en pruebas de 100m a 1500m), a partir del cual se calcula automáticamente el tiempo de cada tramo.
- **Alcance / Propósito**: Permite descomponer una marca total para evaluar el desempeño en distintas fases de la carrera (salida/subacuático, ritmo de pasaje por vuelta, virajes y cierre).
- **Lo que NO es**: No es una prueba independiente aislada ni un campo obligatorio, sino un punto de control opcional asociado a una Marca.

### Puntos FINA (World Aquatics Points)

- **Definición**: Sistema de puntuación oficial de World Aquatics (ex FINA) que asigna un puntaje a cada marca según la fórmula $P = \lfloor 1000 \times (B / T)^3 \rfloor$, donde $T$ es el tiempo del nadador y $B$ es el tiempo base oficial para esa prueba, género (*Hombre*/*Mujer*) y tamaño de pileta (`25m`/`50m`).
- **Alcance / Propósito**: Permite medir el valor relativo de una marca y comparar el rendimiento del nadador entre distintas pruebas y estilos (por ejemplo, saber si su marca en 50m Mariposa equivale a un mayor nivel que su marca en 100m Libre).

### Sensación y Comentario

- **Definición**: Valoración subjetiva del nadador sobre cómo se sintió en el agua durante la marca (escala de sensación física/técnica) acompañada de una nota de texto libre.
- **Alcance / Propósito**: Aporta contexto cualitativo al dato numérico (ej. fatiga acumulada, ajuste en la frecuencia de brazada, error en el viraje o clavada en la llegada) para enriquecer el análisis posterior.

### Contexto de Prueba (Carrera vs. Entrenamiento)

- **Definición**: Condición bajo la cual se tomó el tiempo, diferenciando entre una competencia/torneo (_Carrera_) y una sesión de práctica (_Entrenamiento_).
- **Alcance / Propósito**: Permite segmentar y comparar marcas obtenidas en condiciones de exigencia, toma de tiempos y descanso equivalentes.

### Modalidad (Individual vs. Posta)

- **Definición**: Indica si la prueba se nadó de forma individual o como integrante de un equipo de relevos (_Posta_), distinguiendo en esta última entre _1er Relevo_ (largada estática desde el cubo con señal oficial) y _Relevo Lanzado_ (2° al 4° relevo, con partida en movimiento).
- **Alcance / Propósito**: Diferenciar las marcas válidas para récords individuales y Puntos FINA oficiales (Individual y 1er Relevo) de aquellas beneficiadas por la transición lanzada de un relevo (~0.5s a 0.7s más rápidas).

### Tipo de Cronometraje (Electrónico vs. Manual)

- **Definición**: Método con el que se registró el tiempo de la marca, diferenciando entre _Electrónico / Placa de toque_ (oficial de torneo) y _Manual / Cronómetro de mano_.
- **Alcance / Propósito**: Precisar el análisis de centésimas, especialmente en pruebas de velocidad (50m y 100m), contemplando el desfase habitual entre la toma manual y el toque electrónico.

### Métricas Técnicas (Conteo de Brazadas y Ondas Subacuáticas)

- **Definición**: Datos técnicos opcionales registrados por tramo o largo de pileta, tales como la cantidad de ciclos/brazadas (*Stroke Count*) y el número de patadas de delfín en la fase subacuática.
- **Alcance / Propósito**: Relacionar la variación de los tiempos parciales con la eficiencia biomecánica de nado y de salida/viraje.

### Pileta y Tamaño de Pileta

- **Definición**: Lugar físico o club donde se realizó la marca y la longitud del natatorio (habitualmente 25 metros para pileta corta o 50 metros para pileta larga/olímpica).
- **Alcance / Propósito**: Contextualizar y agrupar las marcas, dado que la longitud de la pileta altera la cantidad de vueltas (virajes), tramos subacuáticos y las tablas de tiempos base de Puntos FINA.

### Récord Personal (PB / Personal Best)

- **Definición**: Mejor marca histórica (menor tiempo) registrada por el nadador para una combinación específica de prueba y tamaño de pileta (`25m` o `50m`) con largada estática (`Individual` o `Posta - 1er Relevo`), separada según el contexto en **PB de Carrera** (marca principal y prioritaria de torneo) y **PB de Entrenamiento** (mejor marca lograda en práctica).
- **Alcance / Propósito**: El **PB de Carrera** actúa como el hito principal de referencia para el ranking de Puntos FINA, récords oficiales del nadador y cálculo prioritario de brecha frente a sus Objetivos, mientras que el **PB de Entrenamiento** se monitorea de forma independiente para evaluar el rendimiento en sesiones de práctica sin mezclar condiciones de competencia.

### Objetivo (Meta)

- **Definición**: Tiempo meta que el nadador se propone alcanzar en una prueba y tamaño de pileta específicos, tanto para el tiempo total como opcionalmente para sus parciales.
- **Alcance / Propósito**: Funciona como línea de referencia para calcular la brecha actual (cuántas centésimas o segundos faltan para alcanzarlo) y medir el grado de avance a lo largo del tiempo.

### Interfaz Conversacional (Chat)

- **Definición**: Canal de interacción mediante texto en lenguaje natural y voz integrado en la aplicación para registrar marcas de natación o definir objetivos asistidos.
- **Alcance / Propósito**: Reducir la fricción de entrada de datos ofreciendo un diálogo guiado y un parser offline rápido, complementando la interfaz tradicional de formularios.
- **Lo que NO es**: No es un bot social generalista ni de soporte técnico externo; es un asistente especializado en el registro y análisis de natación del usuario.

### Parser Local Offline (Comandos Rápidos)

- **Definición**: Mecanismo de interpretación local basado en expresiones regulares y reglas determinísticas que extrae estilo, distancia, tiempo, pileta, contexto y notas a partir de frases cotidianas (ej. *«50 libre 26.40 en 25m»* o *«meta 100 mariposa sub 55»*).
- **Alcance / Propósito**: Asentar marcas y objetivos de forma inmediata sin conexión a internet ni consumo de tokens de IA.
- **Lo que NO es**: No requiere modelos de lenguaje en la nube para interpretar sintaxis directas de tiempo y prueba.

### Tarjeta de Borrador (Draft Card)

- **Definición**: Componente interactivo renderizado en el hilo de conversación (`DraftMarkCard` y `DraftGoalCard`) que presenta los datos extraídos (prueba, pileta, tiempo, Puntos FINA en vivo y comparativa con el PB) antes de guardarse en la base de datos local.
- **Alcance / Propósito**: Otorgar control total al nadador para verificar o ajustar campos antes de confirmar el registro en IndexedDB.
- **Lo que NO es**: No impacta en el historial de marcas ni en los récords hasta presionar el botón de confirmación.

### Dictado por Voz Nativo (Web Speech API)

- **Definición**: Funcionalidad de transcripción de voz a texto en tiempo real operada directamente en el navegador del dispositivo, sin envío de audio a servidores externos.
- **Alcance / Propósito**: Permitir al nadador registrar marcas y sensaciones con las manos libres al salir del agua.
- **Lo que NO es**: No requiere servicios de transcripción en la nube ni API Keys.

### BYOK (Bring Your Own Key)

- **Definición**: Modelo de configuración donde el usuario ingresa su propia clave de API de un proveedor de IA (ej. Google Gemini, OpenAI o endpoint local tipo Ollama) para procesar conversaciones guiadas.
- **Alcance / Propósito**: Preservar la arquitectura Zero-Backend y la privacidad total, garantizando que los datos viajen directamente entre el dispositivo del usuario y el proveedor elegido sin servidores intermediarios.
- **Lo que NO es**: No almacena credenciales en ningún servidor central ni comparte claves entre dispositivos.

