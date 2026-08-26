import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { FleetModule } from "../../fleet/interface/fleet.module";
import { OrdersModule } from "../../orders/interface/orders.module";
import { AsignarRutasUseCase } from "../application/asignar-rutas.use-case";
import { ListarEnviosUseCase } from "../application/listar-envios.use-case";
import { ListarPedidosPendientesUseCase } from "../application/listar-pedidos-pendientes.use-case";
import { VerMiRutaUseCase } from "../application/ver-mi-ruta.use-case";
import { ROUTE_REPOSITORY, SHIPMENT_REPOSITORY } from "../infrastructure/logistics.tokens";
import { PrismaRouteRepository } from "../infrastructure/prisma/prisma-route.repository";
import { PrismaShipmentRepository } from "../infrastructure/prisma/prisma-shipment.repository";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { LogisticsController } from "./logistics.controller";

/**
 * LogisticsModule (Sprint 4, Issues #12/#13 / HU-4.2/4.3 — RF-3.1/RF-3.3).
 *
 * Importa `FleetModule` (necesita `VEHICLE_REPOSITORY` para validar
 * `vehiculo_id` en `AsignarRutasUseCase`) y `OrdersModule` (declarado por
 * consistencia con el bounded context de docs/DESIGN.md §4.1
 * `ORDERS ||--|| SHIPMENTS`; ningún caso de uso de este módulo lo usa
 * todavía de forma directa — la creación del Shipment vive en
 * `PaymentsModule/PagarOrdenUseCase`, ver export de `SHIPMENT_REPOSITORY`
 * abajo — pero queda disponible para casos de uso futuros que necesiten
 * leer la Orden asociada a un envío).
 *
 * Exporta `SHIPMENT_REPOSITORY`: `PaymentsModule` lo importa para crear el
 * Shipment de tipo `entrega` cuando una Orden queda `confirmada` (decisión
 * del Tech Lead, Sprint 4 — evita el ciclo de imports
 * PaymentsModule↔LogisticsModule).
 *
 * Wiring de producción por defecto: implementaciones Prisma (requieren
 * `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule` con las
 * implementaciones in-memory, mismo criterio que el resto de los módulos.
 */
@Module({
  imports: [AuthModule, FleetModule, OrdersModule],
  controllers: [LogisticsController],
  providers: [
    PrismaService,
    { provide: SHIPMENT_REPOSITORY, useClass: PrismaShipmentRepository },
    { provide: ROUTE_REPOSITORY, useClass: PrismaRouteRepository },
    ListarPedidosPendientesUseCase,
    AsignarRutasUseCase,
    ListarEnviosUseCase,
    VerMiRutaUseCase,
  ],
  exports: [
    SHIPMENT_REPOSITORY,
    ROUTE_REPOSITORY,
    ListarPedidosPendientesUseCase,
    AsignarRutasUseCase,
    ListarEnviosUseCase,
    VerMiRutaUseCase,
  ],
})
export class LogisticsModule {}
