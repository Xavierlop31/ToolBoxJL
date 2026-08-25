import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * Conecta features/06_autenticacion_seguridad.feature (Sprint 6, HU-6.2,
 * Issue #18) a un runner real (Playwright-BDD), Definition of Done ampliada
 * por SDD (CLAUDE.md §2).
 *
 * Solo el escenario `@HU-6.2` ("Verificación por OTP de WhatsApp en
 * dispositivo nuevo"). El primer escenario del feature ("Cliente inicia
 * sesión con correo/contraseña o con Google") es HU-6.1 (Sprint 0, Issue
 * #17) y no se toca acá — no tiene tag propio en el .feature todavía, así
 * que se lo excluye filtrando por `@HU-6.2` en vez de por archivo completo.
 *
 * No hay servidor de Supabase Auth real disponible en este entorno de CI/
 * agente — la sesión activa se simula sembrando `localStorage` con un
 * objeto de sesión válido para `@supabase/supabase-js` ANTES de que la app
 * cargue (`page.addInitScript`, ver steps/otp.steps.ts), mismo criterio que
 * los demás remotes mockean su backend con `page.route`.
 */
const testDir = defineBddConfig({
  featuresRoot: path.join(__dirname, '../../../features'),
  features: [path.join(__dirname, '../../../features/06_autenticacion_seguridad.feature')],
  steps: path.join(__dirname, 'steps/*.steps.ts'),
  tags: '@HU-6.2',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec ng serve --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
