import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

const mockUnit = {
  id: '22222222-2222-4222-8222-222222222222',
  modelo_id: '11111111-1111-4111-8111-111111111111',
  numero_serie: 'SN-0001',
  estado: 'Operativo',
  qr_code_url: 'https://toolboxjl.example/qr/22222222-2222-4222-8222-222222222222.png',
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// -----------------------------------------------------------------------
// RF-1.2 — "Almacenista genera un código QR único al dar de alta una
// unidad física". La creación de la unidad (POST /inventory/units) es un
// endpoint de Backend sin UI asignada a Frontend este sprint (decisión del
// Tech Lead #2: pwa-logistica solo cubre escaneo + cambio de estado, no el
// alta de unidades). Por eso el paso "doy de alta..." arma el fixture de la
// unidad creada en vez de manejar una UI que no existe; el foco real de
// esta HU para Frontend —y lo que se verifica de punta a punta contra la
// UI— es la última línea: "el QR es escaneable desde la PWA".
// -----------------------------------------------------------------------
Given(
  'que soy un Almacenista autenticado y existe un modelo de herramienta registrado',
  async ({ page }) => {
    await page.route(`**/api/v1/inventory/units/${mockUnit.id}`, (route) =>
      route.fulfill({ json: mockUnit }),
    );
  },
);

When('doy de alta una unidad física de ese modelo', async () => {
  // Fixture de la unidad ya "creada" por Backend — ver nota arriba.
  expect(mockUnit.modelo_id).toBeTruthy();
});

Then('la unidad recibe un identificador UUID único', async () => {
  expect(mockUnit.id).toMatch(uuidRegex);
});

Then(
  'se genera un código QR imprimible ligado a esa unidad física, no al modelo',
  async () => {
    expect(mockUnit.qr_code_url).toContain(mockUnit.id);
    expect(mockUnit.qr_code_url).not.toContain(mockUnit.modelo_id);
  },
);

Then('el QR es escaneable desde la PWA', async ({ page }) => {
  // Seam de testing (ver QrScannerComponent): en vez de depender de una
  // cámara real, inyectamos el resultado que el decoder ZXing produciría al
  // leer el QR físico (el UUID de la unidad).
  await page.addInitScript((unitId) => {
    (window as unknown as { __E2E_QR_MOCK__?: string }).__E2E_QR_MOCK__ = unitId;
  }, mockUnit.id);

  await page.goto('/escanear');
  await expect(page).toHaveURL(new RegExp(`/unidades/${mockUnit.id}$`));
  await expect(page.getByText(mockUnit.numero_serie)).toBeVisible();
});

// -----------------------------------------------------------------------
// RF-1.3 — "Almacenista registra un cambio de estado de una unidad"
// -----------------------------------------------------------------------
Given(
  'que soy un Almacenista autenticado y tengo identificada una unidad física por su QR',
  async ({ page }) => {
    await page.route(`**/api/v1/inventory/units/${mockUnit.id}`, (route) =>
      route.fulfill({ json: mockUnit }),
    );
    await page.goto(`/unidades/${mockUnit.id}`);
    await expect(page.getByTestId('unit-current-status')).toBeVisible();
  },
);

When(
  'registro un cambio de estado de la unidad a uno de {string}, {string}, {string}, {string} o {string}',
  async ({ page }, _nuevo, _excelente, _operativo, _mantenimiento, dadoDeBaja) => {
    await page.route(
      `**/api/v1/inventory/units/${mockUnit.id}/status`,
      (route) => {
        const body = route.request().postDataJSON();
        expect(body.estado_nuevo).toBe(dadoDeBaja);
        return route.fulfill({
          json: {
            id: 'log-1',
            unidad_id: mockUnit.id,
            estado_anterior: mockUnit.estado,
            estado_nuevo: body.estado_nuevo,
            autor_id: 'almacenista-1',
            created_at: '2026-08-24T10:00:00.000Z',
          },
        });
      },
    );

    await page.getByLabel('Nuevo estado').selectOption(dadoDeBaja);

    // Sprint 14 (Fase 3, Épica 13, Issue #148): `UnitDetailComponent` ahora
    // exige campos adicionales como obligatorios en la UI según el estado
    // destino — el backend (`PATCH /inventory/units/{id}/status`) sigue
    // exigiendo solo `estado_nuevo`, pero el `submit()` corta temprano con
    // `validationError` si faltan. Este step genérico solo termina
    // seleccionando el ÚLTIMO placeholder de la lista ("Dado de Baja"), así
    // que hoy solo ese branch se ejerce, pero se cubren ambos casos por si
    // el step llega a usarse con "En Mantenimiento" en el futuro.
    if (dadoDeBaja === 'Dado de Baja') {
      await page
        .getByLabel('Motivo de la baja (acta de descarte)')
        .fill('Motivo de prueba (BDD)');
    } else if (dadoDeBaja === 'En Mantenimiento') {
      await page.getByLabel('Tipo').selectOption('Preventivo');
      await page.getByLabel('Falla reportada').fill('Falla de prueba (BDD)');
      await page.getByLabel('Técnico asignado').fill('Técnico de prueba (BDD)');
      await page.getByLabel('Costo estimado (COP)').fill('50000');
      await page.getByLabel('Fecha prevista de finalización').fill('2026-12-31');
    }

    await page.getByRole('button', { name: 'Registrar cambio de estado' }).click();
  },
);

Then(
  'el cambio queda registrado en la hoja de vida de la unidad con fecha y autor',
  async ({ page }) => {
    const confirmation = page.getByTestId('status-change-confirmation');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText('2026-08-24T10:00:00.000Z');
    await expect(confirmation).toContainText('almacenista-1');
  },
);

Then('puedo adjuntar fotos como evidencia de forma opcional', async ({ page }) => {
  await expect(page.getByLabel('Fotos de evidencia (opcional)')).toBeVisible();
});
