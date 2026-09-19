import { extractRolDeSesion, type SesionConRol } from "./extract-rol";
import { ROLES_HUMANOS } from "./rol";

function jwtConRol(rol: string): string {
  const payload = { app_metadata: { rol } };
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

describe("extractRolDeSesion", () => {
  it("devuelve 'cliente' si no hay sesión o no hay usuario", () => {
    expect(extractRolDeSesion(null)).toBe("cliente");
    expect(extractRolDeSesion(undefined)).toBe("cliente");
    expect(extractRolDeSesion({})).toBe("cliente");
  });

  it.each(ROLES_HUMANOS)("extrae el rol '%s' del JWT (claims.app_metadata.rol)", (rol) => {
    const session: SesionConRol = { access_token: jwtConRol(rol), user: {} };
    expect(extractRolDeSesion(session)).toBe(rol);
  });

  it("BUG CORREGIDO: prioriza el rol del JWT firmado sobre session.user.app_metadata desactualizado (custom_access_token_hook lo refresca en cada login, la fila de auth.users no)", () => {
    // Simula el escenario reportado: un usuario cuyo app_metadata.rol quedó
    // "almacenista" (seteado por el viejo procedimiento manual de SQL) pero
    // cuyo public.users.rol ya se actualizó a "gerente" — el hook lo
    // refleja en el JWT en el siguiente login/refresh.
    const session: SesionConRol = {
      access_token: jwtConRol("gerente"),
      user: { app_metadata: { rol: "almacenista" } },
    };

    expect(extractRolDeSesion(session)).toBe("gerente");
  });

  it("usa session.user.app_metadata como fallback cuando no hay access_token", () => {
    const session: SesionConRol = { user: { app_metadata: { rol: "repartidor" } } };
    expect(extractRolDeSesion(session)).toBe("repartidor");
  });

  it("usa session.user.app_metadata como fallback cuando el JWT no trae un rol válido (token malformado o sin ese claim)", () => {
    const session: SesionConRol = {
      access_token: "no-es-un-jwt-valido",
      user: { app_metadata: { rol: "repartidor" } },
    };
    expect(extractRolDeSesion(session)).toBe("repartidor");
  });

  it("extrae rol desde user_metadata si no viene en app_metadata", () => {
    const session: SesionConRol = { user: { user_metadata: { rol: "gerente" } } };
    expect(extractRolDeSesion(session)).toBe("gerente");
  });

  it("acepta la key 'role' (alias) tanto en app_metadata como user_metadata", () => {
    expect(extractRolDeSesion({ user: { app_metadata: { role: "admin" } } })).toBe("admin");
    expect(extractRolDeSesion({ user: { user_metadata: { role: "admin" } } })).toBe("admin");
  });

  it("asigna 'cliente' por defecto ante un rol no reconocido o ausente", () => {
    expect(extractRolDeSesion({ user: { user_metadata: {} } })).toBe("cliente");
    expect(extractRolDeSesion({ user: { app_metadata: { rol: "superadmin" } } })).toBe("cliente");
  });

  it("nunca devuelve un rol de servicio (agente-1/agente-2) aunque venga en el claim", () => {
    const session: SesionConRol = {
      access_token: jwtConRol("agente-1"),
      user: { app_metadata: { rol: "agente-1" } },
    };
    expect(extractRolDeSesion(session)).toBe("cliente");
  });
});
