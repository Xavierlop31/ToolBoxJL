import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  ParseArrayPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { Route, Shipment } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { VehiculoNoEncontradoError } from "../../fleet/domain/errors/vehiculo-no-encontrado.error";
import { AsignarRutasUseCase } from "../application/asignar-rutas.use-case";
import { ListarEnviosUseCase } from "../application/listar-envios.use-case";
import { ListarPedidosPendientesUseCase } from "../application/listar-pedidos-pendientes.use-case";
import { ShipmentNoEncontradoError } from "../domain/errors/shipment-no-encontrado.error";
import { RouteInputDto } from "./dto/route-input.dto";

/**
 * `/logistics/*` — protegido por JWT de Supabase + RBAC.
 *
 * Decisión documentada sobre `pending-orders`/`assign-routes`: openapi.yaml
 * declara `x-roles: [agente-1, admin]`. `agente-1` no es un valor de `Rol`
 * (los 5 roles humanos de negocio) — es un JWT de servicio con scope
 * restringido que AgentsModule emitirá recién en Sprint 7+ (mismo criterio
 * documentado ya en `InventoryController` para `check-availability`). Hasta
 * entonces, estos endpoints solo aceptan el rol humano `admin`.
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class LogisticsController {
  constructor(
    private readonly listarPedidosPendientes: ListarPedidosPendientesUseCase,
    private readonly asignarRutas: AsignarRutasUseCase,
    private readonly listarEnvios: ListarEnviosUseCase,
  ) {}

  @Roles("admin")
  @Get("logistics/pending-orders")
  async pendientes(): Promise<Shipment[]> {
    return this.listarPedidosPendientes.ejecutar();
  }

  @Roles("admin")
  @Post("logistics/assign-routes")
  @HttpCode(201)
  async asignar(
    @Body(new ParseArrayPipe({ items: RouteInputDto }))
    dtos: RouteInputDto[],
  ): Promise<Route[]> {
    try {
      return await this.asignarRutas.ejecutar(dtos);
    } catch (error) {
      if (error instanceof VehiculoNoEncontradoError || error instanceof ShipmentNoEncontradoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Roles("gerente", "admin")
  @Get("logistics/shipments")
  async envios(): Promise<Shipment[]> {
    return this.listarEnvios.ejecutar();
  }
}
