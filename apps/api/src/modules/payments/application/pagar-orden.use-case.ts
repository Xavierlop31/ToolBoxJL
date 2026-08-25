import { Inject, Injectable, Logger } from "@nestjs/common";
import type { MetodoPago, Payment } from "@toolboxjl/shared-types";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { CotizarOrdenUseCase } from "../../orders/application/cotizar-orden.use-case";
import {
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
} from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";
import { UnidadNoEncontradaError } from "../../catalog-inventory/domain/errors/unidad-no-encontrada.error";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { OrdenNoPagableError } from "../domain/errors/orden-no-pagable.error";
import { PAYMENT_REPOSITORY, WOMPI_GATEWAY } from "../infrastructure/payments.tokens";
import type { PaymentRepository } from "../domain/payment.repository";
import type { ResultadoSplitWompi, WompiGateway } from "../domain/wompi-gateway";

export interface ResultadoPagoOrden {
  pagoPrincipal: Payment;
  pagoDeposito: Payment | null;
  /**
   * Split simulado del recargo logístico del pago principal (RF-2.4,
   * HU-3.3) entre la cuenta matriz y la del proveedor logístico. No forma
   * parte del contrato `Payment` de openapi.yaml — se expone acá para quien
   * invoque el caso de uso directamente (ej. BDD); el controller solo
   * devuelve `pagoPrincipal` en la respuesta HTTP, tal como lo declara
   * `POST /orders/{id}/pay`.
   */
  split: ResultadoSplitWompi;
}

/**
 * RF-2.2/2.3/2.4 — inicia el pago de una orden `pendiente_pago` según el
 * método elegido y, si el pago se inicia con éxito, la pasa a `confirmada`.
 *
 * La orden de Sprint 2 no persiste el `deposito_garantia` calculado en la
 * cotización original (`OrderItem` solo guarda `tarifa_aplicada`) — decisión
 * del Tech Lead para este sprint: en vez de reabrir el schema de `orders`,
 * se recalcula la cotización acá reusando `CotizarOrdenUseCase` a partir de
 * la unidad física reservada por la orden.
 */
@Injectable()
export class PagarOrdenUseCase {
  private readonly logger = new Logger(PagarOrdenUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly pagos: PaymentRepository,
    @Inject(WOMPI_GATEWAY)
    private readonly wompi: WompiGateway,
    private readonly cotizarOrden: CotizarOrdenUseCase,
  ) {}

  async ejecutar(
    ordenId: string,
    clienteId: string,
    metodo: MetodoPago,
  ): Promise<ResultadoPagoOrden> {
    const orden = await this.ordenes.buscarPorId(ordenId);
    // Ocultar la existencia de órdenes ajenas: si no existe o no pertenece
    // al cliente autenticado, el error es el mismo (mismo criterio que
    // evitar enumeración de recursos por id).
    if (!orden || orden.cliente_id !== clienteId) {
      throw new OrdenNoEncontradaError(ordenId);
    }
    if (orden.estado !== "pendiente_pago") {
      throw new OrdenNoPagableError(ordenId, orden.estado);
    }

    const primerItem = orden.items[0];
    const unidad = await this.unidades.buscarPorId(primerItem.unidad_id);
    if (!unidad) {
      throw new UnidadNoEncontradaError(primerItem.unidad_id);
    }
    const modelo = await this.modelos.buscarPorId(unidad.modelo_id);
    if (!modelo) {
      throw new ModeloNoEncontradoError(unidad.modelo_id);
    }

    const cotizacion = await this.cotizarOrden.ejecutar({
      modeloId: modelo.id,
      tipo: orden.tipo,
      fechaInicio: orden.fecha_inicio ?? undefined,
      fechaFin: orden.fecha_fin ?? undefined,
      zonaId: orden.zona_id,
    });

    const tipoPagoPrincipal = orden.tipo === "alquiler" ? "pago_alquiler" : "pago_venta";
    const requiereDeposito = (modelo.deposito_pct ?? 0) > 0;

    let pagoPrincipal: Payment;
    let pagoDeposito: Payment | null = null;

    if (metodo === "contra_entrega") {
      // Dinero físico que todavía no existe: se reserva, sin llamar a Wompi.
      pagoPrincipal = await this.pagos.crear({
        orderId: orden.id,
        tipo: tipoPagoPrincipal,
        metodo,
        estado: "pendiente",
        monto: cotizacion.tarifa_base,
        wompiTransactionId: null,
      });
      if (requiereDeposito) {
        pagoDeposito = await this.pagos.crear({
          orderId: orden.id,
          tipo: "deposito_garantia",
          metodo,
          estado: "pendiente",
          monto: cotizacion.deposito_garantia,
          wompiTransactionId: null,
        });
      }
    } else {
      // pse | tarjeta: se invoca Wompi. El depósito de garantía se ejecuta
      // como hold con tarjeta (preautorización) y como captura con PSE (se
      // cobra de inmediato; el reembolso tras inspección satisfactoria es
      // responsabilidad de InspectionModule, Sprint 5 — no implementado acá).
      const transaccionPrincipal = await this.wompi.iniciarTransaccion(
        cotizacion.tarifa_base,
        metodo,
        "captura",
      );
      pagoPrincipal = await this.pagos.crear({
        orderId: orden.id,
        tipo: tipoPagoPrincipal,
        metodo,
        estado: transaccionPrincipal.estado,
        monto: cotizacion.tarifa_base,
        wompiTransactionId: transaccionPrincipal.wompiTransactionId,
      });

      if (requiereDeposito) {
        const modoDeposito = metodo === "tarjeta" ? "hold" : "captura";
        const transaccionDeposito = await this.wompi.iniciarTransaccion(
          cotizacion.deposito_garantia,
          metodo,
          modoDeposito,
        );
        pagoDeposito = await this.pagos.crear({
          orderId: orden.id,
          tipo: "deposito_garantia",
          metodo,
          estado: transaccionDeposito.estado,
          monto: cotizacion.deposito_garantia,
          wompiTransactionId: transaccionDeposito.wompiTransactionId,
        });
      }
    }

    // La transacción se inició con éxito (cualquier método, incluido
    // contra_entrega, que "reserva" el pago) → la orden queda confirmada y
    // disponible para GET /logistics/pending-orders (Sprint 4).
    await this.ordenes.actualizarEstado(orden.id, "confirmada");

    // RF-2.4 / HU-3.3: split simulado del recargo logístico del pago
    // principal entre cuenta matriz y proveedor logístico. No se persiste
    // en `payments` (el schema `Payment` de openapi.yaml no tiene ese campo
    // y ningún endpoint de este sprint lo consulta de vuelta) — se loguea
    // acá, que es donde el Tech Lead pidió dejar registro simple de la
    // porción calculada.
    const split = this.wompi.simularSplit(cotizacion.recargo_logistico);
    this.logger.log(
      `Split simulado para orden ${orden.id}: logística=${split.montoLogistica} COP, matriz=${split.montoMatriz} COP.`,
    );

    return { pagoPrincipal, pagoDeposito, split };
  }
}
