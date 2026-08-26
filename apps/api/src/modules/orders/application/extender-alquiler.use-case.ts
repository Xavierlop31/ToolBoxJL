import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Order, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { ORDER_REPOSITORY } from "../infrastructure/orders.tokens";
import type { OrderRepository } from "../domain/order.repository";
import { OrdenNoEncontradaError } from "../domain/errors/orden-no-encontrada.error";
import { OrdenNoExtensibleError } from "../domain/errors/orden-no-extensible.error";
import { SinUnidadesDisponiblesError } from "../domain/errors/sin-unidades-disponibles.error";
import {
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
} from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";

const ESTADOS_EXTENSIBLES = new Set(["confirmada", "en_curso"]);

/** Un día en milisegundos, para el cálculo puro de días de extensión. */
const UN_DIA_MS = 1000 * 60 * 60 * 24;

/**
 * RF-9.2 / HU-9.2 — `POST /rentals/extend`. Invocado directamente por el
 * Cliente o, vía tool calling, por el Agente 2 (WhatsApp) tras confirmar
 * disponibilidad futura y ofrecer el modo de cobro (TRD §4.2). Ver
 * `apps/api/src/modules/whatsapp-webhook/` para el loop de tool calling que
 * llama este mismo endpoint por HTTP real, autenticado con el JWT de
 * servicio `agente-2`.
 *
 * *** GAP DE ALCANCE DOCUMENTADO (decisión del Tech Lead, Sprint 8) ***: este
 * caso de uso NO crea ningún `Payment` para el costo adicional de la
 * extensión, sea cual sea `modoCobro`. Motivos: (1) el schema `Payment` de
 * openapi.yaml no declara ningún `tipo` que represente "extensión de
 * alquiler" — no se agrega un valor de enum no declarado en el contrato; (2)
 * `OrdersModule` no importa `PaymentsModule` (es al revés — `PaymentsModule`
 * importa `OrdersModule`, ver payments.module.ts — agregar la dependencia
 * inversa acá crearía un ciclo de imports, mismo problema que ya se
 * documentó para `PaymentsModule`↔`LogisticsModule` en Sprint 4). El costo
 * adicional SÍ se calcula acá (ver `costoAdicionalCop` en el log) para que
 * quede visible en logs/observabilidad y para que el Agente 2 lo calcule de
 * forma consistente antes de ofrecerlo en la conversación — pero su cobro
 * real (link de pago Wompi vía el checkout ya existente de
 * `apps/portal-cliente`, o acumulación a la factura final) queda fuera de
 * alcance de este sprint. Documentado explícitamente en el PR para que el
 * Arquitecto lo revise — no es un olvido.
 */
@Injectable()
export class ExtenderAlquilerUseCase {
  private readonly logger = new Logger(ExtenderAlquilerUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
  ) {}

  async ejecutar(
    ordenId: string,
    nuevaFechaFin: string,
    modoCobro: "link_pago" | "acumular_a_factura_final" | undefined,
    usuario: UsuarioAutenticado,
  ): Promise<Order> {
    const orden = await this.ordenes.buscarPorId(ordenId);

    // Ownership: un `cliente` humano solo puede extender SU PROPIA orden
    // (mismo criterio anti-enumeración que PagarOrdenUseCase: existencia y
    // ajenidad se reportan con el mismo error). El servicio `agente-2` NO
    // tiene un `cliente_id` propio que comparar — su JWT representa al
    // negocio, no a un cliente puntual; se confía en que, para cuando el
    // Agente 2 llega a invocar esta tool, ya resolvió (en la conversación de
    // WhatsApp) que el número de teléfono que le habla es el dueño de la
    // orden. Este es un límite de confianza documentado a nivel del scope
    // del JWT de servicio, igual que el resto del sistema confía en
    // `x-roles` para autorizar por rol.
    if (!orden || (usuario.rol === "cliente" && orden.cliente_id !== usuario.id)) {
      throw new OrdenNoEncontradaError(ordenId);
    }

    if (orden.tipo !== "alquiler") {
      throw new OrdenNoExtensibleError(ordenId, `es una orden de tipo "${orden.tipo}", no "alquiler"`);
    }
    if (!ESTADOS_EXTENSIBLES.has(orden.estado)) {
      throw new OrdenNoExtensibleError(
        ordenId,
        `está en estado "${orden.estado}"; solo se puede extender confirmada/en_curso`,
      );
    }
    if (!orden.fecha_fin) {
      throw new OrdenNoExtensibleError(ordenId, "no tiene fecha_fin registrada");
    }

    const fechaFinActual = new Date(orden.fecha_fin);
    const fechaFinNueva = new Date(nuevaFechaFin);
    if (fechaFinNueva.getTime() <= fechaFinActual.getTime()) {
      throw new OrdenNoExtensibleError(
        ordenId,
        `nueva_fecha_fin (${nuevaFechaFin}) debe ser posterior a la fecha_fin actual (${orden.fecha_fin})`,
      );
    }
    const diasExtension = Math.ceil((fechaFinNueva.getTime() - fechaFinActual.getTime()) / UN_DIA_MS);

    // Ventana de re-validación de disponibilidad: desde el día SIGUIENTE a
    // la fecha_fin actual (para que la propia reserva de esta orden, que
    // termina exactamente en fecha_fin, no se cuente a sí misma como
    // solapada) hasta la nueva fecha_fin. A diferencia de
    // `ConsultarDisponibilidadUseCase` (que cuenta unidades libres del
    // modelo en agregado — lo que usa el Agente 2 como tool de consulta
    // previa, GET /inventory/check-availability), acá se valida algo más
    // preciso y más barato de calcular: que NINGUNA OTRA orden activa se
    // haya adueñado de la unidad física exacta de este ítem durante la
    // ventana de extensión — no hace falta que haya otra unidad libre del
    // mismo modelo, alcanza con que esta unidad puntual siga libre.
    const diaSiguienteAFechaFinActual = new Date(fechaFinActual.getTime() + UN_DIA_MS)
      .toISOString()
      .slice(0, 10);

    let costoAdicionalCop = 0;
    for (const item of orden.items) {
      const unidad = await this.unidades.buscarPorId(item.unidad_id);
      if (!unidad) {
        continue;
      }
      const reservadasEnVentana = await this.ordenes.obtenerUnidadesReservadasEnRango(
        unidad.modelo_id,
        diaSiguienteAFechaFinActual,
        nuevaFechaFin,
      );
      if (reservadasEnVentana.includes(item.unidad_id)) {
        throw new SinUnidadesDisponiblesError(unidad.modelo_id);
      }

      const modelo = await this.modelos.buscarPorId(unidad.modelo_id);
      costoAdicionalCop += (modelo?.tarifa_dia ?? 0) * diasExtension;
    }

    this.logger.log(
      `Orden ${ordenId}: extendida ${diasExtension} día(s) hasta ${nuevaFechaFin}. ` +
        `Costo adicional calculado: ${costoAdicionalCop} COP. modo_cobro="${modoCobro ?? "<no especificado>"}" ` +
        "(no se creó ningún Payment — ver comentario de cabecera de ExtenderAlquilerUseCase).",
    );

    return this.ordenes.extenderFecha(ordenId, nuevaFechaFin);
  }
}
