import { Inject, Injectable } from "@nestjs/common";
import type { CheckoutCartInput, CheckoutCartResult } from "@toolboxjl/shared-types";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { CrearOrdenUseCase, type ItemDeOrdenResuelto } from "../../orders/application/crear-orden.use-case";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import { SinUnidadesDisponiblesError } from "../../orders/domain/errors/sin-unidades-disponibles.error";
import type { CartLineItem, CartRepository } from "../domain/cart.repository";
import { CART_REPOSITORY } from "../infrastructure/cart.tokens";
import { EliminarItemCarritoUseCase } from "./eliminar-item-carrito.use-case";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Cabecera compartida por todas las líneas de un mismo grupo (ver `agruparLineas`). */
interface CabeceraGrupo {
  tipo: "alquiler" | "venta";
  fechaInicio: string | null;
  fechaFin: string | null;
}

/**
 * POST /orders/checkout-cart (HU-12.3, Fase 3, Issue #146). Procesa TODAS
 * las líneas del carrito activo del cliente autenticado de una sola vez,
 * con la misma `direccion_entrega`/`zona_id` para todas (checkout
 * consolidado, botón "Proceder al Pago" del carrito) — reusa
 * `CrearOrdenUseCase.resolverItem` (Sprint 2/13) para elegir unidad física +
 * fijar tarifa por línea, sin reimplementar esa lógica.
 *
 * **Consolidación en 1 orden por grupo, no 1 orden por línea** (bug
 * reportado por el Arquitecto, 2026-09-11: un carrito de 3 herramientas
 * generaba 3 órdenes). `Order` tiene `tipo`/`fecha_inicio`/`fecha_fin` de
 * CABECERA (compartidos por todos sus `OrderItem`, ver Prisma schema) — así
 * que una sola orden solo puede contener líneas con esos 3 campos idénticos.
 * Las líneas del carrito se agrupan por `(tipo, fechaInicio, fechaFin)`
 * (`agruparLineas`) y se persiste UNA orden por grupo con TODOS sus ítems
 * (incluida la `cantidad` de cada línea, resuelta a N unidades físicas
 * distintas — antes se ignoraba `cantidad` y cada línea solo aportaba 1
 * unidad). En el caso típico (carrito de solo venta, o alquileres con el
 * mismo rango de fechas) esto da exactamente 1 orden.
 *
 * **Best effort, NO transaccional por LÍNEA** (openapi.yaml, descripción del
 * path): si algún ítem de una línea falla (`ModeloNoEncontradoError`,
 * `SinUnidadesDisponiblesError`), esa línea completa se excluye del grupo
 * (ninguno de sus ítems se persiste) y se reporta en `fallos` — el resto de
 * líneas del grupo, y los demás grupos, siguen su curso. Las líneas
 * incluidas con éxito en la orden persistida de su grupo se retiran del
 * carrito (vía `EliminarItemCarritoUseCase`); las que fallaron quedan para
 * que el cliente las reintente o elimine manualmente. No inicia el pago —
 * eso sigue siendo `POST /orders/{id}/pay` por cada orden resultante.
 *
 * Decisiones documentadas del Backend Developer (Sprint 13, no confirmadas
 * con el Arquitecto — flag si difieren de lo esperado):
 * 1. `tipo` se infiere de la presencia de `dias` en la línea, mismo
 *    criterio que `cart-pricing.service.ts` (líneas 14-32).
 * 2. `CartLineItem` no tiene `fecha_inicio`/`fecha_fin` (solo una duración
 *    en `dias`) — para líneas de alquiler se sintetizan acá: `fecha_inicio`
 *    = hoy, `fecha_fin` = hoy + `dias`, asumiendo que el alquiler arranca
 *    inmediatamente al confirmar el checkout. Dos líneas de alquiler con
 *    igual `dias` caen en el mismo grupo (mismo `fecha_fin` sintetizado);
 *    con `dias` distinto, cada una genera su propia orden de alquiler.
 * 3. `return_mode` es opcional en el contrato de este endpoint (a
 *    diferencia de `OrderInput.return_mode`, obligatorio) — si no se
 *    informa, se asume `"en_sede"` (mismo default que usa
 *    `CotizarOrdenUseCase` cuando no recibe `returnMode`).
 */
