import type { RangoPeriodo } from "./revenue.repository";

/** Paradas asignadas/completadas de un repartidor dentro del mes consultado. */
export interface ProductividadRepartidor {
  repartidorId: string;
  entregasExitosas: number;
  rutaAsignada: number;
}

/**
 * Puerto de repositorio de solo lectura para productividad de repartidores
 * (Issue #21, HU-7.3). Agrega directamente sobre `vehicles`/`routes`/
 * `shipments` — mismo criterio de agregación directa que
 * `RoiRepository`/`UtilizationRepository`.
 *
 * "Ruta Asignada" (`ruta_asignada` en openapi.yaml, tipo `integer`) se
 * interpreta como la cantidad de PARADAS (`shipment_id` dentro de
 * `Route.paradas`) asignadas al repartidor en el mes consultado — no la
 * cantidad de objetos `Route` en sí (un repartidor típicamente tiene UNA
 * `Route` publicada por día, con muchas paradas adentro; contar "1" por día
 * no serviría para la fórmula "Entregas Exitosas / Ruta Asignada" del
 * Gherkin de HU-7.3). Decisión del Tech Lead, documentada acá porque el
 * nombre del campo del contrato es ambiguo por sí solo.
 *
 * "Entregas Exitosas" = paradas cuyo `Shipment.estado_envio` llegó a un
 * estado terminal exitoso: `entregado` (si `tipo` es `entrega`) o
 * `retornado` (si `tipo` es `recogida`).
 *
 * *** GAP DE ALCANCE DOCUMENTADO — `tiempo_promedio_min` ***: `Shipment` NO
 * tiene ningún timestamp de "cuándo se asignó" ni "cuándo se completó" una
 * parada (`prisma/schema.prisma`), y a diferencia de `ToolUnitStatusLog`,
 * las transiciones de `estado_envio` (`AsignarRutasUseCase`/
 * `RegistrarInspeccionUseCase`) no quedan auditadas en una tabla
 * append-only con `created_at`. Por eso este repositorio NO calcula tiempo
 * promedio por punto — no hay ningún dato del que derivarlo sin
 * inventarlo. `ConsultarProductividadRepartidoresUseCase` devuelve
 * `tiempo_promedio_min: 0` explícitamente, con su propio doc-comment
 * repitiendo este gap. Corregirlo requiere agregar timestamps de
 * asignación/entrega al schema (migración nueva) — fuera de alcance de
 * Sprint 10 (Issues #20/#21 piden los 3 endpoints de lectura, no una
 * migración de schema de LogisticsModule).
 */
export interface DeliveryProductivityRepository {
  listarPorRepartidor(mes: RangoPeriodo): Promise<ProductividadRepartidor[]>;
}
