/**
 * Los 5 roles humanos de usuario de la plataforma (docs/DESIGN.md §3, punto 7
 * — AuthModule — y §4.1, columna `USERS.rol`).
 *
 * Distinta de `ROLES` (ver abajo): esta lista es la que corresponde 1:1 a
 * `x-roles` en openapi.yaml para cualquier endpoint que NO declare
 * explícitamente un rol de agente de IA (ej. `auth/otp/*`, HU-6.2) — usarla
 * en vez de `ROLES` en esos casos evita que un `@Roles(...ROLES)` empiece a
 * aceptar de forma silenciosa un rol de servicio que el contrato no declara
 * para ese recurso.
 */
export const ROLES_HUMANOS = [
  "admin",
  "gerente",
  "almacenista",
  "repartidor",
  "cliente",
] as const;

/**
 * Todos los roles válidos de un claim `rol` de JWT: los 5 humanos más los
 * roles de servicio de los Agentes de IA que ya tienen JWT propio emitido
 * por AgentsModule (Sprint 7+; TRD §4, PROMPT_IMPLEMENTACION.md A.6).
 *
 * `"agente-1"` (Route Scheduler, Sprint 7) es el primero — `"agente-2"`
 * (WhatsApp) y `"agente-3"` (Voz) se agregan recién en sus propios sprints
 * (8/9), no antes, para no declarar acceso a un JWT de servicio que todavía
 * no existe.
 *
 * Es la fuente de verdad única para el conjunto de roles: tanto el guard de
 * RBAC de apps/api como cualquier frontend que necesite condicionar UI por
 * rol deben importar `Rol`/`ROLES`/`ROLES_HUMANOS` desde acá en lugar de
 * redeclarar la lista.
 */
export const ROLES = [...ROLES_HUMANOS, "agente-1"] as const;

export type Rol = (typeof ROLES)[number];

/** Type guard: valida que un valor arbitrario (ej. un claim de JWT) sea un Rol conocido. */
export function esRolValido(valor: unknown): valor is Rol {
  return (
    typeof valor === "string" && (ROLES as readonly string[]).includes(valor)
  );
}

/**
 * Valida y devuelve un Rol, o lanza si el valor no es uno de los roles
 * conocidos. Preferí esta función a un cast (`as Rol`) en cualquier punto
 * donde un rol entra al sistema desde una fuente externa (JWT, request body).
 */
export function asegurarRol(valor: unknown): Rol {
  if (!esRolValido(valor)) {
    throw new Error(
      `Rol inválido: "${String(valor)}". Los roles válidos son: ${ROLES.join(", ")}.`,
    );
  }
  return valor;
}
