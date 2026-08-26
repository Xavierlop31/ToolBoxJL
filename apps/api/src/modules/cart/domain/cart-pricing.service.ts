import type { ToolModel } from "@toolboxjl/shared-types";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import type { CartLineItem } from "./cart.repository";

/**
 * Calcula el precio de cada línea del carrito SERVER-SIDE — el `total` de
 * `Cart` (openapi.yaml) nunca confía en un total que mande el cliente o el
 * Agente 3 (mismo principio que `PricingCalculatorService` en PricingModule,
 * Sprint 2).
 *
 * Decisiones documentadas del Backend Developer (Sprint 9, no confirmadas
 * con el Arquitecto — flag si difieren de lo esperado):
 *
 * 1. `CartItem` (openapi.yaml) NO tiene un campo `tipo` (alquiler/venta) —
 *    a diferencia de `OrderInput`. Se infiere de la presencia de `dias`:
 *      - `dias` presente y > 0 → línea de ALQUILER: `tarifa_dia` optimizado
 *        en bloques de semana (`tarifa_semana`), mismo algoritmo que
 *        `PricingCalculatorService.calcularTarifaAlquiler`
 *        (orders/pricing, Sprint 2). Se reimplementa acá en vez de
 *        importar esa clase para no acoplar CartModule a PricingModule por
 *        un cálculo de ~10 líneas — si el algoritmo de PricingModule
 *        cambia, hay que sincronizar ambos a mano (deuda técnica
 *        documentada, aceptable dado el plazo de 9 días a la entrega).
 *      - `dias` ausente → línea de VENTA: `costo_compra` (mismo campo que
 *        usa `PricingCalculatorService`/`CotizarOrdenUseCase` para tipo
 *        "venta" — ver el comentario "venta: costo de compra directo" en
 *        `pricing/domain/pricing-calculator.service.ts`). `ToolModel` NO
 *        tiene un campo `tarifa_venta` separado (ver
 *        `packages/shared-types/src/tool-model.ts`) — si el modelo no tiene
 *        `costo_compra` cargado, se usa `tarifa_dia` como aproximación
 *        (mejor un precio no-cero que romper el carrito). Gap documentado,
 *        no una decisión de negocio confirmada.
 * 2. Esta es una cotización de PREVIEW del carrito: NO incluye recargo
 *    logístico ni depósito de garantía (dependen de `zona_id`/`return_mode`,
 *    que recién se eligen al armar la orden vía `POST /orders/quote` /
 *    `POST /orders` — checkout desde el carrito está fuera de alcance de
 *    Sprint 9, no lo piden los escenarios Gherkin de
 *    `features/10_agente_conserje_voz.feature`).
 */
export function calcularSubtotalLinea(modelo: ToolModel, item: CartLineItem): number {
  if (item.dias && item.dias > 0) {
    const tarifaSemana = modelo.tarifa_semana ?? modelo.tarifa_dia * 7;
    return calcularTarifaAlquiler(modelo.tarifa_dia, tarifaSemana, item.dias) * item.cantidad;
  }
  const precioUnitarioVenta = modelo.costo_compra ?? modelo.tarifa_dia;
  return precioUnitarioVenta * item.cantidad;
}

function calcularTarifaAlquiler(tarifaDia: number, tarifaSemana: number, dias: number): number {
  if (dias < 7) {
    return tarifaDia * dias;
  }
  const semanas = Math.floor(dias / 7);
  const diasSueltos = dias % 7;
  return tarifaSemana * semanas + tarifaDia * diasSueltos;
}

/**
 * Suma el subtotal de todas las líneas cuyo modelo se pudo resolver en
 * `modelosPorId`. Una línea cuyo `modelo_id` no está en el mapa se ignora
 * silenciosamente en el cálculo (no debería pasar nunca en runtime real:
 * `AgregarItemCarritoUseCase` ya validó con `ModeloNoEncontradoError` antes
 * de persistir la línea — pero un modelo pudo haberse eliminado del catálogo
 * después de agregado al carrito; no hay endpoint de borrado de `ToolModel`
 * todavía, así que este caso es hipotético, documentado por robustez).
 */
export function calcularTotalCarrito(
  items: CartLineItem[],
  modelosPorId: Map<string, ToolModel>,
): number {
  return items.reduce((total, item) => {
    const modelo = modelosPorId.get(item.modelo_id);
    return modelo ? total + calcularSubtotalLinea(modelo, item) : total;
  }, 0);
}

/** Resuelve, de una sola pasada (sin duplicados), los `ToolModel` de todas las líneas del carrito. */
export async function cargarModelosDelCarrito(
  modelos: ToolModelRepository,
  items: CartLineItem[],
): Promise<Map<string, ToolModel>> {
  const idsUnicos = [...new Set(items.map((item) => item.modelo_id))];
  const entradas = await Promise.all(
    idsUnicos.map(async (id) => [id, await modelos.buscarPorId(id)] as const),
  );
  const mapa = new Map<string, ToolModel>();
  for (const [id, modelo] of entradas) {
    if (modelo) {
      mapa.set(id, modelo);
    }
  }
  return mapa;
}
