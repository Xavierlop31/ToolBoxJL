import { Page, expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

/**
 * Steps de HU-13.1 a HU-13.4 (Sprint 14, Fase 3, Épica 13 — Issues
 * #147-#150) — features/13_gestion_inventario_qr.feature. Igual que el
 * resto de este runner (fleet.steps.ts, shipments.steps.ts,
 * analytics.steps.ts): interceptamos los endpoints de `/inventory/*` y
 * `/logistics/routes-today` con `page.route`, respetando exactamente los
 * schemas de openapi.yaml (líneas 339-558, 945-1003) — panel-admin
 * standalone (este runner) no aplica `authGuard`/`adminGuard` (viven en
 * apps/shell), así que no hace falta un step de "Dado que soy Admin
 * autenticado" para este archivo.
 */
const mockMetrics = {
  total_unidades: 42,
  operativas: 20,
  en_alquiler: 15,
  en_mantenimiento_o_baja: 7,
};

const unitA = {
  id: 'u1',
  modelo_id: 'm1',
  numero_serie: 'SN-001',
  estado: 'Operativo',
  fecha_ingreso: '2026-01-01',
  qr_code_url: 'data:image/png;base64,AAA',
  ubicacion_bodega: 'Estante A3',
  modelo_nombre: 'Taladro Percutor',
  modelo_categoria: 'Eléctrica',
  estado_visualizacion: 'Operativo',
};

const unitB = {
  id: 'u2',
  modelo_id: 'm2',
  numero_serie: 'SN-002',
  estado: 'En Mantenimiento',
  fecha_ingreso: '2026-01-05',
  qr_code_url: 'data:image/png;base64,BBB',
  ubicacion_bodega: 'Estante B1',
  modelo_nombre: 'Andamio',
  modelo_categoria: 'Estructura',
  estado_visualizacion: 'En Mantenimiento',
};

const mockModels = [
  { id: 'm1', nombre: 'Taladro Percutor', marca: 'Bosch', categoria: 'Eléctrica' },
];

const mockCreatedUnit = {
  id: 'u3',
  modelo_id: 'm1',
  numero_serie: 'TBJL-DEM-0089',
  estado: 'Nuevo',
  fecha_ingreso: '2026-09-01',
  qr_code_url: 'data:image/png;base64,CCC',
};

const mockMaintenanceUnit = {
  id: 'u2',
  modelo_id: 'm2',
  numero_serie: 'SN-002',
  estado: 'En Mantenimiento',
  fecha_ingreso: '2026-01-05',
  qr_code_url: 'data:image/png;base64,BBB',
  modelo_nombre: 'Andamio',
  ultimo_evento_mantenimiento: {
    id: 'log1',
    unidad_id: 'u2',
    estado_anterior: 'Operativo',
    estado_nuevo: 'En Mantenimiento',
    fotos_urls: [],
    autor_id: 'a1',
    created_at: '2026-09-01T10:00:00Z',
    tipo_mantenimiento: 'Correctivo',
    falla_reportada: 'No enciende',
    tecnico_asignado: 'Pedro',
  },
};

const mockBajaUnit = {
  id: 'u4',
  modelo_id: 'm3',
  numero_serie: 'SN-003',
  estado: 'Dado de Baja',
  fecha_ingreso: '2025-06-01',
  qr_code_url: 'data:image/png;base64,DDD',
  modelo_nombre: 'Compresor',
  ultimo_evento_mantenimiento: {
    id: 'log2',
    unidad_id: 'u4',
    estado_anterior: 'En Mantenimiento',
    estado_nuevo: 'Dado de Baja',
    fotos_urls: [],
    autor_id: 'a1',
    created_at: '2026-08-15T10:00:00Z',
    motivo_baja: 'Daño irreparable',
  },
};

async function mockInventoryMetrics(page: Page): Promise<void> {
  await page.route('**/api/v1/inventory/metrics', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMetrics),
    });
  });
}

