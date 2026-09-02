import { Injectable } from "@nestjs/common";
import type { User as PrismaUser } from "@prisma/client";
import type { Rol } from "@toolboxjl/shared-types";
import type { UserRepository, UsuarioBasico } from "../../domain/user.repository";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function aDominio(u: PrismaUser): UsuarioBasico {
  return {
    id: u.id,
    nombre: u.fullName ?? "",
    email: u.email,
    telefono: u.telefono,
    rol: u.rol as Rol,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `UserRepository`,
 * SOLO LECTURA sobre `public.users` (ver doc-comment de `UserRepository`).
 * Requiere `DATABASE_URL` — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<UsuarioBasico | null> {
    const encontrado = await this.prisma.user.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }
}
