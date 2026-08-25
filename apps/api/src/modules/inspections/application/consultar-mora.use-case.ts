import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import {
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
} from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";
import { PAYMENT_REPOSITORY } from "../../payments/infrastructure/payments.tokens";
import type { PaymentRepository } from "../../payments/domain/payment.repository";
import { calcularMora } from "../domain/mora-calculator";
import { MoraNoEncontradaError } from "../domain/errors/mora-no-encontrada.error";

export interface ComprobanteMora {
  order_id: string;
  dias_retraso: number;
  interes_mora_dia: number;
  monto_mora: number;
}

/**
 * `GET /billing/mora/{orderId}` (RF-4.3). Devuelve el comprobante de mora
 * de la orden SI el `MoraCalculatorJob` (o `EjecutarMoraCalculatorUseCase`
 * en test/BDD) ya emitió un `Payment` de `tipo: "cobro_mora"` — si no,
 * `MoraNoEncontradaError` (404).
 *
 * `dias_retraso`/`interes_mora_dia`/`monto_mora` NO se persisten en
 * `Payment` (el schema no tiene esos campos) — se recalculan on-the-fly acá,
 * con la MISMA fórmula (`calcularMora`) y los mismos datos (orden + modelo)
 * que usó el job, evaluada a "ahora" (momento de la consulta). Decisión del
 * Tech Lead: se asume que estos valores no cambian de forma significativa
 * entre la emisión del comprobante y la consulta (razonable para el alcance
 * de este sprint — no hay endpoint de "reliquidación"; si `monto_mora`
 * necesitara quedar congelado al valor exacto emitido por el job, hace
 * falta persistirlo en el schema, fuera de alcance acá).
 */
@Injectable()
export class ConsultarMoraUseCase {
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

  async ejecutar(orderId: string, usuario: UsuarioAutenticado): Promise<ComprobanteMora> {
    const orden = await this.ordenes.buscarPorId(orderId);
    if (!orden) {
      throw new OrdenNoEncontradaError(orderId);
    }
    if (usuario.rol === "cliente" && orden.cliente_id !== usuario.id) {
      throw new ForbiddenException("No tienes permiso para acceder al comprobante de mora de esta orden.");
    }

    const tieneMora = (await this.pagos.listarPorOrden(orderId)).some((p) => p.tipo === "cobro_mora");
    if (!tieneMora || !orden.fecha_fin || orden.items.length === 0) {
      throw new MoraNoEncontradaError(orderId);
    }

    const primerItem = orden.items[0];
    const unidad = await this.unidades.buscarPorId(primerItem.unidad_id);
    const modelo = unidad ? await this.modelos.buscarPorId(unidad.modelo_id) : null;
    if (!unidad || !modelo) {
      throw new MoraNoEncontradaError(orderId);
    }

    const interesMoraDia = modelo.interes_mora_dia ?? 0;
    const { diasRetraso, montoMora } = calcularMora(
      modelo.tarifa_dia,
      interesMoraDia,
      new Date(orden.fecha_fin),
      new Date(),
    );

    return {
      order_id: orderId,
      dias_retraso: diasRetraso,
      interes_mora_dia: interesMoraDia,
      monto_mora: montoMora,
    };
  }
}
