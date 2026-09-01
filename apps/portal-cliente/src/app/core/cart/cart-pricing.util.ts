import { ToolModel } from '../models/catalog.models';
import { CartItem } from '../models/cart.models';

/**
 * Calcula el subtotal de una línea del carrito en el frontend (Sprint 13,
 * HU-12.3). El backend (`Cart`/`Cart.total`, `GET /cart`) NO trae
 * nombre/marca/precio por línea — el frontend enriquece cada línea con
 * `GET /catalog/models/{modelo_id}` (`CatalogService.getModelById`) y
 * calcula el subtotal acá mismo.
 *
 * Réplica deliberada (no una importación compartida) del mismo algoritmo que
 * usa el backend en `apps/api/src/modules/cart/domain/cart-pricing.service.ts`
 * (`calcularSubtotalLinea`) — el resultado numérico tiene que coincidir con
 * `Cart.total` para que "Subtotal Alquileres" + "Subtotal Ventas Directas"
 * sumen el mismo total que ya valida el backend. Si el algoritmo del backend
 * cambia, hay que sincronizar ambos a mano (misma deuda técnica documentada
 * ahí, aceptada por el Tech Lead para este sprint).
 *
 * Misma inferencia de modalidad que el backend: `dias` presente y > 0 →
 * ALQUILER (tarifa_dia optimizada en bloques de semana con tarifa_semana);
 * `dias` ausente → VENTA (costo_compra, o tarifa_dia como aproximación si el
 * modelo no tiene costo_compra cargado — gap documentado, no una decisión de
 * negocio).
 */
export function esLineaDeAlquiler(item: Pick<CartItem, 'dias'>): boolean {
  return !!item.dias && item.dias > 0;
}

/** Tarifa unitaria a mostrar en el listado (por día si es alquiler, por unidad si es venta). */
export function tarifaUnitariaLinea(modelo: ToolModel, item: Pick<CartItem, 'dias'>): number {
  return esLineaDeAlquiler(item) ? modelo.tarifa_dia : (modelo.costo_compra ?? modelo.tarifa_dia);
}

export function calcularSubtotalLinea(modelo: ToolModel, item: CartItem): number {
  if (esLineaDeAlquiler(item)) {
    const tarifaSemana = modelo.tarifa_semana ?? modelo.tarifa_dia * 7;
    return calcularTarifaAlquiler(modelo.tarifa_dia, tarifaSemana, item.dias as number) * item.cantidad;
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