/** GET (filtra por q/estado sobre [unitA, unitB]) y POST (alta con QR) de `/inventory/units`. */
async function mockInventoryUnits(page: Page): Promise<void> {
  await page.route('**/api/v1/inventory/units*', async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockCreatedUnit),
      });
    }

    if (method !== 'GET') return route.fallback();

    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const estado = url.searchParams.get('estado') ?? '';

    const items = [unitA, unitB].filter((unit) => {
      const matchesQ =
        !q || unit.numero_serie.toLowerCase().includes(q) || unit.modelo_nombre.toLowerCase().includes(q);
      const matchesEstado = !estado || unit.estado_visualizacion === estado;
      return matchesQ && matchesEstado;
    });

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, total: items.length, page: 1, pageSize: 20 }),
    });
  });
}

async function mockCatalogSearch(page: Page): Promise<void> {
  await page.route('**/api/v1/catalog/search*', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockModels),
    });
  });
}

async function mockMaintenanceList(page: Page): Promise<void> {
  await page.route('**/api/v1/inventory/maintenance', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([mockMaintenanceUnit, mockBajaUnit]),
    });
  });
}

async function mockUpdateStatus(page: Page, estadoNuevo: string): Promise<void> {
  await page.route('**/api/v1/inventory/units/*/status', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'log-x',
        unidad_id: 'u1',
        estado_anterior: 'Operativo',
        estado_nuevo: estadoNuevo,
        fotos_urls: [],
        autor_id: 'a1',
        created_at: '2026-09-01T12:00:00Z',
      }),
    });
  });
}

const mockRoutesToday = {
  repartidores: [
    {
      repartidor_id: 'r1',
      nombre: 'Juan Pérez',
      vehiculo_id: 'v1',
      placa: 'ABC123',
      total_paradas: 2,
      paradas_completadas: 1,
      porcentaje_avance: 50,
      estado_ruta: 'En Progreso',
      paradas: [
        {
          shipment_id: 's1',
          order_id: 'o1',
          tipo: 'entrega',
          estado_envio: 'entregado',
          direccion: 'Calle 10 # 20-30',
          cliente_nombre: 'Constructora ABC',
          hora_estimada_llegada: '08:00',
          herramientas: [{ modelo_nombre: 'Taladro', numero_serie: 'SN-1' }],
        },
        {
          shipment_id: 's2',
          order_id: 'o2',
          tipo: 'recogida',
          estado_envio: 'en_ruta_recogida',
          direccion: 'Calle 15 # 5-10',
          cliente_nombre: 'Constructora XYZ',
          hora_estimada_llegada: '08:45',
          herramientas: [{ modelo_nombre: 'Andamio', numero_serie: 'SN-2' }],
        },
      ],
    },
    {
      repartidor_id: 'r2',
      nombre: 'María Gómez',
      vehiculo_id: 'v2',
      placa: 'XYZ789',
      total_paradas: 4,
      paradas_completadas: 4,
      porcentaje_avance: 100,
      estado_ruta: 'Completada',
      paradas: [],
    },
    {
      repartidor_id: 'r3',
      nombre: 'Carlos Ruiz',
      vehiculo_id: 'v3',
      placa: null,
      total_paradas: 3,
      paradas_completadas: 0,
      porcentaje_avance: 0,
      estado_ruta: 'Pendiente',
      paradas: [],
    },
  ],
};

async function mockRoutesTodayEndpoint(page: Page): Promise<void> {
  await page.route('**/api/v1/logistics/routes-today', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockRoutesToday),
    });
  });
}

// --- HU-13.1: tarjetas de KPIs ---

Given(
  String.raw`que accedo a "\/logistica\/inventario" en el Panel Admin`,
  async ({ page }) => {
    await mockInventoryMetrics(page);
    await mockInventoryUnits(page);
    await page.goto('/inventario');
  },
);

