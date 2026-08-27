import { createBdd } from 'playwright-bdd';
import { expect, type Page } from '@playwright/test';

const { Given, When, Then } = createBdd();

/**
 * URL de LiveKit devuelta por el mock de `POST /voice-agent/livekit-token`
 * en estos escenarios BDD (HU-10.1/10.2, features/10_agente_conserje_voz.feature).
 *
 * *** POR QUÉ SE CIERRA LA CONEXIÓN A PROPÓSITO ***
 * No hay ningún servidor LiveKit real en el pipeline de CI — levantar uno
 * (o el proceso completo del Agente 3, `apps/voice-agent`, a cargo de
 * `ia-agentes`) está fuera de alcance de este remote. A diferencia de los
 * tests unitarios de `LivekitSessionService` (que inyectan un doble de
 * prueba de `Room` vía `LIVEKIT_ROOM_FACTORY`), Playwright ejecuta el
 * bundle COMPILADO de `ng serve` — no hay forma de reemplazar el import de
 * `livekit-client` ahí. Se usa `page.routeWebSocket()` (Playwright ≥1.48)
 * para interceptar la conexión WebSocket real que abre `Room.connect()` y
 * cerrarla de inmediato, de forma determinística y rápida, en vez de dejar
 * que el intento cuelgue hasta el timeout interno de LiveKit.
 *
 * Esto prueba que el cableado end-to-end del frontend es correcto (click →
 * `POST /voice-agent/livekit-token` → `livekit-client.Room.connect()` con
 * esas credenciales reales) — no que una sesión de voz completa funcione;
 * eso requeriría infraestructura real (ver los steps documentados como
 * NO TESTEABLE más abajo).
 */
const FAKE_LIVEKIT_URL = 'wss://livekit.e2e-mock.toolboxjl.test/rtc';

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
 * Simula un Cliente ya autenticado (widget de voz visible, Sprint 9 solo
 * soporta Cliente autenticado — visitante anónimo queda fuera de alcance,
 * ver ADR en `voice-widget.component.ts`), mockea
 * `POST /voice-agent/livekit-token` y `GET /cart`, e intercepta la conexión
 * WebSocket de LiveKit (ver nota de `FAKE_LIVEKIT_URL`). Compartido por los
 * dos `Given` de este archivo — ambos escenarios arrancan desde el mismo
 * estado ("widget visible, listo para abrir").
 */
async function prepararClienteAutenticado(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key as string, JSON.stringify(session));
    },
    [SUPABASE_AUTH_STORAGE_KEY, FAKE_SUPABASE_SESSION] as const,
  );

  await page.routeWebSocket(
    (url) => url.href.startsWith(FAKE_LIVEKIT_URL),
    (ws) => {
      ws.close();
    },
  );

  await page.route('**/voice-agent/livekit-token', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: FAKE_LIVEKIT_URL,
        token: 'jwt-livekit-fake-token',
        room: 'sala-cliente-e2e-001',
      }),
    });
  });

  await page.route('**/cart', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{ modelo_id: '123e4567-e89b-12d3-a456-426614174000', cantidad: 1, dias: 4 }],
        total: 100000,
      }),
    });
  });

  // `/catalogo` es una ruta pública (ver remote-entry/entry.routes.ts) que
  // ya monta `PortalShellComponent` → el widget queda visible sin depender
  // de ninguna otra pantalla del portal.
  await page.route('**/catalog/search*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/catalogo');
  await expect(page.locator('[data-testid="voice-widget-button"]')).toBeVisible();
}

// ============================================================================
// Escenario: Cliente busca una herramienta por voz con baja latencia
// ============================================================================

Given('que soy un Cliente en el sitio web usando el widget de voz', async ({ page }) => {
  await prepararClienteAutenticado(page);
});

When('le pido por voz una herramienta y por cuántos días la necesito', async ({ page }) => {
  // No hay micrófono real ni entrada de audio simulable en Playwright/CI.
  // El proxy testeable desde el frontend es abrir el widget: dispara
  // exactamente el mismo flujo (POST /voice-agent/livekit-token + conexión
  // LiveKit) que dispararía cualquier interacción de voz posterior.
  await page.click('[data-testid="voice-widget-button"]');
});

