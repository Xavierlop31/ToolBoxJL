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
 * *** GAP DE ATRIBUCIÓN DOCUMENTADO ***: cada `Payment` se atribuye al
 * modelo de la unidad del PRIMER `OrderItem` de su `Order`. Esto es exacto
 * hoy porque `CrearOrdenUseCase` (Sprint 2) SIEMPRE crea una orden con
 * exactamente un `OrderItem` (ver `orders/application/crear-orden.use-case.ts`)
 * — no existe todavía un flujo de checkout que arme una orden multi-modelo
 * desde el carrito (`CartModule`, Sprint 9, no tiene endpoint de checkout
 * propio). Si un sprint futuro agrega órdenes con ítems de más de un
 * modelo, este repositorio necesitará prorratear el monto del pago entre
 * los modelos de esa orden en vez de atribuirlo entero al primero.
 */
export interface RoiRepository {
  /** Todos los modelos, o solo `modeloId` si se pasa (query param de `GET /analytics/roi`). */
  listarConIngresos(modeloId?: string): Promise<ModeloConIngresos[]>;
}
