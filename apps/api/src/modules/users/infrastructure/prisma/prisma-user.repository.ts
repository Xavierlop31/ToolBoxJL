import { Injectable } from "@nestjs/common";
import type { Prisma, User as PrismaUser } from "@prisma/client";
import type { RolHumano } from "@toolboxjl/shared-types";
import type {
  CambiosUsuario,
  FiltroListarUsuarios,
  UserRepository,
  UsuarioBasico,
} from "../../domain/user.repository";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function aDominio(u: PrismaUser): UsuarioBasico {
  return {
    id: u.id,
    nombre: u.fullName ?? "",
    email: u.email,
    telefono: u.telefono,
    rol: u.rol as RolHumano,
    activo: u.activo,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `UserRepository`.
 * Requiere `DATABASE_URL` — no se usa en tests/BDD.
 *
 * Épica 16: `listar`/`actualizar` son las PRIMERAS escrituras de este
 * repositorio sobre `public.users` — ver doc-comment de `UserRepository`.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<UsuarioBasico | null> {
    const encontrado = await this.prisma.user.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }

  async listar(filtro: FiltroListarUsuarios): Promise<{ items: UsuarioBasico[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(filtro.q
        ? {
            OR: [
              { fullName: { contains: filtro.q, mode: "insensitive" } },
              { email: { contains: filtro.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filtro.rol ? { rol: filtro.rol } : {}),
      ...(filtro.activo !== undefined ? { activo: filtro.activo } : {}),
    };

    const [total, encontrados] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { fullName: "asc" },
        skip: (filtro.page - 1) * filtro.pageSize,
        take: filtro.pageSize,
      }),
    ]);

    return { items: encontrados.map(aDominio), total };
  }

  async actualizar(id: string, cambios: CambiosUsuario): Promise<UsuarioBasico | null> {
    try {
      const actualizado = await this.prisma.user.update({
        where: { id },
        data: {
          ...(cambios.rol !== undefined ? { rol: cambios.rol } : {}),
          ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
        },
      });
      return aDominio(actualizado);
    } catch (error) {
      // P2025 = "Record to update not found" — Prisma lanza en vez de
      // devolver null (a diferencia de findUnique), se traduce acá al mismo
      // contrato que el resto de este repositorio.
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }
}