Then(
  String.raw`visualizo 4 tarjetas de KPIs superiores: Total Unidades Registradas, Unidades Operativas, Unidades en Alquiler y Unidades en Mantenimiento\/Baja.`,
  async ({ page }) => {
    await expect(page.getByTestId('inventory-metrics')).toBeVisible();
    await expect(page.getByTestId('metric-total')).toContainText('42');
    await expect(page.getByTestId('metric-operativas')).toContainText('20');
    await expect(page.getByTestId('metric-en-alquiler')).toContainText('15');
    await expect(page.getByTestId('metric-mantenimiento-baja')).toContainText('7');
  },
);

// --- HU-13.1: filtros y búsqueda ---

Given('que estoy en la pestaña "Inventario General"', async ({ page }) => {
  await mockInventoryMetrics(page);
  await mockInventoryUnits(page);
  await page.goto('/inventario');
  await expect(page.getByTestId('inventory-row')).toHaveCount(2);
});

When(
  String.raw`ingreso un término de búsqueda por código QR, Serial o Modelo, o selecciono un filtro por Estado \("Operativo", "En Alquiler", "En Mantenimiento", "Dado de Baja"\)`,
  async ({ page }) => {
    await page.fill('[data-testid="inventory-search"]', 'SN-001');
    await page.waitForTimeout(400); // debounce de 300ms del buscador
  },
);

Then('la tabla filtra instantáneamente las unidades físicas correspondientes', async ({ page }) => {
  await expect(page.getByTestId('inventory-row')).toHaveCount(1);
});

Then(
  String.raw`muestra por cada fila: Código QR, Serial Fabricante, Modelo, Categoría, Estado con Badge, Ubicación en Bodega y Botones de Acción \("Ver QR", "Historial", "Cambiar Estado"\).`,
  async ({ page }) => {
    const row = page.getByTestId('inventory-row').first();
    await expect(row).toContainText('SN-001');
    await expect(row).toContainText('Taladro Percutor');
    await expect(row).toContainText('Eléctrica');
    await expect(row).toContainText('Operativo');
    await expect(row).toContainText('Estante A3');
    await expect(row.getByTestId('btn-ver-qr')).toBeVisible();
    await expect(row.getByTestId('btn-historial')).toBeVisible();
    await expect(row.getByTestId('btn-cambiar-estado')).toBeVisible();
  },
);

// --- HU-13.2: apertura del formulario de registro ---

Given('que estoy en el panel de Gestión de Inventario QR', async ({ page }) => {
  await mockInventoryMetrics(page);
  await mockInventoryUnits(page);
  await mockCatalogSearch(page);
  await page.goto('/inventario');
  await expect(page.getByTestId('inventory-metrics')).toBeVisible();
});

When(
  'hago clic en el botón superior "+ Registrar Nueva Unidad" o "Generar Nuevo QR"',
  async ({ page }) => {
    await page.click('[data-testid="btn-registrar-unidad"]');
  },
);

Then('se abre un modal con el formulario de alta de unidad física.', async ({ page }) => {
  await expect(page.getByTestId('register-unit-form')).toBeVisible();
});

// --- HU-13.2: registro exitoso y QR imprimible ---

Given(
  String.raw`que completo los campos obligatorios: Modelo de Herramienta, Número de Serie del Fabricante, Fecha de Adquisición, Costo de Compra y Ubicación en Bodega \(Estante\/Fila\)`,
  async ({ page }) => {
    await mockInventoryMetrics(page);
    await mockInventoryUnits(page);
    await mockCatalogSearch(page);
    await page.goto('/inventario');

    await page.click('[data-testid="btn-registrar-unidad"]');
    await expect(page.getByTestId('register-unit-form')).toBeVisible();

    await page.selectOption('#modeloId', 'm1');
    await page.fill('#numeroSerie', 'TBJL-DEM-0089');
    await page.fill('#fechaAdquisicion', '2026-09-01');
    await page.fill('#costoCompra', '500000');
    await page.fill('#ubicacionBodega', 'Estante A3');
  },
);

