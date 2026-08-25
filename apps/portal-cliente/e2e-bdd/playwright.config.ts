import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * Conecta features/01_catalogo_inventario.feature (Sprint 1),
 * features/02_cotizacion_alquiler_venta.feature (Sprint 2) y
 * features/03_pagos_garantia.feature (Sprint 3) a un runner real
 * (Playwright-BDD), per PROMPT_IMPLEMENTACION.md A.2 (Definition of Done
 * ampliada por SDD, Sprint 1 en adelante).
 *
 * Alcance de portal-cliente:
 * - RF-1.4 (Sprint 1): "Cliente consulta disponibilidad real de una
 *   herramienta por fechas".
 * - RF-2.1 (Sprint 2): "Cliente cotiza el costo de un alquiler".
 * - RF-2.2 (Sprint 2/3): "Cliente compra una herramienta directamente en
 *   lugar de alquilarla" (tag agregado por el Tech Lead — el escenario
 *   original no tenía @RF-x.x, inconsistente con el resto del archivo) /
 *   "Cliente paga una orden con distintos métodos", incluidos los dos
 *   escenarios de depósito de garantía (hold con tarjeta; cobro+reembolso
 *   con PSE/contra entrega) — el reembolso en sí es Sprint 5 (inspección),
 *   acá solo se verifica que el pago se procesó según el método (Sprint 3).
 *
 * RF-1.1 (alta de modelo, panel-admin) y RF-2.4 (split de pagos,
 * backend-only) quedan fuera de alcance de este remote — no se incluyen.
 */
const testDir = defineBddConfig({
  featuresRoot: path.join(__dirname, '../../../features'),
  features: [
    path.join(__dirname, '../../../features/01_catalogo_inventario.feature'),
    path.join(__dirname, '../../../features/02_cotizacion_alquiler_venta.feature'),
    path.join(__dirname, '../../../features/03_pagos_garantia.feature'),
  ],
  steps: path.join(__dirname, 'steps/*.steps.ts'),
  tags: '@RF-1.4 or @RF-2.1 or @RF-2.2',
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
