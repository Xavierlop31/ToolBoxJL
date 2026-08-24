import { Injectable } from "@nestjs/common";
import type { ToolModel as PrismaToolModel } from "@prisma/client";
import type { ToolModel, ToolModelInput } from "@toolboxjl/shared-types";
import type {
  FiltroBusquedaCatalogo,
  ToolModelRepository,
} from "../../domain/tool-model.repository";
import { PrismaService } from "./prisma.service";

function aDominio(m: PrismaToolModel): ToolModel {
  return {
    id: m.id,
    nombre: m.nombre,
    marca: m.marca,
    categoria: m.categoria,
    potencia_w: m.potenciaW,
    peso_kg: m.pesoKg,
    volumen_m3: m.volumenM3,
    tarifa_dia: m.tarifaDia,
    tarifa_semana: m.tarifaSemana,
    costo_compra: m.costoCompra,
    deposito_pct: m.depositoPct,
    interes_mora_dia: m.interesMoraDia,
    manual_pdf_url: m.manualPdfUrl,
    disponible_para_venta: m.disponibleParaVenta,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `ToolModelRepository`.
 * Requiere `DATABASE_URL` (ver `PrismaService`) — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaToolModelRepository implements ToolModelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: ToolModelInput): Promise<ToolModel> {
    const creado = await this.prisma.toolModel.create({
      data: {
        nombre: input.nombre,
        marca: input.marca,
        categoria: input.categoria,
        potenciaW: input.potencia_w ?? undefined,
        pesoKg: input.peso_kg ?? undefined,
        volumenM3: input.volumen_m3 ?? undefined,
        tarifaDia: input.tarifa_dia,
        tarifaSemana: input.tarifa_semana ?? undefined,
        costoCompra: input.costo_compra ?? undefined,
        depositoPct: input.deposito_pct ?? undefined,
        interesMoraDia: input.interes_mora_dia ?? undefined,
        manualPdfUrl: input.manual_pdf_url ?? undefined,
        disponibleParaVenta: input.disponible_para_venta ?? true,
      },
    });
    return aDominio(creado);
  }

  async buscarPorId(id: string): Promise<ToolModel | null> {
    const encontrado = await this.prisma.toolModel.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }

  async buscar(filtro: FiltroBusquedaCatalogo): Promise<ToolModel[]> {
    const encontrados = await this.prisma.toolModel.findMany({
      where: {
        ...(filtro.categoria ? { categoria: filtro.categoria } : {}),
        ...(filtro.q
          ? {
              OR: [
                { nombre: { contains: filtro.q, mode: "insensitive" } },
                { marca: { contains: filtro.q, mode: "insensitive" } },
                { categoria: { contains: filtro.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });
    return encontrados.map(aDominio);
  }
}
