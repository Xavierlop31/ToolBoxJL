/**
 * Los 5 roles de usuario de la plataforma (docs/DESIGN.md §3, punto 7 —
 * AuthModule — y §4.1, columna `USERS.rol`).
 *
 * Es la fuente de verdad única para el conjunto de roles: tanto el guard de
 * RBAC de apps/api como cualquier frontend que necesite condicionar UI por
 * rol deben importar `Rol`/`ROLES` desde acá en lugar de redeclarar la lista.
 */
export const ROLES = [
  "admin",
  "gerente",
  "almacenista",
  "repartidor",
  "cliente",
] as const;

export type Rol = (typeof ROLES)[number];

/** Type guard: valida que un valor arbitrario (ej. un claim de JWT) sea un Rol conocido. */
export function esRolValido(valor: unknown): valor is Rol {
  return (
    typeof valor === "string" && (ROLES as readonly string[]).includes(valor)
  );
}

/**
 * Valida y devuelve un Rol, o lanza si el valor no es uno de los 5 roles
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
