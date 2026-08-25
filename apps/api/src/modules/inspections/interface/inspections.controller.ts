import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { InspectionChecklist } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { ShipmentNoEncontradoError } from "../../logistics/domain/errors/shipment-no-encontrado.error";
import { UnidadNoEncontradaError } from "../../catalog-inventory/domain/errors/unidad-no-encontrada.error";
import { RegistrarInspeccionUseCase } from "../application/registrar-inspeccion.use-case";
import { InspectionChecklistInputDto } from "./dto/inspection-checklist-input.dto";

/**
 * `/inspections` — protegido por JWT de Supabase + RBAC (x-roles:
 * [almacenista, repartidor] en openapi.yaml).
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class InspectionsController {
  constructor(private readonly registrarInspeccion: RegistrarInspeccionUseCase) {}

  @Roles("almacenista", "repartidor")
  @Post("inspections")
  @HttpCode(201)
  async registrar(@Body() dto: InspectionChecklistInputDto): Promise<InspectionChecklist> {
    try {
      return await this.registrarInspeccion.ejecutar({
        unidad_id: dto.unidad_id,
        shipment_id: dto.shipment_id,
        tipo: dto.tipo,
        hallazgos: dto.hallazgos,
        fotos_urls: dto.fotos_urls,
      });
    } catch (error) {
      if (error instanceof ShipmentNoEncontradoError || error instanceof UnidadNoEncontradaError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