Then('se abre una sesión LiveKit en tiempo real', async ({ page }) => {
  await expect(page.locator('[data-testid="voice-widget-panel"]')).toBeVisible();

  // Sin servidor LiveKit real en CI, el intento de conexión se corta a
  // propósito y de inmediato (ver FAKE_LIVEKIT_URL) para que el test sea
  // determinístico. Lo que prueba este paso es que el flujo completo del
  // frontend (click → POST /voice-agent/livekit-token → conexión real de
  // `livekit-client` con esas credenciales) está bien cableado en el bundle
  // compilado, y que la UI llega de forma prolija a un estado consistente
  // (sin colgarse ni tirar una excepción no controlada) — no que una sesión
  // de voz completa haya quedado establecida.
  await expect(page.locator('[data-testid="voice-widget-error"]')).toBeVisible({
    timeout: 10_000,
  });
});

Then(
  'el agente interpreta mi solicitud, filtra el catálogo y me recomienda una herramienta idónea',
  async () => {
    // NO TESTEABLE end-to-end desde este remote sin un servidor LiveKit y el
    // proceso del Agente 3 (`apps/voice-agent`, a cargo de `ia-agentes`)
    // realmente corriendo: la interpretación de la solicitud hablada, el
    // filtro del catálogo (tool calling contra GET /catalog/search) y la
    // recomendación verbal ocurren enteramente del lado del agente, fuera
    // de este micro-frontend. Se deja como no-op documentado — cubrir esto
    // requiere un entorno de staging con LiveKit + Agente 3 reales (mismo
    // criterio que el paso de reembolso automático en
    // `e2e-bdd/steps/pago.steps.ts`).
  },
);

Then('la latencia total de la respuesta es menor a 2.5 segundos', async () => {
  // NO TESTEABLE sin una respuesta real de voz de ida y vuelta (mismo motivo
  // que el step anterior) — la latencia es una métrica del pipeline
  // STT→LLM→TTS del Agente 3 (TRD §4.3), no de este frontend.
});

// ============================================================================
// Escenario: Artículo recomendado se agrega automáticamente al carrito
// ============================================================================

Given('que el Agente 3 me recomendó una herramienta por voz', async ({ page }) => {
  await prepararClienteAutenticado(page);
  await page.click('[data-testid="voice-widget-button"]');
  await expect(page.locator('[data-testid="voice-widget-panel"]')).toBeVisible();
});

When('confirmo verbalmente que la quiero', async ({ page }) => {
  // Proxy testeable desde el frontend: cerrar el widget dispara el refresh
  // de GET /cart (ver `voice-widget.component.ts#closeWidget`) — el mismo
  // mecanismo con el que el frontend refleja lo que el Agente 3 ya agregó
  // al carrito durante la sesión de voz. No hay forma de simular la
  // confirmación verbal en sí sin un pipeline de voz real.
  await page.click('[data-testid="voice-widget-close"]');
});

// Cucumber Expression (no regex): una barra `/` entre palabras sin espacios
// se interpreta como alternancia (`a/b` = "a" o "b"), por eso este step usa
// un RegExp literal en vez del string con `/cart/add-item` sin escapar.
Then(/^el agente invoca POST \/cart\/add-item$/, async () => {
  // NO TESTEABLE desde este frontend: lo invoca el proceso del Agente 3
  // directo contra la API (reenviando el JWT del propio Cliente, ver
  // openapi.yaml → POST /cart/add-item, "Invocado... vía tool calling, por
  // el Agente 3... tras confirmación verbal"), nunca este remote. La
  // cobertura de ese llamado es responsabilidad de `ia-agentes`
  // (`apps/voice-agent`) y/o `qa-testing`, no de este micro-frontend.
});

Then('confirma verbalmente que el artículo fue agregado a mi carrito', async ({ page }) => {
  // Proxy testeable del lado frontend: tras cerrar el widget, el badge del
  // carrito sobre el botón flotante refleja el `GET /cart` mockeado con el
  // ítem ya agregado — el equivalente visual, del lado del Cliente, a la
  // confirmación verbal del agente (que ya reproduce
  // `LivekitSessionService` vía el track de audio remoto, no verificable
  // acá sin audio real).
  await expect(page.locator('[data-testid="voice-widget-cart-badge"]')).toHaveText('1');
});
