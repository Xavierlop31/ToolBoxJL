import { Inject, Injectable } from "@nestjs/common";
import type {
  EstadoVisualizacionUnidad,
  ListarUnidadesResultado,
  ToolUnitListado,
} from "@toolboxjl/shared-types";
import {
  QR_CODE_GENERATOR,
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { ToolModelRepository } from "../domain/tool-model.repository";
import type { QrCodeGenerator } from "../domain/qr-code-generator";
import { calcularEstadoVisualizacionUnidad } from "../domain/estado-visualizacion-unidad";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";

export interface ListarUnidadesInput {
  q?: string;
  estado?: EstadoVisualizacionUnidad;
  page?: number;
  pageSize?: number;
}

/**
 * `GET /inventory/units` (HU-13.1, Sprint 14) — tabla filtrable del panel
 * `/logistica/inventario`.
 *
 * Decisión de diseño: filtrado (texto libre + estado de visualización) y
 * paginación ocurren ACÁ, en memoria, sobre TODAS las unidades
 * (`ToolUnitRepository.listarTodos()`) — no en una consulta paginada a nivel
 * de repositorio (a diferencia de `ToolModelRepository.buscarPaginado`,
 * Sprint 12). Motivo: `estado_visualizacion` ("En Alquiler") depende de un
 * cruce con `OrderRepository` (bounded context distinto, mismo criterio que
 * `ConsultarDisponibilidadUseCase`) que `ToolUnitRepository` no puede
 * resolver por sí solo sin acoplarse a Orders. Aceptable a la escala de este
 * proyecto (académico, sin volumen real de miles de unidades) — mismo
 * criterio de riesgo aceptado que `RoiRepository`/`UtilizationRepository`
 * (analytics), que también agregan en memoria/SQL completo sin paginar en
 * origen.
 *
 * El QR (`qr_code_url`) se genera SOLO para las unidades de la página
 * resultante, no para las 100% de las unidades filtradas — evita el costo de
 * generar cientos de QR en cada request cuando el cliente solo pidió 20.
 */
@Injectable()
export class ListarUnidadesUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(QR_CODE_GENERATOR)
    private readonly qr: QrCodeGenerator,
  ) {}

  async ejecutar(filtro: ListarUnidadesInput): Promise<ListarUnidadesResultado> {
    const page = filtro.page ?? 1;
    const pageSize = filtro.pageSize ?? 20;

    const [todasLasUnidades, todosLosModelos, idsEnAlquiler] = await Promise.all([
      this.unidades.listarTodos(),
      this.modelos.buscar({}),
      this.ordenes.listarUnidadesEnAlquilerActivo(),
    ]);

    const modeloPorId = new Map(todosLosModelos.map((m) => [m.id, m]));
    const enAlquilerSet = new Set(idsEnAlquiler);

    const decoradas = todasLasUnidades.map((unidad) => {
      const modelo = modeloPorId.get(unidad.modelo_id);
      return {
        unidad,
        modeloNombre: modelo?.nombre ?? "",
        modeloCategoria: modelo?.categoria ?? "",
        estadoVisualizacion: calcularEstadoVisualizacionUnidad(
          unidad.estado,
          enAlquilerSet.has(unidad.id),
        ),
      };
    });

    const qNormalizado = filtro.q?.trim().toLowerCase();
    const filtradas = decoradas.filter((d) => {
      if (filtro.estado && d.estadoVisualizacion !== filtro.estado) {
        return false;
      }
      if (qNormalizado) {
        const coincide =
          d.unidad.id.toLowerCase().includes(qNormalizado) ||
          d.unidad.numero_serie.toLowerCase().includes(qNormalizado) ||
          d.modeloNombre.toLowerCase().includes(qNormalizado);
        if (!coincide) {
          return false;
        }
      }
      return true;
    });

    const total = filtradas.length;
    const inicio = (page - 1) * pageSize;
    const pagina = filtradas.slice(inicio, inicio + pageSize);

    const items: ToolUnitListado[] = await Promise.all(
      pagina.map(async (d): Promise<ToolUnitListado> => ({
        ...d.unidad,
        qr_code_url: await this.qr.generar(d.unidad.id),
        modelo_nombre: d.modeloNombre,
        modelo_categoria: d.modeloCategoria,
        estado_visualizacion: d.estadoVisualizacion,
      })),
    );

    return { items, total, page, pageSize };
  }
}
