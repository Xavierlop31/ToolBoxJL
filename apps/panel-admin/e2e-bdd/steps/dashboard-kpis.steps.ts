import { Page, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

/**
 * Steps de HU-15.1 (Sprint 15, Fase 3, Épica 15 — Issue #153) —
 * features/15_dashboard_kpis_gerencial.feature. Igual que el resto de este
 * runner (analytics.steps.ts, inventory.steps.ts): interceptamos
 * `GET /analytics/dashboard-kpis` con `page.route`, respetando exactamente
 * el schema `DashboardKpis`/`AlertaCritica` de openapi.yaml (líneas
 * 1351-1501) — panel-admin standalone (este runner) no aplica
 * `authGuard`/`adminGuard` (viven en apps/shell), así que no hace falta un
 * step de "Dado que soy Gerente autenticado" para este archivo. La ruta del
 * escenario es "/admin/dashboard-kpis" (PRD); en este runner standalone se
 * monta como "/dashboard-kpis" (sin el prefijo "/admin" del shell), mismo
 * criterio que inventory.steps.ts con "/logistica/inventario" -> "/inventario".
 */
const mockDashboardKpis = {
  ingresos_totales_mes: 12_500_000,
  variacion_ingresos_pct: 8.4,
  ocupacion_global_pct: 68.3,
  moras_recaudadas_mes: 450_000,
  roi_promedio_pct: 24.1,
  alertas_criticas: [
    {
      tipo: 'mantenimiento_recurrente',
      severidad: 'alta',
      titulo: 'Unidad con mantenimiento recurrente',
      descripcion: 'Más de 3 ingresos a taller este mes.',
      referencia_id: '11111111-1111-1111-1111-111111111111',
      accion_sugerida: 'Revisar Ficha / Dar de Baja',
    },
    {
      tipo: 'mora_cliente',
      severidad: 'media',
      titulo: 'Cliente en mora',
      descripcion: 'Orden con 6 días de atraso.',
      referencia_id: '22222222-2222-2222-2222-222222222222',
      accion_sugerida: 'Ver Contrato / Contactar',
    },
  ],
};

async function mockDashboardKpisEndpoint(page: Page): Promise<void> {
  await page.route('**/api/v1/analytics/dashboard-kpis', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDashboardKpis),
    });
  });
}

// --- HU-15.1: KPIs ejecutivos de alto impacto ---

Given(String.raw`que accedo a "\/admin\/dashboard-kpis"`, async ({ page }) => {
  await mockDashboardKpisEndpoint(page);
  await page.goto('/dashboard-kpis');
  await expect(page.getByTestId('dashboard-kpis-grid')).toBeVisible();
});

Then(
  String.raw`visualizo las métricas consolidadas: Ingresos Totales del Mes \(COP\) con variación porcentual, Tasa de Ocupación Global de Flota \(%\), Total Recaudado por Moras \(COP\) e Índice de Retorno de Inversión Promedio \(ROI %\).`,
  async ({ page }) => {
    await expect(page.getByTestId('kpi-ingresos-mes')).toContainText(/12[.,]500[.,]000/);
    await expect(page.getByTestId('kpi-ingresos-variacion')).toContainText(/8[.,]4%/);
    await expect(page.getByTestId('kpi-ocupacion-flota')).toContainText(/68[.,]3%/);
    await expect(page.getByTestId('kpi-moras-mes')).toContainText(/450[.,]000/);
    await expect(page.getByTestId('kpi-roi-promedio')).toContainText(/24[.,]1%/);
  },
);

// --- HU-15.1: Panel de Alertas Críticas del Negocio ---

Given(
  'que existen herramientas con más de 3 ingresos a taller en el mes o clientes con más de 5 días de mora',
  async ({ page }) => {
    await mockDashboardKpisEndpoint(page);
    await page.goto('/dashboard-kpis');
    await expect(page.getByTestId('dashboard-kpis-grid')).toBeVisible();
  },
);

When('visualizo el panel de "Alertas Críticas"', async ({ page }) => {
  await expect(page.getByTestId('alertas-criticas')).toBeVisible();
});

Then(
  String.raw`se listan tarjetas de alerta clasificadas por severidad \(Alta, Media, Informativa\) con botones de acción directa \("Revisar Ficha \/ Dar de Baja", "Ver Contrato \/ Contactar"\).`,
  async ({ page }) => {
    const rows = page.getByTestId('alerta-critica-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Alta');
    await expect(rows.nth(0)).toContainText('Unidad con mantenimiento recurrente');
    await expect(rows.nth(0).getByTestId('alerta-critica-accion')).toHaveText(
      'Revisar Ficha / Dar de Baja',
    );
    await expect(rows.nth(1)).toContainText('Media');
    await expect(rows.nth(1)).toContainText('Cliente en mora');
    await expect(rows.nth(1).getByTestId('alerta-critica-accion')).toHaveText(
      'Ver Contrato / Contactar',
    );
  },
);