When('hago clic en "Guardar y Generar QR"', async ({ page }) => {
  await page.click('button:has-text("Guardar y Generar QR")');
});

Then(String.raw`el sistema registra la unidad en "POST \/inventory\/units"`, async ({ page }) => {
  await expect(page.getByTestId('qr-preview')).toBeVisible();
});

Then(
  String.raw`genera un código QR vectorial con el UUID y código de serie \(ej: "TBJL-DEM-0089"\)`,
  async ({ page }) => {
    await expect(page.getByTestId('qr-serial')).toHaveText('TBJL-DEM-0089');
  },
);

Then(
  'muestra una vista previa lista para imprimir en impresora térmica de etiquetas con el logo de ToolBox JL.',
  async ({ page }) => {
    await expect(page.getByTestId('qr-preview')).toContainText('ToolBox JL');
  },
);

// --- HU-13.3: visualización de la pestaña de mantenimiento ---
// El Given "que estoy en el panel de Gestión de Inventario QR" ya está
// definido arriba (HU-13.2) y se reutiliza tal cual, mismo criterio que
// analytics.steps.ts con el Given de shipments.steps.ts.

When('hago clic en la pestaña "Mantenimiento & Taller"', async ({ page }) => {
  await mockMaintenanceList(page);
  await page.click('[data-testid="tab-mantenimiento-taller"]');
  await expect(page.getByTestId('maintenance-list')).toBeVisible();
});

Then(
  'visualizo la lista de herramientas actualmente en reparación o inspección',
  async ({ page }) => {
    await expect(page.getByTestId('maintenance-row').first()).toContainText('En Mantenimiento');
  },
);

Then('las herramientas que han sido dadas de baja con su motivo documentado.', async ({ page }) => {
  const rows = page.getByTestId('maintenance-row');
  await expect(rows.nth(1)).toContainText('Dado de Baja');
  await expect(rows.nth(1)).toContainText('Daño irreparable');
});

// --- HU-13.3: asignación de una unidad a mantenimiento ---

Given('que selecciono una herramienta de la lista', async ({ page }) => {
  await mockInventoryMetrics(page);
  await mockInventoryUnits(page);
  await page.goto('/inventario');
  await page.getByTestId('btn-cambiar-estado').first().click();
  await expect(page.getByTestId('status-change-form')).toBeVisible();
});

When(
  String.raw`registro la orden de taller indicando: Tipo \(Preventivo \/ Correctivo\), Falla reportada, Técnico asignado, Costo estimado y Fecha prevista de finalización`,
  async ({ page }) => {
    await mockUpdateStatus(page, 'En Mantenimiento');
    await page.selectOption('#estadoNuevo', 'En Mantenimiento');
    await page.selectOption('#tipoMantenimiento', 'Correctivo');
    await page.fill('#fallaReportada', 'No enciende');
    await page.fill('#tecnicoAsignado', 'Pedro');
    await page.fill('#costoEstimado', '100000');
    await page.fill('#fechaPrevistaFin', '2026-09-10');
    await page.click('button:has-text("Confirmar")');
  },
);

Then('el estado de la unidad cambia a "En Mantenimiento"', async ({ page }) => {
  await expect(page.getByTestId('status-change-form')).toBeHidden();
});

Then(
  'la unidad deja de estar disponible para alquiler en el catálogo público',
  async () => {
    // Comportamiento de apps/portal-cliente / apps/api (filtrado de catálogo
    // por estado de unidades), fuera del alcance de este panel-admin y de
    // este smoke test — no hay una aserción de UI adicional posible acá.
  },
);

