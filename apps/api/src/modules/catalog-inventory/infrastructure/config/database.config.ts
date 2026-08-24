/**
 * Lee y valida `DATABASE_URL` del entorno para las implementaciones Prisma
 * de este módulo. Mismo criterio que `loadSupabaseAuthConfig` (AuthModule,
 * Sprint 0): falla explícito, sin fallback silencioso ni modo mock — si
 * falta, `PrismaService` no debe instanciarse en un estado donde "funcione"
 * sin poder conectarse a la base real.
 *
 * Las implementaciones in-memory (infrastructure/in-memory) NO dependen de
 * esta función — por eso los steps de Cucumber (BDD, punto 5 del prompt del
 * Tech Lead) corren sin necesitar `DATABASE_URL` ni una base real.
 */
export function loadDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no está definida. Las implementaciones Prisma de " +
        "CatalogModule/InventoryModule no pueden conectarse a la base de " +
        "Supabase sin ella. Definila en el entorno — ver apps/api/.env.example. " +
        "(Para tests/BDD, usá las implementaciones in-memory en vez de las " +
        "reales de Prisma — no requieren DATABASE_URL.)",
    );
  }
  return databaseUrl;
}
