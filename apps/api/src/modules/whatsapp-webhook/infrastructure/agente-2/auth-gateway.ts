import type { Agente2ServiceCredentials, SupabaseRestConfig } from "./config";

/**
 * Puerto de autenticación del Agente 2 contra su propio usuario de servicio
 * de Supabase Auth — copia directa de
 * `apps/workers/src/agente-1/auth-gateway.ts` (`Agente1AuthGateway`),
 * adaptada para `apps/api` (mismo mecanismo, "adaptalo" — instrucción
 * explícita del Tech Lead).
 */
export interface Agente2AuthGateway {
  obtenerAccessToken(): Promise<string>;
}

interface SupabaseTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  msg?: string;
}

/**
 * Implementación real — login REST directo contra GoTrue, sin el SDK
 * completo de `@supabase/supabase-js` (mismo criterio que
 * `SupabaseAgente1AuthGatewayService`).
 *
 * *** Es probable que las credenciales de `AGENTE_2_SERVICE_EMAIL`/
 * `AGENTE_2_SERVICE_PASSWORD` NO existan todavía como usuario real en
 * Supabase Auth de este proyecto *** — si GoTrue responde 400/401, esto
 * lanza un error explícito. NO se resuelve mockeando el fallo ni inventando
 * una cuenta — es el bloqueo real a reportar al Tech Lead (mismo protocolo
 * que Sprint 7). Mientras tanto, `InMemoryAgente2AuthGateway` cubre
 * tests/BDD y desarrollo local sin esa cuenta.
 */
export class SupabaseAgente2AuthGatewayService implements Agente2AuthGateway {
  constructor(
    private readonly credenciales: Agente2ServiceCredentials,
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
          `servicio del Agente 2 ("${this.credenciales.email}"). ` +
          `Detalle: ${cuerpo.error_description ?? cuerpo.msg ?? cuerpo.error ?? "<sin detalle>"}. ` +
          "Esto probablemente significa que el usuario de servicio agente-whatsapp@toolboxjl.internal " +
          "todavía no existe en Supabase Auth con app_metadata.rol = \"agente-2\" — es un bloqueo " +
          "real, reportalo al Tech Lead en vez de reintentar con otras credenciales.",
      );
    }

    return cuerpo.access_token;
  }
}

/** Fake determinístico para tests/BDD y desarrollo local sin la cuenta de servicio — nunca llama a la red. */
export class InMemoryAgente2AuthGateway implements Agente2AuthGateway {
  constructor(private readonly tokenFalso: string = "fake-jwt-agente-2") {}

  async obtenerAccessToken(): Promise<string> {
    return this.tokenFalso;
  }
}
