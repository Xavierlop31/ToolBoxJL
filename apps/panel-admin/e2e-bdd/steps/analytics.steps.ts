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

/**
 * Steps de HU-7.2 (Issue #20, Sprint 10) — features/07_kpis_analitica.feature.
 * Interceptamos `GET /analytics/roi` (openapi.yaml líneas 876-900);
 * `roi_pct` ya viene calculado por el backend según la fórmula del
 * escenario — esta UI solo lo consulta y muestra.
 */
const roiModeloId = '11111111-1111-1111-1111-111111111111';
const mockRoi = [{ modelo_id: roiModeloId, roi_pct: 42.5 }];

When('consulto el ROI de un modelo específico', async ({ page }) => {
  await page.route('**/api/v1/analytics/roi*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRoi),
    });
  });

  await page.goto('/roi');
  await page.fill('#modeloId', roiModeloId);
  await page.click('button[type="submit"]');
  await expect(page.getByTestId('roi-list')).toBeVisible();
});

Then(
  'el sistema calcula \\(Ingresos Acumulados − Costo de Compra\\) \\/ Costo de Compra × 100 para ese modelo',
  async ({ page }) => {
    await expect(page.getByTestId('roi-row')).toContainText(roiModeloId);
    await expect(page.getByTestId('roi-row')).toContainText(/42[.,]5%/);
  },
);

/**
 * Steps de HU-7.3 (Issue #21, Sprint 10) — features/07_kpis_analitica.feature.
 * Interceptamos `GET /analytics/utilization` y `GET
 * /analytics/delivery-productivity` (openapi.yaml líneas 902-950).
 */
const mockUtilization = {
  utilizacion_global_pct: 68.3,
  por_modelo: [{ modelo_id: roiModeloId, utilizacion_pct: 72.1 }],
};

const mockProductivity = [
  {
    repartidor_id: '22222222-2222-2222-2222-222222222222',
    entregas_exitosas: 18,
    ruta_asignada: 20,
    tiempo_promedio_min: 12.4,
  },
];

When(
  'consulto la tasa de utilización de inventario y la productividad de repartidores del mes',
  async ({ page }) => {
    await page.route('**/api/v1/analytics/utilization', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUtilization),
      });
    });
    await page.route('**/api/v1/analytics/delivery-productivity', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProductivity),
      });
    });

    await page.goto('/utilizacion-productividad');
    await expect(page.getByTestId('utilization-section')).toBeVisible();
  },
);

Then(
  'veo la Utilización como Días Alquilada entre Días Disponibles del mes',
  async ({ page }) => {
    await expect(page.getByTestId('utilization-global')).toContainText(/68[.,]3%/);
    await expect(page.getByTestId('utilization-row')).toContainText(/72[.,]1%/);
  },
);

Then(
  'veo la Productividad como Entregas Exitosas entre Ruta Asignada, junto con el tiempo promedio por punto',
  async ({ page }) => {
    const row = page.getByTestId('productivity-row');
    await expect(row).toContainText('18');
    await expect(row).toContainText('20');
    await expect(row).toContainText(/90%/); // 18/20 = 90%
    await expect(row).toContainText(/12[.,]4 min/);
  },
);
