import { ROLES_HUMANOS, type RolHumano } from "./rol";

/**
 * Forma mínima de una sesión de la que se puede extraer el rol — duck-typed
 * a propósito (no `Session` de `@supabase/supabase-js`) para no agregarle a
 * este paquete una dependencia de un SDK de cliente que `apps/api` (Node)
 * no necesita. `Session` de `@supabase/auth-js` satisface esta forma
 * estructuralmente, así que cualquier frontend puede pasarla tal cual.
 */
export interface SesionConRol {
  access_token?: string | null;
  user?: {
    app_metadata?: Record<string, unknown> | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
}

function esRolHumanoValido(valor: unknown): valor is RolHumano {
  return typeof valor === "string" && (ROLES_HUMANOS as readonly string[]).includes(valor);
}

/**
 * Rol tal como lo dejó `custom_access_token_hook` (migración
 * `20260830120000_custom_access_token_hook` de `apps/api`) en
 * `claims.app_metadata.rol` del JWT FIRMADO — se refresca en cada
 * login/refresh de token, a diferencia de `session.user.app_metadata` (ver
 * `extractRolDeSesion`).
 */
function extractRolDelJwt(accessToken: string | null | undefined): RolHumano | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    const jwtRol = payload.rol ?? payload.role ?? payload.app_metadata?.rol ?? payload.user_metadata?.rol;
    return esRolHumanoValido(jwtRol) ? jwtRol : null;
  } catch {
    return null;
  }
}

/**
 * Extrae el rol humano efectivo de una sesión de Supabase Auth —
 * originalmente duplicada línea por línea entre `apps/shell`
 * (`auth.service.ts`) y `apps/panel-admin` (`role.service.ts`); se
 * centraliza acá porque `RolHumano`/`ROLES_HUMANOS` ya viven en este
 * paquete y cualquier frontend que condicione UI por rol debe usarlos
 * (ver doc-comment de `rol.ts`).
 *
 * *** BUG CORREGIDO ***: `session.user.app_metadata`/`user_metadata` NO son
 * el claim del JWT firmado — son la serialización de `auth.users` que
 * GoTrue devuelve junto al token, y ESA columna solo se actualiza cuando
 * algo hace `auth.admin.updateUserById`/`UPDATE auth.users` directamente
 * (el viejo procedimiento manual por SQL). El endpoint de gestión de
 * usuarios (`PATCH /admin/users/{id}`) solo actualiza `public.users.rol` —
 * el rol correcto y FRESCO viaja en el JWT vía `custom_access_token_hook`,
 * que sí lee `public.users.rol` en cada login. Por eso acá se decodifica el
 * JWT PRIMERO; `session.user.app_metadata`/`user_metadata` quedan como
 * fallback únicamente para sesiones sin ese claim (p. ej. cuentas de
 * servicio creadas por Admin API con `app_metadata.rol` seteado directo,
 * sin pasar por el hook).
 */
export function extractRolDeSesion(session: SesionConRol | null | undefined): RolHumano {
  if (!session?.user) return "cliente";

  const jwtRol = extractRolDelJwt(session.access_token);
  if (jwtRol) {
    return jwtRol;
  }

  const rawRol =
    session.user.app_metadata?.["rol"] ??
    session.user.user_metadata?.["rol"] ??
    session.user.app_metadata?.["role"] ??
    session.user.user_metadata?.["role"];

  return esRolHumanoValido(rawRol) ? rawRol : "cliente";
}
