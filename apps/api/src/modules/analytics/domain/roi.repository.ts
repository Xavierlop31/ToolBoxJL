import type { Dinero } from "@toolboxjl/shared-types";

/** Datos agregados de un modelo necesarios para calcular su ROI. */
export interface ModeloConIngresos {
  modeloId: string;
  /**
   * `tool_models.costo_compra` — campo opcional del contrato
   * (`ToolModelInput`, openapi.yaml): puede ser `null` si nunca se cargó.
   */
  costoCompra: Dinero | null;
  /**
   * Suma histórica COMPLETA (sin filtro de periodo — ver doc-comment de
   * `RoiRepository` sobre por qué) de `pago_venta` + `pago_alquiler` +
   * `cobro_mora` capturados y atribuidos a este modelo.
   * `deposito_garantia` queda fuera, mismo criterio que
   * `IngresosPorTipo` (RevenueRepository, HU-7.1).
   */
  ingresosAcumulados: Dinero;
}

/**
 * Puerto de repositorio de solo lectura para ROI por modelo (Issue #20,
 * HU-7.2). Agrega directamente sobre `tool_models`/`payments`/`orders`/
 * `order_items`/`tool_units` — NO reutiliza los repos de dominio de
 * CatalogInventoryModule/PaymentsModule/OrdersModule (mismo criterio
 * documentado en `revenue.repository.ts`: son bounded contexts distintos y
 * este puerto necesita un JOIN de agregación que ningún repo de dominio de
 * esos módulos expone).
 *
 * "Ingresos Acumulados" = TODO el histórico: `GET /analytics/roi` no
 * declara un query param `periodo` en openapi.yaml (a diferencia de
 * `GET /analytics/revenue`), y el Gherkin de HU-7.2 dice "Ingresos
 * Acumulados", no "ingresos del periodo".
 *
 * *** GAP DE ATRIBUCIÓN, RESUELTO (HU-12.3, checkout consolidado) ***: desde
 * que `CheckoutCartUseCase` puede crear una orden con `OrderItem`s de más de
 * un modelo, cada `Payment` se prorratea entre TODOS los modelos de su
 * `Order`, proporcional al `tarifaAplicada` de cada ítem (el mismo peso con
 * el que se fijó la tarifa al crear la orden). Antes de este cambio se
 * atribuía entero al modelo del primer `OrderItem`, exacto solo porque
 * `CrearOrdenUseCase` (Sprint 2) siempre creaba órdenes de 1 solo ítem.
 */
export interface RoiRepository {
  /** Todos los modelos, o solo `modeloId` si se pasa (query param de `GET /analytics/roi`). */
  listarConIngresos(modeloId?: string): Promise<ModeloConIngresos[]>;
}
