import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { Cart, CheckoutCartResult, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { ActualizarCantidadCarritoUseCase } from "../application/actualizar-cantidad-carrito.use-case";
import { AgregarItemCarritoUseCase } from "../application/agregar-item-carrito.use-case";
import { CheckoutCartUseCase } from "../application/checkout-cart.use-case";
import { EliminarItemCarritoUseCase } from "../application/eliminar-item-carrito.use-case";
import { ObtenerCarritoUseCase } from "../application/obtener-carrito.use-case";
import { LineaCarritoNoEncontradaError } from "../domain/errors/linea-carrito-no-encontrada.error";
import { ActualizarCantidadCarritoDto } from "./dto/actualizar-cantidad-carrito.dto";
import { AgregarItemCarritoDto } from "./dto/agregar-item-carrito.dto";
import { CheckoutCartDto } from "./dto/checkout-cart.dto";

/**
 * `/cart/*` y `POST /orders/checkout-cart` (openapi.yaml, tag "Carrito y
 * Conserje de Voz") — `x-roles: [cliente]` ÚNICAMENTE en todos los
 * endpoints, sin excepción para el Agente 3.
 *
 * `POST /orders/checkout-cart` vive en este controller (no en
 * `OrdersController`) aunque su path esté bajo `/orders/`: opera sobre el
 * estado del carrito (lee TODAS sus líneas, retira las que se confirman
 * como orden) — mismo criterio de "path distinto del módulo dueño" que ya
 * usa `OrdersController` con `POST /rentals/extend`.
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
    private readonly actualizarCantidadCarrito: ActualizarCantidadCarritoUseCase,
    private readonly eliminarItemCarrito: EliminarItemCarritoUseCase,
    private readonly checkoutCartUseCase: CheckoutCartUseCase,
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

  @Roles("cliente")
  @Patch("cart/items/:id")
  async actualizarItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarCantidadCarritoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Cart> {
    try {
      return await this.actualizarCantidadCarrito.ejecutar(usuario.id, id, dto.cantidad);
    } catch (error) {
      if (error instanceof LineaCarritoNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Roles("cliente")
  @Delete("cart/items/:id")
  async eliminarItem(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<Cart> {
    try {
      return await this.eliminarItemCarrito.ejecutar(usuario.id, id);
    } catch (error) {
      if (error instanceof LineaCarritoNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Roles("cliente")
  @Post("orders/checkout-cart")
  @HttpCode(200)
  async checkoutCart(
    @Body() dto: CheckoutCartDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CheckoutCartResult> {
    return this.checkoutCartUseCase.ejecutar(usuario.id, dto);
  }
}
