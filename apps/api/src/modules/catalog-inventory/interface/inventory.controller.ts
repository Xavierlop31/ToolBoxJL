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
  InventoryMetrics,
  ListarUnidadesResultado,
  ToolModel,
  ToolUnit,
  ToolUnitStatusLogEntry,
  UnidadMantenimiento,
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
import { ListarMantenimientoUseCase } from "../application/listar-mantenimiento.use-case";
import { ListarUnidadesUseCase } from "../application/listar-unidades.use-case";
import { ObtenerHistorialUnidadUseCase } from "../application/obtener-historial-unidad.use-case";
import { ObtenerMetricasInventarioUseCase } from "../application/obtener-metricas-inventario.use-case";
import { ObtenerUnidadUseCase } from "../application/obtener-unidad.use-case";
import { RegistrarModeloUseCase } from "../application/registrar-modelo.use-case";
import { RegistrarUnidadUseCase } from "../application/registrar-unidad.use-case";
import { ModeloNoEncontradoError } from "../domain/errors/modelo-no-encontrado.error";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";
import { ActualizarEstadoDto } from "./dto/actualizar-estado.dto";
import { CheckAvailabilityQueryDto } from "./dto/check-availability.query.dto";
import { CrearModeloDto } from "./dto/crear-modelo.dto";
import { CrearUnidadDto } from "./dto/crear-unidad.dto";
import { ListarUnidadesQueryDto } from "./dto/listar-unidades.query.dto";

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
 *
 * Sprint 14 (HU-13.1/HU-13.2/HU-13.3): `GET /inventory/units`,
 * `GET /inventory/metrics`, `GET /inventory/maintenance` (panel admin de
 * Inventario QR — `almacenista`/`admin`) y `PATCH
 * /inventory/units/{id}/status` amplía sus `x-roles` para incluir `admin`
 * (antes solo `almacenista`/`repartidor`) — ver openapi.yaml.
 *
 * Gap detectado por el frontend durante este mismo sprint (PR #171,
 * openapi.yaml commit `498963e`): `GET /inventory/units/{id}` describía en
 * su `description` una "hoja de vida resumida" que nunca se declaró en el
 * schema `ToolUnit` — se corrigió la descripción y se agregó el endpoint
 * dedicado `GET /inventory/units/{id}/history` para el botón "Historial" de
 * HU-13.1. De paso, `GET /inventory/units/{id}` suma `admin` a sus
 * `x-roles` (antes solo `almacenista`/`repartidor`).
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
    private readonly listarUnidades: ListarUnidadesUseCase,
    private readonly obtenerMetricasInventario: ObtenerMetricasInventarioUseCase,
    private readonly listarMantenimiento: ListarMantenimientoUseCase,
    private readonly obtenerHistorialUnidad: ObtenerHistorialUnidadUseCase,
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

  /**
   * Declarado ANTES de `inventory/units/:id` (misma convención que
   * `GET /orders` vs `GET /orders/:id`, Sprint 12): aunque no hay ambigüedad
   * real de matching, se mantiene el path literal registrado primero.
   */
  @Roles("almacenista", "admin")
  @Get("inventory/units")
  async listar(
    @Query() query: ListarUnidadesQueryDto,
  ): Promise<ListarUnidadesResultado> {
    return this.listarUnidades.ejecutar(query);
  }

  @Roles("almacenista", "admin")
  @Get("inventory/metrics")
  async metricas(): Promise<InventoryMetrics> {
    return this.obtenerMetricasInventario.ejecutar();
  }

  @Roles("almacenista", "admin")
  @Get("inventory/maintenance")
  async mantenimiento(): Promise<UnidadMantenimiento[]> {
    return this.listarMantenimiento.ejecutar();
  }

  @Roles("almacenista", "repartidor", "admin")
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

  /** `GET /inventory/units/{id}/history` (HU-13.1, botón "Historial"). */
  @Roles("almacenista", "admin")
  @Get("inventory/units/:id/history")
  async historialUnidad(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ToolUnitStatusLogEntry[]> {
    try {
      return await this.obtenerHistorialUnidad.ejecutar(id);
    } catch (error) {
      if (error instanceof UnidadNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Roles("almacenista", "repartidor", "admin")
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
        {
          tipoMantenimiento: dto.tipo_mantenimiento,
          fallaReportada: dto.falla_reportada,
          tecnicoAsignado: dto.tecnico_asignado,
          costoEstimado: dto.costo_estimado,
          fechaPrevistaFin: dto.fecha_prevista_fin,
          motivoBaja: dto.motivo_baja,
        },
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
