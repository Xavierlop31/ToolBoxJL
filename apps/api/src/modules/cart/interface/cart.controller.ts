import { BadRequestException, Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { Cart, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { AgregarItemCarritoUseCase } from "../application/agregar-item-carrito.use-case";
import { ObtenerCarritoUseCase } from "../application/obtener-carrito.use-case";
import { AgregarItemCarritoDto } from "./dto/agregar-item-carrito.dto";

/**
 * `/cart/*` (openapi.yaml, tag "Carrito y Conserje de Voz") — `x-roles:
 * [cliente]` ÚNICAMENTE en ambos endpoints, sin excepción para el Agente 3.
 *
 * El Agente 3 NO tiene una cuenta de servicio Supabase propia (a diferencia
 * de agente-1/agente-2, ver `Rol`/`ROLES` en `@toolboxjl/shared-types`):
 * cuando invoca estos endpoints vía tool calling, lo hace reenviando el
 * mismo JWT de Supabase del cliente que abrió la sesión de voz (ver
 * `VoiceAgentController`/`EmitirTokenLivekitUseCase`), así que la request
 * llega acá autenticada como "cliente" — NUNCA agregar un rol "agente-3" a
 * `@Roles(...)` en este controller.
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class CartController {
  constructor(
    private readonly obtenerCarrito: ObtenerCarritoUseCase,
    private readonly agregarItemCarrito: AgregarItemCarritoUseCase,
  ) {}

  @Roles("cliente")
  @Get("cart")
  async ver(@UsuarioActual() usuario: UsuarioAutenticado): Promise<Cart> {
    return this.obtenerCarrito.ejecutar(usuario.id);
  }

  @Roles("cliente")
  @Post("cart/add-item")
  @HttpCode(200)
  async agregarItem(
    @Body() dto: AgregarItemCarritoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Cart> {
    try {
      return await this.agregarItemCarrito.ejecutar(usuario.id, dto);
    } catch (error) {
      if (error instanceof ModeloNoEncontradoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
