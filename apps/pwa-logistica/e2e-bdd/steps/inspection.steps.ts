import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

// -----------------------------------------------------------------------
// RF-4.2 — "Checklist de inspección detecta un hallazgo y ejecuta la
// garantía" (HU-5.1, Issue #14) —
// features/05_devoluciones_inspeccion_mora.feature.
//
// `POST /inspections` (openapi.yaml líneas 481-504) se mockea acá con
// `page.route`: el mock replica el criterio real del backend documentado en
// el contrato — si hay hallazgos, `garantia_ejecutada: true` — para
// verificar que la UI muestra el mensaje correcto en cada caso, sin
// depender de una API real en CI.
// -----------------------------------------------------------------------
const unidadId = '44444444-4444-4444-8444-444444444444';
const shipmentId = '55555555-5555-4555-8555-555555555555';

// PNG 1x1 mínimo — evidencia fotográfica de prueba (no depende de un
// archivo en disco, requisito para correr en CI).
const fakePhotoBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

Given(
  'que soy Repartidor o Almacenista recibiendo una herramienta devuelta',
  async ({ page }) => {
    await page.route('**/api/v1/inspections', (route) => {
      const body = route.request().postDataJSON();
      const hallazgos = (body.hallazgos ?? []) as Array<{ severidad: string }>;
      const garantiaEjecutada = hallazgos.length > 0;

      return route.fulfill({
        status: 201,
        json: {
          id: 'inspection-e2e-1',
          unidad_id: body.unidad_id,
          shipment_id: body.shipment_id,
          tipo: body.tipo,
          hallazgos,
          fotos_urls: body.fotos_urls ?? [],
          garantia_ejecutada: garantiaEjecutada,
        },
      });
    });

    await page.goto(`/inspeccion/${unidadId}`);
    await expect(page.getByTestId('inspection-unidad-id')).toBeVisible();
  },
);

When(
  'completo el checklist de inspección obligatorio con evidencia fotográfica',
  async ({ page }) => {
    await page.getByLabel('ID del envío (shipment)').fill(shipmentId);

    await page.getByRole('button', { name: 'Agregar hallazgo' }).click();
    await page
      .getByLabel('Descripción del hallazgo')
      .fill('Pieza faltante en el kit devuelto');
    await page.getByLabel('Severidad').selectOption('grave');

    await page.getByLabel('Fotos de evidencia').setInputFiles({
      name: 'evidencia.png',
      mimeType: 'image/png',
      buffer: fakePhotoBuffer,
    });

    await page
      .getByRole('button', { name: 'Registrar checklist de inspección' })
      .click();
  },
);

Then('el sistema registra el resultado del checklist', async ({ page }) => {
  const garantiaMessage = page.getByTestId('garantia-ejecutada');
  const conformeMessage = page.getByTestId('devolucion-conforme');
  await expect(garantiaMessage.or(conformeMessage)).toBeVisible();
});

Then(
  'si el hallazgo es negativo, por daño o pieza faltante, se activa la ejecución parcial o total del depósito de garantía',
  async ({ page }) => {
    const garantiaMessage = page.getByTestId('garantia-ejecutada');
    await expect(garantiaMessage).toBeVisible();
    await expect(garantiaMessage).toContainText(
      'el depósito de garantía fue ejecutado',
    );
  },
);
