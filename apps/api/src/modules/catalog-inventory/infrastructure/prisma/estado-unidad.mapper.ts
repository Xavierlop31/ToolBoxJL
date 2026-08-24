import { EstadoUnidad as PrismaEstadoUnidad } from "@prisma/client";
import type { EstadoUnidad } from "@toolboxjl/shared-types";

/**
 * Los identificadores de enum de Prisma no admiten espacios ("En
 * Mantenimiento" / "Dado de Baja" del contrato de API se mapean a
 * `EnMantenimiento` / `DadoDeBaja` en el schema, con `@map` fijando el valor
 * real de columna en Postgres — ver prisma/schema.prisma). Estas funciones
 * traducen entre ambas representaciones en el borde del repositorio, para
 * que el resto de la app (domain/application/interface) solo conozca los
 * valores con espacio del contrato de API.
 */
export function estadoADominio(valor: PrismaEstadoUnidad): EstadoUnidad {
  switch (valor) {
    case PrismaEstadoUnidad.Nuevo:
      return "Nuevo";
    case PrismaEstadoUnidad.Excelente:
      return "Excelente";
    case PrismaEstadoUnidad.Operativo:
      return "Operativo";
    case PrismaEstadoUnidad.EnMantenimiento:
      return "En Mantenimiento";
    case PrismaEstadoUnidad.DadoDeBaja:
      return "Dado de Baja";
    default: {
      const _exhaustivo: never = valor;
      throw new Error(`Valor de EstadoUnidad de Prisma no reconocido: ${_exhaustivo}`);
    }
  }
}

export function estadoAPrisma(valor: EstadoUnidad): PrismaEstadoUnidad {
  switch (valor) {
    case "Nuevo":
      return PrismaEstadoUnidad.Nuevo;
    case "Excelente":
      return PrismaEstadoUnidad.Excelente;
    case "Operativo":
      return PrismaEstadoUnidad.Operativo;
    case "En Mantenimiento":
      return PrismaEstadoUnidad.EnMantenimiento;
    case "Dado de Baja":
      return PrismaEstadoUnidad.DadoDeBaja;
    default: {
      const _exhaustivo: never = valor;
      throw new Error(`EstadoUnidad no reconocido: ${_exhaustivo}`);
    }
  }
}
