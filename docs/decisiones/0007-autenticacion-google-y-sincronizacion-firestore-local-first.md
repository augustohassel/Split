# 0007: Autenticación con Google OAuth y Sincronización Local-First en Cloud Firestore

- **Fecha**: 2026-11-12
- **Estado**: Aceptada

## Contexto y Problema
Con la infraestructura serverless de Google Cloud Platform aprovisionada mediante Terraform en el Issue #16 (`split-swim-app` con Identity Platform, Cloud Firestore en modo Native y reglas de aislamiento por UID), **Split** necesita permitir al nadador autenticarse con su cuenta de Google y sincronizar sus marcas (`SwimMark`), objetivos (`SwimGoal`), perfil FINA (`SwimmerProfile`) e historial de chat (`ChatMessage[]`) entre múltiples dispositivos, sin degradar la velocidad de respuesta instantánea ni la operación 100% offline en natatorios sin cobertura móvil, y sin exponer jamás su clave privada de IA (BYOK).

## Alternativas Evaluadas
1. **Alternativa A: Reemplazar Dexie por llamadas directas a Cloud Firestore en los componentes React**:
   - *Ventajas*: Un único motor de persistencia cuando hay configuración cloud.
   - *Desventajas*: Rompe el uso de la aplicación en entornos sin variables `VITE_FIREBASE_*` (desarrollo local desconectado, tests unitarios o usuarios que prefieren no iniciar sesión con Google) y acopla las vistas a la API del SDK de Firebase.
2. **Alternativa B: Patrón Repositorio Dual (`ISwimRepository`) con espejo Local-First y Migración Aditiva Idempotente**:
   - *Ventajas*: Abstrae la persistencia mediante `ISwimRepository` con dos implementaciones (`DexieSwimRepository` para operación local y `FirestoreSwimRepository` bajo `/users/{uid}/{profile|marks|goals|chatMessages}`). Preserva el espejo local sincrónico y Dexie en todo momento, activa la caché offline persistente de Firestore (`persistentLocalCache` con fallback a `memoryLocalCache`) y fusiona aditivamente los datos locales previos al iniciar sesión mediante huellas determinísticas (`cloud-migration.service.ts`).
   - *Desventajas*: Requiere mantener la coordinación entre el repositorio activo y el espejo local.

## Decisión Adoptada
Se adopta la **Alternativa B (Patrón Repositorio Dual con Sincronización Local-First y Migración Aditiva)**:
- **Degradación elegante sin variables**: `src/infrastructure/firebase/firebase-client.ts` verifica la presencia de las 4 variables `VITE_FIREBASE_*`; si no están definidas, la aplicación opera de manera transparente en modo `local-only` sobre `DexieSwimRepository` sin errores ni advertencias.
- **Migración aditiva sin pérdida de datos**: Al iniciar sesión con Google (`signInWithPopup`), `src/services/cloud-migration.service.ts` compara las marcas locales por huella (`eventId|poolLength|date|timeSec|context|modality`), los objetivos por clave compuesta (`eventId|poolLength`), el perfil por marca temporal `updatedAt` y los mensajes de chat por `id`, subiendo únicamente los registros nuevos o más recientes hacia `/users/{uid}/...` sin duplicar ni borrar el historial en la nube.
- **Aislamiento estricto de credenciales BYOK**: La clave de API de Gemini/OpenAI (`split_ai_settings_v1`) permanece confinada exclusivamente en el `localStorage` del navegador local y queda excluida por contrato de `ISwimRepository` y de Cloud Firestore.

## Consecuencias y Trade-offs
- **Disponibilidad continua en piletas**: Si el usuario pierde conectividad o recibe un error de permisos (`403 permission-denied`), la interfaz informa el estado de forma no bloqueante y conserva la lectura/escritura inmediata sobre el espejo local y Dexie.
- **Trazabilidad en Firebase Console**: `FirestoreSwimRepository` actualiza el documento raíz `/users/{uid}` con metadatos básicos (`uid`, `updatedAt`) para que el nodo del usuario sea navegable directamente en la consola de Firebase junto con sus 4 subcolecciones (`profile`, `marks`, `goals`, `chatMessages`).
