import {
  BadRequestException,
  Body,
  Controller,
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
import { PagarOrdenUseCase } from "../application/pagar-orden.use-case";
import { ConfirmarPagoContraEntregaUseCase } from "../application/confirmar-pago-contra-entrega.use-case";
import { PagarOrdenDto } from "./dto/pagar-orden.dto";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { OrdenNoPagableError } from "../domain/errors/orden-no-pagable.error";
import { SinPagosPendientesError } from "../domain/errors/sin-pagos-pendientes.error";
import type { Payment, UsuarioAutenticado } from "@toolboxjl/shared-types";

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly pagarOrden: PagarOrdenUseCase,
    private readonly confirmarPagoContraEntrega: ConfirmarPagoContraEntregaUseCase,
  ) {}

  @Roles("cliente")
  @Post("orders/:id/pay")
  @HttpCode(200)
  async pagar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: PagarOrdenDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Payment> {
    try {
      const resultado = await this.pagarOrden.ejecutar(id, usuario.id, dto.metodo);
      return resultado.pagoPrincipal;
    } catch (error) {
      if (error instanceof OrdenNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof OrdenNoPagableError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Roles("repartidor")
  @Post("orders/:id/confirm-cod-payment")
  @HttpCode(200)
  async confirmarContraEntrega(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<Payment> {
    try {
      const confirmados = await this.confirmarPagoContraEntrega.ejecutar(id);
      // El contrato de openapi.yaml declara la respuesta como un único
      // Payment (el principal); si existe depósito de garantía, también
      // queda capturado, pero no se devuelve en esta respuesta.
      return confirmados[0];
    } catch (error) {
      if (error instanceof OrdenNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof SinPagosPendientesError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
