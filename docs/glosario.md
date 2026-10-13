# Glosario de Dominio — Split

Este documento registra la jerga, entidades de negocio y conceptos funcionales de **Split** para mantener alineado el lenguaje del proyecto.

---

### Marca (Registro de Tiempo)

- **Definición**: Tiempo total obtenido por el nadador en una prueba determinada (ej. 50 metros mariposa), vinculado a una fecha, pileta, tamaño de pileta, contexto y modalidad.
- **Alcance / Propósito**: Es la entidad central del sistema sobre la cual se registran los parciales, se compara contra los objetivos y se construye la serie histórica de evolución.

### Parcial (Split)

- **Definición**: Tiempo intermedio registrado al alcanzar una distancia específica dentro de una prueba (por ejemplo, a los 15m, 25m o 35m dentro de los 50m mariposa).
- **Alcance / Propósito**: Permite descomponer una marca total para evaluar el desempeño en distintas fases de la carrera (salida/subacuático a 15m, paso por los 25m, transición/cierre a 35m y llegada a 50m).
- **Lo que NO es**: No es una prueba independiente aislada, sino un punto de control asociado a una Marca.

### Contexto de Prueba (Carrera vs. Entrenamiento)

- **Definición**: Condición bajo la cual se tomó el tiempo, diferenciando entre una competencia/torneo (_Carrera_) y una sesión de práctica (_Entrenamiento_).
- **Alcance / Propósito**: Permite segmentar y comparar marcas obtenidas en condiciones de exigencia, toma de tiempos y descanso equivalentes.

### Modalidad (Individual vs. Posta)

- **Definición**: Indica si la prueba se nadó de forma individual o como integrante de un equipo de relevos (_Posta_).
- **Alcance / Propósito**: Distinguir tiempos que pueden verse influidos por el tipo de largada (partida estática con señal en pruebas individuales o primer relevo vs. partida lanzada en relevos siguientes de una posta).

### Pileta y Tamaño de Pileta

- **Definición**: Lugar físico o club donde se realizó la marca y la longitud del natatorio (habitualmente 25 metros para pileta corta o 50 metros para pileta larga/olímpica).
- **Alcance / Propósito**: Contextualizar y agrupar las marcas, dado que la longitud de la pileta altera la cantidad de vueltas (virajes) y tramos subacuáticos, afectando directamente los tiempos finales y parciales.

### Objetivo (Meta)

- **Definición**: Tiempo meta que el nadador se propone alcanzar en una prueba completa o en parciales específicos.
- **Alcance / Propósito**: Funciona como línea de referencia para calcular la brecha actual (cuántas centésimas o segundos faltan para alcanzarlo) y medir el grado de avance a lo largo del tiempo.
