import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

/**
 * Steps de RF-3.1 — features/04_logistica_flota.feature.
 * Backend (apps/api) corre en paralelo en su propia rama
 * (feature/backend-logistica-flota): en vez de depender de un servidor
 * real, interceptamos `POST /fleet/vehicles` con `page.route`, respetando
 * exactamente el schema `Vehicle`/`VehicleInput` de openapi.yaml
 * (líneas 397-417, 857-872).
 */
const mockVehicle = {
  id: '33333333-3333-4333-8333-333333333333',
  tipo: 'camioneta',
  capacidad_kg: 800,
  capacidad_m3: 6,
  zonas: ['b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e'],
};

Given('que soy un Administrador autenticado', async ({ page }) => {
  // panel-admin standalone (puerto 4203, este runner de BDD) no aplica
  // `authGuard` en sus propias rutas — ese guard vive en apps/shell y solo
  // se ejerce cuando el remote corre federado (ver
  // apps/panel-admin/src/app/app.routes.ts). Acá solo mockeamos la API.
  await page.route('**/api/v1/fleet/vehicles', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(mockVehicle),
    });
  });
});

When(
  'registro un vehículo con su tipo, capacidad de carga en kg y m³, y zonas geográficas asociadas',
  async ({ page }) => {
    await page.goto('/vehiculos/nuevo');
    await page.selectOption('#tipo', 'camioneta');
    await page.fill('#capacidadKg', '800');
    await page.fill('#capacidadM3', '6');
    await page.getByLabel('Zona Norte (Bogotá)').check();
    await page.click('button[type="submit"]');
  },
);

Then('el vehículo queda disponible para asignación de rutas', async ({ page }) => {
  await expect(page.getByTestId('vehicle-success')).toBeVisible();
});
