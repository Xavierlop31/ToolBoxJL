import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { loadDatabaseUrl } from "../config/database.config";

/**
 * Cliente Prisma real, conectado a la base de Supabase vía `DATABASE_URL`.
 * Falla explícito al construirse si la variable no está definida (ver
 * `loadDatabaseUrl`) — nunca se instancia en un estado "funcional" sin poder
 * conectarse de verdad. Solo la usan las implementaciones de repositorio de
 * `infrastructure/prisma/*` — las de `infrastructure/in-memory/*` (usadas en
 * BDD/Cucumber) no dependen de esta clase en absoluto.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const databaseUrl = loadDatabaseUrl();
    super({ datasources: { db: { url: databaseUrl } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
