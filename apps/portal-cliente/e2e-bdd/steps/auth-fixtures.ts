import type { Page } from '@playwright/test';

/**
 * `@supabase/supabase-js` decodifica el `access_token` como JWT real (para
 * leer claims como `exp`/`sub`) aunque nunca verifique la firma del lado del
 * cliente — un string cualquiera sin la forma `header.payload.signature`
 * hace que `getSession()` descarte la sesión persistida como inválida. Por
 * eso se arma un JWT con forma válida (base64url de header/payload reales)
 * con una firma inventada; alcanza porque nunca se verifica acá.
 */
function fakeJwt(payload: Record<string, unknown>): string {
  const base64Url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      // Cuantificador acotado ({0,2}, no `+`): el padding de base64 nunca
      // supera 2 caracteres `=`. Evita el patrón de backtracking
      // super-lineal sin acotar que marca sonar-typescript:S8786 (mismo
      // criterio que `scripts/generate-frontend-config.mjs`).
      .replace(/={0,2}$/, '');

  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const body = base64Url(payload);
  return `${header}.${body}.fake-signature-e2e`;
}

const FAKE_ACCESS_TOKEN = fakeJwt({
  sub: 'cliente-e2e-001',
  email: 'cliente-e2e@toolboxjl.dev',
  role: 'authenticated',
  aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const FAKE_SUPABASE_SESSION = {
  access_token: FAKE_ACCESS_TOKEN,
  refresh_token: 'jwt-fake-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'cliente-e2e-001', email: 'cliente-e2e@toolboxjl.dev' },
};

/**
 * Clave de `localStorage` donde `@supabase/supabase-js` persiste la sesión:
 * `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token` (algoritmo
 * interno de la librería). Depende del placeholder `supabase.url` de
 * `src/environments/environment.development.ts`
 * (`https://REEMPLAZAR-EN-LOCAL.supabase.co`) — OJO: `new URL(...).hostname`
 * normaliza a minúsculas (spec de URL), por eso la clave es
 * `reemplazar-en-local` en minúsculas aunque el placeholder del environment
 * esté en mayúsculas. FRÁGIL A PROPÓSITO Y DOCUMENTADO: si se reemplaza ese
 * placeholder por una URL real de sandbox, esta constante hay que
 * actualizarla en el mismo commit.
 */
const SUPABASE_AUTH_STORAGE_KEY = 'sb-reemplazar-en-local-auth-token';

/**
 * Simula un Cliente ya autenticado escribiendo una sesión de Supabase falsa
 * en `localStorage` ANTES de que cargue la app (`addInitScript`) — necesario
 * desde Sprint 12 (HU-11.1, auth-wall): `getQuote()`/`addItem()` en
 * `ModelDetailComponent` ahora exigen `AuthService.isAuthenticated()` antes
 * de llamar a la API, si no lo hay, cualquier escenario que dependía de que
 * esas llamadas pasen sin sesión (como si el auth-wall no existiera) se
 * cuelga esperando `[data-testid="quote-result"]`, que nunca aparece porque
 * el cliente redirigió a `/login` en su lugar.
 */
export async function prepararSesionAutenticada(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key as string, JSON.stringify(session));
    },
    [SUPABASE_AUTH_STORAGE_KEY, FAKE_SUPABASE_SESSION] as const,
  );
}
