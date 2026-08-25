import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { Vehicle } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { RegistrarVehiculoUseCase } from "../application/registrar-vehiculo.use-case";
import { CrearVehiculoDto } from "./dto/crear-vehiculo.dto";

/** `/fleet/*` — protegido por JWT de Supabase + RBAC (openapi.yaml `x-roles`). */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class FleetController {
  constructor(private readonly registrarVehiculo: RegistrarVehiculoUseCase) {}

  @Roles("admin")
  @Post("fleet/vehicles")
  @HttpCode(201)
  async crear(@Body() dto: CrearVehiculoDto): Promise<Vehicle> {
    return this.registrarVehiculo.ejecutar(dto);
  }
}
