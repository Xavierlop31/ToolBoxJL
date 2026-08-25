import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { ConsultarMoraUseCase, type ComprobanteMora } from "../application/consultar-mora.use-case";
import { MoraNoEncontradaError } from "../domain/errors/mora-no-encontrada.error";

/**
 * `/billing/mora/{orderId}` — protegido por JWT de Supabase + RBAC
 * (x-roles: [cliente, admin] en openapi.yaml). Controller separado de
 * `InspectionsController` a propósito: roles y bounded context distintos
 * (facturación de mora, no checklist de inspección), aunque ambos viven en
 * `InspectionModule` (mismo criterio de agrupación que
 * CatalogController/InventoryController dentro de CatalogInventoryModule).
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class BillingController {
  constructor(private readonly consultarMora: ConsultarMoraUseCase) {}

  @Roles("cliente", "admin")
  @Get("billing/mora/:orderId")
  async obtenerMora(
    @Param("orderId", new ParseUUIDPipe()) orderId: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ComprobanteMora> {
    try {
      return await this.consultarMora.ejecutar(orderId, usuario);
    } catch (error) {
      if (error instanceof OrdenNoEncontradaError || error instanceof MoraNoEncontradaError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
