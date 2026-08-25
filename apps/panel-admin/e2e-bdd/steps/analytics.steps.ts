import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { When, Then } = createBdd();

/**
 * Steps de HU-7.1 (Issue #19) — features/07_kpis_analitica.feature.
 * El step "Dado que soy un Gerente autenticado" ya está definido en
 * shipments.steps.ts (RF-3.3) y se reutiliza acá tal cual — mismo texto
 * Gherkin, mismo criterio de rol; no se redefine para evitar un step
 * duplicado en el registro compartido de playwright-bdd.
 *
 * Interceptamos `GET /analytics/revenue` con `page.route`, respetando el
 * schema de respuesta de openapi.yaml (líneas 656-680): los 4 valores
 * (`ventas_directas`, `tarifas_alquiler`, `cobros_mora`, `total`) en COP.
 */
const mockRevenue = {
  ventas_directas: 5_000_000,
  tarifas_alquiler: 3_200_000,
  cobros_mora: 450_000,
  total: 8_650_000,
};

When('abro el dashboard de ingresos y selecciono un periodo', async ({ page }) => {
  await page.route('**/api/v1/analytics/revenue*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRevenue),
    });
  });

  await page.goto('/ingresos');
  await expect(page.getByTestId('revenue-breakdown')).toBeVisible();

  // Selecciono explícitamente un periodo (el escenario lo pide como acción
  // propia, aunque la carga inicial ya dispara la misma consulta).
  await page.fill('#periodo', '2026-08');
  await page.click('button[type="submit"]');
  await expect(page.getByTestId('revenue-breakdown')).toBeVisible();
});

Then(
  'veo los ingresos totales desglosados en Ventas Directas, Tarifas de Alquiler y Cobros por Mora para ese periodo',
  async ({ page }) => {
    await expect(page.getByTestId('revenue-ventas-directas')).toContainText(/5[.,]000[.,]000/);
    await expect(page.getByTestId('revenue-tarifas-alquiler')).toContainText(/3[.,]200[.,]000/);
    await expect(page.getByTestId('revenue-cobros-mora')).toContainText(/450[.,]000/);
    await expect(page.getByTestId('revenue-total')).toContainText(/8[.,]650[.,]000/);
  },
);
