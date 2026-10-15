# Registro de Decisiones de Arquitectura (ADR)

Este directorio almacena las decisiones técnicas y arquitectónicas de **Split** que cumplan con los tres criterios de registro:
1. **Difícil de revertir**: Cambiarla a futuro implica un costo o refactor significativo.
2. **Sorprende sin contexto**: Un nuevo colaborador o agente no entendería el porqué sin conocer el trasfondo histórico.
3. **Surge de elegir entre alternativas reales**: Existieron al menos dos caminos viables y se optó por uno fundamentado.

## Índice de Decisiones
- [0001: Arquitectura Base Offline-First y Stack Tecnológico (Basado en RatingsApp)](0001-arquitectura-base-offline-first.md)
- [0002: Aislamiento de Origin y Subdominios Dedicados para PWA Offline](0002-aislamiento-origin-subdominios-pwa.md)
- [0003: Infraestructura de Testing de Componentes UI y Cobertura Automatizada](0003-infraestructura-testing-componentes-y-cobertura.md)
- [0004: Arquitectura Conversacional, Parser Offline, BYOK y Dictado por Voz](0004-arquitectura-conversacional-byok-y-dictado-por-voz.md)

## Plantilla de Decisión (ADR Ligero)

```markdown
# [Número o Identificador]: [Título de la Decisión]

- **Fecha**: YYYY-MM-DD
- **Estado**: Aceptada | Propuesta | Reemplazada

## Contexto y Problema
Descripción breve de la necesidad o restricción técnica que motivó la decisión.

## Alternativas Evaluadas
1. **Alternativa A**: Ventajas y desventajas.
2. **Alternativa B**: Ventajas y desventajas.

## Decisión Adoptada
Qué alternativa se eligió y la justificación técnica de la elección.

## Consecuencias y Trade-offs
Impacto esperado, limitaciones aceptadas y pasos a seguir.
```

