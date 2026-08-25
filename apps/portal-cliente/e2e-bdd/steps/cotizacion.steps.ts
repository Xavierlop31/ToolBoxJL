import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();

Given('que soy un Cliente con un modelo, un rango de fechas y una dirección de entrega seleccionados', async ({ page }) => {
  // Mockear la respuesta de la ficha del modelo
  await page.route('**/catalog/models/123e4567-e89b-12d3-a456-426614174000', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        nombre: 'Taladro Percutor Bosch',
        marca: 'Bosch',
        categoria: 'Construcción',
        tarifa_dia: 25000,
        disponible_para_venta: true
      })
    });
  });

  // Navegar a la ficha del modelo
  await page.goto('/catalogo/123e4567-e89b-12d3-a456-426614174000');

  // Llenar el formulario
  await page.fill('#fechaInicio', '2026-10-01');
  await page.fill('#fechaFin', '2026-10-05');
  await page.fill('#direccionEntrega', 'Calle 100 # 15-20');
  await page.selectOption('#zonaId', 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e');
});

When('solicito una cotización de alquiler', async ({ page }) => {
  // Mockear la respuesta de la cotización
  await page.route('**/orders/quote', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modelo_id: '123e4567-e89b-12d3-a456-426614174000',
        tarifa_base: 100000,
        recargo_logistico: 15000,
        deposito_garantia: 50000,
        total: 165000,
        desglose: [
          { concepto: 'Alquiler 4 días', monto: 100000 },
          { concepto: 'Envío Zona Norte', monto: 15000 },
          { concepto: 'Depósito de Garantía', monto: 50000 }
        ]
      })
    });
  });

  // Hacer clic en el botón de cotizar
  await page.click('button[type="submit"]');
});

Then('el sistema calcula la tarifa por días, el recargo logístico por peso\\/zona y el depósito de garantía si aplica', async ({ page }) => {
  const quoteResult = page.locator('[data-testid="quote-result"]');
  await expect(quoteResult).toBeVisible();
});

Then('me muestra cada concepto desglosado por separado', async ({ page }) => {
  const desgloseItems = page.locator('.desglose-list li');
  await expect(desgloseItems).toHaveCount(3);
});

Then('me muestra el total a pagar', async ({ page }) => {
  const totalText = await page.locator('[data-testid="quote-total"]').textContent();
  expect(totalText).toContain('165000 COP');
});

// Escenario: Compra directa
Given('que un modelo está marcado como disponible para venta', async ({ page }) => {
  await page.route('**/catalog/models/123e4567-e89b-12d3-a456-426614174000', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '123e4567-e89b-12d3-a456-426614174000',
        nombre: 'Taladro Percutor Bosch',
        marca: 'Bosch',
        categoria: 'Construcción',
        tarifa_dia: 25000,
        disponible_para_venta: true
      })
    });
  });

  await page.goto('/catalogo/123e4567-e89b-12d3-a456-426614174000');
});

When('selecciono la modalidad "Venta" en lugar de "Alquiler" para ese modelo', async ({ page }) => {
  // Seleccionar el radio button de venta
  await page.click('input[value="venta"]');
});

Then('el catálogo me permite completar el proceso de compra en modalidad venta', async ({ page }) => {
  // Verificar que los campos de fecha ya no son obligatorios o visibles
  const dateFields = page.locator('.date-fields');
  await expect(dateFields).not.toBeVisible();

  // Llenar dirección y zona
  await page.fill('#direccionEntrega', 'Calle 100 # 15-20');
  await page.selectOption('#zonaId', 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e');

  // Mockear cotización de venta
  await page.route('**/orders/quote', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modelo_id: '123e4567-e89b-12d3-a456-426614174000',
        tarifa_base: 450000,
        recargo_logistico: 15000,
        deposito_garantia: 0,
        total: 465000,
        desglose: [
          { concepto: 'Venta de Herramienta', monto: 450000 },
          { concepto: 'Envío Zona Norte', monto: 15000 }
        ]
      })
    });
  });

  // Cotizar
  await page.click('button[type="submit"]');
  const quoteResult = page.locator('[data-testid="quote-result"]');
  await expect(quoteResult).toBeVisible();

  // Mockear creación de orden
  await page.route('**/orders', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'order-999',
        cliente_id: 'client-123',
        tipo: 'venta',
        estado: 'pendiente_pago',
        fecha_inicio: null,
        fecha_fin: null,
        direccion_entrega: 'Calle 100 # 15-20',
        zona_id: 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e'
      })
    });
  });

  // Confirmar orden
  await page.click('.btn-confirm');
  const orderSuccess = page.locator('[data-testid="order-success"]');
  await expect(orderSuccess).toBeVisible();
});
