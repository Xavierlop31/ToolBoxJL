import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import type { ToolModel } from "@toolboxjl/shared-types";
import { Public } from "../../auth/interface/decorators/public.decorator";
import { BuscarCatalogoUseCase } from "../application/buscar-catalogo.use-case";
import { ObtenerModeloPorIdUseCase } from "../application/obtener-modelo-por-id.use-case";
import { ModeloNoEncontradoError } from "../domain/errors/modelo-no-encontrado.error";
import { BuscarCatalogoQueryDto } from "./dto/buscar-catalogo.query.dto";

/**
 * `/catalog/*` — endpoints públicos (openapi.yaml `security: []`), sin
 * `SupabaseAuthGuard`/`RolesGuard`: ningún subagente/humano necesita estar
 * autenticado para navegar el catálogo (RF-1.1 descripción, RF-1.4 escenario
 * "Cliente navegando el catálogo").
 */
@Controller()
export class CatalogController {
  constructor(
    private readonly buscarCatalogo: BuscarCatalogoUseCase,
    private readonly obtenerModeloPorId: ObtenerModeloPorIdUseCase,
  ) {}

  @Public()
  @Get("catalog/search")
  async search(@Query() query: BuscarCatalogoQueryDto): Promise<ToolModel[]> {
    return this.buscarCatalogo.ejecutar(query);
  }

  @Public()
  @Get("catalog/models/:id")
  async porId(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ToolModel> {
    try {
      return await this.obtenerModeloPorId.ejecutar(id);
    } catch (error) {
      if (error instanceof ModeloNoEncontradoError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
