import { Inject, Injectable } from "@nestjs/common";
import type { Shipment } from "@toolboxjl/shared-types";
import { SHIPMENT_REPOSITORY } from "../infrastructure/logistics.tokens";
import type { ShipmentRepository } from "../domain/shipment.repository";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import { USER_REPOSITORY } from "../../users/infrastructure/users.tokens";
import type { UserRepository } from "../../users/domain/user.repository";

/**
 * Forma de la respuesta de `GET /logistics/shipments` — `Shipment` (schema
 * genérico de openapi.yaml) expandido con identificador legible/cliente/
 * dirección, para que el panel de seguimiento del Gerente no tenga que
 * mostrar el GUID crudo del pedido. Mismo criterio de expansión que
 * `ParadaRutaHoy` (`RutasHoyUseCase`): el GUID sigue siendo la PK real, esto
 * es solo lo que la UI necesita mostrar.
 */
export interface EnvioConDetalle extends Shipment {
  numero_orden: string;
  cliente_nombre: string;
  direccion_entrega: string;
}

/**
 * `GET /logistics/shipments` (RF-3.3). Sirve el snapshot inicial del panel
 * de seguimiento del Gerente; las actualizaciones en vivo llegan por
 * Supabase Realtime directo desde el frontend (ver migración de este
 * sprint, `ALTER PUBLICATION supabase_realtime ADD TABLE shipments`), no
 * por polling a este endpoint — por eso el enriquecimiento (nombre de
 * cliente/dirección/número de orden) solo existe en ESTE snapshot inicial;
 * `ShipmentsPanelComponent` preserva esos campos al recibir un evento
 * Realtime (que solo trae columnas crudas de `shipments`), en vez de
 * pisarlos con `undefined`.
 *
 * Resuelve `Order`/`User` por cada shipment (mismo patrón N+1 ya aceptado
 * en `RutasHoyUseCase` — bounded contexts distintos, este use case sí puede
 * depender de `OrdersModule`/`UsersModule`).
 */
@Injectable()
export class ListarEnviosUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipments: ShipmentRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly usuarios: UserRepository,
  ) {}

  async ejecutar(): Promise<EnvioConDetalle[]> {
    const envios = await this.shipments.listarTodos();

    const resultado: EnvioConDetalle[] = [];
    for (const envio of envios) {
      const orden = await this.ordenes.buscarPorId(envio.order_id);
      const usuarioCliente = orden ? await this.usuarios.buscarPorId(orden.cliente_id) : null;

      resultado.push({
        ...envio,
        numero_orden: orden?.numero_orden ?? "",
        cliente_nombre: usuarioCliente?.nombre ?? "",
        direccion_entrega: orden?.direccion_entrega ?? "",
      });
    }
    return resultado;
  }
}
