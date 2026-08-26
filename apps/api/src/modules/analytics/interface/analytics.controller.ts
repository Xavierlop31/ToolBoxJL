import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { ConsultarIngresosUseCase, type IngresosDesglosados } from "../application/consultar-ingresos.use-case";
import { ConsultarRoiUseCase, type RoiPorModelo } from "../application/consultar-roi.use-case";
import {
  ConsultarUtilizacionUseCase,
  type UtilizacionRespuesta,
} from "../application/consultar-utilizacion.use-case";
import {
  ConsultarProductividadRepartidoresUseCase,
  type ProductividadRespuesta,
} from "../application/consultar-productividad-repartidores.use-case";
import { PeriodoInvalidoError } from "../domain/errors/periodo-invalido.error";
import { ConsultarIngresosQueryDto } from "./dto/consultar-ingresos-query.dto";
import { ConsultarRoiQueryDto } from "./dto/consultar-roi-query.dto";

/**
 * `/analytics/revenue` (Issue #19, HU-7.1) + `/analytics/roi`,
 * `/analytics/utilization`, `/analytics/delivery-productivity` (Issues
 * #20/#21, HU-7.2/7.3, Sprint 10). `x-roles: [gerente, admin]` en
 * openapi.yaml para los 4, mismo patrón de guards que el resto de los
 * endpoints protegidos por RBAC.
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class AnalyticsController {
  constructor(
    private readonly consultarIngresos: ConsultarIngresosUseCase,
    private readonly consultarRoi: ConsultarRoiUseCase,
    private readonly consultarUtilizacion: ConsultarUtilizacionUseCase,
    private readonly consultarProductividad: ConsultarProductividadRepartidoresUseCase,
  ) {}

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

  @Roles("gerente", "admin")
  @Get("analytics/roi")
  async roi(@Query() query: ConsultarRoiQueryDto): Promise<RoiPorModelo[]> {
    return this.consultarRoi.ejecutar(query.modelo_id);
  }

  @Roles("gerente", "admin")
  @Get("analytics/utilization")
  async utilization(): Promise<UtilizacionRespuesta> {
    return this.consultarUtilizacion.ejecutar();
  }

  @Roles("gerente", "admin")
  @Get("analytics/delivery-productivity")
  async deliveryProductivity(): Promise<ProductividadRespuesta[]> {
    return this.consultarProductividad.ejecutar();
  }
}
