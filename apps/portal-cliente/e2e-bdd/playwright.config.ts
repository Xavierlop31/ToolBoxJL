import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * Conecta features/01_catalogo_inventario.feature a un runner real
 * (Playwright-BDD), per PROMPT_IMPLEMENTACION.md A.2 (Definition of Done
 * ampliada por SDD, Sprint 1 en adelante).
 *
 * Alcance de portal-cliente: solo RF-1.4 ("Cliente consulta disponibilidad
 * real de una herramienta por fechas"). RF-1.1 (alta de modelo) requiere un
 * formulario de Administrador en panel-admin, explícitamente fuera del
 * alcance de Frontend este sprint (ver PROMPT_IMPLEMENTACION.md, decisión
 * del Tech Lead #2) — no se conecta acá.
 */
const testDir = defineBddConfig({
  featuresRoot: path.join(__dirname, '../../../features'),
  features: path.join(__dirname, '../../../features/01_catalogo_inventario.feature'),
  steps: path.join(__dirname, 'steps/*.steps.ts'),
  tags: '@RF-1.4',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4201',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec ng serve --port 4201',
    url: 'http://localhost:4201',
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
