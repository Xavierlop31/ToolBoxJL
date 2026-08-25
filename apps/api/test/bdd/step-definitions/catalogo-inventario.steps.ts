import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { EstadoUnidad } from "@toolboxjl/shared-types";
import type { ToolboxWorld } from "../support/world";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// RF-1.1 — Administrador registra la ficha técnica de un modelo de herramienta
// ============================================================================

Given("que soy un Administrador autenticado", function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "admin";
});

When(
  "registro un nuevo modelo de herramienta con marca, categoría, potencia, peso, volumen, manual en PDF, costo de compra, tarifa diaria, tarifa semanal e interés de mora",
  async function (this: ToolboxWorld) {
    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Taladro Percutor XR-500",
      marca: "Bosch",
      categoria: "Taladros",
      potencia_w: 750,
      peso_kg: 2.4,
      volumen_m3: 0.01,
      manual_pdf_url: "https://ejemplo.com/manuales/xr-500.pdf",
      costo_compra: 850000,
      tarifa_dia: 45000,
      tarifa_semana: 250000,
      interes_mora_dia: 0.02,
      deposito_pct: 0.3,
    });
  },
);

Then(
  "el modelo se guarda con todos los campos proporcionados",
  function (this: ToolboxWorld) {
    const modelo = this.ultimoModelo;
    assert.ok(modelo, "se esperaba que el modelo se hubiera creado");
    assert.match(modelo!.id, UUID_REGEX);
    assert.equal(modelo!.nombre, "Taladro Percutor XR-500");
    assert.equal(modelo!.marca, "Bosch");
    assert.equal(modelo!.categoria, "Taladros");
    assert.equal(modelo!.potencia_w, 750);
    assert.equal(modelo!.peso_kg, 2.4);
    assert.equal(modelo!.volumen_m3, 0.01);
    assert.equal(modelo!.manual_pdf_url, "https://ejemplo.com/manuales/xr-500.pdf");
    assert.equal(modelo!.costo_compra, 850000);
    assert.equal(modelo!.tarifa_dia, 45000);
    assert.equal(modelo!.tarifa_semana, 250000);
    assert.equal(modelo!.interes_mora_dia, 0.02);
    assert.equal(modelo!.deposito_pct, 0.3);
  },
);

Then(
  "el modelo queda visible en el catálogo interno",
  async function (this: ToolboxWorld) {
    const modelo = this.ultimoModelo!;
    const encontrado = await this.obtenerModelo.ejecutar(modelo.id);
    assert.equal(encontrado.id, modelo.id);

    const resultadosBusqueda = await this.buscarCatalogo.ejecutar({});
    assert.ok(
      resultadosBusqueda.some((m) => m.id === modelo.id),
      "el modelo recién creado debería aparecer en la búsqueda de catálogo",
    );
  },
);

// ============================================================================
// RF-1.2 — Almacenista genera un código QR único al dar de alta una unidad
// ============================================================================

Given(
  "que soy un Almacenista autenticado y existe un modelo de herramienta registrado",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "almacenista";
    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Sierra Circular CS-200",
      marca: "Makita",
      categoria: "Sierras",
      tarifa_dia: 35000,
    });
  },
);

When(
  "doy de alta una unidad física de ese modelo",
  async function (this: ToolboxWorld) {
    this.ultimaUnidad = await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo!.id,
      numero_serie: `SN-${randomUUID().slice(0, 8)}`,
    });
  },
);

Then(
  "la unidad recibe un identificador UUID único",
  function (this: ToolboxWorld) {
    assert.ok(this.ultimaUnidad, "se esperaba que la unidad se hubiera creado");
    assert.match(this.ultimaUnidad!.id, UUID_REGEX);
    assert.equal(this.ultimaUnidad!.modelo_id, this.ultimoModelo!.id);
  },
);

Then(
  "se genera un código QR imprimible ligado a esa unidad física, no al modelo",
  function (this: ToolboxWorld) {
    const qr = this.ultimaUnidad!.qr_code_url;
    assert.ok(qr, "se esperaba un qr_code_url en la unidad creada");
    assert.match(qr, /^data:image\/png;base64,/);
    // El QR codifica el id de la UNIDAD, no el del modelo — no hay forma
    // directa de decodificar la imagen acá sin una lib extra, pero se
    // verifica que el modelo en sí no expone ningún campo de QR (el QR es
    // una propiedad exclusiva de ToolUnit, nunca de ToolModel).
    assert.ok(
      !("qr_code_url" in (this.ultimoModelo as unknown as Record<string, unknown>)),
      "el modelo no debería tener qr_code_url — el QR está ligado a la unidad",
    );
  },
);

