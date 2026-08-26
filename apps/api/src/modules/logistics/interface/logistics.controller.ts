import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  ParseArrayPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { Route, Shipment, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { VehiculoNoEncontradoError } from "../../fleet/domain/errors/vehiculo-no-encontrado.error";
import { AsignarRutasUseCase } from "../application/asignar-rutas.use-case";
import { ListarEnviosUseCase } from "../application/listar-envios.use-case";
import { ListarPedidosPendientesUseCase } from "../application/listar-pedidos-pendientes.use-case";
import { VerMiRutaUseCase, type RutaRepartidor } from "../application/ver-mi-ruta.use-case";
import { RepartidorSinVehiculoError } from "../domain/errors/repartidor-sin-vehiculo.error";
import { RutaNoPublicadaHoyError } from "../domain/errors/ruta-no-publicada-hoy.error";
import { ShipmentNoEncontradoError } from "../domain/errors/shipment-no-encontrado.error";
import { RouteInputDto } from "./dto/route-input.dto";

/**
 * `/logistics/*` — protegido por JWT de Supabase + RBAC.
 *
 * Decisión documentada sobre `pending-orders`/`assign-routes` (Sprint 7,
 * Issues #22/#23): openapi.yaml declara `x-roles: [agente-1, admin]`.
 * `"agente-1"` (JWT de servicio del batch nocturno del Agente 1, TRD §4.1)
 * ya es un valor de `Rol` desde este sprint — ver
 * `packages/shared-types/src/rol.ts` — así que ambos roles se declaran acá
 * tal cual el contrato, sin el placeholder "solo admin" de Sprint 4.
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class LogisticsController {
  constructor(
    private readonly listarPedidosPendientes: ListarPedidosPendientesUseCase,
    private readonly asignarRutas: AsignarRutasUseCase,
    private readonly listarEnvios: ListarEnviosUseCase,
    private readonly verMiRuta: VerMiRutaUseCase,
  ) {}

  @Roles("agente-1", "admin")
  @Get("logistics/pending-orders")
  async pendientes(): Promise<Shipment[]> {
    return this.listarPedidosPendientes.ejecutar();
  }

  @Roles("agente-1", "admin")
  @Post("logistics/assign-routes")
  @HttpCode(201)
  async asignar(
    @Body(new ParseArrayPipe({ items: RouteInputDto }))
    dtos: RouteInputDto[],
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Route[]> {
    try {
      return await this.asignarRutas.ejecutar(dtos, usuario.rol);
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

  @Roles("repartidor")
  @Get("logistics/my-route")
  async miRuta(@UsuarioActual() usuario: UsuarioAutenticado): Promise<RutaRepartidor> {
    try {
      return await this.verMiRuta.ejecutar(usuario.id);
    } catch (error) {
      if (error instanceof RepartidorSinVehiculoError || error instanceof RutaNoPublicadaHoyError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
