import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const mockModel = {
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Taladro percutor 20V',
  marca: 'DeWalt',
  categoria: 'Taladros',
  tarifa_dia: 25000,
};

/**
 * Steps de RF-1.4 — features/01_catalogo_inventario.feature.
 * Backend (apps/api) corre en paralelo en su propia rama: en vez de
 * depender de un servidor real, interceptamos `GET /catalog/search`,
 * `GET /catalog/models/{id}` y `GET /inventory/check-availability` con
 * `page.route`, respetando exactamente los schemas de openapi.yaml.
 */
Given('que soy un Cliente navegando el catálogo', async ({ page }) => {
  await page.route('**/catalog/search*', (route) =>
    route.fulfill({ json: [mockModel] }),
  );
  await page.route(`**/catalog/models/${mockModel.id}`, (route) =>
    route.fulfill({ json: mockModel }),
  );

  await page.goto('/catalogo');
  await expect(page.getByText(mockModel.nombre)).toBeVisible();
});

When(
  'consulto la disponibilidad de un modelo para un rango de fechas específico',
  async ({ page }) => {
    await page.route('**/inventory/check-availability*', (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('modelo_id')).toBe(mockModel.id);
      expect(url.searchParams.get('fecha_inicio')).toBe('2026-09-01');
      expect(url.searchParams.get('fecha_fin')).toBe('2026-09-05');
      return route.fulfill({
        json: { modelo_id: mockModel.id, unidades_disponibles: 3 },
      });
    });

    await page.getByText(mockModel.nombre).click();
    await page.getByLabel('Fecha inicio').fill('2026-09-01');
    await page.getByLabel('Fecha fin').fill('2026-09-05');
    await page.getByRole('button', { name: 'Consultar disponibilidad' }).click();
  },
);

Then(
  'el sistema calcula la disponibilidad sobre unidades físicas no reservadas en ese rango',
  async ({ page }) => {
    await expect(page.getByTestId('availability-result')).toBeVisible();
  },
);

Then(
  'se me muestra únicamente el número de unidades realmente disponibles',
  async ({ page }) => {
    await expect(page.getByTestId('availability-result')).toContainText('3');
  },
);
