# RNF-1 — Pruebas de carga

TRD §3, RNF-1: latencia de operaciones CRUD de la API, objetivo p95 < 200ms, verificado
con pruebas de carga contra staging.

**No hay ambiente de staging en Railway** (un solo environment `production` en el
proyecto `Api-ToolBox-JL`, confirmado 2026-09-01 vía Railway MCP `list-services`). El
Arquitecto decidió correr una carga muy conservadora directamente contra producción en
vez de crear un staging nuevo o correr solo local, dado lo cerca que está la
presentación (2026-09-04).

## Cómo correr

```bash
npm install -g artillery   # una sola vez
artillery run apps/api/test/load/rnf1-catalog-search.yml
```

`k6` no se pudo instalar en el entorno de desarrollo (Chocolatey requiere admin) — se
usó Artillery, que el TRD acepta como alternativa equivalente ("k6/Artillery").

## Resultado de la corrida 2026-09-01 (contra producción)

40 requests, 20s, 2 req/s, 0 fallos (100% HTTP 200).

| Métrica | Valor medido | Objetivo RNF-1 |
|---|---|---|
| p95 (resumen completo, incluye cold-start) | 671.9ms | < 200ms |
| p95 (ventana "tibia", sin cold-start) | 497.8ms | < 200ms |
| min | 308ms | — |
| mean | 475ms | — |

**RNF-1 no se cumple**, incluso descontando el cold-start inicial. Confirmado con
métricas de Railway (`get-service-metrics`, 1h): CPU 0.4% actual / 1.45% máx, memoria
~130MB — el servicio NO está saturado de recursos, así que la causa más probable es
latencia de red Railway↔Supabase (posible mismatch de región) o una query sin índice
en `/catalog/search`, no falta de capacidad de cómputo. Pendiente de investigación por
el dueño del módulo backend — no se intentó "arreglar" a ciegas en este sprint.

## Alcance deliberadamente limitado

Este arnés solo pega contra `GET /api/v1/catalog/search` (`security: []`, público, sin
efectos secundarios, explícitamente el endpoint que usa el Agente 3 en producción real
— ver `openapi.yaml:224`). **No lo extiendas a endpoints de escritura** (orders,
payments, inventory) sin volver a evaluar el riesgo contra producción con el Arquitecto
primero.
