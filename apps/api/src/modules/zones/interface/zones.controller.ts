import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../auth/interface/decorators/public.decorator";
import { ListarZonasUseCase } from "../application/listar-zonas.use-case";
import type { ZonaGeografica } from "../domain/zona-geografica";
import { ListarZonasQueryDto } from "./dto/listar-zonas.query.dto";

/**
 * `/zones` — endpoint público (openapi.yaml `security: []`), consultado
 * desde la ficha técnica del catálogo antes de que el visitante se
 * autentique (HU-12.2).
 */
@Controller()
export class ZonesController {
  constructor(private readonly listarZonas: ListarZonasUseCase) {}

  @Public()
  @Get("zones")
  async listar(@Query() query: ListarZonasQueryDto): Promise<ZonaGeografica[]> {
    return this.listarZonas.ejecutar(query.ciudad);
  }
}