Then("el QR es escaneable desde la PWA", function (this: ToolboxWorld) {
  // "Escaneable" se traduce acá en que el data URI es una imagen PNG válida
  // no vacía — el escaneo real de la cámara es responsabilidad de la PWA
  // (Frontend), fuera del alcance de este módulo de Backend.
  const qr = this.ultimaUnidad!.qr_code_url;
  assert.ok(qr.length > "data:image/png;base64,".length);
});

// ============================================================================
// RF-1.3 — Almacenista registra un cambio de estado de una unidad
// ============================================================================

Given(
  "que soy un Almacenista autenticado y tengo identificada una unidad física por su QR",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "almacenista";
    const modelo = await this.registrarModelo.ejecutar({
      nombre: "Amoladora Angular AG-100",
      marca: "DeWalt",
      categoria: "Amoladoras",
      tarifa_dia: 25000,
    });
    this.ultimaUnidad = await this.registrarUnidad.ejecutar({
      modelo_id: modelo.id,
      numero_serie: `SN-${randomUUID().slice(0, 8)}`,
    });
    this.ultimosLogs = [];
  },
);

When(
  "registro un cambio de estado de la unidad a uno de {string}, {string}, {string}, {string} o {string}",
  async function (
    this: ToolboxWorld,
    e1: string,
    e2: string,
    e3: string,
    e4: string,
    e5: string,
  ) {
    // El escenario enumera las 5 opciones válidas (no es un Scenario
    // Outline con Examples) — se ejercitan las 5 transiciones en secuencia
    // sobre la misma unidad, para cubrir realmente "uno de" los 5 estados
    // en vez de probar un único valor hardcodeado.
    for (const estado of [e1, e2, e3, e4, e5] as EstadoUnidad[]) {
      const entrada = await this.actualizarEstado.ejecutar(
        this.ultimaUnidad!.id,
        estado,
        ["https://ejemplo.com/evidencia/foto-1.jpg"],
        this.usuarioActualId,
      );
      this.ultimosLogs.push(entrada);
    }
  },
);

Then(
  "el cambio queda registrado en la hoja de vida de la unidad con fecha y autor",
  function (this: ToolboxWorld) {
    assert.equal(this.ultimosLogs.length, 5);
    for (const log of this.ultimosLogs) {
      assert.ok(log.created_at, "se esperaba una fecha en la entrada de hoja de vida");
      assert.ok(!Number.isNaN(Date.parse(log.created_at)));
      assert.equal(log.autor_id, this.usuarioActualId);
      assert.equal(log.unidad_id, this.ultimaUnidad!.id);
    }
  },
);

Then(
  "puedo adjuntar fotos como evidencia de forma opcional",
  function (this: ToolboxWorld) {
    for (const log of this.ultimosLogs) {
      assert.ok(Array.isArray(log.fotos_urls));
      assert.ok(log.fotos_urls.length >= 1);
    }
  },
);

// ============================================================================
// RF-1.4 — Cliente consulta disponibilidad real de una herramienta por fechas
// ============================================================================

Given(
  "que soy un Cliente navegando el catálogo",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "cliente";

    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Rotomartillo RH-40",
      marca: "Bosch",
      categoria: "Rotomartillos",
      tarifa_dia: 40000,
    });

    // 2 unidades realmente disponibles + 1 en mantenimiento + 1 dada de
    // baja (estas últimas 2 NO deben contar como disponibles).
    await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: "SN-DISPONIBLE-1",
    });
    await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: "SN-DISPONIBLE-2",
    });
    const enMantenimiento = await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: "SN-MANTENIMIENTO-1",
    });
    const dadaDeBaja = await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: "SN-BAJA-1",
    });

    await this.actualizarEstado.ejecutar(
      enMantenimiento.id,
      "En Mantenimiento",
      [],
      this.usuarioActualId,
    );
    await this.actualizarEstado.ejecutar(
      dadaDeBaja.id,
      "Dado de Baja",
      [],
      this.usuarioActualId,
    );
  },
);

When(
  "consulto la disponibilidad de un modelo para un rango de fechas específico",
  async function (this: ToolboxWorld) {
    this.ultimaDisponibilidad = await this.consultarDisponibilidad.ejecutar(
      this.ultimoModelo!.id,
      "2026-09-01",
      "2026-09-05",
    );
  },
);

Then(
  "el sistema calcula la disponibilidad sobre unidades físicas no reservadas en ese rango",
  function (this: ToolboxWorld) {
    assert.ok(this.ultimaDisponibilidad);
    assert.equal(this.ultimaDisponibilidad!.modelo_id, this.ultimoModelo!.id);
  },
);

Then(
  "se me muestra únicamente el número de unidades realmente disponibles",
  function (this: ToolboxWorld) {
    // 4 unidades totales, 2 no disponibles (mantenimiento + baja) => 2.
    assert.equal(this.ultimaDisponibilidad!.unidades_disponibles, 2);
  },
);
