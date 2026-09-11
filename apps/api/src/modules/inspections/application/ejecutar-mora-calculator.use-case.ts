import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Payment } from "@toolboxjl/shared-types";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import {
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
} from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";
import { PAYMENT_REPOSITORY } from "../../payments/infrastructure/payments.tokens";
import type { PaymentRepository } from "../../payments/domain/payment.repository";
import { calcularMora } from "../domain/mora-calculator";

/**
 * Réplica, dentro de `apps/api` (testeable vía el `TestingModule` de
 * Cucumber — `features/05_devoluciones_inspeccion_mora.feature`,
 * `@RF-4.3`), de la lógica central del `MoraCalculatorJob` (RF-4.3,
 * HU-5.3).
 *
 * El job de producción real vive en `apps/workers/src/main.ts`, como script
 * standalone contra su propio `PrismaClient` (decisión del Tech Lead: cada
 * app del monorepo depende solo de `packages/`, nunca de otra app — así que
 * `apps/workers` no puede importar este caso de uso). Este caso de uso
 * existe para que el escenario Gherkin de este sprint corra como test BDD
 * real dentro de `apps/api`, reusando los mismos repositorios/tokens que el
 * resto del módulo — la fórmula (`calcularMora`) es la única pieza
 * compartida entre ambos, y está deliberadamente duplicada (ver comentario
 * de cabecera de `domain/mora-calculator.ts`).
 *
 * Idempotencia: se filtra acá (no en `OrderRepository.listarVencidasSinMora`)
 * si la orden ya tiene un `Payment` de `tipo: "cobro_mora"` — así el mismo
 * criterio vale para la implementación in-memory y la de Prisma sin que
 * `OrderRepository` necesite conocer el schema de `payments`.
 */
@Injectable()
export class EjecutarMoraCalculatorUseCase {
  private readonly logger = new Logger(EjecutarMoraCalculatorUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly pagos: PaymentRepository,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<Payment[]> {
    const vencidas = await this.ordenes.listarVencidasSinMora(ahora);
    const comprobantesEmitidos: Payment[] = [];

    for (const orden of vencidas) {
      const yaTieneMora = (await this.pagos.listarPorOrden(orden.id)).some(
        (p) => p.tipo === "cobro_mora",
      );
      if (yaTieneMora || !orden.fecha_fin || orden.items.length === 0) {
        continue;
      }

      // Órdenes multi-ítem (HU-12.3, checkout consolidado): la mora se cobra
      // por CADA herramienta vencida de la orden, sumando el monto de cada
      // una según la tarifa/interés de su propio modelo — antes solo se
      // calculaba sobre `items[0]`, correcto cuando toda orden tenía
      // exactamente 1 ítem. Si algún ítem no resuelve su unidad/modelo, se
      // omite la orden ENTERA (mismo criterio previo: mejor no emitir un
      // comprobante parcial/incorrecto que emitir uno de menos).
      let montoMoraTotal = 0;
      let huboItemNoResuelto = false;

      for (const item of orden.items) {
        const unidad = await this.unidades.buscarPorId(item.unidad_id);
        if (!unidad) {
          this.logger.warn(`Orden ${orden.id}: unidad ${item.unidad_id} no encontrada, se omite.`);
          huboItemNoResuelto = true;
          break;
        }
        const modelo = await this.modelos.buscarPorId(unidad.modelo_id);
        if (!modelo) {
          this.logger.warn(`Orden ${orden.id}: modelo ${unidad.modelo_id} no encontrado, se omite.`);
          huboItemNoResuelto = true;
          break;
        }

        const { montoMora } = calcularMora(
          modelo.tarifa_dia,
          modelo.interes_mora_dia ?? 0,
          new Date(orden.fecha_fin),
          ahora,
        );
        montoMoraTotal += montoMora;
      }

      if (huboItemNoResuelto) {
        continue;
      }

      const comprobante = await this.pagos.crear({
        orderId: orden.id,
        tipo: "cobro_mora",
        // Placeholder documentado: el método real de cobro de la mora no se
        // elige en este sprint (se define cuando efectivamente se cobre) —
        // no hay endpoint para eso en openapi.yaml.
        metodo: "contra_entrega",
        estado: "pendiente",
        monto: montoMoraTotal,
        wompiTransactionId: null,
      });
      comprobantesEmitidos.push(comprobante);
    }

    return comprobantesEmitidos;
  }
}
