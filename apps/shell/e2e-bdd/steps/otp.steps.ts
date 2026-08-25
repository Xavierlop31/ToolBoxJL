import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

/**
 * Steps de HU-6.2 (Issue #18) — features/06_autenticacion_seguridad.feature
 * @HU-6.2: "Verificación por OTP de WhatsApp en dispositivo nuevo".
 *
 * No hay servidor de Supabase Auth real en este entorno: en vez de ejercer
 * `signInWithPassword`/`signInWithOAuth`, sembramos `localStorage` con una
 * sesión ya válida para `@supabase/supabase-js` ANTES de que la app cargue
 * (`page.addInitScript`) — la clave `sb-<host>-auth-token` y la forma del
 * objeto sesión (`access_token`/`refresh_token`/`expires_at` + `user`) son
 * las que `GoTrueClient` espera encontrar en storage
 * (`node_modules/@supabase/auth-js/src/GoTrueClient.ts`, `_recoverAndRefresh`
 * / `_isValidSession`); con `expires_at` lejos en el futuro no intenta
 * refrescar el token contra la red, así que no hace falta un backend de
 * Supabase real para que `AuthService.session()` quede poblado.
 *
 * `sb-reemplazar-en-local-auth-token` es la clave derivada del
 * `environment.development.ts` de apps/shell (placeholder de Supabase URL,
 * `https://REEMPLAZAR-EN-LOCAL.supabase.co` — `new URL(...).hostname`
 * siempre normaliza a minúsculas por spec, de ahí el `reemplazar-en-local`
 * en minúscula acá aunque el placeholder esté en mayúsculas). `ng serve`
 * (webServer de este runner) sirve la configuración `development`.
 *
 * El backend (`/auth/otp/request`, `/auth/otp/verify`) corre en paralelo en
 * otra rama: mockeamos ambos con `page.route`, respetando el contrato de
 * openapi.yaml (líneas 66-145).
 */
const SUPABASE_STORAGE_KEY = 'sb-reemplazar-en-local-auth-token';
const CODIGO_CORRECTO = '123456';

const fakeSession = {
  access_token: 'e2e-fake-access-token',
  refresh_token: 'e2e-fake-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'e2e-usuario-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'usuario-dispositivo-nuevo@toolboxjl.com',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

Given(
  'que soy un usuario iniciando sesión desde un dispositivo nuevo o registrándome por primera vez',
  async ({ page }) => {
    await page.addInitScript(
      ({ storageKey, session }) => {
        localStorage.setItem(storageKey, JSON.stringify(session));
        // Dispositivo nuevo: sin device_id ni verificaciones previas guardadas.
        localStorage.removeItem('tbjl_device_id');
        localStorage.removeItem('tbjl_verified_devices');
      },
      { storageKey: SUPABASE_STORAGE_KEY, session: fakeSession },
    );

    await page.route('**/api/v1/auth/otp/request', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          otp_id: 'otp-e2e-1',
          expira_en: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.route('**/api/v1/auth/otp/verify', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = route.request().postDataJSON() as { codigo: string; device_id: string };

      if (body.codigo === CODIGO_CORRECTO) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ verificado: true, device_id: body.device_id }),
        });
      }

      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Código incorrecto, OTP expirado, o ya consumido.',
        }),
      });
    });
  },
);

When('el sistema detecta el dispositivo nuevo o el registro', async ({ page }) => {
  // El sistema "detecta" el dispositivo nuevo al intentar acceder a una
  // ruta protegida: authGuard ve sesión activa + dispositivo no verificado
  // y redirige a /verificar-dispositivo, que dispara el POST /auth/otp/
  // request automáticamente (OtpVerifyComponent.ngOnInit).
  await page.goto('/home');
  await expect(page).toHaveURL(/\/verificar-dispositivo$/);
  await expect(page.getByTestId('otp-verify-screen')).toBeVisible();
});

Then('se genera un OTP de 6 dígitos y se envía por WhatsApp Cloud API', async ({ page }) => {
  // El código en sí nunca se devuelve en la respuesta (openapi.yaml línea
  // 75); lo verificable desde la UI es que el flujo de envío se disparó:
  // la pantalla muestra la cuenta regresiva hasta `expira_en`, y el campo
  // para ingresar el código de 6 dígitos está listo.
  await expect(page.getByTestId('otp-countdown')).toBeVisible();
  await expect(page.locator('#codigo')).toHaveAttribute('maxlength', '6');
});

Then(
  'mi acceso queda bloqueado hasta que ingrese el OTP correcto antes de que expire',
  async ({ page }) => {
    // Intentar navegar directo a una ruta protegida mientras el
    // dispositivo sigue sin verificar: el guard rebota de nuevo acá.
    await page.goto('/home');
    await expect(page).toHaveURL(/\/verificar-dispositivo$/);
    // page.goto es una recarga completa: el componente vuelve a solicitar
    // un OTP nuevo en su ngOnInit — hay que esperar a que esa llamada
    // resuelva (otp-countdown visible) antes de interactuar, o el botón de
    // verificar todavía está deshabilitado / `otpId()` sigue null.
    await expect(page.getByTestId('otp-countdown')).toBeVisible();

    // Código incorrecto: error visible, acceso sigue bloqueado.
    await page.fill('#codigo', '000000');
    await page.click('[data-testid="otp-verify-submit"]');
    await expect(page.getByTestId('otp-error')).toBeVisible();
    await expect(page).toHaveURL(/\/verificar-dispositivo$/);

    // Código correcto antes de expirar: se desbloquea el acceso.
    await page.fill('#codigo', CODIGO_CORRECTO);
    await page.click('[data-testid="otp-verify-submit"]');
    await expect(page).toHaveURL(/\/home$/);
  },
);
