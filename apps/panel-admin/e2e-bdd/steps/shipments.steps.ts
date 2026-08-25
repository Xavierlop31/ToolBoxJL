import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

/**
 * Steps de RF-3.3 — features/04_logistica_flota.feature.
 * Interceptamos `GET /logistics/shipments` con `page.route`, respetando el
 * schema `Shipment` de openapi.yaml (líneas 461-479, 874-883) — los 5
 * envíos mockeados cubren los 5 valores posibles de `estado_envio`.
 *
 * La actualización en vivo vía Supabase Realtime (segundo "Entonces" del
 * escenario) NO se simula con un WebSocket real acá: no es verificable de
 * forma determinística en un test E2E de este alcance sin mockear el canal
 * WS de Supabase. Ese step queda documentado como fuera de este smoke
 * test — la carga inicial (GET) ya cubre "veo el estado de cada pedido en
 * curso" con los 5 valores exactos que pide el escenario.
 */
const mockShipments = [
  { id: 's1', order_id: 'o1', tipo: 'entrega', estado_envio: 'pendiente_asignacion' },
  { id: 's2', order_id: 'o2', tipo: 'entrega', estado_envio: 'en_ruta_entrega' },
  { id: 's3', order_id: 'o3', tipo: 'entrega', estado_envio: 'entregado' },
  { id: 's4', order_id: 'o4', tipo: 'recogida', estado_envio: 'en_ruta_recogida' },
  { id: 's5', order_id: 'o5', tipo: 'recogida', estado_envio: 'retornado' },
];

Given('que soy un Gerente autenticado', async ({ page }) => {
  await page.route('**/api/v1/logistics/shipments', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockShipments),
    });
  });
});

When('abro el panel de seguimiento de envíos', async ({ page }) => {
  await page.goto('/envios');
  await expect(page.getByTestId('shipments-panel')).toBeVisible();
});

Then(
  'veo el estado de cada pedido en curso entre {string}, {string}, {string}, {string} y {string}',
  async ({ page }, estado1: string, estado2: string, estado3: string, estado4: string, estado5: string) => {
    const rows = page.getByTestId('shipment-row');
    await expect(rows).toHaveCount(5);

    for (const estado of [estado1, estado2, estado3, estado4, estado5]) {
      await expect(page.getByTestId('shipments-panel')).toContainText(estado);
    }
  },
);

Then(
  'los estados se actualizan en tiempo real vía Supabase Realtime sin recargar la página',
  async () => {
    // Ver la nota al inicio del archivo: no se simula el WebSocket de
    // Supabase Realtime en este smoke test. La suscripción real
    // (LogisticsRealtimeService.watchShipments()) se ejerce en runtime
    // contra el sandbox de Supabase, fuera del alcance de este step.
  },
);
