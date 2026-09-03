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
 * - HU-7.1 (Issue #19): "Gerente consulta ingresos totales desglosados".
 * - HU-7.2 (Issue #20, Sprint 10): "Gerente consulta el ROI por
 *   herramienta".
 * - HU-7.3 (Issue #21, Sprint 10): "Gerente consulta utilización de
 *   inventario y productividad de repartidores".
 * - HU-13.1 a HU-13.4 (Issues #147-#150, Sprint 14, Fase 3, Épica 13):
 *   panel de Gestión de Inventario QR — métricas, filtros/búsqueda de
 *   unidades, alta de unidad + QR imprimible, mantenimiento/bajas y "Rutas
 *   del Día" (features/13_gestion_inventario_qr.feature).
 * - HU-15.1 (Issue #153, Sprint 15, Fase 3, Épica 15): dashboard ejecutivo
 *   consolidado — 4 KPIs macrofinancieros y panel de Alertas Críticas
 *   (features/15_dashboard_kpis_gerencial.feature).
 *
 * RF-3.2 (recargo logístico por peso) es 100% backend (Issue #13, otra
 * rama en paralelo) y no tiene UI — no se incluye acá.
 */
const testDir = defineBddConfig({
  featuresRoot: path.join(__dirname, '../../../features'),
  features: [
    path.join(__dirname, '../../../features/04_logistica_flota.feature'),
    path.join(__dirname, '../../../features/07_kpis_analitica.feature'),
    path.join(__dirname, '../../../features/13_gestion_inventario_qr.feature'),
    path.join(__dirname, '../../../features/15_dashboard_kpis_gerencial.feature'),
  ],
  steps: path.join(__dirname, 'steps/*.steps.ts'),
  tags:
    '@RF-3.1 or @RF-3.3 or @HU-7.1 or @HU-7.2 or @HU-7.3 or @HU-13.1 or @HU-13.2 or @HU-13.3 or @HU-13.4 or @HU-15.1',
});

export default defineConfig({
  testDir,
  timeout: 30_000,
  fullyParallel: true,
  // Un solo worker: los 5 escenarios de este runner comparten una única
  // instancia de `ng serve` (webServer, más abajo) — no es un build de
  // producción, así que varios workers navegando en paralelo contra ese
  // mismo dev-server generan timeouts intermitentes en
  // `getByTestId(...).toBeVisible()` (observado al sumar los escenarios
  // de HU-7.2/HU-7.3, Sprint 10). `retries` da una segunda chance en CI si
  // igual queda alguna flaquera puntual.
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
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
