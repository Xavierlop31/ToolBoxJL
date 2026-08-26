import type { RangoPeriodo } from "./revenue.repository";

/** Días-unidad agregados de un modelo para calcular su tasa de utilización del mes. */
export interface UtilizacionPorModelo {
  modeloId: string;
  diasAlquilada: number;
  diasDisponibles: number;
}

/**
 * Puerto de repositorio de solo lectura para utilización de inventario
 * (Issue #21, HU-7.3). Mismo criterio de agregación directa sobre
 * `tool_units`/`orders`/`order_items` que `RoiRepository`/`RevenueRepository`.
 *
 * "Días Alquilada" = para cada unidad, la intersección de `[fecha_inicio,
 * fecha_fin)` de cada `Order` de tipo `alquiler` que la incluye (en un
 * estado que implica que el alquiler efectivamente ocurrió:
 * `confirmada`/`en_curso`/`devuelta`/`cerrada` — se excluyen
 * `pendiente_pago`/`cancelada`) con el mes consultado. `fecha_fin` se trata
 * como límite EXCLUSIVO, mismo criterio que `CotizarOrdenUseCase`
 * (`dias = ceil((fin - inicio) / 1 día)`) y que `RangoPeriodo` (HU-7.1).
 *
 * *** GAP DE PRECISIÓN DOCUMENTADO — "Días Disponibles del mes" ***: en
 * rigor debería reconstruirse día a día a partir de `ToolUnitStatusLog`
 * (tabla append-only con `estadoAnterior`/`estadoNuevo`/`createdAt` por
 * unidad — `docs/DESIGN.md` §4.2). Esta implementación NO hace esa
 * reconstrucción histórica exacta: usa el ESTADO ACTUAL de la unidad como
 * proxy para el mes completo —
 *   - si la unidad está HOY "En Mantenimiento" o "Dado de Baja", se cuentan
 *     CERO días disponibles para el mes consultado (aunque haya estado
 *     disponible varios días antes de pasar a ese estado);
 *   - si no, se cuentan todos los días del mes desde `max(fecha_ingreso,
 *     inicio del mes)` hasta el fin del mes.
 * Es una aproximación razonable para el caso de uso real de este endpoint
 * (el Gherkin de HU-7.3 dice "del mes", sin selector de periodo en
 * openapi.yaml — normalmente se consulta el mes EN CURSO) pero
 * sobre/subestima días disponibles para unidades que cambiaron de estado A
 * MITAD del mes consultado. Una reconstrucción exacta día-a-día vía
 * `ToolUnitStatusLogRepository.listarPorUnidad` es una mejora de un sprint
 * futuro — documentado para el Tech Lead, no es un olvido.
 */
export interface UtilizationRepository {
  calcularPorModelo(mes: RangoPeriodo): Promise<UtilizacionPorModelo[]>;
}
