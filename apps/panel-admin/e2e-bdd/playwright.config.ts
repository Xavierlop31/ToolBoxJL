import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * Conecta features/04_logistica_flota.feature (Sprint 4) y
 * features/07_kpis_analitica.feature (Sprint 6) a un runner real
 * (Playwright-BDD), Definition of Done ampliada por SDD (CLAUDE.md §2).
 *
 * Alcance de panel-admin:
 * - RF-3.1 (Issue #11): "Administrador registra un vehículo de la flota".
 * - RF-3.3 (Issue #12): "Gerente monitorea el estado de los envíos en
 *   tiempo real" — el smoke test cubre la carga inicial (GET) mostrando
 *   los 5 estados posibles; la actualización en vivo en sí (sin recargar)
 *   no es verificable de forma determinística en un test E2E sin mockear
 *   el WebSocket de Supabase Realtime, así que queda fuera de este smoke
 *   test (documentado también en steps/shipments.steps.ts).
 * - HU-7.1 (Issue #19): "Gerente consulta ingresos totales desglosados"
 *   — único escenario `@Fase1` de 07_kpis_analitica.feature; los otros dos
 *   (ROI, utilización) son `@Fase2` (Sprint 10) y quedan excluidos acá.
 *
 * RF-3.2 (recargo logístico por peso) es 100% backend (Issue #13, otra
 * rama en paralelo) y no tiene UI — no se incluye acá.
 */
const testDir = defineBddConfig({
  featuresRoot: path.join(__dirname, '../../../features'),
  features: [
    path.join(__dirname, '../../../features/04_logistica_flota.feature'),
    path.join(__dirname, '../../../features/07_kpis_analitica.feature'),
  ],
  steps: path.join(__dirname, 'steps/*.steps.ts'),
  tags: '@RF-3.1 or @RF-3.3 or @HU-7.1',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4203',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec ng serve --port 4203',
    url: 'http://localhost:4203',
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
