import type { Agente1ServiceCredentials, SupabaseRestConfig } from "./config";

/**
 * Puerto de autenticación del Agente 1 contra el usuario de servicio de
 * Supabase Auth (`agente-ruteo@toolboxjl.internal`,
 * `app_metadata.rol = "agente-1"`, poblado por el mismo Custom Access Token
 * Hook que ya puebla `rol`/`telefono` para usuarios humanos — decisión ya
 * tomada con el Arquitecto, ver prompt del sprint). Mismo criterio dual
 * real/in-memory que `WompiGateway`/`WhatsAppOtpGateway` en `apps/api`.
 */
export interface Agente1AuthGateway {
  /** Devuelve un JWT de acceso válido para usar como `Authorization: Bearer` contra `apps/api`. */
  obtenerAccessToken(): Promise<string>;
}

interface SupabaseTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  msg?: string;
}

/**
 * Implementación real — login REST directo contra GoTrue (Supabase Auth),
 * SIN el SDK completo de `@supabase/supabase-js` (instrucción explícita del
 * Tech Lead: este job no necesita nada más que el `access_token` del login).
 *
 * `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` con header
 * `apikey: SUPABASE_ANON_KEY` (GoTrue lo exige incluso para login con
 * email/password) y body `{email, password}` — mismo endpoint que usa
 * `supabase.auth.signInWithPassword()` internamente
 * (`apps/shell/src/app/core/auth/auth.service.ts`), solo que acá se llama
 * por HTTP plano en vez de instanciar el cliente JS completo.
 *
 * *** Es probable que las credenciales de `AGENTE_1_SERVICE_EMAIL`/
 * `AGENTE_1_SERVICE_PASSWORD` NO existan todavía como usuario real en
 * Supabase Auth de este proyecto *** — si GoTrue responde 400/401 (usuario
 * no existe, credenciales inválidas), esto lanza un error explícito con el
 * cuerpo de la respuesta. NO lo resuelvas mockeando el fallo ni inventando
 * una cuenta — es exactamente el bloqueo real que hay que reportarle al
 * Tech Lead (mismo protocolo que CLAUDE.md §7 punto 5) para que se lo pida
 * al Arquitecto. Mientras tanto, usá `InMemoryAgente1AuthGateway` (abajo)
 * para tests/BDD y para desarrollo local sin esa cuenta.
 */
export class SupabaseAgente1AuthGatewayService implements Agente1AuthGateway {
  constructor(
    private readonly credenciales: Agente1ServiceCredentials,
    private readonly supabase: SupabaseRestConfig,
  ) {}

  async obtenerAccessToken(): Promise<string> {
    const response = await fetch(`${this.supabase.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: this.supabase.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: this.credenciales.email,
        password: this.credenciales.password,
      }),
    });

    const cuerpo = (await response.json().catch(() => ({}))) as SupabaseTokenResponse;

    if (!response.ok || !cuerpo.access_token) {
      throw new Error(
        `Supabase Auth (GoTrue) respondió ${response.status} al intentar loguear al usuario de ` +
          `servicio del Agente 1 ("${this.credenciales.email}"). ` +
          `Detalle: ${cuerpo.error_description ?? cuerpo.msg ?? cuerpo.error ?? "<sin detalle>"}. ` +
          "Esto probablemente significa que el usuario de servicio agente-ruteo@toolboxjl.internal " +
          "todavía no existe en Supabase Auth con app_metadata.rol = \"agente-1\" — es un bloqueo " +
          "real, reportalo al Tech Lead en vez de reintentar con otras credenciales.",
      );
    }

    return cuerpo.access_token;
  }
}

/** Fake determinístico para tests/BDD y desarrollo local sin la cuenta de servicio — nunca llama a la red. */
export class InMemoryAgente1AuthGateway implements Agente1AuthGateway {
  constructor(private readonly tokenFalso: string = "fake-jwt-agente-1") {}

  async obtenerAccessToken(): Promise<string> {
    return this.tokenFalso;
  }
}