@Injectable()
export class CheckoutCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carritos: CartRepository,
    @Inject(ORDER_REPOSITORY) private readonly ordenes: OrderRepository,
    private readonly crearOrden: CrearOrdenUseCase,
    private readonly eliminarItemCarrito: EliminarItemCarritoUseCase,
  ) {}

  async ejecutar(clienteId: string, input: CheckoutCartInput): Promise<CheckoutCartResult> {
    const carrito = await this.carritos.obtenerOCrearPorClienteId(clienteId);
    const returnMode = input.return_mode ?? "en_sede";

    const ordenesCreadas: CheckoutCartResult["ordenes_creadas"] = [];
    const fallos: CheckoutCartResult["fallos"] = [];

    for (const [cabecera, lineas] of this.agruparLineas(carrito.items)) {
      const unidadesReservadasEnEsteChequeo = new Set<string>();
      const itemsGrupo: ItemDeOrdenResuelto[] = [];
      const lineasIncluidas: CartLineItem[] = [];

      for (const linea of lineas) {
        try {
          const itemsLinea: ItemDeOrdenResuelto[] = [];
          for (let i = 0; i < linea.cantidad; i++) {
            const item = await this.crearOrden.resolverItem(
              {
                modelo_id: linea.modelo_id,
                tipo: cabecera.tipo,
                fecha_inicio: cabecera.fechaInicio ?? undefined,
                fecha_fin: cabecera.fechaFin ?? undefined,
                zona_id: input.zona_id,
                return_mode: returnMode,
              },
              unidadesReservadasEnEsteChequeo,
            );
            itemsLinea.push(item);
            unidadesReservadasEnEsteChequeo.add(item.unidadId);
          }
          itemsGrupo.push(...itemsLinea);
          lineasIncluidas.push(linea);
        } catch (error) {
          if (error instanceof ModeloNoEncontradoError || error instanceof SinUnidadesDisponiblesError) {
            fallos.push({ modelo_id: linea.modelo_id, motivo: error.message });
            continue;
          }
          // Error inesperado (no es un fallo de negocio conocido por línea):
          // se propaga, mismo criterio que CrearOrdenUseCase/OrdersController.
          throw error;
        }
      }

      if (itemsGrupo.length === 0) continue;

      const orden = await this.ordenes.crear({
        clienteId,
        tipo: cabecera.tipo,
        fechaInicio: cabecera.fechaInicio,
        fechaFin: cabecera.fechaFin,
        returnMode,
        direccionEntrega: input.direccion_entrega,
        zonaId: input.zona_id,
        items: itemsGrupo,
      });
      ordenesCreadas.push(orden);

      // Solo se retiran del carrito las líneas cuya orden se creó con éxito
      // — best effort, ver comentario de cabecera.
      for (const linea of lineasIncluidas) {
        await this.eliminarItemCarrito.ejecutar(clienteId, linea.id);
      }
    }

    return { ordenes_creadas: ordenesCreadas, fallos };
  }

  /**
   * Agrupa las líneas del carrito por `(tipo, fechaInicio, fechaFin)` —
   * único header que todos los ítems de una misma `Order` pueden compartir
   * (ver comentario de cabecera). Devuelve los grupos en el orden en que
   * aparece su primera línea en el carrito (determinístico, sin depender de
   * iteración de `Map`/objeto).
   */
  private agruparLineas(items: CartLineItem[]): [CabeceraGrupo, CartLineItem[]][] {
    const grupos = new Map<string, [CabeceraGrupo, CartLineItem[]]>();

    for (const item of items) {
      const cabecera = this.aCabeceraGrupo(item);
      const clave = `${cabecera.tipo}|${cabecera.fechaInicio ?? ""}|${cabecera.fechaFin ?? ""}`;
      const existente = grupos.get(clave);
      if (existente) {
        existente[1].push(item);
      } else {
        grupos.set(clave, [cabecera, [item]]);
      }
    }

    return [...grupos.values()];
  }

  private aCabeceraGrupo(item: CartLineItem): CabeceraGrupo {
    if (item.dias && item.dias > 0) {
      const hoy = new Date();
      const fin = new Date(hoy.getTime() + item.dias * UN_DIA_MS);
      return {
        tipo: "alquiler",
        fechaInicio: hoy.toISOString().slice(0, 10),
        fechaFin: fin.toISOString().slice(0, 10),
      };
    }

    return { tipo: "venta", fechaInicio: null, fechaFin: null };
  }
}
