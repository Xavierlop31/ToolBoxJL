import { Inject, Injectable, Logger } from "@nestjs/common";
import type { InspectionChecklist, InspectionChecklistInput } from "@toolboxjl/shared-types";
import { SHIPMENT_REPOSITORY } from "../../logistics/infrastructure/logistics.tokens";
import type { ShipmentRepository } from "../../logistics/domain/shipment.repository";
import { ShipmentNoEncontradoError } from "../../logistics/domain/errors/shipment-no-encontrado.error";
import { TOOL_UNIT_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";
import { UnidadNoEncontradaError } from "../../catalog-inventory/domain/errors/unidad-no-encontrada.error";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import { PAYMENT_REPOSITORY, WOMPI_GATEWAY } from "../../payments/infrastructure/payments.tokens";
import type { PaymentRepository } from "../../payments/domain/payment.repository";
import type { WompiGateway } from "../../payments/domain/wompi-gateway";
import { INSPECTION_CHECKLIST_REPOSITORY } from "../infrastructure/inspections.tokens";
import type { InspectionChecklistRepository } from "../domain/inspection-checklist.repository";

/**
 * `POST /inspections` (RF-4.2, HU-5.1). Registra el checklist de
 * salida/recepción y, si corresponde, cierra el ciclo de vida de la
 * devolución y ejecuta la garantía.
 *
 * Decisiones del Tech Lead para este sprint (GAPs cerrados de forma
 * aditiva, sin endpoint propio en openapi.yaml para ninguno de los dos):
 *
 * 1. Cierre del ciclo de vida (`tipo: "recepcion"` únicamente): el
 *    `Shipment` referenciado pasa a `estado_envio: "retornado"` y la
 *    `Order` (navegada vía `Shipment.order_id`) pasa a `estado: "devuelta"`.
 *    Un checklist `tipo: "salida"` NO toca ninguno de los dos — ya están en
 *    `en_ruta_entrega`/`confirmada` desde `AsignarRutasUseCase` (Sprint 4).
 *
 * 2. Ejecución de la garantía (`garantia_ejecutada`): `true` si y solo si
 *    `tipo === "recepcion"` Y al menos un hallazgo tiene severidad
 *    `"moderada"` o `"grave"` (`"leve"` no ejecuta garantía). Cuando se
 *    ejecuta, se buscan los `Payment` de `tipo: "deposito_garantia"` de la
 *    orden:
 *      - `estado === "hold"` (depósito con tarjeta, preautorizado): se
 *        captura vía `WompiGateway.capturarHold` y el `Payment` pasa a
 *        `estado: "capturado"`.
 *      - `estado === "capturado"`/`"pendiente"` (PSE/contra entrega, ya
 *        cobrado o por cobrarse): sin acción — el dinero ya está (o
 *        quedará) cobrado, y openapi.yaml no declara ningún endpoint de
 *        reembolso, así que "ejecutar la garantía" acá significa
 *        simplemente NO reembolsarlo.
 *
 * *** NO implementado a propósito (fuera de alcance de este sprint) ***:
 * el reembolso automático del depósito tras una inspección de recepción
 * SATISFACTORIA (sin hallazgos moderados/graves) — no hay endpoint ni
 * escenario Gherkin para eso; ya estaba documentado como pendiente en
 * `apps/api/test/bdd/step-definitions/pagos-garantia.steps.ts` (Sprint 3).
 */
@Injectable()
export class RegistrarInspeccionUseCase {
  private readonly logger = new Logger(RegistrarInspeccionUseCase.name);

  constructor(
    @Inject(INSPECTION_CHECKLIST_REPOSITORY)
    private readonly checklists: InspectionChecklistRepository,
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipments: ShipmentRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly pagos: PaymentRepository,
    @Inject(WOMPI_GATEWAY)
    private readonly wompi: WompiGateway,
  ) {}

  async ejecutar(input: InspectionChecklistInput): Promise<InspectionChecklist> {
    const shipment = await this.shipments.buscarPorId(input.shipment_id);
    if (!shipment) {
      throw new ShipmentNoEncontradoError(input.shipment_id);
    }

    const unidad = await this.unidades.buscarPorId(input.unidad_id);
    if (!unidad) {
      throw new UnidadNoEncontradaError(input.unidad_id);
    }

    const hallazgos = input.hallazgos ?? [];
    const garantiaEjecutada =
      input.tipo === "recepcion" &&
      hallazgos.some((h) => h.severidad === "moderada" || h.severidad === "grave");

    const checklist = await this.checklists.crear({
      unidadId: input.unidad_id,
      shipmentId: input.shipment_id,
      tipo: input.tipo,
      hallazgos,
      fotosUrls: input.fotos_urls ?? [],
      garantiaEjecutada,
    });

    if (input.tipo === "recepcion") {
      await this.shipments.actualizarEstadoEnvio(shipment.id, "retornado");
      await this.ordenes.actualizarEstado(shipment.order_id, "devuelta");
    }

    if (garantiaEjecutada) {
      await this.ejecutarGarantia(shipment.order_id);
    }

    return checklist;
  }

  private async ejecutarGarantia(orderId: string): Promise<void> {
    const pagosDeGarantia = (await this.pagos.listarPorOrden(orderId)).filter(
      (p) => p.tipo === "deposito_garantia",
    );

    for (const pago of pagosDeGarantia) {
      if (pago.estado === "hold") {
        if (!pago.wompi_transaction_id) {
          // No debería pasar en la práctica: todo depósito en "hold" viene de
          // una transacción real/simulada de Wompi (ver PagarOrdenUseCase,
          // Sprint 3), que siempre setea wompi_transaction_id. Se documenta
          // el caso, sin lanzar, para no romper el registro del checklist
          // por un dato inconsistente ajeno a esta orden.
          this.logger.warn(
            `Pago ${pago.id} (orden ${orderId}) está en "hold" sin wompi_transaction_id — no se puede capturar.`,
          );
          continue;
        }
        await this.wompi.capturarHold(pago.wompi_transaction_id);
        await this.pagos.actualizarEstado(pago.id, "capturado");
      }
      // estado "capturado" / "pendiente": sin acción — ver comentario de
      // cabecera de la clase (no hay reembolso que ejecutar/evitar; el
      // dinero ya está o quedará cobrado igual).
    }
  }
}
