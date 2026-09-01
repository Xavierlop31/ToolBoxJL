import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { CotizarOrdenUseCase } from "../application/cotizar-orden.use-case";
import { CrearOrdenUseCase } from "../application/crear-orden.use-case";
import { ObtenerOrdenUseCase } from "../application/obtener-orden.use-case";
import { ExtenderAlquilerUseCase } from "../application/extender-alquiler.use-case";
import { ListarMisOrdenesUseCase } from "../application/listar-mis-ordenes.use-case";
import type { ListarMisOrdenesResultado } from "../application/listar-mis-ordenes.use-case";
import { CotizarOrdenDto } from "./dto/cotizar-orden.dto";
import { CrearOrdenDto } from "./dto/crear-orden.dto";
import { ExtenderAlquilerDto } from "./dto/extender-alquiler.dto";
import { ListarMisOrdenesQueryDto } from "./dto/listar-mis-ordenes.query.dto";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { SinUnidadesDisponiblesError } from "../domain/errors/sin-unidades-disponibles.error";
import { OrdenNoEncontradaError } from "../domain/errors/orden-no-encontrada.error";
import { OrdenNoExtensibleError } from "../domain/errors/orden-no-extensible.error";
import type { Order, UsuarioAutenticado } from "@toolboxjl/shared-types";
import type { QuoteResult } from "../../pricing/domain/pricing-calculator.service";

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class OrdersController {
  constructor(
    private readonly cotizarOrden: CotizarOrdenUseCase,
    private readonly crearOrden: CrearOrdenUseCase,
    private readonly obtenerOrden: ObtenerOrdenUseCase,
    private readonly extenderAlquiler: ExtenderAlquilerUseCase,
    private readonly listarMisOrdenes: ListarMisOrdenesUseCase,
  ) {}

  @Roles("cliente")
  @Post("orders/quote")
  @HttpCode(200)
  async cotizar(@Body() dto: CotizarOrdenDto): Promise<QuoteResult> {
    try {
      return await this.cotizarOrden.ejecutar({
        modeloId: dto.modelo_id,
        tipo: dto.tipo,
        fechaInicio: dto.fecha_inicio,
        fechaFin: dto.fecha_fin,
        zonaId: dto.zona_id,
      });
    } catch (error) {
      if (error instanceof ModeloNoEncontradoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Roles("cliente")
  @Post("orders")
  @HttpCode(201)
  async crear(
    @Body() dto: CrearOrdenDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Order> {
    try {
      return await this.crearOrden.ejecutar(usuario.id, dto);
    } catch (error) {
      if (error instanceof ModeloNoEncontradoError || error instanceof SinUnidadesDisponiblesError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * GET /orders (HU-12.1, Fase 3) — "Mis Pedidos Activos". Declarado antes
   * de `obtenerPorId` en la clase: aunque `orders` y `orders/:id` son paths
   * literales distintos (sin ambigüedad real de matching en Express/Nest),
   * se mantiene este orden para que la ruta exacta quede registrada antes
   * que la parametrizada.
   */
  @Roles("cliente")
  @Get("orders")
  async listar(
    @Query() query: ListarMisOrdenesQueryDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ListarMisOrdenesResultado> {
    return this.listarMisOrdenes.ejecutar(usuario.id, query);
  }

  @Roles("cliente", "admin", "gerente", "almacenista", "repartidor")
  @Get("orders/:id")
  async obtenerPorId(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Order> {
    try {
      return await this.obtenerOrden.ejecutar(id, usuario);
    } catch (error) {
      if (error instanceof OrdenNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * `x-roles: [cliente, agente-2]` (openapi.yaml). El Agente 2 (WhatsApp)
   * invoca este endpoint vía tool calling tras confirmar disponibilidad
   * futura y ofrecer el modo de cobro en la conversación — ver
   * `apps/api/src/modules/whatsapp-webhook/` y TRD §4.2. openapi.yaml no
   * declara 404 para este endpoint (solo 400/401) — "orden no encontrada"
   * mapea a 400, mismo criterio que `crearUnidad` para
   * `ModeloNoEncontradoError`.
   */
  @Roles("cliente", "agente-2")
  @Post("rentals/extend")
  @HttpCode(200)
  async extender(
    @Body() dto: ExtenderAlquilerDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Order> {
    try {
      return await this.extenderAlquiler.ejecutar(dto.order_id, dto.nueva_fecha_fin, dto.modo_cobro, usuario);
    } catch (error) {
      if (
        error instanceof OrdenNoEncontradaError ||
        error instanceof OrdenNoExtensibleError ||
        error instanceof SinUnidadesDisponiblesError
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
