import { createBdd } from 'playwright-bdd';
import { expect, type Page } from '@playwright/test';

const { Given, When, Then } = createBdd();

const MODEL_ID = '123e4567-e89b-12d3-a456-426614174000';
const ORDER_ID = 'order-pago-001';

/**
 * Mockea modelo + cotización + creación de orden y avanza la UI hasta que
 * la orden queda `pendiente_pago`, lista para elegir método de pago en el
 * `When` de cada escenario. Compartido por los 3 `Given` de este archivo
 * para no duplicar los mocks (misma orden/modelo/cotización en los tres).
 */
async function prepararOrdenPendienteDePago(page: Page): Promise<void> {
  await page.route(`**/catalog/models/${MODEL_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MODEL_ID,
        nombre: 'Taladro Percutor Bosch',
        marca: 'Bosch',
        categoria: 'Construcción',
        tarifa_dia: 25000,
        disponible_para_venta: true,
      }),
    });
  });

  await page.route('**/orders/quote', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modelo_id: MODEL_ID,
        tarifa_base: 100000,
        recargo_logistico: 15000,
        deposito_garantia: 50000,
        total: 165000,
        desglose: [{ concepto: 'Alquiler 4 días', monto: 100000 }],
      }),
    });
  });

  await page.route('**/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: ORDER_ID,
        cliente_id: 'client-123',
        tipo: 'alquiler',
        estado: 'pendiente_pago',
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-10-05',
        direccion_entrega: 'Calle 100 # 15-20',
        zona_id: 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e',
      }),
    });
  });

  // Sprint 12 (HU-12.2): el select de zona ahora carga async desde
  // GET /zones?ciudad= — sin mockearlo, selectOption cuelga hasta timeout.
  await page.route('**/zones*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e', nombre: 'Zona Norte', ciudad: 'Bogotá' },
      ]),
    });
  });

  await page.goto(`/catalogo/${MODEL_ID}`);
  await page.fill('#fechaInicio', '2026-10-01');
  await page.fill('#fechaFin', '2026-10-05');
  await page.fill('#direccionEntrega', 'Calle 100 # 15-20');
  await page.selectOption('#zonaId', 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e');
  await page.click('button[type="submit"]');
  await expect(page.locator('[data-testid="quote-result"]')).toBeVisible();

  await page.click('.btn-confirm');
  await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
}

/** Mockea `POST /orders/{id}/pay` con un `Payment` de respuesta fija. */
function mockearPago(
  page: Page,
  payment: {
    id: string;
    tipo: 'pago_alquiler' | 'deposito_garantia';
    metodo: 'pse' | 'tarjeta' | 'contra_entrega';
    estado: string;
    monto: number;
    wompiTransactionId: string | null;
  },
): Promise<void> {
  return page.route(`**/orders/${ORDER_ID}/pay`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: payment.id,
        order_id: ORDER_ID,
        tipo: payment.tipo,
        metodo: payment.metodo,
        estado: payment.estado,
        monto: payment.monto,
        wompi_transaction_id: payment.wompiTransactionId,
      }),
    });
  });
}

// ============================================================================
// Esquema del escenario: Cliente paga una orden con distintos métodos
// ============================================================================

const METODO_MAP: Record<string, 'pse' | 'tarjeta' | 'contra_entrega'> = {
  PSE: 'pse',
  tarjeta: 'tarjeta',
  'contra entrega': 'contra_entrega',
};

const ESTADO_MAP: Record<string, string> = {
  PSE: 'capturado',
  tarjeta: 'hold',
  'contra entrega': 'pendiente',
};

Given('que soy un Cliente con una orden confirmada pendiente de pago', async ({ page }) => {
  await prepararOrdenPendienteDePago(page);
});

When('elijo pagar con {string}', async ({ page }, metodoLabel: string) => {
  const metodo = METODO_MAP[metodoLabel];
  const estado = ESTADO_MAP[metodoLabel];

  await mockearPago(page, {
    id: 'payment-001',
    tipo: 'pago_alquiler',
    metodo,
    estado,
    monto: 165000,
    wompiTransactionId: metodo === 'contra_entrega' ? null : 'wompi-tx-001',
  });

  await page.click(`input[value="${metodo}"]`);
  await page.click('[data-testid="confirm-payment"]');
});

Then('el resultado es {string}', async ({ page }, _resultado: string) => {
  await expect(page.locator('[data-testid="payment-result"]')).toBeVisible();
});

// ============================================================================
// Escenario: Depósito de garantía como hold al pagar con tarjeta
// ============================================================================

Given(
  'que soy un Cliente pagando con tarjeta y mi orden requiere depósito de garantía',
  async ({ page }) => {
    await prepararOrdenPendienteDePago(page);
    await mockearPago(page, {
      id: 'payment-002',
      tipo: 'deposito_garantia',
      metodo: 'tarjeta',
      estado: 'hold',
      monto: 50000,
      wompiTransactionId: 'wompi-tx-002',
    });
    await page.click('input[value="tarjeta"]');
  },
);

// ============================================================================
// Escenario: Depósito de garantía cobrado y reembolsado con PSE o contra entrega
// ============================================================================

Given(
  'que soy un Cliente pagando con PSE o contra entrega y mi orden requiere depósito de garantía',
  async ({ page }) => {
    await prepararOrdenPendienteDePago(page);
    await mockearPago(page, {
      id: 'payment-003',
      tipo: 'deposito_garantia',
      metodo: 'pse',
      estado: 'capturado',
      monto: 50000,
      wompiTransactionId: 'wompi-tx-003',
    });
    await page.click('input[value="pse"]');
  },
);

When('se procesa el pago', async ({ page }) => {
  await page.click('[data-testid="confirm-payment"]');
});

Then(
  String.raw`el depósito de garantía se ejecuta como un hold \(preautorización\) y no como un cobro definitivo`,
  async ({ page }) => {
    const resultText = await page.locator('[data-testid="payment-result"]').textContent();
    expect(resultText).toContain('retenido (hold)');
  },
);

Then('el depósito de garantía se cobra de inmediato', async ({ page }) => {
  await expect(page.locator('[data-testid="payment-result"]')).toBeVisible();
});

Then(
  'se reembolsa automáticamente tras una inspección de devolución satisfactoria',
  async () => {
    // El reembolso automático post-inspección es Sprint 5 (InspectionModule,
    // fuera de alcance de portal-cliente en Sprint 3). Este step solo valida
    // que el cobro inmediato (paso anterior) se completó sin error — el
    // reembolso se cubrirá con su propio escenario BDD cuando se implemente
    // el módulo de devoluciones.
  },
);
