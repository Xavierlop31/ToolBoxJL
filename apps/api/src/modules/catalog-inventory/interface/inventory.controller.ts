import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type {
  ToolModel,
  ToolUnit,
  ToolUnitStatusLogEntry,
  UsuarioAutenticado,
} from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { ActualizarEstadoUnidadUseCase } from "../application/actualizar-estado-unidad.use-case";
import {
  ConsultarDisponibilidadUseCase,
  type DisponibilidadModelo,
} from "../application/consultar-disponibilidad.use-case";
import { ObtenerUnidadUseCase } from "../application/obtener-unidad.use-case";
import { RegistrarModeloUseCase } from "../application/registrar-modelo.use-case";
import { RegistrarUnidadUseCase } from "../application/registrar-unidad.use-case";
import { ModeloNoEncontradoError } from "../domain/errors/modelo-no-encontrado.error";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";
import { ActualizarEstadoDto } from "./dto/actualizar-estado.dto";
import { CheckAvailabilityQueryDto } from "./dto/check-availability.query.dto";
import { CrearModeloDto } from "./dto/crear-modelo.dto";
import { CrearUnidadDto } from "./dto/crear-unidad.dto";

/**
 * `/inventory/*` — todos protegidos por JWT de Supabase (`SupabaseAuthGuard`)
 * + RBAC (`RolesGuard`), con el rol exacto que exige cada endpoint en
 * openapi.yaml (`x-roles`).
 *
 * Decisión documentada sobre `check-availability`: openapi.yaml declara
 * `x-roles: [cliente, agente-2, agente-3]`. `agente-2` ya tiene JWT de
 * servicio real desde Sprint 8 (usuario de Supabase Auth con
 * `app_metadata.rol = "agente-2"`, mismo mecanismo que `agente-1` — ver
 * `ROLES` en `@toolboxjl/shared-types`), así que se suma acá. `agente-3`
 * (Sprint 9) todavía no existe como JWT de servicio — no se agrega hasta
 * ese sprint, mismo criterio que se aplicó acá para `agente-2` hasta ahora.
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class InventoryController {
  constructor(
    private readonly registrarModelo: RegistrarModeloUseCase,
    private readonly registrarUnidad: RegistrarUnidadUseCase,
    private readonly obtenerUnidad: ObtenerUnidadUseCase,
    private readonly actualizarEstadoUnidad: ActualizarEstadoUnidadUseCase,
    private readonly consultarDisponibilidad: ConsultarDisponibilidadUseCase,
  ) {}

  @Roles("admin")
  @Post("inventory/models")
  @HttpCode(201)
  async crearModelo(@Body() dto: CrearModeloDto): Promise<ToolModel> {
    return this.registrarModelo.ejecutar(dto);
  }

  @Roles("almacenista", "admin")
  @Post("inventory/units")
  @HttpCode(201)
  async crearUnidad(@Body() dto: CrearUnidadDto): Promise<ToolUnit> {
    try {
      return await this.registrarUnidad.ejecutar(dto);
    } catch (error) {
      if (error instanceof ModeloNoEncontradoError) {
        // openapi.yaml no declara 404 para este endpoint (solo 400/401/403).
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Roles("almacenista", "repartidor")
  @Get("inventory/units/:id")
  async obtenerUnidadPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ToolUnit> {
    try {
      return await this.obtenerUnidad.ejecutar(id);
    } catch (error) {
      if (error instanceof UnidadNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Roles("almacenista", "repartidor")
  @Patch("inventory/units/:id/status")
  async actualizarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarEstadoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ToolUnitStatusLogEntry> {
    try {
      return await this.actualizarEstadoUnidad.ejecutar(
        id,
        dto.estado_nuevo,
        dto.fotos_urls ?? [],
        usuario.id,
      );
    } catch (error) {
      if (error instanceof UnidadNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Roles("cliente", "agente-2")
  @Get("inventory/check-availability")
  async checkAvailability(
    @Query() query: CheckAvailabilityQueryDto,
  ): Promise<DisponibilidadModelo> {
    return this.consultarDisponibilidad.ejecutar(
      query.modelo_id,
      query.fecha_inicio,
      query.fecha_fin,
    );
  }
}
