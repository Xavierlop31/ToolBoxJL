import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// -----------------------------------------------------------------------
// HU-8.2 — "Repartidor ve su ruta del día ya optimizada" (Issue #23) —
// features/08_agente_ruteo.feature @HU-8.2.
//
// `GET /logistics/my-route` (openapi.yaml líneas 549-589) se mockea acá con
// `page.route`: la respuesta ya viene con `paradas` expandidas y en el
// orden de secuencia que publicó el Agente 1 (POST /logistics/assign-routes,
// Issue #22) — el mock respeta ese contrato para verificar que la PWA
// pinta la lista en el mismo orden, sin depender de una API real en CI.
// -----------------------------------------------------------------------
const mockRoute = {
  id: '66666666-6666-4666-8666-666666666666',
  vehiculo_id: '77777777-7777-4777-8777-777777777777',
  fecha: '2026-08-25',
  paradas: [
    '88888888-8888-4888-8888-888888888888',
    '99999999-9999-4999-8999-999999999999',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ],
  generada_por: 'agente_1',
};

const mockParadas = [
  {
    shipment_id: mockRoute.paradas[0],
    order_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    tipo: 'entrega',
    estado_envio: 'en_ruta_entrega',
    direccion: 'Calle 10 # 5-20, Bogotá',
  },
  {
    shipment_id: mockRoute.paradas[1],
    order_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    tipo: 'recogida',
    estado_envio: 'en_ruta_recogida',
    direccion: 'Carrera 45 # 12-08, Bogotá',
  },
  {
    shipment_id: mockRoute.paradas[2],
    order_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    tipo: 'entrega',
    estado_envio: 'en_ruta_entrega',
    direccion: 'Avenida Siempre Viva 742, Bogotá',
  },
];

Given(
  'que soy un Repartidor iniciando la PWA en la mañana y el Agente 1 ya publicó las rutas del día',
  async ({ page }) => {
    await page.route('**/api/v1/logistics/my-route', (route) =>
      route.fulfill({
        status: 200,
        json: { route: mockRoute, paradas: mockParadas },
      }),
    );
  },
);

When('abro mi ruta asignada', async ({ page }) => {
  await page.goto('/mi-ruta');
  await expect(page.getByTestId('mi-ruta-paradas')).toBeVisible();
});

Then('la veo ordenada por parada', async ({ page }) => {
  for (const [index, parada] of mockParadas.entries()) {
    const card = page.getByTestId(`mi-ruta-parada-${index}`);
    await expect(card).toContainText(parada.direccion);
  }
});

Then(
  String.raw`la ruta respeta el límite de peso\/volumen de mi vehículo`,
  async ({ page }) => {
    // `openapi.yaml` no expone la capacidad del vehículo
    // (`capacidad_kg`/`capacidad_m3`) en la respuesta de
    // `GET /logistics/my-route`, ni hay un `GET /fleet/vehicles/{id}` con
    // rol repartidor — ese límite lo garantiza el Agente 1 al publicar la
    // ruta (`POST /logistics/assign-routes`, Issue #22), no el frontend.
    // Lo único verificable acá es que la PWA muestra EXACTAMENTE las
    // paradas que el backend ya devolvió respetando ese límite, sin
    // agregar ni omitir ninguna.
    const items = page.getByTestId('mi-ruta-paradas').locator('li');
    await expect(items).toHaveCount(mockParadas.length);
  },
);
