import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ToolModel, ToolModelInput } from "@toolboxjl/shared-types";
import type {
  FiltroBusquedaCatalogo,
  ResultadoBusquedaCatalogoPaginado,
  ToolModelRepository,
} from "../../domain/tool-model.repository";

/**
 * Implementación en memoria de `ToolModelRepository` — usada SOLO por los
 * tests unitarios y los steps de Cucumber (punto 3 del prompt del Tech
 * Lead): no requiere `DATABASE_URL` ni una base real. No usar en runtime de
 * producción.
 */
@Injectable()
export class InMemoryToolModelRepository implements ToolModelRepository {
  private readonly modelos = new Map<string, ToolModel>();

  async crear(input: ToolModelInput): Promise<ToolModel> {
    const modelo: ToolModel = {
      id: randomUUID(),
      nombre: input.nombre,
      marca: input.marca,
      categoria: input.categoria,
      potencia_w: input.potencia_w ?? null,
      peso_kg: input.peso_kg ?? null,
      volumen_m3: input.volumen_m3 ?? null,
      tarifa_dia: input.tarifa_dia,
      tarifa_semana: input.tarifa_semana ?? null,
      costo_compra: input.costo_compra ?? null,
      deposito_pct: input.deposito_pct ?? null,
      interes_mora_dia: input.interes_mora_dia ?? null,
      manual_pdf_url: input.manual_pdf_url ?? null,
      precio_venta: input.precio_venta ?? null,
      disponible_para_venta: input.disponible_para_venta ?? true,
    };
    this.modelos.set(modelo.id, modelo);
    return modelo;
  }

  async buscarPorId(id: string): Promise<ToolModel | null> {
    return this.modelos.get(id) ?? null;
  }

  async buscar(filtro: FiltroBusquedaCatalogo): Promise<ToolModel[]> {
    return this.filtrar(filtro);
  }

  async buscarPaginado(
    filtro: FiltroBusquedaCatalogo,
    page: number,
    pageSize: number,
  ): Promise<ResultadoBusquedaCatalogoPaginado> {
    const encontrados = this.filtrar(filtro);
    const inicio = (page - 1) * pageSize;
    return {
      items: encontrados.slice(inicio, inicio + pageSize),
      total: encontrados.length,
    };
  }

  private filtrar(filtro: FiltroBusquedaCatalogo): ToolModel[] {
    const q = filtro.q?.toLowerCase();
    return [...this.modelos.values()].filter((m) => {
      const coincideCategoria = filtro.categoria
        ? m.categoria === filtro.categoria
        : true;
      const coincideTexto = q
        ? m.nombre.toLowerCase().includes(q) ||
          m.marca.toLowerCase().includes(q) ||
          m.categoria.toLowerCase().includes(q)
        : true;
      return coincideCategoria && coincideTexto;
    });
  }
}
