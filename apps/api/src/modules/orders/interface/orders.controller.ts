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
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { CotizarOrdenUseCase } from "../application/cotizar-orden.use-case";
import { CrearOrdenUseCase } from "../application/crear-orden.use-case";
import { ObtenerOrdenUseCase } from "../application/obtener-orden.use-case";
import { CotizarOrdenDto } from "./dto/cotizar-orden.dto";
import { CrearOrdenDto } from "./dto/crear-orden.dto";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { SinUnidadesDisponiblesError } from "../domain/errors/sin-unidades-disponibles.error";
import { OrdenNoEncontradaError } from "../domain/errors/orden-no-encontrada.error";
import type { Order, UsuarioAutenticado } from "@toolboxjl/shared-types";
import type { QuoteResult } from "../../pricing/domain/pricing-calculator.service";

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class OrdersController {
  constructor(
    private readonly cotizarOrden: CotizarOrdenUseCase,
    private readonly crearOrden: CrearOrdenUseCase,
    private readonly obtenerOrden: ObtenerOrdenUseCase,
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
}
