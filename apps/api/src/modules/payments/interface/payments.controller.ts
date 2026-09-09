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
import { PagarOrdenUseCase } from "../application/pagar-orden.use-case";
import { ConfirmarPagoContraEntregaUseCase } from "../application/confirmar-pago-contra-entrega.use-case";
import { ListarBancosPseUseCase } from "../application/listar-bancos-pse.use-case";
import { ObtenerTerminosWompiUseCase } from "../application/obtener-terminos-wompi.use-case";
import { PagarOrdenDto } from "./dto/pagar-orden.dto";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { OrdenNoPagableError } from "../domain/errors/orden-no-pagable.error";
import { SinPagosPendientesError } from "../domain/errors/sin-pagos-pendientes.error";
import type { Payment, PseBank, UsuarioAutenticado, WompiTerms } from "@toolboxjl/shared-types";

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly pagarOrden: PagarOrdenUseCase,
    private readonly confirmarPagoContraEntrega: ConfirmarPagoContraEntregaUseCase,
    private readonly listarBancosPse: ListarBancosPseUseCase,
    private readonly obtenerTerminosWompi: ObtenerTerminosWompiUseCase,
  ) {}

  @Roles("cliente")
  @Get("payments/pse-banks")
  async pseBanks(): Promise<PseBank[]> {
    return this.listarBancosPse.ejecutar();
  }

  @Roles("cliente")
  @Get("payments/wompi-terms")
  async wompiTerms(): Promise<WompiTerms> {
    return this.obtenerTerminosWompi.ejecutar();
  }

  @Roles("cliente")
  @Post("orders/:id/pay")
  @HttpCode(200)
  async pagar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: PagarOrdenDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Payment> {
    try {
      // Wompi exige customer_email en toda transacción (PSE/tarjeta) —
      // contra_entrega nunca llama a Wompi, así que no lo necesita.
      if (dto.metodo !== "contra_entrega" && !usuario.email) {
        throw new BadRequestException(
          "Tu cuenta no tiene un email registrado, necesario para pagar con PSE o tarjeta. Usá contra entrega, o actualizá tu perfil.",
        );
      }
      const datosPse =
        dto.metodo === "pse" &&
        dto.user_legal_id_type &&
        dto.user_legal_id &&
        dto.financial_institution_code
          ? {
              userLegalIdType: dto.user_legal_id_type,
              userLegalId: dto.user_legal_id,
              financialInstitutionCode: dto.financial_institution_code,
            }
          : undefined;
      const aceptacionWompi =
        dto.metodo !== "contra_entrega" && dto.acceptance_token && dto.accept_personal_auth
          ? { acceptanceToken: dto.acceptance_token, personalAuthToken: dto.accept_personal_auth }
          : undefined;
      const resultado = await this.pagarOrden.ejecutar(
        id,
        usuario.id,
        usuario.email ?? "",
        dto.metodo,
        datosPse,
        aceptacionWompi,
      );
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
