import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { ConsultarIngresosUseCase, type IngresosDesglosados } from "../application/consultar-ingresos.use-case";
import { PeriodoInvalidoError } from "../domain/errors/periodo-invalido.error";
import { ConsultarIngresosQueryDto } from "./dto/consultar-ingresos-query.dto";

/**
 * `/analytics/revenue` — Issue #19 (HU-7.1). `x-roles: [gerente, admin]` en
 * openapi.yaml, mismo patrón de guards que el resto de los endpoints
 * protegidos por RBAC.
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class AnalyticsController {
  constructor(private readonly consultarIngresos: ConsultarIngresosUseCase) {}

  @Roles("gerente", "admin")
  @Get("analytics/revenue")
  async revenue(@Query() query: ConsultarIngresosQueryDto): Promise<IngresosDesglosados> {
    try {
      return await this.consultarIngresos.ejecutar(query.periodo);
    } catch (error) {
      if (error instanceof PeriodoInvalidoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