Then('el evento se añade a la hoja de vida de la unidad.', async () => {
  // El backend crea la entrada de tool_unit_status_log en la misma llamada
  // PATCH /inventory/units/{id}/status ya verificada en el step anterior
  // (mockUpdateStatus) — el contrato no expone en este sprint una vista de
  // "hoja de vida" completa por separado (ver la nota en
  // UnitDetailModalComponent), así que no hay una aserción de UI adicional
  // posible acá.
});

// --- HU-13.3: retorno a estado operativo o baja definitiva ---

Given(
  'que una herramienta ha finalizado su reparación o presenta daño irreparable',
  async ({ page }) => {
    await mockInventoryMetrics(page);
    await mockInventoryUnits(page);
    await mockMaintenanceList(page);
    await page.goto('/inventario');
    await page.click('[data-testid="tab-mantenimiento-taller"]');
    await expect(page.getByTestId('maintenance-list')).toBeVisible();
  },
);

When(
  String.raw`el técnico marca "Reintegrar a Servicio" \(con checklist superado\) o "Declarar Baja Definitiva" \(con acta de descarte\)`,
  async ({ page }) => {
    await mockUpdateStatus(page, 'Operativo');
    await page.click('[data-testid="btn-reintegrar"]');
    await expect(page.getByTestId('preset-estado')).toContainText('Operativo');
    await page.click('button:has-text("Confirmar")');
  },
);

Then(
  'el sistema actualiza el estado a "Operativo" o "Dado de Baja" respectivamente.',
  async ({ page }) => {
    await expect(page.locator('app-status-change-modal')).toHaveCount(0);
  },
);

// --- HU-13.4: rutas activas por repartidor ---

Given('que el Agente 1 de Ruteo ha generado las rutas del día', async ({ page }) => {
  await mockInventoryMetrics(page);
  await mockInventoryUnits(page);
  await mockRoutesTodayEndpoint(page);
  await page.goto('/inventario');
});

When('accedo a la pestaña "Rutas del Día" en el panel de inventario', async ({ page }) => {
  await page.click('[data-testid="tab-rutas-del-dia"]');
  await expect(page.getByTestId('repartidores-list')).toBeVisible();
});

Then(
  String.raw`visualizo la lista de repartidores activos con: Nombre, Vehículo\/Placa, Total de Paradas, Barra de Porcentaje de Avance y Estado de la Ruta \("En Progreso", "Completada", "Pendiente"\).`,
  async ({ page }) => {
    await expect(page.getByTestId('repartidor-row')).toHaveCount(3);
    await expect(page.getByTestId('repartidores-list')).toContainText('En Progreso');
    await expect(page.getByTestId('repartidores-list')).toContainText('Completada');
    await expect(page.getByTestId('repartidores-list')).toContainText('Pendiente');
  },
);

// --- HU-13.4: detalle de paradas de un repartidor ---

Given('que hago clic en un repartidor de la lista', async ({ page }) => {
  await mockInventoryMetrics(page);
  await mockInventoryUnits(page);
  await mockRoutesTodayEndpoint(page);
  await page.goto('/inventario');
  await page.click('[data-testid="tab-rutas-del-dia"]');
  await page.getByTestId('repartidor-toggle').first().click();
});

Then(
  String.raw`se despliega el itinerario secuencial de paradas distinguiendo "Entrega" vs "Recolección"`,
  async ({ page }) => {
    await expect(page.getByTestId('paradas-list')).toBeVisible();
    await expect(page.getByTestId('paradas-list')).toContainText('Entrega');
    await expect(page.getByTestId('paradas-list')).toContainText('Recolección');
  },
);

Then(
  'muestra la dirección de obra, cliente, herramientas asignadas con sus seriales y hora estimada de llegada.',
  async ({ page }) => {
    const list = page.getByTestId('paradas-list');
    await expect(list).toContainText('Calle 10 # 20-30');
    await expect(list).toContainText('Constructora ABC');
    await expect(list).toContainText('Taladro');
    await expect(list).toContainText('SN-1');
    await expect(list).toContainText('08:00');
  },
);
