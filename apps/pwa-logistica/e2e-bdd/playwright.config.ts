import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * Conecta features/01_catalogo_inventario.feature a un runner real
 * (Playwright-BDD), per PROMPT_IMPLEMENTACION.md A.2.
 *
 * Alcance de pwa-logistica: RF-1.2 ("el QR es escaneable desde la PWA") y
 * RF-1.3 (cambio de estado de una unidad). El escaneo con cámara real se
 * mockea (ver e2e-bdd/steps/inventory.steps.ts y el seam
 * `window.__E2E_QR_MOCK__` en QrScannerComponent) — no depende de una
 * cámara real, requisito explícito para correr en CI.
 */
const testDir = defineBddConfig({
  features: '../../../features/01_catalogo_inventario.feature',
  steps: 'steps/*.steps.ts',
  tags: '@RF-1.2 or @RF-1.3',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4202',
    trace: 'retain-on-failure',
    permissions: ['camera'],
  },
  webServer: {
    command: 'pnpm exec ng serve --configuration development --port 4202',
    url: 'http://localhost:4202',
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
